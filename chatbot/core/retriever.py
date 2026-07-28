"""Semantic retrieval with follow-up handling and a relevance gate.

Two behaviours sit on top of raw vector search:

Query expansion
	"How much does it cost?" is meaningless as a standalone embedding query. When
	a short or pronoun-led follow-up arrives, the previous user question is
	prepended so the vector lands near the right chunks. This is a deterministic
	rule rather than an LLM rewrite: it adds no tokens, no latency, and no new
	failure mode to a path the guardrails depend on.

	Both the expanded and the original query are searched, and the two ranked
	lists are fused with Reciprocal Rank Fusion. Expansion alone is not enough:
	"Tell me about bulk printing. What about the cost?" embeds close to the
	printing chunks, whose scores dominate the pricing chunk that only the bare
	follow-up finds. Fusing on rank rather than raw score gives each query's top
	hit equal standing, so the context carries both the topic anchor and the
	actual question.

Relevance gate
	If the best chunk scores below ``settings.min_similarity``, the question is
	treated as outside the knowledge base. Nothing is sent to the model, so an
	off-topic question cannot be answered from the model's own knowledge — this
	is the primary topic guardrail, and it costs nothing.

	Expansion complicates the gate: "What is the capital of France?" asked after a
	Documation question would inherit the previous question's high score and slip
	through. So a question that carries content words of its own is gated on its
	own score — at a relaxed threshold, since a truncated follow-up naturally
	scores lower — while a pure continuation ("Why?", "Tell me more") has nothing
	of its own to score and is gated on the expanded query instead.
"""

import re

from pydantic import BaseModel, Field

from chatbot.core.config import Settings
from chatbot.core.schemas import RetrievedDocument
from chatbot.core.vector_store import VectorStore

#: Openers that signal the question continues the previous one.
FOLLOW_UP_MARKERS = (
	"what about",
	"how about",
	"and ",
	"also",
	"why",
	"how so",
	"tell me more",
	"more about",
	"can you elaborate",
	"elaborate",
	"what else",
)

#: Standalone pronouns that only resolve against earlier turns.
DANGLING_PRONOUNS = re.compile(
	r"\b(it|its|it's|they|them|their|that|those|these|this|there)\b", re.IGNORECASE
)

#: Word count at or below which a question is assumed to lean on context.
SHORT_QUESTION_WORDS = 6

#: Damping constant for Reciprocal Rank Fusion, per Cormack et al. (2009).
RRF_K = 60

#: A bare follow-up is a fragment of a question, so it embeds further from any
#: chunk than the same question asked in full. Its gate is scaled by this factor.
FOLLOW_UP_THRESHOLD_FACTOR = 0.6

#: Function words carrying no topic of their own. A question made entirely of
#: these is a continuation ("Why?", "Tell me more") that only prior turns explain.
STOPWORDS = frozenset(
	"""a an the is are was were am be been being do does did doing can could would should
	will shall may might must have has had what which who whom whose when where why how
	about of for to in on at by with and or but that this these those it its they them
	their there here you your yours we our us me my mine i so if then than from as not no
	yes please ok okay much many more most any some all up out just also else too very
	tell say said give show explain go get let know think want need thing things one"""
	.split()
)


def content_words(question: str) -> list[str]:
	"""Extracts the topic-bearing words of a question.

	Args:
		question (str): The question text.

	Returns:
		list[str]: Lower-cased tokens of three or more characters that are not
		function words. Empty when the question is a pure continuation.
	"""
	tokens = re.findall(r"[a-z0-9]+", question.lower())
	return [token for token in tokens if len(token) >= 3 and token not in STOPWORDS]


class RetrievalResult(BaseModel):
	"""What semantic search produced for one question."""

	question: str
	query: str
	expanded: bool = False
	documents: list[RetrievedDocument] = Field(default_factory=list)
	best_similarity: float = 0.0
	#: Score the gate actually compared — the bare question's own best match for a
	#: content-bearing follow-up, otherwise the same as ``best_similarity``.
	gate_similarity: float = 0.0
	#: Threshold in force for this turn, relaxed for follow-ups.
	threshold: float = 0.0

	@property
	def has_relevant_context(self) -> bool:
		"""True when the gated score cleared the threshold in force."""
		return bool(self.documents) and self.gate_similarity >= self.threshold

	@property
	def relevant_documents(self) -> list[RetrievedDocument]:
		"""Chunks at or above the threshold, best first."""
		return [doc for doc in self.documents if doc.similarity >= self.threshold]


