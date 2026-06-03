"use client";

import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, ZoomIn, ZoomOut, Download } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// ✅ Configurer le worker avec version stable
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

  // ✅ Utiliser le proxy pour contourner CORS Cloudinary
  const getPdfUrl = useCallback((originalUrl: string) => {
    // Si URL Cloudinary, passer par le proxy
    if (originalUrl.includes('cloudinary.com')) {
      return `/api/pdf-proxy?url=${encodeURIComponent(originalUrl)}`;
    }
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

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [url, title]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <div>
          <p className="text-white font-bold mb-2">
            {lang === 'fr' ? 'Impossible de charger le PDF' : 'Unable to load PDF'}
          </p>
          <p className="text-gray-400 text-sm max-w-md">
            {lang === 'fr' 
              ? 'Le fichier PDF ne peut pas être affiché. Téléchargez-le pour le lire.'
              : 'The PDF file cannot be displayed. Download it to read.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-white transition-colors"
          >
            <Download size={16} />
            {lang === 'fr' ? 'Télécharger' : 'Download'}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-400 transition-colors"
          >
            {lang === 'fr' ? 'Ouvrir' : 'Open'}
          </a>
        </div>
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

        {/* Zoom + Download */}
        <div className="flex items-center gap-3">
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
          
          <div className="w-px h-4 bg-white/10" />
          
          <button
            onClick={handleDownload}
            className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors"
            title={lang === 'fr' ? 'Télécharger' : 'Download'}
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* PDF View */}
      <div className="flex-1 overflow-auto flex justify-center items-start p-4">
        {isLoading && (
          <div className="flex items-center justify-center w-full h-full">
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
          options={{
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
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
            className="w-full max-w-xs h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
          />
        </div>
      )}
    </div>
  );
}