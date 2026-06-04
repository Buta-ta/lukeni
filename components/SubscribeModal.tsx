"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Mail, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PushSubscribeButton from './PushSubscribeButton';

export default function SubscribeModal({ isOpen, onClose, isOrganic }: { isOpen: boolean; onClose: () => void; isOrganic: boolean }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      setStatus('error');
      return;
    }

    setStatus('loading');

    const { error } = await supabase
      .from('subscriber_preferences')
      .upsert({ email, language: 'fr' }, { onConflict: 'email' });

    if (error) {
      setStatus('error');
    } else {
      setStatus('success');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl p-6 ${
              isOrganic ? 'bg-[#2d1e13] border border-[#D4AF37]/40' : 'bg-gray-900 border border-white/20'
            }`}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-[#D4AF37]">
                <Bell size={24} />
                <h2 className="text-xl font-serif">Rappel Quotidien</h2>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {status === 'success' ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-white text-lg mb-2">Vous êtes abonné !</h3>
                <p className="text-white/60 text-sm">
                  Vous recevrez un email chaque jour avec un événement historique.
                </p>
              </div>
            ) : (
              <>
                <p className="text-white/70 text-sm mb-6">
                  Recevez chaque jour à <span className="text-[#D4AF37] font-bold">07h00</span> un rappel des événements historiques qui se sont déroulés ce jour-là. 100% gratuit.
                </p>

                <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${
                  isOrganic ? 'bg-[#1a120b] border border-[#D4AF37]/20' : 'bg-black/50 border border-white/10'
                }`}>
                  <Mail size={18} className="text-[#D4AF37]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-white/30"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-red-400 text-xs mb-4">Veuillez entrer un email valide.</p>
                )}

                <button
                  onClick={handleSubscribe}
                  disabled={status === 'loading'}
                  className="w-full py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#E5C158] transition-colors disabled:opacity-50"
                >
                  {status === 'loading' ? 'Enregistrement...' : "S'abonner gratuitement"}
                </button>

                                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                  <p className="text-white/50 text-xs mb-4">Ou recevez les alertes directement sur votre appareil sans email :</p>
                  <div className="flex justify-center">
                    <PushSubscribeButton isOrganic={isOrganic} />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}