class Retriever:
	"""Turns a user question into ranked, gated knowledge-base context."""

	def __init__(self, store: VectorStore, settings: Settings):
		"""Initializes the retriever.

		Args:
			store (VectorStore): The Chroma-backed store to search.
			settings (Settings): Retrieval depth, threshold and expansion flags.
		"""
		self.store = store
		self.settings = settings

	def needs_expansion(self, question: str) -> bool:
		"""Heuristic: does this question only make sense with the previous one?"""
		text = question.strip().lower()
		if not text:
			return False
		if len(text.split()) <= SHORT_QUESTION_WORDS:
			return True
		if text.startswith(FOLLOW_UP_MARKERS):
			return True
		return bool(DANGLING_PRONOUNS.search(text))

	def build_query(self, question: str, history: list[dict[str, str]] | None = None) -> tuple[str, bool]:
		"""Builds the text to embed, widening follow-ups with prior context.

		Args:
			question (str): The current user question.
			history (list[dict[str, str]] | None): Prior chat messages, each with
				``role`` and ``content``.

		Returns:
			tuple[str, bool]: The query text, and whether expansion was applied.
		"""
		question = question.strip()
		if not self.settings.enable_query_expansion or not history:
			return question, False
		if not self.needs_expansion(question):
			return question, False

		previous_questions = [
			message.get("content", "").strip()
			for message in history
			if message.get("role") == "user" and message.get("content", "").strip()
		]
		if not previous_questions:
			return question, False

		return f"{previous_questions[-1]} {question}".strip(), True

	def retrieve(
		self,
		question: str,
		history: list[dict[str, str]] | None = None,
		top_k: int | None = None,
		include_unverified: bool | None = None,
	) -> RetrievalResult:
		"""Retrieves the top-k most relevant chunks for ``question``.

		Args:
			question (str): The user's question.
			history (list[dict[str, str]] | None): Prior chat messages.
			top_k (int | None): Override for ``settings.top_k``.
			include_unverified (bool | None): Override for
				``settings.serve_unverified``.

		Returns:
			RetrievalResult: Ranked chunks plus the gate decision inputs.
		"""
		top_k = top_k or self.settings.top_k
		# Resolved here rather than in the store: the store is shared and cached
		# across sessions, while this retriever carries the caller's settings.
		if include_unverified is None:
			include_unverified = self.settings.serve_unverified
		query, expanded = self.build_query(question, history)

		documents = self.store.search(query, top_k=top_k, include_unverified=include_unverified)
		threshold = self.settings.min_similarity
		gate_similarity = max((doc.similarity for doc in documents), default=0.0)

		if expanded:
			bare_documents = self.store.search(
				question, top_k=top_k, include_unverified=include_unverified
			)
			documents = _fuse_ranked_lists([documents, bare_documents], limit=top_k)
			threshold = round(threshold * FOLLOW_UP_THRESHOLD_FACTOR, 4)
			if content_words(question):
				# The follow-up names something of its own, so judge it on that
				# rather than on the topic it inherited from the previous turn.
				gate_similarity = max((doc.similarity for doc in bare_documents), default=0.0)
			else:
				gate_similarity = max((doc.similarity for doc in documents), default=0.0)

		return RetrievalResult(
			question=question,
			query=query,
			expanded=expanded,
			documents=documents,
			best_similarity=max((doc.similarity for doc in documents), default=0.0),
			gate_similarity=gate_similarity,
			threshold=threshold,
		)


def _fuse_ranked_lists(
	result_lists: list[list[RetrievedDocument]],
	limit: int,
	k: int = RRF_K,
) -> list[RetrievedDocument]:
	"""Fuses several ranked result lists with Reciprocal Rank Fusion.

	Each document scores ``sum(1 / (k + rank))`` over the lists it appears in, so
	a document ranked first by any one query competes with the first result of
	every other query regardless of the raw similarity scales involved. Ties fall
	back to the higher cosine similarity.

	Args:
		result_lists (list[list[RetrievedDocument]]): Ranked results per query.
		limit (int): Maximum documents to return.
		k (int): RRF damping constant; 60 is the value from the original paper.

	Returns:
		list[RetrievedDocument]: De-duplicated documents in fused order, each
		carrying its best observed cosine similarity and a fresh rank.
	"""
	fused_scores: dict[str, float] = {}
	best_by_id: dict[str, RetrievedDocument] = {}

	for documents in result_lists:
		for doc in documents:
			fused_scores[doc.id] = fused_scores.get(doc.id, 0.0) + 1.0 / (k + doc.rank)
			existing = best_by_id.get(doc.id)
			if existing is None or doc.similarity > existing.similarity:
				best_by_id[doc.id] = doc

	ordered = sorted(
		best_by_id.values(),
		key=lambda doc: (fused_scores[doc.id], doc.similarity),
		reverse=True,
	)[:limit]
	return [doc.model_copy(update={"rank": rank}) for rank, doc in enumerate(ordered, start=1)]
