"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, X } from "lucide-react";

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
      ? "Serveur mal configure (ADMIN_JWT_SECRET). Verifiez les variables d'environnement."
      : errQ === "session"
        ? "Session expiree. Reconnectez-vous."
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
        setError(data.error ?? "Echec de la connexion.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Connexion serveur impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md border border-[var(--nurea-border)] bg-[var(--nurea-surface)] p-6 shadow-[0_20px_60px_var(--nurea-glow)] md:p-8">
      <Link
        href="/"
        className="mb-5 inline-flex min-h-[44px] items-center gap-1.5 pr-3 text-[13px] font-medium text-[var(--nurea-text-muted)] transition-colors hover:text-[var(--nurea-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour au site
      </Link>

      <div className="mb-7 border-b border-[var(--nurea-border)] pb-5">
        <h1 className="font-serif text-[28px] leading-none tracking-[var(--nurea-tracking-tight)] text-[var(--nurea-text)]">
          Connexion
        </h1>
        <p className="mt-2 text-[13px] text-[var(--nurea-text-muted)]">Espace administration</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {(configErr || error) && (
          <div
            className="border border-red-400/40 bg-red-500/10 px-4 py-3 text-[14px] text-red-200"
            role="alert"
          >
            {configErr || error}
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-[var(--nurea-text-muted)]">
            Identifiant
          </label>
          <div className="relative mt-1.5">
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
              className="block min-h-[44px] w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-2.5 pr-11 text-[15px] text-[var(--nurea-text)] transition-colors focus-visible:border-[var(--nurea-border-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
            />
            {username.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setUsername("")}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[var(--nurea-text-subtle)] transition-colors hover:bg-[var(--nurea-surface-hover)] hover:text-[var(--nurea-text)]"
                aria-label="Effacer l'identifiant"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--nurea-text-muted)]">
            Mot de passe
          </label>
          <div className="relative mt-1.5">
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block min-h-[44px] w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-2.5 pr-11 text-[15px] text-[var(--nurea-text)] transition-colors focus-visible:border-[var(--nurea-border-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
            />
            {password.length > 0 && (
              <button
                type="button"
                onClick={() => setPassword("")}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[var(--nurea-text-subtle)] transition-colors hover:bg-[var(--nurea-surface-hover)] hover:text-[var(--nurea-text)]"
                aria-label="Effacer le mot de passe"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 bg-[var(--nurea-accent-solid)] text-[14px] font-semibold text-[var(--nurea-text)] transition-colors hover:bg-[var(--nurea-accent)] disabled:opacity-50"
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
      </form>
    </div>
  );
}
