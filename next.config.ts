import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Transformers.js embeds the chat assistant's questions on the server (see
   * src/lib/chat/embeddings.ts). It is left out of the bundle because it loads
   * its ONNX runtime and its model weights from the filesystem at runtime —
   * bundling would either break those paths or drag tens of megabytes of
   * binaries through the compiler for no benefit.
   */
  serverExternalPackages: ["@huggingface/transformers"],
};

export default nextConfig;
