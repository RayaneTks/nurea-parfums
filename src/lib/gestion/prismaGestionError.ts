import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * Mappe les erreurs Prisma des routes Gestion (compta / ordres / ventes) vers
 * des réponses JSON compréhensibles (schéma, connexion, contraintes).
 */
export function jsonFromPrismaGestionError(
  error: unknown,
  fallbackMessage: string,
): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2021":
      case "P2022":
        return NextResponse.json(
          {
            error:
              "Schéma base de données incomplet. Exécutez « npx prisma migrate deploy » sur cette base (les tables compta/ordres doivent exister).",
          },
          { status: 503 },
        );
      case "P2003":
        return NextResponse.json(
          { error: "Référence invalide (clé étrangère) : parfum ou ordre manquant." },
          { status: 400 },
        );
      case "P2002":
        return NextResponse.json(
          { error: "Conflit d’unicité (donnée déjà existante)." },
          { status: 409 },
        );
      default:
        break;
    }
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        error:
          "Connexion base impossible. Vérifiez DATABASE_URL sur l’hébergement (ex. port 6543 + ?pgbouncer=true pour le pooler Supabase).",
      },
      { status: 503 },
    );
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return NextResponse.json(
      { error: "Erreur interne du client base de données. Réessayez." },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
