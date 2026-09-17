/**
 * Contrôle des variables de la gestion au démarrage (04 §8.6). Journalise fort, ne lève jamais :
 * la vitrine partage le process et ne doit pas tomber pour une variable de la gestion.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { gestionEnvProblems } = await import("@/server/env");
  const problems = gestionEnvProblems();
  if (problems.length === 0) return;
  console.error(
    JSON.stringify({
      level: "error",
      at: new Date().toISOString(),
      event: "configuration",
      message: "Configuration de la gestion incomplète : la vitrine tourne, la gestion refusera les requêtes concernées.",
      problems,
    }),
  );
}
