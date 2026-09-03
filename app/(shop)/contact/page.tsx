import type { Metadata } from "next";
import { ContactSection } from "@/components/features/ContactSection";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { pageOg, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact & commande",
  description: `Contactez ${SITE_NAME} pour passer commande ou obtenir un conseil. Stock disponible immédiatement, réponse rapide sur Snapchat.`,
  alternates: { canonical: "/contact" },
  openGraph: pageOg("/contact"),
};

interface ContactPageProps {
  /** Pré-remplissage venu d'une fiche produit. */
  searchParams: Promise<{ parfum?: string; marque?: string }>;
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const { parfum = "", marque = "" } = await searchParams;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "Contact", path: "/contact" },
        ]}
      />
      <ContactSection parfum={parfum} marque={marque} />
    </>
  );
}
