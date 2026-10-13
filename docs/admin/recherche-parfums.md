# Base privée de recherche parfum

## Périmètre

`PerfumeResearchRecord` conserve les notes et l'univers proposés pour une fiche, avec leur provenance.
Cette base interne sert de source réutilisable pour les outils Nuréa; elle ne modifie pas directement
`Perfume` et ne publie rien sur la vitrine.

Le flux suit trois états :

1. Import JSON par `stagePerfumeResearchAction`, avec session admin.
2. Fiche enregistrée en `PENDING`; le fichier d'import ne peut pas définir son statut.
3. Un admin la valide ou la refuse. Pour valider, il confirme séparément les droits de réutilisation.
   L'identifiant du réviseur, la décision et la date restent en base.

`GET /api/admin/perfume-research?brand=...&perfume=...` exige la même session et renvoie uniquement
les entrées `VERIFIED` par défaut, avec les notes, l'URL source, la preuve de droits et les détails de
validation. `&status=PENDING` expose la file de validation aux seuls admins. La route suit la liste fermée
des lectures admin. Toutes les écritures restent des server actions.

## Contrat d'import

Chaque entrée doit fournir :

- marque et parfum;
- source `BRAND_OFFICIAL`, `PERFUMER_OFFICIAL`, `SUPPLIER` ou `LICENSED_DATA_PROVIDER`;
- URL HTTPS de la fiche source;
- `rightsEvidence`, une référence vérifiable à l'autorisation de réutiliser les données;
- `retrievedAt` en date ISO 8601;
- tableaux `topNotes`, `heartNotes`, `baseNotes`;
- `universeCorrection` facultatif, rédigé par Nuréa.

Exemple :

```json
{
  "records": [
    {
      "brandName": "Maison Exemple",
      "perfumeName": "Parfum Exemple",
      "sourceType": "SUPPLIER",
      "sourceUrl": "https://supplier.example/catalogue/parfum-exemple",
      "rightsEvidence": "Contrat fournisseur 2026-04, annexe données produit §3",
      "retrievedAt": "2026-10-13T10:00:00.000Z",
      "topNotes": ["Bergamote"],
      "heartNotes": ["Jasmin"],
      "baseNotes": ["Cèdre"],
      "universeCorrection": "Univers frais et boisé, écrit pour Nuréa."
    }
  ]
}
```

Les renvois identiques (marque, parfum, URL, date) sont ignorés, jamais écrasés. Une nouvelle date
crée une nouvelle preuve à examiner. Une fiche refusée ou vérifiée ne peut plus être modifiée par
l'action de review; toute nouvelle preuve passe par un nouvel import.

## Sources et droits

Autoriser les imports uniquement depuis un fournisseur, une page officielle dont les conditions
permettent la réutilisation, ou une base de données avec licence écrite. La présence d'une URL ne
prouve pas les droits : `rightsEvidence` est obligatoire et la validation humaine exige une confirmation
distincte. La base refuse une fiche `VERIFIED` dont les droits n'ont pas été confirmés.
Le dépôt ne télécharge aucune page externe.

Fragrantica est bloqué dans le contrat et par une contrainte SQL. Ses conditions du 14 janvier 2026
interdisent l'accès automatisé et le scraping (§5.3), la création de jeux de données (§5.7), et
l'intégration commerciale interne des notes et champs structurés sans licence (§5.9). L'API interne
de Nuréa n'autorise ni ne transforme ces usages. Ne pas importer ces données, les reformuler pour
masquer leur provenance, ni les faire passer pour une autre source. Une intégration Fragrantica
demande d'abord un accord écrit précisant l'API, les champs, le stockage, les usages et la durée.

Référence : [Conditions officielles Fragrantica](https://www.fragrantica.com/Terms-of-Service.phtml).

## Vérification locale

```powershell
$env:TEST_DATABASE_URL = "postgresql://nurea:nurea@localhost:54329/nurea_test"
npm run test:db -- --run tests/db/perfume-research.test.ts
```

La suite globale `npm run test:db` recrée seulement une base locale `nurea_test*` et rejoue toutes les
migrations. Ne jamais utiliser `.env` pour tester cette migration. Ne pas déployer avant revue et
application de la migration dans la procédure de mise en production.
