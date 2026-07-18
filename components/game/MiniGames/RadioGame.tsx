"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X, Send, Power } from "lucide-react";

interface Props {
  miniGame: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
}

export default function RadioGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isOn, setIsOn] = useState(false);
  const [frequency, setFrequency] = useState(88.0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = miniGame.config || {};
  // Fallback bilingue : si EN n'existe pas, on prend FR
  const audioUrl = lang === "fr" ? config.audio_url_fr : (config.audio_url_en || config.audio_url_fr);
  const targetFrequency = config.target_frequency || 104.2;
  const expectedAnswer = lang === "fr" ? config.expected_answer_fr : config.expected_answer_en;
  const tolerance = 0.5; // Marge d'erreur de fréquence pour entendre la voix

  // ── INITIALISATION AUDIO WEB API (Bruit Blanc + Mixage) ──
  useEffect(() => {
    if (!audioUrl) {
      setIsLoading(false);
      return;
    }
    setIsLoading(false);

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [audioUrl]);

  const initAudio = () => {
    if (audioCtxRef.current) return;
    
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;

    // Création du Bruit Blanc
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 1;
    noiseSource.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start();

    // Configuration de la Voix
    const voiceElement = audioRef.current;
    if (voiceElement) {
      const voiceSource = ctx.createMediaElementSource(voiceElement);
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 0; // Muet au départ
      voiceSource.connect(voiceGain);
      voiceGain.connect(ctx.destination);
      voiceGainRef.current = voiceGain;
      voiceElement.play();
      voiceElement.loop = true;
    }

    noiseNodeRef.current = noiseSource;
    noiseGainRef.current = noiseGain;
  };

  const handleTogglePower = () => {
    if (!isOn) {
      initAudio();
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume();
      }
      setIsOn(true);
      updateMix(frequency);
    } else {
      if (audioCtxRef.current) audioCtxRef.current.suspend();
      if (audioRef.current) audioRef.current.pause();
      setIsOn(false);
    }
  };

  // ── MIXAGE DYNAMIQUE SELON LA FRÉQUENCE ──
  const updateMix = (freq: number) => {
    setFrequency(freq);
    if (!isOn || !voiceGainRef.current || !noiseGainRef.current || !audioCtxRef.current) return;

    const distance = Math.abs(freq - targetFrequency);
    const now = audioCtxRef.current.currentTime;
    
    // CORRECTION TypeScript : setTargetAtTime prend 3 arguments (cible, heure de début, constante de temps)
    if (distance <= tolerance) {
      const signalStrength = 1 - (distance / tolerance); // 0 à 1
      voiceGainRef.current.gain.setTargetAtTime(signalStrength, now, 0.1);
      noiseGainRef.current.gain.setTargetAtTime(1 - signalStrength, now, 0.1);
    } else {
      voiceGainRef.current.gain.setTargetAtTime(0, now, 0.1);
      noiseGainRef.current.gain.setTargetAtTime(1, now, 0.1);
    }
  };

  const normalizeAnswer = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const handleSubmit = async () => {
    if (!userAnswer.trim()) return;
    setIsSubmitting(true);
    
    const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(expectedAnswer || "");

    setTimeout(() => {
      if (isCorrect) {
        setFeedback(lang === "fr" ? "✅ Interception réussie" : "✅ Interception successful");
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 15), 1500);
      } else {
        setFeedback(lang === "fr" ? "❌ Code incorrect" : "❌ Incorrect code");
        const penalty = miniGame.penalty_per_error || 1;
        if (budgetCauris - penalty <= 0) onFail(penalty);
      }
      setIsSubmitting(false);
    }, 800);
  };

  // Visuel Oscilloscope (Signal clair si proche de la cible, bruité sinon)
  const distance = Math.abs(frequency - targetFrequency);
  const signalQuality = Math.max(0, 100 - (distance / tolerance) * 100);

  return (
    <div className="space-y-6">
      <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" />

      {/* Interface Radio */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-xl border-4 border-gray-700 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2.5px)', backgroundSize: '8px 8px' }} />

        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-gray-400 font-mono text-xs tracking-widest uppercase">
              {lang === "fr" ? "Récepteur Ondes Courtes" : "Shortwave Receiver"}
            </h3>
            <button
              onClick={handleTogglePower}
              className={`p-3 rounded-full transition-all shadow-inner ${isOn ? 'bg-red-500 text-white shadow-red-500/50' : 'bg-gray-700 text-gray-900'}`}
            >
              <Power size={20} />
            </button>
          </div>

          {/* Écran Oscilloscope */}
          <div className="bg-[#0a190a] border-2 border-gray-600 rounded-lg p-4 h-32 relative overflow-hidden shadow-inner">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:10px_10px]" />
            
            {isOn ? (
              <div className="absolute inset-0 flex items-center justify-center opacity-80">
                <svg className="w-full h-full" preserveAspectRatio="none">
                  <motion.path
                    d={`M 0 50 Q 25 ${50 + (100 - signalQuality)} 50 50 T 100 50`}
                    stroke="#00ff00"
                    strokeWidth="2"
                    fill="none"
                    animate={{ d: [`M 0 50 Q 25 ${50 + (100 - signalQuality)} 50 50 T 100 50 T 200 50 T 300 50`, `M -100 50 Q -75 ${50 + (100 - signalQuality)} -50 50 T 0 50 T 100 50 T 200 50`] }}
                    transition={{ repeat: Infinity, duration: signalQuality > 50 ? 0.5 : 0.1, ease: "linear" }}
                  />
                </svg>
                <div className="absolute top-2 right-2 text-[#00ff00] font-mono text-xs">
                  {frequency.toFixed(1)} MHz
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-800 font-mono text-xl">
                OFF
              </div>
            )}
          </div>

          {/* Molette de Fréquence */}
          <div className="space-y-2">
            <label className="text-gray-400 font-mono text-[10px] uppercase block text-center">
              {lang === "fr" ? "Tuning (Fréquence)" : "Tuning (Frequency)"}
            </label>
            <input
              type="range"
              min="88"
              max="108"
              step="0.1"
              value={frequency}
              onChange={(e) => updateMix(parseFloat(e.target.value))}
              disabled={!isOn}
              className="w-full h-4 bg-gray-900 rounded-lg appearance-none cursor-pointer border border-gray-700 accent-white disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>88.0</span>
              <span>98.0</span>
              <span>108.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Réponse */}
      <div className="space-y-3">
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder={lang === "fr" ? "Entrez le message décrypté..." : "Enter decrypted message..."}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-[#D4AF37] font-mono uppercase text-center tracking-widest"
        />
        {feedback && (
          <div className="text-center font-mono text-sm text-[#D4AF37]">{feedback}</div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-3 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30 flex justify-center items-center gap-2">
          <X size={16} /> {lang === "fr" ? "Quitter" : "Abort"}
        </button>
        <button onClick={handleSubmit} disabled={!userAnswer || isSubmitting} className="flex-[2] py-3 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-white flex justify-center items-center gap-2 disabled:opacity-50">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {lang === "fr" ? "Soumettre" : "Submit"}
        </button>
      </div>
    </div>
  );
}