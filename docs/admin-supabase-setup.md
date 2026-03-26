# Panel admin, comptes et Supabase Storage

## 1. Rôle du panel

- URL : `/admin` (protégé par middleware + cookie JWT).
- Connexion : `/admin/login`.
- **OWNER / EDITOR** : création / édition / archivage des parfums, marques, upload d’images (si Storage configuré).
- **VIEWER** : lecture seule (liste + fiches sans mutation).

Le catalogue public lit toujours la base via `getCatalogPerfumes()` : seuls les parfums `PUBLISHED` et non supprimés (`deletedAt` vide) apparaissent sur le site.

---

## 2. Configurer Supabase Storage (images 1024×1536)

Les visuels peuvent rester des chemins `/parfums/…` (fichiers dans `public/`) ou des **URLs complètes** pointant vers Supabase. Le format **1024×1536** (portrait) convient bien aux cartes ; pas de redimensionnement obligatoire côté app pour l’instant.

### Étape A — Créer un bucket

1. Dashboard Supabase → **Storage** → **New bucket**.
2. Nom : `catalog` (ou autre, alors définissez `SUPABASE_STORAGE_BUCKET` avec le même nom).
3. **Public bucket** : **oui** si vous voulez des URLs stables du type  
   `https://<projet>.supabase.co/storage/v1/object/public/catalog/perfumes/…`  
   utilisées dans le champ `image` / `imageLight` / `imageDark` et affichées avec `next/image` (déjà autorisé via `next.config.mjs` si `NEXT_PUBLIC_SUPABASE_URL` est défini au build).

### Étape B — Politiques (RLS)

Avec un bucket **public**, la **lecture** est ouverte via l’URL publique.  
L’**écriture** ne doit **pas** être ouverte au public : le panel utilise la **clé service role** uniquement côté serveur (`/api/admin/storage/sign`) pour générer une **URL d’upload signée** (valide ~2 h). Les utilisateurs anonymes ne peuvent pas uploader sans passer par une session admin valide.

En pratique, la **service role** contourne RLS pour les appels serveur : gardez `SUPABASE_SERVICE_ROLE_KEY` **uniquement** sur Vercel / serveur, jamais dans le front.

### Étape C — Variables d’environnement

| Variable | Où | Rôle |
|----------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | URL du projet ; sert aux URLs publiques et au pattern `next/image`. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Serveur seulement** | Client admin Storage + signature d’upload. |
| `SUPABASE_STORAGE_BUCKET` | optionnel | Défaut `catalog`. |

Après modification de `NEXT_PUBLIC_SUPABASE_URL`, **rebuild** le site (Vercel redéploie) pour que `next.config.mjs` régénère les `remotePatterns` d’images.

### Étape D — Flux dans le panel

1. L’admin choisit un fichier (jpg / png / webp / gif).
2. Le navigateur appelle `POST /api/admin/storage/sign` (cookie de session).
3. La réponse contient `signedUrl`, `token`, `publicUrl`.
4. Le navigateur envoie le fichier en `PUT` sur `signedUrl` (avec en-têtes indiqués par l’API Supabase).
5. Le champ **Image principale** est rempli avec `publicUrl`.

Sans Storage configuré, vous pouvez toujours coller une URL absolue ou un chemin `/parfums/…`.

---

## 3. Créer un compte admin (local)

Prérequis : `DATABASE_URL` dans `.env.local`, schéma à jour (`npm run db:push`), tables créées.

```bash
npm run admin:create-user -- votre@email.com "MotDePasseTrèsLong!"
```

Rôle par défaut : **OWNER**. Pour un lecteur seul :

```bash
npm run admin:create-user -- lecture@email.com "MotDePasseTrèsLong!" VIEWER
```

Puis définissez `ADMIN_JWT_SECRET` (≥ 24 caractères), redémarrez `npm run dev`, ouvrez `/admin/login`.

---

## 4. Variables à renseigner sur Vercel

Dans **Project → Settings → Environment Variables** (Production / Preview selon vos besoins) :

| Variable | Obligatoire pour | Note |
|----------|------------------|------|
| `DATABASE_URL` | Catalogue + admin | Session pooler Supabase recommandé + `?sslmode=require`. |
| `ADMIN_JWT_SECRET` | Connexion `/admin` | Secret long et aléatoire. |
| `ADMIN_DASHBOARD_SECRET` | `GET /api/admin/health` | Inchangé ; distinct du JWT. |
| `NEXT_PUBLIC_SUPABASE_URL` | Images Storage + build `next/image` | URL projet Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Upload admin | **Ne jamais** préfixer avec `NEXT_PUBLIC_`. |
| `SUPABASE_STORAGE_BUCKET` | Si bucket ≠ `catalog` | Optionnel. |

Après ajout ou changement des variables : **Redeploy** le projet.

---

## 5. Sécurité — rappels

- Ne commitez pas `.env.local`.
- Ne publiez pas la **service role** Supabase.
- Préférez des mots de passe longs pour les comptes `AdminUser`.
- Le middleware refuse l’accès aux pages `/admin` sans JWT valide ; les routes `/api/admin/*` (sauf `login`) vérifient la même session.
- La limite de débit sur `POST /api/admin/login` limite les essais de mot de passe (best effort en mémoire sur une instance serverless).
