import type { Metadata } from "next";
import { ContactPageClient } from "@/components/contact/ContactPageClient";

export const metadata: Metadata = {
  title: "Conciergerie Privee",
  description:
    "Contactez la conciergerie Nurea Parfums par WhatsApp, Snapchat ou e-mail pour toute acquisition, recommandation ou renseignement.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
