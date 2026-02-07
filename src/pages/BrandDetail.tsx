import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { contactConfig } from "@/config/contact";
import { perfumes } from "@/data/perfumes";
import { buildProductPath, resolveBrandFromParam, SITE_URL } from "@/lib/catalog";
import { buildSnapchatUrl, buildWhatsappUrl } from "@/lib/contact";
import { getBrandImage, getPerfumeImage } from "@/lib/perfume-media";

export const BrandDetail = () => {
  const { brandId } = useParams<{ brandId: string }>();

  const resolvedBrand = brandId ? resolveBrandFromParam(brandId) : null;
  const brandPerfumes = resolvedBrand ? perfumes.filter((perfume) => perfume.brand === resolvedBrand.name) : [];
  const brandImage = resolvedBrand ? getBrandImage(resolvedBrand.name) : null;

  if (!resolvedBrand) {
    return (
      <div className="min-h-screen bg-background">
        <Seo title="Marque introuvable" description="La marque recherchee est introuvable." canonicalPath="/marques" noIndex />
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="font-serif text-4xl text-foreground">Marque introuvable</h1>
          <p className="mt-3 text-muted-foreground">La page demandee n'existe pas ou a ete deplacee.</p>
          <Link to="/marques" className="mt-6 inline-flex text-primary hover:text-primary/80">
            Retour aux marques
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const contactMessage = `Bonjour, je souhaite des informations sur ${resolvedBrand.name}.`;
  const snapchatUrl = buildSnapchatUrl(contactConfig.snapchat.url);
  const whatsappUrl = buildWhatsappUrl(contactConfig.whatsapp.url, contactMessage);
  const canonicalPath = `/marques/${brandId}`;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${resolvedBrand.name} - Collection marque`}
        description={`Decouvrez la selection ${resolvedBrand.name} sur Nurea Parfums.`}
        canonicalPath={canonicalPath}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Marque ${resolvedBrand.name}`,
          url: `${SITE_URL}${canonicalPath}`,
        }}
      />
      <Header />
      <main className="px-3 py-10 sm:px-4 sm:py-14">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <Link to="/marques" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80">
            <ArrowLeft className="h-4 w-4" />
            Retour aux marques
          </Link>

          <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="overflow-hidden rounded-2xl border border-border/35 bg-card/35">
              {brandImage ? (
                <img
                  src={brandImage}
                  alt={`Visuel marque ${resolvedBrand.name}`}
                  className="h-full w-full object-cover object-center"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full min-h-72 items-center justify-center bg-muted/30 p-8">
                  <p className="text-center text-sm text-muted-foreground">Visuel de marque indisponible pour le moment.</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/35 bg-card/35 p-5 sm:p-6">
              <p className="text-[10px] uppercase tracking-[0.16em] text-primary/85">{resolvedBrand.category}</p>
              <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl">{resolvedBrand.name}</h1>
              <p className="mt-4 text-sm text-muted-foreground sm:text-base">
                {resolvedBrand.source === "full-range"
                  ? "Cette marque est proposee en gamme complete."
                  : "Cette marque est proposee via une selection catalogue."}
              </p>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {snapchatUrl ? (
                  <Button asChild className="h-11 bg-[#FFFC00] text-black hover:bg-[#FFFC00]/90">
                    <a href={snapchatUrl} target="_blank" rel="noreferrer">
                      Contacter via Snapchat
                    </a>
                  </Button>
                ) : (
                  <Button disabled className="h-11 bg-[#FFFC00] text-black">
                    Snapchat indisponible
                  </Button>
                )}
                {whatsappUrl ? (
                  <Button asChild className="h-11 bg-[#25D366] text-white hover:bg-[#25D366]/90">
                    <a href={whatsappUrl} target="_blank" rel="noreferrer">
                      Contacter via WhatsApp
                    </a>
                  </Button>
                ) : (
                  <Button disabled className="h-11 bg-[#25D366] text-white">
                    WhatsApp indisponible
                  </Button>
                )}
              </div>
            </div>
          </section>

          {brandPerfumes.length > 0 ? (
            <section className="space-y-4">
              <h2 className="font-serif text-3xl text-foreground">Parfums disponibles</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {brandPerfumes.map((perfume) => {
                  const image = getPerfumeImage(perfume.id);

                  return (
                    <Link
                      key={perfume.id}
                      to={buildProductPath(perfume)}
                      className="overflow-hidden rounded-2xl border border-border/35 bg-card/35 transition-all hover:-translate-y-1 hover:border-primary/45"
                    >
                      <div className="aspect-[4/5] overflow-hidden border-b border-border/30">
                        {image ? (
                          <img
                            src={image}
                            alt={`${perfume.name} - ${perfume.brand}`}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover object-center"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-muted/30">
                            <p className="text-xs text-muted-foreground">Image a venir</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-primary/85">{perfume.category}</p>
                        <h3 className="line-clamp-2 font-serif text-base text-foreground">{perfume.name}</h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-border/35 bg-card/35 p-6 text-center">
              <h2 className="font-serif text-2xl text-foreground">Catalogue disponible sur demande</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Contactez-nous pour recevoir la disponibilite complete de la marque {resolvedBrand.name}.
              </p>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};
