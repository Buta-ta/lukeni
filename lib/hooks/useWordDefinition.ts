// lib/hooks/useWordDefinition.ts
'use client';

import { useState, useCallback, useRef } from 'react';
import { DictionaryResult } from '@/lib/types/external-apis';

const cache = new Map<string, DictionaryResult | null>();

function cleanWikiText(text: string): string {
  return text
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2 || $1')
    .replace(/'''([^']+)'''/g, '$1')
    .replace(/''([^']+)''/g, '$1')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\\[^\s\\]+\\/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim();
}

async function fetchFromWiktionaryFR(word: string): Promise<DictionaryResult | null> {
  try {
    const res = await fetch(
      `https://fr.wiktionary.org/w/api.php?` +
      new URLSearchParams({
        action: 'query',
        titles: word,
        prop: 'extracts',
        explaintext: 'true',
        format: 'json',
        origin: '*',
      }),
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) return null;
    const data = await res.json();

    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0] as any;

    if (!page || !page.extract) return null;

    const extract = page.extract as string;
    console.log('WIKTIONNAIRE RAW:', extract); // Debug

    // ✅ CHERCHE LES DÉFINITIONS (lignes qui contiennent un # ou commencent après Nom/Verbe)
    const lines = extract.split('\n');
    const definitions: string[] = [];

    let inDefinitionSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Détecte le début d'une section de définition
      if (trimmed.match(/^===\s*(Nom|Verbe|Adjectif|Adverbe|Préposition|Conjonction|Interjection|Particule)/i)) {
        inDefinitionSection = true;
        continue;
      }

      // Si on rencontre une autre section, sort
      if (trimmed.match(/^===\s*([^=]+)/) || trimmed.match(/^==\s*([^=]+)/)) {
        inDefinitionSection = false;
        continue;
      }

      // Si on est dans une section de définitions
      if (inDefinitionSection && trimmed.length > 5) {
        const cleaned = cleanWikiText(trimmed);
        if (
          cleaned.length > 5 &&
          !cleaned.includes('Voir aussi') &&
          !cleaned.includes('Références') &&
          !cleaned.includes('Synonymes') &&
          !cleaned.startsWith('==') &&
          !cleaned.startsWith('{{')
        ) {
          definitions.push(cleaned);
          if (definitions.length >= 3) break;
        }
      }
    }

    if (definitions.length > 0) {
      return {
        word,
        phonetic: '',
        phonetics: [],
        meanings: [
          {
            partOfSpeech: 'nom',
            definitions: definitions.map((def) => ({
              definition: def,
              example: undefined,
            })),
            synonyms: [],
          },
        ],
        _source: 'wiktionary-fr',
      } as any;
    }

    // ✅ FALLBACK : Prend toutes les lignes qui ne sont pas des titres
    const nonTitleLines = lines
      .filter((line) => {
        const trimmed = line.trim();
        return (
          trimmed.length > 10 &&
          !trimmed.startsWith('==') &&
          !trimmed.startsWith('{{') &&
          !trimmed.startsWith('[') &&
          !trimmed.match(/^Français/i) &&
          !trimmed.match(/^English/i)
        );
      })
      .map((line) => cleanWikiText(line))
      .filter((def) => def.length > 10);

    if (nonTitleLines.length > 0) {
      return {
        word,
        phonetic: '',
        phonetics: [],
        meanings: [
          {
            partOfSpeech: 'nom',
            definitions: nonTitleLines.slice(0, 3).map((def) => ({
              definition: def,
              example: undefined,
            })),
            synonyms: [],
          },
        ],
        _source: 'wiktionary-fr',
      } as any;
    }

    return null;
  } catch (err) {
    console.error('Wiktionary FR error:', err);
    return null;
  }
}

async function fetchFromFreeDict(word: string): Promise<DictionaryResult | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0];
  } catch (err) {
    console.error('Free Dictionary error:', err);
    return null;
  }
}

export function useWordDefinition(lang: 'fr' | 'en' = 'en') {
  const [definition, setDefinition] = useState<DictionaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const lookupWord = useCallback(
    async (word: string) => {
      const clean = word.trim().toLowerCase();
      if (!clean || clean.length < 2) return;

      setCurrentWord(word);
      setIsOpen(true);
      setDefinition(null);

      if (cache.has(clean)) {
        setDefinition(cache.get(clean) ?? null);
        return;
      }

      setIsLoading(true);

      try {
        let result: DictionaryResult | null = null;

        if (lang === 'fr') {
          result = await fetchFromWiktionaryFR(clean);
        } else {
          result = await fetchFromFreeDict(clean);
        }

        cache.set(clean, result);
        setDefinition(result);
      } catch (err) {
        console.error('Lookup error:', err);
        cache.set(clean, null);
        setDefinition(null);
      } finally {
        setIsLoading(false);
      }
    },
    [lang]
  );

  const closePopover = useCallback(() => {
    setIsOpen(false);
    setDefinition(null);
    setCurrentWord('');
  }, []);

  return {
    definition,
    isLoading,
    isOpen,
    currentWord,
    lookupWord,
    closePopover,
  };
}