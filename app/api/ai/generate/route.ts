// app/api/ai/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { 
      prompt, 
      provider = 'gemini', 
      model, 
      customApiKey 
    } = await req.json();

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Le prompt est vide.' }, { status: 400 });
    }

    const systemPrompt = `Tu es un rédacteur professionnel de Lukeni, une plateforme d'encyclopédie et d'investigation africaine de haut niveau. 
Rédige un article journalistique approfondi, rigoureux et captivant basé sur le sujet demandé par l'utilisateur. 
L'article doit comporter des analyses objectives, des faits historiques et actuels si possible, et un ton journalistique soigné.

Tu DOIS retourner obligatoirement un objet JSON STRICT ayant exactement la structure suivante :
{
  "title_fr": "Titre percutant en français (sans markdown ni guillemets)",
  "title_en": "Titre percutant en anglais (sans markdown ni guillemets)",
  "summary_fr": "Un court résumé accrocheur en français (1 ou 2 phrases)",
  "summary_en": "Un court résumé accrocheur en anglais (1 ou 2 sentences)",
  "content_fr": "Contenu complet, structuré et détaillé de l'article en français (plusieurs paragraphes avec titres. Tu peux utiliser le formatage markdown suivant : **gras**, *italique*, [lien](url) ou des listes à puces)",
  "content_en": "Contenu complet, structuré et détaillé de l'article en anglais (plusieurs paragraphes avec titres, traduit ou adapté avec soin. Même structure de formatage markdown)",
  "reading_time": 5
}

Remarque de formatage importante : 
- N'inclus aucun texte explicatif en dehors du JSON.
- Évite les guillemets internes non échappés ou les caractères invalides dans les chaînes JSON.
- Retourne uniquement le JSON. Pas de bloc de code comme \`\`\`json ... \`\`\`.`;

    // 1. GESTION DE GOOGLE GEMINI
    if (provider === 'gemini') {
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ 
          error: 'Clé API Gemini non configurée. Veuillez renseigner votre clé API Gemini dans l\'onglet de configuration de l\'Assistant.' 
        }, { status: 400 });
      }

      const geminiModel = model || 'gemini-3.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\nSujet demandé : ${prompt}` }]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        return NextResponse.json({ error: `Erreur Gemini : ${errorText}` }, { status: response.status });
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        return NextResponse.json({ error: 'La réponse de Gemini est vide.' }, { status: 500 });
      }

      try {
        const parsed = JSON.parse(rawText.trim());
        return NextResponse.json({ result: parsed });
      } catch (e) {
        const cleaned = cleanJsonString(rawText);
        try {
          const parsed = JSON.parse(cleaned);
          return NextResponse.json({ result: parsed });
        } catch (e2) {
          return NextResponse.json({ error: 'Erreur de parsing du JSON retourné par Gemini.', rawText }, { status: 500 });
        }
      }
    }

    // 2. GESTION DE NVIDIA (OPENAI COMPATIBLE)
    if (provider === 'nvidia') {
      const apiKey = customApiKey || process.env.NVIDIA_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ 
          error: 'Clé API NVIDIA non configurée. Veuillez renseigner votre clé API NVIDIA dans l\'onglet de configuration de l\'Assistant.' 
        }, { status: 400 });
      }

      const nvidiaModel = model || 'meta/llama-3.1-70b-instruct';
      const url = 'https://integrate.api.nvidia.com/v1/chat/completions';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: nvidiaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('NVIDIA API error:', errorText);
        return NextResponse.json({ error: `Erreur NVIDIA : ${errorText}` }, { status: response.status });
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;

      if (!rawText) {
        return NextResponse.json({ error: 'La réponse de NVIDIA est vide.' }, { status: 500 });
      }

      try {
        const parsed = JSON.parse(rawText.trim());
        return NextResponse.json({ result: parsed });
      } catch (e) {
        const cleaned = cleanJsonString(rawText);
        try {
          const parsed = JSON.parse(cleaned);
          return NextResponse.json({ result: parsed });
        } catch (e2) {
          return NextResponse.json({ error: 'Erreur de parsing du JSON retourné par NVIDIA.', rawText }, { status: 500 });
        }
      }
    }

    // 3. GESTION DE OPENROUTER (OPENAI COMPATIBLE)
    if (provider === 'openrouter') {
      const apiKey = customApiKey || process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ 
          error: 'Clé API OpenRouter non configurée. Veuillez renseigner votre clé API OpenRouter dans l\'onglet de configuration de l\'Assistant.' 
        }, { status: 400 });
      }

      const openrouterModel = model || 'meta-llama/llama-3.1-8b-instruct:free';
      const url = 'https://openrouter.ai/api/v1/chat/completions';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://lukeni.vercel.app', // Obligatoire ou recommandé pour OpenRouter
          'X-Title': 'Lukeni Platform'
        },
        body: JSON.stringify({
          model: openrouterModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error:', errorText);
        return NextResponse.json({ error: `Erreur OpenRouter : ${errorText}` }, { status: response.status });
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;

      if (!rawText) {
        return NextResponse.json({ error: 'La réponse de OpenRouter est vide.' }, { status: 500 });
      }

      try {
        const parsed = JSON.parse(rawText.trim());
        return NextResponse.json({ result: parsed });
      } catch (e) {
        const cleaned = cleanJsonString(rawText);
        try {
          const parsed = JSON.parse(cleaned);
          return NextResponse.json({ result: parsed });
        } catch (e2) {
          return NextResponse.json({ error: 'Erreur de parsing du JSON retourné par OpenRouter.', rawText }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ error: 'Fournisseur d\'IA non pris en charge.' }, { status: 400 });
  } catch (error: any) {
    console.error('AI Generate API error:', error);
    return NextResponse.json({ error: `Erreur interne du serveur : ${error.message}` }, { status: 500 });
  }
}

function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}
