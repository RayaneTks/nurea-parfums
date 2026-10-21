/**
 * La vignette de partage de la page, reprise de celle de la vitrine.
 *
 * Sans ce fichier, la page n'annonce AUCUNE `og:image` : la convention de
 * `app/(shop)/opengraph-image.tsx` ne descend pas jusqu'aux segments enfants.
 * Curieusement `twitter:image`, lui, descend — d'où un partage qui marchait sur
 * X et restait muet sur WhatsApp, iMessage et Facebook, qui lisent `og:image`.
 *
 * Une seule image pour tout le site, et c'est délibéré : elle porte le
 * logotype et le positionnement, ce qui vaut pour chaque page. Une vignette par
 * page coûterait un rendu de plus à maintenir pour un gain nul en partage.
 */
export { default, alt, size, contentType } from "../opengraph-image";

/** Lecture disque du logotype et de la police : impose le runtime Node. */
export const runtime = "nodejs";
