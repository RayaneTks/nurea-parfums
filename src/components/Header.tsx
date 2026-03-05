"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import logo from "@/assets/nurea-logo-transparent.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
  activeFiltersCount?: number;
}

const mainNavItems = [
  { label: "Accueil", to: "/" },
  { label: "Catalogue", to: "/catalogue" },
  { label: "Marques", to: "/marques" },
  { label: "Categories", to: "/categories" },
];

export const Header = (_props: HeaderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const isHome = currentPath === "/";

  const logoSrc = typeof logo === "string" ? logo : (logo as { src: string }).src;

  const activePath = useMemo(() => {
    if (currentPath.startsWith("/catalogue")) return "/catalogue";
    if (currentPath.startsWith("/marques")) return "/marques";
    if (currentPath.startsWith("/categories")) return "/categories";
    return "/";
  }, [currentPath]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = searchTerm.trim();
    if (!query) {
      router.push("/catalogue");
      return;
    }

    router.push(`/catalogue?search=${encodeURIComponent(query)}`);
    setMobileOpen(false);
  };

  const goToContact = () => {
    if (isHome) {
      const section = document.getElementById("contact");
      section?.scrollIntoView({ behavior: "smooth" });
      setMobileOpen(false);
      return;
    }

    router.push("/#contact");
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-[90] border-b border-border/40 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="group inline-flex min-w-0 items-center gap-3 rounded-md py-1 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Retour a l'accueil Nurea Parfums"
        >
          <img
            src={logoSrc}
            alt="Nurea Parfums"
            className="h-9 w-9 flex-shrink-0 opacity-90 transition-opacity group-hover:opacity-100"
            loading="eager"
            decoding="async"
          />
          <span className="hidden truncate font-serif text-lg text-foreground sm:inline">Nurea Parfums</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {mainNavItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                activePath === item.to ? "bg-primary/15 text-primary" : "text-foreground/75 hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={goToContact}
            className="rounded-md px-3 py-2 text-sm text-foreground/75 transition-colors hover:text-foreground"
          >
            Contact
          </button>
        </nav>

        <form onSubmit={submitSearch} className="hidden flex-1 items-center justify-end gap-2 lg:flex">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher un parfum ou une marque"
              className="h-10 w-full rounded-md border border-border/60 bg-card/40 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
            />
          </div>
          <Button type="submit" size="sm" className="h-10 px-4">
            Rechercher
          </Button>
        </form>

        <div className="ml-auto flex lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Ouvrir le menu principal</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[90vw] max-w-sm p-0">
              <SheetHeader className="border-b border-border/30 px-4 py-4">
                <SheetTitle className="font-serif text-xl font-medium">Navigation</SheetTitle>
              </SheetHeader>
              <div className="flex h-full flex-col gap-6 px-4 py-5">
                <form onSubmit={submitSearch} className="space-y-3">
                  <label htmlFor="header-mobile-search" className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Recherche rapide
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                    <input
                      id="header-mobile-search"
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Nom, marque..."
                      className="h-11 w-full rounded-md border border-border/60 bg-card/40 pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        aria-label="Vider la recherche"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Button type="submit" className="h-11 w-full">
                    Ouvrir le catalogue
                  </Button>
                </form>

                <nav className="space-y-1">
                  {mainNavItems.map((item) => (
                    <Link
                      key={item.to}
                      href={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block rounded-md px-3 py-3 text-sm",
                        activePath === item.to ? "bg-primary/15 text-primary" : "text-foreground/80 hover:bg-muted/20 hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={goToContact}
                    className="block w-full rounded-md px-3 py-3 text-left text-sm text-foreground/80 hover:bg-muted/20 hover:text-foreground"
                  >
                    Contact
                  </button>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
