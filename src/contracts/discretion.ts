/**
 * Mode discret — montrer l'app sans montrer ce qu'elle contient.
 *
 * Le gérant montre parfois Nuréa Gestion : à un fournisseur, à un ami, à quelqu'un qui envisage la
 * même chose. Il veut faire voir les écrans, les gestes, la vitesse — pas son chiffre d'affaires ni
 * le nom de ses clients. Ce mode brouille les deux, et rien d'autre : la structure reste lisible,
 * les parfums restent nommés, l'app reste utilisable.
 *
 * **Un réglage de CET APPAREIL, pas de l'entreprise.** Il vit dans un cookie, comme le témoin de
 * session : le brouillage est décidé au rendu, il n'entre jamais en base et ne change aucun chiffre.
 * Deux téléphones peuvent donc être dans deux états différents, ce qui est exactement le besoin —
 * on le met avant de tendre son téléphone, on l'enlève après.
 *
 * **Pourquoi un cookie et pas `localStorage`** : la moitié des montants sont rendus par le serveur
 * (des composants serveur). Un témoin lu côté client seulement arriverait après le premier rendu,
 * et les chiffres apparaîtraient une fraction de seconde avant d'être cachés — le temps d'être vus.
 *
 * **Ce que ce mode ne prétend PAS être.** Ce n'est pas un chiffrement ni un contrôle d'accès : les
 * valeurs restent dans la page, un œil averti les retrouverait dans les outils du navigateur. C'est
 * un cache posé sur un écran qu'on tend à quelqu'un, et c'est tout ce qu'il promet. Ce qui protège
 * réellement les données reste la connexion.
 */

/** Témoin de l'appareil. Même préfixe que les autres cookies de la gestion. */
export const DISCRET_COOKIE = "nurea_discret";

/** Posé sur la racine du shell ; toute la feuille de style s'y accroche. */
export const DISCRET_ATTRIBUTE = "data-discret";

/**
 * Marque d'un élément à brouiller. Portée par les montants (`Money`, donc TOUS les montants de
 * l'app d'un seul coup) et par les noms de clients, là où ils s'affichent.
 *
 * Le marquage est un attribut STATIQUE : il ne dépend pas de l'état du mode. C'est ce qui permet au
 * même composant de servir au serveur comme au client sans connaître le réglage — seule la racine
 * le connaît, et la cascade fait le reste.
 */
export const SECRET_ATTRIBUTE = "data-secret";

/** Les deux familles brouillées, pour que le réglage puisse dire ce qu'il cache. */
export const DISCRET_DESCRIPTION = "Brouille les montants et les noms de clients, sur cet appareil seulement.";

export function estDiscret(valeurDuCookie: string | undefined): boolean {
  return valeurDuCookie === "1";
}
