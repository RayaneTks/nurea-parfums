import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Catalogue } from "@/components/Catalogue";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { allBrands, categories } from "@/data/perfumes";
import { SITE_URL, type GenderFilter } from "@/lib/catalog";

const CataloguePage = () => {
  const [searchParams] = useSearchParams();

  const searchTerm = searchParams.get("search")?.trim() ?? "";
  const category = searchParams.get("category") ?? "Tous";
  const brand = searchParams.get("brand") ?? "Tous";
  const genderParam = searchParams.get("gender");

  const selectedCategory = categories.includes(category) ? category : "Tous";
  const selectedBrand = allBrands.includes(brand) ? brand : "Tous";
  const selectedGender: GenderFilter =
    genderParam === "homme" || genderParam === "femme" || genderParam === "tous" ? genderParam : "tous";

  const title = searchTerm ? `Recherche: ${searchTerm}` : "Catalogue complet";
  const description = searchTerm
    ? `Resultats pour "${searchTerm}" dans le catalogue Nurea Parfums.`
    : "Explorez le catalogue complet Nurea Parfums par marque, categorie, genre et recherche.";

  const canonicalPath = useMemo(() => {
    if (!searchTerm && selectedCategory === "Tous" && selectedBrand === "Tous" && selectedGender === "tous") {
      return "/catalogue";
    }

    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedCategory !== "Tous") params.set("category", selectedCategory);
    if (selectedBrand !== "Tous") params.set("brand", selectedBrand);
    if (selectedGender !== "tous") params.set("gender", selectedGender);
    return `/catalogue?${params.toString()}`;
  }, [searchTerm, selectedCategory, selectedBrand, selectedGender]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${title} | Catalogue ${searchTerm ? "filtre" : ""}`.trim()}
        description={description}
        canonicalPath={canonicalPath}
        noIndex={Boolean(searchTerm)}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Catalogue Nurea Parfums",
          url: `${SITE_URL}${canonicalPath}`,
          description,
        }}
      />
      <Header />
      <main>
        <Catalogue
          title={title}
          subtitle="Filtrez par categorie, marque et genre pour trouver votre parfum plus rapidement."
          initialSearchTerm={searchTerm}
          initialCategory={selectedCategory}
          initialBrand={selectedBrand}
          initialGender={selectedGender}
          showQuickLinks={!searchTerm}
        />
      </main>
      <Footer />
    </div>
  );
};

export default CataloguePage;
