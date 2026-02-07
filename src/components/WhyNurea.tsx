import { MessageCircleHeart, ShieldCheck, Sparkles, Truck } from "lucide-react";

const valueProps = [
  {
    title: "Selection qualitative",
    description: "Chaque reference est selectionnee pour proposer des senteurs reconnues et des collections recherchees.",
    icon: Sparkles,
  },
  {
    title: "Conseil rapide",
    description: "Une reponse claire et personnalisee selon vos preferences, via WhatsApp ou Snapchat.",
    icon: MessageCircleHeart,
  },
  {
    title: "Parcours transparent",
    description: "Filtres lisibles, pages marque et categorie dediees pour trouver rapidement la bonne fragrance.",
    icon: ShieldCheck,
  },
  {
    title: "Commande simplifiee",
    description: "Validation de la disponibilite puis confirmation rapide avec les tailles et modalites.",
    icon: Truck,
  },
];

export const WhyNurea = () => {
  return (
    <section className="border-t border-border/30 bg-background px-3 py-12 sm:px-4 sm:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-primary/85">Experience d'achat</p>
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">Pourquoi choisir Nurea</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {valueProps.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="rounded-2xl border border-border/35 bg-card/35 p-4 sm:p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-xl text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
