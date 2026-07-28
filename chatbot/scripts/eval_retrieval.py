"""Offline retrieval quality check — no API key, no cost.

Retrieval is the load-bearing guardrail: if the right chunk is not in the top-k,
the bot refuses a question it should have answered, and if an off-topic query
scores above the threshold, the bot engages with something it should refuse. Both
failure modes are measurable without ever calling DeepSeek, which is what this
script does.

It reports three things:

1. Recall@1 / Recall@5 / MRR over every verified FAQ question (upper bound —
	these queries are near-identical to the indexed text).
2. Recall@5 over hand-written paraphrases (realistic — how a user actually asks).
3. Score separation between in-domain and off-topic queries, with a suggested
	``RAG_MIN_SIMILARITY`` threshold that sits between the two populations.

Usage:
	python -m chatbot.scripts.eval_retrieval
	python -m chatbot.scripts.eval_retrieval --top-k 5 --verbose
"""

import argparse
import statistics

from chatbot.core.config import Settings
from chatbot.core.knowledge_base import KnowledgeBase
from chatbot.core.vector_store import VectorStore
from chatbot.scripts import configure_console

#: Realistic rephrasings a user might type, mapped to the ids that would each
#: constitute a correct retrieval.
PARAPHRASE_PROBES: list[tuple[str, set[str]]] = [
	("when did the company start operating", {"FAQ-002"}),
	("what is your office address", {"FAQ-004"}),
	("are you a local malaysian firm", {"FAQ-003"}),
	("do you print and post letters for banks", {"FAQ-019", "FAQ-021", "FAQ-048"}),
	("can customers get statements by email instead of paper", {"FAQ-011", "FAQ-026", "FAQ-038"}),
	("how do we send our data files over to you", {"FAQ-015"}),
	("do you work with insurance firms", {"FAQ-049"}),
	("what is eONE", {"FAQ-034"}),
	("does your archive system offer an api", {"FAQ-045"}),
	("how much will this cost us", {"FAQ-066"}),
	("i would like a quotation", {"FAQ-065"}),
	("what are your opening hours", {"FAQ-062"}),
	("are you on linkedin", {"FAQ-064"}),
	("can you send messages over whatsapp", {"FAQ-026", "FAQ-033"}),
	("can you handle two million statements a month", {"FAQ-067"}),
	("do you keep audit logs of who accessed a document", {"FAQ-054", "FAQ-040"}),
	("which regulations like pdpa do you help us comply with", {"FAQ-052"}),
	("which printer manufacturers do you use", {"FAQ-056"}),
	("can you integrate with our existing core system", {"FAQ-029"}),
	("what happens to mail that gets returned undelivered", {"FAQ-012"}),
	("what output file formats can you produce", {"FAQ-018"}),
	("why should we outsource this instead of printing in house", {"FAQ-059"}),
]

#: Queries the bot must refuse. None of these are answerable from the FAQ.
OFF_TOPIC_PROBES: list[str] = [
	"what is the capital of france",
	"write me a python script that sorts a list",
	"who won the world cup in 2022",
	"what is the weather in kuala lumpur tomorrow",
	"recommend a good restaurant near me",
	"how do i treat a bad headache",
	"what is the price of bitcoin today",
	"tell me a joke",
	"explain quantum computing to a five year old",
	"how should i invest my savings",
	"summarise the plot of hamlet",
	"what is the best programming language to learn",
]


def _reciprocal_rank(ranked_ids: list[str], expected: set[str]) -> float:
	for position, doc_id in enumerate(ranked_ids, start=1):
		if doc_id in expected:
			return 1.0 / position
	return 0.0


