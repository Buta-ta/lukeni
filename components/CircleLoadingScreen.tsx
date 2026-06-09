'use client';

import React from 'react';
import { motion } from 'framer-motion';

const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function CircleLoadingScreen({ lang = 'fr' }: { lang?: 'fr' | 'en' }) {
  return (
    <div className="min-h-screen bg-[#020111] flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
        <CaurisIcon className="w-12 h-12 text-emerald-500" />
      </motion.div>
    </div>
  );
}