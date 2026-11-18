import { describe, expect, it } from 'vitest';
import type { FaceitPlayer } from './api';
import { groupByParty, partySummary } from './party';

const p = (nickname: string, partyId: string | null): FaceitPlayer => ({
  id: nickname,
  nickname,
  avatar: null,
  elo: 2000,
  skillLevel: 10,
  country: null,
  regionalRank: null,
  partyId,
});

describe('groupByParty', () => {
  it('rend les membres d’un groupe adjacents, dans l’ordre de FACEIT', () => {
    const segs = groupByParty([p('a', 'x'), p('b', 'y'), p('c', 'x'), p('d', null), p('e', 'y')]);
    expect(segs.map((s) => s.players.map((pl) => pl.nickname))).toEqual([['a', 'c'], ['b', 'e'], ['d']]);
  });
});

describe('partySummary', () => {
  it('décrit la composition d’une équipe', () => {
    expect(partySummary([5])).toBe('Groupe de 5');
    expect(partySummary([3, 2])).toBe('Trio + duo');
    expect(partySummary([2, 1, 1, 1])).toBe('Duo + 3 solos');
    expect(partySummary([2, 2, 1])).toBe('2 duos + 1 solo');
    expect(partySummary([4, 1])).toBe('Groupe de 4 + 1 solo');
    expect(partySummary([1, 1, 1, 1, 1])).toBe('5 solos');
    expect(partySummary([])).toBeNull();
  });
});
