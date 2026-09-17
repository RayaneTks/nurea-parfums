/**
 * Faux stockage d'images des tests de bout en bout (07 J11) — jamais le vrai bucket.
 *
 * Pourquoi un faux serveur plutôt qu'une branche de test dans `src/server/catalogue/storage.ts` : le code
 * de production s'exécute TEL QUEL (client `@supabase/supabase-js`, chemins décidés par le serveur, garde
 * de préfixe avant suppression), seule son adresse change. `playwright.config.ts` pose
 * `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:<E2E_STORAGE_PORT>` et une clé fictive : aucune requête ne
 * peut partir vers Supabase, et l'envoi direct navigateur → stockage par URL signée est réellement éprouvé.
 *
 * Il parle les quatre routes de l'API Storage que la gestion utilise (storage-js 2.x) :
 * - `POST /storage/v1/object/upload/sign/<bucket>/<chemin>` → `{ url: "/object/upload/sign/…?token=…" }` ;
 * - `PUT  /storage/v1/object/upload/sign/<bucket>/<chemin>?token=…` : le fichier (jeton vérifié) ;
 * - `GET  /storage/v1/object/public/<bucket>/<chemin>` : l'objet, avec CORS (partage natif, vignettes) ;
 * - `DELETE /storage/v1/object/<bucket>` `{ prefixes }` ; `POST /storage/v1/object/list/<bucket>` (orphelins).
 * Et, pour les assertions des tests : `GET /__fake/objects` (clés présentes), `GET /health`.
 *
 * N'écoute que sur 127.0.0.1 ; objets dans un dossier temporaire vidé au démarrage.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PORT = Number(process.env.E2E_STORAGE_PORT ?? "3101");
const ROOT = path.join(tmpdir(), `nurea-e2e-stockage-${PORT}`);
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

rmSync(ROOT, { recursive: true, force: true });
mkdirSync(ROOT, { recursive: true });

/** Jetons délivrés par la signature : un envoi sans jeton valide est refusé, comme en vrai. */
const tokens = new Map<string, string>();

const CONTENT_TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif" };

function cors(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-upsert, cache-control, x-client-info");
}

function send(res: ServerResponse, status: number, body: unknown) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** `<bucket>/<chemin>` sûr, ou `null`. */
function objectKey(raw: string): string | null {
  const key = decodeURIComponent(raw);
  return SAFE_KEY.test(key) && !key.split("/").some((segment) => segment === ".." || segment === ".") ? key : null;
}

function filePath(key: string): string {
  return path.join(ROOT, ...key.split("/"));
}

function listKeys(dir = ROOT, prefix = ""): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    const key = prefix ? `${prefix}/${entry}` : entry;
    return statSync(full).isDirectory() ? listKeys(full, key) : [key];
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const route = url.pathname;
    if (req.method === "OPTIONS") {
      cors(res);
      res.writeHead(204);
      res.end();
      return;
    }
    if (route === "/health") return send(res, 200, { ok: true });
    if (route === "/__fake/objects") return send(res, 200, { keys: listKeys().sort() });

    const sign = /^\/storage\/v1\/object\/upload\/sign\/(.+)$/.exec(route);
    if (sign && req.method === "POST") {
      const key = objectKey(sign[1] as string);
      if (!key) return send(res, 400, { message: "Chemin refusé" });
      const token = randomUUID();
      tokens.set(token, key);
      return send(res, 200, { url: `/object/upload/sign/${key}?token=${token}` });
    }
    if (sign && req.method === "PUT") {
      const key = objectKey(sign[1] as string);
      const token = url.searchParams.get("token") ?? "";
      if (!key || tokens.get(token) !== key) return send(res, 403, { message: "Jeton invalide" });
      const body = await readBody(req);
      mkdirSync(path.dirname(filePath(key)), { recursive: true });
      writeFileSync(filePath(key), body);
      return send(res, 200, { Key: key, Id: randomUUID() });
    }

    const publicObject = /^\/storage\/v1\/object\/public\/(.+)$/.exec(route);
    if (publicObject && (req.method === "GET" || req.method === "HEAD")) {
      const key = objectKey(publicObject[1] as string);
      if (!key || !existsSync(filePath(key))) return send(res, 404, { message: "Objet introuvable" });
      const extension = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
      cors(res);
      res.writeHead(200, { "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream", "Cache-Control": "no-store" });
      res.end(req.method === "HEAD" ? undefined : readFileSync(filePath(key)));
      return;
    }

    const bucketOp = /^\/storage\/v1\/object\/(list\/)?([A-Za-z0-9_-]+)$/.exec(route);
    if (bucketOp && req.method === "DELETE" && !bucketOp[1]) {
      const bucket = bucketOp[2] as string;
      const { prefixes = [] } = JSON.parse((await readBody(req)).toString("utf8") || "{}") as { prefixes?: string[] };
      const removed = prefixes
        .map((prefix) => objectKey(`${bucket}/${prefix}`))
        .filter((key): key is string => key !== null && existsSync(filePath(key)));
      for (const key of removed) rmSync(filePath(key));
      return send(res, 200, removed.map((key) => ({ name: key.slice(bucket.length + 1) })));
    }
    if (bucketOp && req.method === "POST" && bucketOp[1]) {
      const bucket = bucketOp[2] as string;
      const { prefix = "" } = JSON.parse((await readBody(req)).toString("utf8") || "{}") as { prefix?: string };
      const base = prefix.replace(/\/+$/, "");
      const dir = objectKey(base ? `${bucket}/${base}` : bucket);
      if (!dir || !existsSync(filePath(dir))) return send(res, 200, []);
      const entries = readdirSync(filePath(dir)).map((name) => {
        const isFolder = statSync(path.join(filePath(dir), name)).isDirectory();
        return { name, id: isFolder ? null : randomUUID(), metadata: isFolder ? null : {} };
      });
      return send(res, 200, entries);
    }

    return send(res, 404, { message: `Route inconnue du faux stockage : ${req.method} ${route}` });
  } catch (cause) {
    return send(res, 500, { message: cause instanceof Error ? cause.message : String(cause) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`Faux stockage e2e sur http://127.0.0.1:${PORT} (${ROOT})\n`);
});
