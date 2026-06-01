// lib/lingua.ts

/**
 * 🌐 AUTO-TRADUCTION & CORRECTION via API Route serveur
 * Évite les problèmes CORS en passant par le serveur Next.js
 */

interface LinguaResponse {
  result?: string;
  error?: string;
}

export async function autoTranslate(
  text: string, 
  sourceLang: 'fr' | 'en'
): Promise<string> {
  if (!text || text.trim().length === 0) return '';
  
  try {
    const response = await fetch('/api/lingua', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'translate', text, lang: sourceLang }),
    });

    const data: LinguaResponse = await response.json();

    if (data.error || !data.result) {
      console.error('Translation error:', data.error);
      return text;
    }

    return data.result;
  } catch (error) {
    console.error('Translation API error:', error);
    return text;
  }
}

export async function autoCorrect(
  text: string, 
  lang: 'fr' | 'en'
): Promise<string> {
  if (!text || text.trim().length === 0) return '';
  
  try {
    const response = await fetch('/api/lingua', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'correct', text, lang }),
    });

    const data: LinguaResponse = await response.json();

    if (data.error || !data.result) {
      console.error('Correction error:', data.error);
      return text;
    }

    return data.result;
  } catch (error) {
    console.error('Correction API error:', error);
    return text;
  }
}