/**
 * Récupère un champ bilingue en toute sécurité, avec fallback croisé
 * et valeur par défaut garantie (jamais undefined).
 */
export function getLocalizedField(
  lang: "fr" | "en",
  fieldFr: string | undefined | null,
  fieldEn: string | undefined | null,
  fallback: string = ""
): string {
  const value = lang === "fr" ? fieldFr || fieldEn : fieldEn || fieldFr;
  return (value || fallback).toUpperCase();
}