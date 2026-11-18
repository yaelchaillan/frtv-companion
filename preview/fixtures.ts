/**
 * Jeu de données de référence (§9 du brief design) : ESEA S59 Advanced Central, BO1,
 * mardi 17 novembre 20:00 — OldBoys contre regnum4games.
 */
import type { ProfileState, RankedPlayer, RoomState } from '../src/features/state';
import type { FaceitMatch, FaceitPlayer } from '../src/lib/faceit/api';
import type { FaceitMatchStat } from '../src/lib/faceit/stats';
import type { MapRecord, Outcome, RecentSeries, VetoTendencies } from '../src/lib/frtv/analysis';
import type { MatchInsight, PlayerRatingIndex, TeamInsight } from '../src/lib/frtv/service';
import type { FrtvEloRanking, FrtvEloRow, FrtvPlayerRankRow, FrtvSeries } from '../src/lib/frtv/types';
import { createStore } from '../src/lib/store';

const NOW = Date.now();
const HOUR = 3600_000;

// ---------------------------------------------------------------- FACEIT : forme des joueurs

/** Génère 20 matchs cohérents avec une forme (du plus récent au plus ancien), un Elo et des matchs du jour. */
export function makeStats(opts: { form: string; eloDelta?: number; today?: number; elo?: number; matches?: number }): FaceitMatchStat[] {
  const n = opts.matches ?? 20;
  const today = opts.today ?? 0;
  const delta = opts.eloDelta ?? 0;
  const top = opts.elo ?? 3200;
  const maps = ['de_mirage', 'de_inferno', 'de_nuke', 'de_dust2', 'de_ancient', 'de_anubis', 'de_train'];
  return Array.from({ length: n }, (_, i) => {
    const letter = opts.form[i] ?? (i % 3 === 0 ? 'D' : 'V');
    const win = letter === 'V';
    const date = i < today ? NOW - (i + 1) * HOUR : NOW - (30 + i * 9) * HOUR;
    return {
      matchId: `m${i}`,
      date,
      map: maps[i % maps.length] ?? null,
      win,
      kills: win ? 22 : 15,
      deaths: win ? 16 : 18,
      assists: 5,
      rounds: 22,
      headshots: win ? 13 : 8,
      damage: win ? 1980 : 1650,
      adr: win ? 90 : 75,
      elo: Math.round(top - (delta * i) / (n - 1)),
      score: win ? '13 / 9' : '9 / 13',
      competitionId: null,
    };
  });
}

const player = (nickname: string, elo: number, level = 10, regionalRank: number | null = null): FaceitPlayer => ({
  id: `id-${nickname}`,
  nickname,
  avatar: null,
  elo,
  skillLevel: level,
  country: 'fr',
  regionalRank,
  partyId: null,
});

export const MATCH: FaceitMatch = {
  id: '1-39192e11-4756-4d25-8032-174f5f4acabd',
  scheduledAt: new Date(NOW + 5 * HOUR),
  competitionName: 'S59 EU Advanced Central - Regular Season',
  state: 'SCHEDULED',
  calculateElo: false,
  entityType: 'championship',
  score: null,
  winner: null,
  map: null,
  finishedAt: null,
  teams: [
    {
      id: 'f1',
      name: 'OldBoys',
      avatar: null,
      roster: [player('Nivera-', 3856, 10, 361), player('Kyojin', 3500), player('ScreaM', 3210), player('Maka_', 3018), player('ryZz', 2805)],
      substitutes: [player('shox', 3235)],
    },
    {
      id: 'f2',
      name: 'regnum4games',
      avatar: null,
      roster: [player('HeMan_', 3341), player('Imperfect10n', 3137), player('fanatic997', 3263), player('Lezard_du_Nord_1', 3071), player('zeNNN', 2998)],
      substitutes: [player('gim44', 3454)],
    },
  ],
};

const ready = <T,>(data: T) => ({ status: 'ready' as const, data });

