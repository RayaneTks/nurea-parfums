# Nuréa Parfums

Parfumerie à Marseille : les parfums des grandes marques, au meilleur prix, remis dans des
flacons Nuréa personnalisés. Site officiel : [nureaparfums.fr](https://nureaparfums.fr).

Le dépôt porte **deux applications** qui partagent un seul déploiement Next.js :

| | Vitrine | Nuréa Gestion |
|---|---|---|
| Pour | les clients | le gérant, sur iPhone |
| Adresse | `/`, `/marque`, `/contact`, `/legal` | `/admin` (application web installable) |
| Rôle | parcourir le catalogue, écrire sur Snapchat | ventes, commandes, encaissements, stock, catalogue, chiffres |
| Design | [`DESIGN.md`](DESIGN.md), [`PRODUCT.md`](PRODUCT.md) | [`docs/admin/`](docs/admin/) |

La vitrine ne vend pas en ligne : ni panier, ni paiement, ni compte client. La commande passe par
un échange direct, sur Snapchat ou par le formulaire de contact.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Prisma sur PostgreSQL (Supabase)
· Supabase Storage · Vitest et Playwright · hébergé sur Vercel.

## Pour travailler dessus

**Lire [`CLAUDE.md`](CLAUDE.md) avant toute commande.** Les fichiers `.env` et `.env.local` pointent
sur la base de **production** : plusieurs commandes courantes (`npm run build`, `prisma db push`,
`prisma migrate reset`) y écriraient pour de vrai. Les commandes sûres et la base de test locale sont
décrites dans [`DEVELOPER.md`](DEVELOPER.md).

- Refonte de la gestion : [`docs/refonte/00-README.md`](docs/refonte/00-README.md)
- Reprise du chantier : [`PASSATION.md`](PASSATION.md)
- Sécurité : [`docs/SECURITE.md`](docs/SECURITE.md)
- Charte graphique v3 : [`docs/charte-graphique.html`](docs/charte-graphique.html)

## Licence

Voir [`LICENSE`](LICENSE). Les photographies du site sont réalisées par Nuréa Parfums ;
reproduction interdite sans accord écrit.
