"""Offline tests for retrieval logic and the knowledge-base loader.

The pure functions here — follow-up detection, rank fusion, entry validation —
decide what the model is allowed to see, so they are tested without a live index.
"""

import json

import pytest

from chatbot.core.config import Settings
from chatbot.core.knowledge_base import KnowledgeBase
from chatbot.core.pricing import RateCard, estimate_tokens
from chatbot.core.retriever import Retriever, _fuse_ranked_lists, content_words
from chatbot.core.schemas import RetrievedDocument, TokenUsage


class _StubStore:
	"""Minimal VectorStore stand-in returning canned results per query."""

	def __init__(self, results: dict[str, list[RetrievedDocument]]):
		self.results = results
		self.queries: list[str] = []

	def search(self, query, top_k=None, include_unverified=None):
		self.queries.append(query)
		return self.results.get(query, [])


def _doc(doc_id: str, similarity: float, rank: int) -> RetrievedDocument:
	return RetrievedDocument(
		id=doc_id, question=doc_id, answer="", text="", similarity=similarity, rank=rank
	)


# ------------------------------------------------------------- follow-up rules
@pytest.mark.parametrize(
	("question", "expected"),
	[
		("What about the cost?", True),
		("Why?", True),
		("Tell me more", True),
		("Does it support WhatsApp?", True),
		("What digital delivery channels does Documation support today?", False),
	],
)
def test_needs_expansion(question, expected):
	retriever = Retriever(_StubStore({}), Settings())
	assert retriever.needs_expansion(question) is expected


@pytest.mark.parametrize(
	("question", "expected"),
	[
		("Why?", []),
		("Tell me more", []),
		("What about the cost?", ["cost"]),
		("What is the capital of France?", ["capital", "france"]),
	],
)
def test_content_words(question, expected):
	assert content_words(question) == expected


def test_expansion_prepends_previous_question():
	retriever = Retriever(_StubStore({}), Settings())
	history = [
		{"role": "user", "content": "Tell me about bulk printing."},
		{"role": "assistant", "content": "Documation prints and posts documents."},
	]
	query, expanded = retriever.build_query("What about the cost?", history)
	assert expanded
	assert query == "Tell me about bulk printing. What about the cost?"


def test_expansion_skipped_without_history():
	retriever = Retriever(_StubStore({}), Settings())
	query, expanded = retriever.build_query("What about the cost?", [])
	assert not expanded
	assert query == "What about the cost?"


# ------------------------------------------------------------------- gating
def test_off_topic_follow_up_is_gated_on_its_own_score():
	# The expanded query inherits the previous topic's high score; the bare
	# question must still decide the gate, or off-topic follow-ups slip through.
	store = _StubStore(
		{
			"What is Documation? What is the capital of France?": [_doc("FAQ-001", 0.72, 1)],
			"What is the capital of France?": [_doc("FAQ-004", 0.05, 1)],
		}
	)
	retriever = Retriever(store, Settings())
	history = [{"role": "user", "content": "What is Documation?"}]
	result = retriever.retrieve("What is the capital of France?", history=history)
	assert result.gate_similarity == pytest.approx(0.05)
	assert not result.has_relevant_context


def test_genuine_follow_up_passes_the_relaxed_gate():
	store = _StubStore(
		{
			"Tell me about printing. What about the cost?": [_doc("FAQ-019", 0.67, 1)],
			"What about the cost?": [_doc("FAQ-066", 0.25, 1)],
		}
	)
	retriever = Retriever(store, Settings())
	history = [{"role": "user", "content": "Tell me about printing."}]
	result = retriever.retrieve("What about the cost?", history=history)
	assert result.has_relevant_context
	assert {doc.id for doc in result.documents} == {"FAQ-019", "FAQ-066"}


def test_pure_continuation_is_gated_on_the_expanded_query():
	store = _StubStore(
		{
			"Tell me about eONE. Tell me more": [_doc("FAQ-034", 0.61, 1)],
			"Tell me more": [_doc("FAQ-041", 0.08, 1)],
		}
	)
	retriever = Retriever(store, Settings())
	history = [{"role": "user", "content": "Tell me about eONE."}]
	result = retriever.retrieve("Tell me more", history=history)
	assert result.has_relevant_context


