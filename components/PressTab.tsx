"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, Newspaper, PlusCircle, Edit2, Trash2, X, Languages,
  SpellCheck, CheckCircle, Lightbulb, Upload, Image as ImageIcon,
  Eye, Calendar, User, Tag, FileText, Sparkles, Clock, TrendingUp,
  Link as LinkIcon, Video, ExternalLink, BookOpen, Type, Code,
  List, ListOrdered, Quote, Bold, Italic, Heading, Save, Mic, Play,
  MapPin, Globe, Map, Navigation, AlertTriangle, Archive, Settings,
  MessageCircle, Filter, Radio, Headphones, AlignLeft, Info, ChevronDown, ChevronRight,
  Ban, Shield, MessageSquare, Users, BarChart3, Check, Zap, ChevronLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { autoTranslate, autoCorrect } from '@/lib/lingua';

// --- CUSTOM ICONS ---
const InstagramIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
);

const FacebookIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
);

interface Category { id: string; name_fr: string; name_en: string; }
interface MediaItem {
  type: 'image' | 'video' | 'link' | 'youtube' | 'code' | 'gallery' | 'quote_hero' | "text_table";

  url: string;
  caption?: string;
  alt?: string;
  // YouTube
  youtube_id?: string;
  // Code
  code_language?: string;
  code_content?: string;
  // Gallery
  gallery_urls?: string[];
  // Quote hero
  quote_text?: string;
  quote_author?: string;
  // Layout
  layout?: 'contained' | 'full-bleed' | 'wide';
}
interface Source {
  title: string;
  url: string;
  author?: string;
  date?: string;
}

interface PressArticle {
  id: string;
  article_type: 'written' | 'audio';
  title_fr: string;
  title_en: string;
  content_fr: string;
  content_en: string;
  summary_fr: string;
  summary_en: string;
  cover_url: string;
  cover_type?: 'image' | 'video_loop' | 'gif';
  cover_video_url?: string;
  is_live?: boolean;
  is_breaking?: boolean;
  author_id?: string;
  audio_url?: string;
  reading_audio_url?: string;
  audio_content_url?: string;
  audio_duration?: string;
  audio_host?: string;
  author_name: string;
  category_id: string;
  status: string;
  media_items?: MediaItem[];
  sources?: Source[];
  created_at?: string;
  published_at?: string;
  scheduled_publish_at?: string;
  geographic_scope?: 'local' | 'national' | 'regional' | 'international';
  location_city?: string;
  location_country?: string;
  location_latitude?: number;
  location_longitude?: number;
  reading_time_minutes?: number;
  related_articles_ids?: string[];
  related_charts_ids?: string[];
  related_teasers?: {
    article_id: string;
    kicker_fr: string;
    kicker_en: string;
    insert_index: number;
  }[];
  categories: Category;
    font_size?: 'small' | 'normal' | 'large' | 'xlarge';
  font_family?: string;
}


interface PressAuthor {
  id: string;
  name: string;
  role_fr: string;
  role_en: string;
  bio_fr?: string;
  bio_en?: string;
  avatar_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  email?: string;
  is_active: boolean;
}

interface PressSuggestion {
  id: string;
  suggested_topic: string;
  sources: string;
  user_email: string;
  status: string;
  created_at?: string;
}

interface PressArchive {
  id: string;
  title_fr: string;
  title_en: string;
  content_fr: string;
  content_en: string;
  format: 'audio' | 'video' | 'image';
  media_url: string;
  source_name: string;
  source_url: string;
  original_date: string;
  status: string;
  created_at?: string;
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
  updated_at?: string;
}

interface BlockedUser {
  id: string;
  user_id: string;
  user_email: string;
  blocked_at: string;
  reason: string;
  blocked_by_admin: string;
}

interface SocialSettings {
  id: number;
  whatsapp_number: string;
  whatsapp_message: string;
  instagram_url: string;
  facebook_url: string;
  wa_active: boolean;
  ig_active: boolean;
  fb_active: boolean;
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
  created_at?: string;
  updated_at?: string;
}

interface PressAnnouncement {
  id: string;
  title_fr: string;
  title_en?: string;
  description_fr?: string;
  description_en?: string;
  image_url: string;
  legend_fr?: string;
  legend_en?: string;
  link_url?: string;
  status: 'active' | 'draft';
  created_at?: string;
}


