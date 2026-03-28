import type { Metadata } from "next";
import { ContactPageClient } from "@/components/contact/ContactPageClient";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact & Conseils",
  description: `Entrez en contact avec la Maison ${SITE_NAME}. Recommandations personnalisées, disponibilités et échanges privés. Site officiel ${SITE_URL.replace("https://", "")}.`,
  keywords: [
    "contact Nuréa Parfums",
    "conseil parfum personnalisé",
    "Nuréa Parfums commande",
  ],
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: `Contact & Conseils — ${SITE_NAME}`,
    description: `Engagez le dialogue avec la maison ${SITE_NAME} (site officiel).`,
    url: `${SITE_URL}/contact`,
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
