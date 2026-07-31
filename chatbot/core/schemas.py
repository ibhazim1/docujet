"""Shared data models for the Documation RAG chatbot.

Every layer of the pipeline (retrieval, guardrails, generation, accounting)
exchanges these models, so the Streamlit app — or any other front end — can
render a full trace of what happened without reaching into internals.
"""

from typing import Any, Literal, Self

from pydantic import BaseModel, Field

GuardrailStage = Literal["input", "retrieval", "output"]


class TokenUsage(BaseModel):
	"""Token counts for one or more DeepSeek calls.

	DeepSeek bills prompt tokens at two different rates depending on whether the
	prefix was served from its context cache, and reports the split through the
	non-standard ``prompt_cache_hit_tokens`` / ``prompt_cache_miss_tokens`` usage
	fields. Both are captured here so cost can be computed exactly rather than
	estimated. When the fields are absent (any OpenAI-compatible backend that is
	not DeepSeek), everything is treated as a cache miss, which is the
	conservative — more expensive — assumption.
	"""

	prompt_tokens: int = 0
	completion_tokens: int = 0
	total_tokens: int = 0
	cache_hit_tokens: int = 0
	cache_miss_tokens: int = 0

	def __add__(self, other: "TokenUsage") -> "TokenUsage":
		return TokenUsage(
			prompt_tokens=self.prompt_tokens + other.prompt_tokens,
			completion_tokens=self.completion_tokens + other.completion_tokens,
			total_tokens=self.total_tokens + other.total_tokens,
			cache_hit_tokens=self.cache_hit_tokens + other.cache_hit_tokens,
			cache_miss_tokens=self.cache_miss_tokens + other.cache_miss_tokens,
		)

	@classmethod
	def from_api_usage(cls, usage: Any) -> Self:
		"""Builds a TokenUsage from an OpenAI-compatible ``response.usage`` object."""
		if usage is None:
			return cls()
		prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
		cache_hit = getattr(usage, "prompt_cache_hit_tokens", None)
		cache_miss = getattr(usage, "prompt_cache_miss_tokens", None)
		if cache_hit is None and cache_miss is None:
			cache_hit, cache_miss = 0, prompt_tokens
		else:
			cache_hit = cache_hit or 0
			cache_miss = cache_miss if cache_miss is not None else max(prompt_tokens - cache_hit, 0)
		return cls(
			prompt_tokens=prompt_tokens,
			completion_tokens=getattr(usage, "completion_tokens", 0) or 0,
			total_tokens=getattr(usage, "total_tokens", 0) or 0,
			cache_hit_tokens=cache_hit,
			cache_miss_tokens=cache_miss,
		)


class CostEstimate(BaseModel):
	"""USD cost of one or more calls, derived from TokenUsage and a rate card."""

	cache_hit_cost_usd: float = 0.0
	cache_miss_cost_usd: float = 0.0
	output_cost_usd: float = 0.0
	total_cost_usd: float = 0.0

	def __add__(self, other: "CostEstimate") -> "CostEstimate":
		return CostEstimate(
			cache_hit_cost_usd=self.cache_hit_cost_usd + other.cache_hit_cost_usd,
			cache_miss_cost_usd=self.cache_miss_cost_usd + other.cache_miss_cost_usd,
			output_cost_usd=self.output_cost_usd + other.output_cost_usd,
			total_cost_usd=self.total_cost_usd + other.total_cost_usd,
		)


class RetrievedDocument(BaseModel):
	"""One knowledge-base chunk returned by semantic search."""

	id: str
	question: str
	answer: str
	text: str
	category: str = ""
	tags: list[str] = Field(default_factory=list)
	source_url: str = ""
	status: str = "verified"
	note: str | None = None
	similarity: float = 0.0
	rank: int = 0
	cited: bool = False

	@property
	def is_verified(self) -> bool:
		return self.status == "verified"


class GuardrailEvent(BaseModel):
	"""Outcome of a single guardrail check, for display and audit logging."""

	stage: GuardrailStage
	name: str
	passed: bool
	detail: str = ""


class LLMCallRecord(BaseModel):
	"""Accounting record for one model call made while answering a question."""

	label: str
	model: str
	usage: TokenUsage = Field(default_factory=TokenUsage)
	cost: CostEstimate = Field(default_factory=CostEstimate)
	latency_ms: int = 0


class GroundedAnswer(BaseModel):
	"""Structured payload the answering model is required to return.

	Forcing citations into the response — rather than letting the model write
	them into prose — is what makes the grounding check mechanical: every id
	must appear in the retrieved context, otherwise the answer is rejected.
	"""

	answered: bool = Field(
		description="True only if the CONTEXT alone fully supports the answer. False otherwise."
	)
	answer: str = Field(
		description="The answer to the user, written from the CONTEXT only. Empty when answered is false."
	)
	citations: list[str] = Field(
		default_factory=list,
		description="Ids of the context documents used, e.g. ['FAQ-001']. Empty when answered is false.",
	)
	refusal_reason: str = Field(
		default="",
		description="Short internal explanation of why the question could not be answered from the CONTEXT.",
	)


class GroundednessVerdict(BaseModel):
	"""Second-pass verdict from the optional LLM groundedness auditor."""

	grounded: bool = Field(description="True if every claim in the ANSWER is supported by the CONTEXT.")
	reason: str = Field(default="", description="Short explanation, naming the unsupported claim if any.")


class ChatAnswer(BaseModel):
	"""Everything the pipeline produced for one user turn."""

	question: str
	answer: str
	answered: bool
	refusal_reason: str | None = None
	citations: list[str] = Field(default_factory=list)
	sources: list[RetrievedDocument] = Field(default_factory=list)
	guardrails: list[GuardrailEvent] = Field(default_factory=list)
	calls: list[LLMCallRecord] = Field(default_factory=list)
	usage: TokenUsage = Field(default_factory=TokenUsage)
	cost: CostEstimate = Field(default_factory=CostEstimate)
	latency_ms: int = 0
	retrieval_query: str = ""
	best_similarity: float = 0.0
	#: Threshold in force for this turn — relaxed when the question was expanded
	#: from conversation history, so display it rather than the configured value.
	retrieval_threshold: float = 0.0

	@property
	def cited_sources(self) -> list[RetrievedDocument]:
		return [doc for doc in self.sources if doc.cited]

	@property
	def blocked_by(self) -> str | None:
		"""Name of the first guardrail that failed, if any."""
		for event in self.guardrails:
			if not event.passed:
				return event.name
		return None