const parseMarkdown = (text: string): string => {
  if (!text) return '';
  let html = text;
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-white mt-8 mb-4">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-white mt-6 mb-3">$1</h3>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="italic text-white/80">$1</em>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>');
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-[#D4AF37] pl-4 italic text-white/60 my-4">$1</blockquote>');
  html = html.replace(/`(.+?)`/g, '<code class="bg-white/10 px-2 py-1 rounded text-sm font-mono text-blue-300">$1</code>');
  html = html.replace(/```([\s\S]+?)```/g, '<pre class="bg-white/5 p-4 rounded-xl my-4 overflow-x-auto"><code class="text-sm font-mono text-green-300">$1</code></pre>');
  html = html.replace(/^- (.+)$/gm, '<li class="ml-6 mb-2 list-disc">$1</li>');
  html = html.replace(/(<li class="ml-6 mb-2 list-disc">[\s\S]+?<\/li>)/g, '<ul class="my-4 text-white/70">$1</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-6 mb-2 list-decimal">$1</li>');
  html = html.replace(/(<li class="ml-6 mb-2 list-decimal">[\s\S]+?<\/li>)/g, '<ol class="my-4 text-white/70">$1</ol>');
  html = html.split('\n\n').map(p => {
    if (p.trim() && !p.startsWith('<') && !p.match(/^\[MEDIA:/)) {
      return `<p class="mb-4 leading-relaxed">${p}</p>`;
    }
    return p;
  }).join('\n\n');
  return html;
};


// ─── Bloc média : Texte/Tableau/Illustration ──────────────────────────────

const TextTableBlockForm = ({
  onAdd,
  onCancel,
  caption,
  setCaption,
}: {
  onAdd: (type: string, content: string, format?: string) => void;
  onCancel: () => void;
  caption: string;
  setCaption: (v: string) => void;
}) => {
  const [blockType, setBlockType] = useState<'text' | 'table' | 'illustration'>('text');
  const [textContent, setTextContent] = useState('');
  const [tableRows, setTableRows] = useState(2);
  const [tableCols, setTableCols] = useState(3);
  const [tableData, setTableData] = useState<string[][]>([]);
  const [illustrationUrl, setIllustrationUrl] = useState('');
  const [illustrationAlt, setIllustrationAlt] = useState('');

  useEffect(() => {
    if (blockType === 'table') {
      const newData = Array(tableRows)
        .fill(null)
        .map(() => Array(tableCols).fill(''));
      setTableData(newData);
    }
  }, [blockType, tableRows, tableCols]);

  const generateTableMarkdown = () => {
    if (tableData.length === 0) return '';
    const header = tableData[0].map((_, i) => `Col ${i + 1}`).join(' | ');
    const separator = Array(tableCols).fill('---').join(' | ');
    const rows = tableData.slice(1).map(row => row.join(' | ')).join('\n');
    return `| ${header} |\n| ${separator} |\n| ${rows} |`;
  };

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-3 block">Type de bloc</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { val: 'text', label: 'Texte riche', icon: '✏️' },
            { val: 'table', label: 'Tableau', icon: '📊' },
            { val: 'illustration', label: 'Illustration', icon: '🖼️' },
          ] as const).map(opt => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setBlockType(opt.val)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                blockType === opt.val
                  ? 'border-green-500 bg-green-500/10 text-white'
                  : 'border-white/10 text-gray-500 hover:border-white/20'
              }`}
            >
              <div className="text-lg mb-1">{opt.icon}</div>
              <p className="text-xs font-bold">{opt.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Contenu spécifique au type */}
      {blockType === 'text' && (
        <div>
          <label className="text-xs font-semibold text-gray-400 mb-2 block">Texte riche (Markdown supporté)</label>
          <textarea
            value={textContent}
            onChange={e => setTextContent(e.target.value)}
            rows={8}
            placeholder="Vous pouvez utiliser la syntaxe Markdown : **gras**, *italique*, [lien](url), > citation, etc."
            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono"
          />
          <p className="text-[9px] text-gray-500 mt-2">Markdown complet supporté (tableaux, formules LaTeX, etc.)</p>
        </div>
      )}

      {blockType === 'table' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Lignes</label>
              <input
                type="number"
                value={tableRows}
                onChange={e => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="20"
                className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Colonnes</label>
              <input
                type="number"
                value={tableCols}
                onChange={e => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="10"
                className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">Remplissez le tableau</label>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-[#1a1a1a] border border-white/10 rounded-lg">
                <tbody>
                  {tableData.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, colIdx) => (
                        <td key={`${rowIdx}-${colIdx}`} className="border border-white/10 p-2">
                          <input
                            type="text"
                            value={cell}
                            onChange={e => {
                              const newData = tableData.map((r, i) =>
                                i === rowIdx ? r.map((c, j) => (j === colIdx ? e.target.value : c)) : r
                              );
                              setTableData(newData);
                            }}
                            placeholder={rowIdx === 0 ? `En-tête ${colIdx + 1}` : ''}
                            className="w-full bg-transparent text-white text-xs p-1 border-0 outline-none"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {blockType === 'illustration' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">URL de l'illustration</label>
            <input
              type="text"
              value={illustrationUrl}
              onChange={e => setIllustrationUrl(e.target.value)}
              placeholder="https://"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">Texte alternatif (accessibilité)</label>
            <input
              type="text"
              value={illustrationAlt}
              onChange={e => setIllustrationAlt(e.target.value)}
              placeholder="Description de l'illustration"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
            />
          </div>
        </div>
      )}

      {/* Légende commune */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-2 block">Légende / Description (optionnel)</label>
        <input
          type="text"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Ex: Détails importants sur ce bloc..."
          className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-white/5 text-gray-400 rounded-xl text-sm hover:bg-white/10"
        >
          Annuler
        </button>
        <button
          onClick={() => {
            if (blockType === 'text' && textContent.trim()) {
              onAdd('text', textContent, 'markdown');
            } else if (blockType === 'table') {
              onAdd('table', generateTableMarkdown(), 'markdown');
            } else if (blockType === 'illustration' && illustrationUrl.trim()) {
              onAdd('illustration', illustrationUrl, illustrationAlt);
            }
          }}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-500"
        >
          Ajouter le bloc
        </button>
      </div>
    </div>
  );
};

function DeleteSuggestionModal({ onConfirm, onCancel, suggestion }: { onConfirm: () => void; onCancel: () => void; suggestion: PressSuggestion; }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="bg-[#0f0f0f] border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-red-500/20 rounded-xl"><AlertTriangle size={24} className="text-red-400" /></div>
          <div><h3 className="text-white font-bold text-lg">Supprimer la suggestion ?</h3><p className="text-gray-400 text-xs">Cette action est irréversible</p></div>
        </div>
        <div className="mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/10">
          <p className="text-white text-sm font-medium mb-2">{suggestion.suggested_topic}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500"><User size={10} /><span>{suggestion.user_email}</span></div>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed mb-6">Cette suggestion sera définitivement supprimée de la base de données.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all">Annuler</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"><Trash2 size={16} />Supprimer</button>
        </div>
      </div>
    </div>
  );
}

function DeleteCommentModal({ onConfirm, onCancel, comment }: { onConfirm: () => void; onCancel: () => void; comment: PressComment; }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="bg-[#0f0f0f] border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-red-500/20 rounded-xl"><AlertTriangle size={24} className="text-red-400" /></div>
          <div><h3 className="text-white font-bold text-lg">Supprimer le commentaire ?</h3><p className="text-gray-400 text-xs">Cette action est irréversible</p></div>
        </div>
        <div className="mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/10">
          <p className="text-white text-sm font-medium mb-2 line-clamp-2">{comment.content}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500"><User size={10} /><span>{comment.user_name} ({comment.user_email})</span></div>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed mb-6">Le commentaire sera supprimé définitivement.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all">Annuler</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"><Trash2 size={16} />Supprimer</button>
        </div>
      </div>
    </div>
  );
}

function BlockUserModal({ onConfirm, onCancel, user }: { onConfirm: (reason: string) => void; onCancel: () => void; user: { id: string; email: string; name: string }; }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="bg-[#0f0f0f] border border-orange-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-orange-500/20 rounded-xl"><Ban size={24} className="text-orange-400" /></div>
          <div><h3 className="text-white font-bold text-lg">Bloquer l'utilisateur ?</h3><p className="text-gray-400 text-xs">Celui-ci ne pourra plus commenter</p></div>
        </div>
        <div className="mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/10">
          <p className="text-white text-sm font-medium">{user.name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-400 mb-2 block">Raison du blocage (optionnel)</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Contenu offensant, spam..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" rows={3} />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all">Annuler</button>
          <button onClick={() => onConfirm(reason)} className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"><Ban size={16} />Bloquer</button>
        </div>
      </div>
    </div>
  );
}

function InfoBadge({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
      <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function ArticleTypeSelector({ value, onChange }: { value: 'written' | 'audio'; onChange: (v: 'written' | 'audio') => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button type="button" onClick={() => onChange('written')} className={`relative p-5 rounded-2xl border-2 transition-all text-left group ${value === 'written' ? 'border-blue-500 bg-gradient-to-br from-blue-500/15 to-blue-600/5 shadow-lg shadow-blue-500/10' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2.5 rounded-xl ${value === 'written' ? 'bg-blue-500/30' : 'bg-white/10'}`}>
            <AlignLeft size={20} className={value === 'written' ? 'text-blue-300' : 'text-gray-500'} />
          </div>
          <div>
            <p className={`font-bold text-sm ${value === 'written' ? 'text-white' : 'text-gray-400'}`}>Article Écrit</p>
            {value === 'written' && <span className="text-[10px] text-blue-400 font-medium">✓ Sélectionné</span>}
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">Contenu textuel classique. Peut inclure un <span className="text-blue-400 font-medium">player de lecture vocale</span> pour aider les personnes qui ont du mal à lire.</p>
      </button>

      <button type="button" onClick={() => onChange('audio')} className={`relative p-5 rounded-2xl border-2 transition-all text-left group ${value === 'audio' ? 'border-purple-500 bg-gradient-to-br from-purple-500/15 to-purple-600/5 shadow-lg shadow-purple-500/10' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2.5 rounded-xl ${value === 'audio' ? 'bg-purple-500/30' : 'bg-white/10'}`}>
            <Radio size={20} className={value === 'audio' ? 'text-purple-300' : 'text-gray-500'} />
          </div>
          <div>
            <p className={`font-bold text-sm ${value === 'audio' ? 'text-white' : 'text-gray-400'}`}>Article Audio</p>
            {value === 'audio' && <span className="text-[10px] text-purple-400 font-medium">✓ Sélectionné</span>}
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">Le <span className="text-purple-400 font-medium">média audio est l'article même</span> (Podcast, interview audio). Le texte est optionnel.</p>
      </button>
    </div>
  );
}

export default function PressTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [view, setView] = useState<'articles' | 'archives' | 'suggestions' | 'comments' | 'moderation' | 'announcements' | 'settings' | 'live' | 'digest' | 'authors'>('articles');

  const [articles, setArticles] = useState<PressArticle[]>([]);
  const [archives, setArchives] = useState<PressArchive[]>([]);
  const [suggestions, setSuggestions] = useState<PressSuggestion[]>([]);
  const [comments, setComments] = useState<PressComment[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [macroCharts, setMacroCharts] = useState<{ id: string; title_fr: string }[]>([]);
  const [socialSettings, setSocialSettings] = useState<SocialSettings>({
    id: 1, whatsapp_number: '', whatsapp_message: '', instagram_url: '', facebook_url: '',
    wa_active: false, ig_active: false, fb_active: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [suggestionFilter, setSuggestionFilter] = useState<'all' | 'pending' | 'used'>('all');
  const [articleTypeFilter, setArticleTypeFilter] = useState<'all' | 'written' | 'audio'>('all');
  const [commentFilter, setCommentFilter] = useState<'all' | 'blocked'>('all');

  // --- STATES ARTICLE ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [articleType, setArticleType] = useState<'written' | 'audio'>('written');
  const [titleFr, setTitleFr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [contentFr, setContentFr] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [summaryFr, setSummaryFr] = useState('');
  const [summaryEn, setSummaryEn] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [readingAudioUrl, setReadingAudioUrl] = useState('');
  const [audioContentUrl, setAudioContentUrl] = useState('');
  const [audioDuration, setAudioDuration] = useState('');
  const [audioHost, setAudioHost] = useState('');
  const [readingTimeMinutes, setReadingTimeMinutes] = useState<number>(1);
  const [relatedArticlesIds, setRelatedArticlesIds] = useState<string[]>([]);
  const [relatedChartsIds, setRelatedChartsIds] = useState<string[]>([]);


  const [relatedTeasers, setRelatedTeasers] = useState<{
    article_id: string;
    kicker_fr: string;
    kicker_en: string;
    insert_index: number;
  }[]>([]);

  // Modal teaser
  const [showTeaserModal, setShowTeaserModal] = useState(false);
  const [teaserTargetArticleId, setTeaserTargetArticleId] = useState('');
  const [teaserKickerFr, setTeaserKickerFr] = useState('');
  const [teaserKickerEn, setTeaserKickerEn] = useState('');
  const [teaserInsertLang, setTeaserInsertLang] = useState<'fr' | 'en'>('fr');


  const [authorName, setAuthorName] = useState('Rédaction Lukeni');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('draft');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);

    const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large' | 'xlarge'>('normal');
  const [fontFamily, setFontFamily] = useState<string>('Merriweather');
  const [scheduledPublishAt, setScheduledPublishAt] = useState('');
  const [geographicScope, setGeographicScope] = useState<'local' | 'national' | 'regional' | 'international' | ''>('');
  const [locationCity, setLocationCity] = useState('');
  const [locationCountry, setLocationCountry] = useState('');
  const [locationLatitude, setLocationLatitude] = useState<number | undefined>();
  const [locationLongitude, setLocationLongitude] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'media' | 'sources' | 'location' | 'metadata'>('content');

  // --- STATES ARCHIVES ---
  const [showArchiveForm, setShowArchiveForm] = useState(false);
  const [archiveEditingId, setArchiveEditingId] = useState<string | null>(null);
  const [archiveTitleFr, setArchiveTitleFr] = useState('');
  const [archiveTitleEn, setArchiveTitleEn] = useState('');
  const [archiveContentFr, setArchiveContentFr] = useState('');
  const [archiveContentEn, setArchiveContentEn] = useState('');
  const [archiveFormat, setArchiveFormat] = useState<'audio' | 'video' | 'image'>('image');
  const [archiveMediaUrl, setArchiveMediaUrl] = useState('');
  const [archiveSourceName, setArchiveSourceName] = useState('');
  const [archiveSourceUrl, setArchiveSourceUrl] = useState('');
  const [archiveDate, setArchiveDate] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('published');


  // --- STATES ANNONCES ---
  const [announcements, setAnnouncements] = useState<PressAnnouncement[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementEditingId, setAnnouncementEditingId] = useState<string | null>(null);
  const [announcementTitleFr, setAnnouncementTitleFr] = useState('');
  const [announcementTitleEn, setAnnouncementTitleEn] = useState('');
  const [announcementDescriptionFr, setAnnouncementDescriptionFr] = useState('');
  const [announcementDescriptionEn, setAnnouncementDescriptionEn] = useState('');
  const [announcementImageUrl, setAnnouncementImageUrl] = useState('');
  const [announcementLegendFr, setAnnouncementLegendFr] = useState('');
  const [announcementLegendEn, setAnnouncementLegendEn] = useState('');
  const [announcementLinkUrl, setAnnouncementLinkUrl] = useState('');
  const [announcementStatus, setAnnouncementStatus] = useState<'active' | 'draft'>('draft');

  // --- UI STATES ---
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [showMediaModal, setShowMediaModal] = useState(false);
    const [mediaType, setMediaType] = useState<'image' | 'video' | 'link' | 'youtube' | 'code' | 'gallery' | 'quote_hero' | 'text_table'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaAlt, setMediaAlt] = useState('');
  const [mediaLayout, setMediaLayout] = useState<'contained' | 'full-bleed' | 'wide'>('contained');
  // YouTube
  const [mediaYoutubeUrl, setMediaYoutubeUrl] = useState('');
  // Code
  const [mediaCodeLang, setMediaCodeLang] = useState('javascript');
  const [mediaCodeContent, setMediaCodeContent] = useState('');
  // Gallery
  const [mediaGalleryUrls, setMediaGalleryUrls] = useState<string[]>([]);
  // Quote hero
  const [mediaQuoteText, setMediaQuoteText] = useState('');
  const [mediaQuoteAuthor, setMediaQuoteAuthor] = useState('');

  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceAuthor, setSourceAuthor] = useState('');
  const [sourceDate, setSourceDate] = useState('');

  const [suggestionToDelete, setSuggestionToDelete] = useState<PressSuggestion | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<PressComment | null>(null);
  const [userToBlock, setUserToBlock] = useState<{ id: string; email: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTypeInfo, setShowTypeInfo] = useState(false);

  const [coverType, setCoverType] = useState<'image' | 'video_loop' | 'gif'>('image');
  const [coverVideoUrl, setCoverVideoUrl] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [isBreaking, setIsBreaking] = useState(false);

  const [authorId, setAuthorId] = useState<string>('');
  const [authors, setAuthors] = useState<PressAuthor[]>([]);
  const [showAuthorForm, setShowAuthorForm] = useState(false);
  const [authorEditingId, setAuthorEditingId] = useState<string | null>(null);

  const [authorRoleFr, setAuthorRoleFr] = useState('Journaliste');
  const [authorRoleEn, setAuthorRoleEn] = useState('Journalist');
  const [authorBioFr, setAuthorBioFr] = useState('');
  const [authorBioEn, setAuthorBioEn] = useState('');
  const [authorAvatar, setAuthorAvatar] = useState('');
  const [authorTwitter, setAuthorTwitter] = useState('');
  const [authorLinkedin, setAuthorLinkedin] = useState('');

  // Digests multiples
  const [digests, setDigests] = useState<DigestItem[]>([]);
  const [showDigestForm, setShowDigestForm] = useState(false);
  const [editingDigestId, setEditingDigestId] = useState<string | null>(null);
  const [digestLabel, setDigestLabel] = useState('À lire absolument');
  const [digestLabelEn, setDigestLabelEn] = useState('Must read');
  const [digestArticleIds, setDigestArticleIds] = useState<string[]>([]);
  const [digestDesign, setDigestDesign] = useState<DigestItem['design']>('classic');
  const [digestAccentColor, setDigestAccentColor] = useState('#0466c8');
  const [digestPositionAfter, setDigestPositionAfter] = useState(4);
  const [digestIsActive, setDigestIsActive] = useState(false);
  const [isSavingDigest, setIsSavingDigest] = useState(false);

  // Live updates
  const [liveUpdates, setLiveUpdates] = useState<{
    id: string;
    article_id: string;
    content: string;
    media_url?: string;
    media_type?: string;
    author: string;
    is_pinned: boolean;
    created_at: string;
  }[]>([]);
  const [selectedLiveArticleId, setSelectedLiveArticleId] = useState<string | null>(null);
  const [newLiveContent, setNewLiveContent] = useState('');
  const [newLiveAuthor, setNewLiveAuthor] = useState('Rédaction Le Continent');
  const [isPostingLive, setIsPostingLive] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setIsLoading(true);
    const { data: catData } = await supabase.from('categories').select('id, name_fr, name_en').eq('is_active', true).eq('show_presse', true);
    if (catData) setCategories(catData);

    const { data: announcementData } = await supabase.from('press_announcements').select('*').order('created_at', { ascending: false });
    if (announcementData) setAnnouncements(announcementData);

    const { data: artData } = await supabase.from('press_articles').select('*, categories(id, name_fr, name_en)').order('created_at', { ascending: false });
    if (artData) setArticles(artData as unknown as PressArticle[]);

    const { data: arcData } = await supabase.from('press_archives').select('*').order('created_at', { ascending: false });
    if (arcData) setArchives(arcData as PressArchive[]);

    const { data: sugData } = await supabase.from('press_suggestions').select('*').order('created_at', { ascending: false });
    if (sugData) setSuggestions(sugData);

    const { data: commentsData } = await supabase.from('press_comments').select('*').order('created_at', { ascending: false });
    if (commentsData) setComments(commentsData);

    const { data: blockedUsersData } = await supabase.from('blocked_users').select('*').order('blocked_at', { ascending: false });
    if (blockedUsersData) setBlockedUsers(blockedUsersData);

    const { data: settingsData } = await supabase.from('social_settings').select('*').eq('id', 1).single();
    if (settingsData) setSocialSettings(settingsData);

    const { data: chartData } = await supabase.from('macro_charts').select('id, title_fr').eq('is_active', true);
    if (chartData) setMacroCharts(chartData);

    const { data: authorsData } = await supabase
      .from('press_authors')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (authorsData) setAuthors(authorsData);

    const { data: digestData } = await supabase
      .from('press_digest')
      .select('*')
      .order('priority', { ascending: true });
    if (digestData) setDigests(digestData as DigestItem[]);

    setIsLoading(false);
  }

  const resetForm = () => {
    setEditingId(null);
    setArticleType('written');
    setTitleFr('');
    setTitleEn('');
    setContentFr('');
    setContentEn('');
    setSummaryFr('');
    setSummaryEn('');
    setCoverUrl('');
    setCoverType('image');
    setCoverVideoUrl('');
    setIsLive(false);
    setIsBreaking(false);
    setAuthorId('');
    setReadingAudioUrl('');
    setAudioContentUrl('');
    setAudioDuration('');
    setAudioHost('');
    setReadingTimeMinutes(1);
    setRelatedArticlesIds([]);
    setAuthorName('Rédaction Lukeni');
    setRelatedChartsIds([]);
    setRelatedTeasers([]);
    setCategoryId('');
    setStatus('draft');
    setMediaItems([]);
    setSources([]);
    setScheduledPublishAt('');
    setGeographicScope('');
    setLocationCity('');
    setLocationCountry('');
    setLocationLatitude(undefined);
    setLocationLongitude(undefined);
    setShowForm(false);
    setActiveTab('content');
  };

  const handleEdit = (a: PressArticle) => {
    setEditingId(a.id);
    setArticleType(a.article_type || 'written');
    setTitleFr(a.title_fr);
    setTitleEn(a.title_en || '');
    setContentFr(a.content_fr || '');
    setContentEn(a.content_en || '');
    setSummaryFr(a.summary_fr || '');
    setSummaryEn(a.summary_en || '');
    setCoverUrl(a.cover_url || '');
    setCoverType(a.cover_type || 'image');
    setCoverVideoUrl(a.cover_video_url || '');
    setIsLive(a.is_live || false);
    setIsBreaking(a.is_breaking || false);
    setAuthorId(a.author_id || '');
    setReadingAudioUrl(a.reading_audio_url || '');
    setAudioContentUrl(a.audio_content_url || '');
    setAudioDuration(a.audio_duration || '');
    setAudioHost(a.audio_host || '');
    setReadingTimeMinutes(a.reading_time_minutes || 1);
    setRelatedArticlesIds(a.related_articles_ids || []);
    setRelatedChartsIds(a.related_charts_ids || []);
    setRelatedTeasers(a.related_teasers || []);
    setAuthorName(a.author_name || 'Rédaction Lukeni');
    setCategoryId(a.category_id || '');
    setStatus(a.status);
    setMediaItems(a.media_items || []);
    setSources(a.sources || []);
    setGeographicScope(a.geographic_scope || '');
    setLocationCity(a.location_city || '');
    setLocationCountry(a.location_country || '');
    setLocationLatitude(a.location_latitude);
    setLocationLongitude(a.location_longitude);
        setFontSize(a.font_size || 'normal');
    setFontFamily(a.font_family || 'Merriweather');
    
    if (a.scheduled_publish_at) {
      setScheduledPublishAt(new Date(a.scheduled_publish_at).toISOString().slice(0, 16));
    }
    
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!titleFr.trim()) return showMsg('error', 'Le titre français est requis');
    if (articleType === 'audio' && !audioContentUrl.trim()) return showMsg('error', 'Un article audio nécessite un fichier audio principal');
    setIsSaving(true);
    let finalStatus = status;
    if (scheduledPublishAt && new Date(scheduledPublishAt) > new Date()) finalStatus = 'scheduled';

    const payload = {
      article_type: articleType,
      title_fr: titleFr,
            font_size: fontSize,
      font_family: fontFamily,

      title_en: titleEn || null,
      content_fr: contentFr || null,
      content_en: contentEn || null,
      summary_fr: summaryFr || null,
      summary_en: summaryEn || null,
      cover_url: coverUrl || null,
      cover_type: coverType,
      cover_video_url: coverVideoUrl || null,
      is_live: isLive,
      is_breaking: isBreaking,
      author_id: authorId || null,
      reading_audio_url: articleType === 'written' ? (readingAudioUrl || null) : null,
      audio_content_url: articleType === 'audio' ? (audioContentUrl || null) : null,
      audio_duration: articleType === 'audio' ? (audioDuration || null) : null,
      audio_host: articleType === 'audio' ? (audioHost || null) : null,
      reading_time_minutes: readingTimeMinutes || 1,
      related_articles_ids: relatedArticlesIds.length > 0 ? relatedArticlesIds : null,
      related_charts_ids: relatedChartsIds.length > 0 ? relatedChartsIds : null,
      related_teasers: relatedTeasers.length > 0 ? relatedTeasers : null,
      author_name: authorName,
      category_id: categoryId || null,
      status: finalStatus,
      media_items: mediaItems.length > 0 ? mediaItems : null,
      sources: sources.length > 0 ? sources : null,
      geographic_scope: geographicScope || null,
      location_city: locationCity || null,
      location_country: locationCountry || null,
      location_latitude: locationLatitude || null,
      location_longitude: locationLongitude || null,
      scheduled_publish_at: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
      published_at: finalStatus === 'published' && !editingId ? new Date().toISOString() : undefined

    };

    try {
      if (editingId) {
        const { error } = await supabase.from('press_articles').update(payload).eq('id', editingId);
        if (error) throw error;
        showMsg('success', '✅ Article mis à jour avec succès');
      } else {
        const { error } = await supabase.from('press_articles').insert(payload);
        if (error) throw error;
        showMsg('success', '🎉 Nouvel article enregistré');
      }
      resetForm();
      fetchData();
    } catch (err: any) {
      showMsg('error', `Erreur : ${err.message}`);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    const { error } = await supabase.from('press_articles').delete().eq('id', id);
    if (!error) {
      setArticles(articles.filter(a => a.id !== id));
      showMsg('success', '🗑️ Article supprimé');
    } else {
      showMsg('error', error.message);
    }
  };

  // --- FONCTIONS ARCHIVE ---
  const resetArchiveForm = () => {
    setArchiveEditingId(null);
    setArchiveTitleFr('');
    setArchiveTitleEn('');
    setArchiveContentFr('');
    setArchiveContentEn('');
    setArchiveFormat('image');
    setArchiveMediaUrl('');
    setArchiveSourceName('');
    setArchiveSourceUrl('');
    setArchiveDate('');
    setArchiveStatus('published');
    setShowArchiveForm(false);
  };


  const resetAnnouncementForm = () => {
    setAnnouncementEditingId(null);
    setAnnouncementTitleFr('');
    setAnnouncementTitleEn('');
    setAnnouncementDescriptionFr('');
    setAnnouncementDescriptionEn('');
    setAnnouncementImageUrl('');
    setAnnouncementLegendFr('');
    setAnnouncementLegendEn('');
    setAnnouncementLinkUrl('');
    setAnnouncementStatus('draft');
    setShowAnnouncementForm(false);
  };

  const handleEditArchive = (a: PressArchive) => {
    setArchiveEditingId(a.id);
    setArchiveTitleFr(a.title_fr);
    setArchiveTitleEn(a.title_en || '');
    setArchiveContentFr(a.content_fr || '');
    setArchiveContentEn(a.content_en || '');
    setArchiveFormat(a.format);
    setArchiveMediaUrl(a.media_url || '');
    setArchiveSourceName(a.source_name || '');
    setArchiveSourceUrl(a.source_url || '');
    setArchiveDate(a.original_date ? new Date(a.original_date).toISOString().split('T')[0] : '');
    setArchiveStatus(a.status);
    setShowArchiveForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveArchive = async () => {
    if (!archiveTitleFr.trim() || !archiveSourceName.trim() || !archiveMediaUrl.trim()) {
      return showMsg('error', 'Le titre FR, le nom du média et le média principal sont requis');
    }
    setIsSaving(true);
    const payload = {
      title_fr: archiveTitleFr,
      title_en: archiveTitleEn || null,
      content_fr: archiveContentFr || null,
      content_en: archiveContentEn || null,
      format: archiveFormat,
      media_url: archiveMediaUrl,
      source_name: archiveSourceName,
      source_url: archiveSourceUrl || null,
      original_date: archiveDate || null,
      status: archiveStatus
    };

    try {
      if (archiveEditingId) {
        const { error } = await supabase.from('press_archives').update(payload).eq('id', archiveEditingId);
        if (error) throw error;
        showMsg('success', '✅ Archive mise à jour');
      } else {
        const { error } = await supabase.from('press_archives').insert(payload);
        if (error) throw error;
        showMsg('success', '🎉 Archive créée');
      }
      resetArchiveForm();
      fetchData();
    } catch (err: any) {
      showMsg('error', err.message);
    }
    setIsSaving(false);
  };

  const handleDeleteArchive = async (id: string) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette archive ?')) return;
    const { error } = await supabase.from('press_archives').delete().eq('id', id);
    if (!error) {
      setArchives(archives.filter(a => a.id !== id));
      showMsg('success', '🗑️ Archive supprimée');
    } else {
      showMsg('error', error.message);
    }
  };



  const handleEditAnnouncement = (a: PressAnnouncement) => {
    setAnnouncementEditingId(a.id);
    setAnnouncementTitleFr(a.title_fr);
    setAnnouncementTitleEn(a.title_en || '');
    setAnnouncementDescriptionFr(a.description_fr || '');
    setAnnouncementDescriptionEn(a.description_en || '');
    setAnnouncementImageUrl(a.image_url);
    setAnnouncementLegendFr(a.legend_fr || '');
    setAnnouncementLegendEn(a.legend_en || '');
    setAnnouncementLinkUrl(a.link_url || '');
    setAnnouncementStatus(a.status);
    setShowAnnouncementForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementTitleFr.trim() || !announcementImageUrl.trim()) {
      return showMsg('error', 'Le titre FR et l\'image sont requis');
    }
    setIsSaving(true);
    const payload = {
      title_fr: announcementTitleFr,
      title_en: announcementTitleEn || null,
      description_fr: announcementDescriptionFr || null,
      description_en: announcementDescriptionEn || null,
      image_url: announcementImageUrl,
      legend_fr: announcementLegendFr || null,
      legend_en: announcementLegendEn || null,
      link_url: announcementLinkUrl || null,
      status: announcementStatus
    };

    try {
      if (announcementEditingId) {
        const { error } = await supabase.from('press_announcements').update(payload).eq('id', announcementEditingId);
        if (error) throw error;
        showMsg('success', '✅ Annonce mise à jour');
      } else {
        const { error } = await supabase.from('press_announcements').insert(payload);
        if (error) throw error;
        showMsg('success', '🎉 Annonce créée');
      }
      resetAnnouncementForm();
      fetchData();
    } catch (err: any) {
      showMsg('error', err.message);
    }
    setIsSaving(false);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;
    const { error } = await supabase.from('press_announcements').delete().eq('id', id);
    if (!error) {
      setAnnouncements(announcements.filter(a => a.id !== id));
      showMsg('success', '🗑️ Annonce supprimée');
    } else {
      showMsg('error', error.message);
    }
  };

  const loadCloudinaryScript = (callback: () => void) => {
    // @ts-ignore
    if (!window.cloudinary) {
      const s = document.createElement('script');
      s.src = 'https://upload-widget.cloudinary.com/global/all.js';
      s.onload = callback;
      document.body.appendChild(s);
    } else {
      callback();
    }
  };

  const openCloudinaryWidget = (resourceType: 'image' | 'video', onSuccess: (url: string) => void, uploadKey: string) => {
    setIsUploading(uploadKey);
    loadCloudinaryScript(() => {
      // @ts-ignore
      const w = window.cloudinary.createUploadWidget({
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url'],
        resourceType,
        multiple: false
      }, (error: any, result: any) => {
        setIsUploading(null);
        if (result?.event === 'success') {
          onSuccess(result.info.secure_url);
          showMsg('success', '✅ Fichier uploadé avec succès');
        }
        if (error) showMsg('error', 'Erreur Cloudinary');
      });
      w.open();
    });
  };

  const handleLingua = async (action: string, isArchive = false) => {
    setIsProcessing(action);
    try {
      if (!isArchive) {
        if (action === 'translate-en') setTitleEn(await autoTranslate(titleFr, 'fr'));
        if (action === 'translate-fr') setTitleFr(await autoTranslate(titleEn, 'en'));
        if (action === 'correct-fr') setTitleFr(await autoCorrect(titleFr, 'fr'));
        if (action === 'correct-en') setTitleEn(await autoCorrect(titleEn, 'en'));
        if (action === 'translate-content-en') setContentEn(await autoTranslate(contentFr, 'fr'));
        if (action === 'translate-content-fr') setContentFr(await autoTranslate(contentEn, 'en'));
        if (action === 'translate-summary-en') setSummaryEn(await autoTranslate(summaryFr, 'fr'));
        if (action === 'translate-summary-fr') setSummaryFr(await autoTranslate(summaryEn, 'en'));
      } else {
        if (action === 'translate-en') setArchiveTitleEn(await autoTranslate(archiveTitleFr, 'fr'));
        if (action === 'translate-content-en') setArchiveContentEn(await autoTranslate(archiveContentFr, 'fr'));
      }
      showMsg('success', '✨ Traitement terminé avec succès');
    } catch (e) {
      showMsg('error', 'Erreur API Lingua');
    }
    setIsProcessing(null);
  };

  const getCurrentLocation = () => {
    setIsGeolocating(true);
    if (!navigator.geolocation) {
      showMsg('error', 'La géolocalisation n\'est pas supportée');
      setIsGeolocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationLatitude(latitude);
        setLocationLongitude(longitude);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`);
          const data = await response.json();
          if (data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.state || '';
            const country = data.address.country || '';
            setLocationCity(city);
            setLocationCountry(country);
            if (country === 'République démocratique du Congo' || country === 'Democratic Republic of the Congo') {
              setGeographicScope('national');
            } else if (city) {
              setGeographicScope('local');
            }
            showMsg('success', `📍 Localisé à ${city}, ${country}`);
          }
        } catch (error) {
          showMsg('error', 'Erreur lors de la récupération de l\'adresse');
        }
        setIsGeolocating(false);
      },
      (error) => {
        showMsg('error', 'Impossible d\'obtenir votre position');
        setIsGeolocating(false);
      }
    );
  };

  const openMediaCloudinary = () => {
    loadCloudinaryScript(() => {
      // @ts-ignore
      const w = window.cloudinary.createUploadWidget({
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url'],
        resourceType: mediaType === 'video' ? 'video' : 'image',
        multiple: false
      }, (error: any, result: any) => {
        if (result?.event === 'success') {
          setMediaUrl(result.info.secure_url);
        }
        if (error) showMsg('error', 'Erreur Cloudinary');
      });
      w.open();
    });
  };

  const extractYoutubeId = (url: string): string => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : url;
  };

  const addMediaItem = () => {
    let newItem: MediaItem;

    if (mediaType === 'youtube') {
      if (!mediaYoutubeUrl.trim()) return showMsg('error', 'URL YouTube requise');
      const ytId = extractYoutubeId(mediaYoutubeUrl);
      newItem = {
        type: 'youtube',
        url: mediaYoutubeUrl,
        youtube_id: ytId,
        caption: mediaCaption || undefined,
        layout: mediaLayout,
      };
    } else if (mediaType === 'code') {
      if (!mediaCodeContent.trim()) return showMsg('error', 'Code requis');
      newItem = {
        type: 'code',
        url: '',
        code_language: mediaCodeLang,
        code_content: mediaCodeContent,
        caption: mediaCaption || undefined,
      };
    } else if (mediaType === 'gallery') {
      if (mediaGalleryUrls.length === 0) return showMsg('error', 'Ajoutez au moins une image');
      newItem = {
        type: 'gallery',
        url: mediaGalleryUrls[0],
        gallery_urls: mediaGalleryUrls,
        caption: mediaCaption || undefined,
      };
    } else if (mediaType === 'quote_hero') {
      if (!mediaQuoteText.trim()) return showMsg('error', 'Citation requise');
      newItem = {
        type: 'quote_hero',
        url: '',
        quote_text: mediaQuoteText,
        quote_author: mediaQuoteAuthor || undefined,
      };
    } else {
      if (!mediaUrl.trim()) return showMsg('error', 'URL requise');
      newItem = {
        type: mediaType,
        url: mediaUrl,
        caption: mediaCaption || undefined,
        alt: mediaAlt || undefined,
        layout: mediaLayout,
      };
    }

    setMediaItems([...mediaItems, newItem]);
    // Reset
    setMediaUrl(''); setMediaCaption(''); setMediaAlt('');
    setMediaYoutubeUrl(''); setMediaCodeContent(''); setMediaCodeLang('javascript');
    setMediaGalleryUrls([]); setMediaQuoteText(''); setMediaQuoteAuthor('');
    setMediaLayout('contained');
    setShowMediaModal(false);
    showMsg('success', '✅ Bloc média ajouté');
  };

  const removeMediaItem = (index: number) => {
    setMediaItems(mediaItems.filter((_, i) => i !== index));
  };

  const insertMediaIntoContent = (index: number, lang: 'fr' | 'en') => {
    const marker = `\n\n[MEDIA:${index}]\n\n`;
    const setter = lang === 'fr' ? setContentFr : setContentEn;
    const content = lang === 'fr' ? contentFr : contentEn;
    const textarea = document.getElementById(`content-${lang}`) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + marker + content.substring(end);
      setter(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + marker.length, start + marker.length);
      }, 0);
      showMsg('success', `📌 Média ${index + 1} inséré dans le texte ${lang.toUpperCase()}`);
    } else {
      setter(content + marker);
      showMsg('success', `📌 Média ${index + 1} ajouté à la fin`);
    }
  };

  const addSource = () => {
    if (!sourceTitle.trim() || !sourceUrl.trim()) return showMsg('error', 'Titre et URL requis');
    const newSource: Source = { title: sourceTitle, url: sourceUrl, author: sourceAuthor || undefined, date: sourceDate || undefined };
    setSources([...sources, newSource]);
    setSourceTitle('');
    setSourceUrl('');
    setSourceAuthor('');
    setSourceDate('');
    setShowSourceModal(false);
    showMsg('success', '✅ Source ajoutée');
  };

  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

