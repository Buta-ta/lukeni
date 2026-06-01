// /app/api/lingua/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { action, text, lang } = await req.json();

    if (!text || !action || !lang) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Traduction Google Translate
    if (action === 'translate') {
      const targetLang = lang === 'fr' ? 'en' : 'fr';
      const chunks = text.match(/[\s\S]{1,4000}/g) || [text];
      let translatedText = '';

      for (const chunk of chunks) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${lang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data[0]) {
          for (const part of data[0]) {
            if (part[0]) translatedText += part[0];
          }
        } else {
          translatedText += chunk;
        }
      }

      return NextResponse.json({ result: translatedText });
    }

    // Correction LanguageTool
    if (action === 'correct') {
      const url = 'https://api.languagetool.org/v2/check';
      const formData = new URLSearchParams();
      formData.append('text', text);
      formData.append('language', lang === 'fr' ? 'fr' : 'en-US');

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      const data = await response.json();

      if (!data.matches || data.matches.length === 0) {
        return NextResponse.json({ result: text });
      }

      let correctedText = text;
      const matches = data.matches.sort((a: any, b: any) => b.offset - a.offset);

      for (const match of matches) {
        if (match.replacements && match.replacements.length > 0) {
          const replacement = match.replacements[0].value;
          const start = match.offset;
          const end = start + match.length;
          correctedText = correctedText.substring(0, start) + replacement + correctedText.substring(end);
        }
      }

      return NextResponse.json({ result: correctedText });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Lingua API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}