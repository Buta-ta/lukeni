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

  // ✅ Désactiver le pre-rendering pour les pages avec Framer Motion
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
              "script-src 'unsafe-eval' 'self' 'unsafe-inline' https://www.google.com https://apis.google.com https://ssl.gstatic.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://*.youtube.com https://*.google.com https://*.gstatic.com https://youtube.com https://www.youtube.com https://google.com https://*.doubleclick.net https://*.googleapis.com https://www.googleadservices.com https://tpc.googlesyndication.com https://www.youtubekids.com https://www.youtube-nocookie.com https://www.youtubeeducation.com https://www-onepick-opensocial.googleusercontent.com https://upload-widget.cloudinary.com https://translate.google.com https://translate.googleapis.com blob:",
              [
                "frame-src",
                "'self'",
                "https://archive.org",
                "https://www.archive.org",
                "https://*.archive.org",
                "https://openlibrary.org",
                "https://www.openlibrary.org",
                "https://www.youtube.com",
                "https://www.youtube-nocookie.com",
                "https://player.vimeo.com",
                "https://www.google.com",
                "https://docs.google.com",
                "https://res.cloudinary.com",
                "https://td.doubleclick.net",
                "https://widget.cloudinary.com",
                "https://upload-widget.cloudinary.com",
                "https://translate.google.com",
                "https://translate.googleapis.com",
              ].join(' '),
              "object-src 'self' https://res.cloudinary.com data:",
              [
                "connect-src",
                "'self'",
                "blob:",
                "data:",
                "https://*.supabase.co",
                "wss://*.supabase.co",
                "https://api.cloudinary.com",
                "https://api-eu.mixpanel.com",
                "https://*.youtube.com",
                "https://www.google-analytics.com",
                "https://tiles.openfreemap.org",
                "https://*.openfreemap.org",
                "https://www.openstreetmap.org",
                "https://*.tile.openstreetmap.org",
                "https://a.tile.openstreetmap.org",
                "https://b.tile.openstreetmap.org",
                "https://c.tile.openstreetmap.org",
                "https://fonts.openmaptiles.org",
                "https://*.openmaptiles.org",
                "https://nominatim.openstreetmap.org",
                "https://translate.googleapis.com",
                "https://translate.google.com",
                "https://*.wikipedia.org",
                "https://upload.wikimedia.org",
                "https://res.cloudinary.com",
                "https://ip-api.com",
                "https://ipwho.is",
                "https://archive.org",
                "https://*.archive.org",
                "https://api.semanticscholar.org",
                "https://api.core.ac.uk",
                "https://export.arxiv.org",
                "https://api.dictionaryapi.dev",
                "https://*.wiktionary.org",
                "https://openlibrary.org",
                "https://covers.openlibrary.org",
                "https://libgen.is",
                "https://libgen.st",
                "https://libgen.rs",
              ].join(' '),
              "img-src 'self' data: blob: https: http:",
              "media-src 'self' blob: https: http: https://res.cloudinary.com https://api.dictionaryapi.dev",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://translate.googleapis.com https://translate.google.com",
              "font-src 'self' data: https://fonts.gstatic.com https://fonts.openmaptiles.org",
              "manifest-src 'self'",
              "worker-src 'self' blob:",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // ✅ Cache ISR pour les pages avec animations
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
        source: '/api/pdf-proxy',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
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