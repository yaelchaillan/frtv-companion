import { describe, expect, it } from 'vitest';
import { parseMatch, parsePlayer, unwrap } from './api';

describe('parsePlayer', () => {
  it('lit le format « profil » (games.cs2)', () => {
    const raw = { id: 'u1', nickname: 'DEVIL', avatar: 'a.png', country: 'fr', games: { cs2: { faceit_elo: 2612, skill_level: 10 } } };
    expect(parsePlayer(raw)).toEqual({ id: 'u1', nickname: 'DEVIL', avatar: 'a.png', elo: 2612, skillLevel: 10, country: 'fr', regionalRank: null, partyId: null });
  });

  it('lit le format « roster de salle »', () => {
    const raw = { id: 'u2', nickname: 'JamY-', gameSkillLevel: 9, elo: '1903' };
    expect(parsePlayer(raw)).toMatchObject({ nickname: 'JamY-', elo: 1903, skillLevel: 9 });
  });

  it('tolère les champs manquants', () => {
    expect(parsePlayer({ nickname: 'x' })).toMatchObject({ nickname: 'x', elo: null, skillLevel: null, id: null });
    expect(parsePlayer({ elo: 2000 })).toBeNull();
    expect(parsePlayer(null)).toBeNull();
  });
});

describe('parseMatch', () => {
  it('lit les deux factions, la date et la compétition', () => {
    const payload = unwrap({
      payload: {
        state: 'SCHEDULED',
        scheduledAt: 1795453200,
        entity: { name: 'ESEA S59' },
        teams: {
          faction1: { id: 't1', name: 'Vitality Academy', roster: [{ nickname: 'a', elo: 2300 }] },
          faction2: { faction_id: 't2', name: 'eSuba', players: [{ nickname: 'b', gameSkillLevel: 8 }] },
        },
      },
    });
    const match = parseMatch(payload, '1-abc');
    expect(match.teams.map((t) => t.name)).toEqual(['Vitality Academy', 'eSuba']);
    expect(match.teams[1]?.id).toBe('t2');
    expect(match.teams[0]?.roster[0]?.elo).toBe(2300);
    expect(match.teams[1]?.roster[0]?.skillLevel).toBe(8);
    expect(match.scheduledAt?.getTime()).toBe(1795453200 * 1000);
    expect(match).toMatchObject({ competitionName: 'ESEA S59', state: 'SCHEDULED' });
  });

  it('renvoie une structure vide sur une réponse inattendue', () => {
    expect(parseMatch('oops', '1-x')).toEqual({
      id: '1-x',
      teams: [],
      scheduledAt: null,
      competitionName: null,
      state: null,
      calculateElo: null,
      entityType: null,
      score: null,
      winner: null,
      map: null,
      finishedAt: null,
    });
  });

  it('lit le score, le gagnant et la map', () => {
    const m = parseMatch(
      {
        entity: { type: 'championship' },
        results: [{ winner: 'faction2', factions: { faction1: { score: 7 }, faction2: { score: 13 } } }],
        voting: { map: { pick: ['de_inferno'] } },
      },
      '1-y',
    );
    expect(m).toMatchObject({ entityType: 'championship', score: [7, 13], winner: 1, map: 'de_inferno' });
  });
});
