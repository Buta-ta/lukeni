'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { ArrowRight, BookMarked } from 'lucide-react';
import { CoreResult } from '@/lib/types/external-apis';

interface CoreSectionProps {
  items: CoreResult[];
  lang: 'fr' | 'en';
}

const CoreItemCard = memo(
  ({ item, lang }: { item: CoreResult; lang: 'fr' | 'en' }) => (
    <Link
      href={`/encyclopedie/core/${item.id}?lang=${lang}`}
      className="flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors group border-b border-white/[0.03] last:border-0"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
        <BookMarked size={14} className="text-[#D4AF37]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-bold line-clamp-1 group-hover:text-[#D4AF37] transition-colors">
          {item.title}
        </p>
        <p className="text-gray-600 text-xs truncate">
          {item.authors?.map((a) => a.name).join(', ') || 'Unknown'} ·{' '}
          {item.year || 'N/A'}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[9px] text-[#D4AF37] bg-[#D4AF37]/20 px-1.5 py-0.5 rounded font-mono font-bold">
          {lang === 'fr' ? 'Gratuit' : 'Free'}
        </span>
        <ArrowRight
          size={12}
          className="text-gray-700 group-hover:text-[#D4AF37] transition-colors"
        />
      </div>
    </Link>
  )
);
CoreItemCard.displayName = 'CoreItemCard';

export const CoreSection = memo(
  ({ items, lang }: CoreSectionProps) => {
    if (items.length === 0) return null;

    return (
      <>
        <div className="p-3 border-b border-white/5 flex items-center gap-2 sticky top-0 bg-[#0d0d1a] z-10">
          <BookMarked size={12} className="text-[#D4AF37]" />
          <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase">
            {lang === 'fr' ? 'Open Access - CORE' : 'Open Access - CORE'}
          </span>
          <span className="text-[9px] text-gray-700 ml-auto">
            {items.length} {lang === 'fr' ? 'résultat(s)' : 'result(s)'}
          </span>
        </div>
        {items.map((item) => (
          <CoreItemCard key={item.id} item={item} lang={lang} />
        ))}
      </>
    );
  }
);
CoreSection.displayName = 'CoreSection';