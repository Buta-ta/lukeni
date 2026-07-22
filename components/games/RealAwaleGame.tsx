"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Trophy, ArrowLeft, Cpu, User } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/contexts/LanguageContext';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const TOTAL_PITS = 12;
const INITIAL_SEEDS = 4;

// ─── TRADUCTIONS ──────────────────────────────────────────────────────────────
const T = {
  fr: {
    back: 'Retour',
    title: 'Awalé',
    subtitle: 'Jeu de stratégie africain',
    yourTurn: 'À vous de jouer',
    aiThinking: "L'IA réfléchit…",
    you: 'Vous',
    ai: 'IA Experte',
    restart: 'Recommencer',
    seeds: 'graines',
    captured: 'capturées',
    yourSide: 'Votre côté',
    aiSide: "Côté IA",
    youWon: 'Vous avez gagné ! 🎉',
    aiWon: "L'IA a gagné ! 🤖",
    draw: 'Match Nul ! 🤝',
    playAgain: 'Rejouer',
    badge: 'Lukeni',
    howToPlay: 'Comment jouer ?',
    rule1: 'Cliquez sur un de vos trous (bas) pour semer les graines.',
    rule2: 'Capturez si la dernière graine tombe sur un trou adverse à 2 ou 3.',
    rule3: 'Le joueur qui capture 25 graines ou plus gagne.',
    clickToPlay: 'Cliquez sur un trou pour jouer',
    score: 'Score',
    difficultyLabel: 'Difficulté : Expert',
  },
  en: {
    back: 'Back',
    title: 'Awalé',
    subtitle: 'African strategy game',
    yourTurn: 'Your turn',
    aiThinking: 'AI is thinking…',
    you: 'You',
    ai: 'Expert AI',
    restart: 'Restart',
    seeds: 'seeds',
    captured: 'captured',
    yourSide: 'Your side',
    aiSide: 'AI side',
    youWon: 'You won! 🎉',
    aiWon: 'AI won! 🤖',
    draw: 'Draw! 🤝',
    playAgain: 'Play again',
    badge: 'Lukeni',
    howToPlay: 'How to play?',
    rule1: 'Click one of your pits (bottom) to sow seeds.',
    rule2: 'Capture if the last seed lands on an opponent pit with 2 or 3.',
    rule3: 'The player who captures 25+ seeds wins.',
    clickToPlay: 'Click a pit to play',
    score: 'Score',
    difficultyLabel: 'Difficulty: Expert',
  },
};

