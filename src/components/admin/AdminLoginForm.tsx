"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

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
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-md border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-8"
    >
      <h1 className="font-serif text-2xl text-[var(--nurea-text)]">Connexion</h1>
      <p className="mt-2 text-[12px] text-[var(--nurea-text-muted)]">
        Espace réservé à la maison Nurea Parfums.
      </p>

      {(configErr || error) && (
        <p className="mt-4 text-[12px] text-[var(--nurea-accent)]" role="alert">
          {configErr || error}
        </p>
      )}

      <label className="mt-6 block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
        Identifiant
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-transparent px-3 py-2.5 text-[14px] text-[var(--nurea-text)] focus:border-[var(--nurea-accent)] focus:outline-none"
        />
      </label>

      <label className="mt-4 block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
        Mot de passe
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-transparent px-3 py-2.5 text-[14px] text-[var(--nurea-text)] focus:border-[var(--nurea-accent)] focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="btn-nurea btn-accent mt-8 w-full justify-center disabled:opacity-50"
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>

      <Link
        href="/"
        className="mt-8 inline-block text-[10px] uppercase tracking-[0.2em] text-[var(--nurea-accent)]"
      >
        Retour au site
      </Link>
    </form>
  );
}
