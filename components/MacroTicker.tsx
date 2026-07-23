"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useLanguage } from '@/lib/contexts/LanguageContext'; // 👈 NOUVEAU

interface TickerItem {
  id: string;
  country_code: string;
  country_name_fr: string;
  country_name_en: string;
  indicator_fr: string;
  indicator_en: string;
  value: number;
  unit_fr?: string;
  unit_en?: string;
  trend?: 'up' | 'down' | 'stable';
  source_url?: string;
  category?: {
    color: string;
  };
}

// Mapping drapeaux (codes ISO → emoji)
const FLAG_EMOJIS: Record<string, string> = {
  BJ: '🇧🇯', BF: '🇧🇫', CI: '🇨🇮', GH: '🇬🇭', GN: '🇬🇳',
  ML: '🇲🇱', NE: '🇳🇪', NG: '🇳🇬', SN: '🇸🇳', TG: '🇹🇬',
  MA: '🇲🇦', DZ: '🇩🇿', TN: '🇹🇳', EG: '🇪🇬', ZA: '🇿🇦',
  KE: '🇰🇪', ET: '🇪🇹', UG: '🇺🇬', CD: '🇨🇩', CM: '🇨🇲',
  FR: '🇫🇷', US: '🇺🇸', CA: '🇨🇦', GB: '🇬🇧', DE: '🇩🇪',
  ES: '🇪🇸', IT: '🇮🇹', BR: '🇧🇷', CN: '🇨🇳', IN: '🇮🇳',
  RU: '🇷🇺', JP: '🇯🇵', KR: '🇰🇷', AU: '🇦🇺', MX: '🇲🇽',
  AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴', PE: '🇵🇪', VE: '🇻🇪',
};

function getFlag(code: string): string {
  return FLAG_EMOJIS[code.toUpperCase()] || '🌍';
}

function formatValue(value: number, lang: 'fr' | 'en'): string {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function MacroTicker() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useLanguage(); // 👈 NOUVEAU : récupérer la langue active
  const supabase = createClient();
  const [items, setItems] = useState<TickerItem[]>([]);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const isInvestigationRoute = 
    pathname?.startsWith('/investigations/') && pathname !== '/investigations';

  useEffect(() => {
    loadData();
  }, []);

  // 🔴 TEMPS RÉEL : Écouter les changements sur macro_globe_data
  useEffect(() => {
    const channel = supabase
      .channel('macro-ticker-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'macro_globe_data' 
        },
        (payload) => {
          console.log('🔄 Ticker data changed:', payload.eventType);
          setIsUpdating(true);
          loadData().finally(() => {
            setTimeout(() => setIsUpdating(false), 500);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: settings } = await supabase
        .from('site_settings')
        .select('macro_ticker_enabled')
        .eq('id', 1)
        .single();

      if (settings && settings.macro_ticker_enabled === false) {
        setEnabled(false);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/macro-globe?limit=50');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Error loading ticker data:', err);
    }
    setIsLoading(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleItemClick = (item: TickerItem) => {
    if (!item.source_url) return;

    const url = item.source_url;
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } 
    else if (url.startsWith('/')) {
      router.push(url);
    }
  };

  if (!enabled || isInvestigationRoute || dismissed || isLoading || items.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[99]">
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 60s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .ticker-updating {
          animation: ticker-glow 1s ease-in-out infinite;
        }
      `}</style>

      <div 
        className={`relative flex items-center h-10 overflow-hidden backdrop-blur-xl transition-all duration-300 ${
          isUpdating 
            ? 'bg-[#020111] border-b-2 border-[#D4AF37]/60' 
            : 'bg-[#020111]/95'
        }`}
        style={{
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 2px 10px rgba(212, 175, 55, 0.1)',
        }}
      >
        {isUpdating && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent ticker-updating" />
        )}

        <button
          onClick={handleDismiss}
          className="absolute left-2 z-10 p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Masquer temporairement"
        >
          <X size={12} />
        </button>

        <div className="flex-1 ml-8 overflow-hidden">
          <div className="ticker-track flex items-center gap-6 whitespace-nowrap">
            {items.map((item) => (
              <TickerItemComponent
                key={item.id}
                item={item}
                lang={lang} // 👈 NOUVEAU : passer la langue
                onClick={() => handleItemClick(item)}
              />
            ))}
            {items.map((item) => (
              <TickerItemComponent
                key={`dup-${item.id}`}
                item={item}
                lang={lang} // 👈 NOUVEAU : passer la langue
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        </div>
      </div>

      <div 
        className="h-2 bg-gradient-to-b from-black/40 to-transparent pointer-events-none"
        style={{
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
        }}
      />
    </div>
  );
}

function TickerItemComponent({ 
  item, 
  lang, // 👈 NOUVEAU : recevoir la langue
  onClick 
}: { 
  item: TickerItem; 
  lang: 'fr' | 'en';
  onClick: () => void;
}) {
  const flag = getFlag(item.country_code);
  const hasUrl = !!item.source_url;

  // 👈 NOUVEAU : choisir le bon texte selon la langue
  const countryName = lang === 'fr' ? item.country_name_fr : (item.country_name_en || item.country_name_fr);
  const indicator = lang === 'fr' ? item.indicator_fr : (item.indicator_en || item.indicator_fr);
  const unit = lang === 'fr' ? item.unit_fr : (item.unit_en || item.unit_fr);

  return (
    <button
      onClick={onClick}
      disabled={!hasUrl}
      className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${
        hasUrl 
          ? 'hover:bg-white/10 cursor-pointer' 
          : 'cursor-default'
      }`}
    >
      <span className="text-sm">{flag}</span>

      <span className="text-white/70 text-xs font-medium">
        {countryName}
      </span>

      <span className="text-white/20">•</span>

      <span 
        className="text-xs font-bold"
        style={{ color: item.category?.color || '#D4AF37' }}
      >
        {indicator}
      </span>

      {item.trend === 'up' && (
        <TrendingUp size={12} className="text-green-400" />
      )}
      {item.trend === 'down' && (
        <TrendingDown size={12} className="text-red-400" />
      )}
      {item.trend === 'stable' && (
        <Minus size={12} className="text-gray-400" />
      )}

      <span className="text-white font-bold text-xs">
        {formatValue(item.value, lang)}
      </span>

      {unit && (
        <span className="text-white/40 text-[10px]">
          {unit}
        </span>
      )}

      <span className="text-[#D4AF37]/30 ml-2">│</span>
    </button>
  );
}