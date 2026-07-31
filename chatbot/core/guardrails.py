"""Guardrails: input validation, retrieval gating, and output verification.

The chatbot is defended in layers, so no single component has to be perfect:

Input (deterministic, pre-model)
	Length limits, control-character stripping, and prompt-injection pattern
	matching. Blocks obvious attacks before a token is spent.

Retrieval (deterministic, pre-model)
	Enforced in ``chatbot.core.retriever``: if nothing clears the similarity
	threshold, the model is never called, so it cannot answer from its own
	knowledge. This is what keeps the bot on topic.

Generation (prompt-level)
	The system prompt in ``chatbot.core.prompts`` demands a structured verdict
	and citations rather than free prose.

Output (deterministic, post-model)
	Citations must be a subset of the retrieved ids, answers must be non-empty,
	and prompt-leakage markers are rejected. An answer that claims to be grounded
	but cites nothing is downgraded to a refusal.

Audit (optional, LLM)
	A second model pass re-reads the answer against the context and vetoes
	unsupported claims. Enabled via ``settings.enable_groundedness_check``.

Each check emits a ``GuardrailEvent`` so the demo UI can show exactly which
layer fired, and production callers can log the same trace.
"""

import re
import unicodedata

from pydantic import BaseModel, Field

from chatbot.core import prompts
from chatbot.core.config import Settings
from chatbot.core.knowledge_base import VERIFIED
from chatbot.core.schemas import GroundedAnswer, GuardrailEvent, RetrievedDocument

#: Prompt-injection and role-hijack patterns, paired with the rule name reported
#: to the caller. Kept narrow on purpose: a false positive costs a real user a
#: polite refusal, so patterns must reference the assistant's role or rules
#: rather than matching ordinary business vocabulary.
INJECTION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
	(
		"instruction_override",
		re.compile(
			r"\b(ignore|disregard|forget|override|bypass)\b[^.\n]{0,40}\b"
			r"(previous|prior|above|earlier|all|your|these|the)\b[^.\n]{0,20}\b"
			r"(instruction|instructions|prompt|prompts|rule|rules|guideline|guidelines|"
			r"guardrail|guardrails|restriction|restrictions|context)\b",
			re.IGNORECASE,
		),
	),
	(
		"role_hijack",
		re.compile(
			r"(\byou are now\b|\byou're now\b|\bfrom now on you (are|will be)\b|"
			r"\bpretend (to be|you are|that you)\b|\brole[\s-]?play\b|"
			r"\bact as (an?\s+)?(ai|assistant|admin|administrator|developer|hacker|dan|jailbreak)\b|"
			r"\bdeveloper mode\b|\bdan mode\b|\bjailbreak\b)",
			re.IGNORECASE,
		),
	),
	(
		"prompt_extraction",
		re.compile(
			r"((reveal|show|print|repeat|output|display|tell me|what is|what are)\b[^.\n]{0,30}\b"
			r"(system prompt|initial prompt|your prompt|your instructions|your rules|"
			r"your guidelines|your configuration|the prompt above))",
			re.IGNORECASE,
		),
	),
	(
		"chat_template_injection",
		re.compile(
			r"(<\|(im_start|im_end|endoftext|system|assistant)\|>|"
			r"^\s*(system|assistant)\s*:|\[/?INST\]|</?(context|user_question)>)",
			re.IGNORECASE | re.MULTILINE,
		),
	),
]

#: Fragments that would mean the system prompt leaked into a user-visible answer.
LEAKAGE_MARKERS = (
	"grounding rules",
	"<user_question>",
	"<context>",
	"context — the only facts",
	"you are the documation faq assistant",
	"system prompt",
)

#: Hard ceiling on answer length, independent of the model's max_tokens.
MAX_ANSWER_CHARS = 4000


class InputGuardResult(BaseModel):
	"""Verdict from the pre-model input checks."""

	allowed: bool
	question: str
	events: list[GuardrailEvent] = Field(default_factory=list)
	refusal: str | None = None


