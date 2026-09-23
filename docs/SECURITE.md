# Sécurité — Nuréa Parfums

Réponse à la note technique « Audit de surface d'attaque — nureaparfums.fr » du 23/09/2026
(boîte noire : miroir wget + vérifications HTTP en direct).

Ce document dit ce qui est **fait dans le code**, ce qui **reste à faire hors du code**, et ce qu'on
a décidé de **ne pas faire** — avec la raison. Un document de sécurité qui promet ce que le code ne
fait pas est pire qu'aucun document : il endort.

---

## 1. Les cinq constats de l'audit

| # | Constat | Gravité | État |
|---|---|---|---|
| 1 | Aucun en-tête de sécurité applicatif | élevé | **corrigé** |
| 2 | `robots.txt` publiait l'adresse du back-office | moyen | **corrigé** |
| 3 | `/api/perfume-search` sans limite de débit | moyen | **corrigé** |
| 4 | Formulaire de contact sans protection anti-abus | faible | **corrigé** |
| 5 | HSTS actif mais incomplet | faible | **corrigé** |

### 1 · En-têtes de sécurité — `next.config.mjs`

La vitrine ne renvoyait aucun en-tête applicatif ; la gestion en avait quatre. Les deux registres en
reçoivent désormais un jeu complet, posé par deux règles **qui ne se recouvrent pas** (deux règles
qui matchent le même chemin poseraient chaque en-tête deux fois, et une valeur double ne vaut rien) :

- communs : `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Permissions-Policy` (caméra, micro, capteurs, paiement… tous
  à vide), `Cross-Origin-Opener-Policy: same-origin`, `X-Permitted-Cross-Domain-Policies: none` ;
- vitrine : `Referrer-Policy: strict-origin-when-cross-origin`, `upgrade-insecure-requests` ;
- gestion : `Referrer-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`,
  `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`.

**La CSP, et son compromis.** Elle garde `script-src 'self' 'unsafe-inline'`. Ce n'est pas un oubli :
un nonce se pose par requête, et Next ne peut plus prérendre une page qui le lit — la vitrine est
statique et porte 207 visuels. La politique ne couvre donc **pas** un script injecté dans le HTML de
la page. Elle couvre : aucun script d'un autre domaine chargé, aucune exfiltration vers un autre
domaine (`connect-src`), aucun formulaire posté ailleurs (`form-action`), aucune balise `<base>`
détournant les URL relatives, aucun plugin, et **aucun cadrage** (`frame-ancestors 'none'`, le vrai
correctif du clickjacking). `'unsafe-eval'` n'existe qu'en développement.

Le jour où la vitrine cessera d'être statique, le nonce redeviendra le bon choix.

### 2 · `robots.txt`

`Disallow: /admin` a été retiré. Le fichier est public : l'y écrire annonçait l'adresse exacte du
back-office à qui l'ouvrait, et un `Disallow` n'interdit rien — c'est une consigne que seuls les
robots polis suivent. La promesse « hors des index » est tenue par l'en-tête `X-Robots-Tag` sur
`/admin/*`. Le rempart reste l'authentification (`proxy.ts` + `requireSession`), jamais le secret
d'une adresse.

### 3 · Limite de débit — `src/lib/security/rate-limit.ts`

