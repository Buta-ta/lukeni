"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ExternalLink, Loader2, Share2, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// React PDF Viewer imports
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { highlightPlugin, RenderHighlightTargetProps, RenderHighlightsProps } from '@react-pdf-viewer/highlight';
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

  // 1. Initialiser le plugin de surlignage
  const highlightPluginInstance = highlightPlugin({
    // A. Le menu flottant quand on sélectionne du texte
    renderHighlightTarget: (renderProps: RenderHighlightTargetProps) => {
      return (
        <div 
          className="absolute flex items-center gap-2 bg-[#1a1a2e] border border-emerald-500/30 p-2 rounded-xl shadow-2xl"
          style={{ 
            left: `${renderProps.selectionRegion.left}%`, 
            top: `${renderProps.selectionRegion.top + renderProps.selectionRegion.height}%`, 
            marginTop: '8px',
            zIndex: 99999 // Indispensable pour passer au-dessus de tout sur mobile
          }}
        >
          {HIGHLIGHT_COLORS.map(color => (
            <button
              key={color.id}
              onClick={() => handleAddHighlight(renderProps, color.value)}
              className="w-7 h-7 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-inner"
              style={{ backgroundColor: color.value }}
            />
          ))}

          <div className="w-px h-5 bg-white/20 mx-1" />

          <button 
            onClick={() => handleCopy(renderProps.selectedText)}
            className="p-2 text-gray-300 hover:text-emerald-400 transition-colors rounded-lg hover:bg-white/5 active:scale-95"
            title="Copier">
            {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
          </button>

          {navigator.share && (
            <button 
              onClick={() => handleShare(renderProps.selectedText)}
              className="p-2 text-gray-300 hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5 active:scale-95"
              title="Partager">
              <Share2 size={18} />
            </button>
          )}
        </div>
      );
    },
    
    // B. Rendu natif des surlignages (Ça règle le problème du scroll !)
    renderHighlights: (props: RenderHighlightsProps) => (
      <div>
        {savedHighlights
          .filter((h) => h.highlightAreas.some((area: any) => area.pageIndex === props.pageIndex))
          .map((highlight) => (
            <React.Fragment key={highlight.id}>
              {highlight.highlightAreas
                .filter((area: any) => area.pageIndex === props.pageIndex)
                .map((area: any, index: number) => (
                  <div
                    key={index}
                    style={Object.assign(
                      {},
                      {
                        background: highlight.color,
                        opacity: 0.4,
                        mixBlendMode: 'multiply' as any,
                      },
                      // Magie : cette fonction convertit la position PDF en CSS exact pour la page !
                      props.getCssProperties(area, props.rotation)
                    )}
                  />
                ))}
            </React.Fragment>
          ))}
      </div>
    ),
  });

  // 2. Récupération des données à l'ouverture
  useEffect(() => {
    async function loadUserData() {
      if (!userId) {
        setIsLoadingDB(false);
        return;
      }
      try {
        const [progressRes, highlightsRes] = await Promise.all([
          supabase.from('user_reading_progress').select('current_page').eq('user_id', userId).eq('book_id', bookId).maybeSingle(),
          supabase.from('user_highlights').select('id, content, color, position_data').eq('user_id', userId).eq('book_id', bookId)
        ]);

        if (progressRes.data) {
          setInitialPage(progressRes.data.current_page);
        }
        
        if (highlightsRes.data) {
          const formattedHighlights = highlightsRes.data.map(h => ({
            id: h.id,
            content: h.content,
            color: h.color,
            highlightAreas: h.position_data,
          }));
          setSavedHighlights(formattedHighlights);
        }
      } catch (err) {
        console.error("Erreur chargement PDF:", err);
      } finally {
        setIsLoadingDB(false);
      }
    }
    loadUserData();
  }, [userId, bookId]);

  // 3. Sauvegarder la page en cours (Debounce 2s)
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

    const tempId = `temp_${Date.now()}`;
    const newHighlight = {
      id: tempId,
      content: renderProps.selectedText,
      highlightAreas: renderProps.highlightAreas,
      color: color,
    };

    // Affiche le surlignage instantanément
    setSavedHighlights(prev => [...prev, newHighlight]);

    // Envoi en Base de données
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

  // 5. Fonctions Utilitaires
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
          <p className="text-gray-500 text-sm tracking-widest uppercase text-[10px]">
            {lang === 'fr' ? 'Synchronisation...' : 'Syncing...'}
          </p>
        </div>
      )}

      {/* Toolbar */}
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

      {/* Lecteur PDF */}
      <div className="absolute inset-0 pt-14 bg-[#1a1a2e] overflow-hidden" style={{ touchAction: 'pan-y' }}>
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
    </>
  );
}