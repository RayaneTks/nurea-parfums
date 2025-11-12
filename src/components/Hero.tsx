import { Button } from "./ui/button";
import logo from "@/assets/nurea-logo-transparent.png";
import bgImage from "@/assets/bg.png";
import { contactConfig } from "@/config/contact";
import { SnapchatIcon } from "./icons/SnapchatIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

export const Hero = () => {
  const scrollToCatalogue = () => {
    const catalogueSection = document.getElementById("catalogue");
    catalogueSection?.scrollIntoView({ behavior: "smooth" });
  };

  const openSnapchat = () => {
    window.open(contactConfig.snapchat.url, "_blank");
  };

  const openWhatsApp = () => {
    window.open(contactConfig.whatsapp.url, "_blank");
  };

  return (
    <section id="hero" className="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden pt-16 md:pt-20">
      {/* Background image with opacity */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-background/40" />
      
      <div className="container max-w-6xl mx-auto text-center relative z-10 py-24 md:py-32">
        <div className="mb-16 flex justify-center">
          <img 
            src={logo} 
            alt="Nuréa Parfums" 
            className="h-28 md:h-40 lg:h-48 w-auto object-contain opacity-90"
          />
        </div>
        
        <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl mb-8 text-foreground tracking-tight leading-[0.9] font-medium">
          Nuréa Parfums
        </h1>
        
        <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground/80 max-w-2xl mx-auto mb-20 leading-relaxed font-light">
          Sélection de parfums de luxe et grands classiques, à portée de main.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
          <Button
            size="lg"
            onClick={scrollToCatalogue}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-base px-10 rounded-none font-light uppercase tracking-wider"
          >
            Découvrir le catalogue
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={openSnapchat}
            className="border-[#FFFC00]/50 text-foreground hover:bg-[#FFFC00]/10 hover:border-[#FFFC00] h-14 text-base px-10 rounded-none font-light uppercase tracking-wider flex items-center gap-2"
          >
            <SnapchatIcon className="h-5 w-5 opacity-90" />
            Snapchat
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={openWhatsApp}
            className="border-[#25D366]/50 text-foreground hover:bg-[#25D366]/10 hover:border-[#25D366] h-14 text-base px-10 rounded-none font-light uppercase tracking-wider flex items-center gap-2"
          >
            <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
            WhatsApp
          </Button>
        </div>
      </div>
    </section>
  );
};
