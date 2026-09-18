import { describe, expect, it } from "vitest";
import { CACHE_PREFIX, OFFLINE_URL, SKIP_WAITING_MESSAGE, renderServiceWorker } from "../service-worker";

/**
 * Le service worker RENDU (04 §14.2, §14.3 ; critère de 07 J16 : « script rendu sans règle de cache
 * pour `/api/` ni pour les navigations »).
 *
 * Le script n'est pas relu à l'expression régulière : il est EXÉCUTÉ dans un faux
 * `ServiceWorkerGlobalScope`, et la politique est éprouvée sur de vraies requêtes. Un futur `cache.put`
 * glissé dans la branche des navigations échouerait ici, alors qu'un grep passerait à côté.
 */

const ORIGIN = "https://gestion.nurea.test";

type Handler = (event: unknown) => void;

type FakeResponse = { ok: boolean; type: string; redirected?: boolean; body?: string; clone: () => FakeResponse };

function fakeResponse(body: string, init: { ok?: boolean; type?: string; redirected?: boolean } = {}): FakeResponse {
  const response: FakeResponse = {
    ok: init.ok ?? true,
    type: init.type ?? "basic",
    redirected: init.redirected ?? false,
    body,
    clone: () => response,
  };
  return response;
}

type Scope = {
  dispatch: (type: string, event: Record<string, unknown>) => void;
  /** Ce qui a été écrit en cache, sous la forme `nom-du-cache <url>`. */
  puts: string[];
  deleted: string[];
  cacheNames: string[];
  skipWaitingCalls: number;
  claimCalls: number;
  fetched: { url: string; redirect?: string; cache?: string }[];
  seed: (cacheName: string, url: string, value: FakeResponse) => void;
  setFetch: (fn: (request: { url: string; redirect?: string; cache?: string }) => Promise<unknown>) => void;
  waitUntils: Promise<unknown>[];
};

/** Monte le script rendu dans un faux global de service worker. Aucune API réelle n'est touchée. */
function boot(version = "deploy-1", existingCaches: string[] = []): Scope {
  const listeners = new Map<string, Handler[]>();
  const stores = new Map<string, Map<string, FakeResponse>>();
  for (const name of existingCaches) stores.set(name, new Map());

  const scope: Scope = {
    dispatch: (type, event) => {
      for (const handler of listeners.get(type) ?? []) handler(event);
    },
    puts: [],
    deleted: [],
    get cacheNames() {
      return [...stores.keys()];
    },
    skipWaitingCalls: 0,
    claimCalls: 0,
    fetched: [],
    seed: (cacheName, url, value) => {
      const store = stores.get(cacheName) ?? new Map<string, FakeResponse>();
      store.set(url, value);
      stores.set(cacheName, store);
    },
    setFetch: (fn) => {
      fetchImpl = fn;
    },
    waitUntils: [],
  };

  let fetchImpl: (request: { url: string; redirect?: string; cache?: string }) => Promise<unknown> = async () =>
    fakeResponse("réseau");

  const openCache = (name: string) => {
    const store = stores.get(name) ?? new Map<string, FakeResponse>();
    stores.set(name, store);
    return {
      put: async (request: string | { url: string }, response: FakeResponse) => {
        const url = typeof request === "string" ? request : request.url;
        scope.puts.push(`${name} ${url}`);
        store.set(url, response);
      },
      match: async (request: string | { url: string }) => {
        const url = typeof request === "string" ? request : request.url;
        return store.get(url);
      },
    };
  };

  const caches = {
    open: async (name: string) => openCache(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => {
      scope.deleted.push(name);
      return stores.delete(name);
    },
    match: async (request: string | { url: string }, options?: { cacheName?: string }) => {
      const url = typeof request === "string" ? request : request.url;
      const names = options?.cacheName ? [options.cacheName] : [...stores.keys()];
      for (const name of names) {
        const hit = stores.get(name)?.get(url);
        if (hit) return hit;
      }
      return undefined;
    },
  };

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, handler: Handler) => {
      listeners.set(type, [...(listeners.get(type) ?? []), handler]);
    },
    skipWaiting: () => {
      scope.skipWaitingCalls += 1;
    },
    clients: {
      claim: async () => {
        scope.claimCalls += 1;
      },
    },
  };

  const run = new Function("self", "caches", "fetch", "Request", "Response", renderServiceWorker(version));
  run(
    self,
    caches,
    (request: { url: string; redirect?: string; cache?: string }) => {
      scope.fetched.push({ url: request.url, redirect: request.redirect, cache: request.cache });
      return fetchImpl(request);
    },
    // `Request` minimal : le script n'en lit que l'URL et les options qu'il a posées.
    class FakeRequest {
      url: string;
      redirect?: string;
      cache?: string;
      constructor(url: string, init: { redirect?: string; cache?: string } = {}) {
        this.url = url;
        this.redirect = init.redirect;
        this.cache = init.cache;
      }
    },
    class FakeBody {
      status: number;
      constructor(
        public body: string,
        init: { status?: number } = {},
      ) {
        this.status = init.status ?? 200;
      }
    },
  );
  return scope;
}

