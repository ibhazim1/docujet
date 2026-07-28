"""Builds the Chroma index from the Documation FAQ knowledge base.

Usage:
	python -m chatbot.scripts.ingest              # build if missing or out of date
	python -m chatbot.scripts.ingest --force      # always re-embed everything
	python -m chatbot.scripts.ingest --status     # report index state, build nothing
	python -m chatbot.scripts.ingest --query "Where is Documation located?"
"""

import argparse
import logging

from chatbot.core.config import Settings
from chatbot.core.knowledge_base import KnowledgeBase
from chatbot.core.vector_store import VectorStore
from chatbot.scripts import configure_console


def main() -> int:
	parser = argparse.ArgumentParser(description="Build the Documation FAQ vector index.")
	parser.add_argument("--force", action="store_true", help="Rebuild even if the index is current")
	parser.add_argument("--status", action="store_true", help="Show index state without building")
	parser.add_argument("--query", default=None, help="Run a test search after building")
	parser.add_argument("--top-k", type=int, default=None, help="Results for --query")
	parser.add_argument("-v", "--verbose", action="store_true", help="Enable info logging")
	args = parser.parse_args()

	configure_console()
	logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(message)s")

	settings = Settings.from_env()
	store = VectorStore(settings)

	if args.status:
		state = store.describe()
		print(f"collection      : {settings.collection_name}")
		print(f"path            : {settings.chroma_path}")
		print(f"documents       : {state['count']}")
		print(f"kb fingerprint  : {state['kb_fingerprint'] or '(none)'}")
		print(f"embedding       : {state['embedding'] or '(none)'}")
		print(f"built at        : {state['built_at'] or '(never)'}")
		return 0

	knowledge_base = KnowledgeBase.load(settings.knowledge_base_path)
	held_back = knowledge_base.held_back_entries
	print(f"Knowledge base  : {settings.knowledge_base_path}")
	print(f"Entries         : {len(knowledge_base.entries)} "
		f"({len(knowledge_base.verified_entries)} verified, {len(held_back)} held back)")
	if held_back:
		print(f"Held back       : {', '.join(entry.id for entry in held_back)}")
		print("                  (indexed but not served while serve_unverified is off)")

	stats = store.build(knowledge_base, force=args.force)
	action = "Rebuilt" if stats.rebuilt else "Already current"
	print(f"\n{action}: {stats.document_count} documents in '{stats.collection}'")
	print(f"Embedding       : {stats.embedding}")
	print(f"Index path      : {settings.chroma_path}")

	if args.query:
		print(f"\nTop matches for {args.query!r}:")
		for doc in store.search(args.query, top_k=args.top_k or settings.top_k):
			flag = "" if doc.is_verified else "  [held back]"
			print(f"  {doc.rank}. {doc.similarity:+.3f}  {doc.id}  {doc.question}{flag}")

	return 0


if __name__ == "__main__":
	raise SystemExit(main())
