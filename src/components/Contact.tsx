import { Button } from "./ui/button";
import { contactConfig } from "@/config/contact";
import { SnapchatIcon } from "./icons/SnapchatIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

export const Contact = () => {
  const openSnapchat = () => {
    window.open(contactConfig.snapchat.url, "_blank");
  };

  const openWhatsApp = () => {
    window.open(contactConfig.whatsapp.url, "_blank");
  };

  return (
    <section id="contact" className="min-h-screen bg-background py-24 md:py-32 border-t border-border/30">
      <div className="container max-w-5xl mx-auto px-4 md:px-6">
        <div className="text-center mb-20">
          <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl text-foreground tracking-tight mb-8">
            Contactez-nous
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed font-light">
            Nous répondons rapidement à vos demandes concernant la disponibilité, 
            les nouveautés et les recommandations personnalisées.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="border border-border/50 bg-card/20 backdrop-blur-sm p-8 hover:border-[#FFFC00]/50 transition-all duration-500 flex flex-col">
            <div className="mb-6">
              <div className="h-16 w-16 flex items-center justify-center mb-6">
                <SnapchatIcon className="h-10 w-10 opacity-90" />
              </div>
              <h3 className="font-serif text-3xl text-foreground mb-4">Snapchat</h3>
              <p className="text-sm text-muted-foreground/70 leading-relaxed font-light mb-8">
                Discutez avec nous directement sur Snapchat pour des réponses instantanées.
              </p>
            </div>
            <Button
              size="lg"
              onClick={openSnapchat}
              className="w-full bg-[#FFFC00] hover:bg-[#FFFC00]/90 text-background h-14 rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-3 mt-auto"
            >
              <SnapchatIcon className="h-5 w-5 opacity-90" />
              Ouvrir Snapchat
            </Button>
          </div>

          <div className="border border-border/50 bg-card/20 backdrop-blur-sm p-8 hover:border-[#25D366]/50 transition-all duration-500 flex flex-col">
            <div className="mb-6">
              <div className="h-16 w-16 flex items-center justify-center mb-6">
                <WhatsAppIcon className="h-10 w-10 text-[#25D366]" />
              </div>
              <h3 className="font-serif text-3xl text-foreground mb-4">WhatsApp</h3>
              <p className="text-sm text-muted-foreground/70 leading-relaxed font-light mb-8">
                Envoyez-nous un message WhatsApp pour toute question ou demande.
              </p>
            </div>
            <Button
              size="lg"
              onClick={openWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white h-14 rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-3 mt-auto"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Ouvrir WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
