import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Cross-Origin-Isolated context is required for SharedArrayBuffer,
        // which dosbox_pure uses for WebAssembly threading.
        source: "/play/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy",  value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
