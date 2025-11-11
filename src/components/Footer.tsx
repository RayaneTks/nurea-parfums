import logo from "@/assets/nurea-logo-transparent.png";

export const Footer = () => {
  return (
    <footer className="py-16 md:py-20 px-4 bg-background border-t border-border/30">
      <div className="container max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-8">
          <img src={logo} alt="Nuréa Parfums" className="h-14 w-14 md:h-16 md:w-16 opacity-70" />
          
          <div className="text-center">
            <p className="text-xs md:text-sm text-muted-foreground/60 mb-6 font-light">
              Nuréa Parfums - Tous droits réservés
            </p>
            <div className="flex gap-6 justify-center text-xs text-muted-foreground/50 font-light">
              <button className="hover:text-primary/80 transition-colors duration-300 uppercase tracking-wider">
                Mentions légales
              </button>
              <span className="text-muted-foreground/30">·</span>
              <button className="hover:text-primary/80 transition-colors duration-300 uppercase tracking-wider">
                Conditions
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
