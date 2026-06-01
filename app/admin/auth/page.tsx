"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, Lock, ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminAuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('butacode08@gmail.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log('[AdminAuth]', msg);
    setDebugLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    setMounted(true);
    addLog('Component mounted');
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDebugLog([]);
    setIsLoading(true);

    try {
      addLog('1. Starting login process...');
      addLog(`2. Email: ${email}`);

      // 1. Authentication Supabase
      addLog('3. Calling supabase.auth.signInWithPassword...');
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        addLog(`4. Auth error: ${authError.message} (status: ${authError.status})`);
        console.error('Auth error details:', authError);
        
        if (authError.status === 400) {
          throw new Error("❌ Email ou mot de passe incorrect\n\nVérifiez dans Supabase Dashboard → Authentication → Users");
        }
        throw new Error(`❌ Erreur authentication: ${authError.message}`);
      }

      if (!data.user) {
        addLog('4. No user data returned');
        throw new Error("Aucun utilisateur trouvé.");
      }

      addLog(`4. User authenticated: ${data.user.id}`);

      // 2. Vérifier le profil admin
      addLog('5. Fetching profile from database...');
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        addLog(`6. Profile error: ${profileError.message} (code: ${profileError.code})`);
        console.error('Profile error details:', profileError);
        
        if (profileError.code === '500' || profileError.message?.includes('500')) {
          throw new Error("❌ Erreur Base de Données (500)\n\nLa table 'profiles' a un problème.");
        }
        
        await supabase.auth.signOut();
        throw new Error("❌ Profil administrateur introuvable");
      }

      if (!profile) {
        addLog('6. No profile found');
        await supabase.auth.signOut();
        throw new Error("Profil introuvable.");
      }

      addLog(`6. Profile found: role = ${profile.role}`);

      if (profile.role !== 'admin' && profile.role !== 'superadmin') {
  addLog(`7. Access denied: role = ${profile.role}`);
  await supabase.auth.signOut();
  throw new Error(`❌ Accès refusé : Votre rôle est "${profile.role}"`);
}

addLog('7. Admin access granted! Redirecting...');
window.location.href = '/admin';




      // 3. Succès - Redirection
      router.push('/admin');
      router.refresh();
      
    } catch (err: any) {
      console.error('Login error:', err);
      addLog(`ERROR: ${err.message}`);
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="animate-spin text-red-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mb-6">
        <Link href="/explore" className="text-gray-600 flex items-center gap-2 text-xs hover:text-gray-400 transition-colors">
          <ArrowLeft size={14} /> Retour au site
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-sm bg-[#0a0a0a] border border-white/5 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center mb-3">
            <ShieldCheck className="text-red-500" size={24} />
          </div>
          <h1 className="text-xl font-mono tracking-wider text-gray-400">ADMIN ACCESS</h1>
          <p className="text-gray-700 text-[10px] mt-1 font-mono">AUTHORIZED PERSONNEL ONLY</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }} 
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={14} />
                <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap">{error}</pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-600 mb-1 font-mono uppercase">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full bg-[#050505] border border-white/5 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-red-500/50 transition-colors font-mono"
                required 
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-600 mb-1 font-mono uppercase">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-[#050505] border border-white/5 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-red-500/50 transition-colors font-mono"
                required 
                autoComplete="current-password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-red-500 transition-colors disabled:opacity-50 font-mono"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                CONNEXION...
              </>
            ) : (
              "SE CONNECTER"
            )}
          </button>
        </form>

        {/* Debug Console */}
        <div className="mt-6 p-4 bg-black/50 rounded-lg border border-white/5">
          <p className="text-[10px] text-gray-500 font-mono mb-2">📋 Debug Log:</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {debugLog.length === 0 ? (
              <p className="text-[9px] text-gray-600 font-mono">En attente...</p>
            ) : (
              debugLog.map((log, i) => (
                <p key={i} className="text-[9px] text-green-400 font-mono">{log}</p>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5">
          <p className="text-[9px] text-gray-500 font-mono text-center">
            🔒 Accès réservé aux administrateurs<br/>
            User ID: 056ac637-0758-4188-b023-e3dbc4cd6378
          </p>
        </div>
      </motion.div>
    </div>
  );
}