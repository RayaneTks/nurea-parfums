/**
 * Base locale de travail : PostgreSQL 15 embarqué sur le port 54329.
 *
 * Docker Desktop ne démarre pas sur ce poste ; les tests sur base réelle, les parcours et la
 * base de répétition tournent donc sur `embedded-postgres`. Ce fichier est la SOURCE : la
 * copie de travail vit hors du dépôt, dans `C:\Users\User\nurea-pg`, qui porte à la fois
 * `node_modules` (embedded-postgres télécharge les binaires PostgreSQL à l'installation) et
 * `data` — le dossier de données, qui contient entre autres `nurea_repetition`, la copie des
 * données réelles migrées. Ne jamais remettre ce dossier dans un répertoire temporaire : il
 * serait balayé à la fin de la session.
 *
 * Lancer (le serveur tombe à chaque fin de session) :
 *   node C:\Users\User\nurea-pg\start.mjs
 *
 * Si le dossier hors dépôt a disparu, le reconstruire :
 *   mkdir C:\Users\User\nurea-pg && cd C:\Users\User\nurea-pg
 *   npm init -y && npm install embedded-postgres@15.18.0-beta.17
 *   copy <dépôt>\scripts\local-db\start.mjs .
 *   node start.mjs
 * Les bases sont alors vides : `nurea_test` et `nurea_shadow` sont créées ici, `nurea_test_e2e`
 * par `e2e/global-setup.ts`, et `nurea_repetition` se refait par `npm run repetition:refresh`.
 */
import EmbeddedPostgres from "embedded-postgres";

// `databaseDir` veut un chemin Windows : sous Node, `URL.pathname` rend « /C:/… ».
const databaseDir = new URL("./data", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const pg = new EmbeddedPostgres({ databaseDir, user: "nurea", password: "nurea", port: 54329, persistent: true });

const { existsSync } = await import("node:fs");
if (!existsSync(new URL("./data/PG_VERSION", import.meta.url))) await pg.initialise();

await pg.start();

// Idempotent : au deuxième lancement, la base existe déjà et l'erreur ne veut rien dire.
for (const db of ["nurea_test", "nurea_shadow"]) {
  try {
    await pg.createDatabase(db);
  } catch {}
}

console.log("POSTGRES PRET sur 54329");
process.on("SIGINT", async () => {
  await pg.stop();
  process.exit(0);
});
// Le processus doit rester en vie : c'est lui qui tient le serveur.
setInterval(() => {}, 1 << 30);
