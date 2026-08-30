/**
 * Service worker de l'app de gestion Nuréa (scope `/admin/`).
 *
 * Objectifs, dans l'ordre :
 *   1. Démarrage instantané depuis l'écran d'accueil — les bundles JS/CSS et les
 *      images sont servis depuis le cache, sans attendre le réseau.
 *   2. Pas d'écran d'erreur Safari hors ligne — une page de repli est affichée.
 *
 * Règle de sécurité : AUCUNE réponse d'API ni AUCUN HTML de page authentifiée
 * n'est mise en cache. Les données métier (commandes, clients, compta) sont
 * toujours lues sur le réseau ; le cache ne contient que des assets publics
 * immuables et la page de repli hors ligne.
 */

const VERSION = "nurea-admin-v1";
const ASSET_CACHE = `${VERSION}-assets`;
const SHELL_CACHE = `${VERSION}-shell`;
const OFFLINE_URL = "/admin/offline";

/** Assets versionnés par leur URL : sûrs à garder indéfiniment. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/pwa/admin/") ||
    url.pathname.startsWith("/branding/")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Données métier et authentification : toujours réseau, jamais de cache.
  if (url.pathname.startsWith("/api/")) return;

  // Navigation : réseau d'abord, page de repli si le réseau est indisponible.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return (
          cached ??
          new Response("Hors ligne", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }),
    );
    return;
  }

  // Assets immuables : cache d'abord (démarrage à froid quasi instantané).
  //
  // Volontairement limité aux URL versionnées par leur contenu. Mettre en cache
  // `/_next/image` ferait grossir le stockage sans limite au fil des visuels du
  // catalogue, pour un gain nul : ces réponses portent déjà des en-têtes de
  // cache HTTP longs.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});
