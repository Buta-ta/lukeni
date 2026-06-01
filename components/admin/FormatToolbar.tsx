"use client";

import React from 'react';
import { Bold, Italic, Strikethrough, Highlighter, Link, Code, Image, Minus } from 'lucide-react';

interface FormatToolbarProps {
  fieldId: string;
  value: string;
  onChange: (val: string) => void;
  catColor?: string;
  minimal?: boolean; // mode réduit pour titres/résumés
}

export default function FormatToolbar({
  fieldId,
  value,
  onChange,
  catColor = '#D4AF37',
  minimal = false,
}: FormatToolbarProps) {

  const getField = (): HTMLInputElement | HTMLTextAreaElement | null => {
    return document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement | null;
  };

  const wrap = (before: string, after: string, placeholder: string) => {
    const field = getField();
    if (!field) return;
    const start = field.selectionStart ?? 0;
    const end = field.selectionEnd ?? 0;
    const selected = value.slice(start, end) || placeholder;
    const newVal = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      field.focus();
      field.setSelectionRange(
        start + before.length,
        start + before.length + selected.length
      );
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const field = getField();
    if (!field) return;
    const start = field.selectionStart ?? 0;
    const newVal = value.slice(0, start) + text + value.slice(start);
    onChange(newVal);
    setTimeout(() => {
      field.focus();
      field.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const insertLinePrefix = (prefix: string, placeholder: string) => {
    const field = getField();
    if (!field) return;
    const start = field.selectionStart ?? 0;
    const end = field.selectionEnd ?? 0;
    const selected = value.slice(start, end) || placeholder;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newVal =
      value.slice(0, lineStart) +
      prefix +
      value.slice(lineStart, start) +
      selected +
      value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      field.focus();
      const newStart = lineStart + prefix.length + (start - lineStart);
      field.setSelectionRange(newStart, newStart + selected.length);
    }, 0);
  };

  const colors = [
    { name: 'Or',     value: '#D4AF37' },
    { name: 'Rouge',  value: '#EF4444' },
    { name: 'Bleu',   value: '#3B82F6' },
    { name: 'Vert',   value: '#22C55E' },
    { name: 'Violet', value: '#A855F7' },
    { name: 'Rose',   value: '#EC4899' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Cyan',   value: '#06B6D4' },
  ];

  const sizes = ['xs', 'sm', 'lg', 'xl', '2xl', '3xl'];

  const BTN =
    'px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors flex items-center gap-1 font-mono select-none';
  const SEP = <div className="w-px h-4 bg-white/10 self-center" />;

  return (
    <div className="flex flex-wrap gap-1.5 p-2 bg-[#111] border border-white/10 rounded-t-lg border-b-0">

      {/* ── Formatage texte ── */}
      <button type="button" onClick={() => wrap('**', '**', 'gras')} className={BTN} title="Gras **texte**">
        <Bold size={10} />
      </button>
      <button type="button" onClick={() => wrap('*', '*', 'italique')} className={BTN} title="Italique *texte*">
        <Italic size={10} />
      </button>
      <button type="button" onClick={() => wrap('~~', '~~', 'barré')} className={BTN} title="Barré ~~texte~~">
        <Strikethrough size={10} />
      </button>
      <button type="button" onClick={() => wrap('==', '==', 'surligné')} className={BTN} title="Surligné ==texte==">
        <Highlighter size={10} />
      </button>
      <button type="button" onClick={() => wrap('`', '`', 'code')} className={BTN} title="Code `texte`">
        <Code size={10} />
      </button>

      {SEP}

      {/* ── Couleurs ── */}
      <span className="text-[9px] text-gray-600 font-mono self-center">Couleur:</span>
      {colors.map(c => (
        <button
          key={c.value}
          type="button"
          onClick={() => wrap(`{#${c.value}}`, '{/}', 'texte')}
          className="w-4 h-4 rounded-full hover:scale-125 transition-transform border border-white/20 self-center"
          style={{ backgroundColor: c.value }}
          title={`${c.name} → {#${c.value}}texte{/}`}
        />
      ))}

      {SEP}

      {/* ── Tailles ── */}
      <span className="text-[9px] text-gray-600 font-mono self-center">Taille:</span>
      {sizes.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => wrap(`{+${s}}`, '{/+}', 'texte')}
          className={BTN}
          title={`Taille ${s}`}
        >
          {s}
        </button>
      ))}

      {/* ── Extras (seulement si pas minimal) ── */}
      {!minimal && (
        <>
          {SEP}

          <button
            type="button"
            onClick={() => insertLinePrefix('## ', 'Titre principal')}
            className={BTN} title="Titre H2 ## texte"
          >H2</button>
          <button
            type="button"
            onClick={() => insertLinePrefix('# ', 'Sous-titre')}
            className={BTN} title="Titre H3 # texte"
          >H3</button>
          <button
            type="button"
            onClick={() => insertLinePrefix('> ', 'Citation')}
            className={BTN} title="Citation > texte"
          >❝</button>
          <button
            type="button"
            onClick={() => insertLinePrefix('- ', 'Élément')}
            className={BTN} title="Liste - texte"
          >•—</button>
          <button
            type="button"
            onClick={() => insertAtCursor('\n---\n')}
            className={BTN} title="Séparateur ---"
          >
            <Minus size={10} />
          </button>

          {SEP}

          <button
            type="button"
            onClick={() => {
              const field = getField();
              const selected = field ? value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0) : '';
              wrap('[', '](https://)', selected || 'texte du lien');
            }}
            className={BTN} title="Lien [texte](url)"
          >
            <Link size={10} /> URL
          </button>
          <button
            type="button"
            onClick={() => {
              const field = getField();
              const selected = field ? value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0) : '';
              wrap('![', '](https://)', selected || 'légende');
            }}
            className={BTN} title="Image ![légende](url)"
          >
            <Image size={10} /> IMG
          </button>
        </>
      )}
    </div>
  );
}