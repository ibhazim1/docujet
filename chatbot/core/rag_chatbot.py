"""The grounded RAG chatbot pipeline.

One call to :meth:`RAGChatbot.answer` runs the whole guarded path:

	input guard → retrieval → relevance gate → grounded generation
	→ output verification → (optional) groundedness audit

Every stage records a ``GuardrailEvent`` and every model call records its token
usage and USD cost, so the returned :class:`~chatbot.core.schemas.ChatAnswer` is
a complete, auditable trace of the turn — which is what the Streamlit demo
renders, and what a production caller should log.

Cheap refusals are deliberate: input-guard rejections and off-topic questions
never reach DeepSeek, so they cost nothing and cannot be answered from the
model's own knowledge.
"""

import logging
import time
from typing import Any, TypeVar

from pydantic import BaseModel

from chatbot.core import guardrails, prompts
from chatbot.core.config import Settings
from chatbot.core.knowledge_base import KnowledgeBase
from chatbot.core.llm import LLM, LLMResponse
from chatbot.core.pricing import RateCard
from chatbot.core.retriever import RetrievalResult, Retriever
from chatbot.core.schemas import (
	ChatAnswer,
	CostEstimate,
	GroundedAnswer,
	GroundednessVerdict,
	GuardrailEvent,
	LLMCallRecord,
	RetrievedDocument,
	TokenUsage,
)
from chatbot.core.vector_store import IndexStats, VectorStore

logger = logging.getLogger(__name__)

#: Attempts allowed for the structured answer call. A second try covers the
#: occasional malformed JSON payload; more than that just burns tokens.
MAX_GENERATION_ATTEMPTS = 2

