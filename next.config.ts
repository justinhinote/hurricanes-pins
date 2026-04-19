import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ensure the font file is bundled with serverless functions that read it
  // at runtime (lib/text-overlay.ts). Without this, Next's file tracer can
  // miss runtime-only file reads and the deploy ships without the asset.
  outputFileTracingIncludes: {
    '/api/**/*': ['./public/fonts/**'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        // DALL-E image URLs (used briefly before uploading to Blob)
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
      },
    ],
  },
};

export default nextConfig;
