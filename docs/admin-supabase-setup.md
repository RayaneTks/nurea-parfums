# Gestion — compte, Supabase Storage et variables

Mis à jour le 24/09/2026, après la refonte (bascule du 22/09/2026). La version précédente
décrivait l'ancienne gestion — rôles OWNER / EDITOR / VIEWER, `middleware.ts`, routes
`/api/admin/*` d'écriture, `db:push` — qui n'existe plus.

Architecture de l'authentification : [`docs/refonte/04-ARCHITECTURE.md`](refonte/04-ARCHITECTURE.md)
§ 8. Sécurité d'ensemble : [`docs/SECURITE.md`](SECURITE.md).

## 1. Accès

- Adresse : `/admin`, connexion sur `/admin/login`. **Un seul compte, sans rôle.**
- Garde optimiste dans `proxy.ts` (redirection vers la connexion), garde d'autorité dans
  `requireSession`, appelée par construction dans chaque action, lecture et route de la gestion.
- Session : jeton signé HS256 dans un cookie `httpOnly`, `secure`, `SameSite=Lax`, 7 jours,
  renouvelé en glissant.
- Essais de connexion : verrou progressif par compte (en base), plus un frein de 20 essais par quart
  d'heure et par adresse (`src/server/auth/throttle.ts`).

## 2. Créer le compte, ou en changer le mot de passe

```bash
npm run admin:create-user -- <identifiant> <mot-de-passe> --confirm-host <hôte-de-la-base>
```

Le script lit `.env.local`, qui désigne la **production** : il refuse d'y écrire sans
`--confirm-host` reproduisant exactement l'hôte de la base. Mot de passe de 10 caractères au moins.
Relancé sur un compte existant, il remplace le mot de passe et lève le verrou de connexion.

## 3. Supabase Storage

1. Un bucket **`catalog`** (ou un autre nom, alors `SUPABASE_STORAGE_BUCKET` le dit), **public en
   lecture** : les visuels de la vitrine sont des URL publiques stables.
2. **Aucune écriture publique.** L'application n'expose aucune clé Supabase au navigateur. Un envoi
   de visuel passe par une server action qui, session vérifiée, demande à Supabase une URL d'envoi
   signée avec la clé de service (`src/server/catalogue/storage.ts`) ; le navigateur envoie le
   fichier sur cette URL, rien d'autre.
3. À vérifier dans la console Supabase (le code ne peut pas le faire) : les politiques du bucket
   n'ouvrent pas l'écriture aux utilisateurs anonymes.

Les visuels sont convertis en WebP côté serveur (`src/server/catalogue/webp.ts`) — l'iPhone n'encode
pas le WebP — au cadre 1024 × 1536 pour les parfums.

## 4. Variables d'environnement (Vercel)

Validées au démarrage par `src/server/env.ts` ; une variable manquante fait répondre la gestion
« Configuration serveur incomplète » sans faire tomber la vitrine.

| Variable | Rôle |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Base PostgreSQL (Supabase). |
| `ADMIN_JWT_SECRET` | Signature des sessions — 24 caractères au moins. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet : visuels, `next/image`, CSP. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Serveur seulement**, jamais préfixée `NEXT_PUBLIC_`. |
| `SUPABASE_STORAGE_BUCKET` | Facultative, `catalog` par défaut. |
| `NUREA_GESTION_MAINTENANCE` | `1` : la gestion répond 503 sans lire la base. |

`ADMIN_DASHBOARD_SECRET` n'est plus lue par aucun code : elle peut être retirée de Vercel.

Après un changement de `NEXT_PUBLIC_SUPABASE_URL`, redéployer : `next.config.mjs` en dérive les
hôtes d'images autorisés et la politique de sécurité du contenu.
