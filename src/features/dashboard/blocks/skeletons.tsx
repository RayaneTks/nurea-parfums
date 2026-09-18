import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";

/**
 * Squelettes de E01, E02 et E07 (05 §5.1 : proportions EXACTES du contenu final).
 *
 * Le défaut de l'existant à ne pas reproduire (01 §4.6) : un fallback à trois tuiles pour un rendu à deux,
 * qui décalait l'écran à la résolution du Suspense les jours sans vente. Ici le bloc Argent rend TOUJOURS
 * une tuile dominante et deux tuiles secondaires — le squelette a exactement cette forme, et le parcours
 * e2e mesure les boîtes englobantes avant et après.
 */

/**
 * Squelette du premier bloc de l'Accueil : la carte « Aujourd'hui » (06 E01 : « les blocs 3 et 4 partagent un
 * Suspense dont le squelette est celui du bloc 4 »). Un libellé micro, un montant `h2` et une légende — pas
 * de squelette pour « À faire », qui n'existe peut-être pas.
 *
 * Le squelette du bloc Argent n'est PAS ici : il est le fallback du `Suspense` imbriqué du bloc 5, donc il
 * apparaît déjà à la place définitive du bloc Argent. C'est ce qui rend vraie la mesure du critère de J14
 * (« positions et tailles du bloc Argent identiques entre squelette et contenu »).
 */
export function TodaySkeleton() {
  return (
    <div
      className="flex flex-col gap-1 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4"
      aria-busy
      aria-label="Chargement de l'Accueil"
    >
      <Skeleton width={190} height={12} />
      <Skeleton width={120} height={24} />
      <Skeleton width={150} height={13} />
    </div>
  );
}

/**
 * Squelette du bloc Argent (06 E01 zone 5 : « son squelette exact (3 tuiles) ») : la tuile dominante
 * (libellé micro, montant `display`, légende) et deux tuiles secondaires côte à côte, dans les mêmes
 * cartes et avec les mêmes espacements que `MoneyTiles`.
 */
export function MoneySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy aria-label="Chargement des chiffres">
      <div className="flex flex-col gap-1 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
        <Skeleton width={160} height={12} />
        <Skeleton width={170} height={34} />
        <Skeleton width={200} height={13} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="flex flex-col gap-1 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4"
          >
            <Skeleton width={90} height={12} />
            <Skeleton width={110} height={22} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Squelette de E02 : le montant du jour et ses poches, puis les documents (06 E02 : blocs 2 et 3). */
export function DayRecapSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement du récap">
      <div className="flex flex-col gap-1">
        <Skeleton width={110} height={12} />
        <Skeleton width={170} height={34} />
      </div>
      <SkeletonList count={2} avatar={false} />
      <div className="flex flex-col gap-1">
        <span className="flex h-[29px] items-center px-1 pb-1">
          <Skeleton width={160} height={15} />
        </span>
        <SkeletonList count={3} avatar={false} />
      </div>
    </div>
  );
}

/** Squelette de E07 : le sous-titre en unités, puis les lignes du classement (vignette 40 px). */
export function ClassementSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy aria-label="Chargement du classement">
      <Skeleton width={180} height={15} />
      <SkeletonList count={8} />
    </div>
  );
}
