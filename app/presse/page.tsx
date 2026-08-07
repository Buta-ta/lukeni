"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import {
  Search,
  MapPin,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Bell,
  Share2,
  Calendar,
  User,
  Headphones,
  BookOpen,
  ExternalLink,
  Check,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Globe,
  Clock,
  ChevronRight,
  Zap,
  LayoutGrid,
  List,
  Film,
  Newspaper,
  Music,
  ScrollText,
  BookMarked,
  Home,
  ChevronLeft,
  MessageCircle,
  Filter,
  Radio,
  FileAudio,
  Mic,
  Video,
  TrendingUp,
  ImageIcon,
  X,
  Upload,
  PlusCircle,
  Send,
  ThumbsUp,
  BarChart3,
  Maximize2,
  Info,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

import {
  BarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import SuggestButton from "@/components/SuggestButton";
import FavoriteButton from "@/components/FavoriteButton";
import SubscribeButton from "@/components/SubscribeButton";
import SubscribeModal from "@/components/SubscribeModal";
import { NotesplitContainer } from "@/components/NotesplitContainer";
import RenderChartPublic from "@/lib/charts/renderChartPublic";
import { useLanguage } from "@/lib/contexts/LanguageContext";

// --- CUSTOM ICONS ---
const InstagramIcon = ({ size = 24, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ size = 24, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);



// ─── Icônes culturelles africaines ───────────────────────────────────────────

const MasqueAfricainIcon = ({ size = 48, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 100 160" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Forme générale du masque */}
    <path d="M50 8 C28 8 18 30 18 55 C18 80 26 105 36 120 C40 127 44 132 50 135 C56 132 60 127 64 120 C74 105 82 80 82 55 C82 30 72 8 50 8Z" />
    {/* Yeux en amande */}
    <path d="M34 52 C34 47 38 44 42 44 C46 44 50 47 50 52 C50 57 46 60 42 60 C38 60 34 57 34 52Z" />
    <path d="M50 52 C50 47 54 44 58 44 C62 44 66 47 66 52 C66 57 62 60 58 60 C54 60 50 57 50 52Z" />
    {/* Nez */}
    <path d="M46 62 L44 78 L50 80 L56 78 L54 62" />
    {/* Bouche */}
    <path d="M38 90 C42 96 58 96 62 90" />
    {/* Scarifications — traits horizontaux sur les joues */}
    <line x1="20" y1="58" x2="32" y2="56" />
    <line x1="20" y1="64" x2="32" y2="62" />
    <line x1="20" y1="70" x2="32" y2="68" />
    <line x1="68" y1="56" x2="80" y2="58" />
    <line x1="68" y1="62" x2="80" y2="64" />
    <line x1="68" y1="68" x2="80" y2="70" />
    {/* Coiffe haut */}
    <path d="M35 12 C35 4 50 0 50 0 C50 0 65 4 65 12" />
    <line x1="50" y1="0" x2="50" y2="14" />
    <line x1="40" y1="2" x2="42" y2="12" />
    <line x1="60" y1="2" x2="58" y2="12" />
  </svg>
);

const LaptopIcon = ({ size = 48, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 100 80" width={size} height={size * 0.8} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Écran */}
    <rect x="15" y="10" width="70" height="45" rx="3" ry="3" />
    {/* Contenu écran - lignes de texte */}
    <line x1="22" y1="20" x2="50" y2="20" strokeWidth="1" />
    <line x1="22" y1="26" x2="60" y2="26" strokeWidth="1" />
    <line x1="22" y1="32" x2="55" y2="32" strokeWidth="1" />
    <line x1="22" y1="38" x2="45" y2="38" strokeWidth="1" />
    {/* Base/clavier */}
    <path d="M10 55 L90 55 L85 65 L15 65 Z" />
    {/* Touchpad */}
    <rect x="40" y="58" width="20" height="5" rx="1" />
  </svg>
);

const MotifKenteIcon = ({ width = 120, height = 16, className = "" }: { width?: number; height?: number; className?: string }) => (
  <svg viewBox="0 0 120 16" width={width} height={height} className={className} fill="currentColor" stroke="none">
    {/* Bande répétitive de losanges et traits géométriques inspirés du tissage Kenté */}
    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
      <g key={i} transform={`translate(${i * 12}, 0)`}>
        <rect x="1" y="6" width="10" height="4" opacity="0.6" />
        <polygon points="6,0 11,5 6,10 1,5" opacity="0.9" />
        <rect x="4" y="12" width="4" height="4" opacity="0.5" />
      </g>
    ))}
  </svg>
);

const AwaleIcon = ({ size = 48, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 160 60" width={size} height={size * 0.375} className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Plateau rectangulaire arrondi */}
    <rect x="4" y="8" width="152" height="44" rx="22" ry="22" />
    {/* Deux rangées de 6 fossettes */}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <g key={`top-${i}`}>
        <circle cx={22 + i * 20} cy="22" r="7" />
        {/* Graines : petits points à l'intérieur */}
        <circle cx={22 + i * 20} cy="22" r="2" fill="currentColor" stroke="none" />
      </g>
    ))}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <g key={`bot-${i}`}>
        <circle cx={22 + i * 20} cy="38" r="7" />
        <circle cx={22 + i * 20} cy="38" r="2" fill="currentColor" stroke="none" />
      </g>
    ))}
  </svg>
);

