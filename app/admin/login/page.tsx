import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

/**
 * PROVISOIRE (jalon J3) : écran nu, sans style, pour éprouver `proxy.ts` et `loginAction`.
 * Remplacé au jalon J4 par l'écran E18 (06 §3.6) monté depuis `src/features/auth`.
 */

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { retour } = await searchParams;
  return (
    <main>
      <h1>Connexion</h1>
      <LoginForm retour={typeof retour === "string" ? retour : undefined} />
    </main>
  );
}
