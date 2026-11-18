/**
 * Calculs purs sur les données FRTV : probabilité, forme, face-à-face, veto, maps.
 * Aucun accès réseau ici, tout est testable.
 */
import type { FrtvSeries } from './types';

export type Side = 'team1' | 'team2';
/** V = victoire, D = défaite, N = nul. */
export type Outcome = 'V' | 'D' | 'N';

const other = (side: Side): Side => (side === 'team1' ? 'team2' : 'team1');

/** Probabilité de victoire de A contre B (formule Elo classique, échelle 400). */
export function winProbability(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function sideOf(series: FrtvSeries, teamId: string): Side | null {
  const teams = series.match_series_teams;
  if (teams?.team1?.id?._id === teamId) return 'team1';
  if (teams?.team2?.id?._id === teamId) return 'team2';
  return null;
}

export function scheduledTime(series: FrtvSeries): number {
  const raw = series.match_series_dates?.scheduled ?? series.match_series_dates?.started ?? null;
  const t = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(t) ? t : 0;
}

/** Maps gagnées par chaque camp, d'après les scores de chaque map. */
export function mapsWon(series: FrtvSeries): { team1: number; team2: number } {
  const result = { team1: 0, team2: 0 };
  for (const map of series.match_series_matches ?? []) {
    const s1 = map.match_scores?.team1;
    const s2 = map.match_scores?.team2;
    if (typeof s1 !== 'number' || typeof s2 !== 'number' || s1 === s2) continue;
    if (s1 > s2) result.team1 += 1;
    else result.team2 += 1;
  }
  return result;
}

/** Résultat d'une série terminée pour une équipe, `null` si inconnu. */
export function seriesOutcome(series: FrtvSeries, teamId: string): Outcome | null {
  if (series.match_series_status !== 'Finished') return null;
  const side = sideOf(series, teamId);
  if (!side) return null;

  const mine = series.match_series_teams?.[side]?.score;
  const theirs = series.match_series_teams?.[other(side)]?.score;
  if (typeof mine === 'number' && typeof theirs === 'number' && mine !== theirs) {
    return mine > theirs ? 'V' : 'D';
  }
  // Score de série absent ou nul : on se rabat sur les maps.
  const won = mapsWon(series);
  if (won[side] === won[other(side)]) return won[side] > 0 ? 'N' : null;
  return won[side] > won[other(side)] ? 'V' : 'D';
}

export interface ScoreLine {
  mine: number;
  theirs: number;
  /** `rounds` pour une série d'une seule map (ex. 13-9), `maps` sinon (ex. 2-1). */
  unit: 'rounds' | 'maps';
}

/** Score d'une série vu par une équipe. */
export function seriesScore(series: FrtvSeries, teamId: string): ScoreLine | null {
  const side = sideOf(series, teamId);
  if (!side) return null;

  const played = (series.match_series_matches ?? []).filter((m) => {
    const s1 = m.match_scores?.team1;
    const s2 = m.match_scores?.team2;
    return typeof s1 === 'number' && typeof s2 === 'number' && s1 + s2 > 0;
  });
  const single = played.length === 1 ? played[0]?.match_scores : null;
  if (single) {
    return { mine: single[side] as number, theirs: single[other(side)] as number, unit: 'rounds' };
  }

  const mine = series.match_series_teams?.[side]?.score;
  const theirs = series.match_series_teams?.[other(side)]?.score;
  if (typeof mine === 'number' && typeof theirs === 'number' && mine + theirs > 0) {
    return { mine, theirs, unit: 'maps' };
  }
  const won = mapsWon(series);
  if (won.team1 + won.team2 > 0) return { mine: won[side], theirs: won[other(side)], unit: 'maps' };
  return null;
}

/** Séries terminées d'une équipe, de la plus récente à la plus ancienne. */
export function finishedHistory(list: FrtvSeries[], teamId: string, excludeSeriesId?: string): FrtvSeries[] {
  const seen = new Set<string>();
  return list
    .filter((s) => {
      if (s._id === excludeSeriesId || seen.has(s._id)) return false;
      seen.add(s._id);
      return s.match_series_status === 'Finished' && sideOf(s, teamId) !== null;
    })
    .sort((a, b) => scheduledTime(b) - scheduledTime(a));
}

export function recentForm(history: FrtvSeries[], teamId: string, count = 5): Outcome[] {
  const form: Outcome[] = [];
  for (const series of history) {
    const outcome = seriesOutcome(series, teamId);
    if (outcome) form.push(outcome);
    if (form.length >= count) break;
  }
  return form;
}

export interface HeadToHead {
  winsA: number;
  winsB: number;
  /** Séries entre A et B, de la plus récente à la plus ancienne. */
  series: FrtvSeries[];
}

export function headToHead(historyA: FrtvSeries[], teamA: string, teamB: string): HeadToHead {
  const series = historyA.filter((s) => sideOf(s, teamB) !== null);
  let winsA = 0;
  let winsB = 0;
  for (const s of series) {
    const outcome = seriesOutcome(s, teamA);
    if (outcome === 'V') winsA += 1;
    else if (outcome === 'D') winsB += 1;
  }
  return { winsA, winsB, series };
}

export interface MapCount {
  map: string;
  count: number;
}

export interface VetoTendencies {
  /** Nombre de séries avec veto prises en compte. */
  sample: number;
  bans: MapCount[];
  picks: MapCount[];
}

function sortCounts(counts: Map<string, number>): MapCount[] {
  return [...counts.entries()]
    .map(([map, count]) => ({ map, count }))
    .sort((a, b) => b.count - a.count || a.map.localeCompare(b.map));
}

/** Maps le plus souvent bannies / choisies par une équipe sur ses dernières séries. */
export function vetoTendencies(history: FrtvSeries[], teamId: string, lastSeries = 10): VetoTendencies {
  const bans = new Map<string, number>();
  const picks = new Map<string, number>();
  let sample = 0;
  for (const series of history) {
    if (sample >= lastSeries) break;
    const veto = series.match_series_veto ?? [];
    if (veto.length === 0) continue;
    sample += 1;
    for (const step of veto) {
      if (step.team_id !== teamId || !step.map) continue;
      const target = step.action === 'ban' ? bans : step.action === 'pick' ? picks : null;
      target?.set(step.map, (target.get(step.map) ?? 0) + 1);
    }
  }
  return { sample, bans: sortCounts(bans), picks: sortCounts(picks) };
}

export interface MapRecord {
  map: string;
  played: number;
  won: number;
}

/** Bilan par map (maps réellement jouées) sur les dernières séries. */
export function mapRecords(history: FrtvSeries[], teamId: string, lastSeries = 20): MapRecord[] {
  const records = new Map<string, MapRecord>();
  for (const series of history.slice(0, lastSeries)) {
    const side = sideOf(series, teamId);
    if (!side) continue;
    for (const map of series.match_series_matches ?? []) {
      const mine = map.match_scores?.[side];
      const theirs = map.match_scores?.[other(side)];
      if (!map.match_map || typeof mine !== 'number' || typeof theirs !== 'number') continue;
      if (mine === 0 && theirs === 0) continue; // map pas jouée
      const record = records.get(map.match_map) ?? { map: map.match_map, played: 0, won: 0 };
      record.played += 1;
      if (mine > theirs) record.won += 1;
      records.set(map.match_map, record);
    }
  }
  return [...records.values()].sort((a, b) => b.played - a.played || a.map.localeCompare(b.map));
}

export interface RecentSeries {
  id: string;
  outcome: Outcome | null;
  score: ScoreLine | null;
  opponent: string;
  /** Map jouée si la série n'en compte qu'une. */
  map: string | null;
  date: string | null;
}

/** Dernières séries terminées d'une équipe (historique déjà trié du plus récent au plus ancien). */
export function recentSeries(history: FrtvSeries[], teamId: string, count = 3): RecentSeries[] {
  return history.slice(0, count).map((s) => {
    const side = sideOf(s, teamId);
    const opponentSide = side ? other(side) : 'team2';
    const played = (s.match_series_matches ?? []).filter((m) => m.match_map);
    return {
      id: s._id,
      outcome: seriesOutcome(s, teamId),
      score: seriesScore(s, teamId),
      opponent: s.match_series_teams?.[opponentSide]?.id?.team_name ?? 'Équipe',
      map: played.length === 1 ? (played[0]?.match_map ?? null) : null,
      date: s.match_series_dates?.scheduled ?? null,
    };
  });
}

/** `de_dust2` → `Dust2`. */
export function mapLabel(map: string): string {
  const name = map.replace(/^(de|cs|ar)_/i, '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Libellé du format : 1 → BO1. */
export function formatLabel(format?: number | null): string | null {
  return typeof format === 'number' && format > 0 ? `BO${format}` : null;
}
