"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { Stack } from "@/ui/primitives/Stack";
import { ErrorBanner } from "@/ui/patterns/ErrorBanner";

/** Écran d'entrée après connexion — la vue d'ensemble, pas le catalogue. */
const LANDING = "/admin";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("err");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configError =
    errorParam === "config"
      ? "Serveur mal configuré (ADMIN_JWT_SECRET). Vérifie les variables d'environnement."
      : errorParam === "session"
        ? "Session expirée. Reconnecte-toi."
        : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? ((await res.json()) as { error?: string })
        : { error: "Réponse serveur invalide." };
      if (!res.ok) {
        setError(data.error ?? "Identifiant ou mot de passe incorrect.");
        return;
      }
      router.replace(LANDING);
      router.refresh();
    } catch {
      setError("Serveur injoignable. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      id="main-content"
      className="flex w-full flex-col justify-center px-6"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
      }}
    >
      <Link
        href="/"
        className="mb-6 -ml-2 inline-flex min-h-[var(--admin-touch-min)] w-fit items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-medium text-[var(--admin-text-muted)] tap-scale hover:text-[var(--admin-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
      >
        <ArrowLeft size={16} aria-hidden />
        Retour à la boutique
      </Link>

      <div
        className="rounded-[20px] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow-lg)]"
        style={{ border: "1px solid var(--admin-border)" }}
      >
        <div className="mb-6 text-center">
          <Image
            src="/branding/monogram/logo4_monogram_free_bordeaux_1024.svg"
            alt=""
            width={56}
            height={56}
            className="mx-auto mb-3"
            priority
          />
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.01em] text-[var(--admin-text)]">
            Nuréa Gestion
          </h1>
          <p className="mt-1 text-[14px] text-[var(--admin-text-muted)]">
            Connecte-toi pour continuer.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <Stack gap={3}>
            <ErrorBanner message={configError ?? error} scrollIntoView={false} />

            <Input
              label="Identifiant"
              type="text"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <Input
              label="Mot de passe"
              type="password"
              name="password"
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={loading}
              className="mt-1"
            >
              Se connecter
            </Button>
          </Stack>
        </form>
      </div>
    </main>
  );
}
