"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { supabase } from '@/lib/supabase-browser';
import { ExternalLink, Globe, ArrowLeft, ArrowRight, Mail, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/contexts/LanguageContext';

// ─── TYPES ────────────────────────────────────────────────────────────────────
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

// ─── TRADUCTIONS ──────────────────────────────────────────────────────────────
const T = {
  fr: {
    back: 'Retour',
    tagline: 'La mémoire de l\'Afrique, vivante.',
    contact: 'Restons en contact',
    enterApp: 'Explorer Lukeni',
    loading: 'Chargement…',
    notFound: 'Contenu non disponible',
    writeTo: 'Écrire à',
    followUs: 'Nous suivre',
    whoWeAre: 'Qui sommes-nous ?',
  },
  en: {
    back: 'Back',
    tagline: 'The memory of Africa, alive.',
    contact: "Let's stay in touch",
    enterApp: 'Explore Lukeni',
    loading: 'Loading…',
    notFound: 'Content unavailable',
    writeTo: 'Write to us',
    followUs: 'Follow us',
    whoWeAre: 'Who are we?',
  },
};

// ─── COULEURS PAR SECTION ─────────────────────────────────────────────────────
const SECTION_COLORS: Record<string, { primary: string; bg: string; border: string }> = {
  mission:  { primary: '#D4AF37', bg: 'rgba(212,175,55,0.06)',   border: 'rgba(212,175,55,0.2)'  },
  vision:   { primary: '#67E8F9', bg: 'rgba(103,232,249,0.06)',  border: 'rgba(103,232,249,0.2)' },
  values:   { primary: '#C084FC', bg: 'rgba(192,132,252,0.06)',  border: 'rgba(192,132,252,0.2)' },
  team:     { primary: '#F472B6', bg: 'rgba(244,114,182,0.06)',  border: 'rgba(244,114,182,0.2)' },
  default:  { primary: '#10B981', bg: 'rgba(16,185,129,0.06)',   border: 'rgba(16,185,129,0.2)'  },
};

// ─── CAURIS ICON ──────────────────────────────────────────────────────────────
const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5Z
             M50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── SCROLL PROGRESS ─────────────────────────────────────────────────────────
const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf: number;
    const h = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.documentElement;
        setProgress((window.scrollY / (el.scrollHeight - el.clientHeight)) * 100);
      });
    };
    window.addEventListener('scroll', h, { passive: true });
    return () => { window.removeEventListener('scroll', h); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div
      className="fixed top-0 left-0 h-0.5 bg-[#D4AF37] z-[200] transition-all"
      style={{ width: `${progress}%` }}
    />
  );
};

