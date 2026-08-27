/**
 * Text -> vector, in this process.
 *
 * The knowledge base is searched by meaning rather than by keyword, which needs
 * an embedding model on both ends: once per document when `npm run kb:ingest`
 * runs, and once per question when a visitor asks something. Both ends must use
 * the same model — two vectors from different models are not comparable, they
 * are merely the same length — which is why there is one module and not two.
 *
 * It runs locally, on the CPU, through Transformers.js. DeepSeek answers the
 * questions but publishes no embeddings endpoint, and adding a second vendor
 * just to turn 40 short paragraphs into vectors would mean another key, another
 * bill and another outage surface for a model that is 33 MB and runs in
 * milliseconds. The cost of that choice is the first call after a cold start:
 * the weights have to be loaded (and, the very first time ever, downloaded)
 * before anything is embedded. See `warmEmbeddings()`.
 *
 * Server-side only in practice — `@huggingface/transformers` is listed in
 * `serverExternalPackages` in next.config.ts so it is never bundled for the
 * browser — but deliberately carrying no `server-only` marker, because
 * `scripts/ingest-knowledge.ts` imports it under plain Node where that marker
 * throws (the same reasoning as src/lib/supabase/service.ts).
 */

// Type-only, so this import disappears at runtime. The library itself is loaded
// lazily in `getExtractor()` below — see the note there on why that matters.
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Small, English, and built for exactly this: Supabase publish it as the model
 * behind their own pgvector examples, so its 384 dimensions and its ONNX
 * weights are both first-class rather than a conversion someone did once.
 *
 * Changing this model invalidates every stored vector. It is a migration (a new
 * `vector(N)` column width, a full re-ingest), never an edit to this line.
 */
export const EMBEDDING_MODEL = "Supabase/gte-small";

/** Must equal the `vector(384)` width in supabase/migrations/0004_chat_knowledge_base.sql. */
export const EMBEDDING_DIMENSIONS = 384;

/**
 * 8-bit weights. Roughly a quarter of the download and a good deal quicker to
 * load, for a retrieval difference this corpus is far too small to notice.
 * Ingest and query share it, so whatever it costs in accuracy it costs
 * symmetrically — the vectors still live in the same space.
 */
const DTYPE = "q8";

/**
 * The loaded model, shared by every caller in this process.
 *
 * Held as the promise rather than the resolved pipeline so that two requests
 * arriving during a cold start wait on one load instead of racing into two. A
 * failed load clears the slot: a download that died on a flaky network should
 * not poison every later request for the life of the process.
 */
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Loads the library, then the model.
 *
 * The `import()` is deliberately inside the function rather than at the top of
 * the file. Transformers.js reaches a native ONNX runtime, and a native binding
 * can be absent for reasons that have nothing to do with this code — a
 * serverless bundle that did not trace the `.node` file, an unsupported
 * platform. A static import would make that failure happen while the module
 * graph is being loaded, which takes the whole `/api/chat` route down with it:
 * every question answered with a bare 500, before a line of our own code runs.
 *
 * Loaded here instead, the same failure surfaces as a rejected promise inside
 * `retrieveContext()`, which already treats "no retrieval" as a degraded mode
 * rather than an error. The assistant then answers from the business details
 * and says it does not know the rest — which is the behaviour this whole
 * subsystem was designed to fall back to.
 */
function getExtractor(): Promise<FeatureExtractionPipeline> {
  extractorPromise ??= (async () => {
    const { env, pipeline } = await import("@huggingface/transformers");

    /**
     * Where the weights land after the one-off download.
     *
     * Inside the project rather than in a home directory so a deployment's
     * build step can prime it and ship it, and so deleting `.cache/` is all it
     * takes to start clean. Gitignored. A read-only filesystem (most serverless
     * hosts) needs TRANSFORMERS_CACHE pointed somewhere writable.
     */
    env.cacheDir = process.env.TRANSFORMERS_CACHE?.trim() || ".cache/transformers";

    /**
     * Never look for a hand-placed copy under ./models/.
     *
     * Left on (the Node default), every load first probes a directory this
     * project does not have, and a stale or partial copy there would silently
     * outrank the cache. The FS cache above is the only place weights come from.
     */
    env.allowLocalModels = false;

    return pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: DTYPE });
  })().catch((cause: unknown) => {
    extractorPromise = null;
    throw cause;
  });

  return extractorPromise;
}

/**
 * Loads the model without embedding anything.
 *
 * Worth calling before a long ingest so the download's progress is not mistaken
 * for a hang, and worth calling at server start if a cold first question ever
 * feels slow enough to matter.
 */
export async function warmEmbeddings(): Promise<void> {
  await getExtractor();
}

/**
 * How many texts go through the model at once.
 *
 * The batch is padded to its longest member, so an oversized batch spends most
 * of its time multiplying padding. Sixteen keeps memory flat and the padding
 * waste small for chunks of a few hundred characters.
 */
const BATCH_SIZE = 16;

/**
 * Embeds a list of texts, in order.
 *
 * Vectors come back L2-normalised, which is what lets the SQL side treat
 * `1 - (a <=> b)` as a plain 0..1 similarity.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const extractor = await getExtractor();
  const vectors: number[][] = [];

  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE);
    const output = await extractor(batch, { pooling: "mean", normalize: true });
    vectors.push(...(output.tolist() as number[][]));
  }

  // A model whose output width does not match the column width would otherwise
  // fail later, in Postgres, as an opaque type error on the insert — or, worse,
  // for the query side only, as retrieval that quietly returns nothing.
  for (const vector of vectors) {
    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `${EMBEDDING_MODEL} returned ${vector.length}-dimension vectors, but the ` +
          `kb_chunks.embedding column is vector(${EMBEDDING_DIMENSIONS}). Changing the ` +
          "embedding model requires a migration that widens the column and a full re-ingest.",
      );
    }
  }

  return vectors;
}

/** `embed()` for the one-text case — the shape every question takes. */
export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embed([text]);
  return vector;
}