#: Per-message cap when replaying history, so an earlier long answer cannot
#: crowd out the retrieved context.
MAX_HISTORY_MESSAGE_CHARS = 800

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class RAGChatbot:
	"""Answers questions about Documation, strictly from the FAQ knowledge base."""

	def __init__(
		self,
		settings: Settings | None = None,
		store: VectorStore | None = None,
		rate_card: RateCard | None = None,
		llm: LLM | None = None,
	):
		"""Initializes the pipeline without performing any I/O.

		Args:
			settings (Settings | None): Configuration. Loaded from the
				environment when omitted.
			store (VectorStore | None): Vector store to reuse. Created from
				``settings`` when omitted.
			rate_card (RateCard | None): Pricing used for cost estimates.
			llm (LLM | None): Pre-built DeepSeek client, mainly for tests.
		"""
		self.settings = settings or Settings.from_env()
		self.store = store or VectorStore(self.settings)
		self.retriever = Retriever(self.store, self.settings)
		self.rate_card = rate_card or RateCard.from_env()
		self._llm = llm

	# ------------------------------------------------------------------
	# Setup
	# ------------------------------------------------------------------
	@property
	def llm(self) -> LLM:
		"""The DeepSeek client, created on first use.

		Built lazily so retrieval and the UI still work when no API key is
		configured — the failure then surfaces at generation time with a clear
		message instead of at import time.
		"""
		if self._llm is None:
			self._llm = LLM(model=self.settings.llm_model, return_token_count=True)
		return self._llm

	def ensure_index(self, force: bool = False) -> IndexStats:
		"""Builds or refreshes the vector index, and returns its state."""
		knowledge_base = KnowledgeBase.load(self.settings.knowledge_base_path)
		return self.store.build(knowledge_base, force=force)

	# ------------------------------------------------------------------
	# Public API
	# ------------------------------------------------------------------
	def answer(
		self,
		question: str,
		history: list[dict[str, str]] | None = None,
	) -> ChatAnswer:
		"""Answers one question under the full guardrail stack.

		Args:
			question (str): The user's raw question.
			history (list[dict[str, str]] | None): Prior turns as ``{"role",
				"content"}`` dicts. Used for follow-up resolution and coherence.

		Returns:
			ChatAnswer: The answer or refusal, the retrieved sources, the
			guardrail trace, and token/cost accounting for the turn.
		"""
		started = time.perf_counter()
		history = history or []
		events: list[GuardrailEvent] = []
		calls: list[LLMCallRecord] = []

		# --- Layer 1: input guard (no model call) ---
		input_result = guardrails.check_input(question, self.settings)
		events.extend(input_result.events)
		if not input_result.allowed:
			return self._finish(
				question=question,
				answer=input_result.refusal or prompts.REFUSAL_BLOCKED_INPUT,
				answered=False,
				refusal_reason="blocked_by_input_guard",
				events=events,
				calls=calls,
				started=started,
			)

		clean_question = input_result.question

		# --- Layer 2: retrieval + relevance gate (no model call) ---
		retrieval = self.retriever.retrieve(clean_question, history=history)
		events.append(
			guardrails.check_retrieval(
				retrieval.has_relevant_context,
				retrieval.gate_similarity,
				retrieval.threshold,
			)
		)
		if not retrieval.has_relevant_context:
			return self._finish(
				question=clean_question,
				answer=prompts.REFUSAL_OUT_OF_SCOPE,
				answered=False,
				refusal_reason="no_relevant_context",
				events=events,
				calls=calls,
				started=started,
				retrieval=retrieval,
			)

		context_documents = retrieval.relevant_documents

		# --- Layer 3: grounded generation ---
		try:
			candidate, generation_calls = self._generate(clean_question, context_documents, history)
			calls.extend(generation_calls)
		except Exception as exc:  # noqa: BLE001 - surfaced to the user as a refusal
			logger.exception("Generation failed")
			events.append(
				GuardrailEvent(
					stage="output",
					name="generation_error",
					passed=False,
					detail=f"{type(exc).__name__}: {exc}",
				)
			)
			return self._finish(
				question=clean_question,
				answer=prompts.REFUSAL_FAILED_VALIDATION,
				answered=False,
				refusal_reason=f"generation_error: {type(exc).__name__}",
				events=events,
				calls=calls,
				started=started,
				retrieval=retrieval,
			)

		# --- Layer 4: output verification ---
		output_result = guardrails.check_output(candidate, context_documents, self.settings)
		events.extend(output_result.events)
		if not output_result.allowed:
			return self._finish(
				question=clean_question,
				answer=output_result.refusal or prompts.REFUSAL_FAILED_VALIDATION,
				answered=False,
				refusal_reason="failed_output_guard",
				events=events,
				calls=calls,
				started=started,
				retrieval=retrieval,
			)

		# --- Layer 5: optional groundedness audit ---
		if self.settings.enable_groundedness_check:
			verdict, audit_call = self._audit_groundedness(output_result.answer, context_documents)
			if audit_call is not None:
				calls.append(audit_call)
			events.append(
				GuardrailEvent(
					stage="output",
					name="groundedness_audit",
					passed=verdict.grounded,
					detail=verdict.reason or ("Every claim traced to the context." if verdict.grounded else ""),
				)
			)
			if not verdict.grounded:
				return self._finish(
					question=clean_question,
					answer=prompts.REFUSAL_FAILED_VALIDATION,
					answered=False,
					refusal_reason="failed_groundedness_audit",
					events=events,
					calls=calls,
					started=started,
					retrieval=retrieval,
					citations=output_result.citations,
				)

		return self._finish(
			question=clean_question,
			answer=output_result.answer,
			answered=True,
			refusal_reason=None,
			events=events,
			calls=calls,
			started=started,
			retrieval=retrieval,
			citations=output_result.citations,
		)

	# ------------------------------------------------------------------
	# Model calls
	# ------------------------------------------------------------------
	def _generate(
		self,
		question: str,
		documents: list[RetrievedDocument],
		history: list[dict[str, str]],
	) -> tuple[GroundedAnswer, list[LLMCallRecord]]:
		"""Asks DeepSeek for a structured, citation-bearing answer.

		Args:
			question (str): Sanitized user question.
			documents (list[RetrievedDocument]): Context chunks to ground on.
			history (list[dict[str, str]]): Prior conversation turns.

		Returns:
			tuple[GroundedAnswer, list[LLMCallRecord]]: The parsed answer and the
			accounting records for every attempt made.

		Raises:
			Exception: Re-raises the final error if all attempts fail.
		"""
		messages = [{"role": "system", "content": prompts.SYSTEM_PROMPT}]
		messages.extend(self._trim_history(history))
		messages.append({"role": "user", "content": prompts.build_user_message(question, documents)})

		records: list[LLMCallRecord] = []
		last_error: Exception | None = None

		for attempt in range(1, MAX_GENERATION_ATTEMPTS + 1):
			call_started = time.perf_counter()
			try:
				response = self.llm.generate_response(
					messages,
					temperature=self.settings.temperature,
					max_output_tokens=self.settings.max_output_tokens,
					response_schema=GroundedAnswer,
				)
			except Exception as exc:  # noqa: BLE001 - retried, then re-raised
				last_error = exc
				logger.warning("Answer generation attempt %d failed: %s", attempt, exc)
				# A malformed payload is worth one more try; anything else is not.
				if attempt == MAX_GENERATION_ATTEMPTS or not _is_retryable(exc):
					raise
				continue

			records.append(
				self._record_call(
					label=f"answer (attempt {attempt})" if attempt > 1 else "answer",
					response=response,
					started=call_started,
				)
			)
			return _unwrap(response, GroundedAnswer), records

		raise last_error or RuntimeError("Answer generation failed")

	def _audit_groundedness(
		self,
		answer: str,
		documents: list[RetrievedDocument],
	) -> tuple[GroundednessVerdict, LLMCallRecord | None]:
		"""Runs the optional second-pass grounding audit.

		A failed audit call is treated as "not grounded": when the verifier is
		unavailable, the safe outcome is to withhold the answer.
		"""
		call_started = time.perf_counter()
		messages = [
			{"role": "system", "content": prompts.GROUNDEDNESS_SYSTEM_PROMPT},
			{"role": "user", "content": prompts.build_groundedness_message(answer, documents)},
		]
		try:
			response = self.llm.generate_response(
				messages,
				temperature=0.0,
				max_output_tokens=200,
				response_schema=GroundednessVerdict,
			)
		except Exception as exc:  # noqa: BLE001 - fail closed
			logger.warning("Groundedness audit failed: %s", exc)
			return (
				GroundednessVerdict(grounded=False, reason=f"Audit unavailable: {type(exc).__name__}"),
				None,
			)

		record = self._record_call(label="groundedness audit", response=response, started=call_started)
		return _unwrap(response, GroundednessVerdict), record

	# ------------------------------------------------------------------
	# Helpers
	# ------------------------------------------------------------------
	def _trim_history(self, history: list[dict[str, str]]) -> list[dict[str, str]]:
		"""Keeps the most recent turns, truncating any over-long message."""
		if not history or self.settings.max_history_turns <= 0:
			return []
		recent = history[-(self.settings.max_history_turns * 2) :]
		trimmed: list[dict[str, str]] = []
		for message in recent:
			role = message.get("role")
			content = (message.get("content") or "").strip()
			if role not in {"user", "assistant"} or not content:
				continue
			trimmed.append({"role": role, "content": content[:MAX_HISTORY_MESSAGE_CHARS]})
		return trimmed

	def _record_call(self, label: str, response: LLMResponse, started: float) -> LLMCallRecord:
		"""Builds the accounting record for one completed model call."""
		usage = response.usage or TokenUsage(total_tokens=response.token_count)
		return LLMCallRecord(
			label=label,
			model=self.settings.llm_model,
			usage=usage,
			cost=self.rate_card.estimate(usage, self.settings.llm_model),
			latency_ms=int((time.perf_counter() - started) * 1000),
		)

	def _finish(
		self,
		question: str,
		answer: str,
		answered: bool,
		refusal_reason: str | None,
		events: list[GuardrailEvent],
		calls: list[LLMCallRecord],
		started: float,
		retrieval: RetrievalResult | None = None,
		citations: list[str] | None = None,
	) -> ChatAnswer:
		"""Assembles the final ChatAnswer, totalling usage and cost."""
		citations = citations or []
		sources: list[RetrievedDocument] = []
		if retrieval is not None:
			for doc in retrieval.documents:
				sources.append(doc.model_copy(update={"cited": doc.id in citations}))

		usage = TokenUsage()
		cost = CostEstimate()
		for call in calls:
			usage = usage + call.usage
			cost = cost + call.cost

		return ChatAnswer(
			question=question,
			answer=answer,
			answered=answered,
			refusal_reason=refusal_reason,
			citations=citations,
			sources=sources,
			guardrails=events,
			calls=calls,
			usage=usage,
			cost=cost,
			latency_ms=int((time.perf_counter() - started) * 1000),
			retrieval_query=retrieval.query if retrieval else question,
			best_similarity=retrieval.best_similarity if retrieval else 0.0,
			retrieval_threshold=retrieval.threshold if retrieval else self.settings.min_similarity,
		)


def _unwrap(response: Any, schema: type[SchemaT]) -> SchemaT:
	"""Extracts the parsed model from an LLMResponse wrapper.

	``LLM`` returns the bare output when ``return_token_count`` is False, so both
	shapes are accepted to keep injected test doubles simple.
	"""
	output = response.output if isinstance(response, LLMResponse) else response
	if isinstance(output, schema):
		return output
	raise TypeError(f"Expected {schema.__name__}, got {type(output).__name__}")


def _is_retryable(exc: Exception) -> bool:
	"""True for errors a second attempt could plausibly fix (malformed JSON)."""
	name = type(exc).__name__
	return name in {"ValidationError", "JSONDecodeError", "ValueError"}
