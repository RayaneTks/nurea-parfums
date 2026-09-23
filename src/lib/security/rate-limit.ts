/**
 * Limite de débit par adresse, en mémoire du processus.
 *
 * **Ce qu'elle fait, et ce qu'elle ne fait pas.** Sur Vercel, chaque instance de fonction a sa
 * propre mémoire : deux requêtes servies par deux instances comptent dans deux compteurs. La limite
 * n'est donc PAS un quota exact — c'est un frein. Elle suffit à ce pour quoi elle est posée :
 * casser la boucle d'un script qui aspire le catalogue ou sature la boîte mail depuis une machine,
 * et éviter qu'un tel script fasse grimper la facture d'appels. Elle ne protège pas d'un botnet
 * réparti sur mille adresses ; ce niveau-là se traite au pare-feu de l'hébergeur (Vercel Firewall),
 * en amont du code, et se règle dans la console — pas dans ce fichier.
 *
 * Fenêtre FIXE et non glissante : un compteur et une échéance par clé, rien à balayer. Deux fois la
 * limite peut donc passer à cheval sur deux fenêtres ; c'est admis, on freine, on ne comptabilise
 * pas.
 *
 * Aucune donnée personnelle n'est conservée : la clé est un condensé non réversible de l'adresse
 * (voir `hashKey`), et l'entrée disparaît à la fin de sa fenêtre.
 */

export type RateLimitDecision = {
  ok: boolean;
  /** Essais restants dans la fenêtre en cours. */
  remaining: number;
  /** Secondes avant la prochaine fenêtre — la valeur de `Retry-After`. */
  retryAfterSeconds: number;
};

export type RateLimiter = {
  check(key: string, now?: number): RateLimitDecision;
  /** Remise à zéro — les tests, et rien d'autre. */
  reset(): void;
  readonly size: number;
};

export type RateLimitOptions = {
  /** Essais autorisés par fenêtre. */
  limit: number;
  /** Durée de la fenêtre, en millisecondes. */
  windowMs: number;
  /**
   * Nombre maximal de clés retenues. Au-delà, la table est purgée de ses entrées expirées, puis
   * vidée si cela ne suffit pas : mieux vaut oublier des compteurs que de laisser la mémoire d'une
   * instance croître sans borne sous une attaque qui change d'adresse à chaque appel.
   */
  maxKeys?: number;
};

const DEFAULT_MAX_KEYS = 10_000;

export function createRateLimiter({ limit, windowMs, maxKeys = DEFAULT_MAX_KEYS }: RateLimitOptions): RateLimiter {
  if (limit < 1) throw new Error("limit doit valoir au moins 1");
  if (windowMs < 1) throw new Error("windowMs doit valoir au moins 1");

  const windows = new Map<string, { count: number; resetAt: number }>();

  function prune(now: number): void {
    for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key);
    if (windows.size >= maxKeys) windows.clear();
  }

  return {
    check(key, now = Date.now()) {
      const current = windows.get(key);
      if (!current || current.resetAt <= now) {
        if (windows.size >= maxKeys) prune(now);
        windows.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
      }
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      if (current.count >= limit) return { ok: false, remaining: 0, retryAfterSeconds };
      current.count += 1;
      return { ok: true, remaining: limit - current.count, retryAfterSeconds };
    },
    reset() {
      windows.clear();
    },
    get size() {
      return windows.size;
    },
  };
}

/**
 * L'adresse du client, telle que l'hébergeur la rapporte.
 *
 * Sur Vercel, `x-forwarded-for` est RÉÉCRIT par la plateforme : le premier segment est l'adresse
 * réelle de la connexion, ce qu'un client envoie lui-même est écrasé. Hors Vercel (dev, test), la
 * valeur est celle du navigateur — un attaquant local peut donc la choisir, ce qui est sans
 * conséquence : on ne défend pas la machine de développement.
 *
 * Sans en-tête, tous les appels partagent la clé `"inconnue"` : la limite s'applique alors
 * globalement plutôt que de ne pas s'appliquer.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip")?.trim() || "inconnue";
}

/**
 * Condensé court et stable d'une chaîne (FNV-1a 32 bits).
 *
 * Une adresse IP est une donnée personnelle ; le compteur n'a pas besoin de la connaître, seulement
 * de distinguer deux clients. Le condensé n'est pas cryptographique — il n'a pas à l'être : il vit
 * quelques minutes en mémoire et ne sort jamais du processus.
 */
export function hashKey(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** La clé d'un appel : le nom du point d'entrée et l'adresse condensée. */
export function rateLimitKey(scope: string, headers: Headers): string {
  return `${scope}:${hashKey(clientIp(headers))}`;
}
