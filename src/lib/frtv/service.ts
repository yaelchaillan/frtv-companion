/**
 * Requêtes FRTV de haut niveau utilisées par le panneau, la carte profil et la popup.
 */
import {
  finishedHistory,
  headToHead,
  mapRecords,
  recentForm,
  recentSeries,
  scheduledTime,
  vetoTendencies,
  winProbability,
  type HeadToHead,
  type MapRecord,
  type Outcome,
  type RecentSeries,
  type Side,
  type VetoTendencies,
} from './analysis';
import { frtvGet } from './client';
import type {
  FrtvEloRanking,
  FrtvEloRow,
  FrtvPaginated,
  FrtvPlayerRanking,
  FrtvPlayerRankRow,
  FrtvSeries,
  FrtvStream,
} from './types';
import { addDays, isoDay } from './url';

const MIN = 60_000;

export const frtv = {
  eloRanking: () =>
    frtvGet<{ data: FrtvEloRanking }>('/api/v1/elo/ranking', 30 * MIN).then((r) => r.data),

  playerRanking: () =>
    frtvGet<{ data: FrtvPlayerRanking }>('/api/v1/player-stats/ranking', 60 * MIN).then((r) => r.data),

  /** Toutes les séries d'une équipe (le filtre `team` accepte le slug ou le nom). */
  teamSeries: (team: string) =>
    frtvGet<FrtvPaginated<FrtvSeries>>(
      `/api/v1/matches?team=${encodeURIComponent(team)}&limit=100`,
      15 * MIN,
    ).then((r) => r.data ?? []),

  seriesBetween: (start: Date, end: Date, page = 1, francophone = false) =>
    frtvGet<FrtvPaginated<FrtvSeries>>(
      `/api/v1/matches?page=${page}&limit=100&startDate=${isoDay(start)}&endDate=${isoDay(end)}` +
        (francophone ? '&francophone=true' : ''),
      5 * MIN,
    ),

  streams: () => frtvGet<FrtvStream[]>('/api/streams/cs2', 5 * MIN),

  /** Page FRTV d'un joueur : recherche par pseudo FACEIT, correspondance exacte. */
  playerId: (nickname: string) =>
    frtvGet<{ data?: Array<{ _id: string; player_nickname?: string; player_slug?: string | null }> }>(
      `/api/v1/players/search?query=${encodeURIComponent(nickname)}`,
      60 * MIN,
    ).then((r) => {
      const hit = (r.data ?? []).find((p) => p.player_nickname?.toLowerCase() === nickname.toLowerCase());
      return hit ? (hit.player_slug ?? hit._id) : null;
    }),

  /** Saison en cours (ex. « S59 »). */
  currentSeason: () =>
    frtvGet<{ currentSeason?: string }>('/api/v1/events/current-season', 60 * MIN).then((r) => r.currentSeason ?? null),
};

/**
 * Retrouve la série FRTV d'une salle FACEIT : l'identifiant de salle est stocké
 * dans `match_series_faceit_id`. L'API n'a pas de route de détail, on cherche donc
 * via les équipes (si connues) puis dans une fenêtre de dates.
 */
export async function findSeriesByFaceitId(
  roomId: string,
  hints: { teamNames?: string[]; around?: Date | null } = {},
): Promise<FrtvSeries | null> {
  const id = roomId.toLowerCase();
  const pick = (list: FrtvSeries[]) =>
    list.find((s) => s.match_series_faceit_id?.toLowerCase() === id) ?? null;

  for (const name of hints.teamNames ?? []) {
    if (!name?.trim()) continue;
    try {
      const found = pick(await frtv.teamSeries(name.trim()));
      if (found) return found;
    } catch {
      // Équipe inconnue de FRTV : on continue.
    }
  }

  const around = hints.around ?? new Date();
  for (let page = 1; page <= 4; page += 1) {
    const result = await frtv.seriesBetween(addDays(around, -4), addDays(around, 4), page);
    const found = pick(result.data ?? []);
    if (found) return found;
    if (!result.pagination?.hasNextPage) break;
  }
  return null;
}

export interface TeamInsight {
  side: Side;
  id: string;
  name: string;
  logo: string | null;
  elo: FrtvEloRow | null;
  form: Outcome[];
  veto: VetoTendencies;
  maps: MapRecord[];
  /** 3 dernières séries terminées. */
  recent: RecentSeries[];
}

export interface MatchInsight {
  series: FrtvSeries;
  teams: [TeamInsight, TeamInsight];
  /** Probabilité de victoire de l'équipe 1 (null si un Elo manque). */
  winProbability: number | null;
  h2h: HeadToHead;
}

