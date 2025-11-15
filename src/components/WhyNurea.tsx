import { Check } from "lucide-react";

export const WhyNurea = () => {
  const advantages = [
    {
      title: "Prix cassés jamais vus",
      description: "Profitez de vos parfums préférés à prix cassé jamais vu pour très peu cher.",
    },
    {
      title: "Conseils personnalisés",
      description: "Notre équipe vous guide dans votre choix selon vos préférences et votre style.",
    },
    {
      title: "Stocks actualisés",
      description: "Nous mettons à jour régulièrement notre catalogue pour vous garantir la disponibilité.",
    },
    {
      title: "Réponse rapide",
      description: "Nous répondons à vos questions en moins de 2 heures, 7 jours sur 7.",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-background/50 border-t border-border/10">
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-8 md:mb-12 lg:mb-16 px-4">
          <h2 className="font-serif text-2xl md:text-4xl lg:text-5xl xl:text-6xl text-foreground mb-3 md:mb-4 tracking-tight font-light">
            Pourquoi Nuréa ?
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground/80 max-w-2xl mx-auto font-light">
            Votre partenaire de confiance pour les parfums de luxe
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {advantages.map((advantage, index) => (
            <div
              key={index}
              className="p-4 md:p-6 lg:p-8 border border-border/30 bg-background/50 backdrop-blur-sm hover:border-primary/30 transition-all rounded-xl"
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-4 w-4 md:h-5 md:w-5 text-primary/90" />
                </div>
                <div>
                  <h3 className="font-serif text-lg md:text-xl lg:text-2xl text-foreground mb-1.5 md:mb-2 font-light">
                    {advantage.title}
                  </h3>
                  <p className="text-xs md:text-sm lg:text-base text-muted-foreground/70 leading-relaxed font-light">
                    {advantage.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

