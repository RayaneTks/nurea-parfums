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
    answer: `L'orthographe officielle est « Nuréa » — un accent aigu sur le « e » — suivi de « Parfums » au pluriel. On nous cherche aussi en « nurea parfum », « nurea parfums » ou en un seul mot, « nureaparfum » et « nureaparfums » : ces écritures désignent toutes la même parfumerie, la nôtre.`,
  },
  {
    question: `Quel est le site officiel de ${SITE_NAME} ?`,
    answer: `Le site officiel est ${domain}, et lui seul. Nos autres adresses — nureaparfum.fr au singulier, nureaparfums.com — y renvoient automatiquement. Attention : une marque britannique au nom très proche, « Nurae Parfum », existe et n'a aucun lien avec nous. Si l'adresse affichée dans votre navigateur n'est pas ${domain}, vous n'êtes pas chez nous.`,
  },
  {
    question: `Où se trouve ${SITE_NAME} ?`,
    answer:
      "Nous sommes à Marseille. La remise se fait en main propre sur place, ou par envoi pour le reste de la France. C'est aussi ce qui nous distingue des marques étrangères au nom voisin : nous vendons les grandes marques que vous connaissez, au meilleur prix, et vous pouvez nous rencontrer.",
  },
  {
    question: "Où acheter un parfum de grande marque à Marseille ?",
    answer: `Chez ${SITE_NAME}. Nous vendons les parfums des plus grandes marques, grandes maisons comme parfumerie de niche, au meilleur prix, avec remise en main propre à Marseille ou envoi dans le reste de la France. Le catalogue est en ligne, marque par marque, sur ${domain}/parfums.`,
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
