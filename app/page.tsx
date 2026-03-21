import type { Metadata } from "next";
import { HomePageClient } from "@/components/home/HomePageClient";

export const metadata: Metadata = {
  title: "Collection — Nurea Parfums",
  description:
    "Explorez notre selection privee de fragrances d'exception. Parfums rares et signatures olfactives disponibles sur commande via WhatsApp.",
};

export default function HomePage() {
  return <HomePageClient />;
}
