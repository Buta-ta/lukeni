"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Heart, X, Scale, Shield, Info } from 'lucide-react';
import Link from 'next/link';

const GOLD = "#D4AF37";

const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const TwitterIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

// ─── TRANSLATIONS ────────────────────────────────────────────────────────

const translations = {
  fr: {
    about: 'A Propos',
    legal: 'Mentions',
    ethics: 'Éthique',
    credits: 'Crédits',
    close: 'Fermer',
    copyright: '© 2026 LUKENI by Buta • Vercel',

    // Modals
    legalTitle: 'Mentions Légales',
    legalResponsible: 'Responsable du Projet',
    legalResponsibleContent: 'Lukeni est créé et maintenu par Buta, développeur basé au Bénin.',
    legalContact: 'Contact',
    legalContactContent: 'lukeni.team@gmail.com',
    legalHosting: 'Hébergement',
    legalHostingContent: 'Site hébergé par Vercel',
    legalLocation: 'Localisation',
    legalLocationContent: 'Développé au Bénin, Afrique de l\'Ouest',

    ethicsTitle: 'Suivi Éthique',
    ethicsTracking: 'Tracking Éthique',
    ethicsTrackingContent: 'Lukeni utilise un suivi éthique des pages visitées pour améliorer votre expérience. Données anonymes uniquement.',
    ethicsData: 'Données',
    ethicsDataContent: 'Nous collectons : pages visitées, temps passé, interactions. Aucune donnée personnelle sans consentement.',
    ethicsTransparency: 'Transparence',
    ethicsTransparencyContent: 'Les données ne sont jamais vendues à des tiers ni utilisées pour la publicité.',

    creditsTitle: 'Crédits',
    creditsDev: 'Développement',
    creditsDevContent: 'Buta | Technos : Next.js, React, Tailwind, Framer Motion',
    creditsInfra: 'Infrastructure',
    creditsInfraContent: 'Vercel, Supabase, Cloudinary, API publiques académiques',
    creditsContent: 'Contenu',
    creditsContentContent: 'Sources publiques vérifiées : Internet Archive, Semantic Scholar, arXiv',
  },
  en: {
    about: 'About',
    legal: 'Legal',
    ethics: 'Ethics',
    credits: 'Credits',
    close: 'Close',
    copyright: '© 2026 LUKENI by Buta • Vercel',

    // Modals
    legalTitle: 'Legal Notice',
    legalResponsible: 'Project Manager',
    legalResponsibleContent: 'Lukeni is created and maintained by Buta, a developer based in Benin.',
    legalContact: 'Contact',
    legalContactContent: 'lukeni.team@gmail.com',
    legalHosting: 'Hosting',
    legalHostingContent: 'Site hosted by Vercel',
    legalLocation: 'Location',
    legalLocationContent: 'Developed in Benin, West Africa',

    ethicsTitle: 'Ethical Tracking',
    ethicsTracking: 'Ethical Tracking',
    ethicsTrackingContent: 'Lukeni uses ethical tracking of visited pages to improve your experience. Anonymous data only.',
    ethicsData: 'Data',
    ethicsDataContent: 'We collect: visited pages, time spent, interactions. No personal data without consent.',
    ethicsTransparency: 'Transparency',
    ethicsTransparencyContent: 'Data is never sold to third parties or used for advertising.',

    creditsTitle: 'Credits',
    creditsDev: 'Development',
    creditsDevContent: 'Buta | Tech: Next.js, React, Tailwind, Framer Motion',
    creditsInfra: 'Infrastructure',
    creditsInfraContent: 'Vercel, Supabase, Cloudinary, Public Academic APIs',
    creditsContent: 'Content',
    creditsContentContent: 'Verified public sources: Internet Archive, Semantic Scholar, arXiv',
  }
};

// ─── LEGAL MODAL ──────────────────────────────────────────────────────────

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'legal' | 'ethics' | 'credits';
  lang: 'fr' | 'en';
}

