"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Loader2, Send } from 'lucide-react';

export default function SuggestButton({ space, lang }: { space: string; lang: 'fr' | 'en' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold hover:bg-[#D4AF37] hover:text-black transition-all"
      >
        <Lightbulb size={14} />
        <span>{lang === 'fr' ? 'Suggérer' : 'Suggest'}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#121212] border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl"
            >
              <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 text-white/50 hover:text-white">
                <X size={24} />
              </button>

              <h3 className="text-2xl font-serif text-[#D4AF37] mb-6">
                {lang === 'fr' ? 'Proposer un récit' : 'Suggest a story'}
              </h3>

              {isSent ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-4 text-green-500">✓</div>
                  <p className="text-white font-medium">{lang === 'fr' ? 'Reçu ! Merci pour votre contribution.' : 'Received! Thank you for your contribution.'}</p>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSending(true);
                  await supabase.from('press_suggestions').insert({ suggested_topic: topic, status: 'pending' });
                  setIsSent(true);
                  setTimeout(() => { setIsSent(false); setIsOpen(false); setTopic(''); }, 2000);
                }}>
                  <textarea 
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    required
                    placeholder={lang === 'fr' ? "De quoi devrions-nous parler ?" : "What should we talk about?"}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#D4AF37] h-32 resize-none"
                  />
                  <button className="w-full bg-[#D4AF37] text-black py-4 rounded-full font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all">
                    {isSending ? <Loader2 className="animate-spin mx-auto" /> : (lang === 'fr' ? 'Envoyer' : 'Submit')}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}