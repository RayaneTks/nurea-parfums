import type { FC } from "react";
import type { FaqEntry } from "@/lib/marqueFaq";

/**
 * Questions fréquentes, repliées.
 *
 * Cinq réponses dépliées faisaient un mur de texte au milieu de la page. Repliées,
 * elles se lisent comme une table des matières : on ouvre celle qui nous
 * concerne. `<details>` le fait sans une ligne de JavaScript, au clavier comme
 * au doigt, et garde les réponses dans le document — les moteurs les lisent, et
 * le balisage FAQPage reste valide (`MarqueFaqJsonLd`).
 *
 * La ligne entière est la cible : 44 px au minimum (charte § 05).
 */
export const FaqAccordion: FC<{ entries: readonly FaqEntry[] }> = ({ entries }) => (
  <div className="border-t border-nurea-border">
    {entries.map(({ question, answer }) => (
      <details key={question} className="nurea-faq group border-b border-nurea-border">
        <summary className="flex min-h-11 items-start justify-between gap-6 py-6 transition-colors duration-nurea ease-out hover:text-nurea-accent">
          <span className="nurea-name">{question}</span>
          <span aria-hidden className="nurea-faq-signe nurea-name shrink-0 text-nurea-accent">
            +
          </span>
        </summary>
        <p className="nurea-body nurea-prose pb-8">{answer}</p>
      </details>
    ))}
  </div>
);
