/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Three.js / React Three Fiber ──
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],

  // ── Turbopack (Next.js 16+) ──
  turbopack: {},

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
              // Scripts : 'self' + widgets Cloudinary (upload de fichiers dans /profil, /contribuer)
              // 'unsafe-inline' reste requis par Next.js (hydratation) et le widget Cloudinary.
              "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://upload-widget.cloudinary.com blob:",
              // Iframes : YouTube/Vimeo intégrés dans les articles + widget Cloudinary
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://upload-widget.cloudinary.com blob:",
              "object-src 'none'",
              // Connexions réseau (fetch, WS, Supabase Realtime)
              // Plus de joker https: — seuls les domaines réellement utilisés sont listés.
              [
                "connect-src 'self'",
                'https://lcemtmzdvcgxgpircumh.supabase.co',
                'https://*.supabase.co',
                'wss://lcemtmzdvcgxgpircumh.supabase.co',
                'https://api.cloudinary.com',
                'https://res.cloudinary.com',
                'https://api.exchangerate-api.com',
                'https://api.worldbank.org',
                'https://ipwho.is',
                'https://nominatim.openstreetmap.org',
                'https://api.openweathermap.org',
                'https://tiles.openfreemap.org',
                'https://fonts.openmaptiles.org',
                'blob:',
                'data:',
              ].join(' '),
              // Images
              "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://upload.wikimedia.org https://*.wikipedia.org https://archive.org https://*.archive.org https://covers.openlibrary.org https://openlibrary.org https://img.youtube.com https://openweathermap.org https://lcemtmzdvcgxgpircumh.supabase.co https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org https://tiles.openfreemap.org",
              // Médias (audio/vidéo)
              "media-src 'self' blob: https://res.cloudinary.com",
              // Styles : inline obligatoire pour Tailwind/Next.js
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Polices
              "font-src 'self' data: https://fonts.gstatic.com",
              "manifest-src 'self'",
              // Workers (pdf.js est auto-hébergé dans /vendor)
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
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
