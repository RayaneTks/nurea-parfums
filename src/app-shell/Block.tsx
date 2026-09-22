"use client";

import { unstable_rethrow, useRouter } from "next/navigation";
import { Component, Suspense, useTransition, type ErrorInfo, type ReactNode } from "react";
import { ErrorBanner } from "@/ui/patterns/ErrorBanner";

export const BLOCK_ERROR_MESSAGE = "Ce bloc n'a pas pu se charger.";

type BlockProps = {
  /** Squelette aux proportions EXACTES du contenu final (05 §5.1). */
  fallback: ReactNode;
  /** « Chiffres indisponibles », « Commandes indisponibles »… (06 : message par bloc). */
  errorMessage?: string;
  children: ReactNode;
};

/**
 * Un bloc streamé (04 §9.5, §13.2) : `Suspense` avec son squelette + frontière d'erreur. Une requête
 * qui échoue affiche `ErrorBanner` À LA PLACE du bloc, avec « Réessayer » (rafraîchissement du RSC) ;
 * le reste de l'écran vit.
 */
export function Block({ fallback, errorMessage = BLOCK_ERROR_MESSAGE, children }: BlockProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <BlockBoundary
      message={errorMessage}
      onRetry={(reset) =>
        startTransition(() => {
          router.refresh();
          reset();
        })
      }
    >
      <Suspense fallback={fallback}>{children}</Suspense>
    </BlockBoundary>
  );
}

type BoundaryProps = { message: string; onRetry: (reset: () => void) => void; children: ReactNode };

class BlockBoundary extends Component<BoundaryProps, { error: unknown }> {
  override state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") console.error("Bloc en erreur", error, info.componentStack);
  }

  private readonly reset = () => this.setState({ error: null });

  override render() {
    const { error } = this.state;
    if (error !== null) {
      // redirect() et notFound() ne sont pas des pannes de bloc : Next doit les traiter.
      unstable_rethrow(error);
      return <ErrorBanner message={this.props.message} onRetry={() => this.props.onRetry(this.reset)} />;
    }
    return this.props.children;
  }
}
