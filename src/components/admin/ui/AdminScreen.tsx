import type { ReactNode } from "react";

/** Zone de contenu principale : même grille et marges partout (HIG / cohérence). */
export function AdminScreen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-lg px-4 pb-8 pt-2 sm:px-5 ${className}`}>{children}</div>;
}
