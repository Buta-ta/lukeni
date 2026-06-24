// components/game/CharacterDialogModal.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Lock, Gift, ChevronRight, User as UserIcon, Send } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

interface Topic {
  id: string;
  question_fr: string;
  question_en: string;
  answer_fr: string;
  answer_en: string;
  required_evidence_id: string | null;
  unlocks_evidence_id: string | null;
  topic_order: number;
}

interface Character {
  id: string;
  name_fr: string;
  name_en: string;
  role: string;
  role_en?: string;
  avatar_url?: string;
}

interface ChatMessage {
  id: string;
  sender: 'player' | 'character' | 'system';
  text: string;
  timestamp: Date;
  unlocksEvidenceId?: string | null;
  isCollected?: boolean;
}

interface CharacterDialogModalProps {
  character: Character | null;
  lang: "fr" | "en";
  collectedEvidences: string[];
  onClose: () => void;
  onEvidenceUnlocked: (evidenceId: string) => void;
  userProfile?: any;
  playerName?: string;
  playerRole?: string;
  playerAvatarUrl?: string; // NOUVEAU : Avatar du personnage incarné
}

export default function CharacterDialogModal({
  character,
  lang,
  collectedEvidences,
  onClose,
  onEvidenceUnlocked,
  userProfile,
  playerName,
  playerRole,
  playerAvatarUrl,
}: CharacterDialogModalProps) {
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [askedTopicIds, setAskedTopicIds] = useState<Set<string>>(new Set());
  const [typingIndicator, setTypingIndicator] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Helper pour rendu sécurisé des avatars
  const renderAvatar = (url: string | null | undefined, size: string = "w-8 h-8") => {
    if (url) {
      return <img src={url} alt="" className={`${size} rounded-full object-cover flex-shrink-0`} />;
    }
    return (
      <div className={`${size} rounded-full bg-gray-800 border border-white/10 flex items-center justify-center flex-shrink-0`}>
        <UserIcon size={14} className="text-gray-500" />
      </div>
    );
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingIndicator]);

  useEffect(() => {
    if (!character) return;
    setIsLoading(true);
    setMessages([]);
    setAskedTopicIds(new Set());

    supabase
      .from("character_topics")
      .select("*")
      .eq("character_id", character.id)
      .order("topic_order", { ascending: true })
      .then(({ data }) => {
        setAllTopics(data || []);
        setIsLoading(false);
      });
  }, [character?.id]);

  const canAskTopic = (topic: Topic): boolean => {
    if (!topic.required_evidence_id) return true;
    return collectedEvidences.includes(topic.required_evidence_id);
  };

  const availableTopics = allTopics.filter(t => !askedTopicIds.has(t.id) && canAskTopic(t));

  const handleSelectTopic = (topic: Topic) => {
    if (!canAskTopic(topic) || askedTopicIds.has(topic.id)) return;

    const questionText = lang === "fr" ? topic.question_fr : topic.question_en;
    const answerText = lang === "fr" ? topic.answer_fr : topic.answer_en;

    const playerMsg: ChatMessage = {
      id: `player_${topic.id}`,
      sender: 'player',
      text: questionText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, playerMsg]);
    setAskedTopicIds(prev => new Set([...prev, topic.id]));

    setTypingIndicator(true);

    setTimeout(() => {
      setTypingIndicator(false);
      const characterMsg: ChatMessage = {
        id: `char_${topic.id}`,
        sender: 'character',
        text: answerText,
        timestamp: new Date(),
        unlocksEvidenceId: topic.unlocks_evidence_id || null,
        isCollected: topic.unlocks_evidence_id ? collectedEvidences.includes(topic.unlocks_evidence_id) : true,
      };
      setMessages(prev => [...prev, characterMsg]);
    }, 800 + Math.random() * 400);
  };

  const handleCollectEvidence = (msg: ChatMessage) => {
    if (msg.unlocksEvidenceId && !msg.isCollected) {
      onEvidenceUnlocked(msg.unlocksEvidenceId);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isCollected: true } : m));
    }
  };

  if (!character) return null;

  const charName = lang === "fr" ? character.name_fr : character.name_en;
  const charRole = lang === "fr" ? character.role : (character.role_en || character.role);
  const displayName = playerName || userProfile?.full_name || userProfile?.email?.split('@')[0] || (lang === "fr" ? "Enquêteur" : "Investigator");
  
  // L'avatar du joueur = l'avatar du personnage choisi (ex: Ye Moko), sinon son vrai profil
  const activePlayerAvatar = playerAvatarUrl || userProfile?.avatar_url;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="w-full md:max-w-lg h-[85vh] bg-[#05050A] border border-white/10 rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
          style={{ borderTop: "3px solid #06b6d4" }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 p-4 border-b border-white/10 bg-gradient-to-r from-[#06b6d4]/10 to-transparent flex-shrink-0">
            <div className="relative flex-shrink-0">
              {renderAvatar(character.avatar_url, "w-10 h-10")}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#05050A]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-sm truncate">{charName}</h2>
              <p className="text-[#06b6d4] text-[10px] font-mono">{charRole}</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-600 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Zone de Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#020111]/50">
            {messages.length === 0 && !isLoading && (
              <div className="h-full flex items-center justify-center text-center p-8">
                <div>
                  <UserIcon size={24} className="mx-auto text-gray-700 mb-2" />
                  <p className="text-gray-600 text-xs font-mono italic">
                    {lang === "fr" ? "Le témoin vous observe en silence..." : "The witness watches you in silence..."}
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.sender === 'player' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar : Personnage PNJ vs Joueur incarné */}
                {msg.sender === 'character' ? renderAvatar(character.avatar_url) : renderAvatar(activePlayerAvatar)}
                
                {/* Bulle de message */}
                <div className={`max-w-[80%] ${msg.sender === 'player' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <span className={`text-[10px] font-mono ${msg.sender === 'player' ? 'text-right text-purple-400' : 'text-left text-gray-500'}`}>
                    {msg.sender === 'player' ? `${displayName}${playerRole ? ` (${playerRole})` : ''}` : charName}
                  </span>
                  
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'character' 
                      ? 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none font-serif italic' 
                      : 'bg-[#06b6d4]/20 border border-[#06b6d4]/30 text-white rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>

                  {msg.unlocksEvidenceId && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => handleCollectEvidence(msg)}
                      disabled={msg.isCollected}
                      className={`mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                        msg.isCollected 
                          ? 'bg-green-900/20 border border-green-500/30 text-green-400 cursor-default'
                          : 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/30 cursor-pointer'
                      }`}
                    >
                      <Gift size={10} />
                      {msg.isCollected 
                        ? (lang === "fr" ? "INDICE OBTENU" : "CLUE OBTAINED") 
                        : (lang === "fr" ? "RÉCUPÉRER L'INDICE" : "COLLECT CLUE")
                      }
                    </motion.button>
                  )}
                </div>
              </div>
            ))}

            {typingIndicator && (
              <div className="flex items-start gap-2.5">
                {renderAvatar(character.avatar_url)}
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Zone des Choix */}
          <div className="border-t border-white/10 bg-[#05050A] p-3 flex-shrink-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : availableTopics.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                <p className="text-[9px] text-gray-600 font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Send size={9} /> {lang === "fr" ? "Choisissez votre approche" : "Choose your approach"}
                </p>
                {availableTopics.map(topic => {
                  const question = lang === "fr" ? topic.question_fr : topic.question_en;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => handleSelectTopic(topic)}
                      className="w-full text-left px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-gray-300 hover:bg-[#06b6d4]/10 hover:border-[#06b6d4]/50 hover:text-white transition-all flex items-center gap-2"
                    >
                      <ChevronRight size={10} className="text-[#06b6d4] flex-shrink-0" />
                      <span className="truncate">{question}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-gray-600 text-[10px] font-mono">
                  {messages.length <= 1 
                    ? (lang === "fr" ? "Chargement des dialogues..." : "Loading dialogs...")
                    : (lang === "fr" ? "Fin de la conversation" : "End of conversation")
                  }
                </p>
              </div>
            )}
            
            {allTopics.filter(t => !canAskTopic(t) && !askedTopicIds.has(t.id)).length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                <p className="text-[9px] text-gray-700 font-mono uppercase tracking-wider flex items-center gap-1">
                  <Lock size={9} /> {lang === "fr" ? "Sujets verrouillés" : "Locked topics"}
                </p>
                {allTopics.filter(t => !canAskTopic(t) && !askedTopicIds.has(t.id)).map(topic => (
                  <div key={topic.id} className="px-3 py-1.5 text-[10px] text-gray-700 flex items-center gap-2 opacity-50">
                    <Lock size={8} />
                    <span className="truncate">{lang === "fr" ? topic.question_fr : topic.question_en}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}