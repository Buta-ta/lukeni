"use client";

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Trophy, ArrowLeft, Cpu, User,
  Volume2, VolumeX, RotateCcw, Lightbulb,
  BarChart2, ChevronDown, Zap, Shield, Star,
  Bot, Sparkles, Info, X, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAwaleSounds } from '@/lib/hooks/useAwaleSounds';
import { useAwaleGameSettings } from '@/lib/hooks/useAwaleGameSettings';
import { useAwaleStats, type Difficulty } from '@/lib/hooks/useAwaleStats';

// ─── CONSTANTES ───────────────────────────────────────────────
const TOTAL_PITS = 12;
const LS_SAVED_GAME_KEY = 'awale_saved_game';

// ─── PERSONAS ADVERSES (COACHS IA PAR NIVEAU) ─────────────────
const AI_PERSONAS: Record<Difficulty, {
  name: string;
  title: { fr: string; en: string };
  quote: { fr: string; en: string };
  color: string;
}> = {
  easy: {
    name: 'Nzinga',
    title: { fr: "L'Apprentie", en: 'The Apprentice' },
    quote: { fr: "Faisons une partie amicale pour apprendre !", en: "Let's play a friendly match to learn!" },
    color: 'text-emerald-400',
  },
  medium: {
    name: 'Sundiata',
    title: { fr: 'Le Tacticien', en: 'The Tactician' },
    quote: { fr: "Chaque graine semée prépare la victoire.", en: "Every seed sown prepares the victory." },
    color: 'text-yellow-400',
  },
  expert: {
    name: 'Lukeni',
    title: { fr: 'Le Grand Maître', en: 'The Grandmaster' },
    quote: { fr: "Mes calculs stratégiques ne pardonnent pas.", en: "My tactical calculations are unforgiving." },
    color: 'text-red-400',
  },
};

// ─── TRADUCTIONS (BILINGUE FR / EN) ───────────────────────────
const T = {
  fr: {
    back: 'Retour',
    title: 'Awalé',
    yourTurn: 'À vous de jouer',
    aiThinking: "L'IA réfléchit…",
    you: 'Vous',
    ai: 'IA',
    restart: 'Recommencer',
    yourSide: 'Votre côté',
    aiSide: 'Côté IA',
    youWon: 'Vous avez gagné ! 🎉',
    aiWon: "L'IA a gagné ! 🤖",
    draw: 'Match Nul ! 🤝',
    playAgain: 'Rejouer',
    badge: 'Lukeni',
    howToPlay: 'Règles du jeu',
    rule1: '1. Cliquez sur un de vos trous (en bas) pour semer les graines.',
    rule2: '2. Capturez si la dernière graine tombe chez l’adversaire sur un trou à 2 ou 3.',
    rule3: '3. Le joueur qui capture le seuil de victoire (25) ou plus gagne la partie.',
    rule4: '4. Mode Preview : survoler un trou affiche où tomberont vos graines.',
    score: 'Score final',
    difficulty: 'Difficulté',
    easy: 'Facile',
    medium: 'Moyen',
    expert: 'Expert',
    undo: 'Annuler',
    hintButton: 'Coach Butacode',
    stats: 'Statistiques',
    wins: 'Victoires',
    losses: 'Défaites',
    draws: 'Nuls',
    winRate: 'Taux de victoire',
    totalGames: 'Parties jouées',
    streak: 'Série actuelle',
    bestStreak: 'Meilleure série',
    avgTime: 'Temps moyen',
    soundLabel: 'Son',
    muteSound: 'Couper',
    unmuteSound: 'Activer',
    undoLeft: 'annulation restante',
    gameDisabled: "Le jeu est temporairement indisponible.",
    globalRating: 'Stats globales',
    totalPlayedGlobal: 'parties jouées',
    playerWinRateGlobal: 'de victoires joueurs',
    seconds: 's',
    previewTooltip: 'Survolez un trou pour prévisualiser le trajet des graines',
    coachTitle: 'Coach Butacode',
    coachAdvice: (pitNum: number, seeds: number) =>
      `Je te conseille de jouer le trou n°${pitNum} (${seeds} graine${seeds > 1 ? 's' : ''}). C'est le coup le plus rentable !`,
    coachWait: "C'est au tour de l'adversaire de jouer !",
    coachNoMove: "Aucun mouvement possible pour l'instant.",
    gameRestored: "Partie en cours restaurée !",
  },
  en: {
    back: 'Back',
    title: 'Awalé',
    yourTurn: 'Your turn',
    aiThinking: 'AI is thinking…',
    you: 'You',
    ai: 'AI',
    restart: 'Restart',
    yourSide: 'Your side',
    aiSide: 'AI side',
    youWon: 'You won! 🎉',
    aiWon: 'AI won! 🤖',
    draw: 'Draw! 🤝',
    playAgain: 'Play again',
    badge: 'Lukeni',
    howToPlay: 'Game Rules',
    rule1: '1. Click one of your pits (bottom) to sow seeds.',
    rule2: '2. Capture if your last seed lands on an opponent pit containing 2 or 3 seeds.',
    rule3: '3. The player who captures the win threshold (25) or more wins the match.',
    rule4: '4. Preview Mode: hover over a pit to see where your seeds will land.',
    score: 'Final score',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    expert: 'Expert',
    undo: 'Undo',
    hintButton: 'Coach Butacode',
    stats: 'Statistics',
    wins: 'Wins',
    losses: 'Losses',
    draws: 'Draws',
    winRate: 'Win rate',
    totalGames: 'Games played',
    streak: 'Current streak',
    bestStreak: 'Best streak',
    avgTime: 'Avg time',
    soundLabel: 'Sound',
    muteSound: 'Mute',
    unmuteSound: 'Unmute',
    undoLeft: 'undo left',
    gameDisabled: 'The game is temporarily unavailable.',
    globalRating: 'Global stats',
    totalPlayedGlobal: 'games played',
    playerWinRateGlobal: 'player win rate',
    seconds: 's',
    previewTooltip: 'Hover over a pit to preview the seed path',
    coachTitle: 'Coach Butacode',
    coachAdvice: (pitNum: number, seeds: number) =>
      `I recommend playing pit #${pitNum} (${seeds} seed${seeds > 1 ? 's' : ''}). It offers the highest tactical advantage!`,
    coachWait: "It is the opponent's turn to play!",
    coachNoMove: "No moves available right now.",
    gameRestored: "Saved game restored!",
  },
};

