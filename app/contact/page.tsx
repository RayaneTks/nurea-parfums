import type { Metadata } from "next";
import { ContactPageClient } from "@/components/contact/ContactPageClient";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez Nurea Parfums par e-mail, WhatsApp ou Snapchat pour toute question, recommandation ou disponibilité.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}

