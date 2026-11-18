/**
 * Formatage à la française (fr-FR) : espace fine insécable pour les milliers et avant
 * « % », virgule décimale, vrai signe moins (U+2212), V / D pour les résultats.
 */
const NNBSP = ' ';
const MINUS = '−';

const intFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const ratingFmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const oneDecFmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 3856 → « 3 856 ». */
export const fmtInt = (value: number) => intFmt.format(Math.round(value));

/** Rating ou K/D : 1.284 → « 1,28 ». */
export const fmtRating = (value: number) => ratingFmt.format(value);

/** ADR, KAST : 85.34 → « 85,3 ». */
export const fmtDecimal = (value: number) => oneDecFmt.format(value);

/** Ratio → pourcentage entier : 0.62 → « 62 % ». */
export const fmtPct = (ratio: number) => `${intFmt.format(Math.round(ratio * 100))}${NNBSP}%`;

/** Alias historique. */
export const fmtPercent = fmtPct;

/** +134, −131, ±0. */
export function fmtSigned(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return '±0';
  return `${rounded > 0 ? '+' : MINUS}${intFmt.format(Math.abs(rounded))}`;
}

const toDate = (iso?: string | number | null) => {
  if (iso === null || iso === undefined || iso === '') return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** « mar. 17 nov., 20:00 ». */
export function fmtDateTime(iso?: string | number | null): string | null {
  const date = toDate(iso);
  return date
    ? date.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;
}

/** « 20:00 ». */
export function fmtTime(iso?: string | number | null): string {
  const date = toDate(iso);
  return date ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
}

/** « 12 oct. ». */
export function fmtDayMonth(iso?: string | number | null): string {
  const date = toDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
}

/** « 17/11 » (panneau de secours). */
export function fmtShortDate(iso?: string | number | null): string {
  const date = toDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';
}

/** « mardi 17 novembre ». */
export function fmtLongDay(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Délai avant un horaire : « dans 2 h », « dans 35 min ». `null` si l'horaire est passé. */
export function fmtUntil(target: number, now = Date.now()): string | null {
  const minutes = Math.round((target - now) / 60_000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `dans ${minutes}${NNBSP}min`;
  return `dans ${Math.round(minutes / 60)}${NNBSP}h`;
}

/**
 * Jour relatif pour un prochain match : « Ce soir 20:00 », « Aujourd'hui 14:00 »,
 * « Demain 19:00 », sinon « mer. 19 nov. 19:00 ».
 */
export function fmtRelativeDay(iso: string | number, now = new Date()): string {
  const date = toDate(iso);
  if (!date) return '';
  const time = fmtTime(date.getTime());
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(date, now)) return `${date.getHours() >= 18 ? 'Ce soir' : "Aujourd'hui"} ${time}`;
  if (sameDay(date, tomorrow)) return `Demain ${time}`;
  return `${date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} ${time}`;
}

/** Niveau de division FRTV : `ADVANCED` → « Advanced », `OPEN_5_8` → « Open 5-8 ». */
export function fmtTier(tier?: string | null): string | null {
  if (!tier) return null;
  // `OPEN_5_8` (Elo FRTV) ou `Open5-8` (divisions des séries)
  const open = /^OPEN[\s_]*(\d+)(?:[-_](\d+))?$/i.exec(tier);
  if (open) return `Open ${open[1]}${open[2] ? `-${open[2]}` : ''}`;
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase().replace(/_/g, ' ');
}

/** Accord simple : (2, 'match') → « 2 matchs ». */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${fmtInt(count)} ${Math.abs(count) > 1 ? pluralForm : singular}`;
}
