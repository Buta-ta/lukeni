// types/panorama.ts

export type HotspotType =
  | 'evidence'
  | 'audio'
  | 'document'
  | 'transition'
  | 'info'
  | 'enigma'
  | 'image'
  | 'locked'
  | 'character'
  | 'ending'
  | 'dialogue_bubble';

export const HOTSPOT_ICONS_PRESET = [
  { value: '🔍', label: 'Loupe' }, { value: '🔎', label: 'Loupe zoom' },
  { value: '👁️', label: 'Œil' }, { value: '🕵️', label: 'Détective' },
  { value: '🧩', label: 'Puzzle' }, { value: '❓', label: 'Question' },
  { value: '❗', label: 'Important' }, { value: '📄', label: 'Document' },
  { value: '📜', label: 'Parchemin' }, { value: '📰', label: 'Journal' },
  { value: '📋', label: 'Liste' }, { value: '📁', label: 'Dossier' },
  { value: '🗂️', label: 'Archives' }, { value: '📷', label: 'Photo' },
  { value: '🖼️', label: 'Image' }, { value: '🗺️', label: 'Carte' },
  { value: '✉️', label: 'Lettre' }, { value: '📬', label: 'Courrier' },
  { value: '🎵', label: 'Musique' }, { value: '🎙️', label: 'Microphone' },
  { value: '📻', label: 'Radio' }, { value: '📞', label: 'Téléphone' },
  { value: '🔊', label: 'Son' }, { value: '🎬', label: 'Film' },
  { value: '📹', label: 'Vidéo' }, { value: '🗝️', label: 'Clé ancienne' },
  { value: '🔑', label: 'Clé' }, { value: '🔒', label: 'Cadenas' },
  { value: '🔓', label: 'Déverrouillé' }, { value: '💼', label: 'Mallette' },
  { value: '🧳', label: 'Valise' }, { value: '📦', label: 'Boîte' },
  { value: '🏺', label: 'Vase' }, { value: '⚱️', label: 'Urne' },
  { value: '🔭', label: 'Télescope' }, { value: '🧪', label: 'Fiole' },
  { value: '💊', label: 'Pilule' }, { value: '🩸', label: 'Sang' },
  { value: '🗡️', label: 'Dague' }, { value: '⚔️', label: 'Épées' },
  { value: '🛡️', label: 'Bouclier' }, { value: '💣', label: 'Bombe' },
  { value: '➡️', label: 'Flèche droite' }, { value: '⬆️', label: 'Flèche haut' },
  { value: '🚪', label: 'Porte' }, { value: '🪟', label: 'Fenêtre' },
  { value: '🏚️', label: 'Bâtiment' }, { value: '👤', label: 'Personne' },
  { value: '👥', label: 'Groupe' }, { value: '💀', label: 'Crâne' },
  { value: '👻', label: 'Fantôme' }, { value: '🌍', label: 'Afrique' },
  { value: '⭐', label: 'Étoile' }, { value: '✨', label: 'Magie' },
  { value: '🔥', label: 'Feu' }, { value: '💧', label: 'Eau' },
  { value: '🌙', label: 'Lune' }, { value: '☀️', label: 'Soleil' },
  { value: '⚡', label: 'Éclair' }, { value: '💡', label: 'Idée' },
  { value: '🪬', label: 'Amulette' }, { value: '🧿', label: 'Talisman' },
  { value: '♟️', label: 'Stratégie' }, { value: '🎯', label: 'Cible' },
  { value: '🏆', label: 'Trophée' }, { value: '🥇', label: 'Médaille' },
  { value: '🪄', label: 'Baguette' }, { value: '🧲', label: 'Aimant' },
  { value: '🪙', label: 'Pièce' }, { value: '💎', label: 'Diamant' },
  { value: '🌿', label: 'Plante' }, { value: '🦁', label: 'Lion' },
  { value: '🐍', label: 'Serpent' }, { value: '🦅', label: 'Aigle' }
];

