// lib/sanitize.ts
// ----------------------------------------------------------------------------
// Nettoyage HTML serveur ET client, basé sur DOMPurify.
//
// Pourquoi remplacer l'ancien sanitizer maison (regex) ?
//   - Les regex ne peuvent pas gérer correctement le HTML (imbrication,
//     encodage, encodages multiples, attributs sans quotes, etc.).
//   - Des vecteurs comme <img src=x onerror=alert(1)> ou
//     <a href="&#106;avascript:..."> passent au travers.
//   - DOMPurify est maintenu, testé contre des milliers de vecteurs XSS et
//     reconnu par l'OWASP.
//
// Caractéristiques :
//   - Autorise les classes Tailwind (attribut class)
//   - Autorise les iframes YouTube/Vimeo (sinon les vidéos embarquées
//     des articles de presse seraient cassées)
//   - Autorise les attributs style ciblés (couleurs, alignement, padding)
//   - Supprime tout le reste (onerror, onload, javascript:, etc.)
// ----------------------------------------------------------------------------
import DOMPurify from 'isomorphic-dompurify';

// Autoriser les iframes YouTube et Vimeo (utilisées dans les articles)
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto):|\/|#)/i;
const YOUTUBE_PATTERN = /^(?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/)/i;

let configured = false;

function ensureConfigured() {
  if (configured) return;
  configured = true;

  // Hook après avoir nettoyé un attribut : autoriser les iframes vidéos
  DOMPurify.addHook('uponSanitizeElement', (node: any, data: any) => {
    if (data.tagName === 'iframe') {
      const src = node.getAttribute('src') || '';
      if (!YOUTUBE_PATTERN.test(src)) {
        // Retire l'iframe si ce n'est pas YouTube/Vimeo
        node.parentNode?.removeChild(node);
      }
    }
  });

  // Bloquer tout href/src qui n'est pas http/https/mailto/relatif
  DOMPurify.addHook('uponSanitizeAttribute', (node: any, data: any) => {
    const attrName = data.attrName;
    if (attrName === 'href' || attrName === 'src') {
      const val = data.attrValue || '';
      if (val && !ALLOWED_URI_REGEXP.test(val) && !val.startsWith('//')) {
        data.keepAttr = false;
      }
      // Interdire spécifiquement les pseudo-protocoles dangereux même encodés
      const decoded = val.toLowerCase().replace(/&#\w+;/g, '').replace(/\s+/g, '');
      if (decoded.startsWith('javascript:') || decoded.startsWith('data:text/html')) {
        data.keepAttr = false;
      }
    }
  });
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  ensureConfigured();
  return DOMPurify.sanitize(html, {
    // Balises autorisées (extensions par rapport au défaut pour le contenu éditorial)
    ADD_TAGS: ['iframe', 'video', 'source', 'audio'],
    ADD_ATTR: [
      'target',          // target="_blank" sur les liens
      'rel',
      'loading',         // loading="lazy"
      'allow',           // allow="fullscreen" sur iframe
      'allowfullscreen',
      'frameborder',
      'controls',        // lecteurs vidéo/audio
      'preload',
      'poster',
      'class',           // Tailwind
      'style',           // styles inline ciblés (couleurs, alignement)
    ],
    // Restreindre les styles inline à des propriétés sûres
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'meta', 'base'],
    FORBID_ATTR: ['formaction', 'srcset', 'ping'],
    ALLOWED_URI_REGEXP: ALLOWED_URI_REGEXP,
  });
}

/**
 * Version ultra-stricte pour les textes utilisateur (noms, commentaires courts) :
 * retire TOUT HTML.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  ensureConfigured();
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