// Symboles Adinkra
const SankofaIcon = ({ size = 48, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {/* Corps de l'oiseau regardant en arrière */}
    <path d="M50 70 C30 70 15 55 15 40 C15 25 28 15 42 18 C38 12 36 6 40 4 C44 2 46 8 44 14 C52 10 62 12 68 20 C76 30 74 45 64 54 C60 58 56 62 50 70Z" />
    {/* Tête tournée */}
    <circle cx="40" cy="16" r="7" />
    {/* Oeil */}
    <circle cx="38" cy="14" r="1.5" fill="currentColor" stroke="none" />
    {/* Queue */}
    <path d="M50 70 C55 80 60 88 58 96" />
    <path d="M50 70 C48 82 44 90 46 96" />
    {/* Spirale centrale — symbole du regard en arrière */}
    <path d="M50 45 C50 38 56 34 62 36 C68 38 70 46 66 52 C62 58 54 58 50 54 C46 50 46 42 50 38" />
  </svg>
);

const GyeNyameIcon = ({ size = 48, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {/* Gye Nyame : motif en croix avec crochets aux extrémités */}
    {/* Axe central vertical */}
    <line x1="50" y1="10" x2="50" y2="90" />
    {/* Axe central horizontal */}
    <line x1="10" y1="50" x2="90" y2="50" />
    {/* Crochets haut */}
    <path d="M50 10 C44 10 40 14 42 20 C44 26 52 26 54 20 C56 14 52 10 50 10Z" />
    {/* Crochets bas */}
    <path d="M50 90 C44 90 40 86 42 80 C44 74 52 74 54 80 C56 86 52 90 50 90Z" />
    {/* Crochets gauche */}
    <path d="M10 50 C10 44 14 40 20 42 C26 44 26 52 20 54 C14 56 10 52 10 50Z" />
    {/* Crochets droite */}
    <path d="M90 50 C90 44 86 40 80 42 C74 44 74 52 80 54 C86 56 90 52 90 50Z" />
    {/* Cercle central */}
    <circle cx="50" cy="50" r="10" />
    {/* Petits losanges diagonaux */}
    <polygon points="50,28 56,34 50,40 44,34" />
    <polygon points="50,60 56,66 50,72 44,66" />
    <polygon points="28,50 34,44 40,50 34,56" />
    <polygon points="60,50 66,44 72,50 66,56" />
  </svg>
);

const AdinkraheneIcon = ({ size = 48, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Adinkrahene : cercles concentriques */}
    <circle cx="50" cy="50" r="8" />
    <circle cx="50" cy="50" r="20" />
    <circle cx="50" cy="50" r="32" />
    <circle cx="50" cy="50" r="44" />
    {/* Petits ornements aux 4 points cardinaux entre les cercles */}
    <line x1="50" y1="6" x2="50" y2="18" />
    <line x1="50" y1="82" x2="50" y2="94" />
    <line x1="6" y1="50" x2="18" y2="50" />
    <line x1="82" y1="50" x2="94" y2="50" />
  </svg>
);

const NkyinkyimIcon = ({ size = 48, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {/* Nkyinkyim : motif en zigzag/torsion adaptable */}
    <path d="M10 50 C10 30 22 20 30 30 C38 40 38 60 50 60 C62 60 62 40 70 30 C78 20 90 30 90 50" />
    <path d="M10 50 C10 70 22 80 30 70 C38 60 38 40 50 40 C62 40 62 60 70 70 C78 80 90 70 90 50" />
    {/* Points aux articulations */}
    <circle cx="30" cy="30" r="3" fill="currentColor" stroke="none" />
    <circle cx="50" cy="60" r="3" fill="currentColor" stroke="none" />
    <circle cx="70" cy="30" r="3" fill="currentColor" stroke="none" />
    <circle cx="30" cy="70" r="3" fill="currentColor" stroke="none" />
    <circle cx="50" cy="40" r="3" fill="currentColor" stroke="none" />
    <circle cx="70" cy="70" r="3" fill="currentColor" stroke="none" />
  </svg>
);

interface Category {
  id: string;
  name_fr: string;
  name_en: string;
  color: string;
}

export interface MediaItem {
  type:
  | "image"
  | "video"
  | "link"
  | "youtube"
  | "code"
  | "gallery"
  | "quote_hero"
  | "text_table";
  url: string;
  caption?: string;
  alt?: string;
  youtube_id?: string;
  code_language?: string;
  code_content?: string;
  gallery_urls?: string[];
  quote_text?: string;
  quote_author?: string;
  layout?: "contained" | "full-bleed" | "wide";
}

export interface Source {
  title: string;
  url: string;
  author?: string;
  date?: string;
}

export interface MacroChartData {
  id: string;
  chart_id: string;
  series_id: string | null;
  label_fr: string;
  label_en: string;
  period?: string | null;
  value: number | null;
  x_value?: number | null;
  y_value?: number | null;
  size_value?: number | null;
  color: string;
  sort_order: number;
  is_total?: boolean;
  data_status?: string | null;
  annotation_fr?: string | null;
  annotation_en?: string | null;
}
export interface MacroChart {
  id: string;
  category_id: string;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  chart_type:
  | "bar"
  | "line"
  | "pie"
  | "donut"
  | "stacked_bar"
  | "stacked_bar_100"
  | "multi_line"
  | "combo"
  | "radar"
  | "scatter"
  | "bubble"
  | "population_pyramid"
  | "waterfall";
  unit_fr: string;
  unit_en: string;
  secondary_unit_fr?: string; // ⬅️ ajouté
  secondary_unit_en?: string; // ⬅️ ajouté
  source_fr: string;
  source_en: string;
  is_active: boolean;
  workflow_status?: string;
  data_status?: string;
  dataPoints: MacroChartData[];
  macro_chart_series?: any[];
  macro_chart_annotations?: any[];
}

export type UnifiedItem = {
  itemType: "article" | "archive";
  id: string;
  article_type?: "written" | "audio";
  title_fr: string;
  title_en: string;
  summary_fr: string;
  summary_en: string;
  content_fr: string;
  content_en: string;
  cover_url: string;
  audio_url?: string;
  reading_audio_url?: string;
  audio_content_url?: string;
  audio_duration?: string;
  audio_host?: string;
  author_or_source: string;
  date: string;
  published_at?: string;
  scheduled_publish_at?: string;
  category_id: string;
  category_color: string;
  category_name_fr: string;
  category_name_en: string;
  location_city?: string;
  location_country?: string;
  format?: "image" | "video" | "audio";
  source_url?: string;
  media_items?: MediaItem[];
  sources?: Source[];
  reading_time_minutes?: number;
  related_articles_ids?: string[];
  related_charts_ids?: string[];
  cover_type?: "image" | "video_loop" | "gif";
  cover_video_url?: string;
  is_live?: boolean;
  is_breaking?: boolean;
  author?: {
    id: string;
    name: string;
    role_fr: string;
    role_en: string;
    bio_fr?: string;
    bio_en?: string;
    avatar_url?: string;
    twitter_url?: string;
  } | null;
  related_teasers?: {
    article_id: string;
    kicker_fr: string;
    kicker_en: string;
    insert_index: number;
  }[];

  font_size?: 'small' | 'normal' | 'large' | 'xlarge';
  font_family?: string;
  status?: string;
};

export interface UserProfile {
  avatar_url: string | null;
  full_name: string | null;
}

interface SocialSettings {
  whatsapp_number: string;
  whatsapp_message: string;
  instagram_url: string;
  facebook_url: string;
  wa_active: boolean;
  ig_active: boolean;
  fb_active: boolean;
}

interface PressComment {
  id: string;
  article_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  content: string;
  parent_comment_id?: string;
  is_blocked: boolean;
  created_at: string;
}

export interface PressAnnouncement {
  id: string;
  title_fr: string;
  title_en?: string;
  description_fr?: string;
  description_en?: string;
  image_url: string;
  legend_fr?: string;
  legend_en?: string;
  link_url?: string;
  status: "active" | "draft";
  created_at?: string;
}

interface DigestItem {
  id: string;
  label_fr: string;
  label_en: string;
  article_ids: string[];
  design: 'classic' | 'grid' | 'carousel' | 'ranked' | 'hero_list' | 'timeline' | 'diptych';
  accent_color: string;
  position_after_index: number;
  is_active: boolean;
  priority: number;
}
// ─── Helpers ──────────────────────────────────────────────────────────────────

export const estimateReadingTime = (text?: string) =>
  Math.max(1, Math.ceil((text?.trim().split(/\s+/).length ?? 0) / 200));

export const stripMarkdown = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[MEDIA:\d+\]/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getThumbnailUrl = (url: string, format?: string) => {
  if (format === "video" && url && url.includes("cloudinary.com")) {
    return url.replace(/\.[^/.]+$/, ".jpg");
  }
  return url;
};

/**
 * Vérifie si un article programmé doit être visible côté utilisateur
 * en comparant avec l'heure locale du navigateur (pas celle de Supabase).
 */
const isArticleVisible = (item: UnifiedItem): boolean => {
  if (item.status === "published") return true;
  if (item.status === "scheduled" && item.scheduled_publish_at) {
    const scheduledLocal = new Date(item.scheduled_publish_at);
    const nowLocal = new Date();
    return nowLocal >= scheduledLocal;
  }
  return false;
};

export const formatPublishedDate = (
  dateStr: string | undefined,
  lang: "fr" | "en",
  withTime = false,
): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  };
  return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", opts);
};

// Rendu markdown vers HTML pur (sans composants React)
// Utilise le nouveau moteur markdown robust (voir lib/markdown.ts)
export const renderMarkdownToHtml = async (
  raw: string,
  mediaItems?: MediaItem[],
): Promise<string> => {
  if (!raw) return "";

  // Importer dynamiquement pour éviter les problèmes de bundling
  const { renderMarkdownToHtml: renderMd } = await import('@/lib/markdown');

  let html = await renderMd(raw);

  // Insérer les médias (simple, video, link)
  if (mediaItems && mediaItems.length > 0) {
    mediaItems.forEach((media, index) => {
      const marker = `[MEDIA:${index}]`;
      let block = "";

      if (media.type === "image") {
        const wrapClass =
          media.layout === "full-bleed"
            ? "my-10 -mx-4 md:-mx-20 lg:-mx-40"
            : media.layout === "wide"
              ? "my-10 -mx-4 md:-mx-8 lg:-mx-16"
              : "my-8";
        block = `<figure class="${wrapClass} rounded-2xl overflow-hidden border border-[#0466c8]/20">
          <img src="${media.url}" alt="${media.alt || media.caption || ''}" class="w-full object-cover" loading="lazy" />
          ${media.caption ? `<figcaption class="px-4 py-3 text-center text-xs text-[#90e0ef]/50 italic bg-[#001233]/40">${media.caption}</figcaption>` : ''}
        </figure>`;
      } else if (media.type === "video") {
        block = `<figure class="my-8">
          <video controls class="w-full rounded-2xl border border-[#0466c8]/20" preload="metadata">
            <source src="${media.url}" />
          </video>
          ${media.caption ? `<figcaption class="text-center text-xs text-[#90e0ef]/50 mt-3 italic">${media.caption}</figcaption>` : ''}
        </figure>`;
      } else if (media.type === "youtube") {
        const ytId = media.youtube_id || media.url;
        block = `<div class="my-8 youtube-wrapper" style="position: relative; z-index: 100; isolation: isolate; transform: translateZ(0);">
    <figure class="m-0">
      <div class="aspect-video rounded-2xl overflow-hidden border border-[#0466c8]/20" style="position: relative;">
        <iframe
          src="https://www.youtube.com/embed/${ytId}"
          class="w-full h-full"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
          style="pointer-events: auto !important; position: relative; z-index: 10; transform: translateZ(0);"
        ></iframe>
      </div>
      ${media.caption ? `<figcaption class="text-center text-xs text-[#90e0ef]/50 mt-3 italic">${media.caption}</figcaption>` : ''}
    </figure>
  </div>`;
      } else if (media.type === "link") {
        block = `<a href="${media.url}" target="_blank" rel="noopener noreferrer"
          class="flex items-center gap-3 my-6 p-4 bg-[#001233]/60 border border-[#0466c8]/30 rounded-2xl hover:border-[#0466c8]/60 transition-all group">
          <span>🔗</span>
          <span class="text-[#48cae4] font-medium text-sm group-hover:underline">${media.caption || media.url}</span>
        </a>`;
      }

      html = html.replace(marker, block);
    });
  }

  return html;
};

// Découpe le contenu en segments interleaved (texte HTML + composants React)
type ContentSegment =
  | { kind: "html"; content: string }
  | { kind: "chart"; index: number }
  | { kind: "related"; index: number }
  | { kind: "media_code"; index: number }
  | { kind: "media_gallery"; index: number }
  | { kind: "media_quote"; index: number }
  | { kind: "announcement" };

export const parseContentSegments = (
  html: string,
  mediaItems?: MediaItem[],
): ContentSegment[] => {
  if (!html) return [];

  const segments: ContentSegment[] = [];

  // ──────────────────────────────────────────────────────────────
  // 1. REMPLACER LES MARQUEURS [MEDIA:x] PAR LE HTML RÉEL
  // (Images, Vidéos, YouTube, Liens)
  // ──────────────────────────────────────────────────────────────
  if (mediaItems && mediaItems.length > 0) {
    mediaItems.forEach((media, index) => {
      const marker = `[MEDIA:${index}]`;
      let block = "";

      if (media.type === "image") {
        const wrapClass =
          media.layout === "full-bleed"
            ? "my-10 -mx-4 md:-mx-20 lg:-mx-40"
            : media.layout === "wide"
              ? "my-10 -mx-4 md:-mx-8 lg:-mx-16"
              : "my-8";
        block = `<figure class="${wrapClass} rounded-2xl overflow-hidden border border-[#0466c8]/20">
          <img src="${media.url}" alt="${media.alt || media.caption || ""}" class="w-full object-cover" loading="lazy" />
          ${media.caption ? `<figcaption class="px-4 py-3 text-center text-xs text-[#90e0ef]/50 italic bg-[#001233]/40">${media.caption}</figcaption>` : ""}
        </figure>`;
      } else if (media.type === "video") {
        block = `<figure class="my-8">
          <video controls class="w-full rounded-2xl border border-[#0466c8]/20" preload="metadata">
            <source src="${media.url}" />
          </video>
          ${media.caption ? `<figcaption class="text-center text-xs text-[#90e0ef]/50 mt-3 italic">${media.caption}</figcaption>` : ""}
        </figure>`;
      } else if (media.type === "youtube") {
        const ytId = media.youtube_id || media.url;
        block = `<div class="my-8 youtube-wrapper" style="position: relative; z-index: 100; isolation: isolate; transform: translateZ(0);">
    <figure class="m-0">
      <div class="aspect-video rounded-2xl overflow-hidden border border-[#0466c8]/20" style="position: relative;">
        <iframe
          src="https://www.youtube.com/embed/${ytId}"
          class="w-full h-full"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
          style="pointer-events: auto !important; position: relative; z-index: 10; transform: translateZ(0);"
        ></iframe>
      </div>
      ${media.caption ? `<figcaption class="text-center text-xs text-[#90e0ef]/50 mt-3 italic">${media.caption}</figcaption>` : ""}
    </figure>
  </div>`;
      } else if (media.type === "link") {
        block = `<a href="${media.url}" target="_blank" rel="noopener noreferrer"
          class="flex items-center gap-3 my-6 p-4 bg-[#001233]/60 border border-[#0466c8]/30 rounded-2xl hover:border-[#0466c8]/60 transition-all group">
          <span>🔗</span>
          <span class="text-[#48cae4] font-medium text-sm group-hover:underline">${media.caption || media.url}</span>
        </a>`;
      }

      // Remplacer le marqueur par le bloc HTML (pour image/video/youtube/link)
      if (block) {
        html = html.replace(marker, block);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // 2. CONVERTIR LES MARQUEURS DES TYPES COMPLEXES
  // [MEDIA:x] → [MEDIA_CODE:x], [MEDIA_GALLERY:x], [MEDIA_QUOTE:x]
  // ──────────────────────────────────────────────────────────────
  if (mediaItems && mediaItems.length > 0) {
    mediaItems.forEach((media, index) => {
      const marker = `[MEDIA:${index}]`;
      if (media.type === "code") {
        html = html.replace(marker, `[MEDIA_CODE:${index}]`);
      } else if (media.type === "gallery") {
        html = html.replace(marker, `[MEDIA_GALLERY:${index}]`);
      } else if (media.type === "quote_hero") {
        html = html.replace(marker, `[MEDIA_QUOTE:${index}]`);
      } else if (media.type === "text_table") {
        const tableHtml = media.code_content || "";
        html = html.replace(marker, `<div class="my-6">${tableHtml}</div>`);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // 3. TRAITER LES BLOCS MARKDOWN (code_language === 'markdown')
  // Les convertir en HTML au lieu de les laisser comme segments CodeBlock
  // ──────────────────────────────────────────────────────────────
  if (mediaItems && mediaItems.length > 0) {
    mediaItems.forEach((media, index) => {
      if (media.type === "code" && media.code_language === "markdown") {
        const marker = `[MEDIA_CODE:${index}]`;
        const markdownContent = media.code_content || "";

        // Conversion synchrone basique du markdown en HTML
        let markdownHtml = markdownContent;

        // Tableaux
        markdownHtml = markdownHtml.replace(/^(\|.+\|)\n(\|[\s-:|]+\|)\n((?:\|.+\|\n?)+)/gm, (match, header, separator, rows) => {
          const headerCells = header.split('|').filter(c => c.trim()).map(c =>
            `<th class="bg-[#0466c8]/20 border border-[#0466c8]/30 px-4 py-3 text-left text-white font-bold">${c.trim()}</th>`
          ).join('');
          const bodyRows = rows.trim().split('\n').map(row => {
            const cells = row.split('|').filter(c => c.trim()).map(c =>
              `<td class="border border-white/10 px-4 py-2.5 text-white/70">${c.trim()}</td>`
            ).join('');
            return `<tr>${cells}</tr>`;
          }).join('');
          return `<table class="w-full border-collapse my-6 text-base text-white/80"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
        });

        // Titres
        markdownHtml = markdownHtml.replace(/^### (.+)$/gm, '<h3 class="text-2xl font-serif font-bold text-[#90e0ef] mt-8 mb-4 leading-tight">$1</h3>');
        markdownHtml = markdownHtml.replace(/^## (.+)$/gm, '<h2 class="text-3xl md:text-4xl font-serif font-bold text-white mt-12 mb-6 pb-4 border-b-2 border-[#D4AF37] leading-tight">$1</h2>');

        // Gras et italique
        markdownHtml = markdownHtml.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
        markdownHtml = markdownHtml.replace(/\*(.+?)\*/g, '<em class="italic text-[#90e0ef]/90">$1</em>');

        // Listes
        markdownHtml = markdownHtml.replace(/^- (.+)$/gm, '<li class="list-disc marker:text-[#D4AF37] marker:font-bold mb-2">$1</li>');
        markdownHtml = markdownHtml.replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="my-6 ml-8 space-y-3 text-base md:text-lg text-white/80">$&</ul>');

        // Paragraphes
        markdownHtml = markdownHtml.split('\n\n').map(p => {
          const trimmed = p.trim();
          if (!trimmed || trimmed.startsWith('<')) return trimmed;
          return `<p class="mb-6 leading-[1.85] text-base md:text-lg text-white/85 font-light">${trimmed}</p>`;
        }).join('\n');

        // Caption
        if (media.caption) {
          markdownHtml = `<div class="my-8 p-5 bg-[#001233]/40 border border-[#0466c8]/20 rounded-2xl">${markdownHtml}<p class="text-center text-xs text-[#90e0ef]/50 italic mt-4">${media.caption}</p></div>`;
        } else {
          markdownHtml = `<div class="my-8">${markdownHtml}</div>`;
        }

        html = html.replace(marker, markdownHtml);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // 4. DÉCOUPER LE HTML EN SEGMENTS RÉACT
  // (Charts, Related, Code, Gallery, Quote, Announcement)
  // ──────────────────────────────────────────────────────────────
  const markerRegex =
    /\[CHART:(\d+)\]|\[RELATED:(\d+)\]|\[MEDIA_CODE:(\d+)\]|\[MEDIA_GALLERY:(\d+)\]|\[MEDIA_QUOTE:(\d+)\]|\[ANNOUNCEMENT\]/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        kind: "html",
        content: html.slice(lastIndex, match.index),
      });
    }
    if (match[1] !== undefined) {
      segments.push({ kind: "chart", index: parseInt(match[1]) });
    } else if (match[2] !== undefined) {
      segments.push({ kind: "related", index: parseInt(match[2]) });
    } else if (match[3] !== undefined) {
      segments.push({ kind: "media_code", index: parseInt(match[3]) });
    } else if (match[4] !== undefined) {
      segments.push({ kind: "media_gallery", index: parseInt(match[4]) });
    } else if (match[5] !== undefined) {
      segments.push({ kind: "media_quote", index: parseInt(match[5]) });
    } else if (match[0] === "[ANNOUNCEMENT]") {
      segments.push({ kind: "announcement" });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) {
    segments.push({ kind: "html", content: html.slice(lastIndex) });
  }

  return segments;
};

// ─── Icône Cauris ─────────────────────────────────────────────────────────────

export const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <defs>
      <linearGradient id="caurisGlowPress" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    <path
      fill="url(#caurisGlowPress)"
      d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5Z
         M50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z"
    />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path
      d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Reading Progress Bar ─────────────────────────────────────────────────────

export const ReadingProgressBar = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-[#0466c8] origin-left z-[200]"
      style={{ scaleX, boxShadow: "0 0 10px #0466c8, 0 0 20px #0466c880" }}
    />
  );
};

// ─── View Switcher ────────────────────────────────────────────────────────────

const ViewSwitcher = ({
  current,
  onChange,
  lang,
}: {
  current: "magazine" | "list" | "cinema";
  onChange: (v: "magazine" | "list" | "cinema") => void;
  lang: "fr" | "en";
}) => {
  const views = [
    { key: "list" as const, Icon: List, label_fr: "Liste", label_en: "List" },
    {
      key: "magazine" as const,
      Icon: LayoutGrid,
      label_fr: "Magazine",
      label_en: "Magazine",
    },
    {
      key: "cinema" as const,
      Icon: Film,
      label_fr: "Cinéma",
      label_en: "Cinema",
    },
  ];
  return (
    <div className="flex items-center gap-1 bg-[#000d1a] border border-[#0466c8]/20 rounded-full p-1 backdrop-blur-sm">
      {views.map(({ key, Icon, label_fr, label_en }) => (
        <motion.button
          key={key}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${current === key
            ? "bg-[#0466c8] text-white shadow-[0_0_20px_rgba(4,102,200,0.4)]"
            : "text-[#90e0ef]/50 hover:text-[#90e0ef]"
            }`}
        >
          <Icon size={11} />
          <span className="hidden sm:block">
            {lang === "fr" ? label_fr : label_en}
          </span>
        </motion.button>
      ))}
    </div>
  );
};

// ─── Article Card ─────────────────────────────────────────────────────────────

const ArticleCard = ({
  article,
  lang,
  index,
  onClick,
  variant = "standard",
}: {
  article: UnifiedItem;
  lang: "fr" | "en";
  index: number;
  onClick: () => void;
  variant?: "hero" | "featured" | "standard" | "list" | "cinema";
}) => {
  const title = lang === "fr" ? article.title_fr : article.title_en;
  const summary = lang === "fr" ? article.summary_fr : article.summary_en;
  const cat =
    lang === "fr" ? article.category_name_fr : article.category_name_en;
  const starColor = article.category_color || "#0466c8";
  const readTime =
    article.reading_time_minutes ||
    estimateReadingTime(
      lang === "fr" ? article.content_fr : article.content_en,
    );
  const dateStr = formatPublishedDate(
    article.published_at || article.date,
    lang,
  );
  const isArchive = article.itemType === "archive";
  const isAudio =
    article.article_type === "audio" ||
    (isArchive && article.format === "audio");
  const displayCover = getThumbnailUrl(article.cover_url, article.format);

  if (variant === "list") {
    return (
      <motion.article
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ delay: index * 0.04, duration: 0.45 }}
        onClick={onClick}
        className="group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-[#0466c8]/10 bg-gradient-to-r from-[#001233]/40 to-transparent cursor-pointer hover:border-[#0466c8]/30 hover:bg-[#001233]/60 transition-all"
      >
        <div className="relative w-full sm:w-24 sm:h-24 h-40 rounded-xl overflow-hidden flex-shrink-0 border border-[#0466c8]/20 order-first sm:order-none">
          {displayCover ? (
            <motion.img
              src={displayCover}
              alt={title}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.5 }}
            />
          ) : (
            <div className="w-full h-full bg-[#001233] flex items-center justify-center">
              <Newspaper size={20} className="text-[#0466c8]" />
            </div>
          )}
          {isAudio && (
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#0466c8] rounded-full flex items-center justify-center">
              <Mic size={10} className="text-white" />
            </div>
          )}
          {article.reading_audio_url && !isAudio && (
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#0353a4] rounded-full flex items-center justify-center">
              <Headphones size={10} className="text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 w-full sm:w-auto">
          {(article.is_live || article.is_breaking) && (
            <div className="flex items-center gap-1.5 mb-1.5">
              {article.is_live && (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-wider rounded-full border border-red-500/30 flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  {lang === "fr" ? "EN DIRECT" : "LIVE"}
                </motion.span>
              )}
              {article.is_breaking && (
                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[8px] font-black uppercase tracking-wider rounded-full border border-orange-500/30">
                  ⚡ BREAKING
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <motion.div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: starColor,
                boxShadow: `0 0 8px ${starColor}`,
              }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span
              className="text-[8px] font-black uppercase tracking-[0.1em]"
              style={{ color: starColor }}
            >
              {cat}
            </span>
            {isArchive && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[8px] uppercase tracking-wider rounded-full border border-orange-500/30">
                {isAudio ? "Audio externe" : "Média externe"}
              </span>
            )}
            {isAudio && !isArchive && (
              <span className="px-2 py-0.5 bg-[#001233] text-[#90e0ef] text-[8px] uppercase tracking-wider rounded-full border border-[#0466c8]/30 flex items-center gap-1">
                <Radio size={8} /> Podcast
              </span>
            )}
          </div>
          <h3 className="font-serif text-white text-base leading-snug group-hover:text-[#90e0ef] transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
          <p className="text-[#90e0ef]/30 text-xs line-clamp-2 mb-3 sm:hidden">
            {summary}
          </p>
          <p className="text-[#90e0ef]/30 text-xs line-clamp-1 mb-2 hidden sm:block">
            {summary}
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[#90e0ef]/25 text-[9px]">
            {!isArchive && (
              <span className="flex items-center gap-1">
                <Clock size={8} /> {readTime} min
              </span>
            )}
            {dateStr && (
              <span className="flex items-center gap-1">
                <Calendar size={8} /> {dateStr}
              </span>
            )}
            {article.location_city && (
              <span className="flex items-center gap-1">
                <MapPin size={8} /> {article.location_city}
              </span>
            )}
            {!isArchive && (
              <span className="flex items-center gap-1">
                <User size={8} /> {article.author_or_source}
              </span>
            )}
          </div>
        </div>
        <ChevronRight
          size={16}
          className="flex-shrink-0 text-[#0466c8]/20 group-hover:text-[#0466c8] group-hover:translate-x-1 transition-all hidden sm:block"
        />
      </motion.article>
    );
  }

  if (variant === "cinema") {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.07, duration: 0.6 }}
        onClick={onClick}
        className="group relative cursor-pointer"
      >
        <div className="relative aspect-video rounded-2xl overflow-hidden border border-[#0466c8]/20 hover:border-[#0466c8]/50 transition-all duration-500 hover:-translate-y-1">
          {displayCover ? (
            <motion.img
              src={displayCover}
              alt={title}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.7 }}
            />
          ) : (
            <div className="w-full h-full bg-[#000d1a] flex items-center justify-center">
              <Newspaper size={48} className="text-[#0466c8]/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#000814] via-transparent to-transparent" />
          <motion.div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div
              className="w-14 h-14 rounded-full border-2 border-[#90e0ef] bg-[#0466c8]/20 backdrop-blur-sm flex items-center justify-center"
              style={{ boxShadow: `0 0 30px ${starColor}50` }}
            >
              <Play size={20} className="text-[#90e0ef] ml-1" />
            </div>
          </motion.div>
          {isAudio && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-[#0466c8]/30 rounded-full">
              <motion.div
                className="w-1 h-1 bg-[#0466c8] rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <Mic size={9} className="text-[#90e0ef]" />
            </div>
          )}
          {isArchive && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-orange-500/80 backdrop-blur-md text-white font-bold text-[8px] uppercase tracking-wider rounded border border-orange-400/30">
              {article.author_or_source}
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: starColor }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span
                className="text-[8px] font-black uppercase tracking-wider"
                style={{ color: starColor }}
              >
                {cat}
              </span>
              {!isArchive && (
                <span className="ml-auto flex items-center gap-1 text-[#90e0ef]/30 text-[8px]">
                  <Clock size={8} /> {readTime} min
                </span>
              )}
            </div>
            <h3 className="font-serif text-white text-sm leading-snug group-hover:text-[#90e0ef] transition-colors line-clamp-2">
              {title}
            </h3>
          </div>
        </div>
      </motion.article>
    );
  }

  const aspectClass =
    {
      hero: "aspect-[16/9] md:aspect-[21/9]",
      featured: "aspect-[4/3]",
      standard: "aspect-[3/4]",
    }[variant as "hero" | "featured" | "standard"] ?? "aspect-[3/4]";

  return (
    <motion.article
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 6) * 0.08, duration: 0.7 }}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      <motion.div
        className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${starColor}20 0%, transparent 70%)`,
        }}
      />
      <div
        className={`relative ${aspectClass} rounded-2xl overflow-hidden border border-[#0466c8]/10 bg-[#000d1a] hover:border-[#0466c8]/40 transition-all duration-500 hover:-translate-y-1`}
      >
        {displayCover ? (
          <motion.img
            src={displayCover}
            alt={title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.06 }}
            transition={{ duration: 0.8 }}
          />
        ) : (
          <div className="w-full h-full bg-[#001233] flex items-center justify-center">
            <Newspaper size={56} className="text-[#0466c8]/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000814] via-[#000814]/30 to-transparent" />

        {isAudio && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-[#0466c8]/30 rounded-full">
            <motion.div
              className="w-1.5 h-1.5 bg-[#0466c8] rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <Mic size={10} className="text-[#90e0ef]" />
            <span className="text-[8px] font-black text-[#90e0ef] uppercase tracking-wider">
              Audio
            </span>
          </div>
        )}
        {article.reading_audio_url && !isAudio && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-[#0353a4]/30 rounded-full">
            <Headphones size={10} className="text-[#90e0ef] animate-pulse" />
            <span className="text-[8px] font-black text-[#90e0ef] uppercase tracking-wider">
              Lecture
            </span>
          </div>
        )}
        {isArchive && article.format === "video" && !isAudio && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-[#0466c8]/30 rounded-full">
            <Video size={10} className="text-[#90e0ef]" />
            <span className="text-[8px] font-black text-[#90e0ef] uppercase tracking-wider">
              Vidéo
            </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
          {article.is_live && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase rounded-full flex items-center gap-1 mr-1"
            >
              <span className="w-1 h-1 bg-white rounded-full" /> LIVE
            </motion.span>
          )}
          {article.is_breaking && !article.is_live && (
            <span className="px-2 py-0.5 bg-orange-500/80 text-white text-[8px] font-black uppercase rounded-full mr-1">
              ⚡ BREAKING
            </span>
          )}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <motion.div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: starColor,
                boxShadow: `0 0 8px ${starColor}`,
              }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span
              className="text-[8px] font-black uppercase tracking-[0.2em]"
              style={{ color: starColor }}
            >
              {cat}
            </span>
            {isArchive && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[8px] uppercase tracking-wider rounded-full border border-orange-500/30 ml-auto">
                {article.author_or_source}
              </span>
            )}
            {!isArchive && (
              <span className="flex items-center gap-1 text-[#90e0ef]/30 text-[8px] ml-auto">
                <Clock size={8} /> {readTime} min
              </span>
            )}
          </div>
          <h3
            className={`font-serif text-white leading-snug group-hover:text-[#90e0ef] transition-colors duration-300 ${variant === "hero"
              ? "text-2xl md:text-4xl"
              : variant === "featured"
                ? "text-lg md:text-xl"
                : "text-sm line-clamp-3"
              }`}
          >
            {title}
          </h3>
          {variant === "hero" && (
            <>
              <p className="text-[#90e0ef]/40 text-sm mt-3 line-clamp-2 max-w-2xl">
                {summary}
              </p>
              <motion.div
                className="flex items-center gap-2 mt-5 text-[#90e0ef] text-sm font-bold"
                whileHover={{ x: 6 }}
              >
                <span>
                  {lang === "fr" ? "Lire le récit" : "Read the story"}
                </span>
                <ChevronRight size={16} />
              </motion.div>
            </>
          )}
          {article.location_city && !isArchive && (
            <div className="flex items-center gap-1 text-[#90e0ef]/30 text-[8px] mt-2">
              <MapPin size={8} /> <span>{article.location_city}</span>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
};

// ─── News Ticker ──────────────────────────────────────────────────────────────

const NewsTicker = ({
  articles,
  lang,
  onSelect,
}: {
  articles: UnifiedItem[];
  lang: "fr" | "en";
  onSelect: (a: UnifiedItem) => void;
}) => {
  const items = [...articles.slice(0, 8), ...articles.slice(0, 8)];
  return (
    <div className="relative overflow-hidden border-y border-[#0466c8]/20 bg-gradient-to-r from-[#000814] via-[#001233]/50 to-[#000814] backdrop-blur-sm py-3 mb-16">
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#000814] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#000814] to-transparent pointer-events-none" />
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 bg-[#000814] pr-4">
        <motion.div
          className="w-1.5 h-1.5 bg-[#0466c8] rounded-full"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <Zap size={10} className="text-[#0466c8]" />
        <span className="text-[#90e0ef] text-[8px] font-black uppercase tracking-widest">
          {lang === "fr" ? "Récits & Archives" : "Stories & Archives"}
        </span>
      </div>
      <motion.div
        className="flex items-center gap-10 pl-40"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 35, ease: "linear", repeat: Infinity }}
      >
        {items.map((article, i) => {
          const title = lang === "fr" ? article.title_fr : article.title_en;
          const color = article.category_color || "#0466c8";
          const displayThumb = getThumbnailUrl(
            article.cover_url,
            article.format,
          );
          const maxLen = 45;
          return (
            <button
              key={`${article.id}-${i}`}
              onClick={() => onSelect(article)}
              className="flex items-center gap-3 shrink-0 group/ticker"
            >
              <motion.div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {displayThumb && (
                <img
                  src={displayThumb}
                  className="w-7 h-7 rounded-full object-cover border border-[#0466c8]/30"
                  alt=""
                />
              )}
              <span className="text-[#90e0ef]/40 text-xs font-medium group-hover/ticker:text-[#90e0ef] transition-colors whitespace-nowrap">
                {(title?.length ?? 0) > maxLen
                  ? `${title?.slice(0, maxLen)}…`
                  : title}
              </span>
              <ChevronRight
                size={10}
                className="text-[#0466c8]/30 flex-shrink-0"
              />
            </button>
          );
        })}
      </motion.div>
    </div>
  );
};

// ─── Comments Section ─────────────────────────────────────────────────────────

export const CommentsSection = ({
  articleId,
  lang,
  user,
  userProfile,
}: {
  articleId: string;
  lang: "fr" | "en";
  user: any;
  userProfile: UserProfile | null;
}) => {
  const [comments, setComments] = useState<PressComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const t = {
    title: lang === "fr" ? "Commentaires" : "Comments",
    placeholder:
      lang === "fr" ? "Partagez votre avis..." : "Share your thoughts...",
    submit: lang === "fr" ? "Publier" : "Post",
    login:
      lang === "fr"
        ? "🔒 Connectez-vous pour commenter"
        : "🔒 Log in to comment",
    blocked:
      lang === "fr"
        ? "⛔ Vous êtes bloqué et ne pouvez pas commenter"
        : "⛔ You are blocked from commenting",
    empty:
      lang === "fr"
        ? "💬 Soyez le premier à commenter cet article."
        : "💬 Be the first to comment on this article.",
    ago: lang === "fr" ? "il y a" : "",
    justNow: lang === "fr" ? "À l'instant" : "Just now",
    writing: lang === "fr" ? "Vous commentez en tant que" : "Commenting as",
  };

  const formatTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return t.justNow;
    if (lang === "fr") {
      if (mins < 60) return `il y a ${mins} min`;
      if (hrs < 24) return `il y a ${hrs}h`;
      return `il y a ${days}j`;
    } else {
      if (mins < 60) return `${mins}m ago`;
      if (hrs < 24) return `${hrs}h ago`;
      return `${days}d ago`;
    }
  };

  useEffect(() => {
    fetchComments();
    if (user) checkIfBlocked();
  }, [articleId, user]);

  const fetchComments = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("press_comments")
      .select("*")
      .eq("article_id", articleId)
      .eq("is_blocked", false)
      .order("created_at", { ascending: false });
    if (data) setComments(data);
    setIsLoading(false);
  };

  const checkIfBlocked = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    setIsBlocked(!!data);
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user || isBlocked) return;
    setIsSubmitting(true);
    const displayName =
      userProfile?.full_name || user.email?.split("@")[0] || "Utilisateur";
    const { data, error } = await supabase
      .from("press_comments")
      .insert({
        article_id: articleId,
        user_id: user.id,
        user_email: user.email,
        user_name: displayName,
        content: newComment.trim(),
        is_blocked: false,
      })
      .select()
      .single();

    if (!error && data) {
      setComments((prev) => [data, ...prev]);
      setNewComment("");
    }
    setIsSubmitting(false);
  };

  const avatarLetter = (
    userProfile?.full_name?.charAt(0) ||
    user?.email?.charAt(0) ||
    "?"
  ).toUpperCase();

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="pt-8 border-t border-[#0466c8]/20"
    >
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle size={18} className="text-[#0466c8]" />
        <h3 className="text-base font-bold text-white">
          {t.title} ({comments.length})
        </h3>
      </div>

      {/* Zone de saisie */}
      {!user ? (
        <div className="p-4 bg-[#001233]/60 border border-[#0466c8]/20 rounded-2xl text-[#90e0ef]/60 text-sm mb-6">
          {t.login}
        </div>
      ) : isBlocked ? (
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-300 text-sm mb-6">
          {t.blocked}
        </div>
      ) : (
        <div className="mb-8">
          {/* Info utilisateur connecté */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-[#0466c8]/40 flex-shrink-0">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#0466c8] flex items-center justify-center text-white text-[9px] font-black">
                  {avatarLetter}
                </div>
              )}
            </div>
            <span className="text-[#90e0ef]/40 text-[10px]">
              {t.writing}{" "}
              <strong className="text-[#90e0ef]/70">
                {userProfile?.full_name || user.email}
              </strong>
            </span>
          </div>

          <div className="relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t.placeholder}
              rows={3}
              className="w-full bg-[#000d1a] border border-[#0466c8]/20 rounded-2xl px-5 py-4 text-white text-sm placeholder:text-[#90e0ef]/20 focus:outline-none focus:border-[#0466c8]/50 resize-none transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                  handleSubmit();
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={isSubmitting || !newComment.trim()}
              className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-[#0466c8] hover:bg-[#0353a4] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all"
              style={{
                boxShadow: newComment.trim()
                  ? "0 0 15px rgba(4,102,200,0.3)"
                  : "none",
              }}
            >
              {isSubmitting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              {t.submit}
            </motion.button>
          </div>
          <p className="text-[#90e0ef]/20 text-[9px] mt-2 ml-1">
            Ctrl+Enter {lang === "fr" ? "pour publier" : "to post"}
          </p>
        </div>
      )}

      {/* Liste des commentaires */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <CaurisIcon className="w-8 h-8 text-[#0466c8]/40" />
          </motion.div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-[#90e0ef]/30 text-sm">
          {t.empty}
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment, i) => {
            const isOwn = user && comment.user_id === user.id;
            const initials = (
              comment.user_name?.charAt(0) || "?"
            ).toUpperCase();
            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex gap-3 p-4 rounded-2xl border transition-all ${isOwn
                  ? "bg-[#001233]/80 border-[#0466c8]/30"
                  : "bg-[#000d1a]/60 border-[#0466c8]/10"
                  }`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden border border-[#0466c8]/30 flex-shrink-0">
                  <div className="w-full h-full bg-gradient-to-br from-[#0466c8] to-[#023e8a] flex items-center justify-center text-white text-xs font-black">
                    {initials}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-white text-xs font-bold">
                      {comment.user_name}
                    </span>
                    {isOwn && (
                      <span className="px-2 py-0.5 bg-[#0466c8]/20 text-[#90e0ef] text-[8px] font-bold rounded-full border border-[#0466c8]/30">
                        {lang === "fr" ? "Vous" : "You"}
                      </span>
                    )}
                    <span className="text-[#90e0ef]/25 text-[9px] ml-auto">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-[#90e0ef]/60 text-sm leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
};

// ─── Announcements Carousel ───────────────────────────────────────────

// ─── Announcements Carousel ───────────────────────────────────────────

const AnnouncementsCarousel = ({
  announcements,
  lang,
}: {
  announcements: PressAnnouncement[];
  lang: "fr" | "en";
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const current = announcements[currentIndex];
  const title =
    lang === "fr" ? current.title_fr : current.title_en || current.title_fr;
  const description =
    lang === "fr"
      ? current.description_fr
      : current.description_en || current.description_fr;
  const legend =
    lang === "fr" ? current.legend_fr : current.legend_en || current.legend_fr;

  // Auto-play toutes les 30 secondes
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 30000); // 30 secondes

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [announcements.length]);

  const goToPrevious = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setCurrentIndex(
      (prev) => (prev - 1 + announcements.length) % announcements.length,
    );
    // Redémarrer l'autoplay
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 30000);
  };

  const goToNext = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
    // Redémarrer l'autoplay
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 30000);
  };

  if (!announcements || announcements.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.6 }}
      className="my-12 mx-auto max-w-2xl"
    >
      {/* Légende */}
      {legend && (
        <p className="text-center text-[#0466c8] text-xs font-black uppercase tracking-[0.3em] mb-4">
          {legend}
        </p>
      )}

      {/* Carousel Container — VERSION COMPACTE */}
      <div className="relative group">
        {/* Image petite + Content */}
        <div
          className="relative rounded-2xl overflow-hidden border border-[#0466c8]/20 bg-[#000d1a]"
          style={{ boxShadow: "0 0 30px rgba(4,102,200,0.08)" }}
        >
          <div className="flex flex-col md:flex-row gap-4 p-4 md:p-5">
            {/* Image — RÉDUITE */}
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="relative w-full md:w-40 h-32 md:h-40 flex-shrink-0 rounded-lg overflow-hidden"
            >
              <img
                src={current.image_url}
                alt={title}
                className="w-full h-full object-cover"
              />
              {/* Overlay subtil */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#000814]/40 to-transparent" />
            </motion.div>

            {/* Contenu texte — À CÔTÉ DE L'IMAGE */}
            <motion.div
              key={`text-${currentIndex}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex-1 flex flex-col justify-between py-1"
            >
              <div>
                <h3 className="text-white text-base md:text-lg font-serif font-bold mb-2 leading-snug line-clamp-2">
                  {title}
                </h3>
                {description && (
                  <p className="text-[#90e0ef]/60 text-xs md:text-sm leading-relaxed mb-3 line-clamp-2">
                    {description}
                  </p>
                )}
              </div>

              {/* Bouton CTA */}
              {current.link_url && (
                <motion.a
                  href={current.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-fit inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0466c8] hover:bg-[#0353a4] text-white rounded-lg font-bold text-xs transition-all"
                  style={{ boxShadow: "0 0 12px rgba(4,102,200,0.35)" }}
                >
                  {lang === "fr" ? "En savoir plus" : "Learn more"}
                  <ChevronRight size={12} />
                </motion.a>
              )}
            </motion.div>

            {/* Flèches — Alignées à droite */}
            <div className="flex md:flex-col gap-2 items-center justify-end">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToPrevious}
                className="w-8 h-8 rounded-full bg-[#0466c8] hover:bg-[#0353a4] text-white flex items-center justify-center shadow-lg transition-all opacity-70 hover:opacity-100"
                style={{ boxShadow: "0 0 15px rgba(4,102,200,0.4)" }}
              >
                <ChevronLeft size={16} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToNext}
                className="w-8 h-8 rounded-full bg-[#0466c8] hover:bg-[#0353a4] text-white flex items-center justify-center shadow-lg transition-all opacity-70 hover:opacity-100"
                style={{ boxShadow: "0 0 15px rgba(4,102,200,0.4)" }}
              >
                <ChevronRight size={16} />
              </motion.button>
            </div>
          </div>

          {/* Indicateurs (points) — EN BAS */}
          <div className="flex items-center justify-center gap-1.5 pb-3 px-4">
            {announcements.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  if (autoPlayRef.current) clearInterval(autoPlayRef.current);
                  setCurrentIndex(index);
                  autoPlayRef.current = setInterval(() => {
                    setCurrentIndex(
                      (prev) => (prev + 1) % announcements.length,
                    );
                  }, 30000);
                }}
                className={`rounded-full transition-all ${index === currentIndex
                  ? "w-6 h-1.5 bg-[#0466c8]"
                  : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                  }`}
                whileHover={{ scale: 1.15 }}
              />
            ))}
          </div>

          {/* Badge "En rotation" */}
          <div className="absolute top-3 right-4 z-10 flex items-center gap-1 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full border border-[#0466c8]/30">
            <motion.div
              className="w-1 h-1 bg-[#0466c8] rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[#90e0ef] text-[9px] font-bold uppercase tracking-wider">
              30s
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const CodeBlock = ({
  language,
  code,
  caption,
}: {
  language: string;
  code: string;
  caption?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Coloration syntaxique légère par token (sans dépendance lourde)
  const highlight = (code: string, lang: string): string => {
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    if (["javascript", "typescript", "js", "ts"].includes(lang)) {
      return escaped
        .replace(
          /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|new|typeof|instanceof)\b/g,
          '<span style="color:#569cd6">$1</span>',
        )
        .replace(
          /\b(true|false|null|undefined|this)\b/g,
          '<span style="color:#4fc1ff">$1</span>',
        )
        .replace(
          /('[\s\S]*?'|"[^"]*"|`[\s\S]*?`)/g,
          '<span style="color:#ce9178">$1</span>',
        )
        .replace(/(\/\/.*$)/gm, '<span style="color:#6a9955">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');
    }
    if (lang === "python") {
      return escaped
        .replace(
          /\b(def|class|import|from|return|if|elif|else|for|while|with|as|in|not|and|or|True|False|None)\b/g,
          '<span style="color:#569cd6">$1</span>',
        )
        .replace(/('.*?'|".*?")/g, '<span style="color:#ce9178">$1</span>')
        .replace(/(#.*$)/gm, '<span style="color:#6a9955">$1</span>');
    }
    if (lang === "sql") {
      return escaped
        .replace(
          /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|ON|INSERT|UPDATE|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|AS|AND|OR|NOT|NULL|IN|LIKE|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|SET|VALUES|INTO)\b/gi,
          '<span style="color:#569cd6">$1</span>',
        )
        .replace(/('.*?')/g, '<span style="color:#ce9178">$1</span>')
        .replace(/(--.*$)/gm, '<span style="color:#6a9955">$1</span>');
    }
    if (lang === "bash") {
      return escaped
        .replace(
          /\b(echo|cd|ls|mkdir|rm|cp|mv|sudo|apt|npm|git|curl|wget|chmod|export|source)\b/g,
          '<span style="color:#569cd6">$1</span>',
        )
        .replace(/(#.*$)/gm, '<span style="color:#6a9955">$1</span>')
        .replace(/(\$\w+)/g, '<span style="color:#4fc1ff">$1</span>');
    }
    return escaped;
  };

  const lines = code.split("\n");

  return (
    <div className="my-8 rounded-2xl overflow-hidden border border-[#0466c8]/20 font-mono text-sm">
      {/* Barre titre style éditeur */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a2e] border-b border-[#0466c8]/10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[#90e0ef]/30 text-[10px] ml-2 uppercase tracking-widest">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-[#0466c8]/20 text-[#90e0ef]/50 hover:text-[#90e0ef] transition-all text-[10px] font-bold uppercase tracking-wider"
        >
          {copied ? (
            <>
              <Check size={11} className="text-green-400" /> Copié
            </>
          ) : (
            <>
              <Upload size={11} /> Copier
            </>
          )}
        </button>
      </div>

      {/* Code avec numéros de ligne */}
      <div className="bg-[#0d1117] overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-[#0466c8]/5 transition-colors">
                <td className="select-none text-right pr-4 pl-4 py-0.5 text-[#90e0ef]/15 text-[11px] w-10 border-r border-[#0466c8]/10 align-top">
                  {i + 1}
                </td>
                <td
                  className="pl-4 pr-4 py-0.5 text-[#e6edf3] text-[13px] whitespace-pre"
                  dangerouslySetInnerHTML={{
                    __html: highlight(line, language),
                  }}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {caption && (
        <div className="px-4 py-2 bg-[#0d1117] border-t border-[#0466c8]/10 text-[#90e0ef]/40 text-[10px] italic">
          {caption}
        </div>
      )}
    </div>
  );
};

export const GalleryBlock = ({
  urls,
  caption,
  lang,
}: {
  urls: string[];
  caption?: string;
  lang: "fr" | "en";
}) => {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!urls || urls.length === 0) return null;

  return (
    <div className="my-8">
      {/* Carrousel principal */}
      <div className="relative rounded-2xl overflow-hidden border border-[#0466c8]/20 bg-[#000814]">
        <motion.div
          className="flex"
          animate={{ x: `-${current * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ width: `${urls.length * 100}%` }}
        >
          {urls.map((url, i) => (
            <div
              key={i}
              style={{ width: `${100 / urls.length}%` }}
              className="flex-shrink-0"
            >
              <img
                src={url}
                alt={`${i + 1}`}
                className="w-full aspect-video object-cover cursor-zoom-in"
                onClick={() => {
                  setCurrent(i);
                  setLightbox(true);
                }}
              />
            </div>
          ))}
        </motion.div>

        {/* Flèches */}
        {urls.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrent((p) => (p - 1 + urls.length) % urls.length)
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-[#0466c8] transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrent((p) => (p + 1) % urls.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-[#0466c8] transition-all"
            >
              <ChevronRight size={18} />
            </button>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {urls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all ${i === current ? "w-5 h-1.5 bg-[#0466c8]" : "w-1.5 h-1.5 bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Compteur */}
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[10px] text-white/70 font-mono">
          {current + 1} / {urls.length}
        </div>
      </div>

      {caption && (
        <p className="text-center text-xs text-[#90e0ef]/40 mt-3 italic">
          {caption}
        </p>
      )}

      {/* Thumbnails */}
      {urls.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === current ? "border-[#0466c8]" : "border-transparent opacity-50 hover:opacity-100"}`}
            >
              <img src={url} className="w-full h-full object-cover" alt="" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightbox(false)}
          >
            <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
              <X size={24} />
            </button>
            <motion.img
              src={urls[current]}
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            />
            {urls.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {urls.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrent(i);
                    }}
                    className={`rounded-full transition-all ${i === current ? "w-6 h-2 bg-[#0466c8]" : "w-2 h-2 bg-white/30"}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const QuoteHero = ({
  text,
  author,
}: {
  text: string;
  author?: string;
}) => (
  <div className="my-12 -mx-4 md:-mx-16 lg:-mx-32 px-6 md:px-12 py-10 bg-gradient-to-br from-[#001233] to-[#000814] border-y border-[#0466c8]/30 relative overflow-hidden">
    <div className="absolute top-4 left-6 text-[120px] leading-none text-[#0466c8]/10 font-serif select-none pointer-events-none">
      "
    </div>
    <motion.blockquote
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative z-10 text-2xl md:text-3xl font-serif italic text-white/90 leading-relaxed max-w-3xl mx-auto text-center break-words overflow-hidden"
      style={{ textShadow: "0 0 40px rgba(4,102,200,0.15)" }}
    >
      {text}
    </motion.blockquote>
    {author && (
      <p className="text-center text-[#0466c8] text-xs font-black uppercase tracking-[0.3em] mt-6 break-words">
        — {author}
      </p>
    )}
    <div className="absolute bottom-4 right-6 text-[120px] leading-none text-[#0466c8]/10 font-serif select-none pointer-events-none rotate-180">
      "
    </div>
  </div>
);

const InlineRelatedTeaser = ({
  teaser,
  article,
  lang,
  onSelect,
}: {
  teaser: { kicker_fr: string; kicker_en: string };
  article: UnifiedItem;
  lang: "fr" | "en";
  onSelect: () => void;
}) => {
  const kicker = lang === "fr" ? teaser.kicker_fr : teaser.kicker_en;
  const title = lang === "fr" ? article.title_fr : article.title_en;
  const cat =
    lang === "fr" ? article.category_name_fr : article.category_name_en;
  const color = article.category_color || "#0466c8";
  const thumb = getThumbnailUrl(article.cover_url, article.format);
  const readTime =
    article.reading_time_minutes ||
    estimateReadingTime(
      lang === "fr" ? article.content_fr : article.content_en,
    );
  const dateStr = formatPublishedDate(
    article.published_at || article.date,
    lang,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={onSelect}
      className="my-10 cursor-pointer group"
    >
      {/* Kicker */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px bg-[#0466c8]/20" />
        <span
          className="text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border"
          style={{
            color,
            borderColor: `${color}40`,
            backgroundColor: `${color}10`,
            textShadow: `0 0 20px ${color}40`,
          }}
        >
          {kicker || (lang === "fr" ? "À lire aussi" : "Also read")}
        </span>
        <div className="flex-1 h-px bg-[#0466c8]/20" />
      </div>

      {/* Card teaser */}
      <div
        className="flex gap-4 p-4 rounded-2xl border border-[#0466c8]/15 bg-[#000d1a] hover:border-[#0466c8]/40 transition-all"
        style={{ boxShadow: `0 0 30px ${color}08` }}
      >
        {/* Thumbnail */}
        {thumb && (
          <div className="w-24 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 border border-[#0466c8]/20">
            <img
              src={thumb}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span
              className="text-[9px] font-black uppercase tracking-wider"
              style={{ color }}
            >
              {cat}
            </span>
            {article.article_type === "audio" && (
              <span className="px-2 py-0.5 bg-[#001233] text-[#90e0ef] text-[8px] rounded-full border border-[#0466c8]/30 flex items-center gap-1">
                <Radio size={8} /> Podcast
              </span>
            )}
          </div>

          <h4 className="font-serif text-white text-base leading-snug group-hover:text-[#90e0ef] transition-colors line-clamp-2 mb-2">
            {title}
          </h4>

          <div className="flex items-center gap-3 text-[#90e0ef]/30 text-[9px]">
            {dateStr && (
              <span className="flex items-center gap-1">
                <Calendar size={9} /> {dateStr}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={9} /> {readTime} min
            </span>
          </div>
        </div>

        <ChevronRight
          size={18}
          className="flex-shrink-0 self-center text-[#0466c8]/20 group-hover:text-[#0466c8] group-hover:translate-x-1 transition-all"
        />
      </div>
    </motion.div>
  );
};

export const ChartCard = ({
  chart,
  lang,
  onClick,
}: {
  chart: MacroChart;
  lang: "fr" | "en";
  onClick: () => void;
}) => {
  const title =
    lang === "fr" ? chart.title_fr : chart.title_en || chart.title_fr;
  const desc =
    lang === "fr"
      ? chart.description_fr
      : chart.description_en || chart.description_fr;
  const unit = lang === "fr" ? chart.unit_fr : chart.unit_en || chart.unit_fr;
  const secondaryUnit =
    lang === "fr"
      ? chart.secondary_unit_fr
      : chart.secondary_unit_en || chart.secondary_unit_fr;

  return (
    <div
      onClick={onClick}
      className="flex flex-col h-[380px] bg-gradient-to-br from-[#001233] to-[#000814] border border-[#0466c8]/30 rounded-2xl p-5 hover:border-[#0466c8] hover:shadow-[0_0_20px_rgba(4,102,200,0.2)] transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-white font-serif font-bold leading-tight group-hover:text-[#90e0ef] transition-colors">
          {title}
        </h4>
        <div className="p-2 bg-[#0466c8]/20 rounded-full group-hover:bg-[#0466c8] transition-colors">
          <Maximize2
            size={14}
            className="text-[#90e0ef] group-hover:text-white"
          />
        </div>
      </div>
      <div className="h-[160px] w-full min-h-[160px] shrink-0 mb-4 opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none">
        {/* ⬇️ FIX : on passe les points TELS QUELS (spread), sans écraser
            series_id / period / x_value / y_value / size_value / is_total.
            On ne complète que les champs potentiellement absents. */}
        <RenderChartPublic
          chartType={chart.chart_type as any}
          dataPoints={(chart.dataPoints || []).map((dp: any) => ({
            ...dp,
            color: dp.color || "#14b8a6",
            period: dp.period ?? "",
            x_value: dp.x_value ?? null,
            y_value: dp.y_value ?? null,
            size_value: dp.size_value ?? null,
            is_total: dp.is_total ?? false,
            data_status: dp.data_status ?? null,
            annotation_fr: dp.annotation_fr ?? "",
            annotation_en: dp.annotation_en ?? "",
          }))}
          series={chart.macro_chart_series || []}
          annotations={chart.macro_chart_annotations || []}
          unit={unit}
          secondaryUnit={secondaryUnit}
          lang={lang}
          isLarge={false}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-[#90e0ef]/60 text-xs leading-relaxed line-clamp-3">
          {desc}
        </p>
      </div>
      <div className="mt-4 pt-3 border-t border-[#0466c8]/20 text-[10px] text-[#90e0ef]/40 font-mono flex justify-between">
        <span>
          {lang === "fr" ? "Unité" : "Unit"} : {unit}
        </span>
        <span className="text-[#0466c8] group-hover:text-[#90e0ef]">
          {lang === "fr" ? "Agrandir" : "Expand"}
        </span>
      </div>
    </div>
  );
};

export const ChartModal = ({
  chart,
  lang,
  onClose,
}: {
  chart: MacroChart;
  lang: "fr" | "en";
  onClose: () => void;
}) => {
  const title =
    lang === "fr" ? chart.title_fr : chart.title_en || chart.title_fr;
  const desc =
    lang === "fr"
      ? chart.description_fr
      : chart.description_en || chart.description_fr;
  const unit = lang === "fr" ? chart.unit_fr : chart.unit_en || chart.unit_fr;
  const secondaryUnit =
    lang === "fr"
      ? chart.secondary_unit_fr
      : chart.secondary_unit_en || chart.secondary_unit_fr;
  const source =
    lang === "fr" ? chart.source_fr : chart.source_en || chart.source_fr;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#000814]/90 backdrop-blur-md flex items-center justify-center p-4 md:p-10"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-[#001233] to-[#000814] border border-[#0466c8]/40 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(4,102,200,0.2)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#0466c8]/20 bg-white/[0.02]">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif text-white mb-2">
              {title}
            </h2>
            <div className="flex gap-4 text-[#90e0ef]/50 text-xs font-mono uppercase tracking-widest">
              <span>
                {lang === "fr" ? "Source" : "Source"} : {source}
              </span>
              <span>
                {lang === "fr" ? "Unité" : "Unit"} : {unit}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-[#0466c8] text-white rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Graphique avec RenderChartPublic */}
        <div className="flex-1 p-6 min-h-[300px]">
          {/* ⬇️ FIX : même correctif que ChartCard, on ne détruit plus
              les champs nécessaires aux modes multi-séries / point / waterfall */}
          <RenderChartPublic
            chartType={chart.chart_type}
            dataPoints={(chart.dataPoints || []).map((dp: any) => ({
              ...dp,
              color: dp.color || "#14b8a6",
              period: dp.period ?? "",
              x_value: dp.x_value ?? null,
              y_value: dp.y_value ?? null,
              size_value: dp.size_value ?? null,
              is_total: dp.is_total ?? false,
              data_status: dp.data_status ?? null,
              annotation_fr: dp.annotation_fr ?? "",
              annotation_en: dp.annotation_en ?? "",
            }))}
            series={chart.macro_chart_series || []}
            annotations={chart.macro_chart_annotations || []}
            unit={unit}
            secondaryUnit={secondaryUnit}
            lang={lang}
            isLarge={true}
          />
        </div>

        {/* Description */}
        <div className="p-6 bg-[#000814]/50 border-t border-[#0466c8]/20 max-h-[30vh] overflow-y-auto">
          <div className="flex gap-3">
            <Info className="text-[#0466c8] shrink-0 mt-1" size={20} />
            <p className="text-[#90e0ef]/80 text-sm md:text-base leading-relaxed">
              {desc}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const AuthorByline = ({
  article,
  lang,
}: {
  article: UnifiedItem;
  lang: "fr" | "en";
}) => {
  const author = article.author;
  const name = author?.name || article.author_or_source;
  const role = author
    ? lang === "fr"
      ? author.role_fr
      : author.role_en
    : null;
  const bio = author ? (lang === "fr" ? author.bio_fr : author.bio_en) : null;
  const publishedDate = formatPublishedDate(
    article.published_at || article.date,
    lang,
    true,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="flex items-start gap-4 py-6 border-y border-[#0466c8]/15 mb-8"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#0466c8]/30 bg-[#001233]">
          {author?.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[#0466c8] font-black text-xl font-serif">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        {article.is_live && (
          <motion.div
            className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#000814]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-white font-bold text-sm">{name}</p>
            {role && (
              <p className="text-[#0466c8] text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                {role}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {author?.twitter_url && (
              <a
                href={author.twitter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-[#000d1a] border border-[#0466c8]/20 rounded-full text-[#90e0ef]/50 hover:text-[#90e0ef] hover:border-[#0466c8]/40 transition-all text-[10px] font-bold uppercase tracking-wider"
              >
                Suivre
              </a>
            )}
          </div>
        </div>

        {bio && (
          <p className="text-[#90e0ef]/40 text-xs leading-relaxed mt-2 line-clamp-2">
            {bio}
          </p>
        )}

        {publishedDate && (
          <div className="flex items-center gap-2 mt-2 text-[#90e0ef]/25 text-[10px]">
            <Calendar size={10} className="text-[#0466c8]" />
            <span>{publishedDate}</span>
            {article.reading_time_minutes && (
              <>
                <span className="text-[#0466c8]/30">·</span>
                <Clock size={10} className="text-[#0466c8]" />
                <span>
                  {article.reading_time_minutes}{" "}
                  {lang === "fr" ? "min de lecture" : "min read"}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const TableOfContents = ({
  content,
  lang,
}: {
  content: string;
  lang: "fr" | "en";
}) => {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(true);

  const headings = useMemo(() => {
    if (!content) return [];
    const lines = content.split("\n");
    const result: { level: number; text: string; id: string }[] = [];

    lines.forEach((line) => {
      const h2 = line.match(/^## (.+)$/);
      const h3 = line.match(/^### (.+)$/);
      if (h2) {
        const text = h2[1].trim();
        result.push({
          level: 2,
          text,
          id: text.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        });
      } else if (h3) {
        const text = h3[1].trim();
        result.push({
          level: 3,
          text,
          id: text.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        });
      }
    });

    return result;
  }, [content]);

  if (headings.length < 2) return null;

  const scrollToHeading = (text: string) => {
    const allH = document.querySelectorAll("h2, h3");
    for (const el of Array.from(allH)) {
      if (el.textContent?.trim() === text) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(text);
        break;
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mb-10 rounded-2xl border border-[#0466c8]/15 overflow-hidden"
      style={{ backgroundColor: "rgba(0,13,26,0.8)" }}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#0466c8]/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ScrollText size={14} className="text-[#0466c8]" />
          <span className="text-white font-bold text-sm uppercase tracking-widest text-[10px]">
            {lang === "fr" ? "Sommaire" : "Contents"}
          </span>
          <span className="px-2 py-0.5 bg-[#0466c8]/20 text-[#90e0ef] text-[9px] rounded-full">
            {headings.length}
          </span>
        </div>
        <ChevronRight
          size={14}
          className={`text-[#0466c8]/40 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
      </button>

      {/* Liste */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-1 border-t border-[#0466c8]/10">
              {headings.map((h, i) => (
                <button
                  key={i}
                  onClick={() => scrollToHeading(h.text)}
                  className={`w-full text-left flex items-center gap-2 py-2 px-3 rounded-lg transition-all text-sm group ${activeId === h.text
                    ? "bg-[#0466c8]/20 text-white border border-[#0466c8]/30"
                    : "text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent"
                    } ${h.level === 3 ? "ml-4 text-[13px]" : "font-medium"}`}
                >
                  <span
                    className={`flex-shrink-0 font-mono text-[10px] font-bold ${h.level === 2 ? "text-[#D4AF37]" : "text-zinc-500"
                      }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="line-clamp-1 transition-colors">
                    {h.text}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const LiveFeed = ({
  articleId,
  lang,
}: {
  articleId: string;
  lang: "fr" | "en";
}) => {
  const [updates, setUpdates] = useState<
    {
      id: string;
      content: string;
      author: string;
      is_pinned: boolean;
      created_at: string;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Chargement initial
    supabase
      .from("press_live_updates")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setUpdates(data);
        setIsLoading(false);
      });

    // Souscription Realtime
    const channel = supabase
      .channel(`live-${articleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "press_live_updates",
          filter: `article_id=eq.${articleId}`,
        },
        (payload) => {
          setUpdates((prev) => [payload.new as any, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "press_live_updates",
          filter: `article_id=eq.${articleId}`,
        },
        (payload) => {
          setUpdates((prev) =>
            prev.filter((u) => u.id !== (payload.old as any).id),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [articleId]);

  if (isLoading) return null;
  if (updates.length === 0) return null;

  const formatLiveTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10 rounded-2xl overflow-hidden border border-red-500/30"
      style={{ boxShadow: "0 0 30px rgba(239,68,68,0.08)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-red-500/10 border-b border-red-500/20">
        <motion.div
          className="w-2.5 h-2.5 bg-red-500 rounded-full"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span className="text-red-400 font-black text-xs uppercase tracking-[0.3em]">
          {lang === "fr" ? "En Direct" : "Live"}
        </span>
        <span className="text-red-400/40 text-[10px] ml-auto">
          {updates.length} {lang === "fr" ? "mise(s) à jour" : "update(s)"}
        </span>
      </div>

      {/* Timeline */}
      <div className="bg-[#000814] divide-y divide-red-500/10">
        {updates.map((update, i) => (
          <motion.div
            key={update.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex gap-4 px-5 py-4 ${update.is_pinned ? "bg-red-500/5" : ""}`}
          >
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? "bg-red-500" : "bg-red-500/30"}`}
              />
              {i < updates.length - 1 && (
                <div className="w-px flex-1 bg-red-500/15 min-h-[16px]" />
              )}
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] font-mono text-red-400/60">
                  {formatLiveTime(update.created_at)}
                </span>
                {update.is_pinned && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-bold rounded-full">
                    📌 {lang === "fr" ? "Épinglé" : "Pinned"}
                  </span>
                )}
                <span className="text-[10px] text-[#90e0ef]/30 ml-auto">
                  {update.author}
                </span>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                {update.content}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export const ShareButton = ({
  article,
  lang,
}: {
  article: UnifiedItem;
  lang: "fr" | "en";
}) => {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const title = lang === "fr" ? article.title_fr : article.title_en;
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/presse?article=${article.id}`
      : "";
  const tweetText = `${title} - Le Continent`;
  const emailSubject = `À lire : ${title}`;
  const emailBody = `Je vous partage cet article : ${title}\n\n${url}`;

  const shareOptions = [
    {
      name: "Twitter/X",
      icon: "𝕏",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`,
      color: "text-black hover:text-white hover:bg-black",
    },
    {
      name: "Facebook",
      icon: "f",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      color: "text-[#1877F2] hover:text-white hover:bg-[#1877F2]",
    },
    {
      name: "LinkedIn",
      icon: "in",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      color: "text-[#0A66C2] hover:text-white hover:bg-[#0A66C2]",
    },
    {
      name: "WhatsApp",
      icon: "💬",
      url: `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
      color: "text-[#25D366] hover:text-white hover:bg-[#25D366]",
    },
    {
      name: "Email",
      icon: "✉️",
      url: `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
      color: "text-[#0466c8] hover:text-white hover:bg-[#0466c8]",
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#001233] border border-[#0466c8]/20 rounded-xl text-[#90e0ef]/40 hover:text-[#90e0ef] hover:border-[#0466c8]/40 transition-all text-xs font-bold uppercase tracking-wider"
      >
        <Share2 size={14} />
        {lang === "fr" ? "Partager" : "Share"}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 bg-[#000814] border border-[#0466c8]/30 rounded-2xl shadow-2xl z-40 min-w-56 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Options partage */}
            <div className="p-3 space-y-1">
              {shareOptions.map((opt) => (
                <a
                  key={opt.name}
                  href={opt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-[#0466c8]/20 transition-all group text-sm ${opt.color}`}
                >
                  <span className="text-lg font-bold">{opt.icon}</span>
                  <span className="flex-1 group-hover:text-white">
                    {opt.name}
                  </span>
                  <ExternalLink
                    size={12}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </a>
              ))}
            </div>

            {/* Copier le lien */}
            <div className="border-t border-[#0466c8]/10 p-3">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#0466c8]/10 hover:bg-[#0466c8]/20 text-[#90e0ef] transition-all text-xs font-bold"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-green-400" />
                    {lang === "fr" ? "Lien copié !" : "Link copied!"}
                  </>
                ) : (
                  <>
                    <LinkIcon size={12} />
                    {lang === "fr" ? "Copier le lien" : "Copy link"}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};



// ─── Décor culturel — calque d'ambiance (page liste uniquement) ──────────────

const DECOR_ICONS: {
  Component: React.FC<{ size?: number; className?: string }>;
  size: number;
  top: string;
  left?: string;
  right?: string;
  opacity: number;
  parallaxFactor: number;
  rotate?: number;
}[] = [
    // Fond global — dispersé (tailles et opacités fortement augmentées)
    { Component: MasqueAfricainIcon, size: 240, top: "4%", left: "8%", opacity: 0.20, parallaxFactor: 0.012, rotate: -10 },
    { Component: LaptopIcon, size: 280, top: "8%", right: "6%", opacity: 0.18, parallaxFactor: 0.008, rotate: 6 },
    { Component: AdinkraheneIcon, size: 180, top: "18%", left: "5%", opacity: 0.22, parallaxFactor: 0.015, rotate: 0 },
    { Component: GyeNyameIcon, size: 170, top: "22%", right: "8%", opacity: 0.20, parallaxFactor: 0.01, rotate: 15 },
    { Component: SankofaIcon, size: 200, top: "36%", left: "6%", opacity: 0.19, parallaxFactor: 0.014, rotate: -5 },
    { Component: AwaleIcon, size: 190, top: "40%", right: "5%", opacity: 0.18, parallaxFactor: 0.009, rotate: 8 },
    { Component: NkyinkyimIcon, size: 180, top: "54%", left: "5%", opacity: 0.20, parallaxFactor: 0.013, rotate: -12 },
    { Component: AdinkraheneIcon, size: 150, top: "58%", right: "9%", opacity: 0.19, parallaxFactor: 0.011, rotate: 45 },
    { Component: MasqueAfricainIcon, size: 180, top: "70%", right: "6%", opacity: 0.18, parallaxFactor: 0.016, rotate: 10 },
    { Component: GyeNyameIcon, size: 200, top: "74%", left: "7%", opacity: 0.19, parallaxFactor: 0.007, rotate: -20 },
    { Component: SankofaIcon, size: 170, top: "86%", right: "5%", opacity: 0.20, parallaxFactor: 0.012, rotate: 5 },
    { Component: NkyinkyimIcon, size: 220, top: "90%", left: "6%", opacity: 0.18, parallaxFactor: 0.01, rotate: -8 },
  ];

const CulturalDecorLayer = ({ mousePos }: { mousePos: { x: number; y: number } }) => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
  >
    {DECOR_ICONS.map((item, i) => {
      const tx = mousePos.x * item.parallaxFactor * 100;
      const ty = mousePos.y * item.parallaxFactor * 60;
      return (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: item.top,
            left: item.left,
            right: item.right,
            color: "#0466c8",
            opacity: item.opacity,
            rotate: item.rotate ?? 0,
            filter: "drop-shadow(0 0 15px rgba(4,102,200,0.5))",
          }}
          animate={{
            x: tx,
            y: ty,
          }}
          transition={{
            type: "spring",
            stiffness: 12,
            damping: 30,
          }}
        >
          <item.Component size={item.size} />
        </motion.div>
      );
    })}
  </div>
);

// Bande séparatrice Kenté
const KenteSeparator = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-4 overflow-hidden ${className}`} aria-hidden="true">
    <div className="flex-1 h-px bg-[#0466c8]/20" />
    <MotifKenteIcon width={200} height={18} className="text-[#0466c8] opacity-35 flex-shrink-0" />
    <AdinkraheneIcon size={28} className="text-[#0466c8] opacity-35 flex-shrink-0" />
    <MotifKenteIcon width={200} height={18} className="text-[#0466c8] opacity-35 flex-shrink-0" />
    <div className="flex-1 h-px bg-[#0466c8]/20" />
  </div>
);



// ─── Digest Designs ───────────────────────────────────────────────────────────

const DigestClassic = ({ items, lang, onSelect, accent }: { items: UnifiedItem[]; lang: "fr" | "en"; onSelect: (a: UnifiedItem) => void; accent: string }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {items.slice(0,4).map((article, i) => {
      const title = lang === "fr" ? article.title_fr : article.title_en;
      const cat = lang === "fr" ? article.category_name_fr : article.category_name_en;
      const thumb = getThumbnailUrl(article.cover_url, article.format);
      return (
        <button key={article.id} onClick={() => onSelect(article)} className="group text-left bg-[#0A1930] rounded-xl overflow-hidden border border-white/10 hover:border-[#D4AF37]/30 transition">
          {thumb && <div className="aspect-[16/9] overflow-hidden"><img src={thumb} alt={title} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500" /></div>}
          <div className="p-3">
            <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: accent }}>{cat}</div>
            <div className="font-sans font-bold text-[15px] leading-snug text-white mt-1 line-clamp-2 group-hover:text-[#D4AF37]">{title}</div>
          </div>
        </button>
      );
    })}
  </div>
);

const DigestGrid = DigestClassic;
const DigestCarousel = DigestClassic;
const DigestRanked = DigestClassic;
const DigestHeroList = DigestClassic;
const DigestTimeline = DigestClassic;
const DigestDiptych = DigestClassic;

// ─── DigestWidget Numerama — 1 seul UX parfait : blanc sur sombre
const DigestWidget = ({
  digest,
  feedItems,
  lang,
  onSelect,
}: {
  digest: DigestItem;
  feedItems: UnifiedItem[];
  lang: "fr" | "en";
  onSelect: (a: UnifiedItem) => void;
}) => {
  if (!digest.article_ids || digest.article_ids.length === 0) return null;
  const items = digest.article_ids.map((id) => feedItems.find((a) => a.id === id)).filter(Boolean) as UnifiedItem[];
  if (items.length === 0) return null;
  const label = lang === "fr" ? digest.label_fr : digest.label_en;
  const accent = digest.accent_color || "#D4AF37";
  return (
    <div className="my-12 bg-gradient-to-br from-[#001233]/60 to-[#000814] rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
          <span className="text-[11px] font-black tracking-[0.2em] uppercase" style={{ color: accent }}>{label}</span>
        </div>
        <span className="text-[10px] text-zinc-500 hidden md:inline">{items.length} articles</span>
      </div>
      <div className="p-5">
        <DigestClassic items={items} lang={lang} onSelect={onSelect} accent={accent} />
      </div>
    </div>
  );
};

// ─── Sidebar Article ──────────────────────────────────────────────────────────

const ArticleSidebar = ({
  sidebarSearchTerm,
  setSidebarSearchTerm,
  searchMatches,
  searchCurrentMatch,
  goToNextMatch,
  goToPrevMatch,
  clearHighlights,
  announcements,
  recommendedArticles,
  lang,
  onSelect,
  onOpenNewsletter,
  accentColor,
}: {
  sidebarSearchTerm: string;
  setSidebarSearchTerm: (v: string) => void;
  searchMatches: number;
  searchCurrentMatch: number;
  goToNextMatch: () => void;
  goToPrevMatch: () => void;
  clearHighlights: () => void;
  announcements: PressAnnouncement[];
  recommendedArticles: UnifiedItem[];
  lang: "fr" | "en";
  onSelect: (a: UnifiedItem) => void;
  onOpenNewsletter: () => void;
  accentColor: string;
}) => {
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const activeAnnouncements = announcements.filter(a => a.status === 'active');

  const t = {
    search: lang === "fr" ? "Rechercher dans l'article" : "Search in article",
    searchPlaceholder: lang === "fr" ? "Mot-clé..." : "Keyword...",
    results: lang === "fr" ? "résultat" : "result",
    noResult: lang === "fr" ? "Aucun résultat" : "No results",
    newsletter: lang === "fr" ? "Ne manquez rien" : "Stay informed",
    newsletterSub: lang === "fr" ? "Recevez nos articles en avant-première" : "Get our articles first",
    newsletterBtn: lang === "fr" ? "S'abonner" : "Subscribe",
    announcements: lang === "fr" ? "À la une" : "Featured",
    recommended: lang === "fr" ? "À lire ensuite" : "Read next",
  };

  return (
    <div className="space-y-5">

      {/* 1. Recherche interne Ctrl+F */}
      <div className="p-4 bg-[#000d1a] border border-[#0466c8]/15 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Search size={13} className="text-[#0466c8]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#90e0ef]/50">{t.search}</span>
          <kbd className="ml-auto text-[8px] text-[#90e0ef]/20 border border-white/10 rounded px-1.5 py-0.5 font-mono">Ctrl+F</kbd>
        </div>

        <div className="relative">
          <input
            id="sidebar-search-input"
            type="text"
            value={sidebarSearchTerm}
            onChange={e => setSidebarSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-[#001233]/60 border border-[#0466c8]/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[#90e0ef]/20 focus:outline-none focus:border-[#0466c8]/50 transition-all pr-8"
          />
          {sidebarSearchTerm && (
            <button
              onClick={() => { setSidebarSearchTerm(''); clearHighlights(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#90e0ef]/30 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Compteur + navigation */}
        <AnimatePresence>
          {sidebarSearchTerm.trim().length >= 2 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex items-center gap-2"
            >
              <span className="text-[10px] font-mono text-[#90e0ef]/40 flex-1">
                {searchMatches === 0
                  ? t.noResult
                  : `${searchCurrentMatch} / ${searchMatches} ${t.results}${searchMatches > 1 && lang === 'fr' ? 's' : ''}`
                }
              </span>
              {searchMatches > 0 && (
                <div className="flex gap-1">
                  <button
                    onClick={goToPrevMatch}
                    className="w-6 h-6 rounded-lg bg-[#0466c8]/10 hover:bg-[#0466c8]/30 text-[#90e0ef] flex items-center justify-center transition-all"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    onClick={goToNextMatch}
                    className="w-6 h-6 rounded-lg bg-[#0466c8]/10 hover:bg-[#0466c8]/30 text-[#90e0ef] flex items-center justify-center transition-all"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Newsletter */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="p-4 rounded-2xl border cursor-pointer group"
        style={{
          background: `linear-gradient(135deg, ${accentColor}12, transparent)`,
          borderColor: `${accentColor}25`,
        }}
        onClick={onOpenNewsletter}
      >
        <div className="flex items-center gap-2 mb-2">
          <Bell size={14} style={{ color: accentColor }} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accentColor }}>
            {t.newsletter}
          </span>
        </div>
        <p className="text-[#90e0ef]/50 text-xs mb-3 leading-relaxed">{t.newsletterSub}</p>
        <div
          className="w-full py-2 rounded-xl text-center text-xs font-bold text-white transition-all group-hover:opacity-90"
          style={{ backgroundColor: accentColor, boxShadow: `0 0 15px ${accentColor}30` }}
        >
          {t.newsletterBtn}
        </div>
      </motion.div>

      {/* 3. Annonces compactes */}
      {activeAnnouncements.length > 0 && (
        <div className="p-4 bg-[#000d1a] border border-[#0466c8]/10 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Newspaper size={13} className="text-[#0466c8]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#90e0ef]/50">{t.announcements}</span>
            {activeAnnouncements.length > 1 && (
              <div className="ml-auto flex gap-1">
                <button
                  onClick={() => setAnnouncementIndex(p => (p - 1 + activeAnnouncements.length) % activeAnnouncements.length)}
                  className="w-5 h-5 rounded bg-white/5 hover:bg-[#0466c8]/20 text-[#90e0ef]/40 hover:text-[#90e0ef] flex items-center justify-center transition-all"
                >
                  <ChevronLeft size={10} />
                </button>
                <button
                  onClick={() => setAnnouncementIndex(p => (p + 1) % activeAnnouncements.length)}
                  className="w-5 h-5 rounded bg-white/5 hover:bg-[#0466c8]/20 text-[#90e0ef]/40 hover:text-[#90e0ef] flex items-center justify-center transition-all"
                >
                  <ChevronRight size={10} />
                </button>
              </div>
            )}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={announcementIndex}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
            >
              {(() => {
                const ann = activeAnnouncements[announcementIndex];
                const annTitle = lang === 'fr' ? ann.title_fr : (ann.title_en || ann.title_fr);
                const annDesc = lang === 'fr' ? ann.description_fr : (ann.description_en || ann.description_fr);
                return (
                  <div>
                    {ann.image_url && (
                      <div className="w-full h-28 rounded-xl overflow-hidden mb-3 border border-[#0466c8]/10">
                        <img src={ann.image_url} alt={annTitle} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <p className="text-white text-xs font-serif font-medium leading-snug mb-1">{annTitle}</p>
                    {annDesc && <p className="text-[#90e0ef]/40 text-[10px] leading-relaxed line-clamp-2">{annDesc}</p>}
                    {ann.link_url && (
                      <a
                        href={ann.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-[#0466c8] text-[10px] font-bold hover:underline"
                      >
                        {lang === 'fr' ? 'En savoir plus' : 'Learn more'}
                        <ChevronRight size={10} />
                      </a>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>
          {activeAnnouncements.length > 1 && (
            <div className="flex justify-center gap-1 mt-3">
              {activeAnnouncements.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setAnnouncementIndex(i)}
                  className={`rounded-full transition-all ${i === announcementIndex ? 'w-4 h-1 bg-[#0466c8]' : 'w-1 h-1 bg-white/20'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Articles recommandés */}
      {recommendedArticles.length > 0 && (
        <div className="p-4 bg-[#000d1a] border border-[#0466c8]/10 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={13} className="text-[#0466c8]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#90e0ef]/50">{t.recommended}</span>
          </div>
          <div className="space-y-3">
            {recommendedArticles.map((a, i) => {
              const title = lang === "fr" ? a.title_fr : a.title_en;
              const thumb = getThumbnailUrl(a.cover_url, a.format);
              const dateStr = formatPublishedDate(a.published_at || a.date, lang);
              return (
                <motion.button
                  key={a.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    onSelect(a);
                  }}
                  className="w-full flex gap-2.5 text-left group hover:pl-1 transition-all"
                >
                  {thumb && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-[#0466c8]/10">
                      <img src={thumb} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-serif leading-snug line-clamp-3 group-hover:text-[#90e0ef] transition-colors">{title}</p>
                    {dateStr && <p className="text-[#90e0ef]/25 text-[9px] mt-1">{dateStr}</p>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};


const HtmlSegment = React.memo(({ content }: { content: string }) => {
  console.log('[HTML SEGMENT] Rendering (should only happen once per content change)');
  return (
    <article
      className="article-body max-w-none mb-8"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
});
HtmlSegment.displayName = 'HtmlSegment';

// ─── Article View ─────────────────────────────────────────────────────────────

export const ArticleView = ({
  article,
  lang,
  onClose,
  mousePos,
  feedItems,
  user,
  userProfile,
  announcements,
  allCharts,
}: {
  article: UnifiedItem;
  lang: "fr" | "en";
  onClose: () => void;
  mousePos: { x: number; y: number };
  feedItems: UnifiedItem[];
  user: any;
  userProfile: UserProfile | null;
  announcements: PressAnnouncement[];
  allCharts: MacroChart[];
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Sidebar : recherche interne ──────────────────────────────────────────
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState('');
  const [searchMatches, setSearchMatches] = useState<number>(0);
  const [searchCurrentMatch, setSearchCurrentMatch] = useState<number>(0);
  const articleBodyRef = useRef<HTMLDivElement>(null);
  const highlightMarkClass = 'lukeni-search-highlight';
  const highlightActiveClass = 'lukeni-search-highlight-active';

  const clearHighlights = useCallback(() => {
    if (!articleBodyRef.current) return;
    const marks = articleBodyRef.current.querySelectorAll(`mark.${highlightMarkClass}`);
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
        parent.normalize();
      }
    });
    setSearchMatches(0);
    setSearchCurrentMatch(0);
  }, []);

  const applyHighlights = useCallback((term: string) => {
    clearHighlights();
    if (!term.trim() || !articleBodyRef.current) return;

    const walker = document.createTreeWalker(
      articleBodyRef.current,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'mark'].includes(tag)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) textNodes.push(node as Text);

    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedTerm, 'gi');
    let totalMatches = 0;

    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      if (!regex.test(text)) return;
      regex.lastIndex = 0;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        const mark = document.createElement('mark');
        mark.className = highlightMarkClass;
        mark.textContent = match[0];
        mark.style.cssText = 'background:rgba(4,102,200,0.25);color:inherit;padding:0 2px;border-radius:3px;';
        fragment.appendChild(mark);
        totalMatches++;
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      textNode.parentNode?.replaceChild(fragment, textNode);
      regex.lastIndex = 0;
    });

    setSearchMatches(totalMatches);
    if (totalMatches > 0) {
      setSearchCurrentMatch(1);
      navigateToMatch(1);
    }
  }, [clearHighlights]);

  const navigateToMatch = useCallback((index: number) => {
    if (!articleBodyRef.current) return;
    const marks = articleBodyRef.current.querySelectorAll(`mark.${highlightMarkClass}`);
    marks.forEach((m, i) => {
      const el = m as HTMLElement;
      if (i === index - 1) {
        el.className = `${highlightMarkClass} ${highlightActiveClass}`;
        el.style.cssText = 'background:rgba(4,102,200,0.7);color:#fff;padding:0 2px;border-radius:3px;';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        el.className = highlightMarkClass;
        el.style.cssText = 'background:rgba(4,102,200,0.25);color:inherit;padding:0 2px;border-radius:3px;';
      }
    });
  }, []);

  const goToNextMatch = useCallback(() => {
    if (searchMatches === 0) return;
    const next = searchCurrentMatch >= searchMatches ? 1 : searchCurrentMatch + 1;
    setSearchCurrentMatch(next);
    navigateToMatch(next);
  }, [searchMatches, searchCurrentMatch, navigateToMatch]);

  const goToPrevMatch = useCallback(() => {
    if (searchMatches === 0) return;
    const prev = searchCurrentMatch <= 1 ? searchMatches : searchCurrentMatch - 1;
    setSearchCurrentMatch(prev);
    navigateToMatch(prev);
  }, [searchMatches, searchCurrentMatch, navigateToMatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (sidebarSearchTerm.trim().length >= 2) {
        applyHighlights(sidebarSearchTerm);
      } else {
        clearHighlights();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [sidebarSearchTerm, applyHighlights, clearHighlights]);

  // Intercepter Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const input = document.getElementById('sidebar-search-input') as HTMLInputElement;
        if (input) input.focus();
      }
      if (e.key === 'Escape') {
        setSidebarSearchTerm('');
        clearHighlights();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearHighlights]);

  // Articles recommandés (même catégorie, hors article courant)
  const recommendedArticles = useMemo(() => {
    return feedItems
      .filter(a =>
        a.id !== article.id &&
        a.category_id === article.category_id &&
        a.itemType === 'article'
      )
      .slice(0, 4);
  }, [feedItems, article.id, article.category_id]);

  const prevMousePos = useRef(mousePos);
  if (prevMousePos.current.x !== mousePos.x || prevMousePos.current.y !== mousePos.y) {
    console.log('[MOUSE] mousePos changed:', mousePos);
    prevMousePos.current = mousePos;
  }

  const [isNewsletterOpenSidebar, setIsNewsletterOpenSidebar] = useState(false);

  const [selectedChartModal, setSelectedChartModal] =
    useState<MacroChart | null>(null);
  const linkedCharts = useMemo(() => {
    if (!article.related_charts_ids || article.related_charts_ids.length === 0)
      return [];
    return allCharts.filter((c) => article.related_charts_ids!.includes(c.id));
  }, [article.related_charts_ids, allCharts]);

  const title = lang === "fr" ? article.title_fr : article.title_en;
  const summary = lang === "fr" ? article.summary_fr : article.summary_en;
  const content = lang === "fr" ? article.content_fr : article.content_en;


  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [isRenderingMarkdown, setIsRenderingMarkdown] = useState(false);

  useEffect(() => {
    setIsRenderingMarkdown(true);
    (async () => {
      try {
        const { renderMarkdownToHtml } = await import('@/lib/markdown');
        const html = await renderMarkdownToHtml(content || '');
        setRenderedHtml(html);
      } catch (e) {
        console.error('Markdown render error:', e);
        setRenderedHtml(content || '');
      }
      setIsRenderingMarkdown(false);
    })();
  }, [content]);

  const segments = useMemo(() => {
    if (!renderedHtml) return [];
    return parseContentSegments(renderedHtml, article.media_items);
  }, [renderedHtml, article.media_items]);


  const cat =
    lang === "fr" ? article.category_name_fr : article.category_name_en;
  const starColor = article.category_color || "#0466c8";
  const isArchive = article.itemType === "archive";
  const isAudio =
    article.article_type === "audio" ||
    (isArchive && article.format === "audio");
  const readTime = article.reading_time_minutes || estimateReadingTime(content);
  const publishedDate = formatPublishedDate(
    article.published_at || article.date,
    lang,
    true,
  );


  console.log('[DEPS] ArticleView dependencies:', {
    articleId: article.id,
    lang,
    mousePos,
    feedItemsCount: feedItems.length,
    announcementsCount: announcements.length,
    allChartsCount: allCharts.length,
    user: user?.id,
    userProfile: userProfile?.full_name,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      window.speechSynthesis.cancel();
    };
  }, [article.id]);

  // ✅ FIX lisibilité: charger Google Fonts + tailles enrichies (16→22px)
  useEffect(() => {
    if (!article.font_family) return;
    const fontName = article.font_family.replace(/\s+/g, "+");
    const linkId = `google-font-${fontName}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.href = `https://fonts.googleapis.com/css2?family=${fontName}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,700&display=swap`;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, [article.font_family]);

  const fontSizeMap: Record<string, string> = {
    small: "16px",
    normal: "18px",
    large: "20px",
    xlarge: "22px",
  };

  console.log("[FONT DEBUG ArticleView page.tsx]", {
    font_family: article.font_family,
    font_size: article.font_size,
    mapped: fontSizeMap[article.font_size || "normal"],
    articleId: article.id,
  });

  const toggleAudio = useCallback(() => {
    const audioUrl = isAudio
      ? article.audio_content_url
      : article.reading_audio_url;
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current) {
          setAudioProgress(audioRef.current.currentTime);
          setAudioDuration(audioRef.current.duration || 0);
        }
      });
      audioRef.current.addEventListener("ended", () => setIsPlaying(false));
    }
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying((p) => !p);
  }, [
    isAudio,
    article.audio_content_url,
    article.reading_audio_url,
    isPlaying,
  ]);

  const toggleTTS = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const raw = [title, summary, content].filter(Boolean).join(". ");
    const clean = stripMarkdown(raw);
    if (clean.length < 5) return;
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
    const chunks: string[] = [];
    let cur = "";
    for (const s of sentences) {
      if ((cur + s).length > 180) {
        if (cur) chunks.push(cur.trim());
        cur = s;
      } else cur += s;
    }
    if (cur.trim()) chunks.push(cur.trim());
    let i = 0;
    const next = () => {
      if (i >= chunks.length) {
        setIsSpeaking(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i]);
      u.lang = lang === "fr" ? "fr-FR" : "en-US";
      u.rate = 0.9;
      u.onend = () => {
        i++;
        next();
      };
      u.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    };
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    next();
  }, [isSpeaking, title, summary, content, lang]);

  const formatTime = (s: number) =>
    !s || isNaN(s)
      ? "0:00"
      : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        fontFamily: article.font_family ? `'${article.font_family}', serif` : "'Merriweather', serif",
      }}
    >
      <ReadingProgressBar />

      {/* COVER */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden -mx-4 md:-mx-6 bg-[#000814]">
        {article.cover_type === "video_loop" && article.cover_video_url ? (
          <motion.video
            src={article.cover_video_url}
            autoPlay
            muted
            loop
            playsInline
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full object-cover"
          />
        ) : article.cover_url ? (
          <motion.img
            src={getThumbnailUrl(article.cover_url, article.format)}
            alt={title}
            onLoad={() => setImgLoaded(true)}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{
              scale: imgLoaded ? 1 : 1.1,
              opacity: imgLoaded ? 1 : 0,
              x: mousePos.x * 20,
              y: mousePos.y * 10,
            }}
            transition={{
              scale: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 1.2 },
              x: { type: "spring", stiffness: 20, damping: 30 },
              y: { type: "spring", stiffness: 20, damping: 30 },
            }}
            className={`w-full h-full ${isArchive ? "object-contain" : "object-cover"}`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#001233] to-[#000814] flex items-center justify-center">
            {isAudio ? (
              <Radio size={80} className="text-[#0466c8]/20" />
            ) : (
              <Newspaper size={80} className="text-[#0466c8]/20" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000814] via-[#000814]/60 to-[#000814]/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#000814]/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-12 pb-10 pointer-events-none">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <motion.span
              className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] border px-4 py-2 rounded-full backdrop-blur-sm"
              style={{
                color: starColor,
                borderColor: `${starColor}50`,
                backgroundColor: `${starColor}15`,
              }}
              animate={{
                boxShadow: [
                  `0 0 10px ${starColor}20`,
                  `0 0 20px ${starColor}40`,
                  `0 0 10px ${starColor}20`,
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: starColor }}
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {cat}
            </motion.span>
            {isAudio && (
              <span className="px-3 py-1.5 bg-[#001233]/80 text-[#90e0ef] text-[8px] font-bold uppercase rounded-full border border-[#0466c8]/30 flex items-center gap-1">
                <Radio size={8} /> {lang === "fr" ? "Podcast" : "Podcast"}
              </span>
            )}
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-3xl md:text-5xl lg:text-6xl font-serif italic text-white leading-tight max-w-3xl mb-5 drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)] pointer-events-auto"
            style={{ textShadow: "0 0 60px #0466c820" }}
          >
            {title}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center gap-4 text-[#90e0ef]/40 text-[9px] uppercase font-bold tracking-widest pointer-events-auto"
          >
            {article.author_or_source && (
              <span className="flex items-center gap-1.5">
                <User size={9} className="text-[#0466c8]" />{" "}
                {article.author_or_source}
              </span>
            )}
            {article.location_city && (
              <span className="flex items-center gap-1.5">
                <MapPin size={9} className="text-[#0466c8]" />{" "}
                {article.location_city}
                {article.location_country ? `, ${article.location_country}` : ""}
              </span>
            )}
          </motion.div>
        </div>
      </div>

      {/* LAYOUT 3 COLONNES */}
      <div className="relative mt-10 mb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="xl:grid xl:grid-cols-[1fr_minmax(0,680px)_320px] xl:gap-8">

            {/* Colonne gauche — marge décorative (desktop uniquement) */}
            <div className="hidden xl:block" aria-hidden="true" />

            {/* Colonne centrale — corps de l'article */}
            <div
              ref={articleBodyRef}
              className="min-w-0 press-article-container"
              style={{
                fontFamily: `'${article.font_family || 'Merriweather'}', serif`,
                fontSize: fontSizeMap[article.font_size || 'normal'],
              } as React.CSSProperties}
            >
              <style>{`
                .press-article-container * {
                  font-family: inherit !important;
                }
                .press-article-container p,
                .press-article-container li,
                .press-article-container blockquote,
                .press-article-container td,
                .press-article-container th,
                .press-article-container span {
                  font-family: inherit !important;
                  font-size: inherit !important;
                  line-height: 1.8 !important;
                }
              `}</style>

              {/* BYLINE AUTEUR */}
              <AuthorByline article={article} lang={lang} />

              {/* SOMMAIRE */}
              {content && content.includes("##") && (
                <TableOfContents content={content} lang={lang} />
              )}

              {/* ACTION BUTTONS */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap items-center gap-3 mb-10 pb-8 border-b border-[#0466c8]/20"
              >
                {(article.reading_audio_url || isAudio) && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleAudio}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${isPlaying
                      ? "bg-[#0466c8] text-white border-[#0466c8]"
                      : "bg-[#001233] text-[#90e0ef] border-[#0466c8]/30 hover:bg-[#0466c8] hover:text-white"
                      }`}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    {isAudio
                      ? lang === "fr" ? "Écouter" : "Listen"
                      : lang === "fr" ? "Lecture vocale" : "Voice reading"}
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleTTS}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${isSpeaking
                    ? "bg-[#023e8a] text-[#90e0ef] border-[#0466c8]"
                    : "bg-[#000d1a] border-[#0466c8]/20 text-[#90e0ef]/40 hover:text-[#90e0ef] hover:border-[#0466c8]/40"
                    }`}
                >
                  {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  {lang === "fr" ? "Lire" : "Read"}
                  {isSpeaking && (
                    <span className="flex items-end gap-0.5 h-4">
                      <span className="w-0.5 h-1 bg-[#90e0ef] rounded-full animate-bounce" />
                      <span className="w-0.5 h-3 bg-[#90e0ef] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <span className="w-0.5 h-2 bg-[#90e0ef] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </span>
                  )}
                </motion.button>

                <FavoriteButton itemType="press" itemId={article.id} size={14} />
                <ShareButton article={article} lang={lang} />
              </motion.div>

              {/* AUDIO PLAYER */}
              {isAudio && article.audio_content_url && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="mb-8 p-5 bg-gradient-to-r from-[#001233] to-[#000d1a] border border-[#0466c8]/30 rounded-2xl"
                  style={{ boxShadow: "0 0 30px rgba(4,102,200,0.1)" }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[#0466c8]/20 rounded-lg">
                      <Radio size={20} className="text-[#90e0ef]" />
                    </div>
                    <div>
                      <p className="text-[#90e0ef] font-bold text-sm">
                        {lang === "fr" ? "Article Audio (Podcast)" : "Audio Article (Podcast)"}
                      </p>
                      <p className="text-xs text-[#90e0ef]/40">
                        {article.audio_duration || (lang === "fr" ? "Durée non disponible" : "Duration unavailable")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[#000814] rounded-xl border border-[#0466c8]/20">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleAudio}
                      className="flex-shrink-0 w-12 h-12 bg-[#0466c8] rounded-full flex items-center justify-center text-white hover:bg-[#0353a4] transition-all"
                      style={{ boxShadow: "0 0 20px rgba(4,102,200,0.4)" }}
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                    </motion.button>
                    <div className="flex-1">
                      <p className="text-[#90e0ef]/40 text-[10px] font-black uppercase tracking-wider mb-1.5">
                        {lang === "fr" ? "Podcast Audio" : "Audio Podcast"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#90e0ef]/30 font-mono">{formatTime(audioProgress)}</span>
                        <div
                          className="flex-1 h-1.5 bg-[#0466c8]/10 rounded-full overflow-hidden cursor-pointer"
                          onClick={(e) => {
                            if (!audioRef.current || !audioDuration) return;
                            const r = e.currentTarget.getBoundingClientRect();
                            audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * audioDuration;
                          }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%`,
                              background: "linear-gradient(90deg, #0466c8, #90e0ef)",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-[#90e0ef]/30 font-mono">{formatTime(audioDuration)}</span>
                      </div>
                    </div>
                  </div>
                  {article.audio_host && (
                    <div className="flex items-center gap-2 text-sm text-[#90e0ef]/50 mt-3">
                      <Mic size={14} className="text-[#0466c8]" />
                      <span>
                        {lang === "fr" ? "Présenté par" : "Hosted by"}{" "}
                        <strong className="text-[#90e0ef]/80">{article.audio_host}</strong>
                      </span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* LIVE FEED */}
              {article.is_live && <LiveFeed articleId={article.id} lang={lang} />}

              {/* RÉSUMÉ */}
              {summary && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl font-serif italic mb-10 leading-relaxed pl-6 border-l-2 border-[#0466c8]"
                  style={{ color: `${starColor}90` }}
                >
                  {summary}
                </motion.p>
              )}

              <div className="flex items-center gap-4 mb-10">
                <div className="flex-1 h-px bg-[#0466c8]/15" />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                  <CaurisIcon className="w-5 h-5 text-[#0466c8]/30" />
                </motion.div>
                <div className="flex-1 h-px bg-[#0466c8]/15" />
              </div>

              {/* CONTENU PRINCIPAL */}
              {segments.map((seg, segIdx) => {
                if (seg.kind === 'html') {
                  // ✅ FIX : Utiliser seg.content (portion spécifique) au lieu de renderedHtml (tout l'article)
                  return (
                    <div
                      key={`html-${segIdx}`}
                      className="prose prose-invert max-w-none mb-6"
                      dangerouslySetInnerHTML={{
                        __html: seg.content,  // ← CHANGEMENT ICI
                      }}
                    />
                  );
                }
                if (seg.kind === "chart") {
                  const chart = linkedCharts[seg.index];
                  if (!chart) return null;
                  return (
                    <motion.div key={`chart-${segIdx}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="my-10">
                      <div className="flex items-center gap-3 mb-4">
                        <BarChart3 size={16} className="text-[#0466c8]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0466c8]">
                          {lang === "fr" ? "Données & Chiffres" : "Data & Figures"}
                        </span>
                        <div className="flex-1 h-px bg-[#0466c8]/20" />
                      </div>
                      <ChartCard chart={chart} lang={lang} onClick={() => setSelectedChartModal(chart)} />
                    </motion.div>
                  );
                }
                if (seg.kind === "related") {
                  const teaser = article.related_teasers?.find(t => t.insert_index === seg.index);
                  const targetId = article.related_articles_ids?.[seg.index];
                  const targetArticle = targetId ? feedItems.find(a => a.id === targetId) : null;
                  if (!targetArticle) return null;
                  return (
                    <InlineRelatedTeaser
                      key={`related-${segIdx}`}
                      teaser={teaser || { kicker_fr: "À lire aussi", kicker_en: "Also read" }}
                      article={targetArticle}
                      lang={lang}
                      onSelect={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        window.dispatchEvent(new CustomEvent("lukeni:select-article", { detail: targetArticle }));
                      }}
                    />
                  );
                }
                if (seg.kind === "media_code") {
                  const media = article.media_items?.[seg.index];
                  if (!media || media.type !== "code") return null;
                  return <CodeBlock key={`code-${segIdx}`} language={media.code_language || "plaintext"} code={media.code_content || ""} caption={media.caption} />;
                }
                if (seg.kind === "media_gallery") {
                  const media = article.media_items?.[seg.index];
                  if (!media || media.type !== "gallery") return null;
                  return <GalleryBlock key={`gallery-${segIdx}`} urls={media.gallery_urls || []} caption={media.caption} lang={lang} />;
                }
                if (seg.kind === "media_quote") {
                  const media = article.media_items?.[seg.index];
                  if (!media || media.type !== "quote_hero") return null;
                  return <QuoteHero key={`quote-${segIdx}`} text={media.quote_text || ""} author={media.quote_author} />;
                }
                if (seg.kind === "announcement") {
                  if (!announcements || announcements.length === 0) return null;
                  return <AnnouncementsCarousel key={`announcement-${segIdx}`} announcements={announcements} lang={lang} />;
                }
                return null;
              })}

              {/* ANNONCES — fin d'article si pas de marqueur */}
              {announcements.length > 0 && !(content || "").includes("[ANNOUNCEMENT]") && (
                <AnnouncementsCarousel announcements={announcements} lang={lang} />
              )}

              {/* GRAPHIQUES NON POSITIONNÉS */}
              {linkedCharts.filter((_, i) => !(content || "").includes(`[CHART:${i}]`)).length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-12 py-8 border-y border-[#0466c8]/20"
                >
                  <h3 className="flex items-center gap-2 text-xl font-serif italic text-white mb-6">
                    <BarChart3 size={24} className="text-[#0466c8]" />
                    {lang === "fr" ? "Chiffres & Données Clés" : "Key Figures & Data"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {linkedCharts
                      .filter((_, i) => !(content || "").includes(`[CHART:${i}]`))
                      .map(chart => (
                        <ChartCard key={chart.id} chart={chart} lang={lang} onClick={() => setSelectedChartModal(chart)} />
                      ))}
                  </div>
                </motion.section>
              )}

              {/* MODALE GRAPHIQUE */}
              <AnimatePresence>
                {selectedChartModal && (
                  <ChartModal chart={selectedChartModal} lang={lang} onClose={() => setSelectedChartModal(null)} />
                )}
              </AnimatePresence>

              {/* SOURCES */}
              {article.sources && article.sources.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-12 pt-8 border-t border-[#0466c8]/20"
                >
                  <h3 className="flex items-center gap-2 text-base font-bold text-white mb-5">
                    <BookOpen size={15} className="text-[#0466c8]" />
                    {lang === "fr" ? "Sources & Références" : "Sources & References"}
                  </h3>
                  <div className="space-y-3">
                    {article.sources.map((source, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}
                        className="p-4 bg-[#000d1a] border border-[#0466c8]/15 rounded-2xl hover:border-[#0466c8]/35 transition-all group"
                      >
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#48cae4] group-hover:text-[#90e0ef] font-medium text-sm mb-2 transition-colors">
                          {source.title} <ExternalLink size={11} className="opacity-60" />
                        </a>
                        <div className="flex items-center gap-4 text-[9px] text-[#90e0ef]/25">
                          {source.author && <span className="flex items-center gap-1"><User size={8} /> {source.author}</span>}
                          {source.date && <span className="flex items-center gap-1"><Calendar size={8} /> {source.date}</span>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* ARTICLES CONNEXES */}
              {article.related_articles_ids && article.related_articles_ids.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-12 pt-8 border-t border-[#0466c8]/20"
                >
                  <h3 className="flex items-center gap-2 text-base font-bold text-white mb-6">
                    <TrendingUp size={16} className="text-[#0466c8]" />
                    {lang === "fr" ? "À lire aussi" : "Read more"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {feedItems
                      .filter(a => article.related_articles_ids?.includes(a.id))
                      .map((a, i) => {
                        const relTitle = lang === "fr" ? a.title_fr : a.title_en;
                        const relCat = lang === "fr" ? a.category_name_fr : a.category_name_en;
                        const color = a.category_color || "#0466c8";
                        const thumb = getThumbnailUrl(a.cover_url, a.format);
                        return (
                          <motion.div
                            key={a.id}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: "smooth" });
                              window.dispatchEvent(new CustomEvent("lukeni:select-article", { detail: a }));
                            }}
                            className="flex gap-3 p-4 bg-[#000d1a] border border-[#0466c8]/15 rounded-xl hover:border-[#0466c8]/35 transition-all group cursor-pointer"
                          >
                            {thumb && (
                              <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-[#0466c8]/15">
                                <img src={thumb} alt={relTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-[8px] font-black uppercase tracking-wider" style={{ color }}>{relCat}</span>
                              <p className="text-[#48cae4] font-serif font-medium text-sm group-hover:text-[#90e0ef] line-clamp-2 transition-colors mt-1">{relTitle}</p>
                              <div className="flex items-center gap-2 mt-2 text-[9px] text-[#90e0ef]/25">
                                <Calendar size={9} /> {formatPublishedDate(a.published_at || a.date, lang)}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </motion.section>
              )}

              {/* COMMENTAIRES */}
              <CommentsSection articleId={article.id} lang={lang} user={user} userProfile={userProfile} />
            </div>

            {/* Colonne droite — Sidebar sticky (desktop uniquement) */}
            <div className="hidden xl:block">
              <div className="sticky top-24">
                <ArticleSidebar
                  sidebarSearchTerm={sidebarSearchTerm}
                  setSidebarSearchTerm={setSidebarSearchTerm}
                  searchMatches={searchMatches}
                  searchCurrentMatch={searchCurrentMatch}
                  goToNextMatch={goToNextMatch}
                  goToPrevMatch={goToPrevMatch}
                  clearHighlights={clearHighlights}
                  announcements={announcements}
                  recommendedArticles={recommendedArticles}
                  lang={lang}
                  onSelect={(a) => window.dispatchEvent(new CustomEvent("lukeni:select-article", { detail: a }))}
                  onOpenNewsletter={() => setIsNewsletterOpenSidebar(true)}
                  accentColor={starColor}
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal newsletter depuis sidebar */}
      <SubscribeModal
        isOpen={isNewsletterOpenSidebar}
        onClose={() => setIsNewsletterOpenSidebar(false)}
        isOrganic={false}
      />
    </motion.div>
  );
};

// ─── Avatar Profil Nav ────────────────────────────────────────────────────────

const NavUserAvatar = ({
  user,
  profile,
  lang,
}: {
  user: any;
  profile: UserProfile | null;
  lang: "fr" | "en";
}) => {
  if (!user) {
    return (
      <Link
        href="/auth"
        className="bg-[#0466c8] text-white px-4 py-1.5 rounded-full font-bold text-[9px] uppercase tracking-widest hover:bg-[#0353a4] transition-colors"
      >
        {lang === "fr" ? "Rejoindre" : "Join"}
      </Link>
    );
  }
  return (
    <Link href="/profil">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-[#0466c8]/40 hover:border-[#0466c8] transition-all shadow-[0_0_12px_rgba(4,102,200,0.3)] cursor-pointer"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || user.email}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#0466c8] flex items-center justify-center text-white font-black text-xs">
            {(
              profile?.full_name?.charAt(0) ||
              user.email?.charAt(0) ||
              "?"
            ).toUpperCase()}
          </div>
        )}
        <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border border-[#000814]" />
      </motion.div>
    </Link>
  );
};

// ─── Floating Socials ─────────────────────────────────────────────────────────

const FloatingSocials = ({ settings }: { settings: SocialSettings | null }) => {
  if (!settings) return null;
  const showWA = settings.wa_active && settings.whatsapp_number;
  const showIG = settings.ig_active && settings.instagram_url;
  const showFB = settings.fb_active && settings.facebook_url;
  if (!showWA && !showIG && !showFB) return null;

  return (
    <div className="fixed bottom-28 right-6 z-[300] flex flex-col gap-3">
      {showWA && (
        <a
          href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(settings.whatsapp_message || "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-[#001233] border border-green-500/40 backdrop-blur-md flex items-center justify-center text-green-400 hover:bg-green-500 hover:text-white transition-all shadow-lg hover:scale-110"
          style={{ boxShadow: "0 0 15px rgba(4,102,200,0.15)" }}
        >
          <MessageCircle size={22} />
        </a>
      )}
      {showIG && (
        <a
          href={settings.instagram_url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-[#001233] border border-pink-500/40 backdrop-blur-md flex items-center justify-center text-pink-400 hover:bg-pink-500 hover:text-white transition-all shadow-lg hover:scale-110"
        >
          <InstagramIcon size={22} />
        </a>
      )}
      {showFB && (
        <a
          href={settings.facebook_url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-[#001233] border border-[#0466c8]/40 backdrop-blur-md flex items-center justify-center text-[#90e0ef] hover:bg-[#0466c8] hover:text-white transition-all shadow-lg hover:scale-110"
        >
          <FacebookIcon size={22} />
        </a>
      )}
    </div>
  );
};


// ─── Bouton Remonter en haut ──────────────────────────────────────────────────

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3 }}
          onClick={scrollToTop}
          className="fixed bottom-6 left-6 z-[300] w-12 h-12 rounded-full bg-[#0466c8] hover:bg-[#0353a4] text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
          style={{ boxShadow: "0 0 20px rgba(4,102,200,0.4), 0 4px 12px rgba(0,0,0,0.3)" }}
          aria-label="Remonter en haut"
        >
          <ChevronRight size={20} className="-rotate-90" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

// ─── Page Principale ──────────────────────────────────────────────────────────

export default function PressePage() {
  const { lang, setLang, toggleLang } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [feedItems, setFeedItems] = useState<UnifiedItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [socialSettings, setSocialSettings] = useState<SocialSettings | null>(
    null,
  );

  const [allMacroCharts, setAllMacroCharts] = useState<MacroChart[]>([]);
  const [digests, setDigests] = useState<DigestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [announcements, setAnnouncements] = useState<PressAnnouncement[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<UnifiedItem | null>(
    null,
  );
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [viewMode, setViewMode] = useState<"magazine" | "list" | "cinema">(
    "magazine",
  );
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (data) setUserProfile(data);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedMode = localStorage.getItem("lukeni_press_view") as
      | "magazine"
      | "list"
      | "cinema"
      | null;
    if (savedMode && ["magazine", "list", "cinema"].includes(savedMode))
      setViewMode(savedMode);
    else {
      setViewMode("magazine");
      localStorage.setItem("lukeni_press_view", "magazine");
    }
  }, []);

  useEffect(() => {
    let raf: number;
    const onMove = (e: MouseEvent) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setMousePos({
          x: e.clientX / window.innerWidth - 0.5,
          y: e.clientY / window.innerHeight - 0.5,
        }),
      );
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("lukeni_lang") as "fr" | "en" | null;
    if (saved) setLang(saved);

    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) await fetchUserProfile(currentUser.id);
    };
    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, s) => {
      const currentUser = s?.user ?? null;
      setUser(currentUser);
      if (currentUser) await fetchUserProfile(currentUser.id);
      else setUserProfile(null);
    });

    const tick = () =>
      setCurrentTime(
        new Date().toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const timer = setInterval(tick, 1000);
    fetchData();

    const handleSelectArticle = (e: Event) => {
      const custom = e as CustomEvent;
      setSelectedArticle(custom.detail);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("lukeni:select-article", handleSelectArticle);
    return () => {
      subscription.unsubscribe();
      clearInterval(timer);
      window.removeEventListener("lukeni:select-article", handleSelectArticle);
    };

    return () => {
      subscription.unsubscribe();
      clearInterval(timer);
    };
  }, [fetchUserProfile]);

  useEffect(() => {
    if (searchTerm || isFocused || !smartSuggestions.length) return;
    const id = setInterval(
      () => setPlaceholderIdx((p) => (p + 1) % smartSuggestions.length),
      3500,
    );
    return () => clearInterval(id);
  }, [searchTerm, isFocused, smartSuggestions.length]);
  async function fetchData() {
    setIsLoading(true);
    const [
      artRes,
      arcRes,
      catRes,
      sugRes,
      socRes,
      annRes,
      chartRes,
      chartDataRes,
      chartSeriesRes,
      chartAnnotRes,
      digestRes,
    ] = await Promise.all([
      supabase
        .from("press_articles")
        .select("*, categories(*), press_authors(*)")
        .in("status", ["published", "scheduled"]),
      supabase.from("press_archives").select("*").eq("status", "published"),
      supabase
        .from("categories")
        .select("*")
        .eq("show_presse", true)
        .eq("is_active", true),
      supabase
        .from("search_suggestions")
        .select("*")
        .eq("is_active", true)
        .or("target_space.eq.all,target_space.eq.presse"),
      supabase.from("social_settings").select("*").eq("id", 1).single(),
      supabase
        .from("press_announcements")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("macro_charts")
        .select("*")
        .eq("workflow_status", "published"), // ✅ CHANGÉ
      supabase
        .from("macro_chart_data")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase.from("macro_chart_series").select("*"), // ✅ NOUVEAU
      supabase.from("macro_chart_annotations").select("*"), // ✅ NOUVEAU
      supabase.from("press_digest").select("*").eq("is_active", true).order("priority", { ascending: true }),
    ]);

    if (
      chartRes.data &&
      chartDataRes.data &&
      chartSeriesRes.data &&
      chartAnnotRes.data
    ) {
      const chartsWithData = chartRes.data.map((c: any) => ({
        ...c,
        dataPoints: chartDataRes.data.filter((d: any) => d.chart_id === c.id),
        macro_chart_series: chartSeriesRes.data.filter(
          (s: any) => s.chart_id === c.id,
        ),
        macro_chart_annotations: chartAnnotRes.data.filter(
          (a: any) => a.chart_id === c.id,
        ),
      }));
      setAllMacroCharts(chartsWithData);
    }

    const items: UnifiedItem[] = [];

    if (artRes.data) {
      artRes.data.forEach((a: any) => {
        const item: UnifiedItem = {
          itemType: "article",
          id: a.id,
          article_type: a.article_type || "written",
          title_fr: a.title_fr,
          title_en: a.title_en || "",
          summary_fr: a.summary_fr || "",
          summary_en: a.summary_en || "",
          content_fr: a.content_fr || "",
          content_en: a.content_en || "",
          cover_url: a.cover_url || "",
          audio_url: a.audio_url,
          reading_audio_url: a.reading_audio_url,
          audio_content_url: a.audio_content_url,
          audio_duration: a.audio_duration,
          audio_host: a.audio_host,
          author_or_source: a.author_name || "Rédaction",
          date: a.published_at || a.created_at,
          published_at: a.published_at,
          scheduled_publish_at: a.scheduled_publish_at,
          category_id: a.category_id || "",
          category_color: a.categories?.color || "#0466c8",
          category_name_fr: a.categories?.name_fr || "Presse",
          category_name_en: a.categories?.name_en || "Press",
          location_city: a.location_city,
          location_country: a.location_country,
          media_items: a.media_items,
          sources: a.sources,
          reading_time_minutes: a.reading_time_minutes,

          related_articles_ids: a.related_articles_ids,
          related_charts_ids: a.related_charts_ids,
          status: a.status,
          // Après related_charts_ids: a.related_charts_ids,
          related_teasers: a.related_teasers,
          font_size: a.font_size || 'normal',
          font_family: a.font_family || 'Merriweather',
          cover_type: a.cover_type || "image",
          cover_video_url: a.cover_video_url || null,
          is_live: a.is_live || false,
          is_breaking: a.is_breaking || false,
          author: a.author_id
            ? {
              id: a.author_id,
              name: a.press_authors?.name || a.author_name,
              role_fr: a.press_authors?.role_fr || "Journaliste",
              role_en: a.press_authors?.role_en || "Journalist",
              bio_fr: a.press_authors?.bio_fr,
              bio_en: a.press_authors?.bio_en,
              avatar_url: a.press_authors?.avatar_url,
              twitter_url: a.press_authors?.twitter_url,
            }
            : null,
        };
        // Filtrer selon l'heure locale du navigateur
        if (isArticleVisible(item)) items.push(item);
      });
    }

    if (arcRes.data) {
      arcRes.data.forEach((a: any) =>
        items.push({
          itemType: "archive",
          id: a.id,
          article_type: a.format === "audio" ? "audio" : undefined,
          title_fr: a.title_fr,
          title_en: a.title_en || "",
          summary_fr: a.content_fr
            ? a.content_fr.substring(0, 150) + "..."
            : "",
          summary_en: a.content_en
            ? a.content_en.substring(0, 150) + "..."
            : "",
          content_fr: a.content_fr || "",
          content_en: a.content_en || "",
          cover_url: a.media_url || "",
          audio_url: a.format === "audio" ? a.media_url : undefined,
          audio_content_url: a.format === "audio" ? a.media_url : undefined,
          author_or_source: a.source_name,
          date: a.original_date || a.created_at,
          published_at: a.original_date || a.created_at,
          category_id: "archive",
          category_color: "#F97316",
          category_name_fr: "Archivres de Presse",
          category_name_en: "Press Archives",
          format: a.format,
          source_url: a.source_url,
          status: "published",
        }),
      );
    }

    items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    setFeedItems(items);
    if (catRes.data) setCategories(catRes.data as any);
    if (sugRes.data) setSmartSuggestions(sugRes.data);
    if (socRes.data) setSocialSettings(socRes.data);
    if (annRes.data) {
      const activeAnnouncements = annRes.data.filter(
        (a: any) => a.status === "active",
      );
      setAnnouncements(activeAnnouncements as PressAnnouncement[]);
    }

    if (digestRes.data) setDigests(digestRes.data as DigestItem[]);

    setTimeout(() => setIsLoading(false), 800);
  }

  const filteredArticles = useMemo(() => {
    const filtered = feedItems.filter((a) => {
      const title = (lang === "fr" ? a.title_fr : a.title_en) ?? "";
      const city = a.location_city ?? "";
      const country = a.location_country ?? "";
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        title.toLowerCase().includes(term) ||
        city.toLowerCase().includes(term) ||
        country.toLowerCase().includes(term);
      const matchCat =
        activeCategory === "all" ||
        (activeCategory === "archive"
          ? a.itemType === "archive"
          : a.category_id === activeCategory);
      return matchSearch && matchCat;
    });

    // Tri : breaking + live en priorité, puis par date
    return filtered.sort((a, b) => {
      // Breaking + live d'abord
      const aScore = (a.is_breaking ? 2 : 0) + (a.is_live ? 1 : 0);
      const bScore = (b.is_breaking ? 2 : 0) + (b.is_live ? 1 : 0);
      if (aScore !== bScore) return bScore - aScore;
      // Puis par date
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [feedItems, searchTerm, activeCategory, lang]);

  const [heroArticle, ...gridArticles] = filteredArticles;

  const switchLang = () => {
    const nl: "fr" | "en" = lang === "fr" ? "en" : "fr";
    setLang(nl);
    localStorage.setItem("lukeni_lang", nl);
  };

  const handleViewChange = (v: "magazine" | "list" | "cinema") => {
    setViewMode(v);
    localStorage.setItem("lukeni_press_view", v);
  };

  return (
    <div
      className="min-h-screen text-white selection:bg-[#0466c8]/30 overflow-x-hidden relative"
      style={{ background: "#020B1A" }}
    >
      {/* Fond noir avec accents bleu minimal aux coins */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[140px] -translate-y-1/2 translate-x-1/4"
          style={{
            background:
              "radial-gradient(circle, #0466c808 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[160px] translate-y-1/3 -translate-x-1/4"
          style={{
            background:
              "radial-gradient(circle, #0353a408 0%, transparent 70%)",
          }}
        />
      </div>

      <FloatingSocials settings={socialSettings} />
      <ScrollToTopButton />

      {/* Loading screen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8"
            style={{ background: "#020B1A" }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <CaurisIcon className="w-20 h-20 text-[#0466c8]" />
            </motion.div>
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[#90e0ef] text-[11px] tracking-[0.4em] font-light uppercase"
            >
              {lang === "fr"
                ? "Chaque génération doit..."
                : "Each generation must…"}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAV */}
      <nav
        className="sticky top-0 z-[100] backdrop-blur-2xl border-b border-[#0466c8]/15 px-4 md:px-8 py-3"
        style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/explore">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-2 border border-[#0466c8]/20 rounded-xl text-[#90e0ef]/50 hover:text-[#90e0ef] hover:border-[#0466c8]/40 transition-all cursor-pointer"
                style={{ backgroundColor: "rgba(13,13,13,0.8)" }}
              >
                <ArrowLeft size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">
                  {lang === "fr" ? "Retour" : "Back"}
                </span>
              </motion.div>
            </Link>

            <AnimatePresence mode="wait">
              {selectedArticle ? (
                <motion.button
                  key="back-article"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => setSelectedArticle(null)}
                  className="flex items-center gap-2 text-[#90e0ef]/50 hover:text-[#90e0ef] transition-colors group"
                >
                  <ChevronLeft
                    size={15}
                    className="group-hover:-translate-x-1 transition-transform"
                  />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">
                    {lang === "fr" ? "Tous nos articles" : "All articles"}
                  </span>
                </motion.button>
              ) : (
                <motion.div
                  key="logo"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Link href="/" className="flex items-center gap-2.5 group">
                    <motion.div
                      animate={{
                        boxShadow: [
                          "0 0 10px rgba(4,102,200,0.2)",
                          "0 0 25px rgba(4,102,200,0.4)",
                          "0 0 10px rgba(4,102,200,0.2)",
                        ],
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="rounded-full"
                    >
                      <CaurisIcon className="w-7 h-7 text-[#0466c8] group-hover:rotate-12 transition-transform duration-500" />
                    </motion.div>
                    <span className="font-serif tracking-[0.4em] text-base text-[#90e0ef] hidden sm:block">
                      LUKENI
                    </span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2">
            <div
              className="text-[9px] font-mono text-[#90e0ef] tracking-[0.3em] px-3 py-1.5 rounded-full border border-[#0466c8]/15"
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            >
              {currentTime}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={switchLang}
              className="flex items-center gap-1.5 border border-[#0466c8]/20 px-3 py-1.5 rounded-full text-[#90e0ef] hover:bg-[#0466c8] hover:text-white transition-all font-bold text-[9px] backdrop-blur-sm uppercase"
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            >
              <Globe size={11} /> {lang}
            </motion.button>
            <NavUserAvatar user={user} profile={userProfile} lang={lang} />
          </div>
        </div>
      </nav>

      {/* BANDEAU BREAKING NEWS */}
      <AnimatePresence>
        {feedItems.some((a) => a.is_breaking) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-[90] overflow-hidden bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600"
            style={{ boxShadow: "0 0 30px rgba(249,115,22,0.4)" }}
          >
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center gap-5">
              <div className="flex items-center gap-2 flex-shrink-0">
                <motion.span
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="block w-2.5 h-2.5 bg-white rounded-full"
                />
                <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">
                  ⚡ {lang === "fr" ? "Actus" : "Breaking"}
                </span>
              </div>

              <div className="flex-1 min-h-[24px] overflow-hidden">
                <motion.div
                  animate={{ x: ["100%", "-100%"] }}
                  transition={{
                    duration: 25,
                    ease: "linear",
                    repeat: Infinity,
                  }}
                  className="flex items-center gap-8 whitespace-nowrap"
                >
                  {feedItems
                    .filter((a) => a.is_breaking)
                    .map((a, i) => (
                      <motion.button
                        key={`${a.id}-${i}`}
                        onClick={() => {
                          setSelectedArticle(a);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        whileHover={{ scale: 1.02 }}
                        className="text-white text-xs font-bold hover:opacity-80 transition-opacity flex items-center gap-2 px-2"
                      >
                        <span className="w-1 h-1 bg-white rounded-full flex-shrink-0" />
                        <span>{lang === "fr" ? a.title_fr : a.title_en}</span>
                      </motion.button>
                    ))}
                </motion.div>
              </div>

              <button
                onClick={() => setActiveCategory("all")}
                className="text-white text-[10px] font-bold uppercase tracking-wider hover:opacity-80 transition-opacity flex-shrink-0 px-2"
              >
                {lang === "fr" ? "Voir tout" : "View all"} →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!selectedArticle ? (
          <motion.div
            key="press-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Calque décoratif culturel — visible uniquement sur la page liste */}
            <CulturalDecorLayer mousePos={mousePos} />

            <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-12 lg:py-20">
              {/* HEADER */}
              <header className="text-center mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-[#0466c8] text-[9px] tracking-[0.6em] uppercase font-black mb-6 opacity-60">
                    {lang === "fr"
                      ? "Actualités sur Notre Monde"
                      : "News about our World"}
                  </p>
                  <div className="flex items-center justify-center gap-8 mb-2">
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="hidden md:block"
                      style={{ filter: "drop-shadow(0 0 20px rgba(4,102,200,0.6))" }}
                    >
                      <MasqueAfricainIcon size={120} className="text-[#0466c8] opacity-60" />
                    </motion.div>

                    <h1
                      className="text-4xl sm:text-5xl md:text-7xl lg:text-[90px] xl:text-[110px] font-serif italic text-white tracking-tighter mb-0 leading-none"
                      style={{ textShadow: "0 0 60px #0466c820" }}
                    >
                      Le Continent
                    </h1>

                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                      className="hidden md:block"
                      style={{ filter: "drop-shadow(0 0 20px rgba(4,102,200,0.6))" }}
                    >
                      <LaptopIcon size={120} className="text-[#0466c8] opacity-60" />
                    </motion.div>
                  </div>
                  <p className="text-[#90e0ef]/30 text-xs tracking-[0.25em] uppercase mb-2">
                    {lang === "fr"
                      ? "Le média révolutionnaire"
                      : "The revolutionary media"}
                  </p>
                  {/* Ligne lumineuse sous le titre */}
                  <div
                    className="mx-auto w-24 h-px mb-8"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, #0466c8, transparent)",
                      boxShadow: "0 0 8px #0466c8",
                    }}
                  />
                  <p className="text-[#90e0ef]/20 text-sm tracking-[0.3em] uppercase mb-12">
                    {lang === "fr"
                      ? "Passé • Présent • Futur"
                      : "Past • Present • Future"}
                  </p>
                </motion.div>

                {/* SEARCH */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.7 }}
                  className="max-w-2xl mx-auto relative"
                >
                  <div
                    className={`relative flex items-center border rounded-full p-2.5 backdrop-blur-3xl transition-all duration-500 ${isFocused
                      ? "ring-2 ring-[#0466c8]/50 scale-[1.02] border-[#0466c8]/40 shadow-[0_0_80px_rgba(4,102,200,0.2)]"
                      : "border-[#0466c8]/15 shadow-[0_0_30px_rgba(4,102,200,0.03)]"
                      }`}
                    style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
                  >
                    <Search
                      className={`ml-3 flex-shrink-0 transition-all duration-300 ${isFocused ? "text-[#0466c8] scale-110" : "text-[#0466c8]/60"}`}
                      size={20}
                      strokeWidth={1.5}
                    />
                    <div className="flex-1 relative h-12 flex items-center px-4">
                      <AnimatePresence mode="wait">
                        {!searchTerm &&
                          !isFocused &&
                          smartSuggestions.length > 0 && (
                            <motion.span
                              key={`sug-${placeholderIdx}`}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 0.35, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.4 }}
                              className="absolute text-white text-base font-light italic pointer-events-none"
                            >
                              {lang === "fr"
                                ? smartSuggestions[placeholderIdx]?.text_fr
                                : smartSuggestions[placeholderIdx]?.text_en}
                            </motion.span>
                          )}
                      </AnimatePresence>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={
                          isFocused
                            ? lang === "fr"
                              ? "Titre, source ou ville…"
                              : "Title, source or city…"
                            : ""
                        }
                        className="w-full bg-transparent border-none outline-none text-white text-base font-light relative z-10 placeholder:text-[#90e0ef]/20"
                      />
                    </div>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="mr-2 p-1.5 rounded-full text-[#90e0ef]/30 hover:text-white hover:bg-white/5 transition-all"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {searchTerm && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-[#90e0ef]/25 text-[9px] mt-3 uppercase tracking-widest"
                    >
                      {filteredArticles.length}{" "}
                      {lang === "fr"
                        ? `récit${filteredArticles.length > 1 ? "s" : ""} trouvé${filteredArticles.length > 1 ? "s" : ""}`
                        : `stor${filteredArticles.length > 1 ? "ies" : "y"} found`}
                    </motion.p>
                  )}
                  <div className="mt-6 flex justify-center">
                    <SuggestButton space="presse" lang={lang} />
                  </div>
                </motion.div>

                <div className="mt-8 flex justify-center">
                  <ViewSwitcher
                    current={viewMode}
                    onChange={handleViewChange}
                    lang={lang}
                  />
                </div>
              </header>

              {/* FILTRES */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col gap-5 mb-12"
              >
                <div className="flex items-center justify-between border-b border-[#0466c8]/15 pb-4">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-[#90e0ef]/25">
                    {lang === "fr"
                      ? "Filtrer par univers"
                      : "Filter by universe"}
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setIsNewsletterOpen(true)}
                    className="flex items-center gap-2 text-[#0466c8] text-[9px] font-black uppercase tracking-widest hover:opacity-60 transition-opacity"
                  >
                    <Bell size={11} />
                    <span className="hidden sm:block">
                      {lang === "fr" ? "S'abonner" : "Subscribe"}
                    </span>
                  </motion.button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCategory("all")}
                    className={`flex-shrink-0 px-4 md:px-5 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeCategory === "all"
                      ? "bg-[#0466c8] text-white shadow-[0_0_20px_rgba(4,102,200,0.3)]"
                      : "border border-[#0466c8]/15 text-[#90e0ef]/40 hover:text-[#90e0ef]"
                      }`}
                    style={{
                      backgroundColor:
                        activeCategory === "all"
                          ? undefined
                          : "rgba(0,0,0,0.5)",
                    }}
                  >
                    {lang === "fr" ? "Tout" : "All"}
                  </motion.button>

                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex-shrink-0 flex items-center border border-[#0466c8]/10 rounded-full overflow-hidden hover:border-[#0466c8]/30 transition-colors"
                      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                    >
                      <div
                        className="w-2 h-2 rounded-full mx-2.5 md:mx-3 flex-shrink-0"
                        style={{
                          backgroundColor: cat.color || "#0466c8",
                          boxShadow: `0 0 6px 2px ${cat.color || "#0466c8"}50`,
                        }}
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`pr-2 md:pr-3 py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === cat.id
                          ? "text-white"
                          : "text-[#90e0ef]/40 hover:text-[#90e0ef]"
                          }`}
                      >
                        {lang === "fr" ? cat.name_fr : cat.name_en}
                      </motion.button>
                      <SubscribeButton
                        categoryId={cat.id}
                        label={lang === "fr" ? "Suivre" : "Follow"}
                      />
                    </div>
                  ))}

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCategory("archive")}
                    className={`flex-shrink-0 px-4 md:px-5 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap border border-orange-500/30 ${activeCategory === "archive"
                      ? "bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                      : "bg-orange-500/10 text-orange-400 hover:text-white"
                      }`}
                  >
                    {lang === "fr" ? "Archives de Presse" : "Press Archives"}
                  </motion.button>
                </div>
              </motion.div>

              {/* Séparateur Kenté */}
              <KenteSeparator className="mb-10" />

              {/* CONTENU */}
              {filteredArticles.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-32 flex flex-col items-center gap-4"
                >
                  <motion.div
                    animate={{ opacity: [0.25, 0.40, 0.25] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    style={{ filter: "drop-shadow(0 0 20px rgba(4,102,200,0.3))" }}
                  >
                    <LaptopIcon size={140} className="text-[#0466c8]" />
                  </motion.div>
                  <p className="text-[#90e0ef]/20 text-base">
                    {lang === "fr" ? "Aucun récit trouvé" : "No stories found"}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-[#0466c8] text-xs underline underline-offset-4 hover:opacity-70 transition-opacity"
                    >
                      {lang === "fr" ? "Effacer le filtre" : "Clear filter"}
                    </button>
                  )}
                </motion.div>
              ) : (
                <>
                  {feedItems.length > 3 && (
                    <NewsTicker
                      articles={feedItems}
                      lang={lang}
                      onSelect={setSelectedArticle}
                    />
                  )}

                  {viewMode === "list" && (
                    <div className="flex flex-col gap-3">
                      {filteredArticles.map((article, i) => (
                        <React.Fragment key={article.id}>
                          <ArticleCard
                            article={article}
                            lang={lang}
                            index={i}
                            onClick={() => setSelectedArticle(article)}
                            variant="list"
                          />
                          {/* Digest après le 4e article */}
                          {digests
                            .filter(d => d.is_active && d.position_after_index === i + 1)
                            .map(d => (
                              <DigestWidget
                                key={d.id}
                                digest={d}
                                feedItems={feedItems}
                                lang={lang}
                                onSelect={setSelectedArticle}
                              />
                            ))
                          }
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {viewMode === "magazine" && (
                    <>
                      {heroArticle && (
                        <div className="mb-8">
                          <ArticleCard
                            article={heroArticle}
                            lang={lang}
                            index={0}
                            onClick={() => setSelectedArticle(heroArticle)}
                            variant="hero"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                        {gridArticles.map((article, i) => {
                          // Articles longs : prennent 2 colonnes
                          const isLong =
                            (article.content_fr?.length ?? 0) > 2000 ||
                            (article.content_en?.length ?? 0) > 2000;
                          const colSpan = isLong ? "md:col-span-2" : "";
                          return (
                            <div key={article.id} className={colSpan}>
                              <ArticleCard
                                article={article}
                                lang={lang}
                                index={i}
                                onClick={() => setSelectedArticle(article)}
                                variant={
                                  isLong
                                    ? "featured"
                                    : i === 1 || i === 6
                                      ? "featured"
                                      : "standard"
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                      {/* Digests placés après la grille */}
                      {digests.filter(d => d.is_active).map(d => (
                        <DigestWidget
                          key={d.id}
                          digest={d}
                          feedItems={feedItems}
                          lang={lang}
                          onSelect={setSelectedArticle}
                        />
                      ))}
                    </>
                  )}

                  {viewMode === "cinema" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                      {filteredArticles.map((article, i) => (
                        <React.Fragment key={article.id}>
                          <ArticleCard
                            article={article}
                            lang={lang}
                            index={i}
                            onClick={() => setSelectedArticle(article)}
                            variant="cinema"
                          />
                          {digests
                            .filter(d => d.is_active && d.position_after_index === i + 1)
                            .map(d => (
                              <div key={d.id} className="col-span-1 sm:col-span-2 lg:col-span-3">
                                <DigestWidget
                                  digest={d}
                                  feedItems={feedItems}
                                  lang={lang}
                                  onSelect={setSelectedArticle}
                                />
                              </div>
                            ))
                          }
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </>
              )}
            </main>

            <footer className="py-20 text-center relative z-10">
              <KenteSeparator className="mb-16" />
              <p className="text-[#0466c8] text-[9px] font-black uppercase tracking-[0.5em] opacity-20 mb-6">
                {lang === "fr"
                  ? "Le Continent • Média Révolutionnaire by Lukeni"
                  : "Le Continent • Revolutionary Media by Lukeni"}
              </p>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="w-10 h-10 rounded-full border border-[#0466c8]/15 flex items-center justify-center mx-auto hover:bg-[#0466c8] hover:text-white hover:border-[#0466c8] transition-all duration-300 group"
                style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              >
                <ArrowRight
                  size={16}
                  className="-rotate-90 group-hover:-translate-y-0.5 transition-transform text-[#90e0ef]"
                />
              </motion.button>
            </footer>
          </motion.div>
        ) : (
          <motion.div
            key={`article-${selectedArticle.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <NotesplitContainer
              itemId={selectedArticle.id}
              itemType="press"
              userId={user?.id}
              catColor={selectedArticle.category_color}
              lang={lang}
            >
              <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
                <ArticleView
                  article={selectedArticle}
                  lang={lang}
                  onClose={() => setSelectedArticle(null)}
                  mousePos={mousePos}
                  feedItems={feedItems}
                  user={user}
                  userProfile={userProfile}
                  announcements={announcements}
                  allCharts={allMacroCharts}
                />
              </div>
            </NotesplitContainer>
          </motion.div>
        )}
      </AnimatePresence>

      <SubscribeModal
        isOpen={isNewsletterOpen}
        onClose={() => setIsNewsletterOpen(false)}
        isOrganic={false}
      />
    </div>
  );
}
