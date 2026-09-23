import { SECRET_ATTRIBUTE } from "@/contracts/discretion";

/**
 * Le nom d'un client, à l'écran.
 *
 * Existe pour une seule raison : porter la marque du mode discret
 * (`src/contracts/discretion.ts`). Un montant est toujours rendu par `Money`, donc une marque y
 * suffit ; un nom de client, lui, s'écrit à trente endroits — en titre de section, en rangée de
 * liste, en en-tête de fiche. Cette brique est l'endroit unique où il porte sa marque.
 *
 * Ce qu'elle ne fait PAS : décider. Elle marque, la racine du shell décide, la feuille de style
 * applique. Elle rend donc exactement le nom qu'on lui donne, mode actif ou non — et reste
 * utilisable au serveur comme au client.
 *
 * Ce qui n'est délibérément pas marqué : les noms de PARFUMS et de MARQUES. Montrer son catalogue
 * est justement ce qu'on veut faire en montrant l'app ; ce qu'on cache, c'est l'argent et les
 * personnes.
 */
export function NomClient({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span {...{ [SECRET_ATTRIBUTE]: "" }} className={className}>
      {children}
    </span>
  );
}
