import { cn } from "@/lib/utils";

/**
 * En-tête factice aligné sur PageHeader (eyebrow / titre / description) — safe area iOS.
 */
export function AdminLoadingHeader() {
  return (
    <div
      className="border-b border-admin-border px-5 pb-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)]"
      aria-hidden
    >
      <div className="h-3 w-20 rounded bg-admin-border/90 admin-skeleton" />
      <div className="mt-3 h-7 w-[min(12rem,55%)] rounded bg-admin-surface-muted admin-skeleton" />
      <div className="mt-2 h-3 w-[min(18rem,90%)] max-w-sm rounded bg-admin-border/90 admin-skeleton" />
    </div>
  );
}

type AdminListItemSkeletonProps = {
  /** hauteur + rayons, ex. h-20, h-24, h-[76px] */
  className?: string;
};

/**
 * Ligne de liste type carte — utilisé en Compta, commandes, Picker, etc.
 */
export function AdminListItemSkeleton({ className }: AdminListItemSkeletonProps) {
  return (
    <div
      className={cn("rounded-xl border border-admin-border admin-skeleton", className ?? "h-[72px]")}
      role="presentation"
    />
  );
}

type AdminRouteFallbackProps = {
  /** Nombre de lignes liste */
  rows?: number;
  /** Classes Tailwind pour chaque ligne (défaut h-[72px] type liste) */
  rowClassName?: string;
};

/**
 * Squelette plein panneau pour `app/admin/loading` (RSC) — cible mobile / PWA.
 */
export function AdminRouteFallback({ rows = 6, rowClassName = "h-[72px]" }: AdminRouteFallbackProps) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      aria-busy="true"
      aria-label="Chargement de la page"
    >
      <AdminLoadingHeader />
      <div className="min-h-0 flex-1 space-y-3 px-5 pb-4 pt-5">
        {Array.from({ length: rows }, (_, i) => (
          <AdminListItemSkeleton key={i} className={rowClassName} />
        ))}
      </div>
    </div>
  );
}

type AdminComptaListSkeletonProps = { count?: number };

export function AdminComptaListSkeleton({ count = 4 }: AdminComptaListSkeletonProps) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <AdminListItemSkeleton key={i} className="h-20" />
      ))}
    </div>
  );
}

type AdminOrdersListSkeletonProps = { count?: number };

export function AdminOrdersListSkeleton({ count = 3 }: AdminOrdersListSkeletonProps) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <AdminListItemSkeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

type AdminPickerListSkeletonProps = { count?: number };

export function AdminPickerListSkeleton({ count = 4 }: AdminPickerListSkeletonProps) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <AdminListItemSkeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

/**
 * Contenu chargement détail commande (sans PageHeader — le parent gère l’en-tête).
 */
export function AdminOrderDetailBodySkeleton() {
  return (
    <div
      id="main-content"
      className="flex-1 space-y-5 px-5 pb-10 pt-5"
      aria-busy="true"
      aria-label="Chargement de la commande"
    >
      <div className="h-24 rounded-2xl border border-admin-border admin-skeleton" role="presentation" />
      <div className="space-y-2">
        <div className="h-4 w-24 rounded-full admin-skeleton" role="presentation" />
        {[1, 2, 3].map((item) => (
          <AdminListItemSkeleton key={item} className="h-[76px]" />
        ))}
      </div>
      <div className="h-12 rounded-xl border border-admin-border admin-skeleton" role="presentation" />
    </div>
  );
}
