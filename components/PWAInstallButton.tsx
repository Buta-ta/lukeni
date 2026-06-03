// components/PWAInstallButton.tsx
"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallButtonProps {
  lang?: 'fr' | 'en';
  delayMs?: number;
}

export function PWAInstallButton({ lang = 'fr', delayMs = 4000 }: PWAInstallButtonProps) {
  const pathname = usePathname();
  
  // ✅ N'afficher que sur la landing page
  if (pathname !== '/') return null;

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // ✅ Vérifier pathname d'abord
    if (pathname !== '/') {
      setIsInstalled(true);
      return;
    }

    // ── 1. Déjà installé en standalone ?
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // ── 2. L'utilisateur a déjà refusé ou installé → ne plus afficher
    const dismissed = localStorage.getItem('lukeni_pwa_dismissed');
    const installed = localStorage.getItem('lukeni_pwa_installed');
    if (dismissed === 'true' || installed === 'true') return;

    // ── 3. Détection iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode =
      ('standalone' in window.navigator) && (window.navigator as any).standalone;
    setIsIOS(ios);

    // ── 4. Délai avant affichage
    const delayTimer = setTimeout(() => {
      setIsReady(true);

      if (ios && !isInStandaloneMode) {
        setIsVisible(true);
      }
    }, delayMs);

    // ── 5. Écouter l'événement natif
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setIsVisible(true), delayMs);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(delayTimer);
    };
  }, [delayMs, pathname]);

  // ── Installer (Android / Chrome)
  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsVisible(false);
      localStorage.setItem('lukeni_pwa_installed', 'true');
    }
    setInstallPrompt(null);
  };

  // ── Fermer sans installer
  const handleDismiss = () => {
    setIsVisible(false);
    setShowIOSInstructions(false);
    localStorage.setItem('lukeni_pwa_dismissed', 'true');
  };

  if (isInstalled || !isVisible || !isReady) return null;

  return (
    <AnimatePresence>
      {/* ── BANNER PRINCIPAL ── */}
      {!showIOSInstructions && (
        <motion.div
          key="pwa-banner"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4"
        >
          <div className="bg-[#0a0a0a]/95 border border-[#D4AF37]/30 rounded-2xl p-4 shadow-2xl shadow-black/50 backdrop-blur-xl flex items-center gap-4">
            {/* Icône app */}
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0 border border-[#D4AF37]/20">
              <img src="/icon-192x192.png" alt="Lukeni" className="w-8 h-8 rounded-lg" />
            </div>

            {/* Texte */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">
                {lang === 'fr' ? 'Installer Lukeni' : 'Install Lukeni'}
              </p>
              <p className="text-gray-500 text-xs leading-snug mt-0.5">
                {isIOS
                  ? (lang === 'fr'
                    ? 'Ajoutez-nous à votre écran d\'accueil'
                    : 'Add us to your home screen')
                  : (lang === 'fr'
                    ? 'Accès rapide depuis votre écran d\'accueil'
                    : 'Quick access from your home screen')}
              </p>
            </div>

            {/* Boutons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleDismiss}
                className="p-1.5 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 bg-[#D4AF37] text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#E5C158] transition-colors"
              >
                {isIOS
                  ? <><Share size={12} /> {lang === 'fr' ? 'Voir comment' : 'See how'}</>
                  : <><Download size={12} /> {lang === 'fr' ? 'Installer' : 'Install'}</>}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── INSTRUCTIONS IOS ── */}
      {showIOSInstructions && (
        <motion.div
          key="ios-instructions"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4"
        >
          <div className="bg-[#0a0a0a]/95 border border-[#D4AF37]/30 rounded-2xl p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-white text-sm font-bold">
                {lang === 'fr' ? 'Ajouter à l\'écran d\'accueil' : 'Add to Home Screen'}
              </p>
              <button
                onClick={handleDismiss}
                className="p-1 text-gray-600 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Étapes */}
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {lang === 'fr'
                    ? 'Appuyez sur le bouton Partager'
                    : 'Tap the Share button'}
                  {' '}<span className="text-white font-bold">⬆</span>
                  {' '}
                  {lang === 'fr'
                    ? 'en bas de Safari'
                    : 'at the bottom of Safari'}
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {lang === 'fr'
                    ? 'Faites défiler et appuyez sur'
                    : 'Scroll down and tap'}
                  {' '}<span className="text-white font-bold">
                    {lang === 'fr' ? '"Sur l\'écran d\'accueil"' : '"Add to Home Screen"'}
                  </span>
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {lang === 'fr'
                    ? 'Appuyez sur "Ajouter" en haut à droite'
                    : 'Tap "Add" in the top right corner'}
                </p>
              </li>
            </ol>

            {/* Flèche indicatrice */}
            <div className="mt-4 flex justify-center">
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="text-[#D4AF37] text-xl"
              >
                ↓
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}