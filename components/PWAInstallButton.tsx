// components/PWAInstallButton.tsx
"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible]         = useState(false);
  const [isInstalled, setIsInstalled]     = useState(false);

  useEffect(() => {
    // Déjà installé ?
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Écouter l'événement d'installation
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS : afficher manuellement (Safari ne supporte pas beforeinstallprompt)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    if (isIOS && !isInStandaloneMode) {
      setIsVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsVisible(false);
    }
    setInstallPrompt(null);
  };

  if (isInstalled || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
      >
        <div className="bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-2xl p-4 shadow-2xl shadow-black/50 backdrop-blur-xl flex items-center gap-4">
          {/* Icône */}
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
            <img src="/icon-192x192.png" alt="Lukeni" className="w-8 h-8 rounded-lg" />
          </div>

          {/* Texte */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold">Installer Lukeni</p>
            <p className="text-gray-500 text-xs">Accès rapide depuis votre écran d'accueil</p>
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsVisible(false)}
              className="p-1.5 text-gray-600 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 bg-[#D4AF37] text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white transition-colors"
            >
              <Download size={13} />
              Installer
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}