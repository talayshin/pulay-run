// NB: not annotating NextConfig because `next/types.d.ts` is broken in 16.2.4
// (re-exports from a non-existent ./dist/types path). Re-add the annotation
// once the packaging bug is fixed upstream.
const nextConfig = {
  // Silence the "multiple lockfiles detected" warning — pin workspace root to
  // this project directory so turbopack doesn't pick up ~/package-lock.json.
  turbopack: {
    root: process.cwd(),
  },
  typescript: {
    // Next.js 16.2.4 auto-generates .next/dev/types/validator.ts with imports
    // from a broken next/types.js barrel. CI runs `tsc --noEmit` separately
    // (with .next/dev excluded) so type safety is still enforced at PR time.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
