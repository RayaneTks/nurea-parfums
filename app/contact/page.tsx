import type { Metadata } from "next";
import { ContactPageClient } from "@/components/contact/ContactPageClient";

export const metadata: Metadata = {
  title: "Conciergerie Privée",
  description:
    "Contactez la conciergerie Nuréa Parfums par WhatsApp, Snapchat ou e-mail pour toute acquisition, recommandation ou renseignement.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}