/** Une requête telle que le navigateur la passe au `fetch` du worker. */
function request(path: string, init: { method?: string; mode?: string; origin?: string } = {}) {
  return {
    url: `${init.origin ?? ORIGIN}${path}`,
    method: init.method ?? "GET",
    mode: init.mode ?? "no-cors",
  };
}

/** Déclenche `fetch` et rend la réponse promise par `respondWith`, ou `undefined` si la requête est ignorée. */
async function handleFetch(scope: Scope, req: ReturnType<typeof request>): Promise<unknown> {
  let responded: Promise<unknown> | undefined;
  scope.dispatch("fetch", { request: req, respondWith: (value: Promise<unknown>) => (responded = value) });
  return responded === undefined ? undefined : await responded;
}

describe("service worker rendu (04 §14.2)", () => {
  it("se parse et change d'octets à chaque déploiement", () => {
    const script = renderServiceWorker("deploy-1");
    expect(() => new Function(script)).not.toThrow();
    expect(script).not.toBe(renderServiceWorker("deploy-2"));
    expect(script).toContain(`"deploy-1"`);
  });

  it("n'intercepte JAMAIS /api/, ni en navigation, ni en requête de données", async () => {
    const scope = boot();
    expect(await handleFetch(scope, request("/api/admin/search?q=fa"))).toBeUndefined();
    expect(await handleFetch(scope, request("/api/admin/search", { mode: "navigate" }))).toBeUndefined();
    expect(await handleFetch(scope, request("/api/pwa/admin"))).toBeUndefined();
    expect(scope.puts).toEqual([]);
  });

  it("ignore les non-GET et les autres origines", async () => {
    const scope = boot();
    expect(await handleFetch(scope, request("/admin/vendre", { method: "POST", mode: "navigate" }))).toBeUndefined();
    expect(await handleFetch(scope, request("/admin", { origin: "https://autre.test", mode: "navigate" }))).toBeUndefined();
  });

  it("une navigation va au réseau et n'entre JAMAIS en cache", async () => {
    const scope = boot();
    const network = fakeResponse("<html>écran</html>");
    scope.setFetch(async () => network);
    expect(await handleFetch(scope, request("/admin/commandes", { mode: "navigate" }))).toBe(network);
    expect(scope.puts).toEqual([]);
  });

  it("réseau coupé : la navigation sert la page hors ligne pré-cachée, sans rien mettre en cache", async () => {
    const scope = boot("deploy-1");
    const offline = fakeResponse("<html>hors ligne</html>");
    scope.seed(`${CACHE_PREFIX}deploy-1-shell`, OFFLINE_URL, offline);
    scope.setFetch(async () => {
      throw new Error("offline");
    });
    expect(await handleFetch(scope, request("/admin", { mode: "navigate" }))).toBe(offline);
    expect(scope.puts).toEqual([]);
  });

  it("les URL versionnées par leur contenu sont en cache d'abord, le reste est ignoré", async () => {
    const scope = boot("deploy-1");
    const chunk = fakeResponse("chunk");
    scope.setFetch(async () => chunk);

    expect(await handleFetch(scope, request("/_next/static/chunks/a.js"))).toBe(chunk);
    expect(await handleFetch(scope, request("/pwa/admin/icon-192.png"))).toBe(chunk);
    expect(await handleFetch(scope, request("/branding/logo.png"))).toBe(chunk);
    // `/_next/image` : en-têtes HTTP longs, stockage sinon non borné au fil du catalogue (04 §14.2).
    expect(await handleFetch(scope, request("/_next/image?url=%2Fx.webp"))).toBeUndefined();
    expect(await handleFetch(scope, request("/admin-offline.html"))).toBeUndefined();

    await Promise.resolve();
    expect(scope.puts).toEqual([
      `${CACHE_PREFIX}deploy-1-assets ${ORIGIN}/_next/static/chunks/a.js`,
      `${CACHE_PREFIX}deploy-1-assets ${ORIGIN}/pwa/admin/icon-192.png`,
      `${CACHE_PREFIX}deploy-1-assets ${ORIGIN}/branding/logo.png`,
    ]);
  });

  it("à l'installation, pré-cache la page hors ligne sans suivre de redirection", async () => {
    const scope = boot("deploy-1");
    scope.setFetch(async () => fakeResponse("<html>hors ligne</html>"));
    const waited: Promise<unknown>[] = [];
    scope.dispatch("install", { waitUntil: (p: Promise<unknown>) => waited.push(p) });
    await Promise.all(waited);

    expect(scope.fetched).toEqual([{ url: OFFLINE_URL, redirect: "manual", cache: "reload" }]);
    expect(scope.puts).toEqual([`${CACHE_PREFIX}deploy-1-shell ${OFFLINE_URL}`]);
    // Pas de `skipWaiting()` à l'installation : la nouvelle version attend (04 §14.3).
    expect(scope.skipWaitingCalls).toBe(0);
  });

  it("une redirection (écran de connexion) ne devient jamais le repli hors ligne", async () => {
    for (const response of [
      fakeResponse("connexion", { redirected: true }),
      fakeResponse("", { type: "opaqueredirect", ok: false }),
      fakeResponse("erreur", { ok: false }),
    ]) {
      const scope = boot("deploy-1");
      scope.setFetch(async () => response);
      const waited: Promise<unknown>[] = [];
      scope.dispatch("install", { waitUntil: (p: Promise<unknown>) => waited.push(p) });
      await Promise.all(waited);
      expect(scope.puts).toEqual([]);
    }
  });

  it("à l'activation, supprime les caches des autres versions et prend la main", async () => {
    const scope = boot("deploy-2", [
      `${CACHE_PREFIX}deploy-1-assets`,
      `${CACHE_PREFIX}deploy-1-shell`,
      `${CACHE_PREFIX}deploy-2-assets`,
      "cache-d-un-autre-site",
    ]);
    const waited: Promise<unknown>[] = [];
    scope.dispatch("activate", { waitUntil: (p: Promise<unknown>) => waited.push(p) });
    await Promise.all(waited);

    expect(scope.deleted.sort()).toEqual([`${CACHE_PREFIX}deploy-1-assets`, `${CACHE_PREFIX}deploy-1-shell`]);
    expect(scope.claimCalls).toBe(1);
  });

  it("« skip-waiting » — et lui seul — fait passer la version en attente", () => {
    const scope = boot();
    scope.dispatch("message", { data: "autre-chose" });
    expect(scope.skipWaitingCalls).toBe(0);
    scope.dispatch("message", { data: SKIP_WAITING_MESSAGE });
    expect(scope.skipWaitingCalls).toBe(1);
  });
});