// ─── LOGIQUE DU JEU ───────────────────────────────────────────
const simulateMove = (
  board: number[], pitIndex: number, isPlayer: boolean
): { newBoard: number[]; capturedSeeds: number; lastIndex: number } => {
  let newBoard = [...board];
  let seeds = newBoard[pitIndex];
  if (seeds === 0) return { newBoard, capturedSeeds: 0, lastIndex: pitIndex };

  newBoard[pitIndex] = 0;
  let curr = pitIndex;

  while (seeds > 0) {
    curr = (curr + 1) % TOTAL_PITS;
    if (curr === pitIndex) continue;
    newBoard[curr]++;
    seeds--;
  }

  let capturedSeeds = 0;
  const isOpponentSide = (idx: number) =>
    isPlayer ? idx >= 6 && idx <= 11 : idx >= 0 && idx <= 5;

  if (isOpponentSide(curr)) {
    const oppStart = isPlayer ? 6 : 0;
    const oppEnd = isPlayer ? 11 : 5;
    let totalOpponentSeeds = 0;
    for (let i = oppStart; i <= oppEnd; i++) totalOpponentSeeds += newBoard[i];

    let tempBoard = [...newBoard];
    let tempCaptured = 0;
    let tempIdx = curr;

    while (
      isOpponentSide(tempIdx) &&
      (tempBoard[tempIdx] === 2 || tempBoard[tempIdx] === 3)
    ) {
      tempCaptured += tempBoard[tempIdx];
      tempBoard[tempIdx] = 0;
      tempIdx--;
      if (tempIdx < 0 || tempIdx >= TOTAL_PITS) break;
      if (isPlayer && tempIdx < 6) break;
      if (!isPlayer && tempIdx > 5) break;
    }

    if (tempCaptured < totalOpponentSeeds) {
      newBoard = tempBoard;
      capturedSeeds = tempCaptured;
    }
  }

  return { newBoard, capturedSeeds, lastIndex: curr };
};

const evaluateBoard = (board: number[], aiScore: number, playerScore: number) => {
  const aiSeeds = board.slice(6, 12).reduce((a, b) => a + b, 0);
  const playerSeeds = board.slice(0, 6).reduce((a, b) => a + b, 0);
  return (aiScore - playerScore) * 100 + (aiSeeds - playerSeeds) * 2;
};

const minimax = (
  board: number[], depth: number, isMaximizing: boolean,
  alpha: number, beta: number, aiScore: number, playerScore: number
): number => {
  const playerEmpty = board.slice(0, 6).every((s) => s === 0);
  const aiEmpty = board.slice(6, 12).every((s) => s === 0);
  if (depth === 0 || playerEmpty || aiEmpty) return evaluateBoard(board, aiScore, playerScore);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 6; i <= 11; i++) {
      if (board[i] === 0) continue;
      const { newBoard, capturedSeeds } = simulateMove(board, i, false);
      const val = minimax(newBoard, depth - 1, false, alpha, beta, aiScore + capturedSeeds, playerScore);
      maxEval = Math.max(maxEval, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return maxEval === -Infinity ? evaluateBoard(board, aiScore, playerScore) : maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i <= 5; i++) {
      if (board[i] === 0) continue;
      const { newBoard, capturedSeeds } = simulateMove(board, i, true);
      const val = minimax(newBoard, depth - 1, true, alpha, beta, aiScore, playerScore + capturedSeeds);
      minEval = Math.min(minEval, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return minEval === Infinity ? evaluateBoard(board, aiScore, playerScore) : minEval;
  }
};

const getBestMove = (
  board: number[], aiScore: number, playerScore: number,
  depth: number, forPlayer: boolean
): number => {
  let bestMove = -1;
  let bestScore = forPlayer ? Infinity : -Infinity;
  const range = forPlayer ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];

  for (const i of range) {
    if (board[i] === 0) continue;
    const { newBoard, capturedSeeds } = simulateMove(board, i, forPlayer);
    const score = minimax(
      newBoard, depth - 1, forPlayer,
      -Infinity, Infinity,
      forPlayer ? aiScore : aiScore + capturedSeeds,
      forPlayer ? playerScore + capturedSeeds : playerScore
    );
    if (forPlayer ? score < bestScore : score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
};

// ─── COMPOSANTS UI ────────────────────────────────────────────
const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5Z M50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
  </svg>
);

const Seed = ({ index }: { index: number }) => {
  const angle = (index * 137.5) % 360;
  const radius = index === 0 ? 0 : Math.min(28, 8 + index * 2.5);
  const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
  const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
  return (
    <div
      className="absolute w-2.5 h-3.5 md:w-3 md:h-4 bg-[#e8dcc4]"
      style={{
        left: `${x}%`, top: `${y}%`,
        transform: `translate(-50%, -50%) rotate(${angle + 30}deg)`,
        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
      }}
    />
  );
};

// ─── BADGE LUKENI ─────────────────────────────────────────────
const LukeniBadge = ({ lang }: { lang: 'fr' | 'en' }) => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full">
    <CaurisIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
    <span className="text-[#D4AF37] text-[9px] font-black uppercase tracking-widest">
      {T[lang].badge}
    </span>
  </div>
);

