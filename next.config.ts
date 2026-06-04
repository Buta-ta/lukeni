/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'upload.wikimedia.org', port: '', pathname: '/**' },
      { protocol: 'https', hostname: '**.wikipedia.org', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'td.doubleclick.net', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'www.googleadservices.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'googleads.g.doubleclick.net', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'tpc.googlesyndication.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'archive.org', port: '', pathname: '/**' },
      { protocol: 'https', hostname: '**.archive.org', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'api.semanticscholar.org', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'api.core.ac.uk', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'export.arxiv.org', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'api.dictionaryapi.dev', port: '', pathname: '/**' },
      { protocol: 'https', hostname: '**.wiktionary.org', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'covers.openlibrary.org', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'openlibrary.org', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'libgen.is', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'libgen.st', port: '', pathname: '/**' },
    ],
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
  },

  staticPageGenerationTimeout: 120,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'unsafe-eval' 'self' 'unsafe-inline' https: blob:",
              "frame-src 'self' https: blob:",
              "object-src 'self' https: data: blob:",
              "connect-src 'self' blob: data: https: wss:",
              "img-src 'self' data: blob: https: http:",
              "media-src 'self' blob: https: http:",
              "style-src 'self' 'unsafe-inline' https:",
              "font-src 'self' data: https:",
              "manifest-src 'self'",
              "worker-src 'self' blob:",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },

      {
        source: '/bibliotheque/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/encyclopedie/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/presse/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/explore/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/voyage-musical/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },

      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=604800' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/apple-touch-icon.png',
        headers: [
          { key: 'Content-Type', value: 'image/png' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          { key: 'Content-Type', value: 'image/x-icon' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;