import type { ReactNode } from "react";

/** Connexion : plein écran sans barre d’onglets (PWA / mobile). */
export default function AdminLoginLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
