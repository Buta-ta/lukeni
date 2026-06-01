"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase-browser';
import { Loader2, ExternalLink, Globe, MapPin, ChevronDown, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface Section {
  id: string;
  key: string;
  title_fr: string;
  title_en: string;
  text_fr: string;
  text_en: string;
  images: string[];
  icon: string;
  order: number;
}

interface AboutContent {
  hero_text_fr: string;
  hero_text_en: string;
  sections: Section[];
  contact_email: string;
  social_links: Array<{ id: string; title: string; url: string }>;
}

const colorMap: Record<string, { primary: string; glow: string; border: string }> = {
  mission: { primary: '#10B981', glow: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.3)' },
  vision: { primary: '#3B82F6', glow: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.3)' },
  values: { primary: '#A855F7', glow: 'rgba(168, 85, 247, 0.2)', border: 'rgba(168, 85, 247, 0.3)' },
  team: { primary: '#EC4899', glow: 'rgba(236, 72, 153, 0.2)', border: 'rgba(236, 72, 153, 0.3)' },
};

const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <defs>
      <linearGradient id="caurisGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    <path fill="url(#caurisGlow)" d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

function BackgroundStarfield() {
  const backgroundStars = useMemo(() =>
    Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.3,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    })),
    []
  );

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {backgroundStars.map(star => (
        <motion.div
          key={`bg-star-${star.id}`}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: 'easeInOut',
          }}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
        />
      ))}
    </div>
  );
}

