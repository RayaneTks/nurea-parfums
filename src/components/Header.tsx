import { useState } from "react";
import { Menu, X, Filter } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/nurea-logo-transparent.png";
import { Button } from "./ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
  activeFiltersCount?: number;
}

export const Header = ({ onFilterClick, hasActiveFilters, activeFiltersCount = 0 }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  const handleLogoClick = () => {
    if (location.pathname !== "/") {
      navigate("/");
    } else {
      // Si on est déjà sur l'index, scroller vers le haut
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-[100] bg-background/98 backdrop-blur-md border-b border-border/30 shadow-sm">
      <div className="container mx-auto px-4 md:px-6 py-2 md:py-4 flex items-center justify-between">
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-2 md:gap-3 transition-opacity hover:opacity-80 group min-h-[44px] min-w-[44px]"
        >
          <img src={logo} alt="Nuréa Parfums" className="h-8 w-8 md:h-12 md:w-12 opacity-90 group-hover:opacity-100 transition-opacity" />
          <span className="font-serif text-sm md:text-xl text-foreground hidden sm:inline font-light tracking-wide">
            Nuréa Parfums
          </span>
        </button>

        <nav className="hidden md:flex gap-8">
          <button
            onClick={() => scrollToSection("catalogue")}
            className="text-sm text-foreground/80 hover:text-primary transition-colors duration-300 font-light uppercase tracking-wider min-h-[44px] px-2"
          >
            Catalogue
          </button>
          <button
            onClick={() => scrollToSection("contact")}
            className="text-sm text-foreground/80 hover:text-primary transition-colors duration-300 font-light uppercase tracking-wider min-h-[44px] px-2"
          >
            Contact
          </button>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground/80 active:text-foreground active:bg-transparent h-11 w-11"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Menu mobile overlay avec animation */}
      <div
        className={`
          md:hidden fixed inset-0 z-[200] transition-opacity duration-300
          ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={() => setMobileMenuOpen(false)}
      >
        {/* Overlay sombre */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        {/* Menu slide depuis la droite */}
        <div
          className={`
            absolute right-0 top-0 h-full w-[280px] bg-background/98 backdrop-blur-md border-l border-border/30 shadow-xl
            transform transition-transform duration-300 ease-out
            ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          <nav className="flex flex-col gap-2 p-6 pt-20">
            <button
              onClick={() => scrollToSection("catalogue")}
              className="text-left text-foreground/80 hover:text-primary transition-colors duration-300 py-3 px-4 font-light uppercase tracking-wider text-sm hover:bg-background/50 rounded-sm"
            >
              Catalogue
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="text-left text-foreground/80 hover:text-primary transition-colors duration-300 py-3 px-4 font-light uppercase tracking-wider text-sm hover:bg-background/50 rounded-sm"
            >
              Contact
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
