"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ContactSection } from "@/components/features/ContactSection";

interface ContactPageClientProps {
  parfum?: string;
  marque?: string;
}

export const ContactPageClient = ({ parfum = "", marque = "" }: ContactPageClientProps) => {
  return (
    <div className="nurea-vitrine-shell grain flex flex-col bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <Navbar />
      <ContactSection parfum={parfum} marque={marque} />
      <Footer />
    </div>
  );
};
