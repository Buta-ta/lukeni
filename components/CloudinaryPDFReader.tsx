"use client";

import { useState, useRef } from 'react';
import { Loader2, AlertCircle, Download, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface CloudinaryPDFReaderProps {
  url: string;
  title: string;
  lang: 'fr' | 'en';
}

export default function CloudinaryPDFReader({ url, title, lang }: CloudinaryPDFReaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Utiliser le proxy pour éviter CORS
  const proxyUrl = url.includes('cloudinary.com') 
    ? `/api/pdf-proxy?url=${encodeURIComponent(url)}`
    : url;

  const pdfViewerUrl = `${proxyUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH&page=1`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative w-full h-full bg-[#1a1a2e] flex flex-col">
      {/* Loading */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#020111] z-10">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
          <p className="text-gray-500 text-sm">
            {lang === 'fr' ? 'Chargement du PDF...' : 'Loading PDF...'}
          </p>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center z-10 bg-[#020111]">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-white text-lg font-bold mb-2">
              {lang === 'fr' ? 'Erreur de chargement' : 'Loading error'}
            </h3>
            <p className="text-gray-400 text-sm max-w-md mb-4">
              {lang === 'fr'
                ? "Impossible de charger le PDF. Téléchargez-le directement ou ouvrez-le dans un nouvel onglet."
                : 'Unable to load the PDF. Download it directly or open it in a new tab.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-white transition-colors"
            >
              <Download size={16} />
              {lang === 'fr' ? 'Télécharger' : 'Download'}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-400 transition-colors"
            >
              <ExternalLink size={16} />
              {lang === 'fr' ? 'Ouvrir dans un nouvel onglet' : 'Open in new tab'}
            </a>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a14] border-b border-white/10 flex-shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {lang === 'fr' ? 'Aperçu PDF' : 'PDF Preview'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors"
            title={lang === 'fr' ? 'Télécharger le PDF' : 'Download PDF'}
          >
            <Download size={16} />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
            title={lang === 'fr' ? 'Ouvrir dans un nouvel onglet' : 'Open in new tab'}
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* PDF Viewer - iframe natif */}
      <div className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={pdfViewerUrl}
          className="w-full h-full border-0"
          title={title}
          onLoad={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          allow="fullscreen"
        />
      </div>

      {/* Footer Info */}
      <div className="bg-[#0a0a14] border-t border-white/10 px-4 py-2 text-center text-[10px] text-gray-600 flex-shrink-0">
        {lang === 'fr' ? 'Utilisez les contrôles PDF pour naviguer' : 'Use PDF controls to navigate'}
      </div>
    </div>
  );
}