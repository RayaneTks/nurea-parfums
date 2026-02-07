import { CheckCircle2, MessageCircle, ShoppingBag } from "lucide-react";

const steps = [
  {
    title: "1. Selection",
    description: "Choisissez un parfum depuis le catalogue, une categorie ou une page marque.",
    icon: ShoppingBag,
  },
  {
    title: "2. Confirmation",
    description: "Contactez-nous pour verifier disponibilite, taille et conseils avant validation.",
    icon: MessageCircle,
  },
  {
    title: "3. Finalisation",
    description: "Nous confirmons votre commande et les prochaines etapes de livraison.",
    icon: CheckCircle2,
  },
];

export const HowToOrder = () => {
  return (
    <section className="border-t border-border/30 bg-card/15 px-3 py-12 sm:px-4 sm:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-primary/85">Parcours simple</p>
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">Comment commander</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article key={step.title} className="rounded-2xl border border-border/35 bg-background/70 p-4 sm:p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-xl text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