export interface Hotspot {
  id: string;
  x_percent: number;
  y_percent: number;
  type: HotspotType;
  label_fr: string;
  label_en: string;
  icon: string;
  icon_url?: string;
  color?: string;
  variant?: 'floating' | 'ground';

  trigger_event_id?: string;
  instruction_id?: string;
  // ── LIAISONS AUX ÉLÉMENTS CRÉÉS ──
  evidence_id?: string;

  character_id?: string;     // <-- NOUVEAU
  enigma_id?: string;        // <-- NOUVEAU
  target_scene_id?: string;
  target_chapter_id?: string;
  condition?: string;

  // ── MÉDIAS UPLOADÉS POUR LA SCÈNE ──
  inline_image_url?: string;
  inline_audio_url?: string; // <-- NOUVEAU
  inline_image_caption_fr?: string;
  inline_image_caption_en?: string;
  info_text_fr?: string;
  info_text_en?: string;

  // Rétrocompatibilité (anciennes énigmes inline)
  enigma_question_fr?: string;
  enigma_question_en?: string;
  enigma_answer_fr?: string;
  enigma_answer_en?: string;
  enigma_hint_fr?: string;
  enigma_hint_en?: string;

  // ── TERMINAISONS SPÉCIALES (Hotspots de fin) ──
  is_ending?: boolean; // Vrai si ce hotspot déclenche une fin
  ending_type?: 'victory' | 'abandon' | 'alternate'; // Type de fin
  ending_msg_fr?: string; // Message de fin FR
  ending_msg_en?: string; // Message de fin EN

  ending_title_fr?: string;
  ending_title_en?: string;
  invisible?: boolean;

  reveals_hotspot_ids?: string[];


  dialogue_text_fr?: string;
  dialogue_text_en?: string;
  dialogue_speaker_id?: string; // Lien vers dialogue_speakers (optionnel)
  dialogue_typewriter_speed?: number;
  dialogue_style?: string;
  dialogue_size?: 'small' | 'medium' | 'large';
}


export interface Enigma {
  id: string;
  chapter_id: string;
  question_fr: string;
  question_en: string;
  expected_answer_fr: string;
  expected_answer_en: string;
  trigger_event_id?: string;
  clues?: Clue[];
  evidence_id?: string;
  response_type?: 'text' | 'choice';
  choices_fr?: string[];
  choices_en?: string[];
  correct_choice_index?: number;
  // ✅ AJOUTE CES 3 LIGNES :
  scene_id?: string;
  enigma_timer_seconds?: number;
  timer_timeout_instruction_id?: string;
}

export interface Clue {
  id: string;
  enigma_id: string;
  text_fr: string;
  text_en?: string;
}

export interface PanoramaScene {
  id: string;
  chapter_id: string;
  scene_order: number;
  title_fr: string;
  title_en: string;
  panorama_url: string;
  thumbnail_url?: string;
  hotspots: Hotspot[];
  ambient_audio_url?: string | null;
  ambient_audio_volume?: number;
  timer_duration?: number;
  visual_filter?: 'none' | 'sepia' | 'grayscale' | 'vintage' | string;
  game_over_msg_fr?: string;
  game_over_msg_en?: string;
  instruction_id?: string; 
  mission_fr?: string;
  mission_en?: string;
  mission_objectives_fr?: string[];
  mission_objectives_en?: string[];
  mission_hint_fr?: string;
  mission_hint_en?: string;
  historical_context_fr?: string | null; 
  historical_context_en?: string | null; 

}

export function flatToSpherical(xPercent: number, yPercent: number) {
  const phi = (yPercent / 100) * Math.PI;
  const theta = (xPercent / 100) * 2 * Math.PI;
  const radius = 4.5;
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return { phi, theta, position: [x, y, z] as [number, number, number] };
}

