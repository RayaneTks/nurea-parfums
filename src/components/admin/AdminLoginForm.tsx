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
    <div className="w-full max-w-sm border border-black/[0.08] bg-white/90 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/[0.08] dark:bg-[#141414]/90 dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <Link
        href="/"
        className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 pl-0 pr-3 text-[13px] font-medium text-blue-500 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour au site
      </Link>

      <div className="mb-6 border-b border-black/[0.06] pb-4 dark:border-white/[0.06]">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a] dark:text-white">
          Connexion
        </h1>
        <p className="mt-1 text-[13px] text-[#888]">Espace administration</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {(configErr || error) && (
          <div
            className="bg-red-50 px-4 py-3 text-[14px] text-red-700 dark:bg-red-500/10 dark:text-red-400"
            role="alert"
          >
            {configErr || error}
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-[#555] dark:text-[#aaa]">
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
              className="block min-h-[44px] w-full border border-black/[0.08] bg-white px-3 py-2.5 pr-11 text-[15px] text-[#1a1a1a] transition-colors focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#e5e5e5]"
            />
            {username.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setUsername("")}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[#999] transition-colors hover:bg-black/[0.04] hover:text-[#555] dark:text-[#777] dark:hover:bg-white/[0.06] dark:hover:text-[#ddd]"
                aria-label="Effacer l'identifiant"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#555] dark:text-[#aaa]">
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
              className="block min-h-[44px] w-full border border-black/[0.08] bg-white px-3 py-2.5 pr-11 text-[15px] text-[#1a1a1a] transition-colors focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#e5e5e5]"
            />
            {password.length > 0 && (
              <button
                type="button"
                onClick={() => setPassword("")}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[#999] transition-colors hover:bg-black/[0.04] hover:text-[#555] dark:text-[#777] dark:hover:bg-white/[0.06] dark:hover:text-[#ddd]"
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
          className="flex min-h-[44px] w-full items-center justify-center gap-2 bg-blue-500 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600 active:scale-[0.99] disabled:opacity-50"
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
