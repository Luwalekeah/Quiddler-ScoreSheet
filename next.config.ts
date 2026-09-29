import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 auto-generates AGENTS.md / CLAUDE.md project rule files on
  // every dev/build run. This repo's agent guidance lives in .pipeline/
  // and the user's own global CLAUDE.md, so turn the generator off rather
  // than committing a duplicate, drifting copy.
  agentRules: false,
  output: "standalone",
};

export default nextConfig;
