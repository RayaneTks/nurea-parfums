"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { ErrorBanner } from "@/ui/patterns/ErrorBanner";
import { PageScaffold } from "@/ui/patterns/PageScaffold";

/**
 * Erreur d'écran (04 §9.5) : la page n'a pas pu se rendre du tout. Le shell reste (onglets,
 * recherche) ; « Réessayer » relit les données serveur puis rejoue le rendu.
 */
export default function GestionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  return (
    <PageScaffold ariaLabel="Écran indisponible">
      <ErrorBanner
        message={pending ? "Nouvel essai…" : "Cet écran n'a pas pu s'afficher."}
        onRetry={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
      />
    </PageScaffold>
  );
}
