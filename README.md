# documation

documation-lead-generation

A retrieval-augmented chatbot over Documation Sdn Bhd's FAQ knowledge base. It
answers questions using only retrieved documents, refuses everything else, and
shows exactly which FAQ entries produced each answer along with the token and
cost accounting for the turn.

The knowledge base holds 181 entries from two sources: 68 `FAQ-*` entries about
Documation itself, and 113 `EPSON-*` entries covering the Epson WorkForce
Enterprise WF-C20600 / WF-C20750 / WF-C21000 — partner-product reference taken
from Epson's July 2020 brochure. Epson entries describe Epson's hardware, never
Documation's own equipment or capacity; the system prompt enforces that
distinction and the two entries that would claim otherwise are held back.

- **Retrieval**: ChromaDB + a local `all-MiniLM-L6-v2` embedding model (no API cost)
- **Generation**: DeepSeek (`deepseek-chat`) via the OpenAI-compatible client
- **Demo**: Streamlit app with retrieved sources (each labelled with the knowledge-base source it came from), guardrail trace, token counter and live price estimate

---

## Quick start

```bash
pip install -r requirements.txt          # first run downloads ~80 MB embedding model
cp .env.example .env                     # then set DEEPSEEK_API_KEY

python -m chatbot.scripts.ingest         # build the vector index
streamlit run chatbot/app/streamlit_app.py
```

The index builds itself on first use, so the ingest step is optional — it is
there for deployments that want indexing separated from serving.

---

## Layout

| Path | Purpose |
| --- | --- |
| [chatbot/core/rag_chatbot.py](chatbot/core/rag_chatbot.py) | The pipeline: guard → retrieve → gate → generate → verify |
| [chatbot/core/retriever.py](chatbot/core/retriever.py) | Semantic search, follow-up handling, relevance gate |
| [chatbot/core/vector_store.py](chatbot/core/vector_store.py) | Chroma collection, indexing, cosine search |
| [chatbot/core/guardrails.py](chatbot/core/guardrails.py) | Input validation, output verification |
| [chatbot/core/prompts.py](chatbot/core/prompts.py) | System prompt, context formatting, refusal text |
| [chatbot/core/config.py](chatbot/core/config.py) | All tunables, loaded from environment |
| [chatbot/core/pricing.py](chatbot/core/pricing.py) | DeepSeek rate card and cost estimation |
| [chatbot/core/llm.py](chatbot/core/llm.py) | DeepSeek client wrapper |
| [chatbot/app/streamlit_app.py](chatbot/app/streamlit_app.py) | Demo UI — presentation only, no chatbot logic |
| [chatbot/scripts/](chatbot/scripts/) | `ingest`, `ask`, `eval_retrieval` CLIs |
| [tests/](tests/) | Offline tests for the guardrail and retrieval logic |

Everything the chatbot needs lives in `chatbot/core`. The Streamlit app is a
client of it: to ship this in production, import `RAGChatbot` and drop the app.

```python
from chatbot.core.config import Settings
from chatbot.core.rag_chatbot import RAGChatbot

bot = RAGChatbot(Settings.from_env())
bot.ensure_index()

result = bot.answer("What is eONE?")
result.answer        # text to show the user
result.answered      # False when a guardrail refused
result.sources       # retrieved documents, with .cited marking the ones used
result.guardrails    # full pass/fail trace, ready to log
result.usage.total_tokens, result.cost.total_cost_usd
```

`RAGChatbot.answer()` never raises for an API or parsing failure — it returns a
refusal with the error recorded in `guardrails`, so a caller cannot accidentally
show an unguarded response.

---

## Guardrails

Five layers, so no single one has to be perfect. Two of them are deterministic
and run before any API call, which means the common attacks cost nothing.

| Layer | Runs | Catches |
| --- | --- | --- |
| Input guard | before API call | length abuse, control-character smuggling, prompt injection, role hijack, prompt extraction |
| Retrieval gate | before API call | off-topic questions — nothing relevant retrieved, so the model is never asked |
| Grounded generation | during | model sees only retrieved chunks and must return `answered` + `citations` |
| Output verification | after | invented citation ids, empty answers, prompt leakage, entries pending client confirmation |
| Groundedness audit | after (optional) | claims not supported by the context, via a second model pass |

Two design choices matter most:

**Citations are mechanical, not decorative.** The model must return the ids it
used. Any id not in the retrieved set is dropped, and an answer left with no
valid citation is discarded and replaced with a refusal. A hallucinated answer
has nothing real to cite.

**Unconfirmed entries are never served.** The knowledge base flags seven entries
(`FAQ-050`, `FAQ-051`, `FAQ-053`, `FAQ-061`, `FAQ-063`, `EPSON-112`,
`EPSON-113`) as `needs_client_confirmation` — including the ISO 27001 claim, a
contradictory phone number, and the two questions that would have the bot claim
Documation operates or resells specific Epson hardware. These are indexed but
filtered out of retrieval, and re-checked at the output stage. Asking "Is
Documation ISO 27001 certified?" gets a refusal, not a guess. Set
`RAG_SERVE_UNVERIFIED=true` only after Documation confirms the wording.

