# Provenance des skills du dépôt

Les skills de ce dossier sont des **copies figées, texte seulement** (aucun script, aucun hook, aucun
binaire). Ils sont lus à la demande par les agents (voir `AGENTS.md`, « Quel skill pour quelle tâche »),
pas exécutés. Copiés le **20/10/2026** depuis les archives GitHub aux versions ci-dessous, après lecture et
recherche de consignes cachées ou de commandes dangereuses.

Pour mettre à jour un skill : lire le diff amont, remplacer les fichiers, changer la ligne ci-dessous.
Ne jamais installer ces projets par leur installeur (`npx …`) : il ajoute des hooks qui exécutent du code.

| Skill | Amont | Version (commit) | Licence | Apport | Empreinte SKILL.md |
|---|---|---|---|---|---|
| `frontend-ui-engineering` | addyosmani/agent-skills | `aeac41d` | MIT | Interfaces de production : jetons, états, responsive, accessibilité | `29a3e53d57c0a128` |
| `performance-optimization` | addyosmani/agent-skills | `aeac41d` | MIT | Mesurer d'abord, puis optimiser (Core Web Vitals, bundle, réseau) | `bd36a30e55a5f843` |
| `code-review-and-quality` | addyosmani/agent-skills | `aeac41d` | MIT | Revue de code multi-axes | `2db1e850379f255f` |
| `code-simplification` | addyosmani/agent-skills | `aeac41d` | MIT | Simplifier sans changer le comportement | `f0c5ed754057eb0c` |
| `debugging-and-error-recovery` | addyosmani/agent-skills | `aeac41d` | MIT | Débogage par cause racine | `21f3960f5d7ae2cc` |
| `security-and-hardening` | addyosmani/agent-skills | `aeac41d` | MIT | Durcissement web (entrées, secrets, SSRF, en-têtes) | `2e3fc60eed5aba97` |
| `accessibility` | addyosmani/web-quality-skills | `afa8da9` | MIT | Accessibilité WCAG, vérifications chiffrées | `267fb2a0707d6142` |
| `core-web-vitals` | addyosmani/web-quality-skills | `afa8da9` | MIT | LCP, INP, CLS : seuils et corrections | `731aa78c0347e8b3` |
| `performance` | addyosmani/web-quality-skills | `afa8da9` | MIT | Performance de chargement (Lighthouse) | `b0c220185d88c61f` |
| `seo` | addyosmani/web-quality-skills | `afa8da9` | MIT | SEO technique | `57cd16566c2c7061` |
| `best-practices` | addyosmani/web-quality-skills | `afa8da9` | MIT | Sécurité et bonnes pratiques navigateur | `9d1f10a08cd7a941` |
| `web-quality-audit` | addyosmani/web-quality-skills | `afa8da9` | MIT | Audit qualité complet (le script d'analyse n'est PAS repris) | `1903cfb4dcba987d` |
| `emil-design-eng` | emilkowalski/skills | `2d22863` | MIT | Design engineering : goût, mouvement, finitions | `ffbe68e6007fb42c` |
| `review-animations` | emilkowalski/skills | `2d22863` | MIT | Revue d'animations | `6ff590d29e436766` |
| `animation-performance` | emilkowalski/skills | `2d22863` | MIT | Animer sans perdre d'images | `ceb9dd3fe9126158` |
| `break-ui` | emilkowalski/skills | `2d22863` | MIT | Casser l'interface avec des données extrêmes | `e7eec1d70ac56a04` |
| `web-design-guidelines` | vercel-labs/agent-skills + vercel-labs/web-interface-guidelines | `063bee94c3f4df8453406c830b0a7df0f2860278 + 434b7f91364665f2f733b310ec54809bf8f37937` | MIT | Revue d'interface contre ~100 règles ; règles copiées en local (aucune requête réseau) | `1bfd0931ac5c133a` |
| `vercel-react-best-practices` | vercel-labs/agent-skills | `063bee9` | MIT | 70 règles de performance React / Next.js | `71ed7794962fa6e8` |
| `ponytail` | DietrichGebert/ponytail | `09c434a` | MIT | Plus petit changement qui résout vraiment le problème | `9badd22a32e19cb8` |
| `ponytail-review` | DietrichGebert/ponytail | `09c434a` | MIT | Revue d'un changement | `33fe4ebe22a46092` |
| `ponytail-audit` | DietrichGebert/ponytail | `09c434a` | MIT | Audit de tout le dépôt | `2b3223a02c386d12` |
| `ponytail-debt` | DietrichGebert/ponytail | `09c434a` | MIT | Registre des raccourcis différés | `b5ec2762f6ba8c4a` |
| `caveman` | JuliusBrussee/caveman | `bad48a0` | voir LICENSE amont | Style de réponse très bref | `415d43518f2b1a94` |
| `graphify` | installation locale ~/.claude/skills/graphify | `(copie du 20/10/2026)` | voir graphifyy amont | Carte du code : requêtes, chemins, explications | `c97cb41e68a3c63a` |

## Non repris, volontairement

- `web-quality-audit` : scripts\analyze.sh
- `vercel-react-best-practices` : AGENTS.md, metadata.json, README.md, rules\_sections.md, rules\_template.md

- `impeccable` v4 : son installeur ajoute un hook qui télécharge puis exécute un binaire à chaque modification de fichier, avec télémétrie active par défaut.
- MCP Playwright et Chrome DevTools : doublons du navigateur intégré et de Playwright du dépôt.
- Scripts : `web-quality-audit/scripts/analyze.sh` et tout ce qui n'est pas du texte.

Les autres dossiers de `.agents/skills/` (famille « impeccable » v1, oh-my-claudecode) sont des outils locaux du poste, hors dépôt.
