// components/SaveAsVisitorModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Ticket, LogIn } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/contexts/LanguageContext';

/**
 * Affiche un modal d'incitation quand un visiteur tente de sauvegarder.
 * 
 * Usage :
 *   const { checkIfVisitor } = useSaveGuard();
 *   const handleClick = async () => {
 *     const canSave = await checkIfVisitor();
 *     if (!canSave) return; // visiteur → modal affiché
 *     // ... logique de sauvegarde
 *   };
 */

interface SaveGuardReturn {
  isVisitor: boolean;
  checkIfVisitor: () => Promise<boolean>; // true = peut sauvegarder, false = visiteur bloqué
  SaveVisitorModal: React.FC;
}

export function useSaveGuard(): SaveGuardReturn {
  const [isVisitor, setIsVisitor] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { lang } = useLanguage();

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (profile?.role === 'visitor') {
        setIsVisitor(true);
      }
      setIsLoading(false);
    }
    check();
  }, []);

  const checkIfVisitor = async (): Promise<boolean> => {
    if (isLoading) return true; // en chargement → autoriser par défaut
    if (!isVisitor) return true; // pas visiteur → autoriser
    setShowModal(true);          // visiteur → afficher le modal
    return false;
  };

  const SaveVisitorModal: React.FC = () => (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0a0f] border border-[#D4AF37]/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#D4AF37]/20 rounded-xl">
                  <Ticket size={20} className="text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">
                    {lang === 'fr' ? 'Mode Visiteur' : 'Visitor Mode'}
                  </h3>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest">
                    {lang === 'fr' ? 'Données non sauvegardées' : 'Data not saved'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message */}
            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              {lang === 'fr'
                ? "En mode visiteur, tes données ne sont pas sauvegardées. Crée un compte gratuit pour garder tes progrès, favoris et contributions !"
                : "In visitor mode, your data is not saved. Create a free account to keep your progress, favorites and contributions!"}
            </p>

            {/* Actions */}
            <div className="space-y-2.5">
              <Link href="/auth?mode=register" onClick={() => setShowModal(false)}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#e8c547] text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus size={14} />
                  {lang === 'fr' ? 'Créer un compte' : 'Create account'}
                </motion.button>
              </Link>

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-xs font-medium hover:bg-white/10 transition-all"
              >
                {lang === 'fr' ? 'Continuer sans sauvegarder' : 'Continue without saving'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { isVisitor, checkIfVisitor, SaveVisitorModal };
}
