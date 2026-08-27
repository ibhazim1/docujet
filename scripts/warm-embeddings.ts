/**
 * Downloads the embedding model into `.cache/transformers` at build time.
 *
 * Wired to `prebuild`, so `npm run build` — and therefore every deployment —
 * fetches the weights once, on a machine that has a writable disk and no
 * visitor waiting. `next.config.ts` then traces that directory into the
 * deployed function, and the running server only ever reads it.
 *
 * This is what makes the assistant work on a read-only serverless filesystem.
 * Without it the first question on each cold instance has to download 33 MB
 * before it can be embedded — and on a host where nothing is writable, cannot
 * download it at all, which shows up as an assistant that answers every
 * question with "I don't have that information".
 *
 * Deliberately never fails the build. A Hugging Face outage during a deploy
 * should not stop the deploy: the site still works, the chat panel still
 * answers, and the model gets fetched at runtime instead if the filesystem
 * allows it.
 */

import { EMBEDDING_MODEL, warmEmbeddings } from "../src/lib/chat/embeddings";

async function main(): Promise<void> {
  const started = Date.now();
  await warmEmbeddings();
  console.log(`Cached ${EMBEDDING_MODEL} in ${Date.now() - started}ms.`);
}

main().catch((cause: unknown) => {
  console.warn(
    `Could not pre-cache ${EMBEDDING_MODEL}: ${cause instanceof Error ? cause.message : cause}`,
  );
  console.warn(
    "Continuing the build. The chat assistant will try to download it at runtime, and will " +
      "answer without its knowledge base if it cannot.",
  );
});
