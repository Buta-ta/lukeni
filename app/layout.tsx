// /app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from '@/components/Footer';
import { TrackingProvider } from '@/components/TrackingProvider';
import { PWARegister } from '@/components/PWARegister';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { LayoutClient } from './layout-client';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#D4AF37',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: "Lukeni — Mémoire • Musique • Genèse",
    template: "%s | Lukeni",
  },
  description: "Plateforme de musique africaine et de patrimoine culturel. Explorez l'histoire, la musique et le patrimoine africains.",
  keywords: [
    "musique africaine",
    "culture",
    "patrimoine",
    "encyclopédie",
    "histoire",
    "musique",
    "afrique",
    "genèse",
    "mémoire"
  ],
  authors: [{ name: "Lukeni", url: "https://lukeni.app" }],
  creator: "Lukeni",
  manifest: "/manifest.json",
  
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://lukeni.app",
    siteName: "Lukeni",
    title: "Lukeni — Mémoire • Musique • Genèse",
    description: "Plateforme de musique africaine et de patrimoine culturel",
    images: [
      {
        url: "https://lukeni.app/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Lukeni Cauris",
        type: "image/png",
      },
      {
        url: "https://lukeni.app/icon-192x192.png",
        width: 192,
        height: 192,
        alt: "Lukeni Cauris",
        type: "image/png",
      },
    ],
  },
  
  twitter: {
    card: "summary_large_image",
    title: "Lukeni — Mémoire • Musique • Genèse",
    description: "Plateforme de musique africaine et de patrimoine culturel",
    images: ["https://lukeni.app/icon-512x512.png"],
    creator: "@lukeni",
  },
  
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", type: "image/png" },
      { url: "/icon-512x512.png", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
  },
  
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lukeni",
  },
  
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  alternates: {
    canonical: "https://lukeni.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 📱 PWA Meta Tags */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Lukeni" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Lukeni" />
        
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 🎨 Theme & Colors */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <meta name="theme-color" content="#D4AF37" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#020111" media="(prefers-color-scheme: dark)" />
        <meta name="msapplication-TileColor" content="#D4AF37" />
        <meta name="msapplication-TileImage" content="/icon-144x144.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 🔗 Links */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="mask-icon" href="/icon-192x192.png" color="#D4AF37" />
        <link rel="alternate" hrefLang="fr" href="https://lukeni.app" />
        
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 📊 Analytics & Tracking */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <meta name="google-site-verification" content="" />
      </head>
      
      <body className="min-h-full flex flex-col bg-[#020111] text-white">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 🎯 Main Layout */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <LayoutClient>
          {children}
        </LayoutClient>
        
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 🔧 PWA & Tracking */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <PWARegister />
        <TrackingProvider>{children}</TrackingProvider>
      </body>
    </html>
  );
}