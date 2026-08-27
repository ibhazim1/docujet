-- ===========================================================================
-- 0004 — the assistant's knowledge base, and the end of n8n.
--
-- The chat assistant used to be an n8n workflow: /api/chat POSTed a question to
-- a webhook and n8n did the retrieval, the prompting and the model call. This
-- migration brings the retrieval half in-house. The answer half now lives in
-- src/lib/chat/deepseek.ts, and the workflow URL setting this file deletes has
-- nothing left to point at.
--
-- Two tables and one function:
--
--   kb_documents      — one row per source (a product, an FAQ entry, a brochure
--                       section). Human-readable ids, because they are written
--                       by the ingest script and read in logs.
--   kb_chunks         — the embedded pieces of those documents, one row each.
--   match_kb_chunks() — cosine nearest-neighbour search, called by
--                       src/lib/chat/knowledge.ts through PostgREST's rpc().
--
-- Fill them with `npm run kb:ingest` after applying this.
--
-- Apply by pasting this whole file into the Supabase SQL Editor and running it.
-- ===========================================================================

begin;

-- pgvector. `if not exists` is doing real work here: Supabase projects often
-- already carry it (installed into the `extensions` schema by the dashboard
-- toggle), and re-creating it in `public` would leave two copies of the type
-- and very confusing errors. Either location resolves as a bare `vector`
-- through the default search_path.
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- kb_documents — what the assistant is allowed to know.
--
-- `id` is a slug the ingest script derives from the source ('faq-heat-free',
-- 'product-wf-c21000', 'brochure-finishing'), not a uuid, so that re-running
-- ingestion updates a document in place rather than accumulating copies, and so
-- crm_leads.cited — which already exists to record "knowledge-base entry ids"
-- against a chatbot lead — can hold something a human can read.
--
-- `content_hash` is what makes re-ingestion cheap: an unchanged document keeps
-- its chunks and is never re-embedded. Embedding runs on the CPU here (see
-- src/lib/chat/embeddings.ts), so skipping it is worth a column.
-- ---------------------------------------------------------------------------
create table public.kb_documents (
  id           text primary key,
  title        text        not null default '',
  -- Where the text came from: 'site-data' or a path like 'knowledge/specs.md'.
  -- Diagnostic only; the assistant never sees it.
  source       text        not null default '',
  -- Optional page on this site the answer can point a visitor at ('/services').
  -- Passed to the model so it can link, which is why it is nullable rather
  -- than defaulted to '': null means "there is nowhere to send them".
  url          text,
  content_hash text        not null default '',
  inserted_at  timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger kb_documents_set_updated_at
  before update on public.kb_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- kb_chunks — the retrievable units.
--
-- 384 dimensions because that is what Supabase/gte-small produces. The number
-- is duplicated in EMBEDDING_DIMENSIONS in src/lib/chat/embeddings.ts, and the
-- ingest script checks the two agree before it writes anything — a mismatch
-- would otherwise surface as an opaque PostgREST error mid-run. Changing the
-- model means a new migration, not an UPDATE: every stored vector becomes
-- meaningless the moment the model that produced it changes.
--
-- `on delete cascade` makes re-ingesting a changed document a two-statement
-- job: delete the document row, insert it again with its new chunks.
-- ---------------------------------------------------------------------------
create table public.kb_chunks (
  id          bigint generated always as identity primary key,
  document_id text        not null references public.kb_documents (id) on delete cascade,
  -- Position within the document, so a retrieved chunk can be shown (or logged)
  -- in reading order rather than in similarity order.
  ordinal     int         not null,
  content     text        not null,
  embedding   vector(384) not null,
  inserted_at timestamptz not null default now(),
  unique (document_id, ordinal)
);

-- HNSW rather than IVFFlat: it needs no training pass and stays correct when
-- the table holds a few dozen rows, which is where this corpus starts. The
-- planner will ignore it at that size and sequentially scan instead, which is
-- also correct — the index is here so growth is a non-event.
--
-- Cosine (`vector_cosine_ops`) to match the `<=>` operator used by
-- match_kb_chunks below. Embeddings are L2-normalised at write time, so cosine
-- and inner product would rank identically; cosine is chosen because it keeps
-- `1 - distance` a readable 0..1 similarity.
create index kb_chunks_embedding_idx
  on public.kb_chunks using hnsw (embedding vector_cosine_ops);

create index kb_chunks_document_id_idx on public.kb_chunks (document_id);

-- ---------------------------------------------------------------------------
-- match_kb_chunks — the one query the assistant runs.
--
-- Lives in SQL rather than in the client because PostgREST cannot express a
-- nearest-neighbour ORDER BY through its query string, and because the
-- similarity floor belongs next to the operator that defines it.
--
-- `min_similarity` is what keeps an off-topic question ("what is the weather")
-- from dragging three printer paragraphs into the prompt: below the floor the
-- assistant is handed nothing and says it does not know, which is the honest
-- answer. The defaults below are only a fallback — src/lib/chat/knowledge.ts
-- passes both on every call, and carries the measurements behind the 0.8.
-- ---------------------------------------------------------------------------
create or replace function public.match_kb_chunks (
  query_embedding vector(384),
  match_count     int   default 6,
  min_similarity  float default 0.8
)
returns table (
  document_id text,
  title       text,
  url         text,
  ordinal     int,
  content     text,
  similarity  float
)
language sql
stable
-- Pinned so the function cannot be redirected by a caller's search_path.
set search_path = public, extensions
as $fn$
  select
    c.document_id,
    d.title,
    d.url,
    c.ordinal,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.kb_chunks c
  join public.kb_documents d on d.id = c.document_id
  where 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$fn$;

-- ---------------------------------------------------------------------------
-- Same posture as crm_leads and app_settings (0001): RLS on, zero policies, so
-- the secret key is the only thing that can read these tables. The public chat
-- endpoint reaches them through src/lib/supabase/service.ts on the server; no
-- Supabase credential is ever handed to a visitor's browser.
--
-- The function is revoked from the API roles for the same reason. It is
-- `security invoker`, so even if it were callable it would run as anon and see
-- nothing — the revoke makes that intent explicit rather than incidental.
-- ---------------------------------------------------------------------------
alter table public.kb_documents enable row level security;
alter table public.kb_chunks    enable row level security;

revoke execute on function public.match_kb_chunks (vector, int, float) from anon, authenticated;
grant  execute on function public.match_kb_chunks (vector, int, float) to service_role;

-- ---------------------------------------------------------------------------
-- The workflow URL setting. Nothing reads `integrations.n8nWebhookUrl` after
-- this release — the field is gone from SiteSettings — and leaving the row
-- would leave a live webhook URL sitting in the database with no owner.
-- ---------------------------------------------------------------------------
delete from public.app_settings where key = 'integrations.n8nWebhookUrl';

commit;
