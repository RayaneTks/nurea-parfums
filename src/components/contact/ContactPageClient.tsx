"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ContactSection } from "@/components/features/ContactSection";

export const ContactPageClient = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFCF8] text-[#111111] transition-colors duration-700 dark:bg-[#0A0A0A] dark:text-[#FDFCF8] selection:bg-[#111111] selection:text-[#FDFCF8] dark:selection:bg-[#FDFCF8] dark:selection:text-[#0A0A0A]">
      <Navbar scrolled={scrolled} />
      <ContactSection />
      <Footer />
    </div>
  );
};

