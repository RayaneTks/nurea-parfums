import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const runtime = "edge";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(145deg, #0A0508 0%, #1a0f14 42%, #0A0508 100%)",
          color: "#F0E6E0",
          fontFamily:
            'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            padding: 48,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 82,
              fontWeight: 400,
              letterSpacing: "0.12em",
              lineHeight: 1.05,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              width: 120,
              height: 1,
              background: "linear-gradient(90deg, transparent, #C46A6A, transparent)",
            }}
          />
          <div
            style={{
              fontSize: 28,
              color: "#C46A6A",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              maxWidth: 720,
              lineHeight: 1.4,
            }}
          >
            {SITE_TAGLINE}
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 18,
              color: "#B89AA8",
              letterSpacing: "0.08em",
            }}
          >
            nureaparfums.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
