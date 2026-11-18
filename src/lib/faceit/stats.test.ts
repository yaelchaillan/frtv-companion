import { describe, expect, it } from 'vitest';
import { eloStakes, mapLimit, parseMatchStats, summarizeForm, teamMapRates } from './stats';

// Extraits réels (anonymisés) de /api/stats/v1/stats/time/users/{id}/games/cs2
const RAW = [
  { matchId: 'm2', date: 1794859625000, i1: 'de_anubis', i6: '20', i7: '3', i8: '14', i10: '0', i12: '23', i13: '13', i18: '10 / 13', i20: '2145', c10: '93.3', elo: '3810' },
  { matchId: 'm1', date: 1794862621000, i1: 'de_dust2', i6: '7', i7: '4', i8: '14', i10: '1', i12: '22', i13: '4', i18: '9 / 13', i20: '1085', c10: '49.3', elo: '3829' },
  { matchId: 'm0', date: 1794700000000, i1: 'de_dust2', i6: '25', i7: '2', i8: '10', i10: '1', i12: '24', i13: '12', i20: '2400' },
  { broken: true },
];

describe('parseMatchStats', () => {
  it('décode les champs et trie du plus récent au plus ancien', () => {
    const stats = parseMatchStats(RAW);
    expect(stats.map((m) => m.matchId)).toEqual(['m1', 'm2', 'm0']);
    expect(stats[0]).toMatchObject({ map: 'de_dust2', win: true, kills: 7, deaths: 14, assists: 4, rounds: 22, headshots: 4, damage: 1085, adr: 49.3, elo: 3829, score: '9 / 13' });
    expect(stats[2]?.elo).toBeNull();
  });

  it('ignore une réponse inattendue', () => {
    expect(parseMatchStats({ error: 1 })).toEqual([]);
  });
});

describe('summarizeForm', () => {
  const stats = parseMatchStats(RAW);

  it('agrège K/D, ADR, HS%, victoires et Elo', () => {
    const f = summarizeForm(stats, 1794862621000 + 3600_000)!;
    expect(f.matches).toBe(3);
    expect(f.wins).toBe(2);
    expect(f.winRate).toBeCloseTo(2 / 3);
    expect(f.kd).toBeCloseTo(52 / 38);
    expect(f.adr).toBeCloseTo((1085 + 2145 + 2400) / (22 + 23 + 24));
    expect(f.hsPct).toBeCloseTo(29 / 52);
    expect(f.last5).toEqual(['V', 'D', 'V']);
    expect(f.eloDelta).toBe(3829 - 3810);
    expect(f.last24h).toBe(2);
  });

  it('renvoie null sans match', () => {
    expect(summarizeForm([])).toBeNull();
  });
});

describe('teamMapRates', () => {
  it('cumule les maps des joueurs', () => {
    const stats = parseMatchStats(RAW);
    expect(teamMapRates([stats, stats.slice(0, 1)])).toEqual([
      { map: 'de_dust2', played: 3, won: 3 },
      { map: 'de_anubis', played: 1, won: 0 },
    ]);
  });
});

describe('eloStakes', () => {
  it('donne ±25 à Elo égal', () => {
    expect(eloStakes(2000, 2000)).toMatchObject({ win: 25, loss: 25 });
  });

  it('donne moins à gagner au favori', () => {
    const s = eloStakes(3500, 3200);
    expect(s.probability).toBeGreaterThan(0.5);
    expect(s.win).toBeLessThan(25);
    expect(s.loss).toBeGreaterThan(25);
  });
});

describe('mapLimit', () => {
  it('garde l’ordre et limite le parallélisme', async () => {
    let running = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running -= 1;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
