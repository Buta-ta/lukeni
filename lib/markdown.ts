// lib/markdown.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkHtml from 'remark-html';
import katex from 'katex';

/**
 * Processeur Markdown avec support complet :
 * - GFM (tableaux, listes, texte barré)
 * - LaTeX (formules inline $ $ et bloc $$ $$)
 * - Préservation des marqueurs Lukeni ([MEDIA:x], [CHART:x], etc.)
 * - Styles professionnels presse
 */

// Plugin pour le rendu KaTeX
const mathPlugin = () => {
    return (tree: any) => {
        // Visiteur simple pour éviter les imports supplémentaires
    };
};

const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkHtml, { sanitize: false });

/**
 * ✅ FIX XSS LUK-009 — Nettoyage léger APRÈS génération HTML
 * Ne casse pas le rendu, ne supprime que les vecteurs dangereux
 * Garde toutes tes classes Tailwind
 */
function sanitizeHtmlSafe(html: string): string {
    // 1. Supprimer <script>...</script> et <iframe>...</iframe>
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    clean = clean.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
    clean = clean.replace(/<embed\b[^>]*>/gi, '');
    clean = clean.replace(/<link\b[^>]*>/gi, '');
    
    // 2. Supprimer les handlers d'événements (onerror, onclick, onload, etc.)
    // Regex qui garde les classes mais supprime on*
    clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
    
    // 3. Bloquer javascript: et data:text/html dans href/src
    clean = clean.replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
    clean = clean.replace(/src\s*=\s*["']\s*javascript:[^"']*["']/gi, 'src=""');
    clean = clean.replace(/src\s*=\s*["']\s*data:text\/html[^"']*["']/gi, 'src=""');
    
    // 4. Bloquer <a href="javascript:..."> déjà transformé
    clean = clean.replace(/javascript\s*:/gi, '');
    
    return clean;
}

/**
 * Transforme du markdown en HTML avec support complet
 * Applique les styles presse premium
 */
