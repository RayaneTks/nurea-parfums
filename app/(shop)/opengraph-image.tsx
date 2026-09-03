import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_COLORS, SCREEN_TINTS } from "@/design/brand";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Node plutôt qu'edge : la vignette embarque le logotype et une police, soit
 * ~250 Ko d'octets. L'image est mise en cache par Vercel et par les robots des
 * messageries — elle n'est calculée qu'une fois, la latence d'un démarrage à
 * froid n'a aucune importance ici, et on gagne de la marge sur le poids.
 */
export const runtime = "nodejs";

export const alt = `${SITE_NAME} — catalogue de parfums de grandes marques, Marseille`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const domain = SITE_URL.replace(/^https?:\/\//, "");

/**
 * Vignette de partage — ce que voient iMessage, WhatsApp et Snapchat.
 *
 * La version précédente composait le nom en Georgia sur fond noir, sans le
 * moindre élément de marque. Le résultat était juste : du texte. Or cette
 * image est souvent le PREMIER contact avec la maison — le lien se partage en
 * message privé bien avant qu'on visite le site — et une vignette sans logo
 * fait douter du sérieux de la boutique.
 *
 * Deux décisions portent le reste :
 *
 *   LE LOGOTYPE PLUTÔT QUE DU TEXTE. Le monogramme et le mot « NURÉA » sont
 *   dessinés, pas composés : les reconstituer avec une police approchante
 *   donnait un faux. On embarque donc l'image réelle, réduite à 1520 px de
 *   large (59 Ko) — deux fois sa taille d'affichage, pour rester net sur les
 *   écrans à haute densité.
 *
 *   LA POLICE DE LA CHARTE POUR LE RESTE. Instrument Sans porte les deux
 *   lignes de texte. Sans elle, `next/og` compose en Noto Sans, une neutre
 *   correcte mais étrangère à la marque — le détail se voit quand la vignette
 *   arrive à côté du logotype, qui lui est juste.
 *
 * Composition : cadre au filet 1 px, logotype centré, filet court, ligne de
 * positionnement, domaine. Angles vifs et aucune ombre, comme partout
 * ailleurs — voir DESIGN.md § 02.
 */
export default async function OpenGraphImage() {
  /*
   * Lecture disque plutot que `fetch(new URL(..., import.meta.url))`.
   *
   * Ce second motif circule beaucoup, mais il ne marche pas ici : le bundler
   * reecrit l'URL en chemin statique relatif — « /_next/static/media/… » — que
   * `fetch` refuse faute d'origine, et la route rend un 500. La lecture par
   * `process.cwd()` est le motif documente par Next pour les ressources
   * locales d'une image OG, et Next la suit pour embarquer les fichiers dans
   * la fonction deployee.
   */
  const dossier = join(process.cwd(), "app", "(shop)", "_og");
  const [logotype, sans] = await Promise.all([
    readFile(join(dossier, "logotype.png")),
    readFile(join(dossier, "InstrumentSans-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          padding: 40,
          background: BRAND_COLORS.noir,
          fontFamily: "Instrument Sans",
        }}
      >
        {/* Cadre au filet 1 px — la charte sépare au filet, jamais à l'ombre. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            border: `1px solid ${BRAND_COLORS.cuivre}2E`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={Uint8Array.from(logotype).buffer as unknown as string}
            alt=""
            width={720}
            height={153}
            style={{ objectFit: "contain" }}
          />

          <div
            style={{
              height: 1,
              width: 108,
              marginTop: 54,
              background: `${BRAND_COLORS.cuivre}7A`,
            }}
          />

          <div
            style={{
              marginTop: 34,
              fontSize: 23,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: SCREEN_TINTS.dark.texte3,
            }}
          >
            Sélection de grandes marques
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 27,
              letterSpacing: "0.04em",
              color: BRAND_COLORS.cuivre,
            }}
          >
            {/* Une seule chaine : deux noeuds enfants obligeraient a poser un
                display:flex sur ce div, que le moteur exige des qu'il y en a
                plus d'un. */}
            {`${domain} · Marseille`}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Instrument Sans",
          data: Uint8Array.from(sans).buffer,
          weight: 500,
          style: "normal",
        },
      ],
    },
  );
}
