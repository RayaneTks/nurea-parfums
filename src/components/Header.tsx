import { useState } from "react";
import { Menu, X, Filter } from "lucide-react";
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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-md border-b border-border/30">
      <div className="container mx-auto px-3 md:px-6 py-2 md:py-5 flex items-center justify-between">
        <button
          onClick={() => scrollToSection("hero")}
          className="flex items-center gap-2 md:gap-3 transition-opacity hover:opacity-80 group"
        >
          <img src={logo} alt="Nuréa Parfums" className="h-8 w-8 md:h-12 md:w-12 opacity-90 group-hover:opacity-100 transition-opacity" />
          <span className="font-serif text-base md:text-xl text-foreground hidden sm:inline font-light tracking-wide">
            Nuréa Parfums
          </span>
        </button>

        <nav className="hidden md:flex gap-8">
          <button
            onClick={() => scrollToSection("catalogue")}
            className="text-sm text-foreground/80 hover:text-primary transition-colors duration-300 font-light uppercase tracking-wider"
          >
            Catalogue
          </button>
          <button
            onClick={() => scrollToSection("contact")}
            className="text-sm text-foreground/80 hover:text-primary transition-colors duration-300 font-light uppercase tracking-wider"
          >
            Contact
          </button>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {/* Bouton filtre mobile - Simple comme Amazon/Sephora */}
          {isMobile && onFilterClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFilterClick}
              className="h-8 px-2.5 text-xs font-light text-foreground/70 hover:text-foreground"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filtres
              {hasActiveFilters && activeFiltersCount > 0 && (
                <span className="ml-1.5 h-4 w-4 rounded-full bg-foreground text-[10px] text-background flex items-center justify-center font-medium">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground/80 active:text-foreground active:bg-transparent h-8 w-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-background/98 backdrop-blur-md border-t border-border/30">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-6">
            <button
              onClick={() => scrollToSection("catalogue")}
              className="text-left text-foreground/80 hover:text-primary transition-colors duration-300 py-2 font-light uppercase tracking-wider text-sm"
            >
              Catalogue
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="text-left text-foreground/80 hover:text-primary transition-colors duration-300 py-2 font-light uppercase tracking-wider text-sm"
            >
              Contact
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};
