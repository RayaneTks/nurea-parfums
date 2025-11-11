import { useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/nurea-logo-transparent.png";
import { Button } from "./ui/button";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-md border-b border-border/30">
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-5 flex items-center justify-between">
        <button
          onClick={() => scrollToSection("hero")}
          className="flex items-center gap-3 transition-opacity hover:opacity-80 group"
        >
          <img src={logo} alt="Nuréa Parfums" className="h-10 w-10 md:h-12 md:w-12 opacity-90 group-hover:opacity-100 transition-opacity" />
          <span className="font-serif text-lg md:text-xl text-foreground hidden sm:inline font-light tracking-wide">
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

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-foreground/80 hover:text-foreground hover:bg-transparent"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
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
