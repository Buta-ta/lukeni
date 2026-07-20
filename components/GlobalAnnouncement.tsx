"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import AwaleGame from './AwaleGame';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ArrowUpCircle, Settings, X, AlertTriangle } from 'lucide-react';
import { usePathname } from 'next/navigation'; // 👈 IMPORT AJOUTÉ

interface Announcement {
  id: string;
  type: 'info' | 'update' | 'maintenance';
  message_fr: string;
  message_en: string;
  is_active: boolean;
  is_blocking: boolean;
  bg_color: string;
  is_scrolling: boolean;
}

export default function GlobalAnnouncement({ children }: { children: React.ReactNode }) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  
  const supabase = createClient();
  const pathname = usePathname(); // 👈 Récupère l'URL actuelle
  const isAdminRoute = pathname?.startsWith('/admin'); // 👈 Vérifie si on est côté Admin

  useEffect(() => {
    const storedLang = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (storedLang) setLang(storedLang);

    const fetchAnnouncement = async () => {
      const { data } = await supabase
        .from('global_announcements')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      setAnnouncement(data || null);
    };

    fetchAnnouncement();

    const channel = supabase.channel('public:global_announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_announcements' }, () => {
          fetchAnnouncement();
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // SCÉNARIO 1 : L'annonce est BLOQUANTE et ce N'EST PAS l'admin
  if (announcement?.is_blocking && !isAdminRoute) {
    const message = lang === 'en' && announcement.message_en ? announcement.message_en : announcement.message_fr;
    return <AwaleGame message={message} />;
  }

  const getIcon = (type: string, isBlocking: boolean) => {
    if (isBlocking) return <AlertTriangle size={18} className="text-white shrink-0" />;
    switch (type) {
      case 'maintenance': return <Settings size={18} className="text-white shrink-0" />;
      case 'update': return <ArrowUpCircle size={18} className="text-white shrink-0" />;
      default: return <Info size={18} className="text-white shrink-0" />;
    }
  };

  // SCÉNARIO 2 : Visibilité de la bannière
  // On l'affiche si c'est pas bloquant OU si c'est l'admin (pour lui rappeler que le site est bloqué)
  const isVisible = announcement && (!announcement.is_blocking || isAdminRoute) && dismissedId !== announcement.id;
  
  const messageText = announcement ? (lang === 'en' && announcement.message_en ? announcement.message_en : announcement.message_fr) : '';
  
  // Si c'est bloquant et qu'on est sur l'admin, on force la couleur en rouge pour bien alerter.
  const bgColor = (announcement?.is_blocking && isAdminRoute) ? '#dc2626' : (announcement?.bg_color || '#2563eb');

  return (
    <>
      <style>{`
        @keyframes custom-marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-custom-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: custom-marquee 25s linear infinite;
        }
        .animate-custom-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      <AnimatePresence>
        {isVisible && announcement && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full z-[100] relative border-b border-white/20 overflow-hidden"
            style={{ backgroundColor: bgColor, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
          >
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-4">
              
              <div className="animate-pulse shrink-0">
                {getIcon(announcement.type, announcement.is_blocking)}
              </div>
              
              <div className="flex-1 overflow-hidden flex items-center relative">
                {announcement.is_scrolling && !announcement.is_blocking ? (
                  <div className="w-full overflow-hidden mask-edges">
                    <p className="text-white text-sm font-bold tracking-wide animate-custom-marquee pr-12 cursor-default">
                      {messageText}
                    </p>
                  </div>
                ) : (
                  <p className="text-white text-sm font-medium leading-tight">
                    {announcement.is_blocking ? `⚠️ SITE BLOQUÉ POUR LES UTILISATEURS : ${messageText}` : messageText}
                  </p>
                )}
              </div>

              <button 
                onClick={() => setDismissedId(announcement.id)} 
                className="p-1.5 text-white/70 hover:text-white hover:bg-black/20 rounded-lg transition-colors shrink-0 z-10"
                title="Fermer l'alerte"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </>
  );
}