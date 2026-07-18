// components/game/DialogueGame.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Lock } from "lucide-react";
import { DialogueNode, DialogueChoice } from "@/types/dialogue";

interface Props {
  dialogueId: string;
  dialogueNodes: DialogueNode[];
  dialogueSpeakers: any[];
  playerCharacter: any; // Le personnage choisi par le joueur (investigation_characters)
  collectedEvidences: string[];
  lang: "fr" | "en";
  onClose: () => void;
  onUnlockEvidence: (evidenceId: string) => void;
  onTriggerEvent: (eventId: string) => void;
}

export default function DialogueGame({
  dialogueNodes,
  dialogueSpeakers,
  playerCharacter,
  collectedEvidences,
  lang,
  onClose,
  onUnlockEvidence,
  onTriggerEvent,
}: Props) {
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [usedChoiceIds, setUsedChoiceIds] = useState<string[]>([]);
  const [history, setHistory] = useState<{ speaker: string; text: string; avatar: string | null }[]>([]);

  // Trouver le nœud d'entrée
  useEffect(() => {
    const entryNode = dialogueNodes.find(n => n.is_entry_point);
    if (entryNode) {
      setCurrentNodeId(entryNode.id);
    } else if (dialogueNodes.length > 0) {
      setCurrentNodeId(dialogueNodes[0].id);
    }
  }, [dialogueNodes]);

  const currentNode = dialogueNodes.find(n => n.id === currentNodeId);

  // Effet machine à écrire
  useEffect(() => {
    if (!currentNode) return;
    const text = lang === "fr" ? currentNode.text_fr : (currentNode.text_en || currentNode.text_fr);
    
    setIsTyping(true);
    let i = 0;
    setDisplayText("");

    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        // Ajouter à l'historique une fois terminé
        const speakerName = getSpeakerName(currentNode);
        const speakerAvatar = getSpeakerAvatar(currentNode);
        setHistory(prev => [...prev, { speaker: speakerName, text: text, avatar: speakerAvatar }]);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [currentNodeId, lang]);

  const getSpeakerName = (node: DialogueNode) => {
    if (node.speaker_type === "player") {
      return lang === "fr" ? playerCharacter?.name_fr : (playerCharacter?.name_en || playerCharacter?.name_fr || "Joueur");
    } else {
      const speaker = dialogueSpeakers.find(s => s.id === node.speaker_npc_id);
      return speaker ? (lang === "fr" ? speaker.name_fr : speaker.name_en) : "Inconnu";
    }
  };

  const getSpeakerAvatar = (node: DialogueNode) => {
    if (node.speaker_type === "player") {
      return playerCharacter?.avatar_url || null;
    } else {
      const speaker = dialogueSpeakers.find(s => s.id === node.speaker_npc_id);
      return speaker?.avatar_url || null;
    }
  };

  const handleChoiceClick = async (choice: DialogueChoice) => {
    // Débloquer preuve si besoin
    if (choice.unlocks_evidence_id) {
      onUnlockEvidence(choice.unlocks_evidence_id);
    }

    // Déclencher événement si besoin
    if (choice.trigger_event_id) {
      onTriggerEvent(choice.trigger_event_id);
    }

    // Marquer le choix comme utilisé
    if (choice.disappears_after_use) {
      setUsedChoiceIds(prev => [...prev, choice.id]);
    }

    // Aller au prochain nœud
    if (choice.next_node_id) {
      setCurrentNodeId(choice.next_node_id);
    } else {
      // Fin du dialogue
      setTimeout(() => onClose(), 500);
    }
  };

  const handleAutoNext = () => {
    if (currentNode?.auto_next_node_id) {
      setCurrentNodeId(currentNode.auto_next_node_id);
    } else {
      onClose();
    }
  };

  if (!currentNode) return null;

  const speakerName = getSpeakerName(currentNode);
  const speakerAvatar = getSpeakerAvatar(currentNode);
  const availableChoices = (currentNode.choices || []).filter(c => {
    // Vérifier si le choix a déjà été utilisé
    if (c.disappears_after_use && usedChoiceIds.includes(c.id)) return false;
    // Vérifier la condition de preuve
    if (c.required_evidence_id && !collectedEvidences.includes(c.required_evidence_id)) return false;
    return true;
  });

  const isPlayerNode = currentNode.speaker_type === "player";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 bg-gray-800 flex-shrink-0">
                {speakerAvatar ? (
                  <img src={speakerAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><User size={16} className="text-gray-500" /></div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">{speakerName}</h3>
                <p className="text-[10px] text-gray-400">{isPlayerNode ? "Choisissez une réponse" : "Parle..."}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Corps du dialogue */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Historique récent (les 2 derniers) */}
            {history.slice(-2, -1).map((h, i) => (
              <div key={i} className="opacity-50 text-sm">
                <span className="font-bold text-gray-400">{h.speaker}: </span>
                <span className="text-gray-500">{h.text}</span>
              </div>
            ))}

            {/* Texte en cours */}
            <div className="text-white text-base leading-relaxed font-serif min-h-[50px]">
              {displayText}
              {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-white animate-pulse align-middle" />}
            </div>
          </div>

          {/* Pied : Choix ou Continuer */}
          {!isTyping && (
            <div className="p-4 border-t border-white/10 bg-black/40 space-y-2">
              {isPlayerNode && availableChoices.length > 0 ? (
                availableChoices.map(choice => {
                  const isLocked = choice.required_evidence_id && !collectedEvidences.includes(choice.required_evidence_id);
                  const choiceText = lang === "fr" ? choice.text_fr : (choice.text_en || choice.text_fr);
                  
                  return (
                    <button
                      key={choice.id}
                      onClick={() => !isLocked && handleChoiceClick(choice)}
                      disabled={!!isLocked}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                        isLocked 
                          ? "bg-gray-900/50 border-gray-700 text-gray-600 cursor-not-allowed" 
                          : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-teal-500/50"
                      }`}
                    >
                      <span className="flex-1 text-sm">{choiceText}</span>
                      {isLocked && (
                        <span className="flex items-center gap-1 text-[10px] text-red-400">
                          <Lock size={10} /> Preuve requise
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <button 
                  onClick={handleAutoNext}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  {currentNode.auto_next_node_id ? (lang === "fr" ? "Continuer →" : "Continue →") : (lang === "fr" ? "Terminer" : "End")}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}