const windowMs = 15 * 60 * 1000;
const maxAttempts = 20;
const store = new Map<string, { n: number; t: number }>();

export function rateLimitLogin(ip: string): boolean {
  const now = Date.now();
  const e = store.get(ip);
  if (!e || now - e.t > windowMs) {
    store.set(ip, { n: 1, t: now });
    return true;
  }
  if (e.n >= maxAttempts) return false;
  e.n += 1;
  return true;
}