class OutputGuardResult(BaseModel):
	"""Verdict from the post-model output checks."""

	allowed: bool
	answer: str = ""
	citations: list[str] = Field(default_factory=list)
	events: list[GuardrailEvent] = Field(default_factory=list)
	refusal: str | None = None


def sanitize_question(question: str) -> str:
	"""Normalises user text before it is matched, embedded or prompted with.

	Strips Unicode control and format characters — including zero-width joiners
	used to smuggle instructions past pattern matching — and collapses runs of
	whitespace.

	Args:
		question (str): Raw user input.

	Returns:
		str: Cleaned single-spaced text.
	"""
	if not question:
		return ""
	cleaned = "".join(
		ch for ch in question if ch in "\n\t" or unicodedata.category(ch) not in {"Cc", "Cf"}
	)
	return re.sub(r"\s+", " ", cleaned).strip()


def check_input(question: str, settings: Settings) -> InputGuardResult:
	"""Validates and sanitizes a user question before any model call.

	Args:
		question (str): Raw user input.
		settings (Settings): Length limits used by the checks.

	Returns:
		InputGuardResult: Whether to proceed, the sanitized question, the events
		recorded, and the refusal text to show when blocked.
	"""
	events: list[GuardrailEvent] = []
	cleaned = sanitize_question(question)

	if len(cleaned) < settings.min_question_chars:
		events.append(
			GuardrailEvent(
				stage="input",
				name="empty_question",
				passed=False,
				detail="The question was empty or too short to act on.",
			)
		)
		return InputGuardResult(
			allowed=False,
			question=cleaned,
			events=events,
			refusal="Please type a question about Documation and I will look it up.",
		)

	if len(cleaned) > settings.max_question_chars:
		events.append(
			GuardrailEvent(
				stage="input",
				name="question_too_long",
				passed=False,
				detail=f"{len(cleaned)} characters exceeds the {settings.max_question_chars} limit.",
			)
		)
		return InputGuardResult(
			allowed=False,
			question=cleaned[: settings.max_question_chars],
			events=events,
			refusal=(
				f"That message is too long (limit {settings.max_question_chars} characters). "
				"Please ask a shorter, more specific question."
			),
		)

	for rule_name, pattern in INJECTION_PATTERNS:
		match = pattern.search(cleaned)
		if match:
			events.append(
				GuardrailEvent(
					stage="input",
					name=rule_name,
					passed=False,
					detail=f"Matched injection pattern on: {match.group(0)[:80]!r}",
				)
			)
			return InputGuardResult(
				allowed=False,
				question=cleaned,
				events=events,
				refusal=prompts.REFUSAL_BLOCKED_INPUT,
			)

	events.append(
		GuardrailEvent(
			stage="input",
			name="input_validation",
			passed=True,
			detail="Length, encoding and injection checks passed.",
		)
	)
	return InputGuardResult(allowed=True, question=cleaned, events=events)


def check_retrieval(
	has_relevant_context: bool,
	gate_similarity: float,
	threshold: float,
) -> GuardrailEvent:
	"""Records the topic gate decision made by the retriever.

	Args:
		has_relevant_context (bool): Whether the gated score cleared the threshold.
		gate_similarity (float): The similarity the gate compared — the question's
			own best match, which for a follow-up is scored bare.
		threshold (float): The minimum similarity in force for this turn.

	Returns:
		GuardrailEvent: A passed/failed event describing the gate.
	"""
	return GuardrailEvent(
		stage="retrieval",
		name="relevance_threshold",
		passed=has_relevant_context,
		detail=(
			f"Question similarity {gate_similarity:.3f} "
			f"{'>=' if has_relevant_context else '<'} threshold {threshold:.2f}."
		),
	)


