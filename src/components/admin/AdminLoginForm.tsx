"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

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
      const contentType = res.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? ((await res.json()) as { error?: string })
        : { error: "Réponse serveur invalide." };
      if (!res.ok) {
        setError(data.error ?? "Échec de la connexion.");
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
    <div className="w-full max-w-sm border border-[var(--admin-border)] bg-[var(--admin-surface)] p-7 shadow-sm">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-medium text-[var(--admin-muted)] transition-colors duration-200 hover:text-[var(--admin-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-ring-offset)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour
      </Link>

      <div className="mb-7">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-[var(--admin-text)]">
          Connexion
        </h1>
        <p className="mt-1 text-[13px] text-[var(--admin-muted)]">Espace administration</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {(configErr || error) && (
          <div
            className="border border-[rgba(163,48,48,0.3)] bg-[rgba(163,48,48,0.06)] px-4 py-3 text-[13px] text-[var(--admin-danger)]"
            role="alert"
          >
            {configErr || error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--admin-muted)]">Identifiant</label>
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
            className="block min-h-[48px] w-full border border-[var(--admin-border)] bg-[var(--admin-input-bg)] px-4 text-[15px] text-[var(--admin-text)] placeholder:text-[var(--admin-muted)]/60 transition-colors duration-200 focus-visible:border-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]/30"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--admin-muted)]">Mot de passe</label>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="block min-h-[48px] w-full border border-[var(--admin-border)] bg-[var(--admin-input-bg)] px-4 text-[15px] text-[var(--admin-text)] placeholder:text-[var(--admin-muted)]/60 transition-colors duration-200 focus-visible:border-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]/30"
          />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 bg-[var(--admin-accent-solid)] text-[14px] font-semibold text-[#EDE9E6] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--admin-accent)] active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-ring-offset)]"
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
        </div>
      </form>
    </div>
  );
}
