# Refonte vitrine — ce qui ne change pas

Statut : socle de préparation du 20/10/2026. La **charte graphique v3** (noir + cuivre, angles 0,
aucune ombre, Newsreader + Instrument Sans) est **abandonnée** : plus aucune règle d'aspect n'en est
héritée. Ce document liste le reste — ce que la refonte doit préserver parce que ce sont des règles
de métier, de droit, de référencement ou de technique, pas de goût.

Tout ce qui est écrit ici est vérifiable : chaque ligne renvoie à son fichier ou à son test.

## 1. Métier

| Règle | Source |
|---|---|
| Le site **ne vend pas en ligne** : ni panier, ni paiement, ni compte client. | `PRODUCT.md` |
| **Jamais de prix en grille.** Le prix se donne dans l'échange. | `PRODUCT.md` |
| Le seul canal ouvert est **Snapchat**. WhatsApp est « bientôt » : jamais présenté comme cliquable tant que le numéro n'existe pas. Le formulaire de contact reste. | `ChannelSoon`, `OrderChannels` |
| Le bouton « Commander sur Snapchat » **copie le nom du parfum** et reste visible sans défiler (fiche, contact). | `SnapchatOrderButton` |
| Fiche produit : **marque / nom**, dans cet ordre. **Aucune contenance affichée sur la vitrine** (décision du gérant, 20/10/2026) : le volume se discute sur Snapchat. Une donnée absente est **omise**, jamais inventée. | `perfumePresentation.ts` |
| Un parfum ou une marque **sans visuel sombre est masqué** (statut brouillon). Un parfum masqué reste trouvable en recherche, avec invitation à écrire. | `catalogue-service.ts` |
| Le client reçoit son parfum en **flacon Nuréa personnalisé** de **10, 50 ou 80 ml**. Le flacon Nuréa ne se montre qu'en **photographie réelle** dans la hero de l'accueil (décision du gérant, 21/10/2026, brief `annexes/brief-photo-hero.md`) ; ailleurs, la mention seule. | `src/lib/mentions.ts` |
| **Le parfum Nuréa n'est pas le parfum de la marque** (pas de transvasement, gérant, 21/10/2026). Aucun texte n'affirme l'identité ou l'équivalence avec un parfum de marque : jamais « le même parfum », « identique », « équivalent ». Présenter un produit comme l'imitation d'un produit de marque peut constituer une publicité comparative illicite (C. conso., art. L122-2) : **toute accroche qui rapproche Nuréa d'un parfum de marque passe d'abord par un avis juridique** (signalé au gérant le 21/10, en attente). | décision du gérant |
| La recherche ne finit **jamais** dans le vide : un parfum connu mais absent du catalogue donne « vous cherchez X de Y ? écrivez-nous », demande pré-remplie. | `searchRepertoire.ts` |
| Une **ligne** de marque (La Collection Privée, Emporio Armani, Private Blend…) s'affiche « Marque · Ligne ». | `brandLineLabel` |

## 2. Mentions légales dues au client (une source, jamais recopiées)

- `MENTION_FLACONS` : les photos montrent le flacon d'origine de la marque ; le parfum est remis
  dans un flacon Nuréa. À dire **là où l'on regarde une photo de flacon** : fiche parfum, page
  Contact, La parfumerie, pied de page.
- `MENTION_PHOTOS` : photographies réalisées par Nuréa Parfums, reproduction interdite.
- Pages `/legal` : contenu juridique inchangé tant que le gérant ne l'a pas révisé.
- Identité : « Nuréa » **avec l'accent**. Le **logo et le monogramme** sont des actifs de marque, pas
  de la charte : leurs proportions ne changent jamais, pas de rotation, pas d'effet, jamais le
  monogramme nu sur une photo (version cerclée). *À confirmer par le gérant : ils sont conservés.*

## 3. Référencement (rien ne doit casser)

- URLs : `/parfums`, `/parfums/<slug-marque>`, `/parfums/<marque>/<nom>-<id>` — **l'identifiant fait
  foi** (nom corrigé → redirection 308). Toute adresse passe par `src/lib/seo/paths.ts`.
- Pages catalogue lues par `getSeoCatalogue()` **sans repli** : base injoignable = 500, jamais 404.
- Chaque page déclare sa **canonique** ; le layout n'en pose aucune. Pas de hreflang.
- `app/sitemap.ts` : `lastModified` seulement quand il est vrai. ~180 URL aujourd'hui.
- **Pas de balisage `Product`** tant qu'aucun prix n'est public. JSON-LD : toujours `jsonLdHtml()`.
- Le H1 de l'accueil porte « Nuréa Parfums ». « Marseille » n'y est plus exigé et ne s'écrit plus dans la
  copy de l'accueil (gérant, 21/10/2026 : acquisition par Snapchat, envois partout en France).