// ─── BACKGROUND COSMOS ───────────────────────────────────────────────────────
const CosmosBackground = () => {
  const stars = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: (i * 37 % 100),
      y: ((i * 67 + 13) % 100),
      size: 0.5 + (i % 3) * 0.4,
      dur: 3 + (i % 4),
    })), []);

  const nebulae = [
    { x: 10, y: 15, size: 400, color: '#9370DB' },
    { x: 75, y: 50, size: 350, color: '#D4AF37' },
    { x: 40, y: 80, size: 300, color: '#20B2AA' },
  ];

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {nebulae.map((n, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${n.x}%`, top: `${n.y}%`,
            width: n.size, height: n.size,
            background: `radial-gradient(circle, ${n.color}12 0%, transparent 70%)`,
            filter: 'blur(80px)',
          }}
          animate={{ opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {stars.map(s => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.1, 0.5, 0.1] }}
          transition={{ duration: s.dur, repeat: Infinity, ease: 'easeInOut', delay: s.id * 0.05 }}
        />
      ))}
    </div>
  );
};

// ─── GOLD DIVIDER ─────────────────────────────────────────────────────────────
const GoldDivider = () => (
  <div className="flex items-center gap-4 my-2">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
    <CaurisIcon className="w-4 h-4 text-[#D4AF37]/30" />
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
  </div>
);

// ─── IMAGE GALLERY ────────────────────────────────────────────────────────────
const ImageGallery = ({ images, color }: { images: string[]; color: string }) => {
  const [active, setActive] = useState(0);

  if (!images.length) return null;

  if (images.length === 1) {
    return (
      <div
        className="rounded-2xl overflow-hidden border mt-6"
        style={{ borderColor: `${color}30` }}
      >
        <img
          src={images[0]}
          alt=""
          className="w-full h-64 object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {/* Image principale */}
      <div
        className="relative rounded-2xl overflow-hidden border"
        style={{ borderColor: `${color}30` }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={active}
            src={images[active]}
            alt=""
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full h-72 object-cover"
            loading="lazy"
          />
        </AnimatePresence>
        {/* Navigation fléchée */}
        <button
          onClick={() => setActive(p => (p - 1 + images.length) % images.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
            bg-black/60 backdrop-blur-sm flex items-center justify-center
            text-white hover:bg-black/80 transition-colors"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={() => setActive(p => (p + 1) % images.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
            bg-black/60 backdrop-blur-sm flex items-center justify-center
            text-white hover:bg-black/80 transition-colors"
        >
          <ArrowRight size={14} />
        </button>
        {/* Compteur */}
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 rounded-full
          text-[10px] text-white/70 font-mono">
          {active + 1}/{images.length}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
              i === active ? 'scale-95' : 'border-transparent opacity-50 hover:opacity-80'
            }`}
            style={{ borderColor: i === active ? color : 'transparent' }}
          >
            <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
const SectionCard = ({
  section,
  lang,
  index,
}: {
  section: Section;
  lang: 'fr' | 'en';
  index: number;
}) => {
  const colors = SECTION_COLORS[section.key] || SECTION_COLORS.default;
  const isEven = index % 2 === 0;
  const images = Array.isArray(section.images) ? section.images : [];
  const hasImages = images.length > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className="relative group"
    >
      {/* Carte principale */}
      <div
        className="relative rounded-3xl border p-8 md:p-10 overflow-hidden
          transition-all duration-500 hover:border-opacity-60"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
        }}
      >
        {/* Glow hover */}
        <div
          className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${colors.primary}08 0%, transparent 60%)`,
          }}
        />

        {/* Contenu */}
        <div className={`relative flex flex-col ${hasImages && 'md:flex-row'} gap-8 md:gap-12`}>

          {/* Texte */}
          <div className={`flex-1 ${hasImages && isEven ? 'md:order-1' : 'md:order-2'}`}>
            {/* Icône + Titre */}
            <div className="flex items-start gap-4 mb-6">
              <motion.span
                className="text-4xl shrink-0 mt-1"
                whileHover={{ scale: 1.2, rotate: 8 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {section.icon}
              </motion.span>
              <div>
                <div
                  className="h-0.5 w-8 rounded-full mb-3"
                  style={{ backgroundColor: colors.primary }}
                />
                <h2
                  className="text-2xl md:text-3xl font-serif font-bold leading-tight"
                  style={{ color: colors.primary }}
                >
                  {lang === 'fr' ? section.title_fr : section.title_en}
                </h2>
              </div>
            </div>

            {/* Texte corps */}
            <p className="text-white/65 text-base leading-relaxed font-light">
              {lang === 'fr' ? section.text_fr : section.text_en}
            </p>
          </div>

          {/* Images */}
          {hasImages && (
            <div className={`w-full md:w-80 shrink-0 ${isEven ? 'md:order-2' : 'md:order-1'}`}>
              <ImageGallery images={images} color={colors.primary} />
            </div>
          )}
        </div>

        {/* Numéro décoratif */}
        <div
          className="absolute bottom-4 right-6 text-6xl font-serif font-bold opacity-[0.04] select-none pointer-events-none"
          style={{ color: colors.primary }}
        >
          {String(index + 1).padStart(2, '0')}
        </div>
      </div>
    </motion.article>
  );
};

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
const HeroSection = ({ heroText, lang }: { heroText: string; lang: 'fr' | 'en' }) => {
  const t = T[lang];
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
      <motion.div style={{ y, opacity }} className="space-y-8 max-w-3xl mx-auto">

        {/* Logo animé */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
          className="mx-auto w-20 h-20 relative"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border border-[#D4AF37]/20"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 rounded-full border border-[#D4AF37]/10"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <CaurisIcon className="w-12 h-12 text-[#D4AF37]" />
          </div>
          {/* Glow pulsant */}
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-[#D4AF37]/20 blur-xl"
          />
        </motion.div>

        {/* Titre LUKENI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-6xl md:text-7xl font-serif tracking-[0.4em] text-[#D4AF37]
            drop-shadow-[0_0_30px_rgba(212,175,55,0.5)]">
            LUKENI
          </h1>
          <p className="text-white/40 text-sm tracking-[0.25em] uppercase mt-2 font-light">
            {t.tagline}
          </p>
        </motion.div>

        {/* Badge Qui sommes-nous */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full
            bg-[#D4AF37]/8 border border-[#D4AF37]/20"
        >
          <Sparkles size={12} className="text-[#D4AF37]" />
          <span className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">
            {t.whoWeAre}
          </span>
        </motion.div>

        {/* Hero text */}
        {heroText && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-xl md:text-2xl font-serif italic text-white/80 leading-relaxed max-w-2xl mx-auto"
          >
            "{heroText}"
          </motion.p>
        )}

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2 opacity-30 pt-4"
        >
          <div className="w-px h-8 bg-[#D4AF37]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
        </motion.div>
      </motion.div>
    </section>
  );
};

// ─── CONTACT SECTION ──────────────────────────────────────────────────────────
const ContactSection = ({
  email,
  socialLinks,
  lang,
}: {
  email: string;
  socialLinks: Array<{ id: string; title: string; url: string }>;
  lang: 'fr' | 'en';
}) => {
  const t = T[lang];

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative rounded-3xl border border-[#D4AF37]/20
        bg-[#D4AF37]/5 p-10 md:p-14 overflow-hidden"
    >
      {/* Glow centre */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-96 h-96 bg-[#D4AF37]/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center
        justify-between gap-10">

        {/* Gauche : texte */}
        <div className="text-center md:text-left">
          <div className="flex items-center gap-2 mb-3 justify-center md:justify-start">
            <div className="w-6 h-px bg-[#D4AF37]/40" />
            <span className="text-[#D4AF37]/60 text-[9px] uppercase tracking-widest font-bold">
              {t.contact}
            </span>
          </div>
          <h3 className="text-3xl md:text-4xl font-serif text-white mb-2">
            {t.writeTo}
          </h3>
          <p className="text-white/40 text-sm">{t.contact}</p>
        </div>

        {/* Droite : CTA */}
        <div className="flex flex-col items-center md:items-end gap-4">
          <motion.a
            href={`mailto:${email}`}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-3 px-7 py-4 bg-[#D4AF37] text-black
              rounded-full font-bold text-sm hover:bg-white transition-colors
              shadow-[0_0_30px_rgba(212,175,55,0.3)]"
          >
            <Mail size={16} />
            {email}
          </motion.a>

          {socialLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center md:justify-end">
              {socialLinks.map(link => (
                <motion.a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-2 px-4 py-2
                    bg-white/5 border border-white/10 rounded-full
                    text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/30
                    transition-all text-sm"
                >
                  {link.title}
                  <ExternalLink size={12} />
                </motion.a>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
};

// ─── NAV BAR ──────────────────────────────────────────────────────────────────
const NavBar = ({ lang }: { lang: 'fr' | 'en' }) => {
  const t = T[lang];
  const { toggleLang } = useLanguage();

  return (
    <nav className="sticky top-0 z-[100] backdrop-blur-2xl border-b border-white/5
      px-4 md:px-8 py-3 bg-[#020111]/60">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* Retour */}
        <Link
          href="/explore"
          className="flex items-center gap-2 text-white/50 hover:text-[#D4AF37]
            transition-colors text-sm group"
        >
          <ArrowLeft
            size={15}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          {t.back}
        </Link>

        {/* Logo centre */}
        <Link href="/" className="flex items-center gap-2">
          <CaurisIcon className="w-5 h-5 text-[#D4AF37]" />
          <span className="font-serif tracking-[0.4em] text-xs text-[#D4AF37]">LUKENI</span>
        </Link>

        {/* Langue */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
            bg-white/5 border border-white/10 text-white text-[9px] font-black
            uppercase tracking-widest hover:bg-[#D4AF37] hover:text-black
            hover:border-[#D4AF37] transition-all"
        >
          <Globe size={9} />
          {lang}
        </button>
      </div>
    </nav>
  );
};

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────
export default function QuiSommesNousPage() {
  const { lang } = useLanguage();
  const t = T[lang];

  const [content, setContent] = useState<AboutContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase
          .from('about_page')
          .select('*')
          .single();

        if (data) {
          setContent({
            hero_text_fr: data.hero_text_fr || '',
            hero_text_en: data.hero_text_en || '',
            sections: Array.isArray(data.sections) ? data.sections : [],
            contact_email: data.contact_email || 'hello@lukeni.africa',
            social_links: Array.isArray(data.social_links) ? data.social_links : [],
          });
        }
      } catch (err) {
        console.error('Error fetching about content:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  // ─── LOADING ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020111] flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <CaurisIcon className="w-16 h-16 text-[#D4AF37]" />
        </motion.div>
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[#D4AF37] text-[10px] tracking-[0.4em] uppercase"
        >
          {t.loading}
        </motion.p>
      </div>
    );
  }

  // ─── VIDE ───────────────────────────────────────────────────────────────────
  if (!content) {
    return (
      <div className="min-h-screen bg-[#020111] flex items-center justify-center">
        <p className="text-white/40">{t.notFound}</p>
      </div>
    );
  }

  const sections = [...(content.sections || [])].sort((a, b) => a.order - b.order);
  const heroText = lang === 'fr' ? content.hero_text_fr : content.hero_text_en;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020111] via-[#030330]/50 to-[#000000]
      text-white overflow-x-hidden selection:bg-[#D4AF37]/30">

      <ScrollProgress />
      <CosmosBackground />

      {/* NAV */}
      <NavBar lang={lang} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6">

        {/* HERO */}
        <HeroSection heroText={heroText} lang={lang} />

        <GoldDivider />

        {/* SECTIONS */}
        <div className="py-16 space-y-8">
          {sections.map((section, i) => (
            <SectionCard key={section.id} section={section} lang={lang} index={i} />
          ))}
        </div>

        <GoldDivider />

        {/* CONTACT */}
        <div className="py-12">
          <ContactSection
            email={content.contact_email}
            socialLinks={content.social_links || []}
            lang={lang}
          />
        </div>

        <GoldDivider />

        {/* CTA FINAL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="py-16 text-center"
        >
          <p className="text-white/30 text-xs uppercase tracking-widest mb-6">
            {lang === 'fr' ? 'Prêt à explorer ?' : 'Ready to explore?'}
          </p>
          <Link href="/explore">
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(212,175,55,0.35)' }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-3 px-10 py-4
                bg-[#D4AF37] text-black rounded-full font-bold text-base
                hover:bg-white transition-colors
                shadow-[0_0_25px_rgba(212,175,55,0.25)]"
            >
              <CaurisIcon className="w-5 h-5" />
              {t.enterApp}
              <ArrowRight size={16} />
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Dégradé bas */}
      <div className="h-24 bg-gradient-to-t from-[#020111] to-transparent pointer-events-none" />

      {/* Scroll to top */}
      <motion.button
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        whileHover={{ scale: 1.1 }}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full
          bg-[#D4AF37] text-black flex items-center justify-center
          hover:bg-white transition-colors shadow-lg"
      >
        <ArrowRight size={16} className="-rotate-90" />
      </motion.button>
    </div>
  );
}