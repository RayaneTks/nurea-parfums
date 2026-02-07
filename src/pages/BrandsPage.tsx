import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { fullRangeBrands, perfumes } from "@/data/perfumes";
import { buildBrandPath, perfumeBrands, SITE_URL } from "@/lib/catalog";

const BrandsPage = () => {
  const fullRangeBrandNames = new Set(fullRangeBrands.map((brand) => brand.name));

  const classicBrands = perfumeBrands
    .filter((brandName) => !fullRangeBrandNames.has(brandName))
    .map((brandName) => ({
      name: brandName,
      count: perfumes.filter((perfume) => perfume.brand === brandName).length,
      topCategory:
        perfumes
          .filter((perfume) => perfume.brand === brandName)
          .map((perfume) => perfume.category)
          .sort((a, b) => a.localeCompare(b, "fr"))[0] ?? "Collection",
    }));

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Toutes les marques disponibles"
        description="Accedez aux pages marque Nurea Parfums: gammes completes et references du catalogue."
        canonicalPath="/marques"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Marques Nurea Parfums",
          url: `${SITE_URL}/marques`,
        }}
      />
      <Header />
      <main className="px-3 py-10 sm:px-4 sm:py-14">
        <div className="mx-auto w-full max-w-7xl space-y-10">
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-primary/85">Navigation catalogue</p>
            <h1 className="font-serif text-4xl text-foreground sm:text-5xl">Marques</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Parcourez les marques en gamme complete ou les maisons presentes dans le catalogue.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-3xl text-foreground">Gamme complete</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {fullRangeBrands.map((brand) => (
                <Link
                  key={brand.id}
                  to={`/marques/${brand.id}`}
                  className="rounded-2xl border border-border/35 bg-card/35 p-5 transition-all hover:-translate-y-1 hover:border-primary/45"
                >
                  <p className="text-[10px] uppercase tracking-[0.16em] text-primary/85">{brand.category}</p>
                  <h3 className="mt-2 font-serif text-2xl text-foreground">{brand.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Collection complete disponible</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-3xl text-foreground">Autres marques du catalogue</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {classicBrands.map((brand) => (
                <Link
                  key={brand.name}
                  to={buildBrandPath(brand.name)}
                  className="rounded-2xl border border-border/35 bg-card/35 p-5 transition-all hover:-translate-y-1 hover:border-primary/45"
                >
                  <p className="text-[10px] uppercase tracking-[0.16em] text-primary/85">{brand.topCategory}</p>
                  <h3 className="mt-2 font-serif text-2xl text-foreground">{brand.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{brand.count} parfums references</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BrandsPage;