Fenêtre fixe en mémoire du processus, clé = point d'entrée + condensé non réversible de l'adresse
(l'IP n'est jamais conservée en clair, l'entrée meurt avec sa fenêtre).

| Point d'entrée | Limite | Pourquoi ce chiffre |
|---|---|---|
| `/api/perfume-search` | 40 / min / adresse | La barre est anti-rebondie à 300 ms et part à trois caractères : une frappe humaine soutenue produit ~15 appels/min. Un script qui déroule l'alphabet dépasse dès la première seconde. |
| `submitContactForm` | 5 / 15 min / adresse | Couvre le visiteur qui se reprend, coupe la boucle d'un robot. |
| `loginAction` | 20 / 15 min / adresse | **Avant** toute lecture en base. Le verrou par compte ne voit ni le balayage de dix identifiants, ni le martèlement d'un compte inexistant — qui ne verrouille rien, faute de compte. |

La recherche gagne en plus `Cache-Control: s-maxage=60` : ce que le CDN sert n'atteint jamais la
fonction, donc ne coûte rien — la boucle d'un aspirateur se heurte au cache avant la limite.

**Limite honnête de ce dispositif** : sur Vercel, chaque instance a sa mémoire. Deux requêtes servies
par deux instances comptent dans deux compteurs. C'est un frein, pas un quota. Un volume réparti sur
mille adresses se traite au pare-feu de l'hébergeur (Vercel Firewall, réglage console), en amont du
code — voir §3.

### 4 · Formulaire de contact — `src/lib/contact/guard.ts`

- **Champ leurre** (`societe`) masqué, hors du parcours clavier et de l'arbre d'accessibilité.
- **Temps de saisie minimal** : deux secondes. Un envoi sans chronomètre est traité comme un robot.
- **Plafonds** de longueur, et **retours ligne retirés** du nom, de l'adresse et du sujet — ces trois
  valeurs finissent dans des en-têtes de courriel, et un `\r\n` dans un sujet n'est jamais autre
  chose qu'une tentative d'injection d'en-tête.
- Le refus anti-robot est **silencieux** : la page répond « envoyé » sans rien envoyer. Nommer ce qui
  a trahi un robot, c'est l'aider au tour suivant. Aucun humain ne peut atterrir là.

Pas de captcha : il ne se justifiera que si du spam réel passe. Le cas échéant, Turnstile
(Cloudflare, sans traçage), comme le recommande l'audit.

### 5 · HSTS

`max-age=63072000; includeSubDomains; preload`.

⚠️ **La soumission sur [hstspreload.org](https://hstspreload.org) reste à faire par vous, et pas à
l'aveugle** : une fois le domaine dans la liste, TOUT sous-domaine présent et futur doit servir en
HTTPS, et le retrait prend des mois. À soumettre seulement quand c'est vrai pour tous.

---

## 2. Corrections au-delà de l'audit

Trouvées en relisant le code, dans le même passage.

- **JSON-LD** (`src/lib/seo/jsonLd.ts`) — le balisage était inséré par `JSON.stringify` nu dans un
  `<script>`. L'analyseur HTML s'arrête à la première séquence `</script`, y compris au milieu d'une
  chaîne JSON : un nom de parfum contenant cette suite refermait la balise et faisait passer le
  reste pour du balisage. Chevrons et terminateurs de ligne JavaScript sont désormais échappés.
- **Code mort supprimé** — `src/lib/admin/image-utils.ts` appelait `/api/admin/storage/sign`, une
  route qui n'existe plus. Du code d'envoi qui vise une adresse morte finit par être remis en
  service sans que personne ne revérifie ce qu'elle fait.
- **Vérifié, déjà correct** : aucune redirection ouverte (`safeReturnPath` résout `retour` par `URL`
  et refuse tout ce qui sort de `/admin`) ; cookie de session `httpOnly` + `secure` + `SameSite=Lax`,
  signé HS256 ; `poweredByHeader: false` ; pas de source maps publiées ; aucun secret côté
  navigateur (seul `NODE_ENV` est lu dans un composant client) ; tout `target="_blank"` porte son
  `rel` ; aucune écriture par route HTTP — toute écriture passe par une server action, dont Next
  vérifie l'origine.
- **Confort de copie** (`ContentGuard` + `img { user-select: none }`) : clic droit, glisser d'image
  et raccourcis d'inspection sont désactivés sur la vitrine, à votre demande. **Ce n'est pas de la
  sécurité.** Le navigateur a déjà reçu le HTML, les images et le JavaScript ; ils se lisent par le
  menu du navigateur, par `view-source:`, par le cache disque, par `curl`, par un miroir `wget` —
  aucun de ces chemins ne passe par un écouteur de clavier. Cela arrête le visiteur qui enregistre
  une photo de flacon d'un clic droit, personne d'autre. Refusé volontairement : `debugger` en
  boucle (fige l'onglet et rend le site inutilisable, pour nous compris), détection d'outils par
  mesure de fenêtre (faux positifs), blocage de la sélection de texte (une adresse doit se copier).

---

## 3. Ce que le code ne peut pas faire — à votre main

C'est ici que se joue l'essentiel : la grande majorité des sites « volés » le sont par un compte
compromis, pas par une faille de code. Aucune ligne de ce dépôt ne peut vérifier ces points.

### Cette semaine

- [ ] **2FA** sur : registrar du domaine, Vercel, Supabase, Snapchat professionnel, **et la boîte
      mail associée**. La boîte mail d'abord : c'est elle qui réinitialise tous les autres.
- [ ] **Verrou de transfert** (transfer lock) chez le registrar de `nureaparfums.fr` — et de
      `nureaparfum.fr`. Qui possède le domaine possède le site.
- [ ] **Mot de passe unique et long** par service, dans un gestionnaire de mots de passe.

### Ce mois-ci

- [ ] **Supabase — RLS et bucket `catalog`** : lecture publique des visuels, oui ; **écriture
      publique, non**. À vérifier dans la console. Le code n'expose aucune clé anonyme au navigateur
      (les envois passent par une URL signée émise côté serveur), donc rien dans l'application ne
      dépend d'une politique permissive — mais un bucket ouvert reste ouvert à qui le trouve.
- [ ] **Supprimer `ADMIN_DASHBOARD_SECRET`** des variables d'environnement Vercel : plus aucun code
      ne la lit. Un secret qui traîne finit par resservir.
- [ ] **Vercel Firewall** : une règle de débit au bord, pour ce que la limite en mémoire ne peut pas
      couvrir (volume réparti sur beaucoup d'adresses).
- [ ] **Revue des accès Vercel** : membres de l'équipe et jetons de déploiement.
- [ ] **Soumission HSTS preload**, une fois les sous-domaines vérifiés (§1.5).

### Si le site est compromis malgré tout

1. Couper l'accès : mots de passe changés et sessions/jetons révoqués sur registrar, Vercel,
   Supabase, Snapchat, boîte mail.
2. Vérifier le DNS et le dernier déploiement contre la configuration connue.
3. Restaurer en **redéployant depuis git**, jamais en « nettoyant » un état déjà compromis.
4. Activer la 2FA partout où elle manquait.
5. Signaler à l'hébergeur, au registrar, et à `cybermalveillance.gouv.fr`.

---

## 4. Comment ces règles se défendent toutes seules

- `tests/architecture/securite-headers.test.ts` — LIT `next.config.mjs` (il ne recopie rien : un
  test qui redéclare ce qu'il vérifie ne vérifie que lui-même) et refuse un en-tête manquant, un
  HSTS sans `includeSubDomains`, une directive ouverte à `*` ou `http:`, `unsafe-eval` hors
  développement, un `Disallow` qui reviendrait dans `app/robots.ts`, ou une règle publique qui
  recouvrirait la gestion.
- `src/lib/security/__tests__/rate-limit.test.ts` — fenêtres, décompte, réouverture, cloisonnement
  des clés, borne mémoire.
- `src/lib/contact/__tests__/guard.test.ts` — leurre, chronomètre, plafonds, injection d'en-tête,
  et le fait qu'un refus silencieux ne nomme jamais sa raison.
- `src/lib/seo/__tests__/jsonLd.test.ts` — aucun chevron ne survit à la sérialisation.