export const STATS: RoomState['stats'] = {
  'nivera-': ready(makeStats({ form: 'DDVVV', eloDelta: 134, today: 3, elo: 3856 })),
  kyojin: ready(makeStats({ form: 'VVDVV', eloDelta: 48, today: 3, elo: 3500 })),
  scream: ready(makeStats({ form: 'VVDVV', eloDelta: 282, today: 3, elo: 3210 })),
  maka_: ready(makeStats({ form: 'VDVVD', eloDelta: 61, today: 1, elo: 3018 })),
  ryzz: ready(makeStats({ form: 'VDVDD', eloDelta: -42, today: 2, elo: 2805 })),
  shox: ready(makeStats({ form: 'VDVDD', eloDelta: -131, today: 3, elo: 3235 })),
  heman_: ready(makeStats({ form: 'VVDVV', eloDelta: 119, today: 3, elo: 3341 })),
  'imperfect10n': ready(makeStats({ form: 'VDDVD', eloDelta: -26, today: 0, elo: 3137 })),
  'fanatic997': ready(makeStats({ form: 'DVDDV', eloDelta: -26, today: 0, elo: 3263 })),
  'lezard_du_nord_1': ready(makeStats({ form: 'DDVDV', eloDelta: 12, today: 1, elo: 3071 })),
  zennn: ready(makeStats({ form: 'DDVDD', eloDelta: -88, today: 4, elo: 2998 })),
  'gim44': ready(makeStats({ form: 'VDVVV', eloDelta: 150, today: 0, elo: 3454 })),
};

const ranked = (playerId: string, avgRating: number, rank: number, maps: number, kd: number, adr: number, kast: number): RankedPlayer => ({
  playerId,
  avgRating,
  rank,
  maps,
  kd,
  adr,
  kast,
});

export const RATINGS = new Map<string, RankedPlayer>([
  ['nivera-', ranked('p1', 1.41, 3, 28, 1.34, 88.2, 76)],
  ['kyojin', ranked('p2', 1.28, 15, 24, 1.21, 79.9, 74)],
  ['heman_', ranked('p3', 1.19, 31, 31, 1.12, 78.1, 72)],
  ['fanatic997', ranked('p4', 1.07, 58, 22, 1.01, 72.4, 69)],
]);

// ---------------------------------------------------------------- FRTV : analyse du match

const elo = (rank: number, teamId: string, name: string, rating: number, delta7d: number, tier: string): FrtvEloRow => ({
  rank,
  teamId,
  name,
  slug: name.toLowerCase(),
  logo: null,
  rating,
  delta7d,
  rankDelta: 0,
  matchesCounted: 30,
  isProvisional: false,
  currentTier: tier,
  lastMatchAt: null,
});

const tally = (map: string, won: number, played: number): MapRecord => ({ map, won, played });

const vetoOldBoys: VetoTendencies = {
  sample: 10,
  bans: [
    { map: 'de_ancient', count: 10 },
    { map: 'de_cache', count: 7 },
    { map: 'de_nuke', count: 7 },
  ],
  picks: [
    { map: 'de_cache', count: 1 },
    { map: 'de_dust2', count: 1 },
    { map: 'de_inferno', count: 1 },
  ],
};
const vetoRegnum: VetoTendencies = {
  sample: 10,
  bans: [
    { map: 'de_anubis', count: 8 },
    { map: 'de_cache', count: 6 },
    { map: 'de_dust2', count: 4 },
  ],
  picks: [
    { map: 'de_nuke', count: 4 },
    { map: 'de_inferno', count: 3 },
    { map: 'de_ancient', count: 1 },
  ],
};

const recent: RecentSeries[] = [
  { id: 'r1', outcome: 'V', score: { mine: 13, theirs: 9, unit: 'rounds' }, opponent: 'eSuba', map: 'de_dust2', date: null },
  { id: 'r2', outcome: 'D', score: { mine: 10, theirs: 13, unit: 'rounds' }, opponent: 'Brest Esport', map: 'de_mirage', date: null },
  { id: 'r3', outcome: 'V', score: { mine: 13, theirs: 6, unit: 'rounds' }, opponent: 'French in Pyjamas', map: 'de_inferno', date: null },
];

const series: FrtvSeries = {
  _id: 's-oldboys-regnum',
  match_series_faceit_id: MATCH.id,
  match_series_status: 'Upcoming',
  match_series_format: 1,
  match_series_competition_id: { event_name: 'S59 EU Advanced Central - Regular Season', event_season: 'S59', event_division: 'Advanced' },
  match_series_dates: { scheduled: new Date(new Date().setHours(20, 0, 0, 0)).toISOString() },
  match_series_teams: {
    team1: { score: 0, id: { _id: 't-oldboys', team_name: 'OldBoys' } },
    team2: { score: 0, id: { _id: 't-regnum', team_name: 'regnum4games' } },
  },
};

const team = (t: Partial<TeamInsight> & Pick<TeamInsight, 'id' | 'name' | 'side'>): TeamInsight => ({
  logo: null,
  elo: null,
  form: [],
  veto: { sample: 0, bans: [], picks: [] },
  maps: [],
  recent: [],
  ...t,
});

