import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo title="Page introuvable" description="La page demandee est introuvable." canonicalPath="/" noIndex />
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="font-serif text-5xl text-foreground">404</h1>
        <p className="mt-3 text-muted-foreground">Cette page n'existe pas ou a ete deplacee.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
            Retour accueil
          </Link>
          <Link to="/catalogue" className="rounded-md border border-primary/40 px-4 py-2 text-sm text-primary hover:bg-primary/10">
            Ouvrir le catalogue
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
