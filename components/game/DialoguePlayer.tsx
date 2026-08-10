// components/game/DialoguePlayer.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase-browser"; 
import AnimatedPortrait from "./AnimatedPortrait";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, MessageCircle } from "lucide-react";

interface DialogueNodeData {
  id: string;
  dialogue_id: string;
  speaker_type: 'player' | 'npc';
  speaker_npc_id: string | null;
  text_fr: string;
  text_en: string | null;
  is_entry_point: boolean;
  auto_next_node_id: string | null;
  order_index: number;

  required_flag?: string | null;
  set_flag?: string | null;
  audio_url?: string | null;
}

interface DialogueChoiceData {
  id: string;
  node_id: string;
  text_fr: string;
  text_en: string | null;
  next_node_id: string | null;
  required_evidence_id: string | null;
  unlocks_evidence_id: string | null;
  trigger_event_id: string | null;
  disappears_after_use: boolean;
  order_index: number;
  required_flag?: string | null;
  set_flag?: string | null;

}

interface Props {
  dialogueId: string;
  investigationId: string;
  lang?: 'fr' | 'en';
  preloadedData?: any;
  preloadedSpeakers?: any[];
  unlockedEvidenceIds?: string[];
  onClose: () => void;
  onUnlockEvidence?: (evidenceId: string) => void;
  onTriggerEvent?: (eventId: string) => void;
  sessionId?: string;
  narrativeFlags?: string[];
  onSetFlag?: (flag: string) => void;

  onDialogueComplete?: () => void;
}

