import { ImageResponse } from "next/og";
import { BRAND_COLORS, SCREEN_TINTS } from "@/design/brand";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const runtime = "edge";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const domain = SITE_URL.replace(/^https?:\/\//, "");

/**
 * Vignette de partage — charte § 02 et § 03.
 *
 * Aplat noir, filet cuivre, aucun dégradé : les mêmes règles que l'écran. Les
 * polices de la charte ne sont pas embarquées ici (chaque fichier alourdirait
 * la fonction *edge*) — la serif système tient le rôle, le reste du système
 * portant l'identité.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: BRAND_COLORS.noir,
          color: BRAND_COLORS.ivoire,
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            fontSize: 20,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: BRAND_COLORS.cuivre,
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          {SITE_TAGLINE}
        </div>

        <div style={{ fontSize: 104, lineHeight: 1.08, marginTop: 32 }}>
          {SITE_NAME}
        </div>

        {/* Charte § 04 — filet 1 px, cuivre à 16 %. */}
        <div
          style={{
            height: 1,
            width: "100%",
            marginTop: 48,
            background: `${BRAND_COLORS.cuivre}29`,
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 32,
            fontSize: 24,
            letterSpacing: "0.06em",
            color: SCREEN_TINTS.dark.texte3,
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          <span>Sélection de parfums · Marseille</span>
          <span style={{ color: BRAND_COLORS.cuivre }}>{domain}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
