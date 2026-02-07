import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { categories, perfumes } from "@/data/perfumes";
import { buildCategoryPath, SITE_URL } from "@/lib/catalog";

const CategoriesPage = () => {
  const categoryData = categories
    .filter((category) => category !== "Tous")
    .map((category) => ({
      category,
      count: perfumes.filter((perfume) => perfume.category === category).length,
      brands: Array.from(new Set(perfumes.filter((perfume) => perfume.category === category).map((perfume) => perfume.brand))).length,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Toutes les categories de parfums"
        description="Explorez les categories Nurea Parfums: grands classiques, niche, collections privees et plus."
        canonicalPath="/categories"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Categories Nurea Parfums",
          url: `${SITE_URL}/categories`,
        }}
      />
      <Header />
      <main className="px-3 py-10 sm:px-4 sm:py-14">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-primary/85">Navigation catalogue</p>
            <h1 className="font-serif text-4xl text-foreground sm:text-5xl">Categories</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Chaque categorie ouvre une page dediee avec filtres et vue mobile-first.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categoryData.map((item) => (
              <Link
                key={item.category}
                to={buildCategoryPath(item.category)}
                className="rounded-2xl border border-border/35 bg-card/35 p-5 transition-all hover:-translate-y-1 hover:border-primary/45"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-primary/85">Categorie</p>
                <h2 className="mt-2 font-serif text-2xl text-foreground">{item.category}</h2>
                <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                  <span>{item.count} parfums</span>
                  <span>{item.brands} marques</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CategoriesPage;
