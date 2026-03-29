import { NextResponse } from "next/server";
import { validatePerfumeSearchQuery } from "@/lib/search/normalizePerfumeQuery";
import { parseCategoryParam } from "@/lib/search/searchLocalCatalog";
import { searchPerfumeWithFallback } from "@/lib/search/searchPerfumeWithFallback";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validated = validatePerfumeSearchQuery(searchParams.get("q"));
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const category = parseCategoryParam(searchParams.get("cat"));

  try {
    const payload = await searchPerfumeWithFallback(validated.value, {
      category,
      signal: request.signal,
    });
    return NextResponse.json(payload);
  } catch (e) {
    console.error("[perfume-search]", e);
    return NextResponse.json(
      { error: "Impossible de finaliser la recherche." },
      { status: 500 }
    );
  }
}