/**
 * Historique terminé d'une équipe. Le filtre `team` de l'API cherche dans le NOM
 * (recherche partielle) : le slug du classement Elo peut être un ancien nom
 * (ex. « one-time » pour MONUMENT ESPORT), il ne sert donc qu'en repli.
 * Le filtrage final se fait toujours par identifiant d'équipe.
 */
async function teamHistory(teamId: string, queries: Array<string | null | undefined>, excludeSeriesId: string) {
  if (!teamId) return [];
  const tried = new Set<string>();
  for (const query of queries) {
    const q = query?.trim();
    if (!q || tried.has(q.toLowerCase())) continue;
    tried.add(q.toLowerCase());
    const list = await frtv.teamSeries(q).catch(() => [] as FrtvSeries[]);
    const history = finishedHistory(list, teamId, excludeSeriesId);
    if (history.length > 0) return history;
  }
  return [];
}

export async function buildMatchInsight(series: FrtvSeries): Promise<MatchInsight> {
  const ranking = await frtv.eloRanking().catch(() => null);
  const eloById = new Map((ranking?.ranking ?? []).map((row) => [row.teamId, row]));

  const sides: Side[] = ['team1', 'team2'];
  const raw = sides.map((side) => {
    const ref = series.match_series_teams?.[side]?.id;
    return { side, id: ref?._id ?? '', name: ref?.team_name ?? 'Équipe', logo: ref?.team_logo ?? null };
  });

  const histories = await Promise.all(
    raw.map((team) => teamHistory(team.id, [team.name, eloById.get(team.id)?.slug], series._id)),
  );

  const teams = raw.map((team, i): TeamInsight => {
    const history = histories[i] ?? [];
    return {
      ...team,
      elo: eloById.get(team.id) ?? null,
      form: recentForm(history, team.id),
      veto: vetoTendencies(history, team.id),
      maps: mapRecords(history, team.id),
      recent: recentSeries(history, team.id, 3),
    };
  }) as [TeamInsight, TeamInsight];

  const [a, b] = teams;
  return {
    series,
    teams,
    winProbability: a.elo && b.elo ? winProbability(a.elo.rating, b.elo.rating) : null,
    h2h: headToHead(histories[0] ?? [], a.id, b.id),
  };
}

export interface PlayerRatingIndex {
  byNickname: Map<string, FrtvPlayerRankRow>;
  /** Nombre de joueurs classés. */
  total: number;
  minMaps: number | null;
  periodMonths: number | null;
}

/** Index du classement joueurs FRTV (rating 2.0) par pseudo, insensible à la casse. */
export async function playerRatingIndex(): Promise<PlayerRatingIndex> {
  const ranking = await frtv.playerRanking().catch(() => null);
  return {
    byNickname: new Map((ranking?.rows ?? []).map((row) => [row.nickname.toLowerCase(), row])),
    total: ranking?.rows.length ?? 0,
    minMaps: ranking?.minMaps ?? null,
    periodMonths: ranking?.periodMonths ?? null,
  };
}

/** Matchs d'équipes francophones prévus aujourd'hui (heure locale), triés par heure. */
export async function todayFrenchSeries(now = new Date()): Promise<FrtvSeries[]> {
  // L'API filtre en UTC : on élargit la fenêtre puis on filtre en heure locale.
  // Une soirée de ligue compte plus de 100 séries FR : on lit toutes les pages (4 au plus).
  const all: FrtvSeries[] = [];
  for (let page = 1; page <= 4; page++) {
    const result = await frtv.seriesBetween(addDays(now, -1), addDays(now, 1), page, true);
    all.push(...(result.data ?? []));
    if (!result.pagination?.hasNextPage) break;
  }
  const today = isoDay(now);
  return all
    .filter((s) => {
      const t = scheduledTime(s);
      return t > 0 && isoDay(new Date(t)) === today;
    })
    .sort((a, b) => scheduledTime(a) - scheduledTime(b));
}

/** Prochaine série « à venir » d'une équipe (par nom), ou null. */
export async function nextTeamSeries(teamName: string, now = Date.now()): Promise<FrtvSeries | null> {
  const list = await frtv.teamSeries(teamName);
  const upcoming = list
    .filter((s) => s.match_series_status === 'Upcoming' && scheduledTime(s) >= now - 3 * 3600_000)
    .sort((a, b) => scheduledTime(a) - scheduledTime(b));
  return upcoming[0] ?? null;
}
