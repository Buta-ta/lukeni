'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const CloudinaryPDFReader = dynamic(
  () => import('@/components/CloudinaryPDFReader'),
  {
    ssr: false, // ✅ CRUCIAL : Désactiver SSR
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#020111]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-gray-500 text-sm">
            Chargement du lecteur PDF...
          </p>
        </div>
      </div>
    ),
  }
);

export default CloudinaryPDFReader;