# Nuréa Parfums — Product Context

## Register

`brand`

Site vitrine catalogue. Le design EST le produit : l'expérience doit transmettre luxe, confiance et désir d'achat avant le premier message sur Snapchat.

## Target Users

- Clients francophones cherchant des parfums de luxe (Louis Vuitton, Tom Ford, niche, Cartier, classiques)
- Mobile-first : la majorité découvre et contacte via smartphone
- Attentes : catalogue clair, recherche rapide, contact direct sans friction

## Product Purpose

Permettre de parcourir une centaine de références d'une quarantaine de marques, filtrer par marque ou catégorie, consulter une fiche parfum, puis écrire à la parfumerie — sur Snapchat, seul canal ouvert (WhatsApp est annoncé « bientôt », jamais présenté comme cliquable tant que le numéro n'existe pas), ou par le formulaire.

Le site ne vend pas en ligne : ni panier, ni paiement, ni compte client. Le prix se donne dans l'échange, jamais en grille.

## Ce que reçoit le client

Le parfum est remis dans un **flacon Nuréa personnalisé** (10, 50 ou 80 ml), à l'étiquette de la marque Nuréa — monogramme, nom, concentration, contenance. Les photographies du catalogue, réalisées par Nuréa Parfums, montrent les flacons d'origine des marques pour qu'on reconnaisse la référence : **ce ne sont pas les flacons livrés**, et le site le dit là où l'on regarde un flacon (voir `DESIGN.md` § Mentions).

## Brand Personality

- **Luxueux** sans ostentation : cuivre discret, fond noir, serif à faible contraste
- **Intime et personnel** : sélection curatée, pas marketplace impersonnelle
- **Français, raffiné** : copy sobre, pas de marketing agressif
- **Tangible** : les flacons et marques sont les héros visuels
- **Signée** : le monogramme et le sceau bordeaux sont la signature de la marque ; le flacon Nuréa se dit, il ne se montre pas

## Anti-References

- Gradients violet/bleu "AI SaaS"
- Fond crème/beige + accents laiton (palette premium-consumer générique)
- Trois cartes identiques en ligne pour les features
- Eyebrows creuses (`DÉCOUVRIR`, `NOTRE SÉLECTION`) — l'étiquette de la charte
  (`.nurea-label`) nomme la section, elle ne l'annonce pas
- Inter comme police par défaut
- Spinners génériques, cartes blanches avec ombre noire
- `h-screen` au lieu de `min-h-[100dvh]`
- `transition: all` sur les interactions

## Strategic Design Principles

1. **Le parfum est la star** : images produit nettes, UI en retrait
2. **Mobile d'abord** : catalogue scrollable, barre contact fixe, filtres accessibles
3. **Conversion = contact** : l'appel Snapchat visible sans défiler, sur la fiche parfum comme sur la page Contact
4. **Luxe par la retenue** : une seule transition, 160 ms sur la couleur ; ni ombre, ni arrondi (voir `DESIGN.md`)
5. **Pas de look "généré par IA"** : éviter les tells listés dans les skills taste/impeccable

## Accessibility

- Contraste WCAG AA minimum (or sur fond sombre vérifié)
- `prefers-reduced-motion` respecté
- Navigation clavier et focus rings visibles
- Alt text sur toutes les images produit

## Language

Interface et copy en **français**. L'agent répond en français sauf demande contraire.

---

## Registre admin (`product`)

L'espace d'administration utilise un registre distinct **`product`** (efficacité opérationnelle, PWA iOS, bordeaux `#7B0B1D`). Ne pas appliquer les tokens ou le ton vitrine `brand` à l'admin.

- Contexte produit : [`docs/admin/PRODUCT.md`](docs/admin/PRODUCT.md)
- Design system : [`docs/admin/DESIGN.md`](docs/admin/DESIGN.md)
