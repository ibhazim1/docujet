"""Command-line entry points for the Documation RAG chatbot."""

import sys


def configure_console() -> None:
	"""Forces UTF-8 on stdout/stderr so CLI output survives Windows code pages.

	The knowledge base is full of em dashes and typographic quotes, and the
	default Windows console encoding (cp1252) raises ``UnicodeEncodeError`` on
	them mid-print. Replacing unencodable characters is preferable to a crash in
	a tool whose whole job is to display text.
	"""
	for stream in (sys.stdout, sys.stderr):
		reconfigure = getattr(stream, "reconfigure", None)
		if reconfigure is not None:
			reconfigure(encoding="utf-8", errors="replace")
