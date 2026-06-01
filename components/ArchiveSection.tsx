'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, Image, Headphones, Film, Package } from 'lucide-react';
import { ArchiveResult } from '@/lib/types/external-apis';

const ICON_MAP: Record<string, React.ReactNode> = {
  texts: <FileText size={12} />,
  image: <Image size={12} />,
  audio: <Headphones size={12} />,
  movies: <Film size={12} />,
  software: <Package size={12} />,
};

const LABEL_MAP_FR: Record<string, string> = {
  texts: 'Livres & Documents',
  image: 'Images & Illustrations',
  audio: 'Enregistrements Audio',
  movies: 'Films & Documentaires',
  software: 'Logiciels & Outils',
};

const LABEL_MAP_EN: Record<string, string> = {
  texts: 'Books & Documents',
  image: 'Images & Illustrations',
  audio: 'Audio Recordings',
  movies: 'Films & Documentaries',
  software: 'Software & Tools',
};

interface ArchiveSectionProps {
  type: 'texts' | 'image' | 'audio' | 'movies' | 'software';
  items: ArchiveResult[];
  lang: 'fr' | 'en';
}

const ArchiveItemCard = memo(
  ({ item, lang }: { item: ArchiveResult; lang: 'fr' | 'en' }) => (
    <Link
      href={`/encyclopedie/archive/${item.identifier}?lang=${lang}`}
      className="flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors group border-b border-white/[0.03] last:border-0"
    >
      {item.img && (
        <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-white/5">
          <img
            src={item.img}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-bold truncate group-hover:text-[#D4AF37] transition-colors">
          {item.title}
        </p>
        <p className="text-gray-600 text-xs truncate">
          {item.creator || item.date || 'Archive.org'}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[9px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded font-mono">
          Archive
        </span>
        <ArrowRight
          size={12}
          className="text-gray-700 group-hover:text-[#D4AF37] transition-colors"
        />
      </div>
    </Link>
  )
);
ArchiveItemCard.displayName = 'ArchiveItemCard';

export const ArchiveSection = memo(
  ({ type, items, lang }: ArchiveSectionProps) => {
    if (items.length === 0) return null;

    const label =
      lang === 'fr' ? LABEL_MAP_FR[type] : LABEL_MAP_EN[type];
    const icon = ICON_MAP[type];

    return (
      <>
        <div className="p-3 border-b border-white/5 flex items-center gap-2 sticky top-0 bg-[#0d0d1a] z-10">
          <span className="text-gray-500">{icon}</span>
          <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">
            {label}
          </span>
          <span className="text-[9px] text-gray-700 ml-auto">
            {items.length} {lang === 'fr' ? 'résultat(s)' : 'result(s)'}
          </span>
        </div>
        {items.map((item) => (
          <ArchiveItemCard key={item.identifier} item={item} lang={lang} />
        ))}
      </>
    );
  }
);
ArchiveSection.displayName = 'ArchiveSection';