import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/nurea-logo-transparent.png";

export const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  const goToContact = () => {
    if (location.pathname === "/") {
      const section = document.getElementById("contact");
      section?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    navigate("/", { state: { scrollToSection: "contact" } });
  };

  return (
    <footer className="border-t border-border/30 bg-card/25 px-4 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <img src={logo} alt="Nurea Parfums" className="h-11 w-11 opacity-85" loading="lazy" decoding="async" />
          <p className="mt-3 text-sm text-muted-foreground">Parfums de niche et grands classiques.</p>
          <p className="mt-2 text-xs text-muted-foreground/80">© {currentYear} Nurea Parfums</p>
        </div>

        <nav className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <Link to="/catalogue" className="transition-colors hover:text-primary">
            Catalogue
          </Link>
          <Link to="/marques" className="transition-colors hover:text-primary">
            Marques
          </Link>
          <Link to="/categories" className="transition-colors hover:text-primary">
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