def main() -> int:
	parser = argparse.ArgumentParser(description="Evaluate retrieval quality offline.")
	parser.add_argument("--top-k", type=int, default=None, help="Results per query (default: settings)")
	parser.add_argument("-v", "--verbose", action="store_true", help="List every miss")
	args = parser.parse_args()

	configure_console()
	settings = Settings.from_env()
	top_k = args.top_k or settings.top_k
	store = VectorStore(settings)
	knowledge_base = KnowledgeBase.load(settings.knowledge_base_path)
	store.build(knowledge_base)

	print(f"Collection      : {settings.collection_name} ({store.count()} documents)")
	print(f"Embedding       : {settings.embedding_provider}/{settings.embedding_model}")
	print(f"top_k           : {top_k}")
	print(f"min_similarity  : {settings.min_similarity}\n")

	# --- 1. Exact FAQ questions -------------------------------------------------
	hits_at_1 = 0
	hits_at_k = 0
	reciprocal_ranks: list[float] = []
	misses: list[str] = []
	targets = knowledge_base.verified_entries

	for entry in targets:
		ranked = [doc.id for doc in store.search(entry.question, top_k=top_k)]
		if ranked[:1] == [entry.id]:
			hits_at_1 += 1
		if entry.id in ranked:
			hits_at_k += 1
		else:
			misses.append(f"{entry.id}: {entry.question}")
		reciprocal_ranks.append(_reciprocal_rank(ranked, {entry.id}))

	total = len(targets)
	print("Exact FAQ questions (upper bound)")
	print(f"  Recall@1      : {hits_at_1}/{total} ({hits_at_1 / total:.1%})")
	print(f"  Recall@{top_k}      : {hits_at_k}/{total} ({hits_at_k / total:.1%})")
	print(f"  MRR           : {statistics.mean(reciprocal_ranks):.3f}")
	if misses and args.verbose:
		for miss in misses:
			print(f"    MISS {miss}")

	# --- 2. Paraphrases ---------------------------------------------------------
	paraphrase_hits = 0
	paraphrase_scores: list[float] = []
	paraphrase_misses: list[str] = []

	for query, expected in PARAPHRASE_PROBES:
		documents = store.search(query, top_k=top_k)
		ranked = [doc.id for doc in documents]
		best = documents[0].similarity if documents else 0.0
		paraphrase_scores.append(best)
		if expected & set(ranked):
			paraphrase_hits += 1
		else:
			paraphrase_misses.append(f"{query!r} -> got {ranked}, wanted {sorted(expected)}")

	print("\nParaphrased questions (realistic)")
	print(
		f"  Recall@{top_k}      : {paraphrase_hits}/{len(PARAPHRASE_PROBES)} "
		f"({paraphrase_hits / len(PARAPHRASE_PROBES):.1%})"
	)
	print(f"  Best score    : min {min(paraphrase_scores):.3f} | "
		f"median {statistics.median(paraphrase_scores):.3f} | max {max(paraphrase_scores):.3f}")
	for miss in paraphrase_misses:
		print(f"    MISS {miss}")

	# --- 3. Off-topic separation ------------------------------------------------
	off_topic_scores: list[float] = []
	leaks: list[str] = []
	for query in OFF_TOPIC_PROBES:
		documents = store.search(query, top_k=top_k)
		best = documents[0].similarity if documents else 0.0
		off_topic_scores.append(best)
		if best >= settings.min_similarity:
			leaks.append(f"{query!r} scored {best:.3f} (>= {settings.min_similarity})")

	print("\nOff-topic questions (must be refused)")
	print(f"  Best score    : min {min(off_topic_scores):.3f} | "
		f"median {statistics.median(off_topic_scores):.3f} | max {max(off_topic_scores):.3f}")
	print(
		f"  Above threshold: {len(leaks)}/{len(OFF_TOPIC_PROBES)} "
		f"{'(all correctly gated)' if not leaks else ''}"
	)
	for leak in leaks:
		print(f"    LEAK {leak}")

	# --- 4. Threshold guidance --------------------------------------------------
	in_domain_floor = min(paraphrase_scores)
	off_topic_ceiling = max(off_topic_scores)
	print("\nThreshold guidance")
	print(f"  Lowest in-domain best score : {in_domain_floor:.3f}")
	print(f"  Highest off-topic best score: {off_topic_ceiling:.3f}")
	if in_domain_floor > off_topic_ceiling:
		suggested = round((in_domain_floor + off_topic_ceiling) / 2, 2)
		print(f"  Populations separate cleanly. Suggested RAG_MIN_SIMILARITY = {suggested}")
	else:
		print(
			"  Populations overlap — no threshold separates them perfectly. "
			f"Current {settings.min_similarity} trades recall against leakage; "
			"the generation guardrail is the backstop for anything that gets through."
		)

	return 0


if __name__ == "__main__":
	raise SystemExit(main())
