/**
 * The assistant's knowledge base: what goes in, and what comes back out.
 *
 * This is the half of the old n8n workflow that was doing retrieval. A question
 * is embedded (src/lib/chat/embeddings.ts), the nearest passages are fetched
 * from `kb_chunks` by cosine similarity, and src/lib/chat/prompt.ts pastes them
 * into the system prompt. Nothing else in the app reads these tables.
 *
 * Read and write live together here for the same reason they do in
 * src/lib/crm/leads.ts: `scripts/ingest-knowledge.ts` is a caller like any
 * other, and splitting "the ingest half" into its own module would only make
 * the row shapes travel further from the query that reads them.
 *
 * Both halves go through the secret-key client, so this module is server-side
 * only — and carries no `server-only` marker, because the ingest script imports
 * it under plain Node where that marker throws.
 */

import { isSupabaseConfigured, supabase } from "../supabase/service";
import { embed, embedOne, EMBEDDING_DIMENSIONS } from "./embeddings";

const DOCUMENTS_TABLE = "kb_documents";
const CHUNKS_TABLE = "kb_chunks";
const MATCH_FUNCTION = "match_kb_chunks";

export { isSupabaseConfigured as isKnowledgeConfigured };

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/**
 * One source of truth before it is cut up: a product, an FAQ entry, a section
 * of a brochure. `id` is a slug rather than a generated key so that re-ingesting
 * updates a document in place — see the migration's note on `kb_documents.id`.
 */
export type KnowledgeDocument = {
  id: string;
  title: string;
  /** Provenance for humans reading logs: 'site-data', 'knowledge/specs.md'. */
  source: string;
  /** A page on this site that covers the same ground, or null if there is none. */
  url: string | null;
  content: string;
};

/** A passage the search found, with how close it was. */
export type RetrievedChunk = {
  documentId: string;
  title: string;
  url: string | null;
  content: string;
  /** 0..1, cosine. Higher is closer. */
  similarity: number;
};

// ---------------------------------------------------------------------------
// Retrieval — the request path
// ---------------------------------------------------------------------------

export type RetrieveOptions = {
  /** Passages handed to the model. Enough for a spec question, few enough to stay cheap. */
  limit?: number;
  /**
   * Floor, 0..1. Below this a passage is treated as "the corpus does not cover
   * this" rather than "here is the closest thing in it" — with a corpus this
   * small, every question has a nearest neighbour, and most of them are noise.
   */
  minSimilarity?: number;
};

const DEFAULT_LIMIT = 6;

/**
 * Where "related" stops.
 *
 * Measured against this corpus rather than guessed, because gte-small's cosine
 * scores sit high and close together — nothing here ever scores 0.2, so a
 * textbook 0.3 floor would filter nothing at all. Over the 123 chunks and a
 * spread of questions:
 *
 *   on-topic, best match     0.836 .. 0.916
 *   off-topic, best match    0.760 .. 0.818   (weather, football, a poem)
 *
 * 0.8 sits in that gap, nearer the noise than the signal: an unusually phrased
 * printer question keeps its answer, and a question about the weather comes
 * back empty. The two bands are 0.02 apart, so this is a threshold to re-measure
 * whenever the corpus changes shape — and one that means nothing at all if the
 * embedding model changes, since the numbers are that model's, not the
 * language's.
 */
const DEFAULT_MIN_SIMILARITY = 0.8;

/**
 * Finds the passages most likely to answer a question.
 *
 * Degrades to `[]` rather than throwing on every failure it can have — no
 * Supabase project, an unapplied migration, an empty corpus, a model that will
 * not load. The assistant can still answer from the business facts and product
 * line in the system prompt; losing retrieval should make it less specific, not
 * make the panel show an error. Failures are logged, because an assistant that
 * has quietly stopped retrieving looks exactly like one that is merely vague.
 */
