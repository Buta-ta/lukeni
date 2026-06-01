'use client';

import { useState, useCallback } from 'react';

interface UseTranslateReturn {
  translatedText: string | null;
  isLoading: boolean;
  error: string | null;
  translate: (text: string, targetLang?: string) => Promise<void>;
}

export function useTranslate(): UseTranslateReturn {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (text: string, targetLang: string = 'fr') => {
    if (!text) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/proxy/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'auto',
          target: targetLang,
        }),
      });

      if (!res.ok) {
        throw new Error('Translation failed');
      }

      const data = await res.json();
      setTranslatedText(data.translatedText);
    } catch (err: any) {
      setError(err?.message || 'Translation error');
      setTranslatedText(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { translatedText, isLoading, error, translate };
}