"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ExternalLink, Loader2, Share2, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// React PDF Viewer imports
import { Worker, Viewer, Position } from '@react-pdf-viewer/core';
import { highlightPlugin, RenderHighlightTargetProps } from '@react-pdf-viewer/highlight';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';

interface CloudinaryPDFReaderProps {
  url: string;
  title: string;
  lang: 'fr' | 'en';
  bookId: string;
  userId?: string;
  onClose: () => void;
}

const HIGHLIGHT_COLORS = [
  { id: 'yellow', value: '#fef08a' }, // Jaune
  { id: 'green', value: '#bbf7d0' },  // Vert
  { id: 'pink', value: '#fbcfe8' },   // Rose
];

export default function CloudinaryPDFReader({ 
  url, 
  title, 
  lang,
  bookId,
  userId,
  onClose 
}: CloudinaryPDFReaderProps) {
  
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [initialPage, setInitialPage] = useState(0);
  const [savedHighlights, setSavedHighlights] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialiser le plugin de surlignage avec un menu flottant custom
  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: (renderProps: RenderHighlightTargetProps) => {
      return (
        <div className="absolute z-50 flex items-center gap-2 bg-[#1a1a2e] border border-white/20 p-2 rounded-xl shadow-2xl"
             style={{ left: `${renderProps.selectionRegion.left}%`, top: `${renderProps.selectionRegion.top + renderProps.selectionRegion.height}%`, marginTop: '8px' }}>
          
          {/* Couleurs */}
          {HIGHLIGHT_COLORS.map(color => (
            <button
              key={color.id}
              onClick={() => handleAddHighlight(renderProps, color.value)}
              className="w-6 h-6 rounded-full border border-white/10 hover:scale-110 transition-transform"
              style={{ backgroundColor: color.value }}
            />
          ))}

          <div className="w-px h-5 bg-white/20 mx-1" />

          {/* Bouton Copier */}
          <button 
            onClick={() => handleCopy(renderProps.selectedText)}
            className="p-1.5 text-gray-300 hover:text-emerald-400 transition-colors rounded-lg hover:bg-white/5"
            title="Copier">
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>

          {/* Bouton Partager (Mobile) */}
          {navigator.share && (
            <button 
              onClick={() => handleShare(renderProps.selectedText)}
              className="p-1.5 text-gray-300 hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5"
              title="Partager">
              <Share2 size={16} />
            </button>
          )}
        </div>
      );
    },
  });

  // 2. Récupérer la progression et les surlignages au chargement
  useEffect(() => {
    async function loadUserData() {
      if (!userId) {
        setIsLoadingDB(false);
        return;
      }
      try {
        const [progressRes, highlightsRes] = await Promise.all([
          supabase.from('user_reading_progress').select('current_page').eq('user_id', userId).eq('book_id', bookId).maybeSingle(),
          supabase.from('user_highlights').select('*').eq('user_id', userId).eq('book_id', bookId)
        ]);

        if (progressRes.data) setInitialPage(progressRes.data.current_page);
        
        if (highlightsRes.data) {
          // Transformer les données DB pour le lecteur PDF
          const formattedHighlights = highlightsRes.data.map(h => ({
            content: h.content,
            highlightAreas: h.position_data,
            id: h.id,
            color: h.color
          }));
          setSavedHighlights(formattedHighlights);
        }
      } catch (err) {
        console.error("Erreur chargement données PDF:", err);
      } finally {
        setIsLoadingDB(false);
      }
    }
    loadUserData();
  }, [userId, bookId]);

  // 3. Sauvegarder la page en cours (avec un Debounce de 2 secondes pour ne pas spammer la DB)
  const handlePageChange = (e: any) => {
    if (!userId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase.from('user_reading_progress').upsert({
        user_id: userId,
        book_id: bookId,
        current_page: e.currentPage
      }, { onConflict: 'user_id,book_id' });
    }, 2000);
  };

  // 4. Ajouter et sauvegarder un surlignage
  const handleAddHighlight = async (renderProps: RenderHighlightTargetProps, color: string) => {
    renderProps.toggle(); // Ferme le menu

    const newHighlight = {
      content: renderProps.selectedText,
      highlightAreas: renderProps.highlightAreas,
      color: color,
    };

    // Afficher tout de suite à l'écran
    setSavedHighlights(prev => [...prev, newHighlight]);

    // Sauvegarder en DB
    if (userId) {
      await supabase.from('user_highlights').insert({
        user_id: userId,
        book_id: bookId,
        content: renderProps.selectedText,
        color: color,
        position_data: renderProps.highlightAreas
      });
    }
  };

  // 5. Fonctions Copier & Partager
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (text: string) => {
    try {
      await navigator.share({
        title: `Citation de ${title}`,
        text: `"${text}" — Lu sur Lukeni.`,
      });
    } catch (err) {
      console.log('Partage annulé ou non supporté');
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {isLoadingDB && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#020111] z-[100]">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
          <p className="text-gray-500 text-sm">
            {lang === 'fr' ? 'Synchronisation de la lecture...' : 'Syncing reading progress...'}
          </p>
        </div>
      )}

      {/* Toolbar en haut */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 bg-[#0a0a14] border-b border-white/10 z-30">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h3 className="text-white text-sm font-bold truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={handleDownload} className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors">
            <Download size={18} />
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors">
            <ExternalLink size={18} />
          </a>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Lecteur PDF Natif */}
      <div className="absolute inset-0 pt-14 bg-[#1a1a2e] overflow-hidden">
        {!isLoadingDB && (
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
            <div style={{ height: '100%', width: '100%' }}>
              <Viewer
                fileUrl={url}
                initialPage={initialPage}
                onPageChange={handlePageChange}
                plugins={[highlightPluginInstance]}
                theme="dark"
              />
            </div>
          </Worker>
        )}
      </div>

      {/* Rendu des surlignages sauvegardés (Couche transparente par dessus) */}
      {!isLoadingDB && savedHighlights.map((hl, i) => (
        hl.highlightAreas.map((area: any, j: number) => (
          <div
            key={`${i}-${j}`}
            className="absolute z-10 mix-blend-multiply pointer-events-none opacity-40"
            style={{
              left: `${area.left}%`,
              top: `calc(${area.top}% + 56px)`, // 56px pour décaler la toolbar
              width: `${area.width}%`,
              height: `${area.height}%`,
              backgroundColor: hl.color || '#fef08a'
            }}
          />
        ))
      ))}
    </>
  );
}