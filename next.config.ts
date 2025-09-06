import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lock project root for output tracing (moved out of experimental)
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
