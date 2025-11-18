import { useState } from "react";
import { Filter } from "lucide-react";
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
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  // Gérer l'animation de fermeture
  const handleCloseMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setMobileMenuOpen(false);
      setIsClosing(false);
    }, 500); // Durée de l'animation
  };

  // Gérer l'animation d'ouverture
  const handleOpenMenu = () => {
    setMobileMenuOpen(true);
    setIsOpening(true);
    // Utiliser requestAnimationFrame pour permettre au DOM de se mettre à jour
    // puis déclencher l'animation rapidement
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsOpening(false);
      });
    });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      handleCloseMenu();
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
      <div className="container mx-auto px-4 md:px-6 py-2.5 md:py-4 flex items-center justify-between">
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-2 md:gap-3 transition-opacity hover:opacity-80 active:opacity-70 group min-h-[44px] min-w-[44px]"
        >
          <img src={logo} alt="Nuréa Parfums" className="h-9 w-9 md:h-12 md:w-12 opacity-90 group-hover:opacity-100 transition-opacity" />
          <span className="font-serif text-sm md:text-xl text-foreground hidden sm:inline font-light tracking-wide">
            Nuréa Parfums
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-8">
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
          {onFilterClick && (
            <Button
              variant="outline"
              onClick={onFilterClick}
              className={`relative h-10 w-10 rounded-full border-primary/30 p-0 ${
                hasActiveFilters
                  ? "bg-primary/20 border-primary/50"
                  : "bg-background/5 active:bg-primary/10"
              }`}
              aria-label="Ouvrir les filtres"
            >
              <Filter className="h-4 w-4 text-primary" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-background text-[10px] flex items-center justify-center font-medium">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          )}
          <Button
            className={`group h-10 w-10 border-border/30 hover:bg-background/50 hover:border-primary/40 active:bg-background/70 transition-all ${mobileMenuOpen ? 'bg-background/50 border-primary/40' : ''}`}
            variant="outline"
            size="icon"
            onClick={() => {
              if (mobileMenuOpen) {
                handleCloseMenu();
              } else {
                handleOpenMenu();
              }
            }}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <svg
              className="pointer-events-none text-foreground/80 group-hover:text-foreground transition-colors"
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 12H20"
                className={`origin-center transition-all duration-300 [transition-timing-function:cubic-bezier(.5,.85,.25,1.1)] ${
                  mobileMenuOpen 
                    ? 'translate-y-0 rotate-[45deg]' 
                    : '-translate-y-[7px]'
                }`}
              />
              <path
                d="M4 12H20"
                className={`origin-center transition-all duration-300 [transition-timing-function:cubic-bezier(.5,.85,.25,1.8)] ${
                  mobileMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <path
                d="M4 12H20"
                className={`origin-center transition-all duration-300 [transition-timing-function:cubic-bezier(.5,.85,.25,1.1)] ${
                  mobileMenuOpen 
                    ? 'translate-y-0 rotate-[-45deg]' 
                    : 'translate-y-[7px]'
                }`}
              />
            </svg>
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          {/* Overlay pour fermer le menu en cliquant en dehors */}
          <div
            className={`md:hidden fixed inset-0 z-[150] bg-black/20 backdrop-blur-sm transition-opacity ${
              isClosing 
                ? "duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] opacity-0" 
                : isOpening 
                ? "duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] opacity-0" 
                : "duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] opacity-100"
            }`}
            onClick={handleCloseMenu}
          />
          
          {/* Menu avec animation */}
          <div
            className={`md:hidden fixed top-[56px] left-0 right-0 z-[200] bg-background border-t border-border/30 shadow-2xl transition-all ${
              isClosing 
                ? "duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] -translate-y-full opacity-0" 
                : isOpening
                ? "duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] -translate-y-full opacity-0"
                : "duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] translate-y-0 opacity-100"
            }`}
          >
            <nav className="container mx-auto px-4 py-5 flex flex-col gap-1">
              <button
                onClick={() => scrollToSection("catalogue")}
                className="text-center text-foreground hover:text-primary active:text-primary transition-colors duration-200 py-3.5 px-4 font-light uppercase tracking-wider text-sm min-h-[48px] flex items-center justify-center rounded-lg hover:bg-background/50 active:bg-background/70 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
              >
                Catalogue
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="text-center text-foreground hover:text-primary active:text-primary transition-colors duration-200 py-3.5 px-4 font-light uppercase tracking-wider text-sm min-h-[48px] flex items-center justify-center rounded-lg hover:bg-background/50 active:bg-background/70 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
              >
                Contact
              </button>
            </nav>
          </div>
        </>
      )}
    </header>
  );
};
