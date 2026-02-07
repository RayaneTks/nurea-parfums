import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Share2 } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { contactConfig } from "@/config/contact";
import { defaultSizes, perfumes } from "@/data/perfumes";
import { buildBrandPath, buildProductPath, normalizeText, SITE_URL } from "@/lib/catalog";
import { buildSnapchatUrl, buildWhatsappUrl } from "@/lib/contact";
import { getPerfumeImage } from "@/lib/perfume-media";

export const ProductDetail = () => {
  const navigate = useNavigate();
  const { brand, name } = useParams<{ brand: string; name: string }>();
  const [selectedSize, setSelectedSize] = useState<number | null>(null);

  const perfume = useMemo(() => {
    if (!brand || !name) return null;

    const decodedBrand = decodeURIComponent(brand);
    const decodedName = decodeURIComponent(name);

    return (
      perfumes.find(
        (candidate) =>
          normalizeText(candidate.brand) === normalizeText(decodedBrand) &&
          normalizeText(candidate.name) === normalizeText(decodedName)
      ) ?? null
    );
  }, [brand, name]);

  if (!perfume) {
    return (
      <div className="min-h-screen bg-background">
        <Seo title="Produit introuvable" description="Le parfum recherche est introuvable." canonicalPath="/catalogue" noIndex />
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="font-serif text-4xl text-foreground">Produit introuvable</h1>
          <p className="mt-3 text-muted-foreground">Le lien n'est plus valide ou le produit a ete retire.</p>
          <Link to="/catalogue" className="mt-6 inline-flex text-primary hover:text-primary/80">
            Retour au catalogue
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const image = getPerfumeImage(perfume.id);
  const sizes = perfume.availableSizes || defaultSizes;
  const canonicalPath = buildProductPath(perfume);

  const contactMessage = `Bonjour, je souhaite des infos pour ${perfume.name} de ${perfume.brand}${
    selectedSize ? ` en ${selectedSize} ml` : ""
  }.`;
  const snapchatUrl = buildSnapchatUrl(contactConfig.snapchat.url);
  const whatsappUrl = buildWhatsappUrl(contactConfig.whatsapp.url, contactMessage);

  const shareProduct = async () => {
    const url = `${SITE_URL}${canonicalPath}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${perfume.name} - ${perfume.brand}`,
          text: `Decouvrez ${perfume.name} sur Nurea Parfums`,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
    } catch {
      // Ignore user cancellation.
    }
  };

  const relatedPerfumes = perfumes
    .filter((candidate) => candidate.id !== perfume.id && (candidate.brand === perfume.brand || candidate.category === perfume.category))
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${perfume.name} - ${perfume.brand}`}
        description={`${perfume.name} par ${perfume.brand}. Consultez les tailles disponibles et contactez Nurea Parfums.`}
        canonicalPath={canonicalPath}
        type="product"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: perfume.name,
          brand: {
            "@type": "Brand",
            name: perfume.brand,
          },
          category: perfume.category,
          url: `${SITE_URL}${canonicalPath}`,
          description: `${perfume.name} de ${perfume.brand} disponible en plusieurs contenances.`,
        }}
      />
      <Header />
      <main className="px-3 py-8 sm:px-4 sm:py-12">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="h-10 px-2 text-sm"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/catalogue"))}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Retour
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={shareProduct}>
              <Share2 className="h-4 w-4" />
              <span className="sr-only">Partager la fiche produit</span>
            </Button>
          </div>

          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="overflow-hidden rounded-2xl border border-border/35 bg-card/35">
              {image ? (
                <img
                  src={image}
                  alt={`${perfume.name} - ${perfume.brand}`}
                  className="h-full w-full object-cover object-center"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="flex min-h-80 items-center justify-center bg-muted/30">
                  <p className="text-sm text-muted-foreground">Image a venir</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/35 bg-card/35 p-5 sm:p-6">
              <p className="text-[10px] uppercase tracking-[0.16em] text-primary/85">{perfume.category}</p>
              <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl">{perfume.name}</h1>
              <p className="mt-1 text-base text-muted-foreground sm:text-lg">{perfume.brand}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {perfume.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-primary/35 bg-primary/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tailles disponibles</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-20 rounded-md border px-3 py-2 text-sm transition-colors ${
                        selectedSize === size
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/45 bg-background/70 text-foreground/90 hover:border-primary/35"
                      }`}
                    >
                      {size} ml
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {snapchatUrl ? (
                  <Button asChild className="h-11 bg-[#FFFC00] text-black hover:bg-[#FFFC00]/90">
                    <a href={snapchatUrl} target="_blank" rel="noreferrer">
                      Contacter Snapchat
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
                      Contacter WhatsApp
                    </a>
                  </Button>
                ) : (
                  <Button disabled className="h-11 bg-[#25D366] text-white">
                    WhatsApp indisponible
                  </Button>
                )}
              </div>

              <div className="mt-5 border-t border-border/35 pt-4">
                <Link to={buildBrandPath(perfume.brand)} className="text-sm text-primary hover:text-primary/80">
                  Voir toute la marque {perfume.brand}
                </Link>
              </div>
            </div>
          </section>

          {relatedPerfumes.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-serif text-3xl text-foreground">Parfums similaires</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {relatedPerfumes.map((related) => {
                  const relatedImage = getPerfumeImage(related.id);

                  return (
                    <Link
                      key={related.id}
                      to={buildProductPath(related)}
                      className="overflow-hidden rounded-2xl border border-border/35 bg-card/35 transition-all hover:-translate-y-1 hover:border-primary/45"
                    >
                      <div className="aspect-[4/5] overflow-hidden border-b border-border/30">
                        {relatedImage ? (
                          <img
                            src={relatedImage}
                            alt={`${related.name} - ${related.brand}`}
                            className="h-full w-full object-cover object-center"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-muted/30">
                            <p className="text-xs text-muted-foreground">Image a venir</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-primary/85">{related.brand}</p>
                        <h3 className="line-clamp-2 font-serif text-base text-foreground">{related.name}</h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};
