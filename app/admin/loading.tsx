/**
 * Indicateur de navigation entre routes `/admin/*` (RSC).
 * Sans ce fichier, l’écran reste figé jusqu’à fin du fetch serveur + hydratation.
 */
export default function AdminLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label="Chargement de la page">
      <div className="border-b border-admin-border px-5 pb-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
        <div className="h-3 w-20 rounded bg-admin-border" />
        <div className="mt-3 h-7 w-[min(12rem,55%)] rounded bg-admin-surface-muted" />
        <div className="mt-2 h-3 w-[min(18rem,90%)] max-w-sm rounded bg-admin-border" />
      </div>
      <main className="min-h-0 flex-1 space-y-3 px-5 pb-6 pt-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-[72px] rounded-xl border border-admin-border admin-skeleton" />
        ))}
      </main>
    </div>
  );
}