// ─── COMPOSANT TROU (PIT) AVEC PREVIEW AU SURVOL ──────────────
const Pit = ({
  count, onClick, disabled, isOpponent,
  highlight, justCaptured, isHintPit, previewSeeds, index,
}: {
  count: number; onClick?: () => void; disabled: boolean;
  isOpponent: boolean; highlight?: boolean; justCaptured?: boolean;
  isHintPit?: boolean; previewSeeds?: number[]; index: number;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={!disabled ? { scale: 1.06 } : {}}
      whileTap={!disabled ? { scale: 0.94 } : {}}
      className={`
        relative aspect-square rounded-full flex items-center justify-center
        border-2 transition-all duration-300
        ${isHintPit ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.7)]' :
          highlight ? 'border-[#D4AF37] shadow-[0_0_18px_rgba(212,175,55,0.35)] cursor-pointer' :
          isOpponent ? 'border-[#1a0f08]' : 'border-[#3a2010]'}
        ${justCaptured ? 'bg-[#D4AF37]/20' : 'bg-[#0a0502]'}
        ${!disabled && !isOpponent ? 'cursor-pointer' : 'cursor-default'}
      `}
      style={{
        boxShadow: justCaptured
          ? 'inset 0 8px 20px rgba(0,0,0,0.8), 0 0 15px rgba(212,175,55,0.3)'
          : 'inset 0 8px 20px rgba(0,0,0,0.9)',
      }}
    >
      <div className="relative w-full h-full">
        {Array.from({ length: Math.min(count, 16) }).map((_, i) => (
          <Seed key={i} index={i} />
        ))}
        {count > 16 && (
          <span className="absolute bottom-1 right-1 text-[#D4AF37] text-[8px] font-bold z-10">
            +{count - 16}
          </span>
        )}
      </div>

      {/* Preview graines au survol */}
      {hovered && previewSeeds && previewSeeds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-black text-[9px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap z-20 shadow-lg"
        >
          +{count} → {previewSeeds.join(', ')}
        </motion.div>
      )}

      {/* Badge Coach Butacode */}
      {isHintPit && (
        <motion.div
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center z-10 shadow-md"
        >
          <Bot size={13} className="text-black" />
        </motion.div>
      )}

      <span className={`absolute font-mono text-xs font-bold ${isOpponent ? '-top-6 text-red-400/80' : '-bottom-6 text-[#D4AF37]/80'}`}>
        {count}
      </span>
    </motion.button>
  );
};

// ─── SCORE CARD AVEC COACH ADVERSE ────────────────────────────
const ScoreCard = ({
  label, score, isActive, isPlayer, subtitle,
}: {
  label: string; score: number; isActive: boolean; isPlayer: boolean; subtitle?: string;
}) => (
  <motion.div
    animate={isActive ? { scale: 1.03 } : { scale: 1 }}
    className={`
      flex flex-col items-center px-5 py-3 rounded-2xl border-2 transition-all duration-500 min-w-[105px]
      ${isActive
        ? isPlayer
          ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
          : 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
        : 'border-white/8 bg-white/[0.02]'}
    `}
  >
    <span className="text-white/60 text-[9px] uppercase tracking-widest font-bold mb-0.5">{label}</span>
    {subtitle && (
      <span className="text-[10px] font-medium text-gray-400 mb-1">{subtitle}</span>
    )}
    <motion.span
      key={score}
      initial={{ scale: 1.4 }}
      animate={{ scale: 1 }}
      className={`text-3xl font-serif font-bold ${isPlayer ? 'text-[#D4AF37]' : 'text-red-500'}`}
    >
      {score}
    </motion.span>
    <div className={`w-full h-0.5 mt-2 rounded-full transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: isPlayer ? '#D4AF37' : '#ef4444' }} />
  </motion.div>
);

// ─── PANNEAU SON ──────────────────────────────────────────────
const SoundPanel = ({
  lang, muted, volume, onToggleMute, onVolumeChange,
}: {
  lang: 'fr' | 'en'; muted: boolean; volume: number;
  onToggleMute: () => void; onVolumeChange: (v: number) => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    className="absolute top-full mt-2 right-0 w-52 bg-[#1a1005]/98 border border-[#3a2511] rounded-2xl p-4 z-50 shadow-2xl"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-[#D4AF37] font-bold text-xs">{T[lang].soundLabel}</span>
      <button
        onClick={onToggleMute}
        className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold transition-all ${
          muted ? 'bg-white/10 text-gray-400' : 'bg-[#D4AF37]/20 text-[#D4AF37]'
        }`}
      >
        {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        {muted ? T[lang].unmuteSound : T[lang].muteSound}
      </button>
    </div>
    <input
      type="range" min={0} max={1} step={0.05}
      value={muted ? 0 : volume}
      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
      className="w-full accent-[#D4AF37]"
    />
    <div className="flex justify-between text-[9px] text-gray-600 mt-1">
      <span>0%</span>
      <span className="text-[#D4AF37]">{Math.round((muted ? 0 : volume) * 100)}%</span>
      <span>100%</span>
    </div>
  </motion.div>
);

// ─── PANNEAU STATS ────────────────────────────────────────────
const StatsPanel = ({
  lang, stats, globalStats, difficulty,
}: {
  lang: 'fr' | 'en';
  stats: ReturnType<typeof import('@/lib/hooks/useAwaleStats').useAwaleStats>['stats'];
  globalStats: ReturnType<typeof import('@/lib/hooks/useAwaleStats').useAwaleStats>['globalStats'];
  difficulty: Difficulty;
}) => {
  const t = T[lang];
  const d = stats.byDifficulty[difficulty];

  const StatRow = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-gray-500 text-[10px]">{label}</span>
      <span className="text-[#D4AF37] text-xs font-bold font-mono">{value}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute top-full mt-2 right-0 w-64 bg-[#1a1005]/98 border border-[#3a2511] rounded-2xl p-4 z-50 shadow-2xl"
    >
      <p className="text-[#D4AF37] font-bold text-xs mb-3 flex items-center gap-1.5">
        <BarChart2 size={12} /> {t.stats}
      </p>
      <StatRow label={t.totalGames} value={stats.totalGames} />
      <StatRow label={t.wins} value={stats.wins} />
      <StatRow label={t.losses} value={stats.losses} />
      <StatRow label={t.draws} value={stats.draws} />
      <StatRow label={t.winRate} value={`${stats.winRate}%`} />
      <StatRow label={t.streak} value={stats.currentStreak} />
      <StatRow label={t.bestStreak} value={stats.bestStreak} />
      <StatRow label={t.avgTime} value={`${stats.avgDuration}${t.seconds}`} />

      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-gray-600 text-[9px] uppercase tracking-wider mb-2">{t.difficulty} actuelle</p>
        <StatRow label="Parties" value={d.games} />
        <StatRow label={t.wins} value={d.wins} />
      </div>

      {globalStats && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-gray-600 text-[9px] uppercase tracking-wider mb-2">{t.globalRating}</p>
          <StatRow label={t.totalPlayedGlobal} value={globalStats.totalGames} />
          <StatRow label={t.playerWinRateGlobal} value={`${globalStats.playerWinRate}%`} />
        </div>
      )}
    </motion.div>
  );
};

