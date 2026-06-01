"use client";

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function FormatHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const formats = [
    {
      label: 'Gras',
      syntax: '**texte**',
      render: <strong className="text-white font-bold">texte</strong>,
    },
    {
      label: 'Italique',
      syntax: '*texte*',
      render: <em className="text-gray-200 italic">texte</em>,
    },
    {
      label: 'Barré',
      syntax: '~~texte~~',
      render: <s className="text-gray-500 line-through">texte</s>,
    },
    {
      label: 'Surligné',
      syntax: '==texte==',
      render: <mark className="bg-[#D4AF37]/30 text-[#D4AF37] rounded px-1">texte</mark>,
    },
    {
      label: 'Couleur',
      syntax: '{#D4AF37}texte{/}',
      render: <span style={{ color: '#D4AF37' }}>texte</span>,
    },
    {
      label: 'Taille XS',
      syntax: '{+xs}texte{/+}',
      render: <span className="text-[11px]">texte</span>,
    },
    {
      label: 'Taille SM',
      syntax: '{+sm}texte{/+}',
      render: <span className="text-sm">texte</span>,
    },
    {
      label: 'Taille LG',
      syntax: '{+lg}texte{/+}',
      render: <span className="text-lg">texte</span>,
    },
    {
      label: 'Taille XL',
      syntax: '{+xl}texte{/+}',
      render: <span className="text-xl font-bold">texte</span>,
    },
    {
      label: 'Taille 2XL',
      syntax: '{+2xl}texte{/+}',
      render: <span className="text-2xl font-bold">texte</span>,
    },
    {
      label: 'Taille 3XL',
      syntax: '{+3xl}texte{/+}',
      render: <span className="text-3xl font-bold">texte</span>,
    },
    {
      label: 'Lien',
      syntax: '[texte](https://url.com)',
      render: <a href="#" className="text-[#D4AF37] underline">texte</a>,
    },
    {
      label: 'Code inline',
      syntax: '`code`',
      render: <code className="bg-white/10 text-gray-300 px-1.5 py-0.5 rounded text-[13px] font-mono">code</code>,
    },
    {
      label: 'Image',
      syntax: '![légende](https://url.png)',
      render: <span className="text-gray-400 text-xs">→ image avec légende</span>,
    },
    {
      label: 'Titre H2',
      syntax: '## Titre',
      render: <span className="text-white font-bold text-lg">Titre</span>,
    },
    {
      label: 'Titre H3',
      syntax: '# Sous-titre',
      render: <span className="text-[#D4AF37] font-bold">Sous-titre</span>,
    },
    {
      label: 'Citation',
      syntax: '> Texte citation',
      render: <span className="text-gray-400 italic border-l-2 border-[#D4AF37] pl-2">Texte citation</span>,
    },
    {
      label: 'Liste à puces',
      syntax: '- Élément',
      render: <span className="text-gray-400">• Élément</span>,
    },
    {
      label: 'Ligne horizontale',
      syntax: '---',
      render: <span className="text-gray-600">─── ✦ ───</span>,
    },
  ];

  const colors = [
    { name: 'Or', value: '#D4AF37' },
    { name: 'Rouge', value: '#EF4444' },
    { name: 'Bleu', value: '#3B82F6' },
    { name: 'Vert', value: '#22C55E' },
    { name: 'Violet', value: '#A855F7' },
    { name: 'Rose', value: '#EC4899' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Blanc', value: '#FFFFFF' },
    { name: 'Gris', value: '#9CA3AF' },
  ];

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-[#1a1a1a] hover:bg-[#1f1f1f] transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={14} className="text-[#D4AF37]" />
          <span className="text-xs font-bold text-gray-300">Guide de formatage</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="p-4 bg-[#0f0f0f] space-y-4">
          {/* Formats */}
          <div className="space-y-2">
            {formats.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0"
              >
                <span className="text-[10px] text-gray-600 w-20 flex-shrink-0 font-mono">
                  {f.label}
                </span>
                <code className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded flex-shrink-0 font-mono min-w-[180px]">
                  {f.syntax}
                </code>
                <span className="text-sm flex-1">{f.render}</span>
              </div>
            ))}
          </div>

          {/* Palette de couleurs */}
          <div>
            <p className="text-[10px] text-gray-600 font-mono mb-2">Couleurs disponibles :</p>
            <div className="flex flex-wrap gap-2">
              {colors.map(c => (
                <button
                  key={c.value}
                  onClick={() => {
                    navigator.clipboard.writeText(`{#${c.value}}{/}`);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded hover:bg-white/10 transition-colors"
                  title={`Copier {#${c.value}}...`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.value }}
                  />
                  <span className="text-[9px] text-gray-400 font-mono">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Astuce */}
          <div className="p-3 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-lg">
            <p className="text-[10px] text-[#D4AF37] font-bold mb-1">💡 Astuce</p>
            <p className="text-[10px] text-gray-400">
              Tu peux combiner les formats : <code className="text-[#D4AF37]">**{`{#D4AF37}texte{/}`}</code>** → <strong style={{ color: '#D4AF37' }}>texte</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}