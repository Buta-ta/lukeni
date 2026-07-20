"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AwaleGame({ message, isError = false }: { message?: string, isError?: boolean }) {
  const router = useRouter();
  // L'Awalé classique a 12 trous (2 rangées de 6) avec 4 graines au départ
  const [board, setBoard] = useState<number[]>(Array(12).fill(4));
  const [isPlaying, setIsPlaying] = useState(false);

  const playPit = (index: number) => {
    if (board[index] === 0 || isPlaying) return;
    setIsPlaying(true);

    let newBoard = [...board];
    let seeds = newBoard[index];
    newBoard[index] = 0;
    
    let curr = index;
    
    // Animation simple de distribution (on simule un délai)
    const distribute = setInterval(() => {
      if (seeds > 0) {
        curr = (curr + 1) % 12;
        // Règle classique : on ne remet pas de graine dans le trou de départ
        if (curr === index) curr = (curr + 1) % 12; 
        
        newBoard[curr]++;
        seeds--;
        setBoard([...newBoard]);
      } else {
        clearInterval(distribute);
        setIsPlaying(false);
      }
    }, 200); // 200ms entre chaque graine posée
  };

  const resetGame = () => setBoard(Array(12).fill(4));

  return (
    <div className="min-h-screen bg-[#020111] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-3xl max-h-3xl bg-[#D4AF37]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="z-10 text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-serif text-[#D4AF37] mb-4"
        >
          {isError ? "Oups ! Un imprévu..." : "Maintenance en cours"}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 max-w-lg mx-auto"
        >
          {message || "Prenez le temps de faire une partie d'Awalé en attendant. Semez vos graines pour passer le temps."}
        </motion.p>
      </div>

      {/* Le Plateau d'Awalé */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-[#1a1005] p-6 md:p-10 rounded-[40px] shadow-2xl border-4 border-[#3a2511] w-full max-w-4xl relative z-10"
        style={{ boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.8)' }}
      >
        <div className="grid grid-cols-6 gap-3 md:gap-6">
          {/* Rangée du Haut (Adversaire - Index 11 à 6) */}
          {[11, 10, 9, 8, 7, 6].map((i) => (
            <Pit key={i} count={board[i]} onClick={() => playPit(i)} isPlaying={isPlaying} />
          ))}
          {/* Rangée du Bas (Joueur - Index 0 à 5) */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Pit key={i} count={board[i]} onClick={() => playPit(i)} isPlaying={isPlaying} />
          ))}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-4 mt-12 z-10"
      >
        <button onClick={resetGame} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all">
          <RefreshCw size={18} /> Recommencer
        </button>
        {isError && (
          <button onClick={() => router.push('/')} className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#D4AF37] hover:bg-[#b5952f] text-black font-bold transition-all">
            <Home size={18} /> Retour à l'accueil
          </button>
        )}
      </motion.div>
    </div>
  );
}

// Sous-composant pour un "Trou" (Pit)
function Pit({ count, onClick, isPlaying }: { count: number, onClick: () => void, isPlaying: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={count === 0 || isPlaying}
      className={`relative aspect-square rounded-full bg-[#0a0502] shadow-inner border-2 transition-all flex items-center justify-center
        ${count > 0 && !isPlaying ? 'border-[#5a3a1f] hover:border-[#D4AF37] hover:bg-[#1f1208] cursor-pointer' : 'border-[#2a1a0f] cursor-default opacity-80'}
      `}
      style={{ boxShadow: 'inset 0 10px 20px rgba(0,0,0,1)' }}
    >
      <div className="flex flex-wrap items-center justify-center gap-1 w-3/4 h-3/4">
        {Array.from({ length: Math.min(count, 12) }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-2 h-3 md:w-3 md:h-4 bg-[#e8dcc4] rounded-full shadow-sm"
            style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} // Forme de cauris
          />
        ))}
        {count > 12 && <span className="text-[#D4AF37] text-xs font-bold absolute bottom-1">+{count - 12}</span>}
      </div>
      <span className="absolute -bottom-6 text-gray-500 font-mono text-xs">{count}</span>
    </button>
  );
}