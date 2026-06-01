"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, LogIn, LogOut, User as UserIcon, Moon, Sun } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface SpaceHeaderProps {
  title: string;
  icon: React.ReactNode;
  accentColor?: string;
  lang: 'fr' | 'en';
  onLangChange: (lang: 'fr' | 'en') => void;
  isOrganic?: boolean;
  onThemeToggle?: () => void;
}

export default function SpaceHeader({ title, icon, accentColor = '#D4AF37', lang, onLangChange, isOrganic, onThemeToggle }: SpaceHeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(data);
    };

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) { setUser(session.user); fetchProfile(session.user.id); }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id); else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); setShowMenu(false); };

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isOrganic ? 'bg-[#1a120b]/90 border-[#D4AF37]/20' : 'bg-black/90 border-white/10'}`}>
      <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/explore" className="text-gray-400 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
          <div className="flex items-center gap-2" style={{ color: accentColor }}>{icon}<h1 className="text-base sm:text-lg font-serif tracking-wider">{title}</h1></div>
        </div>

        <div className="flex items-center gap-2 relative">
          <button onClick={() => onLangChange(lang === 'fr' ? 'en' : 'fr')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${isOrganic ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30' : 'bg-white/5 text-white border border-white/10'}`}>{lang.toUpperCase()}</button>
          
          {onThemeToggle && (
            <button onClick={onThemeToggle} className={`p-2 rounded-full ${isOrganic ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37] border border-[#D4AF37]/30'}`}>
              {isOrganic ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}

          {user ? (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border-2 hover:border-white/50 transition-colors" style={{ borderColor: accentColor + '60', backgroundColor: accentColor + '20' }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <UserIcon size={16} style={{ color: accentColor }} />}
              </button>
              <AnimatePresence>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute right-0 top-12 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl p-2 shadow-2xl z-50">
                      <div className="px-3 py-2 border-b border-white/10 mb-1">
                        <p className="text-white text-sm font-medium truncate">{profile?.full_name || (lang === 'fr' ? 'Utilisateur' : 'User')}</p>
                        <p className="text-gray-500 text-[10px] font-mono truncate">{user.email}</p>
                      </div>
                      <Link href="/profil" onClick={() => setShowMenu(false)} className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/5 rounded-lg text-sm transition-colors"><UserIcon size={14} /> {lang === 'fr' ? 'Mon Profil' : 'My Profile'}</Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-white/5 rounded-lg text-sm transition-colors"><LogOut size={14} /> {lang === 'fr' ? 'Déconnexion' : 'Sign out'}</button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/auth" className="p-2 rounded-full bg-white/5 border border-white/10 hover:border-white/30 transition-colors" style={{ color: accentColor }}><LogIn size={16} /></Link>
          )}
        </div>
      </div>
    </header>
  );
}