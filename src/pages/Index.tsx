import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BestSellers } from "@/components/BestSellers";
import { Catalogue } from "@/components/Catalogue";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowToOrder } from "@/components/HowToOrder";
import { Seo } from "@/components/Seo";
import { WhyNurea } from "@/components/WhyNurea";
import { SITE_NAME, SITE_URL } from "@/lib/catalog";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    const sectionId = (location.state as { scrollToSection?: string } | null)?.scrollToSection;

    const hashSection = location.hash?.replace("#", "");
    const targetSectionId = sectionId || hashSection;

    if (!targetSectionId) return;

    const timer = window.setTimeout(() => {
      const section = document.getElementById(targetSectionId);
      section?.scrollIntoView({ behavior: "smooth" });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [location.state, location.hash]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Parfums de luxe, niche et grands classiques"
        description="Nurea Parfums propose un catalogue premium de parfums avec navigation intuitive par marque et categorie, optimisee mobile-first."
        canonicalPath="/"
        keywords={[
          "parfums luxe",
          "parfums niche",
          "catalogue parfums",
          "parfumerie en ligne",
          "Nurea Parfums",
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
            },
            {
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/catalogue?search={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }}
      />
      <Header />
      <main>
        <Hero />
        <Catalogue />
        <BestSellers />
        <WhyNurea />
        <HowToOrder />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
