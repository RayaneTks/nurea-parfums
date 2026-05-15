import type { Metadata } from "next";
import { ContactPageClient } from "@/components/contact/ContactPageClient";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact & Commande",
  description: `Contactez ${SITE_NAME} pour passer commande ou obtenir un conseil. Stock disponible immédiatement, réponse rapide sur Snapchat et WhatsApp.`,
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: `Contact & Commande — ${SITE_NAME}`,
    description: `Une question sur un parfum ? Contactez-nous sur Snapchat ou WhatsApp pour commander.`,
    url: `${SITE_URL}/contact`,
    type: "website",
  },
};

interface ContactPageProps {
  searchParams: Promise<{ parfum?: string; marque?: string }>;
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const parfum = params.parfum ?? "";
  const marque = params.marque ?? "";

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "Contact", path: "/contact" },
        ]}
      />
      <ContactPageClient parfum={parfum} marque={marque} />
    </>
  );
}
