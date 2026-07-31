"""Chroma-backed vector store: indexing and semantic search.

The collection is configured for cosine distance, so a query result converts to
a similarity in ``[-1, 1]`` via ``1 - distance``. That similarity is what the
retrieval guardrail thresholds on, which is only meaningful because the space is
pinned here rather than left at Chroma's default squared-L2.

The index is content-addressed: the knowledge-base fingerprint and the embedding
signature are stored on the collection, and ``build()`` rebuilds only when either
changes. Restarting the app therefore costs nothing, while editing the FAQ file
or switching embedding models triggers a clean re-index automatically.
"""

import logging
from datetime import datetime, timezone

import chromadb
from chromadb.config import Settings as ChromaSettings
from pydantic import BaseModel

from chatbot.core.config import Settings
from chatbot.core.embeddings import build_embedding_function, embedding_signature
from chatbot.core.knowledge_base import VERIFIED, KnowledgeBase
from chatbot.core.schemas import RetrievedDocument

logger = logging.getLogger(__name__)


class IndexStats(BaseModel):
	"""Outcome of an index build."""

	collection: str
	document_count: int
	kb_fingerprint: str
	embedding: str
	rebuilt: bool
	built_at: str = ""


class VectorStore:
	"""Owns the Chroma client, the collection, and all vector operations."""

	def __init__(self, settings: Settings):
		"""Initializes the store without touching disk.

		Args:
			settings (Settings): Configuration for paths, collection name,
				embedding provider and retrieval defaults.
		"""
		self.settings = settings
		self._client: chromadb.ClientAPI | None = None
		self._collection = None
		self._embedding_function = None

	# ------------------------------------------------------------------
	# Lazily-built resources
	# ------------------------------------------------------------------
	@property
	def client(self) -> chromadb.ClientAPI:
		if self._client is None:
			self.settings.chroma_path.mkdir(parents=True, exist_ok=True)
			self._client = chromadb.PersistentClient(
				path=str(self.settings.chroma_path),
				settings=ChromaSettings(anonymized_telemetry=False, allow_reset=True),
			)
		return self._client

	@property
	def embedding_function(self):
		if self._embedding_function is None:
			self._embedding_function = build_embedding_function(self.settings)
		return self._embedding_function

	@property
	def collection(self):
		"""The Chroma collection, created on first access if missing."""
		if self._collection is None:
			self._collection = self.client.get_or_create_collection(
				name=self.settings.collection_name,
				embedding_function=self.embedding_function,
				configuration={"hnsw": {"space": "cosine"}},
			)
		return self._collection

	# ------------------------------------------------------------------
	# Indexing
	# ------------------------------------------------------------------
	def describe(self) -> dict:
		"""Returns the collection's stored fingerprint metadata and size."""
		metadata = self.collection.metadata or {}
		return {
			"count": self.collection.count(),
			"kb_fingerprint": metadata.get("kb_fingerprint", ""),
			"embedding": metadata.get("embedding", ""),
			"built_at": metadata.get("built_at", ""),
		}

	def is_stale(self, knowledge_base: KnowledgeBase) -> bool:
		"""True when the index is missing, empty, or built from different inputs."""
		state = self.describe()
		if state["count"] == 0:
			return True
		if state["kb_fingerprint"] != knowledge_base.fingerprint:
			return True
		return state["embedding"] != embedding_signature(self.settings)

	def build(self, knowledge_base: KnowledgeBase | None = None, force: bool = False) -> IndexStats:
		"""Indexes the knowledge base, skipping the work when already current.

		Args:
			knowledge_base (KnowledgeBase | None): Pre-loaded knowledge base.
				Loaded from ``settings.knowledge_base_path`` when omitted.
			force (bool): Rebuild even if the fingerprints match.

		Returns:
			IndexStats: What is now in the collection, and whether it was rebuilt.
		"""
		knowledge_base = knowledge_base or KnowledgeBase.load(self.settings.knowledge_base_path)

		if not force and not self.is_stale(knowledge_base):
			state = self.describe()
			return IndexStats(
				collection=self.settings.collection_name,
				document_count=state["count"],
				kb_fingerprint=state["kb_fingerprint"],
				embedding=state["embedding"],
				rebuilt=False,
				built_at=state["built_at"],
			)

		built_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
		# A full drop-and-recreate keeps the index exactly in step with the source
		# file: entries deleted from the JSON cannot linger as retrievable chunks.
		try:
			self.client.delete_collection(self.settings.collection_name)
		except Exception:  # noqa: BLE001 - absence is the common, harmless case
			logger.debug("No existing collection %s to delete", self.settings.collection_name)

		self._collection = self.client.create_collection(
			name=self.settings.collection_name,
			embedding_function=self.embedding_function,
			configuration={"hnsw": {"space": "cosine"}},
			metadata={
				"kb_fingerprint": knowledge_base.fingerprint,
				"embedding": embedding_signature(self.settings),
				"built_at": built_at,
				"source": str(knowledge_base.path or self.settings.knowledge_base_path),
			},
		)

		entries = knowledge_base.entries
		self._collection.add(
			ids=[entry.id for entry in entries],
			documents=[entry.text for entry in entries],
			metadatas=[entry.to_metadata() for entry in entries],
		)
		logger.info("Indexed %d entries into %s", len(entries), self.settings.collection_name)

		return IndexStats(
			collection=self.settings.collection_name,
			document_count=len(entries),
			kb_fingerprint=knowledge_base.fingerprint,
			embedding=embedding_signature(self.settings),
			rebuilt=True,
			built_at=built_at,
		)

	# ------------------------------------------------------------------
	# Search
	# ------------------------------------------------------------------
	def search(
		self,
		query: str,
		top_k: int | None = None,
		include_unverified: bool | None = None,
	) -> list[RetrievedDocument]:
		"""Runs semantic search and returns the closest chunks, best first.

		Args:
			query (str): Natural-language query text.
			top_k (int | None): Number of chunks to return. Defaults to
				``settings.top_k``.
			include_unverified (bool | None): Whether chunks flagged
				``needs_client_confirmation`` may be returned. Defaults to
				``settings.serve_unverified``.

		Returns:
			list[RetrievedDocument]: Ranked chunks with cosine similarities.
		"""
		query = (query or "").strip()
		if not query:
			return []

		top_k = top_k or self.settings.top_k
		if include_unverified is None:
			include_unverified = self.settings.serve_unverified

		where = None if include_unverified else {"status": {"$eq": VERIFIED}}

		result = self.collection.query(
			query_texts=[query],
			n_results=top_k,
			where=where,
			include=["documents", "metadatas", "distances"],
		)

		ids = (result.get("ids") or [[]])[0]
		documents = (result.get("documents") or [[]])[0]
		metadatas = (result.get("metadatas") or [[]])[0]
		distances = (result.get("distances") or [[]])[0]

		retrieved: list[RetrievedDocument] = []
		for rank, (doc_id, text, metadata, distance) in enumerate(
			zip(ids, documents, metadatas, distances), start=1
		):
			metadata = metadata or {}
			tags = [tag.strip() for tag in str(metadata.get("tags", "")).split(",") if tag.strip()]
			retrieved.append(
				RetrievedDocument(
					id=doc_id,
					question=str(metadata.get("question", "")),
					answer=str(metadata.get("answer", "")),
					text=text or "",
					category=str(metadata.get("category", "")),
					tags=tags,
					source_url=str(metadata.get("source_url", "")),
					status=str(metadata.get("status", VERIFIED)),
					note=str(metadata.get("note", "")) or None,
					# Cosine distance in Chroma is 1 - cosine_similarity.
					similarity=round(1.0 - float(distance), 4),
					rank=rank,
				)
			)
		return retrieved

	def count(self) -> int:
		return self.collection.count()
