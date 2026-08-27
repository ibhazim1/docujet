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

  /**
   * Keep the other platforms' ONNX runtimes out of the deployed function.
   *
   * `onnxruntime-node` ships a prebuilt CPU runtime for every platform it
   * supports — 211 MB of node_modules, of which a Linux x64 host loads 34 MB
   * and ignores the rest. File tracing cannot tell that, because the binding is
   * chosen at runtime from `process.platform`, so without this it copies all of
   * them into the bundle and a serverless deploy runs into its size limit.
   *
   * Excluded by path rather than by "keep only linux/x64" so that a Linux arm64
   * host (a container, a CI runner) still works; only the platforms a server
   * cannot be are removed.
   */
  outputFileTracingExcludes: {
    "**": [
      "node_modules/onnxruntime-node/bin/napi-v6/win32/**",
      "node_modules/onnxruntime-node/bin/napi-v6/darwin/**",
    ],
  },
};

export default nextConfig;
