import type { Metadata } from "next";
import { CloudOff } from "lucide-react";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { RetryButton } from "./RetryButton";

export const metadata: Metadata = {
  title: "Hors ligne",
  robots: { index: false, follow: false },
};

/**
 * Page de repli servie par `public/admin-sw.js` quand une navigation échoue.
 * Mise en cache à l'installation du service worker : elle doit rester
 * entièrement statique (aucune donnée serveur).
 */
export default function OfflinePage() {
  return (
    <PageScaffold ariaLabel="Hors ligne">
      <div className="flex flex-1 items-center">
        <EmptyState
          icon={CloudOff}
          title="Pas de connexion"
          description="Les données de gestion sont toujours lues en direct. Reconnecte-toi au réseau pour continuer."
          action={<RetryButton />}
        />
      </div>
    </PageScaffold>
  );
}