export default function QuiSommesNousPage() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [content, setContent] = useState<AboutContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const savedLang = (localStorage.getItem('lukeni_lang') || 'fr') as 'fr' | 'en';
    setLang(savedLang);

    const fetchContent = async () => {
      try {
        const { data } = await supabase
          .from('about_page')
          .select('*')
          .single();

        if (data) {
          // ✅ Ensure sections is always an array
          const parsedContent: AboutContent = {
            hero_text_fr: data.hero_text_fr || '',
            hero_text_en: data.hero_text_en || '',
            sections: Array.isArray(data.sections) ? data.sections : [],
            contact_email: data.contact_email || 'hello@lukeni.africa',
            social_links: Array.isArray(data.social_links) ? data.social_links : [],
          };
          setContent(parsedContent);
        }
      } catch (err) {
        console.error('Error fetching about content:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, []);

  useEffect(() => {
    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setMousePos({
          x: (e.clientX / window.innerWidth - 0.5) * 20,
          y: (e.clientY / window.innerHeight - 0.5) * 20,
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const handleLangChange = (newLang: 'fr' | 'en') => {
    setLang(newLang);
    localStorage.setItem('lukeni_lang', newLang);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#020111] via-[#0a0520] to-[#000000] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <CaurisIcon className="w-24 h-24 text-[#D4AF37]" />
        </motion.div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-[#020111] flex items-center justify-center text-white">
        <p>Contenu non trouvé</p>
      </div>
    );
  }

  // ✅ Safe defaults
  const sections = content.sections && Array.isArray(content.sections) ? content.sections : [];
  const socialLinks = content.social_links && Array.isArray(content.social_links) ? content.social_links : [];
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const heroText = lang === 'fr' ? content.hero_text_fr : content.hero_text_en;

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-b from-[#020111] via-[#03032B] to-[#000000] text-white overflow-hidden">
      {/* STARFIELD */}
      <BackgroundStarfield />

      {/* TOP CONTROLS */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => handleLangChange(lang === 'fr' ? 'en' : 'fr')}
          className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-full text-white hover:bg-[#D4AF37] hover:text-black transition-all font-bold text-sm backdrop-blur-sm"
        >
          <Globe size={14} />
          {lang.toUpperCase()}
        </motion.button>
      </div>

      {/* LOGO */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="relative z-10 pt-20 text-center"
      >
        <motion.div
          animate={{
            boxShadow: [
              '0 0 20px rgba(212,175,55,0.3)',
              '0 0 40px rgba(212,175,55,0.6)',
              '0 0 20px rgba(212,175,55,0.3)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="mx-auto w-16 h-16 mb-4"
        >
          <CaurisIcon className="w-full h-full text-[#D4AF37]" />
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-[0.3em] text-[#D4AF37] drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]">
          LUKENI
        </h1>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 py-20 space-y-32">
        {/* HERO SECTION */}
        {heroText && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center space-y-8"
          >
            <motion.h2
              className="text-4xl md:text-5xl font-serif font-bold bg-gradient-to-r from-[#D4AF37] via-cyan-400 to-blue-400 bg-clip-text text-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {heroText}
            </motion.h2>
            <motion.div
              className="w-24 h-1 bg-gradient-to-r from-[#D4AF37] to-cyan-400 mx-auto rounded-full"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.9 }}
            />
          </motion.section>
        )}

        {/* SECTIONS */}
        {sortedSections.map((section, idx) => {
          const colors = colorMap[section.key] || colorMap.mission;
          const sectionImages = section.images && Array.isArray(section.images) ? section.images : [];

          return (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ delay: idx * 0.1 }}
              className="relative group"
            >
              {/* DECORATIVE BACKGROUND */}
              <motion.div
                className="absolute -inset-6 rounded-3xl opacity-0 group-hover:opacity-20 transition-all duration-500 blur-2xl"
                style={{ backgroundColor: colors.primary }}
                animate={{ x: mousePos.x * 0.5, y: mousePos.y * 0.5 }}
                transition={{
                  x: { type: 'spring', stiffness: 30, damping: 20 },
                  y: { type: 'spring', stiffness: 30, damping: 20 },
                }}
              />

              <div className="relative">
                {/* HEADER */}
                <div className="flex items-center gap-6 mb-8">
                  <motion.div
                    className="text-6xl flex-shrink-0"
                    whileHover={{ scale: 1.2, rotate: 10 }}
                  >
                    {section.icon}
                  </motion.div>
                  <div
                    className="border-l-4 pl-6"
                    style={{ borderColor: colors.primary }}
                  >
                    <h2
                      className="text-4xl md:text-5xl font-serif font-bold mb-2"
                      style={{ color: colors.primary }}
                    >
                      {lang === 'fr' ? section.title_fr : section.title_en}
                    </h2>
                  </div>
                </div>

                {/* TEXT */}
                <motion.p
                  className="text-gray-300 text-lg leading-relaxed mb-8 max-w-3xl font-light"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  {lang === 'fr' ? section.text_fr : section.text_en}
                </motion.p>

                {/* IMAGE GALLERY */}
                {sectionImages.length > 0 && (
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                  >
                    {sectionImages.map((img, imgIdx) => (
                      <motion.div
                        key={imgIdx}
                        whileHover={{ scale: 1.05, rotate: 2 }}
                        className="rounded-2xl overflow-hidden border group/img"
                        style={{ borderColor: colors.border }}
                      >
                        <img
                          src={img}
                          alt={`${section.title_fr} ${imgIdx + 1}`}
                          className="w-full h-64 object-cover group-hover/img:scale-110 transition-transform duration-500"
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.section>
          );
        })}

        {/* CONTACT SECTION */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-[#D4AF37]/10 via-transparent to-transparent border border-[#D4AF37]/30 rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-20 blur-3xl"
            style={{
              background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="mb-6"
            >
              <Sparkles size={40} className="text-[#D4AF37] mx-auto" />
            </motion.div>

            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">
              {lang === 'fr' ? 'Restons en Contact' : "Let's Stay in Touch"}
            </h2>

            <motion.a
              href={`mailto:${content.contact_email}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E5C158] text-black rounded-full font-bold text-lg hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] transition-all mb-12"
            >
              ✉️ {content.contact_email}
            </motion.a>

            {/* SOCIAL LINKS */}
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap justify-center gap-4">
                {socialLinks.map(link => (
                  <motion.a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05, translateY: -4 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 border border-white/20 rounded-full text-white hover:text-[#D4AF37] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 transition-all font-semibold"
                  >
                    {link.title}
                    <ExternalLink size={16} />
                  </motion.a>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {/* CTA BUTTON */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link href="/explore">
            <motion.button
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 40px rgba(212, 175, 55, 0.4)',
              }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E5C158] text-black rounded-full font-bold text-lg hover:shadow-lg transition-all shadow-[0_0_30px_rgba(212,175,55,0.3)]"
            >
              {lang === 'fr' ? 'Entrer dans l\'Encyclopédie' : 'Enter the Encyclopedia'}
            </motion.button>
          </Link>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020111] to-transparent pointer-events-none z-5" />
    </main>
  );
}