// NB: not annotating NextConfig because `next/types.d.ts` is broken in 16.2.4
// (re-exports from a non-existent ./dist/types path). Re-add the annotation
// once the packaging bug is fixed upstream.
const nextConfig = {
  // Silence the "multiple lockfiles detected" warning — pin workspace root to
  // this project directory so turbopack doesn't pick up ~/package-lock.json.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