const insertMarkdown = (syntax: string, cursorField: 'fr' | 'en') => {
  const textareaId = cursorField === 'fr' ? 'content-fr' : 'content-en';
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
  if (!textarea) {
    const field = cursorField === 'fr' ? contentFr : contentEn;
    const setter = cursorField === 'fr' ? setContentFr : setContentEn;
    setter(field + syntax);
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const field = cursorField === 'fr' ? contentFr : contentEn;
  const setter = cursorField === 'fr' ? setContentFr : setContentEn;
  const selectedText = field.substring(start, end);
  let newText = '';
  let cursorOffset = 0;

  // Gras
  if (syntax.includes('**texte gras**') || syntax.includes('**bold text**')) {
    if (selectedText) {
      newText = field.substring(0, start) + '**' + selectedText + '**' + field.substring(end);
      cursorOffset = end + 4;
    } else {
      const placeholder = syntax.includes('gras') ? 'texte gras' : 'bold text';
      newText = field.substring(0, start) + '**' + placeholder + '**' + field.substring(end);
      cursorOffset = start + 2 + placeholder.length + 2;
    }
  }
  // Italique
  else if (syntax.includes('*texte italique*') || syntax.includes('*italic text*')) {
    if (selectedText) {
      newText = field.substring(0, start) + '*' + selectedText + '*' + field.substring(end);
      cursorOffset = end + 2;
    } else {
      const placeholder = syntax.includes('italique') ? 'texte italique' : 'italic text';
      newText = field.substring(0, start) + '*' + placeholder + '*' + field.substring(end);
      cursorOffset = start + 1 + placeholder.length + 1;
    }
  }
  // Lien
  else if (syntax.includes('[texte') || syntax.includes('[link')) {
    const linkText = syntax.includes('texte') ? 'texte du lien' : 'link text';
    if (selectedText) {
      newText = field.substring(0, start) + '[' + selectedText + '](url)' + field.substring(end);
      cursorOffset = start + selectedText.length + 3;
    } else {
      newText = field.substring(0, start) + '[' + linkText + '](url)' + field.substring(end);
      cursorOffset = start + 1 + linkText.length + 2;
    }
  }
  // Titre (## ou ###)
  else if (syntax.startsWith('## ') || syntax.startsWith('### ')) {
    if (selectedText) {
      newText = field.substring(0, start) + syntax + selectedText + field.substring(end);
      cursorOffset = start + syntax.length + selectedText.length;
    } else {
      const placeholder = syntax.includes('Title') ? 'Title' : 'Titre';
      newText = field.substring(0, start) + syntax + placeholder + field.substring(end);
      cursorOffset = start + syntax.length + placeholder.length;
    }
  }
  // Citation (> )
  else if (syntax.startsWith('> ')) {
    if (selectedText) {
      newText = field.substring(0, start) + '> ' + selectedText + field.substring(end);
      cursorOffset = start + 2 + selectedText.length;
    } else {
      const placeholder = syntax.includes('Quote') ? 'Quote' : 'Citation';
      newText = field.substring(0, start) + '> ' + placeholder + field.substring(end);
      cursorOffset = start + 2 + placeholder.length;
    }
  }
  // Liste (- )
  else if (syntax.startsWith('- ')) {
    if (selectedText) {
      newText = field.substring(0, start) + '- ' + selectedText + field.substring(end);
      cursorOffset = start + 2 + selectedText.length;
    } else {
      const placeholder = syntax.includes('Item') ? 'Item' : 'Élément';
      newText = field.substring(0, start) + '- ' + placeholder + field.substring(end);
      cursorOffset = start + 2 + placeholder.length;
    }
  }
  // Annonce
  else if (syntax === '[ANNOUNCEMENT]') {
    newText = field.substring(0, start) + syntax + field.substring(end);
    cursorOffset = start + syntax.length;
  }
  // Autres
  else {
    newText = field.substring(0, start) + syntax + field.substring(end);
    cursorOffset = start + syntax.length;
  }

  setter(newText);
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorOffset, cursorOffset);
  }, 0);
};

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, field: 'fr' | 'en') => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertMarkdown(field === 'fr' ? '**texte gras**' : '**bold text**', field);
          break;
        case 'i':
          e.preventDefault();
          insertMarkdown(field === 'fr' ? '*texte italique*' : '*italic text*', field);
          break;
        case 'k':
          e.preventDefault();
          insertMarkdown(field === 'fr' ? '[texte du lien](url)' : '[link text](url)', field);
          break;
      }
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('social_settings').upsert({ id: 1, ...socialSettings });
      if (error) throw error;
      showMsg('success', '⚙️ Paramètres mis à jour');
    } catch (err: any) {
      showMsg('error', err.message);
    }
    setIsSaving(false);
  };

  const markSuggestionUsed = async (id: string) => {
    const { error } = await supabase.from('press_suggestions').update({ status: 'used' }).eq('id', id);
    if (!error) {
      setSuggestions(suggestions.map(s => s.id === id ? { ...s, status: 'used' } : s));
      showMsg('success', '✅ Suggestion marquée comme utilisée');
    }
  };

  const handleDeleteSuggestion = async () => {
    if (!suggestionToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('press_suggestions').delete().eq('id', suggestionToDelete.id);
      if (error) throw error;
      setSuggestions(suggestions.filter(s => s.id !== suggestionToDelete.id));
      showMsg('success', '🗑️ Suggestion supprimée');
      setSuggestionToDelete(null);
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('press_comments').delete().eq('id', commentToDelete.id);
      if (error) throw error;
      setComments(comments.filter(c => c.id !== commentToDelete.id));
      showMsg('success', '🗑️ Commentaire supprimé');
      setCommentToDelete(null);
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBlockUser = async (userId: string, userEmail: string, reason: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('blocked_users').insert({
        user_id: userId,
        user_email: userEmail,
        reason: reason || 'Modération de contenu',
        blocked_at: new Date().toISOString(),
        blocked_by_admin: 'admin'
      });
      if (error) throw error;

      // Marquer les commentaires de l'utilisateur comme bloqués
      const { error: updateError } = await supabase.from('press_comments')
        .update({ is_blocked: true })
        .eq('user_id', userId);
      if (updateError) throw updateError;

      fetchData();
      showMsg('success', '🚫 Utilisateur bloqué avec succès');
      setUserToBlock(null);
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors du blocage');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnblockUser = async (blockedUserId: string) => {
    try {
      const { error } = await supabase.from('blocked_users').delete().eq('id', blockedUserId);
      if (error) throw error;

      // Récupérer l'utilisateur débloqué
      const blockedUser = blockedUsers.find(bu => bu.id === blockedUserId);
      if (blockedUser) {
        const { error: updateError } = await supabase.from('press_comments')
          .update({ is_blocked: false })
          .eq('user_id', blockedUser.user_id);
        if (updateError) throw updateError;
      }

      fetchData();
      showMsg('success', '✅ Utilisateur débloqué');
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors du déblocage');
    }
  };

  const renderContentWithMedia = (content: string, mediaItems: MediaItem[]) => {
    let processedContent = parseMarkdown(content);
    mediaItems.forEach((media, index) => {
      const marker = `[MEDIA:${index}]`;
      let mediaHTML = '';
      if (media.type === 'image') {
        mediaHTML = `<div class="my-6"><img src="${media.url}" alt="${media.alt || 'Image'}" class="w-full rounded-xl shadow-lg" />${media.caption ? `<p class="text-center text-sm text-white/50 mt-3 italic">${media.caption}</p>` : ''}</div>`;
      } else if (media.type === 'video') {
        mediaHTML = `<div class="my-6"><video controls class="w-full rounded-xl shadow-lg"><source src="${media.url}" /></video>${media.caption ? `<p class="text-center text-sm text-white/50 mt-3 italic">${media.caption}</p>` : ''}</div>`;
      } else if (media.type === 'link') {
        mediaHTML = `<div class="my-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl"><a href="${media.url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 flex items-center gap-2">🔗 ${media.caption || media.url}</a></div>`;
      }
      processedContent = processedContent.replace(marker, mediaHTML);
    });
    return processedContent;
  };

  const stats = {
    totalWritten: articles.filter(a => a.article_type === 'written' || !a.article_type).length,
    totalAudio: articles.filter(a => a.article_type === 'audio').length,
    published: articles.filter(a => a.status === 'published').length,
    draft: articles.filter(a => a.status === 'draft').length,
    scheduled: articles.filter(a => a.status === 'scheduled').length,
    pendingSuggestions: suggestions.filter(s => s.status === 'pending').length,
    totalArchives: archives.length,
    totalComments: comments.length,
    blockedComments: comments.filter(c => c.is_blocked).length,
    blockedUsers: blockedUsers.length
  };

  const geographicOptions = [
    { value: 'local', label: 'Local', icon: MapPin, color: 'blue', desc: 'Ville ou commune' },
    { value: 'national', label: 'National', icon: Map, color: 'green', desc: 'Tout le pays' },
    { value: 'regional', label: 'Régional', icon: Globe, color: 'orange', desc: 'Afrique Centrale' },
    { value: 'international', label: 'International', icon: Globe, color: 'purple', desc: 'Mondial' }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-gray-400 text-sm animate-pulse">Chargement...</p>
      </div>
    );
  }

  const filteredSuggestionsList = suggestions.filter(s => suggestionFilter === 'all' || s.status === suggestionFilter);
  const filteredArticles = articles.filter(a => {
    if (articleTypeFilter === 'all') return true;
    if (articleTypeFilter === 'written') return a.article_type === 'written' || !a.article_type;
    return a.article_type === articleTypeFilter;
  });
  const filteredComments = comments.filter(c => commentFilter === 'all' || (commentFilter === 'blocked' && c.is_blocked));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* HEADER AVEC STATS */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10 rounded-2xl border border-white/10 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <Newspaper className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Espace Presse & Média
              </h2>
              <p className="text-gray-400 text-sm mt-1">Gérez vos articles écrits, contenus audio, archives, commentaires et suggestions</p>
            </div>
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><AlignLeft size={12} className="text-blue-400" /><span className="text-[10px] text-gray-400">Écrits</span></div>
              <p className="text-xl font-bold text-white">{stats.totalWritten}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><Radio size={12} className="text-purple-400" /><span className="text-[10px] text-gray-400">Audio</span></div>
              <p className="text-xl font-bold text-purple-400">{stats.totalAudio}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><Archive size={12} className="text-orange-400" /><span className="text-[10px] text-gray-400">Archives</span></div>
              <p className="text-xl font-bold text-orange-400">{stats.totalArchives}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><Eye size={12} className="text-green-400" /><span className="text-[10px] text-gray-400">Publiés</span></div>
              <p className="text-xl font-bold text-green-400">{stats.published}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><MessageSquare size={12} className="text-cyan-400" /><span className="text-[10px] text-gray-400">Commentaires</span></div>
              <p className="text-xl font-bold text-cyan-400">{stats.totalComments}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><Ban size={12} className="text-red-400" /><span className="text-[10px] text-gray-400">Bloqués</span></div>
              <p className="text-xl font-bold text-red-400">{stats.blockedComments}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><Shield size={12} className="text-pink-400" /><span className="text-[10px] text-gray-400">Utilisateurs</span></div>
              <p className="text-xl font-bold text-pink-400">{stats.blockedUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <button onClick={() => setView('articles')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'articles' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2"><Newspaper size={16} /> Articles</div>
        </button>
        <button onClick={() => setView('archives')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'archives' ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2"><Archive size={16} /> Archives</div>
        </button>
        <button onClick={() => setView('comments')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'comments' ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2">
            <MessageSquare size={16} /> Commentaires
            {stats.blockedComments > 0 && <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{stats.blockedComments}</span>}
          </div>
        </button>
        <button onClick={() => setView('moderation')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'moderation' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2">
            <Shield size={16} /> Utilisateurs bloqués
            {stats.blockedUsers > 0 && <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{stats.blockedUsers}</span>}
          </div>
        </button>
        <button onClick={() => setView('suggestions')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'suggestions' ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2">
            <Lightbulb size={16} /> Suggestions
            {stats.pendingSuggestions > 0 && <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{stats.pendingSuggestions}</span>}
          </div>
        </button>
        <button onClick={() => setView('announcements')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'announcements' ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2">
            <Newspaper size={16} /> Annonces
          </div>
        </button>
        <button onClick={() => setView('settings')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'settings' ? 'bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2"><Settings size={16} /> Réseaux</div>
        </button>

        <button onClick={() => setView('live')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'live' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2">
            <Radio size={16} />
            Direct / Live
            {articles.filter(a => a.is_live).length > 0 && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs animate-pulse">
                {articles.filter(a => a.is_live).length}
              </span>
            )}
          </div>
        </button>
        <button onClick={() => setView('digest')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'digest' ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2"><Newspaper size={16} /> Digest / Une</div>
        </button>

        <button onClick={() => setView('authors')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'authors' ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2"><User size={16} /> Auteurs</div>
        </button>

        {view === 'articles' && !showForm && (
          <button onClick={() => setShowForm(true)} className="ml-auto px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-green-500/20 transition-all flex items-center gap-2">
            <PlusCircle size={16} /> Nouvel Article
          </button>
        )}
        {view === 'archives' && !showArchiveForm && (
          <button onClick={() => setShowArchiveForm(true)} className="ml-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all flex items-center gap-2">
            <PlusCircle size={16} /> Ajouter Archive
          </button>
        )}
      </div>


      {view === 'announcements' && !showAnnouncementForm && (
        <button onClick={() => setShowAnnouncementForm(true)} className="ml-auto px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all flex items-center gap-2">
          <PlusCircle size={16} /> Ajouter Annonce
        </button>
      )}

      {/* VUE ARTICLES */}
      {view === 'articles' && (
        <>
          {showForm && (
            <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {editingId ? <Edit2 size={20} className="text-blue-400" /> : <Sparkles size={20} className="text-blue-400" />}
                  <h3 className="text-xl font-bold text-white">{editingId ? 'Modifier l\'article' : 'Créer un nouvel article'}</h3>
                  {!editingId && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${articleType === 'audio' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                      {articleType === 'audio' ? '🎙️ Audio' : '📝 Écrit'}
                    </span>
                  )}
                </div>
                <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="p-6 space-y-6">
                {/* 1 - TYPE */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold">1</span>
                      Type d'article
                    </label>
                    <button type="button" onClick={() => setShowTypeInfo(!showTypeInfo)} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
                      <Info size={12} /> {showTypeInfo ? 'Masquer les infos' : 'Quelle différence ?'}
                    </button>
                  </div>
                  {showTypeInfo && (
                    <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <p className="text-blue-400 font-bold text-sm flex items-center gap-2 mb-2"><AlignLeft size={14} /> Article Écrit</p>
                        <p className="text-xs text-gray-400">Le contenu est textuel. Le player de lecture vocale est optionnel et sert d'aide à la lecture.</p>
                      </div>
                      <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                        <p className="text-purple-400 font-bold text-sm flex items-center gap-2 mb-2"><Radio size={14} /> Article Audio</p>
                        <p className="text-xs text-gray-400">Le fichier audio principal (podcast, interview...) constitue l'essence du contenu.</p>
                      </div>
                    </div>
                  )}
                  <ArticleTypeSelector value={articleType} onChange={setArticleType} />
                </div>

                {/* 2 - METADONNEES */}
                <div>
                  <label className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold">2</span>
                    Informations générales
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2"><Tag size={14} /> Statut</label>
                      <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none">
                        <option value="draft">📝 Brouillon</option>
                        <option value="published">✅ Publié</option>
                        <option value="scheduled">🕐 Programmé</option>
                        <option value="archived">📦 Archivé</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2"><Tag size={14} /> Catégorie</label>
                      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none">
                        <option value="">Sans catégorie</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                        <User size={14} /> Auteur
                      </label>
                      <select
                        value={authorId}
                        onChange={e => {
                          setAuthorId(e.target.value);
                          const found = authors.find(a => a.id === e.target.value);
                          if (found) setAuthorName(found.name);
                        }}
                        className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none mb-2"
                      >
                        <option value="">Nom libre (ci-dessous)</option>
                        {authors.map(a => (
                          <option key={a.id} value={a.id}>{a.name} — {a.role_fr}</option>
                        ))}
                      </select>
                      {!authorId && (
                        <input
                          type="text"
                          value={authorName}
                          onChange={e => setAuthorName(e.target.value)}
                          placeholder="Rédaction Le Continent"
                          className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2"><Clock size={14} /> Programmer la publication (optionnel)</label>
                    <input type="datetime-local" value={scheduledPublishAt} onChange={e => setScheduledPublishAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full md:w-80 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                </div>


                {/* BADGES LIVE / BREAKING */}
                <div className="flex items-center gap-4 mb-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => setIsLive(!isLive)}
                        className={`relative w-10 h-5 rounded-full transition-all ${isLive ? 'bg-red-500' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isLive ? 'left-5' : 'left-0.5'}`} />
                      </div>
                      <span className="text-sm text-white font-semibold flex items-center gap-2">
                        <Radio size={14} className={isLive ? 'text-red-400 animate-pulse' : 'text-gray-500'} />
                        🔴 En Direct
                      </span>
                    </label>
                    {isLive && (
                      <span className="text-xs text-red-400 animate-pulse">
                        Cet article sera affiché comme LIVE
                      </span>
                    )}
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setIsBreaking(!isBreaking)}
                      className={`relative w-10 h-5 rounded-full transition-all ${isBreaking ? 'bg-orange-500' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isBreaking ? 'left-5' : 'left-0.5'}`} />
                    </div>
                    <span className="text-sm text-white font-semibold flex items-center gap-2">
                      <Zap size={14} className={isBreaking ? 'text-orange-400' : 'text-gray-500'} />
                      ⚡ Breaking News
                    </span>
                  </label>
                </div>

                {/* 3 - ONGLETS CONTENU */}
                <div className="border-t border-white/10 pt-6">
                  <div className="px-0 border-b border-white/10 mb-6">
                    <div className="flex gap-1 overflow-x-auto">
                      <button onClick={() => setActiveTab('content')} className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'content' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}><div className="flex items-center gap-2"><Type size={14} /> Contenu & Médias</div></button>
                      <button onClick={() => setActiveTab('metadata')} className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'metadata' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}><div className="flex items-center gap-2"><Clock size={14} /> Métadonnées</div></button>
                      <button onClick={() => setActiveTab('sources')} className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'sources' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}><div className="flex items-center gap-2"><BookOpen size={14} /> Sources {sources.length > 0 && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">{sources.length}</span>}</div></button>
                      <button onClick={() => setActiveTab('location')} className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'location' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}><div className="flex items-center gap-2"><MapPin size={14} /> Localisation</div></button>
                    </div>
                  </div>

                  {activeTab === 'content' && (
                    <div className="space-y-6">
                      {/* COUVERTURE */}
                      <div className="space-y-4">
                        <label className="text-xs font-semibold text-gray-400 flex items-center gap-2">
                          <ImageIcon size={14} /> Couverture
                        </label>

                        {/* Type de cover */}
                        <div className="grid grid-cols-3 gap-3">
                          {([
                            { val: 'image', label: 'Image fixe', icon: '🖼️' },
                            { val: 'video_loop', label: 'Vidéo loop', icon: '🎬' },
                            { val: 'gif', label: 'GIF animé', icon: '✨' },
                          ] as const).map(opt => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setCoverType(opt.val)}
                              className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center gap-1 ${coverType === opt.val
                                ? 'border-blue-500 bg-blue-500/10 text-white'
                                : 'border-white/10 text-gray-500 hover:border-white/20'
                                }`}
                            >
                              <span className="text-xl">{opt.icon}</span>
                              <span className="text-xs">{opt.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Upload image (toujours — sert de thumbnail pour video/gif aussi) */}
                        <div>
                          <p className="text-[10px] text-gray-500 mb-2">
                            {coverType === 'image' ? 'Image principale' : 'Image thumbnail (fallback)'}
                          </p>
                          <button
                            onClick={() => openCloudinaryWidget('image', setCoverUrl, 'cover')}
                            disabled={isUploading === 'cover'}
                            className="relative w-48 h-32 bg-[#1a1a1a] border-2 border-dashed border-white/20 rounded-xl hover:border-blue-500 flex flex-col items-center justify-center overflow-hidden transition-colors"
                          >
                            {coverUrl
                              ? <img src={coverUrl} className="w-full h-full object-cover" />
                              : isUploading === 'cover'
                                ? <Loader2 className="animate-spin text-gray-500" />
                                : <><Upload className="text-gray-500 mb-1" /><span className="text-xs text-gray-600">Upload image</span></>
                            }
                          </button>
                        </div>

                        {/* Upload vidéo/GIF si besoin */}
                        {(coverType === 'video_loop' || coverType === 'gif') && (
                          <div>
                            <p className="text-[10px] text-gray-500 mb-2">
                              {coverType === 'video_loop' ? 'Fichier vidéo (mp4 court, <10s)' : 'Fichier GIF'}
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={coverVideoUrl}
                                onChange={e => setCoverVideoUrl(e.target.value)}
                                placeholder="https://"
                                className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                              />
                              <button
                                onClick={() => openCloudinaryWidget(
                                  coverType === 'gif' ? 'image' : 'video',
                                  setCoverVideoUrl,
                                  'cover-video'
                                )}
                                disabled={isUploading === 'cover-video'}
                                className="px-4 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl flex items-center gap-2 text-sm"
                              >
                                {isUploading === 'cover-video' ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                Upload
                              </button>
                            </div>
                            {coverVideoUrl && coverType === 'video_loop' && (
                              <video
                                src={coverVideoUrl}
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="w-48 h-32 object-cover rounded-xl mt-2 border border-white/10"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* ARTICLE ÉCRIT : AUDIO LECTURE VOCALE */}
                      {articleType === 'written' && (
                        <div className="p-5 bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/20 rounded-2xl">
                          <div className="flex items-start gap-3 mb-4">
                            <Headphones className="text-blue-400" />
                            <div>
                              <h4 className="text-white font-bold text-sm">Player de lecture vocale (Aide à la lecture)</h4>
                              <p className="text-xs text-gray-500 mt-0.5">S'affiche dans la page article pour aider les personnes ayant du mal à lire.</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <input type="text" value={readingAudioUrl} onChange={e => setReadingAudioUrl(e.target.value)} placeholder="https://" className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                            <button onClick={() => openCloudinaryWidget('video', setReadingAudioUrl, 'reading-audio')} disabled={isUploading === 'reading-audio'} className="px-4 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/20 rounded-xl flex items-center gap-2 text-sm font-medium">
                              {isUploading === 'reading-audio' ? <Loader2 className="animate-spin" /> : <Upload size={16} />} Upload
                            </button>
                          </div>
                          {readingAudioUrl && <audio controls src={readingAudioUrl} className="w-full h-10 mt-3" />}
                        </div>
                      )}

                      {/* ARTICLE AUDIO : PODCAST PRINCIPAL */}
                      {articleType === 'audio' && (
                        <div className="p-5 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-2 border-purple-500/30 rounded-2xl">
                          <div className="flex items-start gap-3 mb-4">
                            <Radio className="text-purple-400" />
                            <div>
                              <h4 className="text-white font-bold text-sm">🎙️ Podcast/Émission Principal</h4>
                              <p className="text-xs text-gray-500 mt-0.5">Le fichier audio est le contenu principal de l'article.</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex gap-2">
                              <input type="text" value={audioContentUrl} onChange={e => setAudioContentUrl(e.target.value)} placeholder="https://" className="flex-1 bg-[#1a1a1a] border border-purple-500/30 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
                              <button onClick={() => openCloudinaryWidget('video', setAudioContentUrl, 'audio-content')} disabled={isUploading === 'audio-content'} className="px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center gap-2 text-sm font-bold">
                                {isUploading === 'audio-content' ? <Loader2 className="animate-spin" /> : <Upload size={16} />} Upload
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-gray-400 font-semibold mb-1 block">Durée (ex: 45:12)</label>
                                <input type="text" value={audioDuration} onChange={e => setAudioDuration(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 font-semibold mb-1 block">Chroniqueur / Présentateur</label>
                                <input type="text" value={audioHost} onChange={e => setAudioHost(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}



                                            {/* TYPOGRAPHIE */}
                      <div className="p-5 bg-gradient-to-br from-purple-500/5 to-transparent border border-purple-500/20 rounded-2xl">
                        <div className="flex items-start gap-3 mb-4">
                          <Type className="text-purple-400" />
                          <div>
                            <h4 className="text-white font-bold text-sm">Typographie de l'article</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Personnalisez la taille et la police pour une meilleure lisibilité</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Taille de police */}
                          <div>
                            <label className="text-xs font-semibold text-gray-400 mb-2 block">Taille de police</label>
                            <div className="grid grid-cols-4 gap-2">
                              {([
                                { val: 'small', label: 'S', size: '14px' },
                                { val: 'normal', label: 'M', size: '16px' },
                                { val: 'large', label: 'L', size: '18px' },
                                { val: 'xlarge', label: 'XL', size: '20px' },
                              ] as const).map(opt => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => setFontSize(opt.val)}
                                  className={`p-2 rounded-lg border-2 text-xs font-bold transition-all ${
                                    fontSize === opt.val
                                      ? 'border-purple-500 bg-purple-500/20 text-white'
                                      : 'border-white/10 text-gray-500 hover:border-white/20'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Police de caractères */}
                          <div>
                            <label className="text-xs font-semibold text-gray-400 mb-2 block">Police de caractères</label>
                            <select
                              value={fontFamily}
                              onChange={e => setFontFamily(e.target.value)}
                              className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 focus:outline-none"
                            >
                              <optgroup label="Sérif (Classique, Presse)">
                                <option value="Merriweather">Merriweather</option>
                                <option value="Playfair Display">Playfair Display</option>
                                <option value="Lora">Lora</option>
                                <option value="EB Garamond">EB Garamond</option>
                                <option value="Crimson Text">Crimson Text</option>
                              </optgroup>
                              <optgroup label="Sans-sérif (Moderne, Digital)">
                                <option value="Inter">Inter</option>
                                <option value="Source Sans Pro">Source Sans Pro</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Open Sans">Open Sans</option>
                              </optgroup>
                              <optgroup label="Créative (Magazine, Éditorial)">
                                <option value="Montserrat">Montserrat</option>
                                <option value="Poppins">Poppins</option>
                                <option value="Raleway">Raleway</option>
                              </optgroup>
                            </select>
                          </div>
                        </div>

                        {/* Aperçu */}
                        <div className="mt-4 p-4 bg-[#1a1a1a] rounded-xl border border-white/10">
                          <p className="text-xs text-gray-500 mb-2">Aperçu :</p>
                          <p
                            style={{
                              fontFamily: fontFamily,
                              fontSize: fontSize === 'small' ? '14px' : fontSize === 'normal' ? '16px' : fontSize === 'large' ? '18px' : '20px',
                            }}
                            className="text-white leading-relaxed"
                          >
                            Le Congo est pris dans un étau monétaire. Le pays utilise le franc CFA...
                          </p>
                        </div>
                      </div>


                      {/* TITRES */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 block">🇫🇷 Titre principal (Français) *</label>
                          <input
                            type="text"
                            value={titleFr}
                            onChange={e => setTitleFr(e.target.value)}
                            placeholder={articleType === 'audio' ? 'Ex: Interview exclusive avec... | Épisode 12 : Les défis de...' : 'Ex: La musique congolaise rayonne sur la scène internationale'}
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                          />
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => handleLingua('correct-fr')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors">
                              {isProcessing === 'correct-fr' ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />} Corriger FR
                            </button>
                            <button onClick={() => handleLingua('translate-fr')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors">
                              {isProcessing === 'translate-fr' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} EN → FR
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 block">🇬🇧 Titre principal (Anglais)</label>
                          <input
                            type="text"
                            value={titleEn}
                            onChange={e => setTitleEn(e.target.value)}
                            placeholder={articleType === 'audio' ? 'Ex: Exclusive interview with... | Episode 12: The challenges of...' : 'Ex: Congolese music shines on the international stage'}
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                          />
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => handleLingua('correct-en')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors">
                              {isProcessing === 'correct-en' ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />} Correct EN
                            </button>
                            <button onClick={() => handleLingua('translate-en')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors">
                              {isProcessing === 'translate-en' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} FR → EN
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* RÉSUMÉS */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 block">🇫🇷 Résumé (Français)</label>
                          <textarea value={summaryFr} onChange={e => setSummaryFr(e.target.value)} rows={3} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none" />
                          <div className="flex gap-2">
                            <button onClick={() => handleLingua('correct-fr')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1">{isProcessing === 'correct-fr' ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />} Corriger</button>
                            <button onClick={() => handleLingua('translate-summary-fr')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1">{isProcessing === 'translate-summary-fr' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} EN → FR</button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 block">🇬🇧 Résumé (Anglais)</label>
                          <textarea value={summaryEn} onChange={e => setSummaryEn(e.target.value)} rows={3} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none" />
                          <button onClick={() => handleLingua('translate-summary-en')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1">{isProcessing === 'translate-summary-en' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} FR → EN</button>
                        </div>
                      </div>

                      {/* CONTENUS TEXTE */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 block">🇫🇷 {articleType === 'audio' ? 'Transcript / Description (FR)' : 'Contenu complet (FR)'}</label>
                          <textarea id="content-fr" value={contentFr} onChange={e => setContentFr(e.target.value)} onKeyDown={e => handleKeyDown(e, 'fr')} rows={16} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono focus:border-blue-500 focus:outline-none" />
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => insertMarkdown(articleType === 'audio' ? '**texte gras**' : '**texte gras**', 'fr')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><Bold size={12} /> Gras</button>
                            <button onClick={() => insertMarkdown(articleType === 'audio' ? '*texte italique*' : '*texte italique*', 'fr')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><Italic size={12} /> Italique</button>
                            <button onClick={() => insertMarkdown('[texte du lien](url)', 'fr')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><LinkIcon size={12} /> Lien</button>
                            <button onClick={() => insertMarkdown('## Titre', 'fr')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><Heading size={12} /> Titre</button>
                            <button onClick={() => insertMarkdown('> Citation', 'fr')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><Quote size={12} /> Citation</button>
                            <button onClick={() => insertMarkdown('- Élément', 'fr')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><List size={12} /> Liste</button>
                            <button
                              onClick={() => {
                                const marker = `\n\n[ANNOUNCEMENT]\n\n`;
                                const textarea = document.getElementById('content-fr') as HTMLTextAreaElement;
                                if (textarea) {
                                  const start = textarea.selectionStart;
                                  setContentFr(contentFr.substring(0, start) + marker + contentFr.substring(start));
                                  showMsg('success', '📢 Annonce insérée dans FR');
                                }
                              }}
                              className="text-xs bg-cyan-500/10 px-2 py-1 rounded text-cyan-400 hover:bg-cyan-500/20 flex items-center gap-1 border border-cyan-500/20"
                            >
                              <Newspaper size={12} /> Annonce
                            </button>
                            <button onClick={() => handleLingua('translate-content-en')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1">{isProcessing === 'translate-content-en' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} FR → EN</button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 block">🇬🇧 {articleType === 'audio' ? 'Transcript / Description (EN)' : 'Contenu complet (EN)'}</label>
                          <textarea id="content-en" value={contentEn} onChange={e => setContentEn(e.target.value)} onKeyDown={e => handleKeyDown(e, 'en')} rows={16} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono focus:border-blue-500 focus:outline-none" />
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => insertMarkdown('**bold text**', 'en')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><Bold size={12} /> Bold</button>
                            <button onClick={() => insertMarkdown('*italic text*', 'en')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><Italic size={12} /> Italic</button>
                            <button onClick={() => insertMarkdown('[link text](url)', 'en')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><LinkIcon size={12} /> Link</button>
                            <button onClick={() => insertMarkdown('## Title', 'en')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><Heading size={12} /> Title</button>
                            <button onClick={() => insertMarkdown('> Quote', 'en')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><Quote size={12} /> Quote</button>
                            <button onClick={() => insertMarkdown('- Item', 'en')} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1"><List size={12} /> List</button>
                            <button
                              onClick={() => {
                                const marker = `\n\n[ANNOUNCEMENT]\n\n`;
                                const textarea = document.getElementById('content-en') as HTMLTextAreaElement;
                                if (textarea) {
                                  const start = textarea.selectionStart;
                                  setContentEn(contentEn.substring(0, start) + marker + contentEn.substring(start));
                                  showMsg('success', '📢 Announcement inserted in EN');
                                }
                              }}
                              className="text-xs bg-cyan-500/10 px-2 py-1 rounded text-cyan-400 hover:bg-cyan-500/20 flex items-center gap-1 border border-cyan-500/20"
                            >
                              <Newspaper size={12} /> Announcement
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* GALERIE MÉDIA */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white">Galerie Média {mediaItems.length > 0 && <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full ml-2">{mediaItems.length}</span>}</h4>
                          <button onClick={() => setShowMediaModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2"><PlusCircle size={16} /> Ajouter</button>
                        </div>
                        <p className="text-xs text-gray-500">
                          💡 Placez votre curseur dans le textarea, puis cliquez sur "Insérer" pour positionner le bloc à cet endroit.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {mediaItems.map((item, index) => (
                            <div key={index} className="bg-white/5 p-3 rounded-xl border border-white/10">
                              <div className="flex items-start gap-3 mb-2">
                                {/* Preview */}
                                {item.type === 'image' && (
                                  <img src={item.url} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" alt="" />
                                )}
                                {item.type === 'video' && (
                                  <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Video size={20} className="text-purple-400" />
                                  </div>
                                )}
                                {item.type === 'youtube' && (
                                  <div className="w-16 h-16 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-2xl">▶️</span>
                                  </div>
                                )}
                                {item.type === 'code' && (
                                  <div className="w-16 h-16 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Code size={20} className="text-green-400" />
                                  </div>
                                )}
                                {item.type === 'gallery' && (
                                  <div className="w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <ImageIcon size={20} className="text-blue-400" />
                                  </div>
                                )}
                                {item.type === 'quote_hero' && (
                                  <div className="w-16 h-16 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Quote size={20} className="text-yellow-400" />
                                  </div>
                                )}
                                {item.type === 'link' && (
                                  <div className="w-16 h-16 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <LinkIcon size={20} className="text-cyan-400" />
                                  </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-blue-400 font-mono text-xs">[MEDIA:{index}]</span>
                                    <span className="text-[10px] uppercase font-bold text-gray-500">{item.type}</span>
                                  </div>
                                  <p className="text-xs text-white truncate">
                                    {item.type === 'youtube' && `YouTube: ${item.youtube_id}`}
                                    {item.type === 'code' && `Code ${item.code_language}: ${(item.code_content || '').substring(0, 30)}...`}
                                    {item.type === 'gallery' && `Galerie (${item.gallery_urls?.length || 0} images)`}
                                    {item.type === 'quote_hero' && `"${(item.quote_text || '').substring(0, 40)}..."`}
                                    {item.type === 'image' && (item.caption || 'Image sans légende')}
                                    {item.type === 'video' && (item.caption || 'Vidéo')}
                                    {item.type === 'link' && (item.caption || item.url)}
                                  </p>
                                </div>

                                {/* Delete */}
                                <button
                                  onClick={() => {
                                    const newItems = [...mediaItems];
                                    newItems.splice(index, 1);
                                    setMediaItems(newItems);
                                  }}
                                  className="p-1.5 bg-red-500/20 rounded hover:bg-red-500 text-red-400 hover:text-white flex-shrink-0"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              {/* Boutons d'insertion */}
                              <div className="flex gap-2 pt-2 border-t border-white/10">
                                <button
                                  onClick={() => {
                                    const marker = `\n\n[MEDIA:${index}]\n\n`;
                                    const textarea = document.getElementById('content-fr') as HTMLTextAreaElement;
                                    if (textarea) {
                                      const start = textarea.selectionStart;
                                      const newContent = contentFr.substring(0, start) + marker + contentFr.substring(start);
                                      setContentFr(newContent);
                                      showMsg('success', `📌 Bloc ${index + 1} inséré dans FR`);
                                    }
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-xs font-bold"
                                >
                                  ↳ Insérer FR
                                </button>
                                <button
                                  onClick={() => {
                                    const marker = `\n\n[MEDIA:${index}]\n\n`;
                                    const textarea = document.getElementById('content-en') as HTMLTextAreaElement;
                                    if (textarea) {
                                      const start = textarea.selectionStart;
                                      const newContent = contentEn.substring(0, start) + marker + contentEn.substring(start);
                                      setContentEn(newContent);
                                      showMsg('success', `📌 Bloc ${index + 1} inséré dans EN`);
                                    }
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-xs font-bold"
                                >
                                  ↳ Insérer EN
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'metadata' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                            <Clock size={14} /> Temps de lecture (minutes)
                          </label>
                          <input
                            type="number"
                            value={readingTimeMinutes}
                            onChange={e => setReadingTimeMinutes(parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                            <LinkIcon size={14} /> Articles similaires
                          </label>
                          <select
                            multiple
                            value={relatedArticlesIds}
                            onChange={e => setRelatedArticlesIds(Array.from(e.target.selectedOptions, o => o.value))}
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                            size={4}
                          >
                            {articles.filter(a => a.id !== editingId).map(a => (
                              <option key={a.id} value={a.id}>{a.title_fr}</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Ctrl/Cmd + clic pour plusieurs</p>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                            <BarChart3 size={14} className="text-[#D4AF37]" /> Graphiques liés
                          </label>
                          <select
                            multiple
                            value={relatedChartsIds}
                            onChange={e => setRelatedChartsIds(Array.from(e.target.selectedOptions, o => o.value))}
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                            size={4}
                          >
                            {macroCharts.map(c => (
                              <option key={c.id} value={c.id}>📊 {c.title_fr}</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Ctrl/Cmd + clic pour plusieurs</p>
                        </div>
                      </div>

                      {/* INSERTION GRAPHIQUES DANS LE TEXTE */}
                      {relatedChartsIds.length > 0 && (
                        <div className="p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl space-y-3">
                          <p className="text-xs font-bold text-[#D4AF37] flex items-center gap-2">
                            <BarChart3 size={14} /> Insérer les graphiques dans le texte
                          </p>
                          <p className="text-xs text-gray-500">
                            Placez votre curseur dans le textarea (FR ou EN) à la fin d'un paragraphe,
                            puis cliquez sur "Insérer" pour positionner le graphique à cet endroit précis.
                          </p>
                          <div className="space-y-2">
                            {relatedChartsIds.map((chartId, index) => {
                              const chart = macroCharts.find(c => c.id === chartId);
                              if (!chart) return null;
                              return (
                                <div key={chartId} className="flex items-center justify-between gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-white/10">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-[#D4AF37] font-mono text-xs">[CHART:{index}]</span>
                                    <span className="text-white text-xs truncate">{chart.title_fr}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const marker = `\n\n[CHART:${index}]\n\n`;
                                        const textarea = document.getElementById('content-fr') as HTMLTextAreaElement;
                                        if (textarea) {
                                          const start = textarea.selectionStart;
                                          const newContent = contentFr.substring(0, start) + marker + contentFr.substring(start);
                                          setContentFr(newContent);
                                          showMsg('success', `📊 Graphique inséré dans FR`);
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/40 text-[#D4AF37] rounded-lg text-xs font-bold"
                                    >
                                      ↳ FR
                                    </button>
                                    <button
                                      onClick={() => {
                                        const marker = `\n\n[CHART:${index}]\n\n`;
                                        const textarea = document.getElementById('content-en') as HTMLTextAreaElement;
                                        if (textarea) {
                                          const start = textarea.selectionStart;
                                          const newContent = contentEn.substring(0, start) + marker + contentEn.substring(start);
                                          setContentEn(newContent);
                                          showMsg('success', `📊 Graphique inséré dans EN`);
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/40 text-[#D4AF37] rounded-lg text-xs font-bold"
                                    >
                                      ↳ EN
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* INSERTION TEASERS INLINE */}
                      {relatedArticlesIds.length > 0 && (
                        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
                          <p className="text-xs font-bold text-blue-400 flex items-center gap-2">
                            <LinkIcon size={14} /> Teasers inline — articles connexes dans le texte
                          </p>
                          <p className="text-xs text-gray-500">
                            Placez votre curseur dans le textarea à la fin d'un paragraphe.
                            Cliquez sur "Configurer & Insérer" pour définir le kicker éditorial
                            et insérer le marqueur [RELATED:x] à cet endroit.
                          </p>
                          <div className="space-y-2">
                            {relatedArticlesIds.map((artId, index) => {
                              const art = articles.find(a => a.id === artId);
                              const existingTeaser = relatedTeasers.find(t => t.article_id === artId);
                              if (!art) return null;
                              return (
                                <div key={artId} className="flex items-center justify-between gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-white/10">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-blue-400 font-mono text-xs">[RELATED:{index}]</span>
                                      <span className="text-white text-xs truncate">{art.title_fr}</span>
                                    </div>
                                    {existingTeaser && (
                                      <div className="flex gap-3 text-[10px] text-gray-500">
                                        <span>FR: <em className="text-gray-300">"{existingTeaser.kicker_fr}"</em></span>
                                        <span>EN: <em className="text-gray-300">"{existingTeaser.kicker_en}"</em></span>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setTeaserTargetArticleId(artId);
                                      const existing = relatedTeasers.find(t => t.article_id === artId);
                                      setTeaserKickerFr(existing?.kicker_fr || '');
                                      setTeaserKickerEn(existing?.kicker_en || '');
                                      setShowTeaserModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-xs font-bold whitespace-nowrap"
                                  >
                                    {existingTeaser ? '✏️ Modifier' : '⚙️ Configurer'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <InfoBadge text="Les marqueurs [CHART:x] et [RELATED:x] s'insèrent dans le texte à l'endroit exact choisi par le rédacteur." />
                    </div>
                  )}

                  {activeTab === 'sources' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-white">Sources & Références</h4>
                        <button onClick={() => setShowSourceModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2"><PlusCircle size={16} /> Ajouter</button>
                      </div>
                      <div className="space-y-2">
                        {sources.map((s, index) => (
                          <div key={index} className="bg-white/5 p-3 rounded-xl flex justify-between items-center">
                            <div>
                              <p className="text-white text-sm font-semibold">{s.title}</p>
                              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400">{s.url}</a>
                            </div>
                            <button onClick={() => removeSource(index)} className="p-2 bg-red-500/20 text-red-400 rounded-lg"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'location' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-white">Localisation</h4>
                        <button onClick={getCurrentLocation} disabled={isGeolocating} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2">Me localiser</button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <select value={geographicScope} onChange={e => setGeographicScope(e.target.value as any)} className="bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm">
                          <option value="">Portée...</option>
                          <option value="local">Local</option>
                          <option value="national">National</option>
                          <option value="regional">Régional</option>
                          <option value="international">International</option>
                        </select>
                        <input type="text" value={locationCity} onChange={e => setLocationCity(e.target.value)} placeholder="Ville" className="bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                        <input type="text" value={locationCountry} onChange={e => setLocationCountry(e.target.value)} placeholder="Pays" className="bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                  <button onClick={resetForm} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl text-sm">Annuler</button>
                  <button onClick={handleSave} disabled={isSaving || !titleFr.trim()} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-2 font-bold hover:bg-blue-500">
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showForm && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl w-max">
                <button onClick={() => setArticleTypeFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${articleTypeFilter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Tous</button>
                <button onClick={() => setArticleTypeFilter('written')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${articleTypeFilter === 'written' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>📝 Écrits</button>
                <button onClick={() => setArticleTypeFilter('audio')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${articleTypeFilter === 'audio' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>🎙️ Audio</button>
              </div>

              {filteredArticles.map(a => (
                <div key={a.id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col md:flex-row gap-4">
                  {a.cover_url && <img src={a.cover_url} className="w-full md:w-32 h-24 object-cover rounded-xl flex-shrink-0" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${a.article_type === 'audio' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {a.article_type === 'audio' ? 'AUDIO' : 'ÉCRIT'}
                      </span>
                      {a.reading_audio_url && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 text-[10px] rounded-full flex items-center gap-1"><Headphones size={10} /> Lecture vocale</span>}
                      {a.audio_content_url && <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] rounded-full flex items-center gap-1"><Mic size={10} /> Podcast</span>}
                      {a.reading_time_minutes && <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded-full flex items-center gap-1"><Clock size={10} /> {a.reading_time_minutes} min</span>}
                      {a.is_live && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full flex items-center gap-1 animate-pulse">
                          <Radio size={10} /> LIVE
                        </span>
                      )}
                      {a.is_breaking && (
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded-full flex items-center gap-1">
                          ⚡ BREAKING
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-bold">{a.title_fr}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1 mt-1">{a.summary_fr}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(a)} className="p-2 bg-white/5 text-gray-400 hover:text-blue-400 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(a.id)} className="p-2 bg-white/5 text-gray-400 hover:text-red-400 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}


      {/* VUE LIVE */}
      {view === 'live' && (
        <div className="space-y-6">
          <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                className="w-3 h-3 bg-red-500 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <h3 className="text-white font-bold text-lg">Gestion du Direct</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Sélectionnez un article marqué "En Direct" pour lui ajouter des mises à jour en temps réel.
            </p>
          </div>

          {/* Articles live actifs */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Articles en Direct</h4>
            {articles.filter(a => a.is_live).length === 0 ? (
              <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-white/10">
                <Radio className="mx-auto mb-3 text-gray-600" size={36} />
                <p className="text-gray-500 text-sm">Aucun article en direct actuellement</p>
                <p className="text-gray-600 text-xs mt-1">
                  Activez le mode "En Direct" lors de la création d'un article
                </p>
              </div>
            ) : (
              articles.filter(a => a.is_live).map(a => (
                <div
                  key={a.id}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedLiveArticleId === a.id
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  onClick={() => {
                    setSelectedLiveArticleId(a.id);
                    // Charger les live updates
                    supabase
                      .from('press_live_updates')
                      .select('*')
                      .eq('article_id', a.id)
                      .order('created_at', { ascending: false })
                      .then(({ data }) => { if (data) setLiveUpdates(data); });
                  }}
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{a.title_fr}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{a.author_name}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-600" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Zone de publication live */}
          {selectedLiveArticleId && (
            <div className="space-y-4">
              <div className="p-5 bg-[#0f0f0f] border border-red-500/20 rounded-2xl">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Radio size={16} className="text-red-400 animate-pulse" />
                  Publier une mise à jour
                </h4>
                <textarea
                  value={newLiveContent}
                  onChange={e => setNewLiveContent(e.target.value)}
                  placeholder="Nouvelle information, développement, chiffre..."
                  rows={4}
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm mb-3"
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newLiveAuthor}
                    onChange={e => setNewLiveAuthor(e.target.value)}
                    placeholder="Auteur"
                    className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                  <button
                    onClick={async () => {
                      if (!newLiveContent.trim() || !selectedLiveArticleId) return;
                      setIsPostingLive(true);
                      const { data, error } = await supabase
                        .from('press_live_updates')
                        .insert({
                          article_id: selectedLiveArticleId,
                          content: newLiveContent.trim(),
                          author: newLiveAuthor || 'Rédaction Le Continent',
                        })
                        .select()
                        .single();
                      if (!error && data) {
                        setLiveUpdates(prev => [data, ...prev]);
                        setNewLiveContent('');
                        showMsg('success', '🔴 Update live publiée');
                      } else {
                        showMsg('error', error?.message || 'Erreur');
                      }
                      setIsPostingLive(false);
                    }}
                    disabled={isPostingLive || !newLiveContent.trim()}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm flex items-center gap-2"
                  >
                    {isPostingLive ? <Loader2 className="animate-spin" size={16} /> : <Radio size={16} />}
                    Publier
                  </button>
                </div>
              </div>

              {/* Historique des updates */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Historique ({liveUpdates.length})
                </h4>
                {liveUpdates.map(update => (
                  <div key={update.id} className="p-4 bg-white/[0.02] border border-white/10 rounded-xl flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{update.author}</span>
                        <span className="text-xs text-gray-600">
                          {new Date(update.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm">{update.content}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await supabase.from('press_live_updates').delete().eq('id', update.id);
                        setLiveUpdates(prev => prev.filter(u => u.id !== update.id));
                        showMsg('success', '🗑️ Update supprimée');
                      }}
                      className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VUE ARCHIVES */}
      {view === 'archives' && (
        <>
          {showArchiveForm && (
            <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Archive size={20} className="text-orange-400" />
                  <h3 className="text-xl font-bold text-white">{archiveEditingId ? 'Modifier l\'archive' : 'Ajouter une archive média'}</h3>
                </div>
                <button onClick={resetArchiveForm} className="p-2 hover:bg-white/10 rounded-lg"><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-semibold text-gray-400 mb-3 block">Format Principal de l'Archive</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setArchiveFormat('image')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${archiveFormat === 'image' ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}><ImageIcon size={24} /><span className="text-sm font-medium">Image / Article</span></button>
                    <button onClick={() => setArchiveFormat('audio')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${archiveFormat === 'audio' ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}><Mic size={24} /><span className="text-sm font-medium">Audio / Podcast</span></button>
                    <button onClick={() => setArchiveFormat('video')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${archiveFormat === 'video' ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}><Video size={24} /><span className="text-sm font-medium">Vidéo</span></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Fichier Média (URL ou Upload)</label>
                    <div className="flex gap-2">
                      <input type="text" value={archiveMediaUrl} onChange={e => setArchiveMediaUrl(e.target.value)} placeholder="https://" className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                      <button onClick={() => {
                        setIsUploading('archive-media');
                        loadCloudinaryScript(() => {
                          const isVideoOrAudio = archiveFormat === 'video' || archiveFormat === 'audio';
                          // @ts-ignore
                          const w = window.cloudinary.createUploadWidget({ cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, sources: ['local', 'url'], resourceType: isVideoOrAudio ? 'video' : 'image', multiple: false }, (error: any, result: any) => {
                            setIsUploading(null);
                            if (result.event === 'success') { setArchiveMediaUrl(result.info.secure_url); showMsg('success', `✅ Média (${archiveFormat}) uploadé avec succès`); }
                            if (error) showMsg('error', 'Erreur Cloudinary');
                          });
                          w.open();
                        });
                      }} disabled={isUploading === 'archive-media'} className="px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-2"><Upload size={16} /> Upload</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Date de publication originale</label>
                    <input type="date" value={archiveDate} onChange={e => setArchiveDate(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Nom du Média Source *</label>
                    <input type="text" value={archiveSourceName} onChange={e => setArchiveSourceName(e.target.value)} placeholder="Ex: Jeune Afrique, RFI..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Lien de l'article d'origine</label>
                    <input type="text" value={archiveSourceUrl} onChange={e => setArchiveSourceUrl(e.target.value)} placeholder="https://..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Titre (FR) *</label>
                    <input type="text" value={archiveTitleFr} onChange={e => setArchiveTitleFr(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">Titre (EN)</label>
                    <div className="flex gap-2">
                      <input type="text" value={archiveTitleEn} onChange={e => setArchiveTitleEn(e.target.value)} className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                      <button onClick={() => handleLingua('translate-en', true)} className="px-3 bg-white/5 text-gray-400 rounded-xl hover:text-white"><Languages size={16} /></button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Notes ou Transcription (FR) - Illimité</label>
                    <textarea value={archiveContentFr} onChange={e => setArchiveContentFr(e.target.value)} rows={10} placeholder="Collez le texte..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 flex items-center justify-between">
                      <span>Notes ou Transcription (EN) - Illimité</span>
                      <button onClick={() => handleLingua('translate-content-en', true)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1"><Languages size={12} /> Traduire FR {'>'} EN</button>
                    </label>
                    <textarea value={archiveContentEn} onChange={e => setArchiveContentEn(e.target.value)} rows={10} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
                  <button onClick={resetArchiveForm} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl text-sm hover:bg-white/10">Annuler</button>
                  <button onClick={handleSaveArchive} disabled={isSaving || !archiveTitleFr} className="px-8 py-3 bg-orange-600 text-white rounded-xl text-sm flex items-center gap-2 hover:bg-orange-500">
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showArchiveForm && (
            <div className="space-y-4">
              {archives.map(a => (
                <div key={a.id} className="group bg-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col md:flex-row gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    {a.format === 'audio' ? <Mic className="text-purple-400" /> : a.format === 'video' ? <Video className="text-red-400" /> : <ImageIcon className="text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-[10px] font-bold rounded-full uppercase">{a.source_name}</span>
                      {a.original_date && <span className="text-xs text-gray-500"><Calendar size={10} className="inline mr-1" />{new Date(a.original_date).toLocaleDateString('fr-FR')}</span>}
                    </div>
                    <h3 className="text-white font-bold truncate">{a.title_fr}</h3>
                    <a href={a.source_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline flex items-center gap-1 mt-1"><ExternalLink size={10} /> Source originale</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditArchive(a)} className="p-2 bg-white/5 text-gray-400 hover:text-orange-400 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteArchive(a.id)} className="p-2 bg-white/5 text-gray-400 hover:text-red-400 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* VUE COMMENTAIRES */}
      {view === 'comments' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl w-max">
            <Filter size={14} className="text-gray-400 ml-2" />
            <button onClick={() => setCommentFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${commentFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-gray-400'}`}>Tous ({stats.totalComments})</button>
            <button onClick={() => setCommentFilter('blocked')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${commentFilter === 'blocked' ? 'bg-red-600 text-white' : 'text-gray-400'}`}>⛔ Bloqués ({stats.blockedComments})</button>
          </div>

          <div className="space-y-4">
            {filteredComments.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/10">
                <MessageSquare className="mx-auto mb-3 text-gray-600" size={48} />
                <p className="text-gray-500">Aucun commentaire {commentFilter === 'blocked' ? 'bloqué' : ''}</p>
              </div>
            ) : (
              filteredComments.map(comment => (
                <div key={comment.id} className={`rounded-2xl border p-6 transition-all ${comment.is_blocked ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/10'}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-white">{comment.user_name}</span>
                        <span className="text-xs text-gray-500">{comment.user_email}</span>
                        {comment.is_blocked && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded">BLOQUÉ</span>}
                      </div>
                      <p className="text-white/70 text-sm">{comment.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span><Calendar size={10} className="inline mr-1" />{new Date(comment.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                    {!comment.is_blocked ? (
                      <>
                        <button onClick={() => setUserToBlock({ id: comment.user_id, email: comment.user_email, name: comment.user_name })} className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-lg text-xs font-bold hover:bg-orange-500/20 flex items-center gap-1"><Ban size={12} /> Bloquer utilisateur</button>
                        <button onClick={() => setCommentToDelete(comment)} className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 flex items-center gap-1"><Trash2 size={12} /> Supprimer</button>
                      </>
                    ) : (
                      <button onClick={() => {
                        const blockedUser = blockedUsers.find(bu => bu.user_id === comment.user_id);
                        if (blockedUser) handleUnblockUser(blockedUser.id);
                      }} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/20">✅ Débloquer</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VUE MODÉRATION */}
      {view === 'moderation' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {blockedUsers.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/10">
                <Shield className="mx-auto mb-4 text-gray-600" size={48} />
                <p className="text-gray-500 text-lg font-medium">Aucun utilisateur bloqué</p>
                <p className="text-gray-600 text-sm mt-1">Les utilisateurs bloqués apparaîtront ici</p>
              </div>
            ) : (
              blockedUsers.map(bu => (
                <div key={bu.id} className="bg-gradient-to-br from-red-500/5 to-red-500/0 rounded-2xl border border-red-500/20 p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-500/20 rounded-lg"><Ban size={16} className="text-red-400" /></div>
                        <div>
                          <p className="font-bold text-white text-lg">{bu.user_email}</p>
                          <p className="text-sm text-gray-400">Bloqué le {new Date(bu.blocked_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      {bu.reason && (
                        <div className="mt-3 p-3 bg-white/[0.02] rounded-lg border border-white/10">
                          <p className="text-xs font-semibold text-gray-400 mb-1">📌 Raison :</p>
                          <p className="text-sm text-gray-300">{bu.reason}</p>
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleUnblockUser(bu.id)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold">✅ Débloquer</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VUE SUGGESTIONS */}
      {view === 'suggestions' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl w-max">
            <Filter size={14} className="text-gray-400 ml-2" />
            <button onClick={() => setSuggestionFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${suggestionFilter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Toutes</button>
            <button onClick={() => setSuggestionFilter('pending')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${suggestionFilter === 'pending' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>⏳ En attente</button>
            <button onClick={() => setSuggestionFilter('used')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${suggestionFilter === 'used' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>✅ Utilisées</button>
          </div>

          <div className="space-y-4">
            {filteredSuggestionsList.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/10">
                <Lightbulb className="mx-auto mb-4 text-gray-600" size={48} />
                <p className="text-gray-500 font-medium">Aucune suggestion</p>
              </div>
            ) : (
              filteredSuggestionsList.map(s => (
                <div key={s.id} className={`group rounded-2xl border p-6 transition-all duration-300 ${s.status === 'used' ? 'bg-white/[0.01] border-white/5 opacity-60' : 'bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20'}`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb size={16} className={s.status === 'used' ? 'text-gray-500' : 'text-purple-400'} />
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.status === 'used' ? 'bg-gray-500/20 text-gray-400' : 'bg-purple-500/20 text-purple-400'}`}>{s.status === 'used' ? 'Utilisée' : 'En attente'}</span>
                      </div>
                      <h3 className="text-white text-lg font-bold mb-2">{s.suggested_topic}</h3>
                      {s.sources && (
                        <p className="text-gray-400 text-sm mb-3"><span className="text-gray-500 font-medium">Sources : </span>{s.sources}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User size={12} /><span>{s.user_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.status === 'pending' && (
                        <button onClick={() => markSuggestionUsed(s.id)} className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-600 hover:text-white transition-all flex items-center gap-1.5">
                          <CheckCircle size={14} /> Traiter
                        </button>
                      )}
                      <button onClick={() => setSuggestionToDelete(s)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-600 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}


      {/* VUE ANNONCES */}
      {view === 'announcements' && (
        <>
          {showAnnouncementForm && (
            <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {announcementEditingId ? <Edit2 size={20} className="text-cyan-400" /> : <Sparkles size={20} className="text-cyan-400" />}
                  <h3 className="text-xl font-bold text-white">{announcementEditingId ? 'Modifier l\'annonce' : 'Créer une nouvelle annonce'}</h3>
                </div>
                <button onClick={resetAnnouncementForm} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="p-6 space-y-6">
                {/* Image */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2"><ImageIcon size={14} /> Image (URL ou Upload) *</label>
                  <div className="flex gap-2">
                    <input type="text" value={announcementImageUrl} onChange={e => setAnnouncementImageUrl(e.target.value)} placeholder="https://" className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                    <button onClick={() => openCloudinaryWidget('image', setAnnouncementImageUrl, 'announcement-image')} disabled={isUploading === 'announcement-image'} className="px-4 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/20 rounded-xl flex items-center gap-2 text-sm font-medium">
                      {isUploading === 'announcement-image' ? <Loader2 className="animate-spin" /> : <Upload size={16} />} Upload
                    </button>
                  </div>
                </div>

                {/* Titres */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">🇫🇷 Titre (Français) *</label>
                    <input type="text" value={announcementTitleFr} onChange={e => setAnnouncementTitleFr(e.target.value)} placeholder="Ex: Découvrez nos nouveaux services" className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 focus:outline-none" />
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setIsProcessing('announcement-correct-fr');
                        setTimeout(() => setIsProcessing(null), 1000);
                      }} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1">{isProcessing === 'announcement-correct-fr' ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />} Corriger</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">🇬🇧 Titre (Anglais)</label>
                    <input type="text" value={announcementTitleEn} onChange={e => setAnnouncementTitleEn(e.target.value)} placeholder="Ex: Discover our new services" className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 focus:outline-none" />
                    <button onClick={async () => {
                      setIsProcessing('announcement-translate-en');
                      try {
                        setAnnouncementTitleEn(await autoTranslate(announcementTitleFr, 'fr'));
                        showMsg('success', '✨ Traduction terminée');
                      } catch (e) {
                        showMsg('error', 'Erreur traduction');
                      }
                      setIsProcessing(null);
                    }} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1">{isProcessing === 'announcement-translate-en' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} FR → EN</button>
                  </div>
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">🇫🇷 Description (Français)</label>
                    <textarea value={announcementDescriptionFr} onChange={e => setAnnouncementDescriptionFr(e.target.value)} placeholder="Ex: Profitez d'une offre exceptionnelle sur tous nos produits..." rows={3} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">🇬🇧 Description (Anglais)</label>
                    <textarea value={announcementDescriptionEn} onChange={e => setAnnouncementDescriptionEn(e.target.value)} placeholder="Ex: Take advantage of an exceptional offer on all our products..." rows={3} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 focus:outline-none" />
                    <button onClick={async () => {
                      setIsProcessing('announcement-translate-desc-en');
                      try {
                        setAnnouncementDescriptionEn(await autoTranslate(announcementDescriptionFr, 'fr'));
                        showMsg('success', '✨ Traduction terminée');
                      } catch (e) {
                        showMsg('error', 'Erreur traduction');
                      }
                      setIsProcessing(null);
                    }} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1">{isProcessing === 'announcement-translate-desc-en' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} FR → EN</button>
                  </div>
                </div>

                {/* Légendes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">🇫🇷 Légende (Français)</label>
                    <input type="text" value={announcementLegendFr} onChange={e => setAnnouncementLegendFr(e.target.value)} placeholder="Ex: 'Retrouvez nos annonces'" className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">🇬🇧 Légende (Anglais)</label>
                    <input type="text" value={announcementLegendEn} onChange={e => setAnnouncementLegendEn(e.target.value)} placeholder="Ex: 'Discover our announcements'" className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                    <button onClick={async () => {
                      setIsProcessing('announcement-translate-legend-en');
                      try {
                        setAnnouncementLegendEn(await autoTranslate(announcementLegendFr, 'fr'));
                        showMsg('success', '✨ Traduction terminée');
                      } catch (e) {
                        showMsg('error', 'Erreur traduction');
                      }
                      setIsProcessing(null);
                    }} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1">{isProcessing === 'announcement-translate-legend-en' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} FR → EN</button>
                  </div>
                </div>

                {/* Lien CTA */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2"><LinkIcon size={14} /> Lien CTA (optionnel)</label>
                  <input type="text" value={announcementLinkUrl} onChange={e => setAnnouncementLinkUrl(e.target.value)} placeholder="https://" className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                </div>

                {/* Statut */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2"><Tag size={14} /> Statut</label>
                  <select value={announcementStatus} onChange={e => setAnnouncementStatus(e.target.value as 'active' | 'draft')} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm">
                    <option value="draft">📝 Brouillon</option>
                    <option value="active">✅ Actif</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                  <button onClick={resetAnnouncementForm} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl text-sm">Annuler</button>
                  <button onClick={handleSaveAnnouncement} disabled={isSaving || !announcementTitleFr.trim()} className="px-8 py-3 bg-cyan-600 text-white rounded-xl text-sm flex items-center gap-2 font-bold hover:bg-cyan-500">
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showAnnouncementForm && (
            <div className="space-y-4">
              {announcements.length === 0 ? (
                <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/10">
                  <Newspaper className="mx-auto mb-3 text-gray-600" size={48} />
                  <p className="text-gray-500">Aucune annonce créée</p>
                </div>
              ) : (
                announcements.map(a => (
                  <div key={a.id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col md:flex-row gap-4">
                    {a.image_url && <img src={a.image_url} className="w-full md:w-32 h-24 object-cover rounded-xl flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {a.status === 'active' ? '✅ ACTIF' : '📝 BROUILLON'}
                        </span>
                      </div>
                      <h3 className="text-white font-bold">{a.title_fr}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1 mt-1">{a.legend_fr || a.description_fr}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditAnnouncement(a)} className="p-2 bg-white/5 text-gray-400 hover:text-cyan-400 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteAnnouncement(a.id)} className="p-2 bg-white/5 text-gray-400 hover:text-red-400 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}


      {/* VUE DIGEST */}
            {/* VUE DIGEST */}
      {view === 'digest' && (
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Digests / La Une</h3>
              <p className="text-gray-400 text-sm mt-1">
                Maximum 3 digests actifs simultanément •{' '}
                <span className={digests.filter(d => d.is_active).length >= 3 ? 'text-red-400 font-bold' : 'text-green-400'}>
                  {digests.filter(d => d.is_active).length}/3 actifs
                </span>
              </p>
            </div>
            {!showDigestForm && (
              <button
                onClick={() => {
                  setEditingDigestId(null);
                  setDigestLabel('À lire absolument');
                  setDigestLabelEn('Must read');
                  setDigestArticleIds([]);
                  setDigestDesign('classic');
                  setDigestAccentColor('#0466c8');
                  setDigestPositionAfter(4);
                  setDigestIsActive(false);
                  setShowDigestForm(true);
                }}
                className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2"
              >
                <PlusCircle size={16} /> Nouveau digest
              </button>
            )}
          </div>

          {/* FORMULAIRE */}
          {showDigestForm && (
            <div className="bg-[#0f0f0f] border border-yellow-500/30 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h4 className="text-white font-bold text-lg">
                  {editingDigestId ? 'Modifier le digest' : 'Nouveau digest'}
                </h4>
                <button onClick={() => setShowDigestForm(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">

                {/* Labels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">🇫🇷 Label (Français)</label>
                    <input
                      type="text"
                      value={digestLabel}
                      onChange={e => setDigestLabel(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">🇬🇧 Label (Anglais)</label>
                    <input
                      type="text"
                      value={digestLabelEn}
                      onChange={e => setDigestLabelEn(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                    />
                  </div>
                </div>

                {/* Design selector */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-3 block">Design / Template</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {([
                      { val: 'classic', label: 'Classique', desc: 'Liste verticale', icon: '☰' },
                      { val: 'grid', label: 'Grille', desc: '2-3 cartes', icon: '⊞' },
                      { val: 'carousel', label: 'Carrousel', desc: 'Défilement', icon: '▷' },
                      { val: 'ranked', label: 'Classé', desc: 'Top 01/02/03', icon: '#' },
                      { val: 'hero_list', label: 'Héros + Liste', desc: '1 grand + liste', icon: '⬛' },
                      { val: 'timeline', label: 'Timeline', desc: 'Chronologique', icon: '⋮' },
                      { val: 'diptych', label: 'Diptyque', desc: 'Image/texte alt.', icon: '⫸' },
                    ] as const).map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setDigestDesign(opt.val)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${digestDesign === opt.val
                          ? 'border-yellow-500 bg-yellow-500/10 text-white'
                          : 'border-white/10 text-gray-500 hover:border-white/20'
                        }`}
                      >
                        <div className="text-xl mb-1 font-mono">{opt.icon}</div>
                        <p className="text-xs font-bold">{opt.label}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Config */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Couleur d'accent</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={digestAccentColor}
                        onChange={e => setDigestAccentColor(e.target.value)}
                        className="w-12 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={digestAccentColor}
                        onChange={e => setDigestAccentColor(e.target.value)}
                        className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">
                      Afficher après l'article N°
                    </label>
                    <input
                      type="number"
                      value={digestPositionAfter}
                      onChange={e => setDigestPositionAfter(parseInt(e.target.value) || 4)}
                      min="1"
                      max="20"
                      className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-[#1a1a1a] border border-white/20 rounded-xl">
                      <div
                        onClick={() => {
                          const activeCount = digests.filter(d => d.is_active && d.id !== editingDigestId).length;
                          if (!digestIsActive && activeCount >= 3) return;
                          setDigestIsActive(!digestIsActive);
                        }}
                        className={`relative w-10 h-5 rounded-full transition-all cursor-pointer ${digestIsActive ? 'bg-green-500' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${digestIsActive ? 'left-5' : 'left-0.5'}`} />
                      </div>
                      <div>
                        <p className="text-sm text-white font-semibold">Actif</p>
                        {digests.filter(d => d.is_active && d.id !== editingDigestId).length >= 3 && !digestIsActive && (
                          <p className="text-[10px] text-red-400">3/3 actifs — désactivez-en un</p>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Sélection articles */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-3 block">
                    Articles sélectionnés ({digestArticleIds.length})
                  </label>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {articles.filter(a => a.status === 'published').map(a => {
                      const isSelected = digestArticleIds.includes(a.id);
                      return (
                        <div
                          key={a.id}
                          onClick={() => setDigestArticleIds(prev =>
                            isSelected ? prev.filter(id => id !== a.id) : [...prev, a.id]
                          )}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                            ? 'border-yellow-500/50 bg-yellow-500/10'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-yellow-500 bg-yellow-500' : 'border-white/20'}`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          {a.cover_url && (
                            <img src={a.cover_url} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" alt="" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{a.title_fr}</p>
                            <p className="text-gray-500 text-xs">
                              {a.categories?.name_fr || 'Sans catégorie'} •{' '}
                              {a.article_type === 'audio' ? 'Audio' : 'Écrit'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ordre d'affichage */}
                {digestArticleIds.length > 0 && (
                  <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                    <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Ordre d'affichage</p>
                    <div className="space-y-2">
                      {digestArticleIds.map((id, i) => {
                        const a = articles.find(art => art.id === id);
                        if (!a) return null;
                        return (
                          <div key={id} className="flex items-center gap-3 text-sm">
                            <span className="text-gray-600 font-mono w-5 text-right">{i + 1}.</span>
                            <span className="text-white truncate flex-1">{a.title_fr}</span>
                            <button
                              onClick={() => setDigestArticleIds(prev => prev.filter(pid => pid !== id))}
                              className="ml-auto p-1 text-red-400 hover:text-red-300 flex-shrink-0"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button onClick={() => setShowDigestForm(false)} className="px-6 py-2.5 bg-white/5 text-gray-400 rounded-xl text-sm">
                    Annuler
                  </button>
                  <button
                    onClick={async () => {
                      setIsSavingDigest(true);
                      try {
                        const activeCount = digests.filter(d => d.is_active && d.id !== editingDigestId).length;
                        if (digestIsActive && activeCount >= 3) {
                          showMsg('error', '3/3 digests actifs — désactivez-en un avant d\'activer celui-ci');
                          setIsSavingDigest(false);
                          return;
                        }
                        const payload = {
                          label_fr: digestLabel,
                          label_en: digestLabelEn,
                          article_ids: digestArticleIds,
                          design: digestDesign,
                          accent_color: digestAccentColor,
                          position_after_index: digestPositionAfter,
                          is_active: digestIsActive,
                          priority: editingDigestId
                            ? digests.find(d => d.id === editingDigestId)?.priority || 1
                            : (digests.length + 1),
                          updated_at: new Date().toISOString(),
                        };
                        if (editingDigestId) {
                          const { error } = await supabase.from('press_digest').update(payload).eq('id', editingDigestId);
                          if (error) throw error;
                          showMsg('success', '✅ Digest mis à jour');
                        } else {
                          const { error } = await supabase.from('press_digest').insert(payload);
                          if (error) throw error;
                          showMsg('success', '🎉 Digest créé');
                        }
                        setShowDigestForm(false);
                        fetchData();
                      } catch (err: any) {
                        showMsg('error', err.message);
                      }
                      setIsSavingDigest(false);
                    }}
                    disabled={isSavingDigest}
                    className="px-8 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl text-sm font-bold flex items-center gap-2"
                  >
                    {isSavingDigest ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LISTE DES DIGESTS */}
          {!showDigestForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {digests.length === 0 ? (
                <div className="col-span-3 text-center py-16 bg-white/[0.02] rounded-2xl border border-white/10">
                  <Newspaper className="mx-auto mb-3 text-gray-600" size={36} />
                  <p className="text-gray-500 text-sm">Aucun digest créé</p>
                </div>
              ) : (
                digests.map(d => {
                  const digestArticles = (d.article_ids || [])
                    .map(id => articles.find(a => a.id === id))
                    .filter(Boolean);
                  return (
                    <div
                      key={d.id}
                      className={`bg-white/[0.02] rounded-2xl border overflow-hidden transition-all ${d.is_active ? 'border-yellow-500/40' : 'border-white/10'}`}
                    >
                      {/* Bande couleur accent */}
                      <div className="h-1.5" style={{ backgroundColor: d.accent_color }} />
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="text-white font-bold text-sm">{d.label_fr}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{d.label_en}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${d.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-500'}`}>
                            {d.is_active ? 'ACTIF' : 'INACTIF'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-[10px] rounded-full capitalize border border-white/10">
                            {d.design}
                          </span>
                          <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-[10px] rounded-full border border-white/10">
                            Après art. #{d.position_after_index}
                          </span>
                          <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-[10px] rounded-full border border-white/10">
                            {d.article_ids?.length || 0} articles
                          </span>
                        </div>
                        {/* Mini aperçu articles */}
                        <div className="flex gap-1.5 mb-4 overflow-hidden">
                          {digestArticles.slice(0, 4).map((a: any) => (
                            a?.cover_url ? (
                              <img key={a.id} src={a.cover_url} className="w-10 h-10 object-cover rounded-lg flex-shrink-0 border border-white/10" alt="" />
                            ) : (
                              <div key={a?.id} className="w-10 h-10 rounded-lg bg-white/5 flex-shrink-0 border border-white/10 flex items-center justify-center">
                                <Newspaper size={12} className="text-gray-600" />
                              </div>
                            )
                          ))}
                          {digestArticles.length > 4 && (
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex-shrink-0 border border-white/10 flex items-center justify-center">
                              <span className="text-[10px] text-gray-500 font-bold">+{digestArticles.length - 4}</span>
                            </div>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              const activeCount = digests.filter(x => x.is_active && x.id !== d.id).length;
                              if (!d.is_active && activeCount >= 3) {
                                showMsg('error', '3/3 digests actifs — désactivez-en un d\'abord');
                                return;
                              }
                              await supabase.from('press_digest').update({ is_active: !d.is_active, updated_at: new Date().toISOString() }).eq('id', d.id);
                              fetchData();
                              showMsg('success', d.is_active ? '⏸️ Digest désactivé' : '✅ Digest activé');
                            }}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${d.is_active
                              ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            }`}
                          >
                            {d.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingDigestId(d.id);
                              setDigestLabel(d.label_fr);
                              setDigestLabelEn(d.label_en);
                              setDigestArticleIds(d.article_ids || []);
                              setDigestDesign(d.design);
                              setDigestAccentColor(d.accent_color);
                              setDigestPositionAfter(d.position_after_index);
                              setDigestIsActive(d.is_active);
                              setShowDigestForm(true);
                            }}
                            className="p-2 bg-white/5 text-gray-400 hover:text-yellow-400 rounded-xl"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('Supprimer ce digest ?')) return;
                              await supabase.from('press_digest').delete().eq('id', d.id);
                              fetchData();
                              showMsg('success', '🗑️ Digest supprimé');
                            }}
                            className="p-2 bg-white/5 text-gray-400 hover:text-red-400 rounded-xl"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              const { error } = await supabase.from('press_digest').insert({
                                label_fr: d.label_fr + ' (copie)',
                                label_en: d.label_en + ' (copy)',
                                article_ids: d.article_ids,
                                design: d.design,
                                accent_color: d.accent_color,
                                position_after_index: d.position_after_index,
                                is_active: false,
                                priority: digests.length + 1,
                              });
                              if (!error) { fetchData(); showMsg('success', '📋 Digest dupliqué'); }
                            }}
                            className="p-2 bg-white/5 text-gray-400 hover:text-blue-400 rounded-xl"
                            title="Dupliquer"
                          >
                            <FileText size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}


      {/* VUE AUTEURS */}
      {view === 'authors' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Équipe éditoriale</h3>
              <p className="text-gray-400 text-sm mt-1">
                Gérez les profils auteurs affichés dans les articles
              </p>
            </div>
            {!showAuthorForm && (
              <button
                onClick={() => {
                  setAuthorEditingId(null);
                  setAuthorName('');
                  setAuthorRoleFr('Journaliste');
                  setAuthorRoleEn('Journalist');
                  setAuthorBioFr('');
                  setAuthorBioEn('');
                  setAuthorAvatar('');
                  setAuthorTwitter('');
                  setAuthorLinkedin('');
                  setShowAuthorForm(true);
                }}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2"
              >
                <PlusCircle size={16} /> Ajouter un auteur
              </button>
            )}
          </div>

          {/* Formulaire auteur */}
          {showAuthorForm && (
            <div className="bg-[#0f0f0f] border border-teal-500/30 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-bold">
                  {authorEditingId ? 'Modifier l\'auteur' : 'Nouvel auteur'}
                </h4>
                <button onClick={() => setShowAuthorForm(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-teal-500/30 bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                  {authorAvatar
                    ? <img src={authorAvatar} className="w-full h-full object-cover" alt="" />
                    : <User size={28} className="text-gray-600" />
                  }
                </div>
                <div className="flex-1">
                  <button
                    onClick={() => openCloudinaryWidget('image', setAuthorAvatar, 'author-avatar')}
                    disabled={isUploading === 'author-avatar'}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-sm flex items-center gap-2"
                  >
                    {isUploading === 'author-avatar'
                      ? <Loader2 className="animate-spin" size={14} />
                      : <Upload size={14} />
                    }
                    Upload avatar
                  </button>
                  {authorAvatar && (
                    <button
                      onClick={() => setAuthorAvatar('')}
                      className="ml-2 text-xs text-red-400 hover:text-red-300"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Nom complet *</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    placeholder="Ex: Jean-Paul Mbeki"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">🇫🇷 Rôle / Fonction</label>
                  <input
                    type="text"
                    value={authorRoleFr}
                    onChange={e => setAuthorRoleFr(e.target.value)}
                    placeholder="Ex: Correspondant Afrique centrale"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">🇬🇧 Role / Title</label>
                  <input
                    type="text"
                    value={authorRoleEn}
                    onChange={e => setAuthorRoleEn(e.target.value)}
                    placeholder="Ex: Central Africa Correspondent"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Email (optionnel)</label>
                  <input
                    type="email"
                    value={authorLinkedin}
                    onChange={e => setAuthorLinkedin(e.target.value)}
                    placeholder="contact@lecontinent.media"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Twitter / X (URL)</label>
                  <input
                    type="text"
                    value={authorTwitter}
                    onChange={e => setAuthorTwitter(e.target.value)}
                    placeholder="https://x.com/..."
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">🇫🇷 Bio</label>
                  <textarea
                    value={authorBioFr}
                    onChange={e => setAuthorBioFr(e.target.value)}
                    rows={3}
                    placeholder="Courte biographie..."
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">🇬🇧 Bio</label>
                  <textarea
                    value={authorBioEn}
                    onChange={e => setAuthorBioEn(e.target.value)}
                    rows={3}
                    placeholder="Short biography..."
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => setShowAuthorForm(false)}
                  className="px-6 py-2.5 bg-white/5 text-gray-400 rounded-xl text-sm hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    if (!authorName.trim()) return showMsg('error', 'Le nom est requis');
                    setIsSaving(true);
                    const payload = {
                      name: authorName,
                      role_fr: authorRoleFr,
                      role_en: authorRoleEn,
                      bio_fr: authorBioFr || null,
                      bio_en: authorBioEn || null,
                      avatar_url: authorAvatar || null,
                      twitter_url: authorTwitter || null,
                      linkedin_url: authorLinkedin || null,
                      is_active: true,
                    };
                    try {
                      if (authorEditingId) {
                        const { error } = await supabase
                          .from('press_authors')
                          .update(payload)
                          .eq('id', authorEditingId);
                        if (error) throw error;
                        showMsg('success', '✅ Auteur mis à jour');
                      } else {
                        const { error } = await supabase
                          .from('press_authors')
                          .insert(payload);
                        if (error) throw error;
                        showMsg('success', '🎉 Auteur créé');
                      }
                      setShowAuthorForm(false);
                      fetchData();
                    } catch (err: any) {
                      showMsg('error', err.message);
                    }
                    setIsSaving(false);
                  }}
                  disabled={isSaving}
                  className="px-8 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Liste des auteurs */}
          {!showAuthorForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {authors.map(a => (
                <div
                  key={a.id}
                  className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-teal-500/30 transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden border border-teal-500/20 bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                      {a.avatar_url
                        ? <img src={a.avatar_url} className="w-full h-full object-cover" alt={a.name} />
                        : <User size={20} className="text-gray-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{a.name}</p>
                      <p className="text-teal-400 text-xs">{a.role_fr}</p>
                      {a.bio_fr && (
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{a.bio_fr}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.twitter_url && (
                      <a
                        href={a.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-white/5 text-gray-400 hover:text-white rounded-lg text-xs"
                      >
                        X
                      </a>
                    )}
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => {
                          setAuthorEditingId(a.id);
                          setAuthorName(a.name);
                          setAuthorRoleFr(a.role_fr);
                          setAuthorRoleEn(a.role_en);
                          setAuthorBioFr(a.bio_fr || '');
                          setAuthorBioEn(a.bio_en || '');
                          setAuthorAvatar(a.avatar_url || '');
                          setAuthorTwitter(a.twitter_url || '');
                          setAuthorLinkedin(a.linkedin_url || '');
                          setShowAuthorForm(true);
                        }}
                        className="p-2 bg-white/5 text-gray-400 hover:text-teal-400 rounded-lg"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Supprimer cet auteur ?')) return;
                          await supabase.from('press_authors').delete().eq('id', a.id);
                          fetchData();
                          showMsg('success', '🗑️ Auteur supprimé');
                        }}
                        className="p-2 bg-white/5 text-gray-400 hover:text-red-400 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {authors.length === 0 && (
                <div className="col-span-3 text-center py-16 bg-white/[0.02] rounded-2xl border border-white/10">
                  <User className="mx-auto mb-3 text-gray-600" size={36} />
                  <p className="text-gray-500 text-sm">Aucun auteur créé</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VUE SETTINGS */}
      {view === 'settings' && (
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto shadow-2xl">
          <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
            <Settings size={24} className="text-gray-400" />
            <h2 className="text-2xl font-bold text-white">Réseaux Sociaux</h2>
          </div>
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><MessageCircle className="text-green-400" /> WhatsApp</h3>
                <input type="checkbox" checked={socialSettings.wa_active} onChange={e => setSocialSettings({ ...socialSettings, wa_active: e.target.checked })} className="rounded bg-black border-white/20" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Numéro WhatsApp</label>
                  <input type="text" value={socialSettings.whatsapp_number} onChange={e => setSocialSettings({ ...socialSettings, whatsapp_number: e.target.value })} placeholder="Ex: 243812345678" className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Message automatique</label>
                  <textarea value={socialSettings.whatsapp_message} onChange={e => setSocialSettings({ ...socialSettings, whatsapp_message: e.target.value })} placeholder="Bonjour, je vous contacte depuis Lukeni..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" rows={2} />
                </div>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><InstagramIcon className="text-pink-400" /> Instagram</h3>
                <input type="checkbox" checked={socialSettings.ig_active} onChange={e => setSocialSettings({ ...socialSettings, ig_active: e.target.checked })} className="rounded" />
              </div>
              <input type="text" value={socialSettings.instagram_url} onChange={e => setSocialSettings({ ...socialSettings, instagram_url: e.target.value })} placeholder="https://instagram.com/..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FacebookIcon className="text-blue-400" /> Facebook</h3>
                <input type="checkbox" checked={socialSettings.fb_active} onChange={e => setSocialSettings({ ...socialSettings, fb_active: e.target.checked })} className="rounded" />
              </div>
              <input type="text" value={socialSettings.facebook_url} onChange={e => setSocialSettings({ ...socialSettings, facebook_url: e.target.value })} placeholder="https://facebook.com/..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
            </div>
          </div>
          <button onClick={handleSaveSettings} disabled={isSaving} className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 ml-auto">
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />} Enregistrer
          </button>
        </div>
      )}


      {showTeaserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] rounded-2xl border border-blue-500/30 max-w-lg w-full">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <LinkIcon size={18} className="text-blue-400" /> Configurer le teaser inline
              </h3>
              <button onClick={() => setShowTeaserModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Article cible</p>
                <p className="text-white text-sm font-bold">
                  {articles.find(a => a.id === teaserTargetArticleId)?.title_fr}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  🇫🇷 Kicker éditorial (FR)
                </label>
                <input
                  type="text"
                  value={teaserKickerFr}
                  onChange={e => setTeaserKickerFr(e.target.value)}
                  placeholder="Ex: Coup dur, À ne pas rater, La suite logique..."
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  🇬🇧 Kicker éditorial (EN)
                </label>
                <input
                  type="text"
                  value={teaserKickerEn}
                  onChange={e => setTeaserKickerEn(e.target.value)}
                  placeholder="Ex: Hard blow, Must read, The logical follow-up..."
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                />
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-xs text-blue-300">
                  💡 Après avoir configuré, cliquez sur "Insérer" — placez d'abord votre curseur
                  dans le textarea à l'endroit voulu.
                </p>
              </div>
              <div className="flex gap-3 pt-2 border-t border-white/10">
                <button
                  onClick={() => setShowTeaserModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 text-gray-400 rounded-xl text-sm"
                >
                  Annuler
                </button>
                {['fr', 'en'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => {
                      const index = relatedArticlesIds.indexOf(teaserTargetArticleId);
                      if (index === -1) return;

                      // Sauvegarder le teaser
                      setRelatedTeasers(prev => {
                        const filtered = prev.filter(t => t.article_id !== teaserTargetArticleId);
                        return [...filtered, {
                          article_id: teaserTargetArticleId,
                          kicker_fr: teaserKickerFr,
                          kicker_en: teaserKickerEn,
                          insert_index: index
                        }];
                      });

                      // Insérer le marqueur dans le texte
                      const marker = `\n\n[RELATED:${index}]\n\n`;
                      const textareaId = lang === 'fr' ? 'content-fr' : 'content-en';
                      const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const setter = lang === 'fr' ? setContentFr : setContentEn;
                        const content = lang === 'fr' ? contentFr : contentEn;
                        setter(content.substring(0, start) + marker + content.substring(start));
                      }
                      setShowTeaserModal(false);
                      showMsg('success', `✅ Teaser [RELATED:${index}] inséré dans ${lang.toUpperCase()}`);
                    }}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold"
                  >
                    Insérer ↳ {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}




      

      {/* MODALS */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f0f0f] rounded-2xl border border-white/10 max-w-2xl w-full my-4">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Ajouter un bloc média</h3>
              <button onClick={() => setShowMediaModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-5">

              {/* Type selector */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-3 block">Type de bloc</label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { val: 'image', label: 'Image', icon: '🖼️' },
                    { val: 'video', label: 'Vidéo', icon: '🎬' },
                    { val: 'youtube', label: 'YouTube', icon: '▶️' },
                    { val: 'code', label: 'Code', icon: '💻' },
                    { val: 'gallery', label: 'Galerie', icon: '📸' },
                    { val: 'quote_hero', label: 'Citation', icon: '💬' },
                    { val: 'link', label: 'Lien', icon: '🔗' },
                    { val: 'text_table', label: 'Texte/Tableau', icon: '📋' },
                  ] as const).map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setMediaType(opt.val)}
                      className={`p-2.5 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1 transition-all ${mediaType === opt.val
                        ? 'border-blue-500 bg-blue-500/15 text-white'
                        : 'border-white/10 text-gray-500 hover:border-white/20'
                        }`}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* IMAGE / VIDEO / LINK */}
              {(mediaType === 'image' || mediaType === 'video' || mediaType === 'link') && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={mediaUrl}
                      onChange={e => setMediaUrl(e.target.value)}
                      placeholder="URL"
                      className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                    />
                    {mediaType !== 'link' && (
                      <button
                        onClick={openMediaCloudinary}
                        className="px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl flex items-center gap-2 text-sm"
                      >
                        <Upload size={16} /> Upload
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={mediaCaption}
                    onChange={e => setMediaCaption(e.target.value)}
                    placeholder="Légende (optionnel)"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                  {mediaType === 'image' && (
                    <div>
                      <label className="text-xs text-gray-500 mb-2 block">Mise en page</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { val: 'contained', label: 'Contenu', desc: 'Dans la colonne' },
                          { val: 'wide', label: 'Large', desc: 'Déborde un peu' },
                          { val: 'full-bleed', label: 'Plein cadre', desc: 'Toute la largeur' },
                        ] as const).map(opt => (
                          <button
                            key={opt.val}
                            onClick={() => setMediaLayout(opt.val)}
                            className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${mediaLayout === opt.val
                              ? 'border-blue-500 bg-blue-500/15 text-white'
                              : 'border-white/10 text-gray-500'
                              }`}
                          >
                            <div>{opt.label}</div>
                            <div className="text-[9px] font-normal text-gray-600 mt-0.5">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* YOUTUBE */}
              {mediaType === 'youtube' && (
                <div className="space-y-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-xs text-red-300">
                      📺 Collez l'URL YouTube complète (pas besoin d'héberger la vidéo).
                    </p>
                  </div>
                  <input
                    type="text"
                    value={mediaYoutubeUrl}
                    onChange={e => setMediaYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                  {mediaYoutubeUrl && (() => {
                    const id = extractYoutubeId(mediaYoutubeUrl);
                    return id.length === 11 ? (
                      <div className="rounded-xl overflow-hidden border border-white/10">
                        <img
                          src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
                          className="w-full h-32 object-cover"
                          alt="preview"
                        />
                        <p className="text-xs text-green-400 p-2">✅ ID détecté : {id}</p>
                      </div>
                    ) : null;
                  })()}
                  <input
                    type="text"
                    value={mediaCaption}
                    onChange={e => setMediaCaption(e.target.value)}
                    placeholder="Légende / description de la vidéo"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
              )}

              {/* CODE */}
              {mediaType === 'code' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block font-semibold">Langage</label>
                    <select
                      value={mediaCodeLang}
                      onChange={e => setMediaCodeLang(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                    >
                      {[
                        'javascript', 'typescript', 'python', 'bash', 'sql',
                        'json', 'html', 'css', 'rust', 'go', 'java', 'php',
                        'swift', 'kotlin', 'yaml', 'markdown', 'plaintext'
                      ].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block font-semibold">Code</label>
                    <textarea
                      value={mediaCodeContent}
                      onChange={e => setMediaCodeContent(e.target.value)}
                      rows={8}
                      placeholder="Collez votre code ici..."
                      className="w-full bg-[#0d0d0d] border border-white/20 rounded-xl px-4 py-3 text-green-400 text-sm font-mono"
                      spellCheck={false}
                    />
                  </div>
                  <input
                    type="text"
                    value={mediaCaption}
                    onChange={e => setMediaCaption(e.target.value)}
                    placeholder="Description du snippet (optionnel)"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
              )}


                            {/* TEXTE / TABLEAU / ILLUSTRATION */}
              {mediaType === 'text_table' && (
                <TextTableBlockForm
                  onAdd={(type, content, format) => {
                    let newItem: MediaItem;
                    if (type === 'text') {
                      newItem = {
                        type: 'code',
                        url: '',
                        code_language: 'markdown',
                        code_content: content,
                        caption: mediaCaption || undefined,
                      };
                    } else if (type === 'table') {
                      newItem = {
                        type: 'code',
                        url: '',
                        code_language: 'markdown',
                        code_content: content,
                        caption: mediaCaption || undefined,
                      };
                    } else {
                      newItem = {
                        type: 'image',
                        url: content,
                        alt: format || '',
                        caption: mediaCaption || undefined,
                      };
                    }
                    setMediaItems([...mediaItems, newItem]);
                    setMediaCaption('');
                    setShowMediaModal(false);
                    showMsg('success', '✅ Bloc média ajouté');
                  }}
                  onCancel={() => {}}
                  caption={mediaCaption}
                  setCaption={setMediaCaption}
                />
              )}

              {/* GALLERY */}
              {mediaType === 'gallery' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">Ajoutez plusieurs images pour créer un carrousel.</p>
                  <div className="space-y-2">
                    {mediaGalleryUrls.map((url, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <img src={url} className="w-12 h-12 object-cover rounded-lg border border-white/10" alt="" />
                        <span className="flex-1 text-xs text-gray-400 truncate">{url}</span>
                        <button
                          onClick={() => setMediaGalleryUrls(mediaGalleryUrls.filter((_, idx) => idx !== i))}
                          className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      loadCloudinaryScript(() => {
                        // @ts-ignore
                        const w = window.cloudinary.createUploadWidget({
                          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
                          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                          sources: ['local', 'url'],
                          resourceType: 'image',
                          multiple: true,
                        }, (error: any, result: any) => {
                          if (result?.event === 'success') {
                            setMediaGalleryUrls(prev => [...prev, result.info.secure_url]);
                          }
                          if (error) showMsg('error', 'Erreur Cloudinary');
                        });
                        w.open();
                      });
                    }}
                    className="w-full py-3 border-2 border-dashed border-white/20 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-400 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Upload size={16} /> Ajouter des images
                  </button>
                  <input
                    type="text"
                    value={mediaCaption}
                    onChange={e => setMediaCaption(e.target.value)}
                    placeholder="Légende de la galerie"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
              )}

              {/* QUOTE HERO */}
              {mediaType === 'quote_hero' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl">
                    <p className="text-xs text-[#D4AF37]">
                      💬 Une citation mise en valeur qui sort de la colonne de texte.
                    </p>
                  </div>
                  <textarea
                    value={mediaQuoteText}
                    onChange={e => setMediaQuoteText(e.target.value)}
                    rows={3}
                    placeholder="La citation exacte..."
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm italic"
                  />
                  <input
                    type="text"
                    value={mediaQuoteAuthor}
                    onChange={e => setMediaQuoteAuthor(e.target.value)}
                    placeholder="Auteur / Source de la citation"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button onClick={() => setShowMediaModal(false)} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl text-sm hover:bg-white/10">
                  Annuler
                </button>
                <button onClick={addMediaItem} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold">
                  Ajouter le bloc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSourceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] rounded-2xl border border-white/10 max-w-2xl w-full">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Ajouter une source</h3>
              <button onClick={() => setShowSourceModal(false)} className="p-2 hover:bg-white/10 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" value={sourceTitle} onChange={e => setSourceTitle(e.target.value)} placeholder="Titre" className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
              <input type="text" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://" className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={sourceAuthor} onChange={e => setSourceAuthor(e.target.value)} placeholder="Auteur" className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                <input type="date" value={sourceDate} onChange={e => setSourceDate(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button onClick={() => setShowSourceModal(false)} className="px-6 py-3 bg-white/5 rounded-xl">Annuler</button>
                <button onClick={addSource} className="px-6 py-3 bg-purple-600 text-white rounded-xl">Ajouter</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {commentToDelete && (
        <DeleteCommentModal comment={commentToDelete} onCancel={() => setCommentToDelete(null)} onConfirm={handleDeleteComment} />
      )}

      {userToBlock && (
        <BlockUserModal user={userToBlock} onCancel={() => setUserToBlock(null)} onConfirm={(reason) => {
          handleBlockUser(userToBlock.id, userToBlock.email, reason);
          setUserToBlock(null);
        }} />
      )}

      {suggestionToDelete && (
        <DeleteSuggestionModal suggestion={suggestionToDelete} onCancel={() => setSuggestionToDelete(null)} onConfirm={handleDeleteSuggestion} />
      )}
    </div>
  );
}