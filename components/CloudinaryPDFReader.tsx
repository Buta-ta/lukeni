// components/CloudinaryPDFReader.tsx
"use client";

import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configurer le worker PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface CloudinaryPDFReaderProps {
  url: string;
  title: string;
  lang: 'fr' | 'en';
}

export default function CloudinaryPDFReader({ url, title, lang }: CloudinaryPDFReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // ✅ Convertir l'URL Cloudinary en URL de téléchargement direct
  // Cloudinary bloque les iframes mais autorise le chargement direct via fetch/blob
  const getPdfUrl = useCallback((originalUrl: string) => {
    // Ajouter fl_attachment:false pour forcer le mode inline si nécessaire
    // Ou utiliser l'URL telle quelle - pdfjs la fetche directement
    return originalUrl;
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(false);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF load error:', err);
    setIsLoading(false);
    setError(true);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-white font-bold">
          {lang === 'fr' ? 'Impossible de charger le PDF' : 'Unable to load PDF'}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-500 text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-white transition-colors"
        >
          {lang === 'fr' ? 'Ouvrir dans un nouvel onglet' : 'Open in new tab'}
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a14] border-b border-white/10 flex-shrink-0">
        {/* Navigation pages */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs text-gray-400 min-w-[80px] text-center">
            {pageNumber} / {numPages || '—'}
          </span>
          <button
            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-gray-500 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* PDF View */}
      <div className="flex-1 overflow-auto flex justify-center p-4">
        {isLoading && (
          <div className="flex items-center justify-center w-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
              <p className="text-gray-500 text-sm">
                {lang === 'fr' ? 'Chargement du PDF...' : 'Loading PDF...'}
              </p>
            </div>
          </div>
        )}
        <Document
          file={getPdfUrl(url)}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          // ✅ Options CORS pour Cloudinary
          options={{
            httpHeaders: {
              'Access-Control-Allow-Origin': '*',
            },
          }}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            loading=""
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-2xl"
          />
        </Document>
      </div>

      {/* Footer navigation rapide */}
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-[#0a0a14] border-t border-white/10 flex-shrink-0">
          <input
            type="range"
            min={1}
            max={numPages}
            value={pageNumber}
            onChange={e => setPageNumber(Number(e.target.value))}
            className="w-32 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}