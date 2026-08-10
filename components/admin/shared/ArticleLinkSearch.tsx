// components/admin/shared/ArticleLinkSearch.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Newspaper, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ArticleResult {
  id: string;
  type: 'press' | 'encyclopedia';
  title: string;
  summary: string;
  image_url: string | null;
}

interface ArticleLinkSearchProps {
  linkedType: 'press' | 'encyclopedia' | null;
  linkedId: string | null;
  onChange: (type: 'press' | 'encyclopedia' | null, id: string | null) => void;
  lang?: 'fr' | 'en';
}

export default function ArticleLinkSearch({
  linkedType, linkedId, onChange, lang = 'fr',
}: ArticleLinkSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ArticleResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [linkedArticle, setLinkedArticle] = useState<ArticleResult | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Charger l'article lié existant
  useEffect(() => {
    if (!linkedType || !linkedId) {
      setLinkedArticle(null);
      return;
    }

    async function fetchLinked() {
      const isPress = linkedType === 'press';
      const table = isPress ? 'press_articles' : 'articles';
      const imgCol = isPress ? 'cover_url' : 'image_url';
      const { data } = await supabase
        .from(table)
        .select(`id, title_fr, title_en, summary_fr, summary_en, ${imgCol}`)
        .eq('id', linkedId)
        .maybeSingle();

      if (data) {
        setLinkedArticle({
          id: data.id,
          type: linkedType!,
          title: lang === 'fr' ? (data.title_fr || data.title_en) : (data.title_en || data.title_fr),
          summary: lang === 'fr' ? (data.summary_fr || data.summary_en || '') : (data.summary_en || data.summary_fr || ''),
          image_url: (data as any)[imgCol] || null,
        });
      }
    }
    fetchLinked();
  }, [linkedType, linkedId, lang]);

  // Recherche avec debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const q = searchQuery.toLowerCase();

      const [pressRes, encyRes] = await Promise.all([
        supabase
          .from('press_articles')
          .select('id, title_fr, title_en, summary_fr, summary_en, cover_url')
          .eq('status', 'published')
          .or(`title_fr.ilike.%${q}%,title_en.ilike.%${q}%`)
          .limit(5),
        supabase
          .from('articles')
          .select('id, title_fr, title_en, summary_fr, summary_en, image_url')
          .eq('status', 'published')
          .or(`title_fr.ilike.%${q}%,title_en.ilike.%${q}%`)
          .limit(5),
      ]);

      const pressResults: ArticleResult[] = (pressRes.data || []).map((a: any) => ({
        id: a.id,
        type: 'press' as const,
        title: lang === 'fr' ? a.title_fr : (a.title_en || a.title_fr),
        summary: lang === 'fr' ? (a.summary_fr || '') : (a.summary_en || a.summary_fr || ''),
        image_url: a.cover_url || null,
      }));

      const encyResults: ArticleResult[] = (encyRes.data || []).map((a: any) => ({
        id: a.id,
        type: 'encyclopedia' as const,
        title: lang === 'fr' ? a.title_fr : (a.title_en || a.title_fr),
        summary: lang === 'fr' ? (a.summary_fr || '') : (a.summary_en || a.summary_fr || ''),
        image_url: a.image_url || null,
      }));

      setResults([...pressResults, ...encyResults]);
      setShowDropdown(true);
      setIsSearching(false);
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, lang]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (article: ArticleResult) => {
    onChange(article.type, article.id);
    setLinkedArticle(article);
    setSearchQuery('');
    setShowDropdown(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange(null, null);
    setLinkedArticle(null);
    setSearchQuery('');
  };

  return (
    <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02] space-y-3">
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-gray-300">
          Article lié (optionnel)
        </span>
        {linkedArticle && (
          <button
            onClick={handleClear}
            className="ml-auto text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <X size={10} /> Retirer le lien
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-600">
        Liez ce morceau à un article de presse ou encyclopédie. Un résumé sera affiché aux visiteurs.
      </p>

      {/* Article actuellement lié */}
      {linkedArticle && (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
          {linkedArticle.image_url ? (
            <img
              src={linkedArticle.image_url}
              alt=""
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              {linkedArticle.type === 'press' ? (
                <Newspaper size={14} className="text-blue-400" />
              ) : (
                <FileText size={14} className="text-purple-400" />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                linkedArticle.type === 'press'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-purple-500/20 text-purple-400'
              }`}>
                {linkedArticle.type === 'press' ? '📰 Presse' : '📖 Encyclopédie'}
              </span>
            </div>
            <p className="text-xs text-white font-medium truncate mt-0.5">
              {linkedArticle.title}
            </p>
            {linkedArticle.summary && (
              <p className="text-[10px] text-gray-500 truncate">
                {linkedArticle.summary.slice(0, 80)}...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recherche */}
      {!linkedArticle && (
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
              placeholder="Rechercher un article (presse ou encyclopédie)…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 placeholder-gray-700"
            />
            {isSearching && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
            )}
          </div>

          {/* Dropdown résultats */}
          {showDropdown && results.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
              {results.map((article) => (
                <button
                  key={`${article.type}-${article.id}`}
                  onClick={() => handleSelect(article)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  {article.image_url ? (
                    <img src={article.image_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      {article.type === 'press' ? <Newspaper size={12} className="text-blue-400" /> : <FileText size={12} className="text-purple-400" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${
                        article.type === 'press' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {article.type === 'press' ? 'PRESSE' : 'ENCYCLO.'}
                      </span>
                      <span className="text-xs text-white truncate">{article.title}</span>
                    </div>
                    {article.summary && (
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{article.summary.slice(0, 60)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showDropdown && searchQuery.length >= 2 && results.length === 0 && !isSearching && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl z-50 p-4 text-center">
              <p className="text-xs text-gray-500">Aucun résultat pour "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