function LegalModal({ isOpen, onClose, type, lang }: LegalModalProps) {
  // SÉCURITÉ ABSOLUE : Utilisation d'une condition ternaire stricte
  const t = lang === 'en' ? translations.en : translations.fr;

  const getContent = () => {
    switch (type) {
      case 'legal':
        return {
          title: t.legalTitle,
          sections: [
            { heading: t.legalResponsible, content: t.legalResponsibleContent },
            { heading: t.legalContact, content: t.legalContactContent },
            { heading: t.legalHosting, content: t.legalHostingContent },
            { heading: t.legalLocation, content: t.legalLocationContent }
          ]
        };
      case 'ethics':
        return {
          title: t.ethicsTitle,
          sections: [
            { heading: t.ethicsTracking, content: t.ethicsTrackingContent },
            { heading: t.ethicsData, content: t.ethicsDataContent },
            { heading: t.ethicsTransparency, content: t.ethicsTransparencyContent }
          ]
        };
      case 'credits':
        return {
          title: t.creditsTitle,
          sections: [
            { heading: t.creditsDev, content: t.creditsDevContent },
            { heading: t.creditsInfra, content: t.creditsInfraContent },
            { heading: t.creditsContent, content: t.creditsContentContent }
          ]
        };
    }
  };

  const content = getContent();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#0f0f0f] border border-white/10 rounded-2xl max-w-xl max-h-[80vh] overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#0f0f0f] border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-serif font-bold text-white">
                {content.title}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-4">
              {content.sections.map((section, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-1"
                >
                  <h3 className="text-sm font-bold text-[#D4AF37]">
                    {section.heading}
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    {section.content}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-6 py-3 bg-black/30">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-2 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] rounded-lg font-bold text-xs transition-all"
              >
                {t.close}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── MAIN FOOTER ──────────────────────────────────────────────────────────

export default function Footer() {
  const [legalModal, setLegalModal] = useState<LegalModalProps['type'] | null>(null);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    // Fonction robuste pour nettoyer et deviner la langue
    const getCleanLang = (): 'fr' | 'en' => {
      try {
        const saved = localStorage.getItem('lukeni_lang');
        if (!saved) return navigator.language.startsWith('fr') ? 'fr' : 'en';

        // Si la chaîne sauvegardée contient "en" (ex: '"en"', 'en', 'EN'), c'est l'anglais
        if (saved.toLowerCase().includes('en')) return 'en';
        return 'fr';
      } catch (error) {
        return 'fr'; // Fallback total
      }
    };

    setLang(getCleanLang());

    const handleStorageChange = () => setLang(getCleanLang());
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // SÉCURITÉ ABSOLUE : Utilisation d'une condition ternaire
  const t = lang === 'en' ? translations.en : translations.fr;

  return (
    <>
      <footer
        className="w-full border-t border-white/[0.05]"
        style={{ background: '#020111' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">

          {/* Single Row Layout */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">

            {/* Logo + Tagline (gauche) */}
            <div className="flex items-center gap-3 min-w-0">
              <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 1 }}>
                <CaurisIcon className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
              </motion.div>
              <div className="min-w-0">
                <p className="text-[#D4AF37] font-serif font-bold tracking-[0.2em] whitespace-nowrap">
                  LUKENI
                </p>
                <p className="text-gray-600 text-[9px] whitespace-nowrap italic tracking-widest">
                  Africa Must Unite
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-4 w-px bg-white/10" />

            {/* Legal Links (centre) */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {/* À Propos */}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/qui-sommes-nous"
                  className="text-gray-500 hover:text-[#D4AF37] transition-colors font-medium flex items-center gap-1 whitespace-nowrap"
                >
                  <Info size={13} />
                  {t.about}
                </Link>
              </motion.div>

              <span className="text-gray-700">•</span>

              {/* Mentions Légales */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setLegalModal('legal')}
                className="text-gray-500 hover:text-[#D4AF37] transition-colors font-medium flex items-center gap-1 whitespace-nowrap"
              >
                <Scale size={13} />
                {t.legal}
              </motion.button>

              <span className="text-gray-700">•</span>

              {/* Suivi Éthique */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setLegalModal('ethics')}
                className="text-gray-500 hover:text-[#D4AF37] transition-colors font-medium flex items-center gap-1 whitespace-nowrap"
              >
                <Shield size={13} />
                {t.ethics}
              </motion.button>

              <span className="text-gray-700">•</span>

              {/* Crédits */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setLegalModal('credits')}
                className="text-gray-500 hover:text-[#D4AF37] transition-colors font-medium flex items-center gap-1 whitespace-nowrap"
              >
                <Heart size={13} />
                {t.credits}
              </motion.button>
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-4 w-px bg-white/10" />

            {/* Contact + Socials (droite) */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Email */}
              <motion.a
                href="mailto:lukeni.team@gmail.com"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 text-white/30 hover:text-[#D4AF37] transition-colors rounded hover:bg-white/5"
                title="Email"
              >
                <Mail size={15} />
              </motion.a>

              {/* Twitter */}
              <motion.a
                href="https://twitter.com/lukeni"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 text-white/30 hover:text-[#D4AF37] transition-colors rounded hover:bg-white/5"
                title="Twitter"
              >
                <TwitterIcon size={15} />
              </motion.a>

              {/* Instagram */}
              <motion.a
                href="https://instagram.com/lukeni"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 text-white/30 hover:text-[#D4AF37] transition-colors rounded hover:bg-white/5"
                title="Instagram"
              >
                <InstagramIcon size={15} />
              </motion.a>
            </div>
          </div>

          {/* Bottom Row - Very Compact */}
          <div className="mt-4 pt-4 border-t border-white/5 text-center text-[8px] text-gray-700">
            {t.copyright}
          </div>
        </div>
      </footer>

      {/* LEGAL MODALS */}
      <LegalModal isOpen={legalModal === 'legal'} onClose={() => setLegalModal(null)} type="legal" lang={lang} />
      <LegalModal isOpen={legalModal === 'ethics'} onClose={() => setLegalModal(null)} type="ethics" lang={lang} />
      <LegalModal isOpen={legalModal === 'credits'} onClose={() => setLegalModal(null)} type="credits" lang={lang} />
    </>
  );
}