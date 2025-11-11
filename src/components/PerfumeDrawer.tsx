import { Perfume, defaultSizes } from "@/data/perfumes";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { contactConfig } from "@/config/contact";
import { SnapchatIcon } from "./icons/SnapchatIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

interface PerfumeDrawerProps {
  perfume: Perfume | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PerfumeDrawer = ({ perfume, open, onOpenChange }: PerfumeDrawerProps) => {
  if (!perfume) return null;

  const openSnapchat = () => {
    window.open(contactConfig.snapchat.url, "_blank");
  };

  const openWhatsApp = () => {
    window.open(contactConfig.whatsapp.url, "_blank");
  };

  const sizes = perfume.availableSizes || defaultSizes;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background border-t border-border/50 max-h-[90vh] rounded-t-none">
        <DrawerHeader className="text-left border-b border-border/30 pb-6 px-6 pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {perfume.tags && perfume.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {perfume.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-wider text-primary/80 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <DrawerTitle className="font-serif text-4xl md:text-5xl text-foreground mb-3 leading-tight">
                {perfume.name}
              </DrawerTitle>
              <DrawerDescription className="text-base md:text-lg text-muted-foreground/80 mb-2 font-light">
                {perfume.brand}
              </DrawerDescription>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mt-2">
                {perfume.category}
              </p>
            </div>
            <DrawerClose asChild>
              <button className="text-muted-foreground/50 hover:text-foreground transition-colors p-2 -mr-2">
                <X className="h-5 w-5" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-6 py-8 overflow-y-auto flex-1">
          {/* Contenances */}
          <div className="mb-10">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-4 font-light">
              Contenances proposées
            </h4>
            <div className="flex flex-wrap gap-3">
              {sizes.map((size) => (
                <button
                  key={size}
                  className="px-6 py-3 border border-border/50 bg-card/30 hover:border-primary/50 hover:bg-card/50 text-foreground text-sm font-light transition-all duration-300 min-w-[80px] text-center"
                >
                  {size} ml
                </button>
              ))}
            </div>
          </div>

          {/* Message de réassurance */}
          <div className="border-t border-b border-border/30 py-6 mb-8">
            <p className="text-sm text-muted-foreground/80 leading-relaxed font-light">
              Contactez-nous pour disponibilité, conseils et options de contenances.
            </p>
          </div>

          {/* Actions de contact */}
          <div className="space-y-4">
            <Button
              onClick={openSnapchat}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-base rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-3"
              size="lg"
            >
              <SnapchatIcon className="h-5 w-5" />
              Écrire sur Snapchat
            </Button>
            <Button
              onClick={openWhatsApp}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-base rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-3"
              size="lg"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Écrire sur WhatsApp
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
