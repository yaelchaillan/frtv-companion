import { browser } from 'wxt/browser';
import { buildFrtvUrl } from './url';

/**
 * Côté service d'arrière-plan : GET vers frtv.fr avec cache.
 * - mémoire (rapide, perdue quand le service s'endort) ;
 * - `storage.session` (survit au réveil du service, vidée à la fermeture du navigateur).
 * Les requêtes identiques simultanées sont mutualisées.
 */
export const DEFAULT_TTL_MS = 10 * 60_000;

interface CacheEntry {
  t: number;
  data: unknown;
}

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const sessionArea = () => browser.storage?.session;

async function readSession(url: string): Promise<CacheEntry | undefined> {
  try {
    const key = `cache:${url}`;
    const stored = await sessionArea()?.get(key);
    return stored?.[key] as CacheEntry | undefined;
  } catch {
    return undefined;
  }
}

async function writeSession(url: string, entry: CacheEntry): Promise<void> {
  try {
    await sessionArea()?.set({ [`cache:${url}`]: entry });
  } catch {
    // Quota atteint ou zone indisponible : le cache mémoire suffit.
  }
}

export async function fetchFrtv(path: string, ttlMs: number = DEFAULT_TTL_MS): Promise<unknown> {
  const url = buildFrtvUrl(path);
  const ttl = Number.isFinite(ttlMs) && ttlMs >= 0 ? ttlMs : DEFAULT_TTL_MS;

  const cached = memory.get(url) ?? (await readSession(url));
  if (cached && Date.now() - cached.t < ttl) {
    memory.set(url, cached);
    return cached.data;
  }

  const pending = inflight.get(url);
  if (pending) return pending;

  const request = (async () => {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`FRTV a répondu ${response.status} (${path})`);
    const data: unknown = await response.json();
    const entry = { t: Date.now(), data };
    memory.set(url, entry);
    await writeSession(url, entry);
    return data;
  })().finally(() => inflight.delete(url));

  inflight.set(url, request);
  return request;
}
