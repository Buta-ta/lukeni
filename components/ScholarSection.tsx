'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpenCheck } from 'lucide-react';
import { ScholarResult } from '@/lib/types/external-apis';

interface ScholarSectionProps {
  items: ScholarResult[];
  lang: 'fr' | 'en';
}

const ScholarItemCard = memo(
  ({ item, lang }: { item: ScholarResult; lang: 'fr' | 'en' }) => (
    <Link
      href={`/encyclopedie/scholar/${item.paperId}?lang=${lang}`}
      className="flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors group border-b border-white/[0.03] last:border-0"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
        <BookOpenCheck size={14} className="text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-bold line-clamp-1 group-hover:text-[#D4AF37] transition-colors">
          {item.title}
        </p>
        <p className="text-gray-600 text-xs truncate">
          {item.authors?.map((a) => a.name).join(', ') || 'Unknown'} ·{' '}
          {item.year}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[9px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded font-mono">
          Scholar
        </span>
        <ArrowRight
          size={12}
          className="text-gray-700 group-hover:text-[#D4AF37] transition-colors"
        />
      </div>
    </Link>
  )
);
ScholarItemCard.displayName = 'ScholarItemCard';

export const ScholarSection = memo(
  ({ items, lang }: ScholarSectionProps) => {
    if (items.length === 0) return null;

    return (
      <>
        <div className="p-3 border-b border-white/5 flex items-center gap-2 sticky top-0 bg-[#0d0d1a] z-10">
          <BookOpenCheck size={12} className="text-gray-500" />
          <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">
            {lang === 'fr' ? 'Recherches Académiques' : 'Academic Research'}
          </span>
          <span className="text-[9px] text-gray-700 ml-auto">
            {items.length} {lang === 'fr' ? 'résultat(s)' : 'result(s)'}
          </span>
        </div>
        {items.map((item) => (
          <ScholarItemCard key={item.paperId} item={item} lang={lang} />
        ))}
      </>
    );
  }
);
ScholarSection.displayName = 'ScholarSection';