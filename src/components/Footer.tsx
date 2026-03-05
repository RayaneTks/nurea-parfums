 "use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import logo from "@/assets/nurea-logo-transparent.png";

export const Footer = () => {
  const router = useRouter();
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  const logoSrc = typeof logo === "string" ? logo : (logo as { src: string }).src;

  const goToContact = () => {
    if (pathname === "/") {
      const section = document.getElementById("contact");
      section?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    router.push("/#contact");
  };

  return (
    <footer className="border-t border-border/30 bg-card/25 px-4 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <img src={logoSrc} alt="Nurea Parfums" className="h-11 w-11 opacity-85" loading="lazy" decoding="async" />
          <p className="mt-3 text-sm text-muted-foreground">Parfums de niche et grands classiques.</p>
          <p className="mt-2 text-xs text-muted-foreground/80">© {currentYear} Nurea Parfums</p>
        </div>

        <nav className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <Link href="/catalogue" className="transition-colors hover:text-primary">
            Catalogue
          </Link>
          <Link href="/marques" className="transition-colors hover:text-primary">
            Marques
          </Link>
          <Link href="/categories" className="transition-colors hover:text-primary">
            Categories
          </Link>
          <button type="button" onClick={goToContact} className="transition-colors hover:text-primary">
            Contact
          </button>
        </nav>
      </div>
    </footer>
  );
};
