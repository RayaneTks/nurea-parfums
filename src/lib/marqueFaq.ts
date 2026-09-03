import { SITE_NAME, SITE_URL } from "@/lib/site";

export interface FaqEntry {
  question: string;
  answer: string;
}

const domain = SITE_URL.replace(/^https?:\/\//, "");

/**
 * Questions fréquentes de la page « La parfumerie ».
 *
 * Source unique : la page les affiche et `MarqueFaqJsonLd` en dérive le balisage
 * `FAQPage`. Les moteurs exigent que les questions déclarées soient visibles à
 * l'écran — les deux listes avaient divergé, la donnée structurée annonçait
 * quatre réponses dont deux n'existaient nulle part sur la page.
 */
export const MARQUE_FAQ: readonly FaqEntry[] = [
  {
    question: `Comment s'écrit correctement le nom ${SITE_NAME} ?`,
    answer: `L'orthographe officielle est « Nuréa » — un accent aigu sur le « e » — suivi de « Parfums » au pluriel.`,
  },
  {
    question: `Quel est le site officiel de ${SITE_NAME} ?`,
    answer: `Le site officiel est ${domain}. Vérifiez l'adresse dans votre navigateur : des noms et des orthographes proches circulent, et ce sont des acteurs distincts.`,
  },
  {
    question: "Le catalogue contient-il tout votre stock ?",
    answer:
      "Le site présente nos références principales. Si vous ne trouvez pas votre parfum habituel, demandez-le nous directement : les arrivages sont fréquents.",
  },
  {
    question: "Comment passer commande ?",
    answer:
      "Envoyez-nous le parfum souhaité sur Snapchat. Nous confirmons le prix et la disponibilité, puis nous convenons ensemble de la remise ou de l'envoi.",
  },
] as const;
