import { Button } from "@/components/ui/button";
import { contactConfig } from "@/config/contact";
import { SnapchatIcon } from "@/components/icons/SnapchatIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { buildSnapchatUrl, buildWhatsappUrl } from "@/lib/contact";

export const Contact = () => {
  const snapchatUrl = buildSnapchatUrl(contactConfig.snapchat.url);
  const whatsappUrl = buildWhatsappUrl(contactConfig.whatsapp.url);

  return (
    <section id="contact" className="border-t border-border/30 bg-background px-3 py-12 sm:px-4 sm:py-16">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.16em] text-primary/85">Contact direct</p>
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">Besoin d'un conseil ou d'une disponibilite</h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
            Ecrivez-nous pour une recommendation personnalisee ou une confirmation de stock.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-border/35 bg-card/35 p-5">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/45 bg-background/75">
              <SnapchatIcon className="h-7 w-7 text-[#FFFC00]" />
            </div>
            <h3 className="font-serif text-2xl text-foreground">Snapchat</h3>
            <p className="mt-2 text-sm text-muted-foreground">Canal rapide pour une validation immediate des references.</p>
            {snapchatUrl ? (
              <Button asChild className="mt-5 h-11 w-full bg-[#FFFC00] text-black hover:bg-[#FFFC00]/90">
                <a href={snapchatUrl} target="_blank" rel="noreferrer">
                  Ouvrir Snapchat
                </a>
              </Button>
            ) : (
              <Button disabled className="mt-5 h-11 w-full bg-[#FFFC00] text-black">
                Snapchat indisponible
              </Button>
            )}
            {!snapchatUrl && <p className="mt-2 text-xs text-muted-foreground">Lien Snapchat a configurer dans `src/config/contact.ts`.</p>}
          </article>

          <article className="rounded-2xl border border-border/35 bg-card/35 p-5">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/45 bg-background/75">
              <WhatsAppIcon className="h-7 w-7 text-[#25D366]" />
            </div>
            <h3 className="font-serif text-2xl text-foreground">WhatsApp</h3>
            <p className="mt-2 text-sm text-muted-foreground">Ideal pour poser vos questions et recevoir des recommandations detaillees.</p>
            {whatsappUrl ? (
              <Button asChild className="mt-5 h-11 w-full bg-[#25D366] text-white hover:bg-[#25D366]/90">
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  Ouvrir WhatsApp
                </a>
              </Button>
            ) : (
              <Button disabled className="mt-5 h-11 w-full bg-[#25D366] text-white">
                WhatsApp indisponible
              </Button>
            )}
            {!whatsappUrl && <p className="mt-2 text-xs text-muted-foreground">Lien WhatsApp a configurer dans `src/config/contact.ts`.</p>}
          </article>
        </div>
      </div>
    </section>
  );
};
