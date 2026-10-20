# Nuréa Parfums — Product Context

## Register

`brand`

Site vitrine catalogue. Le design EST le produit : l'expérience doit transmettre luxe, confiance et désir d'achat avant le premier message sur Snapchat.

## Target Users

- Clients francophones cherchant des parfums de luxe (Louis Vuitton, Tom Ford, niche, Cartier, classiques)
- Mobile-first : la majorité découvre et contacte via smartphone
- Attentes : catalogue clair, recherche rapide, contact direct sans friction

## Product Purpose

Permettre de parcourir une centaine de références d'une quarantaine de marques, filtrer par marque ou catégorie, consulter une fiche parfum, garder ses parfums dans **« Ma sélection »** (liste gardée sur l'appareil, sans compte, commandée en un seul message), puis écrire à la parfumerie — sur Snapchat, seul canal ouvert (WhatsApp est annoncé « bientôt », jamais présenté comme cliquable tant que le numéro n'existe pas), ou par le formulaire.

Le site ne vend pas en ligne : ni panier, ni paiement, ni compte client. Le prix se donne dans l'échange, jamais en grille.

## Ce que reçoit le client

Le parfum est remis dans un **flacon Nuréa personnalisé**, à l'étiquette de la marque Nuréa — monogramme, nom, concentration, contenance. **Aucune contenance n'est affichée sur la vitrine** (décision du 20/10/2026) : le volume se discute sur Snapchat, comme le prix. Les photographies du catalogue, réalisées par Nuréa Parfums, montrent les flacons d'origine des marques pour qu'on reconnaisse la référence : **ce ne sont pas les flacons livrés**, et le site le dit là où l'on regarde un flacon (voir `DESIGN.md` § Mentions).

## Brand Personality

- **Calme et précise** : une chambre neutre, chaude, en clair comme en sombre ; la seule couleur est celle du flacon regardé (couleur d'ambiance, voir `DESIGN.md`)
- **Intime et personnel** : sélection curatée, pas marketplace impersonnelle
- **Français, sobre** : copy directe, pas de marketing agressif
- **Tangible** : les flacons et marques sont les héros visuels ; l'écran répond au doigt comme un objet
- **Signée** : logo et monogramme (ivoire sur sombre, noir sur clair) ; le flacon Nuréa se dit, il ne se montre pas

## Vocabulaire

**Marque · Parfum · Ligne · Contenance · Catalogue.** Jamais « Maison », « Galerie », « Sillage ». Les boutons disent un verbe et un objet : « Commander sur Snapchat », « Écrire à Nuréa ».

## Anti-References

- Gradients violet/bleu "AI SaaS", texte en dégradé
- Grande phrase + deux boutons + photo assombrie en ouverture
- Trois cartes identiques en ligne pour les features
- Eyebrows creuses (`DÉCOUVRIR`, `NOTRE SÉLECTION`)
- Inter, Roboto, Arial, Open Sans, Lato, Montserrat, Poppins
- Spinners génériques, verre dépoli partout (deux surfaces au plus)
- `h-screen` au lieu de `min-h-[100dvh]`
- `transition: all` sur les interactions

## Strategic Design Principles

1. **Le parfum est la star** : images produit nettes, UI en retrait, sa teinte colore la fiche
2. **Mobile d'abord** : zone du pouce, barre de commande fixe, filtres en feuille
3. **Conversion = contact** : depuis une fiche, message Snapchat prêt en 2 gestes ; depuis l'accueil, en 4
4. **Jamais d'impasse** : un parfum absent du catalogue donne une invitation à écrire, jamais « aucun résultat »
5. **Pas de look "généré par IA"** : tenu par `tests/architecture/anti-slop.test.ts`

## Accessibility

- Contraste WCAG 2.2 AA minimum, calculé y compris sur la couleur d'ambiance
- `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast` respectés
- Navigation clavier et focus rings visibles
- Alt text sur toutes les images produit

## Language

Interface et copy en **français**. L'agent répond en français sauf demande contraire.

---

## Registre admin (`product`)

L'espace d'administration utilise un registre distinct **`product`** (efficacité opérationnelle, PWA iOS, bordeaux `#7B0B1D`). Ne pas appliquer les tokens ou le ton vitrine `brand` à l'admin.

- Contexte produit : [`docs/admin/PRODUCT.md`](docs/admin/PRODUCT.md)
- Design system : [`docs/admin/DESIGN.md`](docs/admin/DESIGN.md)
