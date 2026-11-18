import { describe, expect, it } from 'vitest';
import {
  finishedHistory,
  formatLabel,
  headToHead,
  mapLabel,
  mapRecords,
  recentForm,
  seriesOutcome,
  seriesScore,
  vetoTendencies,
  winProbability,
} from './analysis';
import type { FrtvSeries } from './types';

const A = 'team-a';
const B = 'team-b';
const C = 'team-c';

let seq = 0;
function series(opts: {
  t1: string;
  t2: string;
  s1?: number | null;
  s2?: number | null;
  maps?: Array<[string, number, number]>;
  veto?: Array<[string, string, 'ban' | 'pick']>;
  status?: string;
  date?: string;
}): FrtvSeries {
  seq += 1;
  return {
    _id: `s${seq}`,
    match_series_status: opts.status ?? 'Finished',
    match_series_dates: { scheduled: opts.date ?? `2026-11-${String(seq).padStart(2, '0')}T18:00:00.000Z` },
    match_series_teams: {
      team1: { score: opts.s1 ?? null, id: { _id: opts.t1, team_name: opts.t1 } },
      team2: { score: opts.s2 ?? null, id: { _id: opts.t2, team_name: opts.t2 } },
    },
    match_series_matches: (opts.maps ?? []).map(([map, a, b], i) => ({
      match_number: i + 1,
      match_map: map,
      match_scores: { team1: a, team2: b },
      match_status: 'Finished',
    })),
    match_series_veto: (opts.veto ?? []).map(([team_id, map, action], i) => ({ team_id, map, action, order: i + 1 })),
  };
}

describe('winProbability', () => {
  it('vaut 50 % à Elo égal et reste symétrique', () => {
    expect(winProbability(1400, 1400)).toBeCloseTo(0.5);
    expect(winProbability(1500, 1300) + winProbability(1300, 1500)).toBeCloseTo(1);
    expect(winProbability(1800, 1400)).toBeCloseTo(0.909, 2);
  });
});

describe('seriesOutcome', () => {
  it('utilise le score de série', () => {
    const s = series({ t1: A, t2: B, s1: 2, s2: 1 });
    expect(seriesOutcome(s, A)).toBe('V');
    expect(seriesOutcome(s, B)).toBe('D');
    expect(seriesOutcome(s, C)).toBeNull();
  });

  it('se rabat sur les maps si le score de série manque', () => {
    const s = series({ t1: A, t2: B, s1: 0, s2: 0, maps: [['de_dust2', 9, 13]] });
    expect(seriesOutcome(s, A)).toBe('D');
    expect(seriesOutcome(s, B)).toBe('V');
  });

  it('ignore les séries non terminées', () => {
    expect(seriesOutcome(series({ t1: A, t2: B, s1: 1, s2: 0, status: 'Upcoming' }), A)).toBeNull();
  });
});

describe('historique, forme et face-à-face', () => {
  const list = [
    series({ t1: A, t2: B, s1: 1, s2: 0, date: '2026-11-01T18:00:00Z' }),
    series({ t1: C, t2: A, s1: 1, s2: 0, date: '2026-11-03T18:00:00Z' }),
    series({ t1: B, t2: A, s1: 1, s2: 0, date: '2026-11-05T18:00:00Z' }),
    series({ t1: A, t2: C, s1: 1, s2: 0, date: '2026-11-07T18:00:00Z' }),
    series({ t1: A, t2: B, status: 'Upcoming', date: '2026-11-20T18:00:00Z' }),
  ];

  it('trie du plus récent au plus ancien et retire les matchs à venir', () => {
    const history = finishedHistory(list, A);
    expect(history).toHaveLength(4);
    expect(history[0]?.match_series_dates?.scheduled).toBe('2026-11-07T18:00:00Z');
  });

  it('calcule la forme récente', () => {
    expect(recentForm(finishedHistory(list, A), A, 3)).toEqual(['V', 'D', 'D']);
  });

  it('calcule le face-à-face', () => {
    const h2h = headToHead(finishedHistory(list, A), A, B);
    expect(h2h).toMatchObject({ winsA: 1, winsB: 1 });
    expect(h2h.series).toHaveLength(2);
  });

  it("exclut la série en cours de l'historique", () => {
    expect(finishedHistory(list, A, list[3]!._id)).toHaveLength(3);
  });
});

describe('vetoTendencies', () => {
  it("compte bans et picks de l'équipe uniquement", () => {
    const list = [
      series({ t1: A, t2: B, veto: [[A, 'de_ancient', 'ban'], [B, 'de_mirage', 'ban'], [A, 'de_dust2', 'pick']] }),
      series({ t1: A, t2: C, veto: [[A, 'de_ancient', 'ban'], [A, 'de_nuke', 'ban'], [C, 'de_dust2', 'pick']] }),
      series({ t1: A, t2: C }),
    ];
    const v = vetoTendencies(list, A);
    expect(v.sample).toBe(2);
    expect(v.bans).toEqual([
      { map: 'de_ancient', count: 2 },
      { map: 'de_nuke', count: 1 },
    ]);
    expect(v.picks).toEqual([{ map: 'de_dust2', count: 1 }]);
  });
});

describe('mapRecords', () => {
  it('fait le bilan par map en tenant compte du camp', () => {
    const list = [
      series({ t1: A, t2: B, maps: [['de_dust2', 13, 9], ['de_inferno', 7, 13], ['de_nuke', 0, 0]] }),
      series({ t1: C, t2: A, maps: [['de_dust2', 13, 11]] }),
    ];
    expect(mapRecords(list, A)).toEqual([
      { map: 'de_dust2', played: 2, won: 1 },
      { map: 'de_inferno', played: 1, won: 0 },
    ]);
  });
});

describe('seriesScore', () => {
  it('donne les rounds pour une série en une map', () => {
    const s = series({ t1: A, t2: B, s1: 1, s2: 0, maps: [['de_dust2', 13, 9]] });
    expect(seriesScore(s, B)).toEqual({ mine: 9, theirs: 13, unit: 'rounds' });
  });

  it('donne les maps pour un BO3', () => {
    const s = series({ t1: A, t2: B, s1: 2, s2: 1, maps: [['de_dust2', 13, 9], ['de_nuke', 5, 13], ['de_inferno', 13, 11]] });
    expect(seriesScore(s, A)).toEqual({ mine: 2, theirs: 1, unit: 'maps' });
  });

  it('renvoie null sans score', () => {
    expect(seriesScore(series({ t1: A, t2: B }), A)).toBeNull();
    expect(seriesScore(series({ t1: A, t2: B, s1: 1, s2: 0 }), C)).toBeNull();
  });
});

describe('libellés', () => {
  it('formate maps et formats', () => {
    expect(mapLabel('de_dust2')).toBe('Dust2');
    expect(mapLabel('de_ancient')).toBe('Ancient');
    expect(formatLabel(3)).toBe('BO3');
    expect(formatLabel(null)).toBeNull();
  });
});
