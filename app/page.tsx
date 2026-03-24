import type { Metadata } from "next";
import { Suspense } from "react";
import { HomePageClient } from "@/components/home/HomePageClient";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Collection",
  description: `${SITE_NAME} — catalogue officiel : parfums d'exception, gammes complètes et conciergerie. Recherche « nurea parfums », « nurea parfum » ou ${SITE_URL.replace("https://", "")}.`,
  keywords: [
    "Nurea Parfums catalogue",
    "nurea parfum",
    "nurea parfums",
    "parfums luxe",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `Collection — ${SITE_NAME}`,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    type: "website",
  },
};

function HomeFallback() {
  return (
    <div className="grain min-h-screen bg-[var(--nurea-bg)]" aria-busy="true" />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomePageClient />
    </Suspense>
  );
}
