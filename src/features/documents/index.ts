// Fiche document (06 S01) et ses sheets d'action (S02, S03, S04), partagées par les écrans du shell.
export { DocumentSheetSlot } from "./blocks/DocumentSheetSlot";
export { firstParam, type PageSearchParams } from "./pages/params";

/*
 * Ce baril tire `DocumentSheetSlot`, un composant SERVEUR : il ne s'importe que depuis une page ou un
 * bloc. S07 (`components/BatchPicker`), que la rangée « Lot » de E05 zone 0 réutilise, s'importe par
 * son chemin direct — l'ajouter ici ferait entrer tout `src/server` dans le paquet de l'appareil.
 */
