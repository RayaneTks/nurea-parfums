"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ContactSection } from "@/components/features/ContactSection";

export const ContactPageClient = () => {
  return (
    <div className="nurea-vitrine-shell grain flex min-h-screen flex-col bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <Navbar />
      <ContactSection />
      <Footer />
    </div>
  );
};
