import { Link, Navigate, useParams } from "react-router-dom";
import { Catalogue } from "@/components/Catalogue";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { getCategoryBySlug, SITE_URL } from "@/lib/catalog";

const CategoryDetail = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();

  if (!categorySlug) {
    return <Navigate to="/categories" replace />;
  }

  const categoryName = getCategoryBySlug(categorySlug);

  if (!categoryName) {
    return (
      <div className="min-h-screen bg-background">
        <Seo title="Categorie introuvable" description="La categorie demandee est introuvable." canonicalPath="/categories" noIndex />
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="font-serif text-4xl text-foreground">Categorie introuvable</h1>
          <p className="mt-3 text-muted-foreground">Cette categorie n'existe pas ou a ete deplacee.</p>
          <Link to="/categories" className="mt-6 inline-flex text-primary hover:text-primary/80">
            Retour aux categories
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`Categorie ${categoryName}`}
        description={`Parfums de la categorie ${categoryName} sur Nurea Parfums.`}
        canonicalPath={`/categories/${categorySlug}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Categorie ${categoryName}`,
          url: `${SITE_URL}/categories/${categorySlug}`,
        }}
      />
      <Header />
      <main>
        <Catalogue
          title={`Categorie: ${categoryName}`}
          subtitle={`Selection de parfums ${categoryName}. Vous pouvez affiner par marque, genre ou recherche.`}
          initialCategory={categoryName}
          showQuickLinks={false}
        />
      </main>
      <Footer />
    </div>
  );
};

export default CategoryDetail;
