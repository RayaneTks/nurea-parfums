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
    <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-7 shadow-2xl shadow-black/40">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour
      </Link>

      <div className="mb-7">
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-100">
          Connexion
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">Espace administration</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {(configErr || error) && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-[13px] text-red-400" role="alert">
            {configErr || error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-zinc-400">Identifiant</label>
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
            className="block min-h-[48px] w-full rounded-xl bg-zinc-800/70 px-4 text-[15px] text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 focus-visible:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-zinc-400">Mot de passe</label>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="block min-h-[48px] w-full rounded-xl bg-zinc-800/70 px-4 text-[15px] text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 focus-visible:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-500 text-[14px] font-semibold text-white transition-all duration-200 hover:bg-blue-400 active:scale-[0.98] disabled:opacity-50"
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
