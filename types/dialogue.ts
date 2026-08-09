// types/dialogue.ts

export interface Dialogue {
  id: string;
  investigation_id: string;
  name: string;
  entry_node_id: string | null;
  nodes?: DialogueNode[];
}

export interface DialogueNode {
  id: string;
  dialogue_id: string;
  speaker_type: "player" | "npc";
  speaker_npc_id: string | null;
  text_fr: string;
  text_en: string;
  is_entry_point: boolean;
  auto_next_node_id: string | null;
  order_index: number;
  choices?: DialogueChoice[];
  speaker?: any; // Sera peuplé dynamiquement en jeu avec les données de dialogueSpeakers
  required_flag?: string | null;   // ✅ flag requis pour afficher CE nœud
  set_flag?: string | null;        // ✅ flag ajouté quand on passe par ce nœud
}

export interface DialogueChoice {
  id: string;
  node_id: string;
  text_fr: string;
  text_en: string;
  next_node_id: string | null;
  required_evidence_id: string | null;
  unlocks_evidence_id: string | null;
  trigger_event_id: string | null;
  disappears_after_use: boolean;
  required_flag?: string | null;   // flag requis pour afficher ce choix
  set_flag?: string | null;        // flag ajouté quand le joueur choisit

  order_index: number;
}