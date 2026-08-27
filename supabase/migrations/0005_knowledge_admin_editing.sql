-- ===========================================================================
-- 0005 — the knowledge base becomes editable, and the database becomes its
-- source of truth.
--
-- Until now the assistant's knowledge was written only by
-- `npm run kb:ingest`, which read a CSV that lives on one person's laptop and
-- deleted anything it did not find there. Correcting one wrong answer meant
-- editing a spreadsheet and re-running a script. /admin/settings can now add,
-- edit and remove entries directly, which needs one column and one rule.
--
-- The column: `kb_documents.content`. The text an entry was built from lived
-- only in `kb_chunks`, cut into pieces. Editing needs the whole thing back —
-- both to show it and because a change has to be re-chunked from the original,
-- not from a reassembly of overlapping fragments.
--
-- The rule (enforced in scripts/ingest-knowledge.ts, not here): a document
-- whose `source` is 'admin' has been touched by a human and is never
-- overwritten by the importer again. Pruning is gone entirely, so deleting is
-- something only /admin/settings does.
--
-- Apply by pasting this whole file into the Supabase SQL Editor and running it.
-- ===========================================================================

begin;

alter table public.kb_documents add column if not exists content text not null default '';

-- ---------------------------------------------------------------------------
-- Backfill.
--
-- Exact rather than approximate: every document in the corpus today is a single
-- chunk (111 Q&A rows and 12 short entries from site-data.ts, none of them long
-- enough for chunkText() to split), so chunk 0 *is* the whole content. Were
-- there multi-chunk documents, this would restore them short of their overlap,
-- and the honest repair for those is `npm run kb:ingest -- --force`.
-- ---------------------------------------------------------------------------
update public.kb_documents d
   set content = c.content
  from public.kb_chunks c
 where c.document_id = d.id
   and c.ordinal = 0;

commit;
