// components/logo.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface CaurisIconProps {
  className?: string;
  size?: number;
}

export const CaurisIcon = ({ className = '', size = 24 }: CaurisIconProps) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className} 
    width={size} 
    height={size}
    fill="currentColor"
  >
    <defs>
      <linearGradient id="caurisGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    <path 
      fill="url(#caurisGlow)" 
      d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" 
    />
    <path 
      d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" 
    />
    <path 
      d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
  </svg>
);

interface LogoLukeniProps {
  className?: string;
  variant?: 'gold' | 'black';
  animated?: boolean;
}

export const LogoLukeni = ({ 
  className = "w-16 h-16", 
  variant = 'gold',
  animated = false 
}: LogoLukeniProps) => {
  const logo = (
    <div className={`flex flex-col items-center gap-3 ${variant === 'gold' ? 'text-[#D4AF37]' : 'text-black'}`}>
      <CaurisIcon className={className} />
      <span className="font-serif tracking-[0.4em] text-2xl md:text-3xl font-light">LUKENI</span>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        animate={{ 
          boxShadow: ['0 0 20px rgba(212, 175, 55, 0.3)', '0 0 40px rgba(212, 175, 55, 0.6)', '0 0 20px rgba(212, 175, 55, 0.3)'] 
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {logo}
      </motion.div>
    );
  }

  return logo;
};

export default LogoLukeni;