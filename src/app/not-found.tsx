import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="font-serif text-5xl text-foreground">404</h1>
        <p className="mt-3 text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
            Retour accueil
          </Link>
          <Link
            href="/catalogue"
            className="rounded-md border border-primary/40 px-4 py-2 text-sm text-primary hover:bg-primary/10"
          >
            Ouvrir le catalogue
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

