// app/bibliotheque/page.tsx
"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Composant de chargement
const PageLoader = () => (
  <div className="min-h-screen bg-[#020111] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
  </div>
);

// Import dynamique sans SSR
const BibliothequePage = dynamic(
  () => import('@/components/BibliothequePage'), 
  { 
    ssr: false,
    loading: () => <PageLoader />
  }
);

export default function Page() {
  return <BibliothequePage />;
}