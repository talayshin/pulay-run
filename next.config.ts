import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence the "multiple lockfiles detected" warning — pin workspace root to
  // this project directory so turbopack doesn't pick up ~/package-lock.json.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
