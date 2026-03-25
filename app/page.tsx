import type { Metadata } from "next";
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

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const q = typeof sp?.q === "string" ? sp.q : undefined;
  const cat = typeof sp?.cat === "string" ? sp.cat : undefined;
  const sort = typeof sp?.sort === "string" ? sp.sort : undefined;

  return <HomePageClient initialQ={q} initialCat={cat} initialSort={sort} />;
}
