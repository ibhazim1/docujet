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

  /**
   * ...and put the one it does need back in.
   *
   * `onnxruntime-node` locates its binding at runtime, from
   * `path.join(__dirname, 'bin', 'napi-v6', process.platform, process.arch)`.
   * Nothing about that is statically analysable, so file tracing includes none
   * of them — verified in `.next/server/app/api/chat/route.js.nft.json`, which
   * listed 95 files from the library and not one `.node` or `.so` among them.
   * The deployed function then throws on `require('onnxruntime-node')`, and
   * /api/chat answers 500 without reaching any code in this repository.
   *
   * Both Linux architectures, since the deployment target may be either, and
   * together they are 53 MB against the 160 MB the excludes above remove.
   */
  outputFileTracingIncludes: {
    "/api/chat": ["node_modules/onnxruntime-node/bin/napi-v6/linux/**"],
  },
};

export default nextConfig;
