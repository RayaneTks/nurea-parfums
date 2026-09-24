import { SITE_NAME } from "@/lib/site";

/**
 * Les mentions que le site doit tenir partout de la même façon.
 *
 * Source unique : une mention d'information client qui se dit de trois façons
 * sur trois pages finit par se contredire sur l'une d'elles.
 */

/**
 * Ce que montrent les photographies, et ce que le client reçoit.
 *
 * Les photos du catalogue présentent les flacons d'origine des marques, pour
 * qu'on reconnaisse la référence. Le parfum est remis dans un flacon Nuréa
 * personnalisé — l'étiquette décrite par la charte (§ 06). Le dire au moment où
 * l'on regarde la photo évite qu'un client s'attende à recevoir le flacon
 * photographié.
 */
export const MENTION_FLACONS =
  "Photo : le flacon d'origine de la marque, pour reconnaître la référence. Votre parfum vous est remis dans un flacon Nuréa personnalisé.";

/** La même, en une ligne, pour les emplacements étroits (pied de page). */
export const MENTION_FLACONS_COURTE = "Parfums remis dans nos flacons Nuréa personnalisés.";

/** Les photographies du site sont l'œuvre de la marque. */
export const MENTION_PHOTOS = `Photographies réalisées par ${SITE_NAME}. Reproduction interdite sans accord écrit.`;
