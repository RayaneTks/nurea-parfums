# 09 — SURVEILLANCE D'APRÈS-BASCULE

> Journal de la surveillance de sept jours prévue par `07-PLAN-EXECUTION.md` §1.8, du **22/09/2026**
> (bascule, J+0) au **29/09/2026** (J+7). Une entrée par matin. Ce fichier n'est pas un plan : il dit
> ce qui a été relevé, tel quel. Un matin sans entrée est un matin non surveillé, et on l'écrit.

## Le geste du matin

1. **Invariants de l'argent, en lecture seule** — `DATABASE_URL` de production lue **avant** l'import
   de Prisma, et l'hôte confirmé à la main :

   ```bash
   DATABASE_URL="<url de production>" npx tsx scripts/check-invariants.ts --chiffres --confirm-host aws-1-eu-west-1.pooler.supabase.com
   ```

   Les trois invariants (`03` §5.7) doivent être verts. Tout écart est un incident prioritaire :
   on ne corrige rien avant d'avoir relevé l'écart et son sens.
2. **Journaux Vercel** — projet `nurea-parfums` : grappes d'erreurs d'exécution, codes `UNEXPECTED`
   avec leur référence (`04` §9.5), actions de plus d'une seconde. La rétention des journaux bruts est
   d'**un jour** (plan Hobby) ; la table des erreurs groupées, elle, remonte à sept jours — c'est elle
   qu'on lit.
3. **Cinq minutes de retour du gérant.**

## Journal

### J+0 (22/09) et J+1 (23/09) — pas d'entrée

Aucun relevé n'a été consigné ces deux matins. Ce qu'on sait après coup, par la table des erreurs
groupées de Vercel, est reporté dans l'entrée du 24/09.

### J+2 — 24 septembre 2026

**Invariants : les trois verts.** Hôte `aws-1-eu-west-1.pooler.supabase.com`.

| Chiffre | Valeur | Rappel du jour de la bascule |
|---|---|---|
| Trésorerie | **1 691,00 €** (3 poches actives · non attribué 0,00 €) | 1 611,00 € |
| Encaissé depuis toujours | **2 265,00 €** | 2 185,00 € |
| À encaisser | **715,00 €** (12 documents, dont 9 en créance ancienne) | 680,00 € |
| Marge nette depuis toujours | **1 282,46 €** (coûts d'achat 982,54 € · dépenses 0,00 €) | 1 253,55 € |
| Encaissé du mois | 945,00 € | — |
| Marge nette du mois | 611,81 € (64,7 %) | — |
| En retard · clients à relancer | 0 · 9 | — |
| Documents au coût à compléter | **0** | 1 |

Les écarts avec le jour de la bascule sont des ventes réelles saisies depuis : Encaissé et Trésorerie
montent de 80,00 €, À encaisser de 35,00 €. Rien d'anormal.

**Les deux arbitrages de `07` §1.8 sont déjà appliqués en production** (vérifié en lecture seule) :

- **Coût de la ligne Grand Soir 10 ml** du document de « Yanis secu » : **0,00 €**. Plus aucune ligne
  sans coût dans toute la base, et « Documents au coût à compléter » est à 0 : la Marge nette n'est
  plus annoncée comme provisoire. Rien à faire.
- **Écart historique de +100,00 €** du 19/09 (« Écart historique — excédent de finalisation (double
  comptage) », poche « Non attribué ») : **toujours en place**, ainsi que la correction de −100,00 €
  du gérant sur Revolut (« Erreur comptabilité application ») et la répartition de 100,00 € entre les
  deux poches. Les trois mouvements se neutralisent, « Non attribué » est à 0,00 €. **Ne rien
  toucher** : annuler le seul écart ferait perdre 100,00 € de Trésorerie.

**Journaux Vercel.** Aucune réponse 5xx sur les dernières 24 h (283 requêtes, toutes en 200). Deux
grappes plus anciennes dans la table des erreurs :

1. **`Failed to find Server Action`** sur `/` (vitrine), 42 occurrences les 21 et 22/09, plus rien
   depuis. C'est une page restée ouverte dans un navigateur pendant qu'un déploiement changeait
   l'identifiant de l'action ; le rechargement la règle. Sans suite.
2. **Prisma `P1001` puis `P2024`** pendant des revalidations de cache, le 23/09 en deux bouffées
   (11 h 00 et 16 h 45) : d'abord « Can't reach database server » sur le pooler Supabase, puis
   « Timed out fetching a new connection from the connection pool (limite 5, délai 10 s) ». Une
   quinzaine d'occurrences en tout, sur des clés `chiffres.*`, `stats.*` et `customers.list`.
   **À surveiller** : une bouffée de revalidations concurrentes sature les cinq connexions que
   l'exécution garde par instance. Personne n'a vu d'erreur (aucune 5xx), mais le jour où une de ces
   revalidations sert un écran, l'écran tombe. Piste si ça se répète : poser `connection_limit` et
   `pool_timeout` dans la chaîne `DATABASE_URL` de production, ou sérialiser les revalidations
   déclenchées par un même rendu. Ne rien changer tant que ça ne se reproduit pas.

**Retour du gérant** : pas encore recueilli ce jour.

### J+3 à J+7 (25 → 29/09) — à venir
