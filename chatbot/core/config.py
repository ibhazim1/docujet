"""Central configuration for the RAG chatbot.

Every tunable — index location, embedding model, retrieval depth, guardrail
thresholds, generation limits — lives here so the Streamlit demo, the CLI
scripts and any production caller share one source of truth. Values come from
environment variables (``.env`` is loaded by ``chatbot.core.llm``), and the app
overrides a few of them per session through ``Settings.model_copy(update=...)``.
"""

import os
from pathlib import Path

from pydantic import BaseModel, Field

PACKAGE_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = PACKAGE_DIR.parent

DEFAULT_KNOWLEDGE_BASE = PACKAGE_DIR / "rag" / "documation-faq-rag.json"
DEFAULT_CHROMA_DIR = PACKAGE_DIR / "rag" / "chroma"


def _env_str(name: str, default: str) -> str:
	value = os.getenv(name)
	return value if value not in (None, "") else default


def _env_int(name: str, default: int) -> int:
	try:
		return int(_env_str(name, str(default)))
	except ValueError:
		return default


def _env_float(name: str, default: float) -> float:
	try:
		return float(_env_str(name, str(default)))
	except ValueError:
		return default


def _env_bool(name: str, default: bool) -> bool:
	return _env_str(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class Settings(BaseModel):
	"""Runtime configuration for indexing, retrieval, guardrails and generation."""

	# --- Knowledge base and vector store ---
	knowledge_base_path: Path = Field(default=DEFAULT_KNOWLEDGE_BASE)
	chroma_path: Path = Field(default=DEFAULT_CHROMA_DIR)
	collection_name: str = "documation_faq"

	# --- Embeddings (local, no API cost) ---
	embedding_provider: str = "onnx"
	embedding_model: str = "all-MiniLM-L6-v2"

	# --- Retrieval ---
	top_k: int = 5
	#: Cosine similarity below which a chunk is treated as irrelevant. The
	#: retrieval guardrail refuses the question when nothing clears this bar,
	#: which is what keeps the bot inside the Documation topic space.
	#:
	#: Calibrated with ``python -m chatbot.scripts.eval_retrieval`` on
	#: all-MiniLM-L6-v2: real paraphrases bottom out at 0.24, while off-topic
	#: probes sit at or below 0.21 — except queries that share Malaysian context
	#: ("weather in Kuala Lumpur", 0.38). The gate is therefore deliberately set
	#: for recall, not precision: it stops the clearly unrelated, and the citation
	#: guardrail in chatbot.core.guardrails rejects whatever gets past it.
	min_similarity: float = 0.22
	#: Serving entries flagged ``needs_client_confirmation`` is off by default:
	#: the knowledge base itself instructs that they must not be served until
	#: Documation confirms the underlying facts.
	serve_unverified: bool = False

	# --- Generation ---
	llm_model: str = "deepseek-chat"
	temperature: float = 0.0
	max_output_tokens: int = 700
	#: Turns of prior conversation (user+assistant pairs) kept in the prompt.
	max_history_turns: int = 4

	# --- Guardrails ---
	max_question_chars: int = 1000
	min_question_chars: int = 2
	#: Optional second LLM pass that audits the answer against the context.
	#: Roughly doubles cost per turn, so it is opt-in.
	enable_groundedness_check: bool = False
	#: Deterministic history-aware query expansion for short follow-ups.
	enable_query_expansion: bool = True

	# --- Demo/display only ---
	usd_to_myr: float = 4.45

	@classmethod
	def from_env(cls) -> "Settings":
		"""Builds settings from environment variables, falling back to defaults."""
		return cls(
			knowledge_base_path=Path(_env_str("RAG_KNOWLEDGE_BASE", str(DEFAULT_KNOWLEDGE_BASE))),
			chroma_path=Path(_env_str("RAG_CHROMA_PATH", str(DEFAULT_CHROMA_DIR))),
			collection_name=_env_str("RAG_COLLECTION", "documation_faq"),
			embedding_provider=_env_str("RAG_EMBEDDING_PROVIDER", "onnx"),
			embedding_model=_env_str("RAG_EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
			top_k=_env_int("RAG_TOP_K", 5),
			min_similarity=_env_float("RAG_MIN_SIMILARITY", 0.22),
			serve_unverified=_env_bool("RAG_SERVE_UNVERIFIED", False),
			llm_model=_env_str("DEEPSEEK_MODEL", "deepseek-chat"),
			temperature=_env_float("LLM_TEMPERATURE", 0.0),
			max_output_tokens=_env_int("LLM_MAX_OUTPUT_TOKENS", 700),
			max_history_turns=_env_int("LLM_MAX_HISTORY_TURNS", 4),
			max_question_chars=_env_int("GUARDRAIL_MAX_QUESTION_CHARS", 1000),
			enable_groundedness_check=_env_bool("GUARDRAIL_GROUNDEDNESS_CHECK", False),
			enable_query_expansion=_env_bool("RAG_QUERY_EXPANSION", True),
			usd_to_myr=_env_float("USD_TO_MYR", 4.45),
		)