// ─── LOGIQUE JEU ──────────────────────────────────────────────────────────────
const simulateMove = (board: number[], pitIndex: number, isPlayer: boolean) => {
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
  let checkIdx = curr;
  const isOpponentSide = (idx: number) =>
    isPlayer ? idx >= 6 && idx <= 11 : idx >= 0 && idx <= 5;

  if (isOpponentSide(checkIdx)) {
    const oppStart = isPlayer ? 6 : 0;
    const oppEnd = isPlayer ? 11 : 5;
    let totalOpponentSeeds = 0;
    for (let i = oppStart; i <= oppEnd; i++) totalOpponentSeeds += newBoard[i];

    let tempBoard = [...newBoard];
    let tempCaptured = 0;
    let tempIdx = checkIdx;

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

// ─── MINIMAX EXPERT (profondeur 7) ────────────────────────────────────────────
const evaluateBoard = (board: number[], aiScore: number, playerScore: number): number => {
  const aiSeeds = board.slice(6, 12).reduce((a, b) => a + b, 0);
  const playerSeeds = board.slice(0, 6).reduce((a, b) => a + b, 0);
  return (aiScore - playerScore) * 100 + (aiSeeds - playerSeeds) * 2;
};

const minimax = (
  board: number[],
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  aiScore: number,
  playerScore: number
): number => {
  const playerEmpty = board.slice(0, 6).every(s => s === 0);
  const aiEmpty = board.slice(6, 12).every(s => s === 0);

  if (depth === 0 || playerEmpty || aiEmpty) {
    return evaluateBoard(board, aiScore, playerScore);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 6; i <= 11; i++) {
      if (board[i] === 0) continue;
      const { newBoard, capturedSeeds } = simulateMove(board, i, false);
      const val = minimax(
        newBoard, depth - 1, false, alpha, beta,
        aiScore + capturedSeeds, playerScore
      );
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
      const val = minimax(
        newBoard, depth - 1, true, alpha, beta,
        aiScore, playerScore + capturedSeeds
      );
      minEval = Math.min(minEval, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return minEval === Infinity ? evaluateBoard(board, aiScore, playerScore) : minEval;
  }
};

const getBestAIMove = (board: number[], aiScore: number, playerScore: number): number => {
  let bestMove = -1;
  let bestScore = -Infinity;

  for (let i = 6; i <= 11; i++) {
    if (board[i] === 0) continue;
    const { newBoard, capturedSeeds } = simulateMove(board, i, false);
    const score = minimax(newBoard, 6, false, -Infinity, Infinity, aiScore + capturedSeeds, playerScore);
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
};

// ─── ICÔNE CAURIS ─────────────────────────────────────────────────────────────
const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5Z
             M50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
  </svg>
);

// ─── COMPOSANT GRAINE (RONDE / CAURIS) ───────────────────────────────────────
const Seed = ({ index }: { index: number }) => {
  const angle = (index * 137.5) % 360;
  const radius = index === 0 ? 0 : Math.min(28, 8 + index * 2.5);
  const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
  const y = 50 + radius * Math.sin((angle * Math.PI) / 180);

  return (
    <div
      className="absolute w-2.5 h-3.5 md:w-3 md:h-4 bg-[#e8dcc4] shadow-sm"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) rotate(${angle + 30}deg)`,
        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
      }}
    />
  );
};

// ─── COMPOSANT TROU ───────────────────────────────────────────────────────────
const Pit = ({
  count,
  onClick,
  disabled,
  isOpponent,
  highlight,
  justCaptured,
  index,
}: {
  count: number;
  onClick?: () => void;
  disabled: boolean;
  isOpponent: boolean;
  highlight?: boolean;
  justCaptured?: boolean;
  index: number;
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      className={`
        relative aspect-square rounded-full flex items-center justify-center
        border-2 transition-all duration-300 cursor-default
        ${highlight
          ? 'border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer'
          : isOpponent
            ? 'border-[#1a0f08]'
            : 'border-[#3a2010]'
        }
        ${justCaptured ? 'bg-[#D4AF37]/20' : 'bg-[#0a0502]'}
        ${!disabled && !isOpponent ? 'cursor-pointer' : ''}
      `}
      style={{
        boxShadow: justCaptured
          ? 'inset 0 8px 20px rgba(0,0,0,0.8), 0 0 15px rgba(212,175,55,0.3)'
          : 'inset 0 8px 20px rgba(0,0,0,0.9)',
      }}
    >
      {/* Graines rondes (cauris) */}
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

      {/* Compteur */}
      <span
        className={`
          absolute font-mono text-xs font-bold
          ${isOpponent ? '-top-6 text-red-400/80' : '-bottom-6 text-[#D4AF37]/80'}
        `}
      >
        {count}
      </span>
    </motion.button>
  );
};

// ─── BADGE LUKENI ─────────────────────────────────────────────────────────────
const LukeniBadge = ({ lang }: { lang: 'fr' | 'en' }) => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full">
    <CaurisIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
    <span className="text-[#D4AF37] text-[9px] font-black uppercase tracking-widest">
      {T[lang].badge}
    </span>
  </div>
);

// ─── RÈGLES ───────────────────────────────────────────────────────────────────
const RulesPanel = ({ lang, onClose }: { lang: 'fr' | 'en'; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    className="absolute top-full mt-2 right-0 w-72 bg-[#1a1005]/98 border border-[#3a2511] rounded-2xl p-4 z-50 shadow-2xl"
  >
    <div className="flex justify-between items-center mb-3">
      <span className="text-[#D4AF37] font-bold text-sm">{T[lang].howToPlay}</span>
      <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
    </div>
    <ul className="space-y-2">
      {[T[lang].rule1, T[lang].rule2, T[lang].rule3].map((rule, i) => (
        <li key={i} className="flex gap-2 text-xs text-gray-300 leading-relaxed">
          <span className="text-[#D4AF37] font-bold shrink-0">{i + 1}.</span>
          {rule}
        </li>
      ))}
    </ul>
  </motion.div>
);

// ─── SCORE CARD ───────────────────────────────────────────────────────────────
const ScoreCard = ({
  label,
  score,
  isActive,
  isPlayer,
}: {
  label: string;
  score: number;
  isActive: boolean;
  isPlayer: boolean;
}) => (
  <motion.div
    animate={isActive ? { scale: 1.02 } : { scale: 1 }}
    className={`
      flex flex-col items-center px-5 py-3 rounded-2xl border-2 transition-all duration-500 min-w-[100px]
      ${isActive
        ? isPlayer
          ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
          : 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
        : 'border-white/8 bg-white/[0.02]'
      }
    `}
  >
    <span className="text-white/60 text-[9px] uppercase tracking-widest font-bold mb-1">{label}</span>
    <motion.span
      key={score}
      initial={{ scale: 1.3, color: '#D4AF37' }}
      animate={{ scale: 1, color: isPlayer ? '#D4AF37' : '#ef4444' }}
      className={`text-3xl font-serif font-bold ${isPlayer ? 'text-[#D4AF37]' : 'text-red-500'}`}
    >
      {score}
    </motion.span>
    <div className={`w-full h-0.5 mt-2 rounded-full transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: isPlayer ? '#D4AF37' : '#ef4444' }}
    />
  </motion.div>
);

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────
export default function RealAwaleGame() {
  const { lang } = useLanguage();
  const t = T[lang];

  const [board, setBoard] = useState<number[]>(Array(TOTAL_PITS).fill(INITIAL_SEEDS));
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [turn, setTurn] = useState<'PLAYER' | 'AI'>('PLAYER');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [capturedPits, setCapturedPits] = useState<number[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [lastAiPit, setLastAiPit] = useState<number | null>(null);
  const capturedTimeout = useRef<NodeJS.Timeout | null>(null);

  // ─── FIN DE PARTIE ────────────────────────────────────────────────────────
  const checkEndGame = useCallback((
    currentBoard: number[],
    pScore: number,
    aScore: number,
    forceEnd = false
  ): boolean => {
    const playerEmpty = currentBoard.slice(0, 6).every(s => s === 0);
    const aiEmpty = currentBoard.slice(6, 12).every(s => s === 0);

    if (playerEmpty || aiEmpty || forceEnd) {
      const remainP = currentBoard.slice(0, 6).reduce((a, b) => a + b, 0);
      const remainA = currentBoard.slice(6, 12).reduce((a, b) => a + b, 0);
      const finalP = pScore + remainP;
      const finalA = aScore + remainA;

      setPlayerScore(finalP);
      setAiScore(finalA);
      setGameOver(true);

      if (finalP > finalA) setWinner(t.youWon);
      else if (finalA > finalP) setWinner(t.aiWon);
      else setWinner(t.draw);
      return true;
    }

    if (pScore >= 25) {
      setGameOver(true);
      setWinner(t.youWon);
      return true;
    }
    if (aScore >= 25) {
      setGameOver(true);
      setWinner(t.aiWon);
      return true;
    }

    return false;
  }, [t]);

  // ─── COUP JOUEUR ─────────────────────────────────────────────────────────
  const playPit = useCallback((index: number) => {
    if (gameOver || turn !== 'PLAYER' || index > 5 || board[index] === 0) return;

    const { newBoard, capturedSeeds, lastIndex } = simulateMove(board, index, true);

    if (capturedSeeds > 0) {
      const caps: number[] = [];
      for (let i = lastIndex; i >= 6 && (board[i] === 2 || board[i] === 3); i--) caps.push(i);
      setCapturedPits(caps);
      if (capturedTimeout.current) clearTimeout(capturedTimeout.current);
      capturedTimeout.current = setTimeout(() => setCapturedPits([]), 800);
    }

    setBoard(newBoard);
    setPlayerScore(prev => {
      const next = prev + capturedSeeds;
      if (!checkEndGame(newBoard, next, aiScore)) {
        setTurn('AI');
      }
      return next;
    });
  }, [board, turn, gameOver, aiScore, checkEndGame]);

  // ─── IA EXPERTE (MINIMAX) ────────────────────────────────────────────────
  useEffect(() => {
    if (turn !== 'AI' || gameOver) return;

    const timer = setTimeout(() => {
      const bestMove = getBestAIMove(board, aiScore, playerScore);

      if (bestMove === -1) {
        checkEndGame(board, playerScore, aiScore, true);
        return;
      }

      setLastAiPit(bestMove);
      setTimeout(() => setLastAiPit(null), 600);

      const { newBoard, capturedSeeds } = simulateMove(board, bestMove, false);

      if (capturedSeeds > 0) {
        setCapturedPits([bestMove]);
        if (capturedTimeout.current) clearTimeout(capturedTimeout.current);
        capturedTimeout.current = setTimeout(() => setCapturedPits([]), 800);
      }

      setBoard(newBoard);
      setAiScore(prev => {
        const next = prev + capturedSeeds;
        if (!checkEndGame(newBoard, playerScore, next)) {
          setTurn('PLAYER');
        }
        return next;
      });
    }, 900);

    return () => clearTimeout(timer);
  }, [turn, gameOver]);

  // ─── RESET ────────────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    setBoard(Array(TOTAL_PITS).fill(INITIAL_SEEDS));
    setPlayerScore(0);
    setAiScore(0);
    setTurn('PLAYER');
    setGameOver(false);
    setWinner(null);
    setCapturedPits([]);
    setLastAiPit(null);
  }, []);

  // ─── BARRE DE PROGRESSION ────────────────────────────────────────────────
  const totalCaptured = playerScore + aiScore;
  const playerPct = totalCaptured > 0 ? (playerScore / 48) * 100 : 50;
  const aiPct = totalCaptured > 0 ? (aiScore / 48) * 100 : 50;

  return (
    <div className="min-h-screen bg-[#020111] flex flex-col font-sans overflow-hidden relative">

      {/* Glow ambiance */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-[70vw] h-[70vw] bg-[#D4AF37]/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2
        w-[50vw] h-[30vw] bg-[#8B5A2B]/8 rounded-full blur-[100px] pointer-events-none" />

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-4 md:px-8 py-4
        border-b border-white/5 bg-[#020111]/80 backdrop-blur-xl">

        {/* Retour */}
        <Link
          href="/explore"
          className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37]
            transition-colors text-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>{t.back}</span>
        </Link>

        {/* Titre + Badge */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <CaurisIcon className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-serif text-[#D4AF37] uppercase tracking-widest">
              {t.title}
            </h1>
            <CaurisIcon className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <LukeniBadge lang={lang} />
        </div>

        {/* Bouton Règles */}
        <div className="relative">
          <button
            onClick={() => setShowRules(v => !v)}
            className="text-gray-400 hover:text-[#D4AF37] transition-colors text-xs
              border border-white/10 hover:border-[#D4AF37]/30 px-3 py-1.5 rounded-full"
          >
            {t.howToPlay}
          </button>
          <AnimatePresence>
            {showRules && (
              <RulesPanel lang={lang} onClose={() => setShowRules(false)} />
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ─── BODY ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-8 gap-6 relative z-10">

        {/* ─── SCORES ───────────────────────────────────────────────────── */}
        <div className="w-full max-w-2xl flex items-center justify-between gap-4">
          <ScoreCard
            label={t.you}
            score={playerScore}
            isActive={turn === 'PLAYER' && !gameOver}
            isPlayer={true}
          />

          {/* Centre : statut + difficulté */}
          <div className="flex-1 text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
              {t.difficultyLabel}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={turn + String(gameOver)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={`text-sm font-medium ${
                  turn === 'AI' && !gameOver
                    ? 'text-red-400'
                    : turn === 'PLAYER' && !gameOver
                      ? 'text-[#D4AF37]'
                      : 'text-white/40'
                }`}
              >
                {gameOver
                  ? t.score
                  : turn === 'PLAYER'
                    ? t.yourTurn
                    : t.aiThinking}
              </motion.p>
            </AnimatePresence>

            {/* IA thinking loader */}
            {turn === 'AI' && !gameOver && (
              <div className="flex justify-center gap-1 mt-2">
                {[0, 1, 2].map(i => (
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

          <ScoreCard
            label={t.ai}
            score={aiScore}
            isActive={turn === 'AI' && !gameOver}
            isPlayer={false}
          />
        </div>

        {/* ─── BARRE DE PROGRESSION ─────────────────────────────────────── */}
        <div className="w-full max-w-2xl">
          <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
            <motion.div
              className="bg-[#D4AF37] h-full"
              animate={{ width: `${Math.min(playerPct, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className="bg-red-500 h-full ml-auto"
              animate={{ width: `${Math.min(aiPct, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-white/20">
            <span>{t.you} — {playerScore}/48</span>
            <span>{t.ai} — {aiScore}/48</span>
          </div>
        </div>

        {/* ─── PLATEAU ──────────────────────────────────────────────────── */}
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
            {/* Reflets bois */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r
              from-transparent via-[#D4AF37]/20 to-transparent" />
            <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r
              from-transparent via-[#D4AF37]/10 to-transparent" />

            {/* Label IA */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Cpu size={12} className="text-red-400/60" />
              <span className="text-red-400/60 text-[9px] uppercase tracking-widest">{t.aiSide}</span>
            </div>

            {/* Rangée IA */}
            <div className="grid grid-cols-6 gap-2 md:gap-3 mb-3">
              {[11, 10, 9, 8, 7, 6].map((i) => (
                <Pit
                  key={i}
                  index={i}
                  count={board[i]}
                  isOpponent={true}
                  disabled={true}
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
                  key={i}
                  index={i}
                  count={board[i]}
                  isOpponent={false}
                  onClick={() => playPit(i)}
                  disabled={turn !== 'PLAYER' || board[i] === 0 || gameOver}
                  highlight={turn === 'PLAYER' && board[i] > 0 && !gameOver}
                  justCaptured={capturedPits.includes(i)}
                />
              ))}
            </div>

            {/* Label Joueur */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <User size={12} className="text-[#D4AF37]/60" />
              <span className="text-[#D4AF37]/60 text-[9px] uppercase tracking-widest">{t.yourSide}</span>
            </div>

            {/* Numéros des trous */}
            <div className="grid grid-cols-6 gap-2 md:gap-3 mt-2">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="text-center text-[8px] text-white/10">{i + 1}</div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ─── BOUTON RESET ─────────────────────────────────────────────── */}
        {!gameOver && (
          <button
            onClick={resetGame}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full
              bg-white/[0.03] hover:bg-white/[0.07] border border-white/8
              hover:border-white/15 text-white/50 hover:text-white
              transition-all text-sm"
          >
            <RefreshCw size={14} />
            {t.restart}
          </button>
        )}
      </main>

      {/* ─── ÉCRAN FIN DE PARTIE ─────────────────────────────────────────── */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center
              bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-[#1a1005] border-2 border-[#3a2511] rounded-3xl p-8 md:p-12
                text-center shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden"
            >
              {/* Glow derrière */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent_70%)]" />

              <div className="relative z-10">
                <motion.div
                  animate={{ rotate: [0, -5, 5, -5, 0] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Trophy className="mx-auto text-[#D4AF37] mb-4" size={56} />
                </motion.div>

                <LukeniBadge lang={lang} />

                <h2 className="text-3xl font-serif text-white mt-4 mb-2">{winner}</h2>

                <div className="flex justify-center gap-8 my-6">
                  <div className="text-center">
                    <p className="text-[#D4AF37] text-2xl font-bold">{playerScore}</p>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">{t.you}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-red-500 text-2xl font-bold">{aiScore}</p>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">{t.ai}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={resetGame}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-full
                      bg-[#D4AF37] hover:bg-white text-black font-bold transition-colors"
                  >
                    <RefreshCw size={16} />
                    {t.playAgain}
                  </button>
                  <Link
                    href="/explore"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-full
                      bg-white/5 hover:bg-white/10 border border-white/10
                      text-white/60 hover:text-white transition-colors text-sm"
                  >
                    <ArrowLeft size={14} />
                    {t.back}
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