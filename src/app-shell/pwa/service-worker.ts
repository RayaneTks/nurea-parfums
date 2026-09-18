/**
 * Source du service worker de la gestion (docs/refonte/04-ARCHITECTURE.md §14.2 et §14.3).
 *
 * Le script n'est PAS un fichier statique : `app/admin-sw.js/route.ts` le rend avec l'identifiant du
 * déploiement (`BUILD_ID`). Chaque déploiement change donc les octets servis à `/admin-sw.js`, le
 * navigateur installe la nouvelle version, qui **attend** — plus de `skipWaiting()` inconditionnel,
 * plus de `VERSION = "nurea-admin-v1"` figée qu'on oubliait d'incrémenter (01 §4.7).
 *
 * Politique, dans l'ordre où le `fetch` la lit :
 *
 * | Requête | Traitement |
 * |---|---|
 * | non-GET, autre origine | ignorée |
 * | `/api/*` | **jamais** interceptée ni mise en cache |
 * | navigation (HTML) | réseau ; échec **ou 10 s sans réponse** → page hors ligne pré-cachée. Aucune réponse de navigation n'entre jamais en cache. |
 * | `/_next/static/*`, `/pwa/admin/*`, `/branding/*` | cache d'abord, rempli à la volée (URL versionnées par leur contenu) |
 * | `/admin-offline.html` | pré-caché à l'installation, sans suivre de redirection |
 * | tout le reste (dont `/_next/image`) | ignoré (en-têtes HTTP longs, stockage sinon non borné) |
 *
 * Ce module est pur (ni React, ni Next) : le test unitaire exécute le script rendu dans un faux
 * `ServiceWorkerGlobalScope` et vérifie la politique sur de vraies requêtes, pas sur une expression
 * régulière (`src/app-shell/pwa/__tests__/service-worker.test.ts`).
 */

/** Page hors ligne autonome (04 §14.4). Hors du matcher de `proxy.ts` : jamais redirigée vers la connexion. */
export const OFFLINE_URL = "/admin-offline.html";

/** Message envoyé par le registrar quand le gérant touche « Recharger » (04 §14.3). */
export const SKIP_WAITING_MESSAGE = "skip-waiting";

/** Préfixe commun des caches de l'app : ce qui ne le porte pas appartient à une autre version. */
export const CACHE_PREFIX = "nurea-admin-";

/** URL versionnées par leur contenu : sûres à garder tant que la version du script ne change pas. */
export const IMMUTABLE_PREFIXES = ["/_next/static/", "/pwa/admin/", "/branding/"] as const;

/** Repli sur la page hors ligne quand le réseau ne répond pas (06 §1.4 « Réseau dégradé », F-4.7-05). */
export const NAVIGATION_TIMEOUT_MS = 10_000;

/**
 * Le script servi à `GET /admin-sw.js`. `version` est l'identifiant du déploiement : il n'entre dans le
 * script que par `JSON.stringify`, donc jamais interprété comme du code.
 */
export function renderServiceWorker(version: string): string {
  return `/* Nuréa Gestion — service worker rendu par app/admin-sw.js/route.ts. Ne pas éditer. */
const VERSION = ${JSON.stringify(version)};
const CACHE_PREFIX = ${JSON.stringify(CACHE_PREFIX)};
const ASSET_CACHE = CACHE_PREFIX + VERSION + "-assets";
const SHELL_CACHE = CACHE_PREFIX + VERSION + "-shell";
const OFFLINE_URL = ${JSON.stringify(OFFLINE_URL)};
const IMMUTABLE_PREFIXES = ${JSON.stringify(IMMUTABLE_PREFIXES)};
const NAVIGATION_TIMEOUT_MS = ${NAVIGATION_TIMEOUT_MS};

function isImmutableAsset(url) {
  for (var i = 0; i < IMMUTABLE_PREFIXES.length; i += 1) {
    if (url.pathname.indexOf(IMMUTABLE_PREFIXES[i]) === 0) return true;
  }
  return false;
}

/* Données métier et authentification : la requête n'est même pas regardée. */
function isApi(url) {
  return url.pathname === "/api" || url.pathname.indexOf("/api/") === 0;
}

/*
 * Pré-cache de la page hors ligne SANS suivre de redirection : si une redirection survenait malgré
 * tout (bug 01 §4.7 : l'écran de connexion devenait le repli), on préfère n'avoir aucun repli plutôt
 * qu'un faux. \`redirect: "manual"\` rend une réponse opaque, qu'on refuse explicitement.
 */
function precacheOfflinePage() {
  return caches.open(SHELL_CACHE).then(function (cache) {
    return fetch(new Request(OFFLINE_URL, { cache: "reload", redirect: "manual" })).then(function (response) {
      if (!response || response.redirected || response.type === "opaqueredirect" || !response.ok) return undefined;
      return cache.put(OFFLINE_URL, response);
    });
  });
}

self.addEventListener("install", function (event) {
  /* La nouvelle version ATTEND : elle ne prend la main qu'au message du registrar (04 §14.3). */
  event.waitUntil(
    precacheOfflinePage().catch(function () {
      return undefined;
    }),
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        /* Les chunks des anciens déploiements ne s'accumulent plus. */
        var stale = keys.filter(function (key) {
          return key.indexOf(CACHE_PREFIX) === 0 && key !== ASSET_CACHE && key !== SHELL_CACHE;
        });
        return Promise.all(
          stale.map(function (key) {
            return caches.delete(key);
          }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("message", function (event) {
  if (event.data === ${JSON.stringify(SKIP_WAITING_MESSAGE)}) self.skipWaiting();
});

/* Réseau, avec un délai maximal ; jamais de mise en cache d'une réponse de navigation. */
function navigateOrOffline(request) {
  return new Promise(function (resolve) {
    var settled = false;
    var fallback = function () {
      if (settled) return;
      settled = true;
      caches
        .match(OFFLINE_URL, { cacheName: SHELL_CACHE })
        .then(function (cached) {
          resolve(
            cached ||
              new Response("Pas de connexion.", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              }),
          );
        })
        .catch(function () {
          resolve(new Response("Pas de connexion.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }));
        });
    };
    var timer = setTimeout(fallback, NAVIGATION_TIMEOUT_MS);
    fetch(request).then(
      function (response) {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        resolve(response);
      },
      function () {
        clearTimeout(timer);
        fallback();
      },
    );
  });
}

function assetFirst(request) {
  return caches.match(request, { cacheName: ASSET_CACHE }).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      if (response && response.ok && response.type === "basic") {
        var copy = response.clone();
        caches.open(ASSET_CACHE).then(function (cache) {
          cache.put(request, copy);
        });
      }
      return response;
    });
  });
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApi(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(navigateOrOffline(request));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(assetFirst(request));
  }
});
`;
}
