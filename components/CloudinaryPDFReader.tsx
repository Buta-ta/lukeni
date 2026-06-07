"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ExternalLink, Loader2, Share2, Copy, Check, ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon } from 'lucide-react';
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

// Un petit composant invisible pour lier la sélection du PDF à notre React State
function SelectionTracker({ renderProps, onSelectionChange }: { renderProps: RenderHighlightTargetProps, onSelectionChange: (p: RenderHighlightTargetProps | null) => void }) {
  useEffect(() => {
    onSelectionChange(renderProps);
    return () => onSelectionChange(null);
  }, [renderProps, onSelectionChange]);
  return null; // Ne rend rien à l'écran, met juste à jour l'état
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
  
  // STATE MAGIQUE : Contient les données de la sélection en cours
  const [currentSelection, setCurrentSelection] = useState<RenderHighlightTargetProps | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialiser le plugin de Zoom
  const zoomPluginInstance = zoomPlugin({
    enableShortcuts: true,
  });
  const { ZoomIn, ZoomOut } = zoomPluginInstance;

  // 2. Initialiser le plugin de surlignage
  const highlightPluginInstance = highlightPlugin({
    // Au lieu d'afficher un menu flottant, on met à jour notre State
    renderHighlightTarget: (renderProps: RenderHighlightTargetProps) => (
      <SelectionTracker renderProps={renderProps} onSelectionChange={setCurrentSelection} />
    ),
    
    // Le rendu des couleurs sur la page reste le même
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

  // 3. Charger les données
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

  // 4. Actions
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

  const handleAddHighlight = async (color: string) => {
    if (!currentSelection) return;
    
    // Ferme la sélection
    currentSelection.toggle(); 
    const { selectedText, highlightAreas } = currentSelection;
    setCurrentSelection(null);

    const tempId = `temp_${Date.now()}`;
    const newHighlight = {
      id: tempId,
      content: selectedText,
      highlightAreas: highlightAreas,
      color: color,
    };

    setSavedHighlights(prev => [...prev, newHighlight]);

    if (userId) {
      await supabase.from('user_highlights').insert({
        user_id: userId,
        book_id: bookId,
        content: selectedText,
        color: color,
        position_data: highlightAreas
      });
    }
  };

  const handleCopy = async () => {
    if (!currentSelection) return;
    await navigator.clipboard.writeText(currentSelection.selectedText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      currentSelection.toggle();
      setCurrentSelection(null);
    }, 1500);
  };

  const handleShare = async () => {
    if (!currentSelection) return;
    try {
      await navigator.share({
        title: `Citation de ${title}`,
        text: `"${currentSelection.selectedText}" — Lu sur Lukeni.`,
      });
    } catch (err) {
      console.log('Partage annulé ou non supporté');
    }
    currentSelection.toggle();
    setCurrentSelection(null);
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

      {/* LA BARRE D'OUTILS DYNAMIQUE */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-[#0a0a14] border-b border-white/10 z-30 flex items-center px-2 sm:px-4 transition-colors">
        
        {currentSelection ? (
          // MODE SÉLECTION : Remplace la barre normale quand du texte est sélectionné
          <div className="flex-1 flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { currentSelection.toggle(); setCurrentSelection(null); }} 
                className="p-1 text-gray-400 hover:text-red-400 transition-colors bg-white/5 rounded-full"
              >
                <X size={18} />
              </button>
              
              <div className="w-px h-5 bg-white/10 mx-1" />
              
              {/* Couleurs de surlignage */}
              <div className="flex items-center gap-2">
                {HIGHLIGHT_COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => handleAddHighlight(color.value)}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-white/20 hover:scale-110 transition-transform active:scale-95"
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            </div>

            {/* Actions (Copier / Partager) */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={handleCopy} className="p-2 text-gray-300 hover:text-emerald-400 transition-colors rounded-lg bg-white/5 active:scale-95 flex items-center gap-2">
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                <span className="hidden sm:inline text-xs font-medium">{lang === 'fr' ? 'Copier' : 'Copy'}</span>
              </button>

              {navigator.share && (
                <button onClick={handleShare} className="p-2 text-gray-300 hover:text-blue-400 transition-colors rounded-lg bg-white/5 active:scale-95 flex items-center gap-2">
                  <Share2 size={16} />
                  <span className="hidden sm:inline text-xs font-medium">{lang === 'fr' ? 'Partager' : 'Share'}</span>
                </button>
              )}
            </div>
          </div>

        ) : (

          // MODE NORMAL : Titre, Zoom, et Fermeture
          <div className="flex-1 flex items-center justify-between w-full">
            <div className="hidden sm:flex items-center gap-3 min-w-0 flex-1">
              <h3 className="text-white text-sm font-bold truncate">{title}</h3>
            </div>

            {/* Boutons de Zoom */}
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
            </div>

            {/* Actions globales */}
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0 ml-4">
              <button onClick={handleDownload} className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors">
                <Download size={18} />
              </button>
              <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors">
                <ExternalLink size={18} />
              </a>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors ml-2 bg-white/5 rounded-lg">
                <X size={20} />
              </button>
            </div>
          </div>
        )}

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