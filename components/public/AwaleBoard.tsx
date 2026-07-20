"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Seed {
  id: string;
  startHole: number;
  currentHole: number;
  totalMoves: number;
  moveProgress: number; // 0 à 1
}

export function AwaleBoard({ className }: { className?: string }) {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [nextId, setNextId] = useState(0);

  // Positions absolues des 12 trous (6 en haut, 6 en bas)
  const holePositions = [
    // Rangée du haut (indices 0-5)
    { x: 35, y: 28 },
    { x: 69, y: 28 },
    { x: 103, y: 28 },
    { x: 137, y: 28 },
    { x: 171, y: 28 },
    { x: 205, y: 28 },
    // Rangée du bas (indices 6-11, sens inverse)
    { x: 205, y: 52 },
    { x: 171, y: 52 },
    { x: 137, y: 52 },
    { x: 103, y: 52 },
    { x: 69, y: 52 },
    { x: 35, y: 52 },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      // Toutes les 5-7 secondes, lance une nouvelle séquence de semaison
      const startHole = Math.floor(Math.random() * 12);
      const numSeeds = Math.floor(Math.random() * 3) + 2; // 2 à 4 graines
      const isClockwise = Math.random() > 0.5;

      const newSeeds: Seed[] = [];
      for (let i = 0; i < numSeeds; i++) {
        const nextHole = (startHole + (i + 1)) % 12;
        newSeeds.push({
          id: `seed-${nextId + i}`,
          startHole,
          currentHole: nextHole,
          totalMoves: i + 1,
          moveProgress: 0,
        });
      }
      setNextId(prev => prev + numSeeds);
      setSeeds(newSeeds);

      // Animation : on augmente moveProgress de 0 à 1 sur 800ms
      let startTime: number | null = null;
      const animate = (time: number) => {
        if (startTime === null) startTime = time;
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / 800, 1);

        setSeeds(prev => prev.map(s => ({ ...s, moveProgress: progress })));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Après l'animation, garde les graines visibles un peu puis fade out
          setTimeout(() => setSeeds([]), 1200);
        }
      };
      requestAnimationFrame(animate);
    }, 5500 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [nextId]);

  const getSeedPosition = (seed: Seed) => {
    const startPos = holePositions[seed.startHole];
    const endPos = holePositions[seed.currentHole];

    // Interpolation avec arc (courbe de Bézier simple)
    const progress = seed.moveProgress;
    const easeProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

    // Position linéaire
    const x = startPos.x + (endPos.x - startPos.x) * easeProgress;
    const y = startPos.y + (endPos.y - startPos.y) * easeProgress;

    // Arc (monte jusqu'à 0.5, redescend après)
    const arcHeight = Math.sin(progress * Math.PI) * 8;

    return { x, y: y - arcHeight };
  };

  return (
    <svg viewBox="0 0 240 80" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Plateau principal */}
      <rect x="10" y="10" width="220" height="60" rx="15" className="stroke-[#D4AF37]/50 fill-[#D4AF37]/5" />

      {/* Trous de la rangée du haut */}
      {[...Array(6)].map((_, i) => (
        <circle key={`t-${i}`} cx={35 + i * 34} cy={28} r="8" className="stroke-[#D4AF37]/40 fill-[#020111]" />
      ))}

      {/* Trous de la rangée du bas */}
      {[...Array(6)].map((_, i) => (
        <circle key={`b-${i}`} cx={35 + i * 34} cy={52} r="8" className="stroke-[#D4AF37]/40 fill-[#020111]" />
      ))}

      {/* Graines animées */}
      {seeds.map((seed) => {
        const pos = getSeedPosition(seed);
        const opacity = seed.moveProgress > 0.8 ? 1 - (seed.moveProgress - 0.8) / 0.2 : 1;
        return (
          <circle key={seed.id} cx={pos.x} cy={pos.y} r="2.5" className="fill-[#D4AF37]" opacity={opacity} filter="drop-shadow(0 0 3px rgba(212,175,55,0.8))" />
        );
      })}

      {/* Graines statiques au repos (ambiance) */}
      {seeds.length === 0 && (
        <>
          <circle cx="100" cy="49" r="2" className="fill-[#D4AF37] stroke-none opacity-40" />
          <circle cx="105" cy="51" r="2" className="fill-[#D4AF37] stroke-none opacity-40" />
          <circle cx="102" cy="55" r="2" className="fill-[#D4AF37] stroke-none opacity-40" />
        </>
      )}
    </svg>
  );
}