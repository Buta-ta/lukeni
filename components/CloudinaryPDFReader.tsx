"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Share2, Copy, Check, ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon, PenTool } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// React PDF Viewer imports
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { highlightPlugin, RenderHighlightTargetProps, RenderHighlightsProps } from '@react-pdf-viewer/highlight';
import { zoomPlugin } from '@react-pdf-viewer/zoom';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';

interface CloudinaryPDFReaderProps {
  url: string;
  title: string;
  lang: 'fr' | 'en';
  bookId: string;
  userId?: string;
  onClose: () => void;
}

const HIGHLIGHT_COLORS = [
  { id: 'yellow', value: '#fef08a' },
  { id: 'green', value: '#bbf7d0' },
  { id: 'pink', value: '#fbcfe8' },
];

// NOUVEAU : Composant invisible qui déclenche le surlignage automatique (Pour le Mode Surligneur)
function AutoHighlighter({
  renderProps,
  onHighlight
}: {
  renderProps: RenderHighlightTargetProps;
  onHighlight: (props: RenderHighlightTargetProps) => void;
}) {
  useEffect(() => {
    // On augmente le délai (300ms) pour laisser le navigateur mobile 
    // calculer les coordonnées de la sélection avant de surligner.
    const timer = setTimeout(() => {
      onHighlight(renderProps);
    }, 300);
    return () => clearTimeout(timer);
  }, [renderProps, onHighlight]);

  return null;
}

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
  
  // NOUVEAU : État pour le Mode Surligneur
  const [isHighlighterMode, setIsHighlighterMode] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialiser le plugin de Zoom
  const zoomPluginInstance = zoomPlugin({
    enableShortcuts: true,
  });
  const { ZoomIn, ZoomOut } = zoomPluginInstance;

  // 2. Initialiser le plugin de surlignage
  const highlightPluginInstance = highlightPlugin({
    
    renderHighlightTarget: (renderProps: RenderHighlightTargetProps) => {
      
      // SI MODE SURLIGNEUR ACTIF (Magie pour le Mobile)
      if (isHighlighterMode) {
        return <AutoHighlighter 
          renderProps={renderProps} 
          onHighlight={(props) => handleAddHighlight(props, '#fef08a', true)} 
        />;
      }

      // SINON, MODE CLASSIQUE (Barre d'action en bas pour le Desktop)
      return (
        <div 
          className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#0a0a14]/95 backdrop-blur-xl border border-emerald-500/40 px-4 py-3 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
          style={{ zIndex: 2147483647 }}
        >
          {/* Couleurs */}
          <div className="flex items-center gap-3">
            {HIGHLIGHT_COLORS.map(color => (
              <button
                key={color.id}
                onClick={() => handleAddHighlight(renderProps, color.value, false)}
                className="w-7 h-7 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-inner active:scale-95"
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-white/20 mx-1" />

          {/* Actions (Copier / Partager) */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleCopy(renderProps)}
              className="p-2.5 text-gray-300 hover:text-emerald-400 transition-colors rounded-xl hover:bg-white/10 active:scale-95"
              title="Copier">
              {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
            </button>

            {navigator.share && (
              <button 
                onClick={() => handleShare(renderProps)}
                className="p-2.5 text-gray-300 hover:text-blue-400 transition-colors rounded-xl hover:bg-white/10 active:scale-95"
                title="Partager">
                <Share2 size={18} />
              </button>
            )}
          </div>

          <div className="w-px h-6 bg-white/20 mx-1" />

          {/* Bouton Annuler */}
          <button 
            onClick={renderProps.toggle}
            className="p-2.5 text-gray-400 hover:text-red-400 transition-colors rounded-xl hover:bg-white/10 active:scale-95"
            title="Annuler">
            <X size={18} />
          </button>
        </div>
      );
    },
    
    // Rendu natif des surlignages
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
                        borderRadius: '2px',
                      },
                      props.getCssProperties(area, props.rotation)
                    )}
                  />
                ))}
            </React.Fragment>
          ))}
      </div>
    ),
  });

  // 3. Charger les données (Page et Surlignages)
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

  // 4. Mémoriser la page en cours
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

   const handleAddHighlight = async (renderProps: RenderHighlightTargetProps, color: string, autoClear: boolean) => {
    if (!autoClear) {
      renderProps.toggle(); // Mode normal : on ferme le menu
    }

    const tempId = `temp_${Date.now()}`;
    const newHighlight = {
      id: tempId,
      content: renderProps.selectedText,
      highlightAreas: renderProps.highlightAreas,
      color: color,
    };

    setSavedHighlights(prev => [...prev, newHighlight]);

    // Mode surligneur mobile : on laisse 300ms à React pour dessiner la couleur jaune 
    // AVANT de tuer la sélection native du téléphone.
    if (autoClear) {
      setTimeout(() => {
        window.getSelection()?.removeAllRanges();
        renderProps.cancel(); // Force la librairie PDF à relâcher la zone
      }, 300);
    }

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

  const handleCopy = async (renderProps: RenderHighlightTargetProps) => {
    await navigator.clipboard.writeText(renderProps.selectedText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      renderProps.toggle();
    }, 1500);
  };

  const handleShare = async (renderProps: RenderHighlightTargetProps) => {
    try {
      await navigator.share({
        title: `Citation de ${title}`,
        text: `"${renderProps.selectedText}" — Lu sur Lukeni.`,
      });
    } catch (err) {
      console.log('Partage annulé ou non supporté');
    }
    renderProps.toggle();
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

      {/* Toolbar en haut */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-[#0a0a14] border-b border-white/10 z-30 flex items-center justify-between px-2 sm:px-4">
        
        <div className="hidden sm:flex items-center gap-3 min-w-0 flex-1">
          <h3 className="text-white text-sm font-bold truncate">{title}</h3>
        </div>

        {/* Boutons de Zoom et Mode Surligneur */}
        <div className="flex items-center gap-1 sm:gap-2 mr-auto sm:mr-0 ml-2 sm:ml-0 bg-white/5 rounded-lg p-1">
          <ZoomOut>
            {(props) => (
              <button onClick={props.onClick} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all">
                <ZoomOutIcon size={16} />
              </button>
            )}
          </ZoomOut>
          <ZoomIn>
            {(props) => (
              <button onClick={props.onClick} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all">
                <ZoomInIcon size={16} />
              </button>
            )}
          </ZoomIn>

          <div className="w-px h-4 bg-white/20 mx-1" />

          {/* LE BOUTON MAGIQUE */}
          <button 
            onClick={() => setIsHighlighterMode(!isHighlighterMode)}
            className={`p-1.5 rounded transition-all flex items-center gap-1 ${isHighlighterMode ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            title={lang === 'fr' ? 'Mode Surligneur Actif' : 'Highlighter Mode'}
          >
            <PenTool size={16} />
          </button>
        </div>

        {/* Actions d'entête (Il ne reste que la Croix pour fermer) */}
        <div className="flex items-center flex-shrink-0 ml-4">
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors bg-white/5 rounded-lg">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Lecteur PDF */}
      <div 
        className="absolute inset-0 pt-14 bg-[#1a1a2e] overflow-auto select-text [&_*]:select-text" 
        style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
      >
        {!isLoadingDB && (
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
            <div style={{ height: '100%', width: '100%' }}>
              <Viewer
                fileUrl={url}
                initialPage={initialPage}
                onPageChange={handlePageChange}
                plugins={[highlightPluginInstance, zoomPluginInstance]}
                theme="dark"
                defaultScale={1}
              />
            </div>
          </Worker>
        )}
      </div>
    </>
  );
}