"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { loginAction } from "@/server/auth/actions";

/** PROVISOIRE (jalon J3) : remplacé au jalon J4 par le formulaire de l'écran E18. */
export function LoginForm({ retour }: { retour?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);
    try {
      const result = await loginAction({
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? ""),
        retour,
      });
      if (result.ok) {
        router.replace(result.data.destination);
        return;
      }
      const fieldMessage = result.error.fields ? Object.values(result.error.fields)[0] : undefined;
      setMessage(fieldMessage ?? result.error.message);
    } catch {
      setMessage("Pas de connexion.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Identifiant
        <input name="username" autoComplete="username" autoCapitalize="none" required />
      </label>
      <label>
        Mot de passe
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {message ? <p role="alert">{message}</p> : null}
      <button type="submit" disabled={pending}>
        Se connecter
      </button>
    </form>
  );
}