export async function retrieveContext(
  question: string,
  { limit = DEFAULT_LIMIT, minSimilarity = DEFAULT_MIN_SIMILARITY }: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  if (!isSupabaseConfigured()) {
    // Silent until now, which made an unconfigured deployment indistinguishable
    // from a working one whose corpus simply had no answer — the assistant
    // politely says "I don't know" to everything either way.
    console.warn(
      "[chat] SUPABASE_URL / SUPABASE_SECRET_KEY are not set — answering without the " +
        "knowledge base, so the assistant knows nothing about the products.",
    );
    return [];
  }

  let embedding: number[];
  try {
    embedding = await embedOne(question);
  } catch (cause) {
    console.warn(
      "[chat] could not embed the question, answering without retrieval:",
      cause instanceof Error ? cause.message : cause,
    );
    return [];
  }

  const { data, error } = await supabase().rpc(MATCH_FUNCTION, {
    query_embedding: embedding,
    match_count: limit,
    min_similarity: minSimilarity,
  });

  if (error) {
    console.warn(`[chat] knowledge search failed, answering without retrieval: ${error.message}`);
    return [];
  }

  const rows = (data ?? []) as {
    document_id: string;
    title: string;
    url: string | null;
    content: string;
    similarity: number;
  }[];

  return rows.map((row) => ({
    documentId: row.document_id,
    title: row.title,
    url: row.url,
    content: row.content,
    similarity: row.similarity,
  }));
}

// ---------------------------------------------------------------------------
// Ingestion — the offline path
// ---------------------------------------------------------------------------

/**
 * Every document's stored content hash, keyed by id.
 *
 * Lets the ingest script re-embed only what changed. Embedding is the slow part
 * of a run and the corpus mostly does not move between runs.
 */
export async function storedContentHashes(): Promise<Map<string, string>> {
  const { data, error } = await supabase()
    .from(DOCUMENTS_TABLE)
    .select("id,content_hash")
    // PostgREST caps an unbounded select at its configured max-rows (1000 by
    // default). Asking for more than the corpus could plausibly hold makes the
    // cap visible as a warning below rather than as an ingest that mysteriously
    // re-embeds the same documents every run.
    .range(0, 9999);

  if (error) {
    throw new Error(`Could not read the knowledge base: ${error.message}`);
  }

  const rows = data as { id: string; content_hash: string }[];

  if (rows.length === 1000) {
    console.warn(
      "[kb] read exactly 1000 documents — this is probably PostgREST's row cap, and any " +
        "document past it will be re-embedded on every run.",
    );
  }

  return new Map(rows.map((row) => [row.id, row.content_hash]));
}

/**
 * Writes one document and its chunks, replacing whatever was there.
 *
 * Delete-then-insert rather than a diff: chunk boundaries move when the text
 * moves, so "chunk 3" after an edit is not the same passage as "chunk 3" before
 * it, and matching them up would be work in service of a fiction. The delete
 * cascades to `kb_chunks` (see the migration), so the document is never left
 * holding vectors of text it no longer contains.
 *
 * Not a transaction — PostgREST has no way to span one. The window where a
 * document has no chunks is milliseconds long during an offline script, and its
 * only symptom would be an answer that missed one passage.
 */
export async function replaceDocument(
  document: KnowledgeDocument,
  chunks: string[],
  contentHash: string,
): Promise<number> {
  const vectors = await embed(chunks);

  const client = supabase();

  const { error: deleteError } = await client
    .from(DOCUMENTS_TABLE)
    .delete()
    .eq("id", document.id);
  if (deleteError) {
    throw new Error(`Could not replace ${document.id}: ${deleteError.message}`);
  }

  const { error: documentError } = await client.from(DOCUMENTS_TABLE).insert({
    id: document.id,
    title: document.title,
    source: document.source,
    url: document.url,
    content_hash: contentHash,
  });
  if (documentError) {
    throw new Error(`Could not write ${document.id}: ${documentError.message}`);
  }

  const { error: chunkError } = await client.from(CHUNKS_TABLE).insert(
    chunks.map((content, ordinal) => ({
      document_id: document.id,
      ordinal,
      content,
      embedding: vectors[ordinal],
    })),
  );
  if (chunkError) {
    throw new Error(`Could not write chunks for ${document.id}: ${chunkError.message}`);
  }

  return chunks.length;
}

/**
 * Removes documents that are no longer produced by any source.
 *
 * Without this, deleting a paragraph from a markdown file or an FAQ entry from
 * site-data.ts would leave the assistant still quoting it — the most confusing
 * possible failure, because the site and the assistant would disagree.
 */
export async function deleteDocuments(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const { error } = await supabase().from(DOCUMENTS_TABLE).delete().in("id", ids);
  if (error) {
    throw new Error(`Could not prune the knowledge base: ${error.message}`);
  }
}

/** Chunk count, for the ingest script's summary line and for a quick health check. */
export async function countChunks(): Promise<number> {
  const { count, error } = await supabase()
    .from(CHUNKS_TABLE)
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Could not count knowledge chunks: ${error.message}`);
  }

  return count ?? 0;
}

/** Re-exported so the ingest script can check the column width without reaching into the embedder. */
export { EMBEDDING_DIMENSIONS };