Observed behaviour on the current knowledge base:

| Question | Outcome | Tokens |
| --- | --- | --- |
| "What is eONE?" | answered, cites FAQ-034 | ~1,500 |
| "What is the capital of France?" | refused at the retrieval gate | 0 |
| "Ignore all previous instructions..." | blocked at the input guard | 0 |
| "Who is Documation's CEO?" | refused — not in the knowledge base | ~1,470 |
| "Is Documation ISO 27001 certified?" | refused — entry pending confirmation | ~1,450 |
| "How fast does the Epson WF-C21000 print in duplex?" | answered, cites EPSON-021 and EPSON-023 | ~1,780 |
| "Do you use Epson printers in your own production facility?" | refused — entry pending confirmation | ~1,720 |

---

## Retrieval

Each FAQ entry is one chunk, as the knowledge base's own `chunking_guidance`
requires. The collection uses cosine distance, so `similarity = 1 - distance`
and the threshold is interpretable.

**Quality** (`python -m chatbot.scripts.eval_retrieval`, no API key needed):

```
Exact FAQ questions   Recall@1 96.6%   Recall@5 99.4%   MRR 0.980   (174 verified entries)
Paraphrased questions Recall@5 100%    (34 hand-written probes, 12 of them Epson)
Off-topic questions   10/12 correctly scored below threshold
```

**Threshold**: `RAG_MIN_SIMILARITY` defaults to `0.22`. Real paraphrases bottom
out at 0.24; off-topic probes sit at or below 0.21, except two that share
vocabulary with the corpus — "weather in Kuala Lumpur" (0.38, Malaysian context)
and "best programming language to learn" (0.23, which brushes the printer
language entry). The gate is therefore tuned for recall — it stops the clearly
unrelated, and the citation guard rejects whatever gets past it.

**Follow-ups**: a short or pronoun-led question ("What about the cost?") is
re-searched with the previous question prepended, and the two ranked lists are
fused with Reciprocal Rank Fusion so the follow-up's own best hit is not buried
by the previous topic's higher scores. To stop an off-topic question inheriting
the previous turn's relevance, a follow-up that names something of its own is
gated on its own bare score.

---

## Cost and tokens

Every model call's usage is read from the API response, including DeepSeek's
context-cache hit/miss split, and priced from a rate card. The Streamlit sidebar
exposes the rates as editable fields and re-prices the whole session live, plus
an MYR conversion.

**The default rates in [pricing.py](chatbot/core/pricing.py) are not
authoritative** — DeepSeek has repriced several times. Check
<https://api-docs.deepseek.com/quick_start/pricing> and set
`DEEPSEEK_PRICE_CACHE_HIT`, `DEEPSEEK_PRICE_CACHE_MISS` and
`DEEPSEEK_PRICE_OUTPUT` before quoting a number to anyone.

A typical answered turn costs roughly 1,400–1,600 tokens (the retrieved context
dominates). Refusals caught by the first two layers cost nothing.

---

## CLI

```bash
python -m chatbot.scripts.ingest --force          # rebuild the index
python -m chatbot.scripts.ingest --status         # index state
python -m chatbot.scripts.ask "What is eONE?"     # one-shot question
python -m chatbot.scripts.ask --trace "..."       # with the guardrail trace
python -m chatbot.scripts.ask                     # interactive chat
python -m chatbot.scripts.eval_retrieval          # retrieval quality, offline
pytest -q                                         # 52 offline tests
```

The index is content-addressed: it rebuilds automatically when the knowledge-base
file or the embedding model changes, and is skipped otherwise.

---

## Known limitations

- **English only.** `all-MiniLM-L6-v2` is an English model, so a Malay question
  ("Di manakah pejabat Documation?") retrieves poorly and the bot refuses rather
  than answering wrongly. For Malay support, set
  `RAG_EMBEDDING_PROVIDER=sentence-transformers` and
  `RAG_EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2`, then re-ingest.
  That pulls in PyTorch (~2 GB).
- **Answers are capped by the knowledge base.** The eight `open_items` in the
  source file (SLA figures, client references, headline statistics, and which
  Epson hardware Documation actually operates) are questions the bot structurally
  cannot answer until Documation supplies the facts.
- **Epson model numbers embed weakly.** `WF-C20600`, `WF-C20750` and `WF-C21000`
  are near-identical to a MiniLM tokenizer, so a query naming one model retrieves
  all three order-code entries and relies on the model to pick the matching
  string from the context. Answers stay correct, but do not expect the right
  entry to always rank first.
- **No streaming.** Answers are validated as a whole before display, which rules
  out token streaming; a turn takes 1–3 seconds.
- **Single-process index.** ChromaDB runs embedded in the app. For multiple
  concurrent servers, point them at a shared Chroma server instead of the local
  path.