// ─── SÉLECTEUR DE DIFFICULTÉ ET DE COACH ──────────────────────
const DifficultySelector = ({
  lang, current, onChange, disabled,
}: {
  lang: 'fr' | 'en'; current: Difficulty;
  onChange: (d: Difficulty) => void; disabled: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const t = T[lang];
  const opts: { key: Difficulty; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'easy', label: t.easy, icon: <Shield size={12} />, color: 'text-emerald-400' },
    { key: 'medium', label: t.medium, icon: <Star size={12} />, color: 'text-yellow-400' },
    { key: 'expert', label: t.expert, icon: <Zap size={12} />, color: 'text-red-400' },
  ];
  const cur = opts.find((o) => o.key === current)!;

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-[#D4AF37]/30'}
          border-white/10 bg-white/5 ${cur.color}`}
      >
        {cur.icon} {cur.label} — {AI_PERSONAS[current].name} <ChevronDown size={10} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-[#1a1005]/98 border border-[#3a2511] rounded-xl overflow-hidden z-30 w-52 shadow-xl"
          >
            {opts.map((opt) => (
              <button
                key={opt.key}
                onClick={() => { onChange(opt.key); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold transition-all hover:bg-white/5
                  ${current === opt.key ? 'bg-white/5' : ''} ${opt.color}`}
              >
                <span className="flex items-center gap-2">
                  {opt.icon} {opt.label}
                </span>
                <span className="text-[10px] font-normal text-gray-400">
                  {AI_PERSONAS[opt.key].name} ({AI_PERSONAS[opt.key].title[lang]})
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── PANNEAU RÈGLES ───────────────────────────────────────────
const RulesPanel = ({ lang, onClose }: { lang: 'fr' | 'en'; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    className="absolute top-full mt-2 right-0 w-80 bg-[#1a1005]/98 border border-[#3a2511] rounded-2xl p-4 z-50 shadow-2xl"
  >
    <div className="flex justify-between items-center mb-3">
      <span className="text-[#D4AF37] font-bold text-sm">{T[lang].howToPlay}</span>
      <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
    </div>
    <ul className="space-y-2.5">
      {[T[lang].rule1, T[lang].rule2, T[lang].rule3, T[lang].rule4].map((rule, i) => (
        <li key={i} className="text-xs text-gray-300 leading-relaxed">
          {rule}
        </li>
      ))}
    </ul>
  </motion.div>
);

// ─── COMPOSANT PRINCIPAL (REAL AWALE GAME) ────────────────────
export default function RealAwaleGame() {
  const { lang } = useLanguage();
  const t = T[lang];
  const sounds = useAwaleSounds(lang);
  const { config: gameConfig, ready: configReady } = useAwaleGameSettings();
  const { stats, globalStats, recordGame } = useAwaleStats();

  // Difficulté & Coach IA
  const [difficulty, setDifficulty] = useState<Difficulty>('expert');
  const aiDepth = useMemo(() => {
    if (difficulty === 'easy') return gameConfig.difficultyEasyDepth;
    if (difficulty === 'medium') return gameConfig.difficultyMediumDepth;
    return gameConfig.difficultyExpertDepth;
  }, [difficulty, gameConfig]);

  // État du jeu
  const WIN_THRESHOLD = gameConfig.winThreshold;

  const [board, setBoard] = useState<number[]>(Array(TOTAL_PITS).fill(4));
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [turn, setTurn] = useState<'PLAYER' | 'AI'>('PLAYER');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [winnerKey, setWinnerKey] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [capturedPits, setCapturedPits] = useState<number[]>([]);
  const [lastAiPit, setLastAiPit] = useState<number | null>(null);
  const [hintPit, setHintPit] = useState<number | null>(null);
  const [coachMsg, setCoachMsg] = useState<string | null>(null);
  const [undosLeft, setUndosLeft] = useState(1);
  const [movesCount, setMovesCount] = useState(0);

  // Historique pour undo
  const [history, setHistory] = useState<
    { board: number[]; playerScore: number; aiScore: number }[]
  >([]);

  // UI state & Feedback Reprise
  const [showRules, setShowRules] = useState(false);
  const [showSoundPanel, setShowSoundPanel] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showMovePreview, setShowMovePreview] = useState(true);
  const [showRestoredBadge, setShowRestoredBadge] = useState(false);

  // Chrono
  const gameStartTime = useRef<number>(Date.now());
  const capturedTimeout = useRef<NodeJS.Timeout | null>(null);
  const gameOverSoundPlayed = useRef(false);

  // ─── REPRISE AUTOMATIQUE DE PARTIE (AUTO-RESTORE) ───────────
  useEffect(() => {
    if (!configReady) return;
    try {
      const savedRaw = localStorage.getItem(LS_SAVED_GAME_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        // On ne charge la partie que si elle date de moins de 24h et n'est pas terminée
        const isFresh = Date.now() - (saved.timestamp || 0) < 24 * 60 * 60 * 1000;
        if (isFresh && !saved.gameOver && saved.movesCount > 0) {
          setBoard(saved.board);
          setPlayerScore(saved.playerScore);
          setAiScore(saved.aiScore);
          setTurn(saved.turn);
          setDifficulty(saved.difficulty || 'expert');
          setHistory(saved.history || []);
          setUndosLeft(saved.undosLeft ?? gameConfig.maxUndos);
          setMovesCount(saved.movesCount);
          setShowRestoredBadge(true);
          setTimeout(() => setShowRestoredBadge(false), 4000);
          return;
        }
      }
    } catch {}

    // Fallback par défaut si pas de sauvegarde
    setBoard(Array(TOTAL_PITS).fill(gameConfig.initialSeeds));
    setUndosLeft(gameConfig.maxUndos);
  }, [configReady, gameConfig.initialSeeds, gameConfig.maxUndos]);

  // ─── SAUVEGARDE AUTOMATIQUE EN TEMPS RÉEL (AUTO-SAVE) ───────
  useEffect(() => {
    if (!configReady || gameOver || movesCount === 0) return;
    try {
      localStorage.setItem(LS_SAVED_GAME_KEY, JSON.stringify({
        board,
        playerScore,
        aiScore,
        turn,
        difficulty,
        history,
        undosLeft,
        movesCount,
        timestamp: Date.now(),
      }));
    } catch {}
  }, [board, playerScore, aiScore, turn, difficulty, history, undosLeft, movesCount, gameOver, configReady]);

  // ─── VÉRIFICATION FIN DE PARTIE ─────────────────────────────
  const checkEndGame = useCallback((
    currentBoard: number[], pScore: number, aScore: number, forceEnd = false
  ): boolean => {
    const playerEmpty = currentBoard.slice(0, 6).every((s) => s === 0);
    const aiEmpty = currentBoard.slice(6, 12).every((s) => s === 0);

    if (playerEmpty || aiEmpty || forceEnd) {
      const remP = currentBoard.slice(0, 6).reduce((a, b) => a + b, 0);
      const remA = currentBoard.slice(6, 12).reduce((a, b) => a + b, 0);
      const finalP = pScore + remP;
      const finalA = aScore + remA;
      setPlayerScore(finalP);
      setAiScore(finalA);
      setGameOver(true);
      if (finalP > finalA) { setWinner(t.youWon); setWinnerKey('win'); }
      else if (finalA > finalP) { setWinner(t.aiWon); setWinnerKey('lose'); }
      else { setWinner(t.draw); setWinnerKey('draw'); }
      try { localStorage.removeItem(LS_SAVED_GAME_KEY); } catch {}
      return true;
    }

    if (pScore >= WIN_THRESHOLD) {
      setGameOver(true);
      setWinner(t.youWon);
      setWinnerKey('win');
      try { localStorage.removeItem(LS_SAVED_GAME_KEY); } catch {}
      return true;
    }
    if (aScore >= WIN_THRESHOLD) {
      setGameOver(true);
      setWinner(t.aiWon);
      setWinnerKey('lose');
      try { localStorage.removeItem(LS_SAVED_GAME_KEY); } catch {}
      return true;
    }
    return false;
  }, [t, WIN_THRESHOLD]);

  // ─── COUP JOUEUR ────────────────────────────────────────────
  const playPit = useCallback((index: number) => {
    if (gameOver || turn !== 'PLAYER' || index > 5 || board[index] === 0) return;
    if (!sounds.musicStarted) sounds.startBackgroundMusic();
    sounds.playClick();
    setHintPit(null);
    setCoachMsg(null);

    // Sauvegarder l'état avant le coup pour l'annulation (undo)
    setHistory((prev) => [...prev.slice(-10), { board: [...board], playerScore, aiScore }]);

    const { newBoard, capturedSeeds, lastIndex } = simulateMove(board, index, true);

    if (capturedSeeds > 0) {
      const caps: number[] = [];
      for (let i = lastIndex; i >= 6 && (board[i] === 2 || board[i] === 3); i--) caps.push(i);
      setCapturedPits(caps);
      if (capturedTimeout.current) clearTimeout(capturedTimeout.current);
      capturedTimeout.current = setTimeout(() => setCapturedPits([]), 800);
      sounds.playCapture();
    } else {
      sounds.playSeedSow();
    }

    setMovesCount((m) => m + 1);
    setBoard(newBoard);
    setPlayerScore((prev) => {
      const next = prev + capturedSeeds;
      if (!checkEndGame(newBoard, next, aiScore)) setTurn('AI');
      return next;
    });
  }, [board, turn, gameOver, aiScore, playerScore, checkEndGame, sounds]);

  // ─── UNDO (ANNULER) ─────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (!gameConfig.allowUndo || undosLeft <= 0 || history.length === 0) return;
    const last = history[history.length - 1];
    setBoard(last.board);
    setPlayerScore(last.playerScore);
    setAiScore(last.aiScore);
    setHistory((prev) => prev.slice(0, -1));
    setUndosLeft((u) => u - 1);
    setTurn('PLAYER');
    setHintPit(null);
    setCoachMsg(null);
  }, [history, undosLeft, gameConfig.allowUndo]);

  // ─── ASSISTANT COACH BUTACODE ───────────────────────────────
  const triggerCoachButacode = useCallback(() => {
    if (gameOver) return;
    if (turn !== 'PLAYER') {
      setCoachMsg(t.coachWait);
      return;
    }
    const best = getBestMove(board, aiScore, playerScore, 5, true);
    if (best !== -1) {
      setHintPit(best);
      setCoachMsg(t.coachAdvice(best + 1, board[best]));
    } else {
      setCoachMsg(t.coachNoMove);
    }
  }, [board, aiScore, playerScore, gameOver, turn, t]);

  // ─── TOUR DE L'IA ───────────────────────────────────────────
  useEffect(() => {
    if (turn !== 'AI' || gameOver) return;
    const timer = setTimeout(() => {
      const bestMove = getBestMove(board, aiScore, playerScore, aiDepth, false);
      if (bestMove === -1) { checkEndGame(board, playerScore, aiScore, true); return; }
      setLastAiPit(bestMove);
      setTimeout(() => setLastAiPit(null), 600);
      const { newBoard, capturedSeeds } = simulateMove(board, bestMove, false);
      if (capturedSeeds > 0) {
        setCapturedPits([bestMove]);
        if (capturedTimeout.current) clearTimeout(capturedTimeout.current);
        capturedTimeout.current = setTimeout(() => setCapturedPits([]), 800);
        sounds.playCapture();
      } else {
        sounds.playSeedSow();
      }
      setMovesCount((m) => m + 1);
      setBoard(newBoard);
      setAiScore((prev) => {
        const next = prev + capturedSeeds;
        if (!checkEndGame(newBoard, playerScore, next)) setTurn('PLAYER');
        return next;
      });
    }, 750 + Math.random() * 300);

    return () => clearTimeout(timer);
  }, [turn, gameOver, board, aiScore, playerScore, aiDepth, checkEndGame, sounds]);

  // ─── STATS & SONS DE FIN DE PARTIE ──────────────────────────
  useEffect(() => {
    if (gameOver && !gameOverSoundPlayed.current && winnerKey) {
      gameOverSoundPlayed.current = true;
      if (winnerKey === 'win') sounds.playWin();
      else if (winnerKey === 'lose') sounds.playLose();
      sounds.stopBackgroundMusic();
      const duration = Math.round((Date.now() - gameStartTime.current) / 1000);
      recordGame({
        result: winnerKey,
        playerScore,
        aiScore,
        movesCount,
        durationSeconds: duration,
        difficulty,
      });
    }
    if (!gameOver) gameOverSoundPlayed.current = false;
  }, [gameOver, winnerKey]);

  // ─── INIT MUSIQUE AU MONTAGE ────────────────────────────────
  useEffect(() => {
    if (sounds.ready) {
      sounds.startBackgroundMusic();
      sounds.playGameStart();
    }
  }, [sounds.ready]);

  // ─── ATTRIBUT HTML ──────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-awale-page', 'true');
    return () => {
      document.documentElement.setAttribute('data-awale-page', 'false');
      sounds.stopBackgroundMusic(true);
    };
  }, []);

  // ─── RESET (RECOMMENCER UNE NOUVELLE PARTIE) ────────────────
  const resetGame = useCallback(() => {
    try { localStorage.removeItem(LS_SAVED_GAME_KEY); } catch {}
    setBoard(Array(TOTAL_PITS).fill(gameConfig.initialSeeds));
    setPlayerScore(0);
    setAiScore(0);
    setTurn('PLAYER');
    setGameOver(false);
    setWinner(null);
    setWinnerKey(null);
    setCapturedPits([]);
    setLastAiPit(null);
    setHintPit(null);
    setCoachMsg(null);
    setHistory([]);
    setUndosLeft(gameConfig.maxUndos);
    setMovesCount(0);
    gameOverSoundPlayed.current = false;
    gameStartTime.current = Date.now();
    sounds.playGameStart();
    sounds.startBackgroundMusic();
  }, [sounds, gameConfig]);

  // ─── PREVIEW TROUS (SURVOL) ─────────────────────────────────
  const getPreviewForPit = useCallback((idx: number): number[] => {
    if (!showMovePreview) return [];
    if (idx > 5 || board[idx] === 0 || turn !== 'PLAYER') return [];
    let seeds = board[idx];
    let curr = idx;
    const lands: number[] = [];
    while (seeds > 0) {
      curr = (curr + 1) % TOTAL_PITS;
      if (curr === idx) continue;
      lands.push(curr);
      seeds--;
    }
    return [...new Set(lands)];
  }, [board, turn, showMovePreview]);

  const playerPct = (playerScore / 48) * 100;
  const aiPct = (aiScore / 48) * 100;

  const diffLabel: Record<Difficulty, string> = {
    easy: t.easy, medium: t.medium, expert: t.expert,
  };

  if (configReady && !gameConfig.gameEnabled) {
    return (
      <div className="min-h-screen bg-[#020111] flex items-center justify-center">
        <p className="text-white/50 text-center px-8">{t.gameDisabled}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020111] flex flex-col font-sans overflow-hidden relative">
      {/* Ambiance */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] bg-[#D4AF37]/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50vw] h-[30vw] bg-[#8B5A2B]/8 rounded-full blur-[100px] pointer-events-none" />

      {/* ─── HEADER ─────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/5 bg-[#020111]/80 backdrop-blur-xl">
        <Link
          href="/explore"
          className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] transition-colors text-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">{t.back}</span>
        </Link>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <CaurisIcon className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-serif text-[#D4AF37] uppercase tracking-widest">{t.title}</h1>
            <CaurisIcon className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <LukeniBadge lang={lang} />
        </div>

        {/* Contrôles droite */}
        <div className="flex items-center gap-1.5">
          {/* Stats */}
          <div className="relative">
            <button
              onClick={() => { setShowStats((v) => !v); setShowSoundPanel(false); setShowRules(false); }}
              className="p-2 text-gray-400 hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/30 rounded-full transition-all"
              aria-label={t.stats}
            >
              <BarChart2 size={14} />
            </button>
            <AnimatePresence>
              {showStats && (
                <StatsPanel lang={lang} stats={stats} globalStats={globalStats} difficulty={difficulty} />
              )}
            </AnimatePresence>
          </div>

          {/* Son */}
          <div className="relative">
            <button
              onClick={() => { setShowSoundPanel((v) => !v); setShowStats(false); setShowRules(false); }}
              className="p-2 text-gray-400 hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/30 rounded-full transition-all"
              aria-label={sounds.muted ? t.unmuteSound : t.muteSound}
            >
              {sounds.muted || sounds.userVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <AnimatePresence>
              {showSoundPanel && (
                <SoundPanel
                  lang={lang}
                  muted={sounds.muted}
                  volume={sounds.userVolume}
                  onToggleMute={sounds.toggleMute}
                  onVolumeChange={sounds.setVolume}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Règles (explique le Preview !) */}
          <div className="relative">
            <button
              onClick={() => { setShowRules((v) => !v); setShowSoundPanel(false); setShowStats(false); }}
              className="text-gray-400 hover:text-[#D4AF37] transition-colors text-[10px] border border-white/10 hover:border-[#D4AF37]/30 px-2.5 py-1.5 rounded-full hidden sm:flex items-center gap-1"
            >
              <Info size={12} /> {t.howToPlay}
            </button>
            <AnimatePresence>
              {showRules && <RulesPanel lang={lang} onClose={() => setShowRules(false)} />}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ─── BODY ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-6 gap-5 relative z-10">

        {/* NOTIFICATION FLOTTANTE : PARTIE RESTAURÉE */}
        <AnimatePresence>
          {showRestoredBadge && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-3.5 py-1.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-full flex items-center gap-2 shadow-lg"
            >
              <CheckCircle2 size={13} className="text-[#D4AF37]" />
              <span className="text-xs font-bold text-[#D4AF37]">{t.gameRestored}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scores + Sélecteur de Difficulté et Coach */}
        <div className="w-full max-w-2xl flex items-center justify-between gap-3">
          <ScoreCard
            label={t.you}
            score={playerScore}
            isActive={turn === 'PLAYER' && !gameOver}
            isPlayer={true}
          />

          <div className="flex-1 text-center space-y-1.5">
            <DifficultySelector
              lang={lang} current={difficulty}
              onChange={(d) => { setDifficulty(d); }}
              disabled={turn === 'AI' || (!gameOver && movesCount > 0)}
            />
            <AnimatePresence mode="wait">
              <motion.p
                key={turn + String(gameOver)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={`text-sm font-medium ${
                  turn === 'AI' && !gameOver ? 'text-red-400' :
                  turn === 'PLAYER' && !gameOver ? 'text-[#D4AF37]' : 'text-white/40'
                }`}
              >
                {gameOver ? t.score : turn === 'PLAYER' ? t.yourTurn : t.aiThinking}
              </motion.p>
            </AnimatePresence>

            {turn === 'AI' && !gameOver && (
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-red-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Carte score adverse arborant le nom de l'IA Coach */}
          <ScoreCard
            label={AI_PERSONAS[difficulty].name}
            subtitle={AI_PERSONAS[difficulty].title[lang]}
            score={aiScore}
            isActive={turn === 'AI' && !gameOver}
            isPlayer={false}
          />
        </div>

        {/* Barre de progression */}
        <div className="w-full max-w-2xl">
          <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
            <motion.div className="bg-[#D4AF37] h-full" animate={{ width: `${Math.min(playerPct, 100)}%` }} transition={{ duration: 0.5 }} />
            <motion.div className="bg-red-500 h-full ml-auto" animate={{ width: `${Math.min(aiPct, 100)}%` }} transition={{ duration: 0.5 }} />
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-white/20">
            <span>{t.you} — {playerScore}/{WIN_THRESHOLD * 2 - 2}</span>
            <span className="text-white/10">objectif : {WIN_THRESHOLD}</span>
            <span>{AI_PERSONAS[difficulty].name} — {aiScore}/{WIN_THRESHOLD * 2 - 2}</span>
          </div>
        </div>

        {/* ─── BULLE DU COACH BUTACODE ───────────────────────── */}
        <AnimatePresence>
          {coachMsg && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="w-full max-w-2xl bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-3.5 flex items-start gap-3 shadow-xl backdrop-blur-md"
            >
              <div className="p-2 bg-emerald-500/20 rounded-xl shrink-0">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-emerald-300 text-xs font-bold flex items-center gap-1.5 mb-0.5">
                  <Sparkles size={13} /> {t.coachTitle}
                </p>
                <p className="text-white/90 text-xs leading-relaxed">{coachMsg}</p>
              </div>
              <button
                onClick={() => { setCoachMsg(null); setHintPit(null); }}
                className="text-emerald-400/60 hover:text-emerald-300 p-1"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── PLATEAU DE JEU ──────────────────────────────── */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-2xl"
        >
          <div
            className="bg-[#1a1005] p-5 md:p-8 rounded-[36px] border-4 border-[#3a2511] relative"
            style={{ boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.8), 0 20px 60px rgba(0,0,0,0.6)' }}
          >
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
            <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent" />

            {/* Label IA */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Cpu size={12} className="text-red-400/60" />
              <span className="text-red-400/60 text-[9px] uppercase tracking-widest">
                {AI_PERSONAS[difficulty].name} — {t.aiSide}
              </span>
            </div>

            {/* Rangée IA */}
            <div className="grid grid-cols-6 gap-2 md:gap-3 mb-3">
              {[11, 10, 9, 8, 7, 6].map((i) => (
                <Pit
                  key={i} index={i} count={board[i]}
                  isOpponent={true} disabled={true}
                  highlight={lastAiPit === i}
                  justCaptured={capturedPits.includes(i)}
                />
              ))}
            </div>

            {/* Séparateur */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-black/60" />
              <CaurisIcon className="w-4 h-4 text-[#D4AF37]/20" />
              <div className="flex-1 h-px bg-black/60" />
            </div>

            {/* Rangée Joueur */}
            <div className="grid grid-cols-6 gap-2 md:gap-3 mt-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Pit
                  key={i} index={i} count={board[i]}
                  isOpponent={false}
                  onClick={() => playPit(i)}
                  disabled={turn !== 'PLAYER' || board[i] === 0 || gameOver}
                  highlight={turn === 'PLAYER' && board[i] > 0 && !gameOver}
                  justCaptured={capturedPits.includes(i)}
                  isHintPit={hintPit === i}
                  previewSeeds={getPreviewForPit(i)}
                />
              ))}
            </div>

            {/* Label Joueur */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <User size={12} className="text-[#D4AF37]/60" />
              <span className="text-[#D4AF37]/60 text-[9px] uppercase tracking-widest">{t.yourSide}</span>
            </div>

            {/* Numéros */}
            <div className="grid grid-cols-6 gap-2 md:gap-3 mt-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="text-center text-[8px] text-white/10">{i + 1}</div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ─── BARRE D'ACTIONS (BUTACODE + UNDO + PREVIEW + RESTART) ─ */}
        {!gameOver && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {/* BOUTON COACH BUTACODE (TOUJOURS VISIBLE ET CLICABLE) */}
            <button
              onClick={triggerCoachButacode}
              disabled={gameOver}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 font-bold transition-all text-xs shadow-sm"
            >
              <Bot size={14} />
              {t.hintButton}
            </button>

            {/* Undo */}
            {gameConfig.allowUndo && (
              <button
                onClick={handleUndo}
                disabled={undosLeft <= 0 || history.length === 0 || turn === 'AI'}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 hover:border-white/15 text-white/50 hover:text-white transition-all text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RotateCcw size={13} />
                {t.undo}
                <span className="text-[9px] opacity-50">({undosLeft} {t.undoLeft})</span>
              </button>
            )}

            {/* Recommencer */}
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/8 hover:border-white/15 text-white/50 hover:text-white transition-all text-xs"
            >
              <RefreshCw size={13} />
              {t.restart}
            </button>

            {/* Toggle Preview (expliqué dans le panneau règles !) */}
            <button
              onClick={() => setShowMovePreview((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-[10px] font-bold transition-all ${
                showMovePreview
                  ? 'border-[#D4AF37]/30 text-[#D4AF37] bg-[#D4AF37]/5'
                  : 'border-white/10 text-white/30 bg-white/[0.02]'
              }`}
            >
              <Zap size={11} />
              Preview
            </button>
          </div>
        )}
      </main>

      {/* ─── ÉCRAN FIN DE PARTIE ─────────────────────────────── */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-[#1a1005] border-2 border-[#3a2511] rounded-3xl p-8 md:p-12 text-center shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent_70%)]" />
              <div className="relative z-10">
                <motion.div animate={{ rotate: [0, -5, 5, -5, 0] }} transition={{ duration: 0.5, delay: 0.3 }}>
                  <Trophy className="mx-auto text-[#D4AF37] mb-4" size={56} />
                </motion.div>
                <LukeniBadge lang={lang} />
                <h2 className="text-2xl font-serif text-white mt-4 mb-2">{winner}</h2>

                {/* Stats du match avec Coach adverse */}
                <div className="flex justify-center gap-6 my-5">
                  <div className="text-center">
                    <p className="text-[#D4AF37] text-2xl font-bold">{playerScore}</p>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">{t.you}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-red-500 text-2xl font-bold">{aiScore}</p>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">{AI_PERSONAS[difficulty].name}</p>
                  </div>
                </div>

                <div className="flex justify-center gap-4 mb-5 text-[10px] text-white/30">
                  <span>🎯 {movesCount} coups</span>
                  <span>🏋 {diffLabel[difficulty]}</span>
                  <span>
                    ⏱ {Math.round((Date.now() - gameStartTime.current) / 1000)}{t.seconds}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={resetGame}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[#D4AF37] hover:bg-white text-black font-bold transition-colors"
                  >
                    <RefreshCw size={16} /> {t.playAgain}
                  </button>
                  <Link
                    href="/explore"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors text-sm"
                  >
                    <ArrowLeft size={14} /> {t.back}
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}