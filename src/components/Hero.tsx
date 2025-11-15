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
        
        <h1 className="font-serif text-4xl md:text-6xl lg:text-8xl xl:text-9xl mb-6 md:mb-8 text-foreground tracking-tight leading-[0.9] font-medium px-4">
          Nuréa Parfums
        </h1>
        
        <p className="text-base md:text-lg lg:text-xl xl:text-2xl text-muted-foreground/80 max-w-2xl mx-auto mb-12 md:mb-16 lg:mb-20 leading-relaxed font-light px-4">
          Sélection de parfums de luxe et grands classiques, à portée de main.
        </p>

        {/* Badges de réassurance */}
        <div className="flex flex-wrap gap-3 justify-center mb-12 max-w-3xl mx-auto">
          <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-sm">
            <span className="text-xs uppercase tracking-wider text-primary/90 font-light">Prix cassés</span>
          </div>
          <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-sm">
            <span className="text-xs uppercase tracking-wider text-primary/90 font-light">Qualité premium</span>
          </div>
          <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-sm">
            <span className="text-xs uppercase tracking-wider text-primary/90 font-light">Conseils personnalisés</span>
          </div>
        </div>

        {/* CTA principal */}
        <div className="flex flex-col items-center gap-3 md:gap-4 max-w-2xl mx-auto mb-8 px-4">
          <Button
            size="lg"
            onClick={scrollToCatalogue}
            className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] md:h-14 text-sm md:text-base px-8 md:px-12 rounded-none font-light uppercase tracking-wider shadow-lg w-full md:w-auto"
          >
            Voir le catalogue
          </Button>
          
          {/* CTA secondaires */}
          <div className="flex flex-row gap-3 justify-center w-full md:w-auto">
            <Button
              size="default"
              variant="outline"
              onClick={openSnapchat}
              className="border-[#FFFC00]/50 text-foreground hover:bg-[#FFFC00]/10 hover:border-[#FFFC00] min-h-[44px] md:h-11 text-sm px-4 md:px-6 rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <SnapchatIcon className="h-4 w-4 opacity-90" />
              Snapchat
            </Button>
            <Button
              size="default"
              variant="outline"
              onClick={openWhatsApp}
              className="border-[#25D366]/50 text-foreground hover:bg-[#25D366]/10 hover:border-[#25D366] min-h-[44px] md:h-11 text-sm px-4 md:px-6 rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
              WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
