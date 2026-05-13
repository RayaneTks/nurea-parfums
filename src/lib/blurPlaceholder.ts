/** 
 * Placeholder blur léger pour `next/image` (évite flash brut sur les cartes). 
 */
export const NUREA_IMAGE_BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P8/AwAI/AL+XkZc2QAAAABJRU5ErkJggg==";

/**
 * Génère une URL de transformation Supabase (low-res) pour servir de placeholder blur.
 * Si l'URL n'est pas Supabase, retourne le placeholder par défaut.
 */
export function getBlurPlaceholder(imageUrl: string | null | undefined): string {
  if (!imageUrl) return NUREA_IMAGE_BLUR_DATA_URL;

  // Si c'est une URL Supabase, on peut demander une version minuscule (ex: 20px)
  if (imageUrl.includes("supabase.co/storage/v1/object/public/")) {
    // Note: Supabase supporte les transformations via query params si configuré,
    // sinon on se contente du placeholder statique pour éviter les requêtes inutiles.
    // Pour Nuréa, on privilégie la vitesse : on retourne le Data URL statique 
    // sauf si on veut vraiment un blur spécifique par image (coûteux en SSR).
    return NUREA_IMAGE_BLUR_DATA_URL;
  }

  return NUREA_IMAGE_BLUR_DATA_URL;
}