- Aperçu social : `opengraph-image.tsx` de chaque page (à reprendre dans la nouvelle DA).

## 4. Technique

| Contrainte | Pourquoi |
|---|---|
| Visuels **WebP**, conversion côté serveur. Ratio **2:3**. Original 1024×1536, **vignette 640×960** (`…-640.webp`). | L'optimiseur d'images de Vercel est **fermé** (quota épuisé le 22/09/2026) : le chargeur sert des fichiers prêts, il ne transforme rien. Un visuel plus grand que 1024 px de large n'existe pas. |
| Images bi-thème : `image` = variante sombre (obligatoire), `imageLight` facultative (129 fiches sur 193). Bascule **en CSS**, jamais via `useTheme`. | Grilles rendues côté serveur, aucun clignotement. Si la nouvelle DA est mono-thème, c'est une décision à écrire (cf. 03). |
| `blurDataURL` par fiche (placeholder). | Pas de saut de mise en page au chargement. |
| CSP stricte : `script-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:` + Supabase, `font-src 'self' data:`, `connect-src 'self'` + Supabase. | Aucune police, image ou script d'un autre domaine : **polices auto-hébergées** (`next/font`), pas de CDN, pas de widget tiers. |
| `useSearchParams()` toujours sous `<Suspense>`. | Sinon l'écran ne s'hydrate pas. |
| Deux registres CSS **disjoints** : seul `app/(shop)/layout.tsx` et la 404 importent `app/globals.css`. Rien de la gestion n'est touché. | `tests/architecture/css-registers.test.ts` |
| `ContentGuard` : friction contre le clic droit / glisser d'image, **pas** une sécurité. | `docs/SECURITE.md` |
| Frein de débit (recherche, contact), anti-robot silencieux du formulaire. | `src/lib/security/rate-limit.ts`, `src/lib/contact/guard.ts` |
| Pas d'écriture depuis la vitrine hors `src/actions/contact.ts`. | `tests/architecture/server-actions.test.ts` |
| Aperçu Vercel sans base = catalogue de démonstration (`demo-catalogue.json`), pas de grille vide. | `catalogue-service.ts` |

## 5. Accessibilité et confort (plancher, pas plafond)

WCAG 2.2 AA minimum ; cibles tactiles ≥ 44 px ; focus visible partout (`:focus-visible`, jamais
`outline: none` seul) ; `prefers-reduced-motion`, `prefers-reduced-transparency`,
`prefers-contrast` respectés ; zoom jamais bloqué, mise en page tenue à 200 % ; texte en `rem` ;
navigation clavier complète ; `<h1>` unique par page.

## 6. Filets automatiques qui bougeront avec la refonte

| Filet | Effet de la refonte |
|---|---|
| `tests/architecture/anti-slop.test.ts` (nouveau, 14 contrôles) | **Reste** : il refuse les tics d'interface générée (police par défaut, dégradé violet, texte en dégradé, `transition: all`, rebond, bordure latérale, noir/blanc purs, `h-screen`, ombres Tailwind d'origine, zoom bloqué, verre dépoli partout). Dérogation motivée : `slop-ok: <raison>`. |
| `tests/architecture/css-registers.test.ts` | Reste. |
| `e2e/catalog-filters.spec.ts` | Sélecteur `p.nurea-label` à réécrire avec la nouvelle structure. |
| `tests/architecture/contraste.test.ts` | Concerne les jetons de la **gestion** : inchangé. |
| `DESIGN.md`, `.impeccable.md`, `docs/charte-graphique.html` | **À réécrire en premier** (règle d'or du dépôt : le document amont avant le code). |

## 7. Ce qui peut changer, explicitement

Toute l'apparence : palette, typographie, grille, composants, mouvement, thème, formes, textures,
mise en page des pages éditoriales, composition de l'accueil, aperçus sociaux. Et le vocabulaire
« Marque / Catalogue / Parfum — éviter Maison, Galerie, Sillage » (règle de la charte v3, pas une
règle métier) si la nouvelle DA le demande. **Rien dans la gestion** (`app/admin`, `src/features`,
`src/ui`, `src/app-shell`) : registre distinct, hors périmètre.
