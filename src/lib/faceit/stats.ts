/**
 * Historique de matchs FACEIT d'un joueur (20 derniers) et résumé de forme.
 *
 * Route interne vérifiée le 2026-11-17 sur faceit.com :
 *   GET /api/stats/v1/stats/time/users/{playerId}/games/cs2?size=20
 * Réponse : tableau de matchs avec des champs codés. Correspondances vérifiées
 * en recoupant les valeurs (ex. K/D 0,5 = 7 kills / 14 morts) :
 *   i1 map · i6 kills · i7 assists · i8 morts · i10 victoire (« 1 ») · i12 rounds
 *   i13 headshots · i18 score · i20 dégâts · c2 K/D · c4 % HS · c10 ADR
 *   elo (Elo après le match, absent sur certains matchs) · date (ms) · matchId
 */
import { debugLog } from '../debug';

export interface FaceitMatchStat {
  matchId: string;
  date: number;
  map: string | null;
  win: boolean | null;
  kills: number;
  deaths: number;
  assists: number;
  rounds: number;
  headshots: number;
  damage: number | null;
  adr: number | null;
  elo: number | null;
  score: string | null;
  competitionId: string | null;
}

type Json = Record<string, unknown>;

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);

export function parseMatchStat(raw: unknown): FaceitMatchStat | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Json;
  const matchId = str(r.matchId);
  const date = num(r.date);
  if (!matchId || date === null) return null;
  const win = r.i10 === undefined ? null : String(r.i10) === '1';
  return {
    matchId,
    date,
    map: str(r.i1),
    win,
    kills: num(r.i6) ?? 0,
    deaths: num(r.i8) ?? 0,
    assists: num(r.i7) ?? 0,
    rounds: num(r.i12) ?? 0,
    headshots: num(r.i13) ?? 0,
    damage: num(r.i20),
    adr: num(r.c10),
    elo: num(r.elo),
    score: str(r.i18),
    competitionId: str(r.competitionId),
  };
}

export function parseMatchStats(raw: unknown): FaceitMatchStat[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map(parseMatchStat)
    .filter((m): m is FaceitMatchStat => m !== null)
    .sort((a, b) => b.date - a.date);
}

export interface FormSummary {
  matches: number;
  wins: number;
  winRate: number;
  kd: number;
  adr: number | null;
  hsPct: number;
  /** 5 derniers résultats, du plus récent au plus ancien. */
  last5: Array<'V' | 'D'>;
  /** Variation d'Elo sur la période (null si l'Elo n'est pas fourni). */
  eloDelta: number | null;
  /** Matchs joués depuis 24 h. */
  last24h: number;
}

/** Résumé de forme sur les matchs fournis (du plus récent au plus ancien). */
export function summarizeForm(stats: FaceitMatchStat[], now = Date.now()): FormSummary | null {
  if (stats.length === 0) return null;
  const sum = (pick: (m: FaceitMatchStat) => number) => stats.reduce((s, m) => s + pick(m), 0);
  const kills = sum((m) => m.kills);
  const deaths = sum((m) => m.deaths);
  const wins = stats.filter((m) => m.win === true).length;
  const decided = stats.filter((m) => m.win !== null).length;

  const withDamage = stats.filter((m) => m.damage !== null && m.rounds > 0);
  const adr = withDamage.length
    ? withDamage.reduce((s, m) => s + (m.damage as number), 0) / withDamage.reduce((s, m) => s + m.rounds, 0)
    : null;

  const withElo = stats.filter((m) => m.elo !== null);
  const newest = withElo[0];
  const oldest = withElo[withElo.length - 1];

  return {
    matches: stats.length,
    wins,
    winRate: decided ? wins / decided : 0,
    kd: deaths > 0 ? kills / deaths : kills,
    adr,
    hsPct: kills > 0 ? sum((m) => m.headshots) / kills : 0,
    last5: stats
      .filter((m) => m.win !== null)
      .slice(0, 5)
      .map((m) => (m.win ? 'V' : 'D')),
    eloDelta: newest && oldest && newest !== oldest ? (newest.elo as number) - (oldest.elo as number) : null,
    last24h: stats.filter((m) => now - m.date < 24 * 3600_000).length,
  };
}

export interface TeamMapRate {
  map: string;
  played: number;
  won: number;
}

/** Taux de victoire par map, cumulé sur les derniers matchs de chaque joueur d'une équipe. */
export function teamMapRates(players: FaceitMatchStat[][]): TeamMapRate[] {
  const byMap = new Map<string, TeamMapRate>();
  for (const stats of players) {
    for (const m of stats) {
      if (!m.map || m.win === null) continue;
      const rate = byMap.get(m.map) ?? { map: m.map, played: 0, won: 0 };
      rate.played += 1;
      if (m.win) rate.won += 1;
      byMap.set(m.map, rate);
    }
  }
  return [...byMap.values()].sort((a, b) => b.played - a.played || a.map.localeCompare(b.map));
}

/**
 * Estimation des points d'Elo FACEIT en jeu : K = 50 (±25 à niveau égal), échelle 400.
 * Approximation : FACEIT ne publie pas sa formule exacte.
 */
export function eloStakes(teamElo: number, opponentElo: number): { win: number; loss: number; probability: number } {
  const probability = 1 / (1 + 10 ** ((opponentElo - teamElo) / 400));
  return {
    probability,
    win: Math.max(1, Math.round(50 * (1 - probability))),
    loss: Math.max(1, Math.round(50 * probability)),
  };
}

// ----- Accès réseau (même origine, session de l'utilisateur) -----

const cache = new Map<string, { t: number; value: Promise<FaceitMatchStat[]> }>();
const TTL_MS = 10 * 60_000;

export function fetchRecentStats(playerId: string, size = 20): Promise<FaceitMatchStat[]> {
  const key = `${playerId}:${size}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL_MS) return hit.value;

  const url = `/api/stats/v1/stats/time/users/${encodeURIComponent(playerId)}/games/cs2?size=${size}`;
  const value = fetch(url, { credentials: 'include', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
    .then((r) => {
      if (!r.ok) throw new Error(`FACEIT a répondu ${r.status} (stats)`);
      return r.json() as Promise<unknown>;
    })
    .then((json) => {
      const stats = parseMatchStats(json);
      debugLog(`FACEIT stats (${playerId})`, stats.length, 'matchs');
      return stats;
    })
    .catch((error: unknown) => {
      cache.delete(key);
      throw error;
    });
  cache.set(key, { t: Date.now(), value });
  return value;
}

/** Exécute des tâches avec un nombre limité en parallèle. */
export async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i] as T);
    }
  });
  await Promise.all(workers);
  return results;
}