export const OLDBOYS_ELO = elo(1, 't-oldboys', 'OldBoys', 1470, 60, 'ADVANCED');

export const INSIGHT: MatchInsight = {
  series,
  winProbability: 0.62,
  h2h: { winsA: 0, winsB: 0, series: [] },
  teams: [
    team({
      side: 'team1',
      id: 't-oldboys',
      name: 'OldBoys',
      elo: OLDBOYS_ELO,
      form: ['V', 'D', 'V', 'D', 'D'] as Outcome[],
      veto: vetoOldBoys,
      maps: [tally('de_nuke', 2, 3), tally('de_dust2', 5, 7), tally('de_inferno', 1, 2), tally('de_mirage', 2, 3), tally('de_ancient', 1, 1), tally('de_anubis', 2, 4), tally('de_cache', 0, 2)],
      recent,
    }),
    team({
      side: 'team2',
      id: 't-regnum',
      name: 'regnum4games',
      form: ['D', 'D', 'D', 'V', 'D'] as Outcome[],
      veto: vetoRegnum,
      maps: [tally('de_nuke', 6, 8), tally('de_dust2', 1, 3), tally('de_inferno', 3, 6), tally('de_mirage', 2, 4), tally('de_ancient', 3, 5), tally('de_cache', 1, 2)],
    }),
  ],
};

export function roomStore(overrides: Partial<RoomState> = {}) {
  return createStore<RoomState>({
    faceit: ready(MATCH),
    insight: ready(INSIGHT),
    stats: STATS,
    ratings: RATINGS,
    meId: null,
    frtvPlayers: { 'nivera-': 'p1', kyojin: 'p2', heman_: 'p3', fanatic997: 'p4' },
    countries: { 'nivera-': 'MA', kyojin: 'FR', scream: 'BE', maka_: 'FR', ryzz: 'FR', shox: 'FR', heman_: 'DE', imperfect10n: 'PL', fanatic997: 'RS', lezard_du_nord_1: 'FR', zennn: 'FR', gim44: 'TR' },
    ...overrides,
  });
}

/** Variante matchmaking : même joueurs, match classé, le joueur connecté est dans l'équipe 1. */
export const MM_MATCH: FaceitMatch = {
  ...MATCH,
  competitionName: 'Matchmaking',
  calculateElo: true,
  teams: [
    { ...MATCH.teams[0]!, name: 'team_Kyojin', substitutes: [] },
    { ...MATCH.teams[1]!, name: 'team_HeMan_', substitutes: [] },
  ],
};

// ---------------------------------------------------------------- Profil

const rankRow = (nickname: string, r: RankedPlayer, teamName?: string): FrtvPlayerRankRow => ({
  rank: r.rank,
  playerId: r.playerId,
  nickname,
  avgRating: r.avgRating,
  maps: r.maps,
  kd: r.kd,
  adr: r.adr,
  kast: r.kast,
  team: teamName ? { _id: 't-oldboys', team_name: teamName, team_logo: null } : null,
});

export const RATING_INDEX: PlayerRatingIndex = {
  byNickname: new Map([['kyojin', rankRow('Kyojin', RATINGS.get('kyojin')!, 'OldBoys')]]),
  total: 312,
  minMaps: 20,
  periodMonths: 3,
};

export const ELO_RANKING: FrtvEloRanking = {
  ranked: 156,
  ranking: [OLDBOYS_ELO, elo(2, 't-brest', 'Brest Esport', 1326, 60, 'MAIN'), elo(41, 't-x', 'Les Frerots', 1112, -3, 'INTERMEDIATE')],
};

export function profileStore(variant: 'ranked' | 'unranked' | 'team'): ReturnType<typeof createStore<ProfileState>> {
  return createStore<ProfileState>({
    frtv: ready({ ratings: RATING_INDEX, elo: ELO_RANKING, season: 'S59' }),
    team: variant === 'unranked' ? { name: 'Team Inconnue', members: 6, faceitTeamId: null } : { name: 'OldBoys', members: 12, faceitTeamId: null },
    teamData:
      variant === 'team'
        ? ready({
            elo: OLDBOYS_ELO,
            form: ['V', 'D', 'V', 'D', 'D'],
            next: series,
            nextOpponentElo: elo(46, 't-regnum', 'regnum4games', 1385, 0, 'ADVANCED'),
          })
        : null,
  });
}
