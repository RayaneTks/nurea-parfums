import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import sharp from "sharp";
import { VITRINE_THEMES } from "@/design/brand";
import { MENTION_FLACONS } from "@/lib/mentions";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Les vignettes de partage de la vitrine (T17) — ce que montrent Snapchat, WhatsApp et iMessage
 * quand un lien circule, souvent le premier contact avec Nuréa.
 *
 * Deux rendus, une seule main :
 *   - le site : la vraie photo du flacon Nuréa (celle de l'accueil, recadrée une fois pour toutes
 *     dans `flacon.jpg`) et le logo complet, ivoire et doré, posé sur le mur sombre ;
 *   - une fiche : le visuel du parfum ENTIER (jamais recadré, § B.4) sur sa couleur d'ambiance,
 *     la marque puis le nom, et la mention des flacons, due sur toute surface qui en montre un.
 *
 * Couleurs : jetons du thème sombre (`brand.ts`) et ambiance dérivée par la même règle que la
 * vitrine (`deriveAmbientHex`) — contraste du texte garanti. Police : Fraunces (titre de la DA).
 * `next/og` ne lit ni le WebP ni `oklch()` : photos en JPEG/PNG, couleurs en hex.
 * Format de sortie : voir `OG_CONTENT_TYPE`.
 */

export const OG_SIZE = { width: 1200, height: 630 };
/**
 * JPEG, pas le PNG de `next/og` : une photo en PNG pèse 600 à 800 Ko, et WhatsApp n'affiche plus
 * l'aperçu au-delà de 300 Ko environ. Le rendu passe donc par `sharp` avant de partir.
 */
export const OG_CONTENT_TYPE = "image/jpeg";

const DOSSIER = join(process.cwd(), "app", "(shop)", "_og");
const DOMAINE = SITE_URL.replace(/^https?:\/\//, "");
const T = VITRINE_THEMES.dark;

/*
 * Lecture disque plutôt que `fetch(new URL(..., import.meta.url))` : le bundler réécrit l'URL en
 * chemin relatif que `fetch` refuse, et la route rend un 500. `process.cwd()` est le motif
 * documenté par Next pour les ressources locales d'une image OG ; il les embarque au déploiement.
 */
async function ressources() {
  const [logotype, flacon, fraunces] = await Promise.all([
    readFile(join(DOSSIER, "logotype.png")),
    readFile(join(DOSSIER, "flacon.jpg")),
    readFile(join(DOSSIER, "Fraunces-Medium.ttf")),
  ]);
  return { logotype: dataUrl(logotype, "image/png"), flacon: dataUrl(flacon, "image/jpeg"), fraunces };
}

function dataUrl(octets: Buffer, type: string) {
  return `data:${type};base64,${octets.toString("base64")}`;
}

async function rendre(contenu: ReactElement, fraunces: Buffer) {
  const png = new ImageResponse(contenu, {
    ...OG_SIZE,
    fonts: [{ name: "Fraunces", data: Uint8Array.from(fraunces).buffer, weight: 500, style: "normal" }],
  });
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  const headers = new Headers(png.headers);
  headers.set("content-type", OG_CONTENT_TYPE);
  return new Response(new Uint8Array(jpeg), { status: png.status, headers });
}

/** Logotype (monogramme + nom) : 1520 × 324, affiché à la largeur demandée. */
function Logotype({ src, largeur }: { src: string; largeur: number }) {
  // `next/og` ne rend que des balises HTML : `next/image` n'y existe pas.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={largeur} height={Math.round((largeur * 324) / 1520)} />;
}

export const OG_ALT_SITE = `${SITE_NAME} — catalogue de parfums, commande sur Snapchat`;

export async function vignetteSite() {
  const { logotype, flacon, fraunces } = await ressources();
  return rendre(
    <div style={{ display: "flex", width: "100%", height: "100%", background: T.bg, fontFamily: "Fraunces" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={flacon} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0 }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px", height: "100%" }}>
        <Logotype src={logotype} largeur={520} />
        <div style={{ marginTop: 40, fontSize: 30, color: T.text1 }}>Catalogue de parfums, commande sur Snapchat</div>
        <div style={{ marginTop: 12, fontSize: 24, color: T.text2 }}>{DOMAINE}</div>
      </div>
    </div>,
    fraunces,
  );
}

export type VignetteParfum = {
  marque: string;
  nom: string;
  /** Visuel 2:3 déjà converti en PNG/JPEG (data URL), ou null s'il n'a pas pu être lu. */
  visuel: string | null;
  /** Fond d'ambiance sombre en hex, ou null (repli sur la surface neutre). */
  ambiance: string | null;
};

export async function vignetteParfum({ marque, nom, visuel, ambiance }: VignetteParfum) {
  const { logotype, fraunces } = await ressources();
  return rendre(
    <div style={{ display: "flex", width: "100%", height: "100%", background: ambiance ?? T.surface1, fontFamily: "Fraunces" }}>
      {visuel && (
        // Le visuel entier, à 2:3 sur toute la hauteur : jamais recadré.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visuel} alt="" width={420} height={630} />
      )}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "56px 64px" }}>
        <Logotype src={logotype} largeur={300} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: T.text2 }}>{marque}</div>
          <div style={{ marginTop: 8, fontSize: nom.length > 24 ? 52 : 64, lineHeight: 1.1, color: T.text1 }}>{nom}</div>
        </div>
        <div style={{ fontSize: 19, lineHeight: 1.45, color: T.text3 }}>{MENTION_FLACONS}</div>
      </div>
    </div>,
    fraunces,
  );
}
