"""Local embedding models for the vector store.

Embeddings run on this machine and cost nothing per query, which matters for a
demo that shows a live price counter: the only billed tokens are DeepSeek's.

Two providers are supported:

``onnx`` (default)
	Chroma's bundled all-MiniLM-L6-v2 ONNX model. ~80 MB, downloaded once to
	``~/.cache/chroma``, CPU-only, no PyTorch. 384-dimensional vectors.
``sentence-transformers``
	Any Sentence-Transformers checkpoint (e.g. ``BAAI/bge-small-en-v1.5``) for
	when retrieval quality matters more than install size. Requires the optional
	``sentence-transformers`` package.

Whichever is chosen must be used for both indexing and querying — vectors from
different models are not comparable — so the provider and model name are baked
into the index fingerprint (see ``chatbot.core.vector_store``).
"""

from chromadb.api.types import EmbeddingFunction

from chatbot.core.config import Settings

ONNX_PROVIDERS = {"onnx", "default", "chroma"}
SENTENCE_TRANSFORMER_PROVIDERS = {"sentence-transformers", "sentence_transformers", "st"}


def build_embedding_function(settings: Settings) -> EmbeddingFunction:
	"""Instantiates the embedding function named by ``settings``.

	Args:
		settings (Settings): Configuration carrying ``embedding_provider`` and
			``embedding_model``.

	Returns:
		EmbeddingFunction: A Chroma-compatible embedding function.

	Raises:
		ValueError: If the provider name is not recognised.
		ImportError: If ``sentence-transformers`` is requested but not installed.
	"""
	provider = settings.embedding_provider.strip().lower()

	if provider in ONNX_PROVIDERS:
		from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

		return DefaultEmbeddingFunction()

	if provider in SENTENCE_TRANSFORMER_PROVIDERS:
		try:
			from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
		except ImportError as exc:  # pragma: no cover - depends on optional extra
			raise ImportError(
				"The 'sentence-transformers' provider requires: pip install sentence-transformers"
			) from exc

		return SentenceTransformerEmbeddingFunction(model_name=settings.embedding_model)

	raise ValueError(
		f"Unknown embedding provider {settings.embedding_provider!r}. "
		f"Use one of: {sorted(ONNX_PROVIDERS | SENTENCE_TRANSFORMER_PROVIDERS)}"
	)


def embedding_signature(settings: Settings) -> str:
	"""Short identifier of the embedding setup, stored alongside the index."""
	provider = settings.embedding_provider.strip().lower()
	if provider in ONNX_PROVIDERS:
		return "onnx:all-MiniLM-L6-v2"
	return f"{provider}:{settings.embedding_model}"
