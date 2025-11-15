import { MessageCircle, ShoppingCart, Package } from "lucide-react";

export const HowToOrder = () => {
  const steps = [
    {
      icon: MessageCircle,
      title: "Contactez-nous",
      description: "Envoyez-nous un message sur Snapchat ou WhatsApp avec le parfum qui vous intéresse.",
    },
    {
      icon: ShoppingCart,
      title: "Confirmation",
      description: "Nous vérifions la disponibilité et vous confirmons les contenances et prix disponibles.",
    },
    {
      icon: Package,
      title: "Livraison",
      description: "Nous organisons la livraison selon vos préférences et votre localisation.",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-background border-t border-border/10">
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-8 md:mb-12 lg:mb-16 px-4">
          <h2 className="font-serif text-2xl md:text-4xl lg:text-5xl xl:text-6xl text-foreground mb-3 md:mb-4 tracking-tight font-light">
            Comment commander ?
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground/80 max-w-2xl mx-auto font-light">
            Un processus simple en 3 étapes
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="text-center p-4 md:p-6 border border-border/30 bg-background/50 backdrop-blur-sm hover:border-primary/30 transition-all rounded-xl"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-4 md:mb-6">
                  <Icon className="h-6 w-6 md:h-8 md:w-8 text-primary/90" />
                </div>
                <div className="mb-3 md:mb-4">
                  <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary/90 text-[10px] md:text-xs uppercase tracking-wider font-light border border-primary/20 rounded-full">
                    Étape {index + 1}
                  </span>
                </div>
                <h3 className="font-serif text-lg md:text-xl lg:text-2xl text-foreground mb-2 md:mb-3 font-light">
                  {step.title}
                </h3>
                <p className="text-xs md:text-sm lg:text-base text-muted-foreground/70 leading-relaxed font-light px-2">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

