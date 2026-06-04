"use client";

import { useState } from 'react';
import { X, Download, ExternalLink, Loader2 } from 'lucide-react';

interface CloudinaryPDFReaderProps {
  url: string;
  title: string;
  lang: 'fr' | 'en';
  onClose: () => void;
}

export default function CloudinaryPDFReader({ 
  url, 
  title, 
  lang,
  onClose 
}: CloudinaryPDFReaderProps) {
  const [isLoading, setIsLoading] = useState(true);

  // ✅ On utilise bien l'URL Cloudinary native avec les paramètres de visualisation
  const cloudinaryViewerUrl = `${url}?rawTransformation=%5B%7B%22flags%22%3A%22immutable%22%7D%5D`;

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
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#020111] z-20">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
          <p className="text-gray-500 text-sm">
            {lang === 'fr' ? 'Chargement du PDF...' : 'Loading PDF...'}
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 bg-[#0a0a14] border-b border-white/10 z-30">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h3 className="text-white text-sm font-bold truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleDownload}
            className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors"
            title={lang === 'fr' ? 'Télécharger' : 'Download'}
          >
            <Download size={18} />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
            title={lang === 'fr' ? 'Ouvrir dans un nouvel onglet' : 'Open in new tab'}
          >
            <ExternalLink size={18} />
          </a>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* PDF Viewer - Cloudinary native */}
      <div className="absolute inset-0 pt-14 bg-[#1a1a2e]">
        <iframe
          src={cloudinaryViewerUrl} // 👈 CORRECTION: Utilise la bonne variable
          className="w-full h-full border-0"
          title={title}
          onLoad={() => setIsLoading(false)}
          // 👈 CORRECTION: Suppression de l'attribut sandbox qui bloque le lecteur PDF natif de Chrome
          allow="fullscreen"
        />
      </div>
    </>
  );
}