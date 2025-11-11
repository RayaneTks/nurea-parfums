import { Button } from "./ui/button";
import { contactConfig } from "@/config/contact";
import { SnapchatIcon } from "./icons/SnapchatIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

export const MobileContactBar = () => {
  const openSnapchat = () => {
    window.open(contactConfig.snapchat.url, "_blank");
  };

  const openWhatsApp = () => {
    window.open(contactConfig.whatsapp.url, "_blank");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-border/50 p-4">
      <div className="flex gap-3 max-w-lg mx-auto">
        <Button
          onClick={openSnapchat}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <SnapchatIcon className="h-5 w-5" />
          Snapchat
        </Button>
        <Button
          onClick={openWhatsApp}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <WhatsAppIcon className="h-5 w-5" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
};
