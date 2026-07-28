"""Loading and validation of the Documation FAQ knowledge base.

The source file is a curated JSON document whose ``meta.chunking_guidance``
states that each entry is exactly one chunk and must not be split or merged, so
this module does no chunking of its own — it validates entries and hands them to
the vector store as-is.

Entries also carry a ``status``. ``needs_client_confirmation`` marks facts the
knowledge base explicitly forbids serving until Documation confirms them; that
flag is preserved into the index so retrieval can filter on it.
"""

import hashlib
import json
from pathlib import Path

from pydantic import BaseModel, Field

VERIFIED = "verified"
NEEDS_CONFIRMATION = "needs_client_confirmation"


class KnowledgeBaseEntry(BaseModel):
	"""One FAQ chunk, ready to embed."""

	id: str
	question: str
	answer: str
	text: str
	category: str = ""
	tags: list[str] = Field(default_factory=list)
	source_url: str = ""
	status: str = VERIFIED
	note: str | None = None

	def to_metadata(self) -> dict[str, str]:
		"""Flattens the entry into Chroma-compatible scalar metadata."""
		return {
			"question": self.question,
			"answer": self.answer,
			"category": self.category,
			"tags": ", ".join(self.tags),
			"source_url": self.source_url,
			"status": self.status,
			"note": self.note or "",
		}


class KnowledgeBase(BaseModel):
	"""The parsed knowledge-base file."""

	meta: dict = Field(default_factory=dict)
	entries: list[KnowledgeBaseEntry] = Field(default_factory=list)
	open_items: list[dict] = Field(default_factory=list)
	fingerprint: str = ""
	path: Path | None = None

	@classmethod
	def load(cls, path: Path | str) -> "KnowledgeBase":
		"""Reads and validates the knowledge-base JSON at ``path``.

		Args:
			path (Path | str): Location of the knowledge-base file.

		Returns:
			KnowledgeBase: Parsed entries plus a content fingerprint used to
			detect when the index needs rebuilding.

		Raises:
			FileNotFoundError: If the file does not exist.
			ValueError: If the file contains no usable entries.
		"""
		path = Path(path)
		if not path.exists():
			raise FileNotFoundError(f"Knowledge base not found: {path}")

		raw_bytes = path.read_bytes()
		payload = json.loads(raw_bytes.decode("utf-8"))

		entries: list[KnowledgeBaseEntry] = []
		seen_ids: set[str] = set()
		for item in payload.get("entries", []):
			entry_id = str(item.get("id") or "").strip()
			text = (item.get("text") or "").strip()
			# An entry with no id or no embeddable text cannot be cited, and an
			# uncitable chunk is worse than a missing one under these guardrails.
			if not entry_id or not text or entry_id in seen_ids:
				continue
			seen_ids.add(entry_id)
			entries.append(
				KnowledgeBaseEntry(
					id=entry_id,
					question=(item.get("question") or "").strip(),
					answer=(item.get("answer") or "").strip(),
					text=text,
					category=(item.get("category") or "").strip(),
					tags=[str(tag) for tag in item.get("tags", [])],
					source_url=(item.get("source_url") or "").strip(),
					status=(item.get("status") or VERIFIED).strip(),
					note=item.get("note"),
				)
			)

		if not entries:
			raise ValueError(f"No usable entries found in {path}")

		return cls(
			meta=payload.get("meta", {}),
			entries=entries,
			open_items=payload.get("open_items", []),
			fingerprint=hashlib.sha256(raw_bytes).hexdigest()[:16],
			path=path,
		)

	@property
	def verified_entries(self) -> list[KnowledgeBaseEntry]:
		return [entry for entry in self.entries if entry.status == VERIFIED]

	@property
	def held_back_entries(self) -> list[KnowledgeBaseEntry]:
		"""Entries the knowledge base says must not be served yet."""
		return [entry for entry in self.entries if entry.status != VERIFIED]