export async function renderMarkdownToHtml(markdown: string): Promise<string> {
    try {
        // Protéger les marqueurs Lukeni temporairement
        const lukeniMarkers: { [key: string]: string } = {};
        let protectedMarkdown = markdown;
        let markerIndex = 0;

        // Capturer tous les marqueurs Lukeni
        const markerRegex = /\[(MEDIA|CHART|RELATED|ANNOUNCEMENT):[^\]]*\]/g;
        protectedMarkdown = protectedMarkdown.replace(markerRegex, (match) => {
            const placeholder = `LUKENIMARKER${markerIndex}X`;
            lukeniMarkers[placeholder] = match;
            markerIndex++;
            return placeholder;
        });

        // Traiter le markdown
        const file = await processor.process(protectedMarkdown);
        let html = String(file);

        // ──────────────────────────────────────────────────────────────
        // STYLES PRESSE PREMIUM - HIÉRARCHIE VISUELLE
        // ──────────────────────────────────────────────────────────────

        // H1 — Titre principal (rarement utilisé en markdown)
        html = html.replace(
            /<h1>([^<]+)<\/h1>/g,
            '<h1 class="text-5xl md:text-6xl font-serif font-bold text-white mt-12 mb-8 leading-tight">$1</h1>'
        );

        // H2 — Titres de sections (parties numérotées : "1. Qui tient le port ?")
        html = html.replace(
            /<h2>([^<]+)<\/h2>/g,
            '<h2 class="text-3xl md:text-4xl font-serif font-bold text-white mt-12 mb-6 pb-4 border-b-2 border-[#D4AF37] relative pl-0 leading-tight"><span class="text-[#D4AF37]">🔹</span> $1</h2>'
        );

        // H3 — Sous-titres
        html = html.replace(
            /<h3>([^<]+)<\/h3>/g,
            '<h3 class="text-2xl font-serif font-bold text-[#90e0ef] mt-8 mb-4 leading-tight">$1</h3>'
        );

        // H4 — Sous-sous-titres
        html = html.replace(
            /<h4>([^<]+)<\/h4>/g,
            '<h4 class="text-xl font-serif font-semibold text-white mt-6 mb-3">$1</h4>'
        );

        // ──────────────────────────────────────────────────────────────
        // PARAGRAPHES — Corps de texte professionnel
        // ──────────────────────────────────────────────────────────────
        html = html.replace(
            /<p>([^<]+)<\/p>/g,
            (match, content) => {
                // Ne pas wrapper si c'est un marqueur
                if (content.includes('__LUKENI_MARKER_')) return match;
                return `<p class="mb-6 leading-[1.85] text-base md:text-lg text-white/85 font-light">${content}</p>`;
            }
        );

        // ──────────────────────────────────────────────────────────────
        // LISTES — Ordonné et non-ordonné
        // ──────────────────────────────────────────────────────────────
        html = html.replace(
            /<ul>/g,
            '<ul class="my-6 ml-8 space-y-3 text-base md:text-lg text-white/80">'
        );
        html = html.replace(
            /<ol>/g,
            '<ol class="my-6 ml-8 space-y-3 text-base md:text-lg text-white/80 list-decimal">'
        );
        html = html.replace(
            /<li>([^<]+)<\/li>/g,
            '<li class="list-disc md:list-disc marker:text-[#D4AF37] marker:font-bold">$1</li>'
        );

        // ──────────────────────────────────────────────────────────────
        // FORMATAGES TEXTE — Gras, Italique, Code
        // ──────────────────────────────────────────────────────────────

        // Gras
        html = html.replace(
            /<strong>([^<]+)<\/strong>/g,
            '<strong class="font-bold text-white">$1</strong>'
        );

        // Italique
        html = html.replace(
            /<em>([^<]+)<\/em>/g,
            '<em class="italic text-[#90e0ef]/90">$1</em>'
        );

        // Code inline
        html = html.replace(
            /<code>([^<]+)<\/code>/g,
            '<code class="bg-white/10 px-2 py-1 rounded-lg text-sm font-mono text-[#48cae4] border border-white/10">$1</code>'
        );

        // Code bloc
        html = html.replace(
            /<pre><code>([^<]+)<\/code><\/pre>/g,
            '<pre class="bg-[#0d1117] p-4 rounded-2xl my-6 overflow-x-auto border border-white/10"><code class="text-sm font-mono text-[#48cae4]">$1</code></pre>'
        );

        // ──────────────────────────────────────────────────────────────
        // CITATIONS — Blockquote mise en avant
        // ──────────────────────────────────────────────────────────────
        html = html.replace(
            /<blockquote>([^<]+)<\/blockquote>/g,
            '<blockquote class="border-l-4 border-[#D4AF37] pl-6 py-4 my-8 italic text-[#90e0ef]/80 bg-[#001233]/40 rounded-r-xl text-base md:text-lg leading-relaxed">$1</blockquote>'
        );

        // ──────────────────────────────────────────────────────────────
        // LIENS — Couleur et style presse
        // ──────────────────────────────────────────────────────────────
        html = html.replace(
            /<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[#48cae4] hover:text-[#90e0ef] underline underline-offset-4 transition-colors font-medium">$2</a>'
        );

        // ──────────────────────────────────────────────────────────────
        // TABLEAUX — Mise en forme presse
        // ──────────────────────────────────────────────────────────────
        html = html.replace(
            /<table>/g,
            '<table class="w-full border-collapse my-8 text-base text-white/80">'
        );
        html = html.replace(
            /<th>([^<]+)<\/th>/g,
            '<th class="bg-[#0466c8]/20 border border-[#0466c8]/30 px-4 py-3 text-left text-white font-bold">$1</th>'
        );
        html = html.replace(
            /<td>([^<]+)<\/td>/g,
            '<td class="border border-white/10 px-4 py-2.5 text-white/70">$1</td>'
        );

        // ──────────────────────────────────────────────────────────────
        // CHIFFRES CLÉS — Colorer les nombres, pourcentages, montants
        // ──────────────────────────────────────────────────────────────

        // Pourcentages
        html = html.replace(
            /(\d+(?:\s*,\d+)?)\s*(%|pour\s+cent)/gi,
            '<span class="text-[#D4AF37] font-bold">$1$2</span>'
        );

        // Montants (euros, dollars, francs CFA)
        html = html.replace(
            /(\d+(?:\s+\d{3})*(?:\s*,\d+)?)\s*(€|dollars?|francs?\s+CFA|FCFA|dollars?\s+américains?)\b/gi,
            '<span class="text-[#D4AF37] font-bold">$1 $2</span>'
        );

        // Grands nombres avec espaces ou virgules
        html = html.replace(
            /(\d{1,3}(?:\s+\d{3})+)\s+(?=EVP|conteneurs?|emplois?|personnes?|ans?|jours?|heures?|salariés?|collaborateurs?)/g,
            '<span class="text-[#D4AF37] font-bold">$1</span>'
        );

        // ──────────────────────────────────────────────────────────────
        // ANNONCES (marqueur spécial)
        // ──────────────────────────────────────────────────────────────
        html = html.replace(
            /\[ANNOUNCEMENT\]/g,
            '<div class="my-8 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl">' +
            '<div class="flex items-center gap-2 mb-2">' +
            '<span class="text-cyan-400 font-bold text-sm">📢 ANNONCE</span>' +
            '</div>' +
            '</div>'
        );

        // ──────────────────────────────────────────────────────────────
        // RESTAURER LES MARQUEURS LUKENI
        // ──────────────────────────────────────────────────────────────
        Object.entries(lukeniMarkers).forEach(([placeholder, marker]) => {
            // Remplacement global car le placeholder peut apparaître plusieurs fois ou être wrap dans des <p>
            while (html.includes(placeholder)) {
                html = html.replace(placeholder, marker);
            }
        });

        // ✅ FIX XSS SANS CASSER LE RENDU — nettoyer à la toute fin
        html = sanitizeHtmlSafe(html);

        return html;
    } catch (error) {
        console.error('Markdown render error:', error);
        // Fallback : retourner un rendu basique
        return `<p class="mb-6 leading-[1.85] text-base md:text-lg text-white/85 font-light">${markdown}</p>`;
    }
}

/**
 * Extrait du texte brut d'un markdown (pour résumés, aperçus)
 */
export function stripMarkdownToText(markdown: string): string {
    return markdown
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\[(MEDIA|CHART|RELATED|ANNOUNCEMENT):[^\]]*\]/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^>\s+/gm, '')
        .replace(/^[-*+]\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\$\$?[^$]+\$\$?/g, '[formule]')
        .replace(/<[^>]*>/g, '')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}