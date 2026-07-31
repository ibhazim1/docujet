"""Command-line client for the guarded Documation RAG chatbot.

Usage:
	python -m chatbot.scripts.ask "What is eONE?"
	python -m chatbot.scripts.ask                      # interactive chat
	python -m chatbot.scripts.ask --trace "Is Documation ISO certified?"
	python -m chatbot.scripts.ask --audit "How much does it cost?"
"""

import argparse
import logging

from chatbot.core.config import Settings
from chatbot.core.rag_chatbot import RAGChatbot
from chatbot.core.schemas import ChatAnswer
from chatbot.scripts import configure_console


def render(answer: ChatAnswer, settings: Settings, show_trace: bool) -> None:
	"""Prints an answer plus its sources, guardrail trace and cost."""
	print(f"\n{answer.answer}\n")

	threshold = answer.retrieval_threshold or settings.min_similarity
	if answer.sources:
		print(f"Retrieved context (top {len(answer.sources)}), query: {answer.retrieval_query!r}")
		for doc in answer.sources:
			marker = "*" if doc.cited else " "
			gated = "" if doc.similarity >= threshold else "  [below threshold]"
			print(f" {marker} {doc.rank}. {doc.similarity:+.3f}  {doc.id}  {doc.question}{gated}")
		print("   (* = cited in the answer)")

	if show_trace:
		print("\nGuardrails")
		for event in answer.guardrails:
			print(f"   [{'PASS' if event.passed else 'FAIL'}] {event.stage}/{event.name}: {event.detail}")

	usage = answer.usage
	myr = answer.cost.total_cost_usd * settings.usd_to_myr
	print(
		f"\nTokens: {usage.total_tokens} "
		f"(in {usage.prompt_tokens} — {usage.cache_hit_tokens} cached, out {usage.completion_tokens})"
		f" | Cost: ${answer.cost.total_cost_usd:.6f} (~RM {myr:.6f})"
		f" | {answer.latency_ms} ms"
	)


def main() -> int:
	parser = argparse.ArgumentParser(description="Ask the Documation FAQ chatbot.")
	parser.add_argument("question", nargs="*", help="Question text. Omit for interactive chat.")
	parser.add_argument("--trace", action="store_true", help="Print the guardrail trace")
	parser.add_argument("--audit", action="store_true", help="Enable the LLM groundedness audit")
	parser.add_argument("--top-k", type=int, default=None, help="Chunks to retrieve")
	parser.add_argument("--serve-unverified", action="store_true",
		help="Also serve entries pending client confirmation (not recommended)")
	parser.add_argument("-v", "--verbose", action="store_true", help="Enable info logging")
	args = parser.parse_args()

	configure_console()
	logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(message)s")

	settings = Settings.from_env()
	updates: dict = {}
	if args.audit:
		updates["enable_groundedness_check"] = True
	if args.top_k:
		updates["top_k"] = args.top_k
	if args.serve_unverified:
		updates["serve_unverified"] = True
	if updates:
		settings = settings.model_copy(update=updates)

	bot = RAGChatbot(settings)
	stats = bot.ensure_index()
	if stats.rebuilt:
		print(f"Indexed {stats.document_count} documents into '{stats.collection}'.")

	if args.question:
		render(bot.answer(" ".join(args.question)), settings, args.trace)
		return 0

	print("Documation FAQ assistant. Type 'exit' or Ctrl-C to quit.")
	history: list[dict[str, str]] = []
	while True:
		try:
			question = input("\nyou> ").strip()
		except (EOFError, KeyboardInterrupt):
			print()
			return 0
		if not question:
			continue
		if question.lower() in {"exit", "quit"}:
			return 0

		answer = bot.answer(question, history=history)
		render(answer, settings, args.trace)
		history.append({"role": "user", "content": question})
		history.append({"role": "assistant", "content": answer.answer})


if __name__ == "__main__":
	raise SystemExit(main())
