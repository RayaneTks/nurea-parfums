# Nuréa Parfums — Product Context

## Register

`brand`

Site vitrine catalogue. Le design EST le produit : l'expérience doit transmettre luxe, confiance et désir d'achat avant tout contact Snapchat/WhatsApp.

## Target Users

- Clients francophones cherchant des parfums de luxe (Louis Vuitton, Tom Ford, niche, Cartier, classiques)
- Mobile-first : la majorité découvre et contacte via smartphone
- Attentes : catalogue clair, recherche rapide, contact direct sans friction

## Product Purpose

Permettre de parcourir 200+ références, filtrer par marque/catégorie, consulter une fiche produit, puis contacter la marque via Snapchat ou WhatsApp.

## Brand Personality

- **Luxueux** sans ostentation : or discret, fond sombre, typographie serif élégante
- **Intime et personnel** : sélection curatée, pas marketplace impersonnelle
- **Français, raffiné** : copy sobre, pas de marketing agressif
- **Tangible** : les flacons et marques sont les héros visuels

## Anti-References

- Gradients violet/bleu "AI SaaS"
- Fond crème/beige + accents laiton (palette premium-consumer générique)
- Trois cartes identiques en ligne pour les features
- Eyebrows uppercase sur chaque section (`DÉCOUVRIR`, `NOTRE SÉLECTION`)
- Em-dash (`—`) dans les textes
- Inter comme police par défaut
- Spinners génériques, cartes blanches avec ombre noire
- `h-screen` au lieu de `min-h-[100dvh]`
- `transition: all` sur les interactions

## Strategic Design Principles

1. **Le parfum est la star** : images produit nettes, UI en retrait
2. **Mobile d'abord** : catalogue scrollable, barre contact fixe, filtres accessibles
3. **Conversion = contact** : CTAs Snapchat/WhatsApp visibles sans scroll excessif
4. **Luxe par le détail** : micro-interactions, transitions courtes (Emil), pas de surcharge
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
