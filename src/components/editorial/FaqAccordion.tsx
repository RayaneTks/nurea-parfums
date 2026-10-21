import type { FC } from "react";
import type { FaqEntry } from "@/lib/marqueFaq";

/**
 * Questions fréquentes, repliées : on ouvre celle qui nous concerne. `<details>` le fait sans
 * JavaScript, au clavier comme au doigt, et garde les réponses dans le document — les moteurs les
 * lisent, et le balisage FAQPage reste valide (`MarqueFaqJsonLd`). La ligne entière est la cible,
 * 44 px au moins ; le « + » tourne en « × » à l'ouverture.
 */
export const FaqAccordion: FC<{ entries: readonly FaqEntry[] }> = ({ entries }) => (
  <div className="border-t border-line">
    {entries.map(({ question, answer }) => (
      <details key={question} className="group border-b border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-6 py-4 text-fg-1 [&::-webkit-details-marker]:hidden">
          <span className="t-body font-medium text-fg-1 underline-offset-4 decoration-accent decoration-1 mouse-hover:underline">
            {question}
          </span>
          <span
            aria-hidden="true"
            className="t-subtitle shrink-0 leading-none text-accent transition-transform duration-dur-2 ease-soft group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <p className="t-body t-measure pb-6">{answer}</p>
      </details>
    ))}
  </div>
);