# --------------------------------------------------------------- rank fusion
def test_rrf_gives_each_query_top_hit_equal_standing():
	high_scores = [_doc("A", 0.67, 1), _doc("B", 0.57, 2), _doc("C", 0.54, 3)]
	low_scores = [_doc("D", 0.25, 1), _doc("E", 0.19, 2)]
	fused = _fuse_ranked_lists([high_scores, low_scores], limit=5)
	# D wins its own list, so it must outrank B despite a much lower similarity.
	assert [doc.id for doc in fused][:2] == ["A", "D"]
	assert [doc.rank for doc in fused] == [1, 2, 3, 4, 5]


def test_rrf_deduplicates_and_keeps_the_better_score():
	fused = _fuse_ranked_lists([[_doc("A", 0.40, 1)], [_doc("A", 0.62, 1)]], limit=5)
	assert len(fused) == 1
	assert fused[0].similarity == pytest.approx(0.62)


# ------------------------------------------------------------ knowledge base
def test_loader_skips_unusable_entries_and_flags_held_back(tmp_path):
	payload = {
		"meta": {"version": "1.0"},
		"entries": [
			{"id": "FAQ-001", "question": "Q1", "answer": "A1", "text": "Q: Q1\nA: A1", "status": "verified"},
			{"id": "FAQ-001", "question": "dup", "answer": "dup", "text": "dup", "status": "verified"},
			{"id": "FAQ-002", "question": "Q2", "answer": "A2", "text": "", "status": "verified"},
			{"id": "", "question": "Q3", "answer": "A3", "text": "Q: Q3", "status": "verified"},
			{
				"id": "FAQ-051",
				"question": "ISO?",
				"answer": "PENDING",
				"text": "Q: ISO?",
				"status": "needs_client_confirmation",
			},
		],
	}
	path = tmp_path / "kb.json"
	path.write_text(json.dumps(payload), encoding="utf-8")

	knowledge_base = KnowledgeBase.load(path)
	assert [entry.id for entry in knowledge_base.entries] == ["FAQ-001", "FAQ-051"]
	assert [entry.id for entry in knowledge_base.held_back_entries] == ["FAQ-051"]
	assert knowledge_base.fingerprint


def test_loader_rejects_a_file_with_no_usable_entries(tmp_path):
	path = tmp_path / "empty.json"
	path.write_text(json.dumps({"entries": []}), encoding="utf-8")
	with pytest.raises(ValueError):
		KnowledgeBase.load(path)


# ------------------------------------------------------------------- pricing
def test_usage_splits_deepseek_cache_hits():
	class _Usage:
		prompt_tokens = 1000
		completion_tokens = 100
		total_tokens = 1100
		prompt_cache_hit_tokens = 800
		prompt_cache_miss_tokens = 200

	usage = TokenUsage.from_api_usage(_Usage())
	assert (usage.cache_hit_tokens, usage.cache_miss_tokens) == (800, 200)


def test_usage_without_cache_fields_assumes_all_misses():
	class _Usage:
		prompt_tokens = 500
		completion_tokens = 50
		total_tokens = 550

	usage = TokenUsage.from_api_usage(_Usage())
	assert usage.cache_miss_tokens == 500
	assert usage.cache_hit_tokens == 0


def test_cost_uses_the_rate_card():
	card = RateCard()
	card.set_model_rates("deepseek-chat", cache_hit_per_1m=1.0, cache_miss_per_1m=10.0, output_per_1m=100.0)
	usage = TokenUsage(
		prompt_tokens=1_000_000, completion_tokens=1_000_000, total_tokens=2_000_000,
		cache_hit_tokens=500_000, cache_miss_tokens=500_000,
	)
	cost = card.estimate(usage, "deepseek-chat")
	assert cost.total_cost_usd == pytest.approx(0.5 + 5.0 + 100.0)


def test_unknown_model_still_priced():
	assert RateCard().estimate(TokenUsage(completion_tokens=1000), "some-other-model").total_cost_usd > 0


def test_token_estimate_is_positive_for_text():
	assert estimate_tokens("What is Documation?") > 0
	assert estimate_tokens("") == 0
