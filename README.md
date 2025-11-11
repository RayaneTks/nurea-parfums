# Nuréa Parfums

Site web catalogue pour Nuréa Parfums - Sélection de parfums de luxe et grands classiques.

## À propos

Nuréa Parfums est un catalogue en ligne présentant une sélection exclusive de parfums de luxe, des grandes marques aux créations de niche. Le site permet aux clients de découvrir notre collection, de rechercher des parfums par marque ou catégorie, et de nous contacter directement via Snapchat ou WhatsApp.

## Technologies utilisées

- **React** 18.3.1 - Bibliothèque UI
- **TypeScript** - Typage statique
- **Vite** - Build tool et dev server
- **Tailwind CSS** - Framework CSS utility-first
- **shadcn/ui** - Composants UI
- **React Router** - Navigation
- **Lucide React** - Icônes

## Installation

### Prérequis

- Node.js 18+ et npm
- Git

### Installation des dépendances

```bash
npm install
```

## Développement

Lancer le serveur de développement :

```bash
npm run dev
```

Le site sera accessible sur `http://localhost:5173`

## Build de production

Générer le build de production :

```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist/`.

## Prévisualisation du build

Pour prévisualiser le build de production :

```bash
npm run preview
```

## Structure du projet

```
nurea-parfums/
├── public/          # Fichiers statiques
├── src/
│   ├── assets/      # Images et logos
│   ├── components/  # Composants React
│   ├── config/      # Configuration (contact, etc.)
│   ├── data/        # Données des parfums
│   ├── hooks/       # React hooks personnalisés
│   ├── lib/         # Utilitaires
│   ├── pages/       # Pages de l'application
│   └── index.css    # Styles globaux
├── index.html       # Point d'entrée HTML
└── package.json     # Dépendances et scripts
```

## Configuration

### Liens de contact

Les liens Snapchat et WhatsApp sont configurés dans `src/config/contact.ts`. 

**Important** : Modifiez les URLs avant la mise en production :
- Remplacez `username` par votre username Snapchat
- Remplacez `33XXXXXXXXX` par votre numéro WhatsApp (format: code pays + numéro, sans le +)

## Fonctionnalités

- 🎨 Design premium inspiré des marques de luxe
- 📱 Mobile-first, responsive
- 🔍 Recherche en temps réel de parfums
- 🏷️ Filtres par catégorie et marque
- 💬 Contact direct via Snapchat et WhatsApp
- 📋 Catalogue complet avec plus de 200 parfums
- 🎯 Fiches détaillées pour chaque parfum

## Données des parfums

Les données des parfums sont stockées dans `src/data/perfumes.ts`. La structure permet d'ajouter facilement de nouveaux parfums :

```typescript
{
  id: string;
  name: string;
  brand: string;
  category: string;
  tags?: string[];
  price?: string;
  availableSizes?: number[];
}
```

## Déploiement

Le site peut être déployé sur n'importe quelle plateforme supportant les sites statiques :
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## Licence

Propriété de Nuréa Parfums - Tous droits réservés.

## Contact

Pour toute question, contactez-nous via :
- Snapchat : [Votre username]
- WhatsApp : [Votre numéro]