def check_output(
	candidate: GroundedAnswer,
	documents: list[RetrievedDocument],
	settings: Settings,
) -> OutputGuardResult:
	"""Verifies a model answer against the context it was supposed to use.

	Args:
		candidate (GroundedAnswer): The structured model response.
		documents (list[RetrievedDocument]): The chunks that were in the prompt.
		settings (Settings): Used to enforce the unverified-content policy.

	Returns:
		OutputGuardResult: Whether the answer may be shown, the cleaned answer
		and citation list, and the events recorded along the way.
	"""
	events: list[GuardrailEvent] = []
	retrieved_ids = {doc.id for doc in documents}
	answer = (candidate.answer or "").strip()

	# The model declined. That is a valid, guardrail-compliant outcome.
	if not candidate.answered:
		events.append(
			GuardrailEvent(
				stage="output",
				name="model_declined",
				passed=True,
				detail=candidate.refusal_reason or "Model reported the context does not answer this.",
			)
		)
		return OutputGuardResult(
			allowed=False,
			events=events,
			refusal=prompts.REFUSAL_NOT_IN_CONTEXT,
		)

	if not answer:
		events.append(
			GuardrailEvent(
				stage="output",
				name="empty_answer",
				passed=False,
				detail="Model reported answered=true but returned no text.",
			)
		)
		return OutputGuardResult(
			allowed=False,
			events=events,
			refusal=prompts.REFUSAL_FAILED_VALIDATION,
		)

	lowered = answer.lower()
	leaked = [marker for marker in LEAKAGE_MARKERS if marker in lowered]
	if leaked:
		events.append(
			GuardrailEvent(
				stage="output",
				name="prompt_leakage",
				passed=False,
				detail=f"Answer echoed internal markers: {', '.join(leaked)}.",
			)
		)
		return OutputGuardResult(
			allowed=False,
			events=events,
			refusal=prompts.REFUSAL_FAILED_VALIDATION,
		)

	if len(answer) > MAX_ANSWER_CHARS:
		answer = answer[:MAX_ANSWER_CHARS].rstrip() + "..."
		events.append(
			GuardrailEvent(
				stage="output",
				name="answer_truncated",
				passed=True,
				detail=f"Answer exceeded {MAX_ANSWER_CHARS} characters and was truncated.",
			)
		)

	# Citation integrity: an id the model invented is a hallucination signal, so
	# drop it. If nothing valid is left, the answer is unattributable and dies here.
	valid_citations = [cid for cid in candidate.citations if cid in retrieved_ids]
	invented = [cid for cid in candidate.citations if cid not in retrieved_ids]

	if not valid_citations:
		events.append(
			GuardrailEvent(
				stage="output",
				name="citation_check",
				passed=False,
				detail=(
					f"No cited id matched the retrieved context (model cited: "
					f"{', '.join(candidate.citations) or 'nothing'})."
				),
			)
		)
		return OutputGuardResult(
			allowed=False,
			events=events,
			refusal=prompts.REFUSAL_FAILED_VALIDATION,
		)

	events.append(
		GuardrailEvent(
			stage="output",
			name="citation_check",
			passed=True,
			detail=(
				f"Cited {', '.join(valid_citations)}"
				+ (f"; dropped invented id(s): {', '.join(invented)}" if invented else "")
			),
		)
	)

	# Defence in depth: entries the knowledge base holds back must not reach a
	# user even if one slipped through the retrieval filter.
	if not settings.serve_unverified:
		cited_docs = [doc for doc in documents if doc.id in valid_citations]
		unverified = [doc.id for doc in cited_docs if doc.status != VERIFIED]
		if unverified:
			events.append(
				GuardrailEvent(
					stage="output",
					name="unverified_content",
					passed=False,
					detail=(
						f"Answer relied on entries pending client confirmation: "
						f"{', '.join(unverified)}."
					),
				)
			)
			return OutputGuardResult(
				allowed=False,
				events=events,
				refusal=prompts.REFUSAL_NOT_IN_CONTEXT,
			)

	return OutputGuardResult(
		allowed=True,
		answer=answer,
		citations=valid_citations,
		events=events,
	)
