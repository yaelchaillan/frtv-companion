import { describe, expect, it } from 'vitest';
import type { VetoTendencies } from './analysis';
import {
  describeForm,
  eloTrendSentence,
  fatigueSentence,
  formSentence,
  h2hSentence,
  leagueHeadline,
  leagueMapsSentence,
  mapCompareRows,
  matchmakingHeadline,
  matchmakingMapsSentence,
  vetoPlan,
  type MapTally,
} from './narrative';

const NNBSP = ' ';
const names: [string, string] = ['OldBoys', 'regnum4games'];

// Jeu de référence (§9 du brief) : ESEA S59 Advanced, BO1.
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
const t = (map: string, won: number, played: number): MapTally => ({ map, won, played });
const mapsOldBoys = [t('de_dust2', 5, 7), t('de_nuke', 2, 3), t('de_mirage', 2, 3), t('de_anubis', 2, 4), t('de_inferno', 1, 2), t('de_cache', 0, 2), t('de_ancient', 1, 1)];
const mapsRegnum = [t('de_nuke', 6, 8), t('de_inferno', 3, 6), t('de_ancient', 3, 5), t('de_mirage', 2, 4), t('de_dust2', 1, 3), t('de_cache', 1, 2)];

describe('résumé', () => {
  it('ligue, une seule équipe classée', () => {
    const h = leagueHeadline(names, [{ rating: 1470, rank: 1, tier: 'Advanced' }, null], 0.62);
    expect(h.title).toBe(`OldBoys favoris à 62${NNBSP}%`);
    expect(h.subtitle).toBe(
      `Elo FRTV 1${NNBSP}470, #1 Advanced, face à une équipe pas encore classée. Match de ligue : aucun Elo FACEIT en jeu.`,
    );
  });

  it('ligue sans probabilité', () => {
    expect(leagueHeadline(names, [null, null], null).title).toBe('Match non classé FRTV');
  });

  it('matchmaking du point de vue du joueur', () => {
    const fav = matchmakingHeadline(['A', 'B'], [3213, 3142], 0, true);
    expect(fav.title).toMatch(/^Votre équipe favorite à 60 % · \+\d+ \/ −\d+ Elo$/);
    expect(fav.subtitle).toBe(`Elo FACEIT moyen 3${NNBSP}213 contre 3${NNBSP}142. Estimation FRTV à partir des deux moyennes.`);
    expect(matchmakingHeadline(['A', 'B'], [3000, 3100], 0, true).title).toMatch(/^Adversaires favoris à 64 %/);
    expect(matchmakingHeadline(['A', 'B'], [3000, 3100], null, false).title).toBe(`B favoris à 64${NNBSP}%`);
    // Cas réel du 17/11 : 2 812 contre 2 814 → pas de « favoris à 50 % ».
    expect(matchmakingHeadline(['A', 'B'], [2812, 2814], 0, true).title).toBe('Match équilibré · +25 / −25 Elo');
    expect(leagueHeadline(names, [null, null], 0.501).title).toBe('Match équilibré');
  });
});

describe('veto probable', () => {
  const plan = vetoPlan([vetoOldBoys, vetoRegnum], [mapsOldBoys, mapsRegnum], 1);

  it('retire les 3 bans habituels de chaque équipe en BO1', () => {
    expect(plan.probable).toEqual(['de_inferno', 'de_mirage']);
  });

  it('rédige la phrase', () => {
    expect(plan.sentence).toBe('Ancient saute au premier ban (10 fois sur 10). Après les bans habituels, il reste Inferno ou Mirage.');
  });

  it('trie les lignes : bans puis picks, maps probables en bas', () => {
    expect(plan.rows.map((r) => r.map)).toEqual(['de_ancient', 'de_anubis', 'de_cache', 'de_nuke', 'de_dust2', 'de_inferno', 'de_mirage']);
    const ancient = plan.rows.find((r) => r.map === 'de_ancient')!;
    expect(ancient.cells[0]).toEqual({ kind: 'ban', count: 10, total: 10 });
    expect(ancient.cells[1]).toEqual({ kind: 'pick', count: 1, total: 10 });
    expect(plan.rows.find((r) => r.map === 'de_mirage')?.cells[0].kind).toBeNull();
  });
});

describe('maps', () => {
  const plan = vetoPlan([vetoOldBoys, vetoRegnum], [mapsOldBoys, mapsRegnum], 1);
  const rows = mapCompareRows([mapsOldBoys, mapsRegnum], plan.probable);

  it('met les maps probables en tête', () => {
    expect(rows.slice(0, 2).map((r) => r.map)).toEqual(['de_inferno', 'de_mirage']);
    expect(rows).toHaveLength(7);
  });

  it('rédige la phrase de ligue', () => {
    expect(leagueMapsSentence(names, rows, plan.probable)).toBe(
      'Sur les deux maps probables, regnum4games a plus joué : 3/6 sur Inferno, 2/4 sur Mirage.',
    );
  });

  it('rédige la phrase de matchmaking', () => {
    const mm = mapCompareRows([[t('de_mirage', 7, 10), t('de_nuke', 2, 8)], [t('de_mirage', 3, 8), t('de_nuke', 6, 9)]], []);
    expect(matchmakingMapsSentence(['A', 'B'], mm, 0)).toBe(`Mirage est votre meilleure map (70${NNBSP}%) et leur pire (38${NNBSP}%). Évitez Nuke.`);
  });
});

describe('forme et face-à-face', () => {
  it('décrit les séries', () => {
    expect(describeForm(['D', 'D', 'D', 'V', 'D']).text).toBe('reste sur 4 défaites en 5 matchs');
    expect(describeForm(['V', 'D', 'V', 'D', 'D']).text).toBe('alterne');
    expect(describeForm(['V', 'V', 'V', 'D', 'D']).text).toBe('reste sur 3 victoires');
  });

  it('met la série la plus marquante en premier', () => {
    expect(formSentence(names, [['V', 'D', 'V', 'D', 'D'], ['D', 'D', 'D', 'V', 'D']])).toBe(
      'regnum4games reste sur 4 défaites en 5 matchs ; OldBoys alterne.',
    );
  });

  it('résume le face-à-face', () => {
    expect(h2hSentence(names, { winsA: 0, winsB: 0, last: null })).toBe('Première confrontation dans les données FRTV.');
    expect(
      h2hSentence(names, {
        winsA: 2,
        winsB: 1,
        last: { score: { mine: 13, theirs: 9, unit: 'rounds' }, map: 'de_nuke', date: '2026-10-12T18:00:00Z' },
      }),
    ).toBe('OldBoys mène 2–1 (dernier : 13–9 sur Nuke, 12 oct.).');
  });
});

describe('matchmaking : Elo et fatigue', () => {
  it('compare les Elo cumulés', () => {
    expect(eloTrendSentence(['A', 'B'], [311, 42], 0)).toBe('Vos joueurs cumulent +311 Elo sur 20 matchs, contre +42 en face.');
  });

  it('signale la fatigue', () => {
    expect(fatigueSentence(['A', 'B'], [[3, 3, 4, 1, 0], [2, 1, 0, 0, 2]], 0)).toBe(
      "3 joueurs de votre équipe en sont au moins à leur 4e match aujourd'hui. En face, personne au-delà de 2.",
    );
  });
});