export default function DialoguePlayer({
  dialogueId,
  investigationId,
  lang = 'fr',
  preloadedData,
  preloadedSpeakers,
  unlockedEvidenceIds = [],
  onClose,
  onUnlockEvidence,
  onTriggerEvent,
  sessionId,
  narrativeFlags = [],
  onSetFlag,
  onDialogueComplete,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [nodes, setNodes] = useState<DialogueNodeData[]>([]);
  const [choices, setChoices] = useState<DialogueChoiceData[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [usedChoiceIds, setUsedChoiceIds] = useState<string[]>([]);

  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);



  // ✅ Marquer le dialogue comme complété en BDD
  const markDialogueComplete = async () => {
    console.log('🎯 [DIALOGUE] markDialogueComplete APPELÉ', { sessionId, dialogueId });

    if (!sessionId) {
      console.log('❌ [DIALOGUE] Pas de sessionId, abandon');
      return;
    }

    try {
  const { data: session } = await supabase
    .from('investigation_sessions')
    .select('completed_dialogues')
    .eq('id', sessionId)
    .single();

  const completed = session?.completed_dialogues || [];
  console.log('🔍 [DIALOGUE] completed_dialogues actuel:', completed);

  // ✅ Format canonique : dialogue_<id>_completed
  const completionKey = `dialogue_${dialogueId}_completed`;

  if (!completed.includes(completionKey)) {
    const updated = [...completed, completionKey];
    console.log('💾 [DIALOGUE] Sauvegarde:', { completionKey, updated });

    const { data, error } = await supabase
      .from('investigation_sessions')
      .update({ completed_dialogues: updated })
      .eq('id', sessionId)
      .select();

    if (error) {
      console.error('❌ [DIALOGUE] Erreur Supabase:', error);
    } else {
      console.log('✅ [DIALOGUE] Sauvegardé avec succès:', data);
      // ✅ Toujours appeler onDialogueComplete après sauvegarde réussie
      if (onDialogueComplete) {
        onDialogueComplete();
      }
    }
  } else {
    console.log('⚠️ [DIALOGUE] Déjà dans completed_dialogues, refresh quand même');
    // ✅ Appeler onDialogueComplete même si déjà en base
    // pour forcer le refresh du state React côté page
    if (onDialogueComplete) {
      onDialogueComplete();
    }
  }
} catch (err) {
  console.error('❌ [DIALOGUE] Erreur catch:', err);
}
  };
  // ── Chargement initial ──
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);

      // ✅ MODE INSTANTANÉ : Données préchargées (0 requête)
      if (preloadedData) {
        const nodesData = preloadedData.nodes || [];
        const choicesFromNodes = nodesData.flatMap((n: any) => n.choices || []);

        setNodes(nodesData);
        setChoices(choicesFromNodes);

        if (preloadedSpeakers && preloadedSpeakers.length > 0) {
          setSpeakers(preloadedSpeakers);
        } else {
          const { data: speakersData } = await supabase
            .from("investigation_dialogue_speakers")
            .select("*")
            .eq("investigation_id", investigationId);
          if (isMounted) setSpeakers(speakersData || []);
        }

        const entryId =
          preloadedData.entry_node_id ||
          nodesData.find((n: any) => n.is_entry_point)?.id ||
          nodesData[0]?.id ||
          null;

        if (isMounted) {
          setCurrentNodeId(entryId);
          setIsLoading(false);
        }
        return;
      }

      // ── MODE FALLBACK : Chargement depuis Supabase (4 requêtes) ──
      const { data: dialogueRow } = await supabase
        .from("investigation_dialogues")
        .select("*")
        .eq("id", dialogueId)
        .single();

      const { data: nodesData } = await supabase
        .from("investigation_dialogue_nodes")
        .select("*")
        .eq("dialogue_id", dialogueId)
        .order("order_index", { ascending: true });

      const nodeIds = (nodesData || []).map(n => n.id);
      let choicesData: DialogueChoiceData[] = [];
      if (nodeIds.length > 0) {
        const { data: ch } = await supabase
          .from("investigation_dialogue_choices")
          .select("*")
          .in("node_id", nodeIds)
          .order("order_index", { ascending: true });
        choicesData = ch || [];
      }

      const { data: speakersData } = await supabase
        .from("investigation_dialogue_speakers")
        .select("*")
        .eq("investigation_id", investigationId);

      if (!isMounted) return;

      setNodes(nodesData || []);
      setChoices(choicesData);
      setSpeakers(speakersData || []);

      const entryId =
        dialogueRow?.entry_node_id ||
        (nodesData || []).find(n => n.is_entry_point)?.id ||
        (nodesData || [])[0]?.id ||
        null;

      setCurrentNodeId(entryId);
      setIsLoading(false);
    };

    load();
    return () => { isMounted = false; };
  }, [dialogueId, investigationId, preloadedData, preloadedSpeakers]);

  const currentNode = nodes.find(n => n.id === currentNodeId) || null;

  const currentChoices = currentNode
    ? choices
      .filter(c => c.node_id === currentNode.id)
      .filter(c => !c.required_evidence_id || unlockedEvidenceIds.includes(c.required_evidence_id))
      .filter(c => !c.required_flag || (narrativeFlags || []).includes(c.required_flag))
      .filter(c => !usedChoiceIds.includes(c.id))
    : [];

  const speaker = currentNode?.speaker_npc_id
    ? speakers.find(s => s.id === currentNode.speaker_npc_id)
    : null;

  const fullText = currentNode
    ? (lang === 'fr' ? currentNode.text_fr : (currentNode.text_en || currentNode.text_fr)) || ''
    : '';

  // ── Effet machine à écrire (uniquement pour les répliques PNJ) ──
  useEffect(() => {
    if (!currentNode) return;
    setDisplayedText('');
    setIsTyping(true);

    let i = 0;
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

    typingIntervalRef.current = setInterval(() => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        setIsTyping(false);
      }
    }, 25);

    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId]);

  const skipTyping = () => {
    if (isTyping) {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      setDisplayedText(fullText);
      setIsTyping(false);
    }
  };

  // ── Avancer après une réplique NPC (clic sur la bulle) ──
  const handleContinue = () => {
    if (isTyping) { skipTyping(); return; }
    if (!currentNode) return;

    if (currentNode.speaker_type === 'npc') {
      if (currentNode.auto_next_node_id) {
                goToNode(currentNode.auto_next_node_id);
      } else {

        console.log('🏁 [DIALOGUE] Fin du dialogue (NPC sans auto_next)');
        // ✅ Dialogue terminé
        markDialogueComplete();
        onClose();
      }
    }
  };

    // ✅ Navigation vers un nœud en vérifiant les flags conditionnels
  const goToNode = (nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId);
    // Si le nœud cible a un required_flag non satisfait → le sauter (trouver le suivant ou terminer)
    if (target?.required_flag && !(narrativeFlags || []).includes(target.required_flag)) {
      // Chercher un nœud alternatif : le premier nœud non conditionnel du dialogue
      const fallback = nodes.find(n => !n.required_flag || (narrativeFlags || []).includes(n.required_flag));
      if (fallback) {
        setCurrentNodeId(fallback.id);
      } else {
        markDialogueComplete();
        onClose();
      }
      return;
    }
    setCurrentNodeId(nodeId);
  };

  const handleChoiceClick = (choice: DialogueChoiceData) => {

    if (choice.set_flag && onSetFlag) onSetFlag(choice.set_flag);
    if (choice.unlocks_evidence_id) onUnlockEvidence?.(choice.unlocks_evidence_id);
    if (choice.trigger_event_id) onTriggerEvent?.(choice.trigger_event_id);
    if (choice.disappears_after_use) setUsedChoiceIds(prev => [...prev, choice.id]);

    if (choice.next_node_id) {
            goToNode(choice.next_node_id);
    } else {
      console.log('🏁 [DIALOGUE] Fin du dialogue (choix sans next_node)');
      // ✅ Dialogue terminé
      markDialogueComplete();
      onClose();
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
        <Loader2 className="animate-spin text-teal-500" size={40} />
      </div>
    );
  }

  if (!currentNode) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
        <div className="bg-[#111] p-6 rounded-xl border border-white/10 text-center">
          <p className="text-gray-400 text-sm mb-4">
            {lang === 'fr' ? "Ce dialogue est vide." : "This dialogue is empty."}
          </p>
          <button onClick={onClose} className="px-4 py-2 bg-white/10 rounded-lg text-white text-sm">
            {lang === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

  const isNpcTurn = currentNode.speaker_type === 'npc'; 

    // ✅ Lancer l'audio + animation quand un nœud PNJ parle
  useEffect(() => {
    if (isNpcTurn && currentNode?.audio_url) {
      setIsSpeaking(true);
    } else {
      setIsSpeaking(false);
    }
  }, [currentNodeId, isNpcTurn, currentNode?.audio_url]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 rounded-full p-2 z-10"
      >
        <X size={18} />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="w-full max-w-xl bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* ── En-tête speaker ── */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-white/5">
                    {isNpcTurn ? (
            <AnimatedPortrait
              avatarUrl={speaker?.avatar_url}
              name={speaker ? (lang === "fr" ? speaker.name_fr : speaker.name_en || speaker.name_fr) : undefined}
              role={speaker?.role_fr}
              audioUrl={currentNode?.audio_url}
              isSpeaking={isNpcTurn && isSpeaking}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400">
              <MessageCircle size={18} />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-white">
              {isNpcTurn
                ? (speaker ? (lang === 'fr' ? speaker.name_fr : (speaker.name_en || speaker.name_fr)) : (lang === 'fr' ? 'Inconnu' : 'Unknown'))
                : (lang === 'fr' ? 'Vous' : 'You')}
            </p>
            {isNpcTurn && speaker?.role_fr && (
              <p className="text-[10px] text-gray-500">
                {lang === 'fr' ? speaker.role_fr : (speaker.role_en || speaker.role_fr)}
              </p>
            )}
          </div>
        </div>

        {/* ── Réplique PNJ (machine à écrire) ── */}
        {isNpcTurn && (
          <div className="p-5 min-h-[100px] cursor-pointer" onClick={handleContinue}>
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
              {displayedText}
              {isTyping && <span className="animate-pulse">▌</span>}
            </p>
            {!isTyping && (
              <p className="text-[10px] text-gray-500 mt-3 text-right animate-pulse">
                {lang === 'fr' ? 'Cliquez pour continuer ▸' : 'Click to continue ▸'}
              </p>
            )}
          </div>
        )}

        {/* ── Choix du joueur ── */}
        {!isNpcTurn && (
          <div className="p-4 space-y-2">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">
              {lang === 'fr' ? 'Que répondez-vous ?' : 'How do you respond?'}
            </p>
            <AnimatePresence>
              {currentChoices.map(choice => (
                <motion.button
                  key={choice.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onClick={() => handleChoiceClick(choice)}
                  className="w-full text-left px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-100 transition-colors"
                >
                  {lang === 'fr' ? choice.text_fr : (choice.text_en || choice.text_fr)}
                </motion.button>
              ))}
            </AnimatePresence>
            {currentChoices.length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-xs italic mb-3">
                  {lang === 'fr' ? "Vous n'avez rien à répondre." : "You have nothing to say."}
                </p>
                <button onClick={onClose} className="px-4 py-2 bg-white/10 rounded-lg text-white text-xs">
                  {lang === 'fr' ? 'Fermer' : 'Close'}
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}