import { describe, expect, it } from 'vitest';
import { faceitRoomUrl, parseFaceitRoute, routeKey } from './route';

const ID = '1-ce58c1e5-76bf-4c92-852d-1530c06d802d';

describe('parseFaceitRoute', () => {
  it('reconnaît une salle de match, avec ou sans langue et sous-onglet', () => {
    expect(parseFaceitRoute(`https://www.faceit.com/fr/cs2/room/${ID}`)).toEqual({ kind: 'room', matchId: ID });
    expect(parseFaceitRoute(`https://www.faceit.com/cs2/room/${ID}/scoreboard`)).toEqual({ kind: 'room', matchId: ID });
    expect(parseFaceitRoute(`https://www.faceit.com/pt-br/cs2/room/${ID.toUpperCase()}`)).toEqual({ kind: 'room', matchId: ID });
  });

  it('reconnaît un profil joueur et décode le pseudo', () => {
    expect(parseFaceitRoute('https://www.faceit.com/fr/players/DEVIL')).toEqual({ kind: 'player', nickname: 'DEVIL' });
    expect(parseFaceitRoute('https://www.faceit.com/en/players/JamY-/stats/cs2')).toEqual({ kind: 'player', nickname: 'JamY-' });
    expect(parseFaceitRoute('https://www.faceit.com/fr/players/a%20b')).toEqual({ kind: 'player', nickname: 'a b' });
  });

  it('ignore les autres pages et les autres domaines', () => {
    expect(parseFaceitRoute('https://www.faceit.com/fr/home')).toEqual({ kind: 'other' });
    expect(parseFaceitRoute(`https://evil.example/fr/cs2/room/${ID}`)).toEqual({ kind: 'other' });
    expect(parseFaceitRoute('pas une url')).toEqual({ kind: 'other' });
    expect(parseFaceitRoute('https://www.faceit.com/fr/cs2/room/123')).toEqual({ kind: 'other' });
  });
});

describe('routeKey / faceitRoomUrl', () => {
  it('produit des clés stables', () => {
    expect(routeKey({ kind: 'player', nickname: 'DeViL' })).toBe('player:devil');
    expect(routeKey({ kind: 'room', matchId: ID })).toBe(`room:${ID}`);
  });

  it('construit le lien de salle', () => {
    expect(faceitRoomUrl(ID)).toBe(`https://www.faceit.com/fr/cs2/room/${ID}`);
  });
});
