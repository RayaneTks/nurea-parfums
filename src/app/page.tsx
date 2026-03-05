import type { Metadata } from "next";
import { HomeClient } from "@/components/home/HomeClient";

export const metadata: Metadata = {
  title: "Nurea Parfums | Catalogue premium de parfums",
  description:
    "Nurea Parfums propose un catalogue premium de parfums avec navigation intuitive par marque et catégorie, optimisée mobile-first.",
};

export default function HomePage() {
  return <HomeClient />;
}

