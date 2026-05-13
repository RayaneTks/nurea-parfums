/**
 * Lecture JSON tolérante + fetch admin (cookie de session).
 * Centralise `credentials: "include"` et `cache: "no-store"` par défaut.
 */

export async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type AdminFetchJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
};

export async function adminFetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<AdminFetchJsonResult<T>> {
  const res = await fetch(input, {
    ...init,
    credentials: init.credentials ?? "include",
    cache: init.cache ?? "no-store",
  });
  const data = await readJsonSafe<T>(res);
  return { ok: res.ok, status: res.status, data };
}