export const HOTSPOT_CONFIG: Record<HotspotType, { icon: string; color: string; label_fr: string; label_en: string }> = {
  evidence: { icon: '🔍', color: '#ef4444', label_fr: 'Indice', label_en: 'Clue' },
  audio: { icon: '🎵', color: '#8b5cf6', label_fr: 'Témoignage', label_en: 'Testimony' },
  document: { icon: '📄', color: '#f59e0b', label_fr: 'Document', label_en: 'Document' },
  transition: { icon: '🚪', color: '#10b981', label_fr: 'Continuer', label_en: 'Continue' },
  info: { icon: '💡', color: '#3b82f6', label_fr: 'Information', label_en: 'Information' },
  enigma: { icon: '❓', color: '#D4AF37', label_fr: 'Énigme', label_en: 'Enigma' },
  image: { icon: '🖼️', color: '#06b6d4', label_fr: 'Image', label_en: 'Image' },
  locked: { icon: '🔒', color: '#6b7280', label_fr: 'Verrouillé', label_en: 'Locked' },
  character: { icon: '👤', color: '#14b8a6', label_fr: 'Personnage', label_en: 'Character' },
  ending: { icon: '🏁', color: '#ec4899', label_fr: 'Fin', label_en: 'Ending' },
  dialogue_bubble: { icon: '💬', color: '#f97316', label_fr: 'Dialogue', label_en: 'Dialogue' },
};



// ✅ NOUVEAU : Styles de bulles de dialogue
export const DIALOGUE_BUBBLE_STYLES = [
  {
    id: 'classic_blue',
    name_fr: 'Classique Bleu',
    name_en: 'Classic Blue',
    bgColor: '#1E40AF',
    textColor: '#FFFFFF',
    borderColor: '#3B82F6',
    accentColor: '#60A5FA',
  },
  {
    id: 'warning_red',
    name_fr: 'Alerte Rouge',
    name_en: 'Warning Red',
    bgColor: '#7F1D1D',
    textColor: '#FFFFFF',
    borderColor: '#DC2626',
    accentColor: '#EF4444',
  },
  {
    id: 'success_green',
    name_fr: 'Succès Vert',
    name_en: 'Success Green',
    bgColor: '#15803D',
    textColor: '#FFFFFF',
    borderColor: '#16A34A',
    accentColor: '#4ADE80',
  },
  {
    id: 'dark_gold',
    name_fr: 'Mystère Or',
    name_en: 'Mystery Gold',
    bgColor: '#1F2937',
    textColor: '#F3E8FF',
    borderColor: '#D4AF37',
    accentColor: '#F59E0B',
  },
  {
    id: 'ethereal_purple',
    name_fr: 'Éthéré Violet',
    name_en: 'Ethereal Purple',
    bgColor: '#4C1D95',
    textColor: '#F3E8FF',
    borderColor: '#A78BFA',
    accentColor: '#C084FC',
  },
];

export const TRANSITION_ICONS_PRESET = [
  { value: '🚪', label: 'Porte' },
  { value: '➡️', label: 'Flèche' },
  { value: '🗿', label: 'Masque africain' },
  { value: '🌳', label: 'Arbre' },
  { value: '🏺', label: 'Vase' },
  { value: '🛡️', label: 'Bouclier' },
  { value: '⭐', label: 'Étoile' },
  { value: '💎', label: 'Diamant' },
];


export const HOTSPOT_COLORS = [
  { value: '#ef4444', label: 'Rouge' }, { value: '#f59e0b', label: 'Ambre' },
  { value: '#10b981', label: 'Vert' }, { value: '#3b82f6', label: 'Bleu' },
  { value: '#8b5cf6', label: 'Violet' }, { value: '#ec4899', label: 'Rose' },
  { value: '#D4AF37', label: 'Or' }, { value: '#06b6d4', label: 'Cyan' },
  { value: '#14b8a6', label: 'Sarcelle' }, { value: '#84cc16', label: 'Lime' },
  { value: '#f97316', label: 'Orange' }, { value: '#6b7280', label: 'Gris' },
  { value: '#ffffff', label: 'Blanc' },
];