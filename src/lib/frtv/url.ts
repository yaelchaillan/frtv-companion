/**
 * Construction sécurisée des URL de l'API FRTV.
 * Le service d'arrière-plan ne relaie QUE des GET vers ces préfixes : il ne doit
 * jamais servir de proxy ouvert pour une page web.
 */
export const FRTV_ORIGIN = 'https://frtv.fr';

const ALLOWED_PATHS = [/^\/api\/v1\/[a-z0-9-]/i, /^\/api\/streams\/[a-z0-9-]/i];

export function buildFrtvUrl(path: string): string {
  if (typeof path !== 'string' || !ALLOWED_PATHS.some((re) => re.test(path))) {
    throw new Error(`Chemin FRTV non autorisé : ${String(path)}`);
  }
  const url = new URL(path, FRTV_ORIGIN);
  if (url.origin !== FRTV_ORIGIN || url.pathname.includes('..')) {
    throw new Error(`Chemin FRTV non autorisé : ${path}`);
  }
  return url.href;
}

/** Date locale au format AAAA-MM-JJ (format attendu par `startDate` / `endDate`). */
export function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
