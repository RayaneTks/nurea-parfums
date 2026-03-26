"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, Lock, User } from "lucide-react";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errQ = searchParams.get("err");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configErr =
    errQ === "config"
      ? "Serveur mal configuré (ADMIN_JWT_SECRET). Vérifiez les variables d’environnement."
      : errQ === "session"
        ? "Session expirée. Reconnectez-vous."
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
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Échec de la connexion.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Réseau indisponible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md overflow-x-clip border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="border-b border-[var(--nurea-border)] bg-[var(--nurea-bg)]/60 px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] text-[var(--nurea-cuivre)]">
            <KeyRound className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="font-serif text-2xl leading-tight text-[var(--nurea-text)] sm:text-3xl">
              Connexion
            </h1>
            <p className="mt-1 text-[13px] text-[var(--nurea-text-muted)]">Espace réservé — Nurea Parfums</p>
          </div>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-6 sm:space-y-6 sm:px-8 sm:pb-8 sm:pt-8"
      >
        {(configErr || error) && (
          <p
            className="border border-[var(--nurea-accent)]/40 bg-[var(--nurea-accent-subtle)] px-4 py-3 text-[14px] text-[var(--nurea-accent)]"
            role="alert"
          >
            {configErr || error}
          </p>
        )}

        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--nurea-text-muted)]">
          <span className="mb-2 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-[var(--nurea-cuivre)]" aria-hidden />
            Identifiant
          </span>
          <input
            type="text"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="block min-h-12 w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-3 text-base text-[var(--nurea-text)] focus-visible:border-[var(--nurea-accent)] focus-visible:outline-none"
          />
        </label>

        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--nurea-text-muted)]">
          <span className="mb-2 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-[var(--nurea-cuivre)]" aria-hidden />
            Mot de passe
          </span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="block min-h-12 w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-3 text-base text-[var(--nurea-text)] focus-visible:border-[var(--nurea-accent)] focus-visible:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn-nurea btn-accent flex min-h-12 w-full items-center justify-center gap-2 text-[13px] tracking-[0.12em] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Connexion…
            </>
          ) : (
            "Se connecter"
          )}
        </button>

        <Link
          href="/"
          className="flex min-h-12 items-center justify-center gap-2 text-[13px] font-medium text-[var(--nurea-accent)] transition-colors hover:text-[var(--nurea-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)] sm:justify-start sm:min-h-0 sm:py-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour au site
        </Link>
      </form>
    </div>
  );
}
