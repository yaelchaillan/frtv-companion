/** Reconnaissance des pages faceit.com sur lesquelles l'extension intervient. */
export type FaceitRoute =
  | { kind: 'room'; matchId: string }
  | { kind: 'player'; nickname: string }
  | { kind: 'other' };

// Segment de langue optionnel : /fr/, /en/, /pt-br/…
const LANG = '(?:[a-z]{2}(?:-[a-z]{2})?/)?';
const MATCH_ID = '(1-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';
const ROOM_RE = new RegExp(`^/${LANG}(?:cs2|csgo)/room/${MATCH_ID}(?:/|$)`, 'i');
const PLAYER_RE = new RegExp(`^/${LANG}players/([^/]+)(?:/|$)`, 'i');

export function parseFaceitRoute(href: string): FaceitRoute {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { kind: 'other' };
  }
  if (!/(^|\.)faceit\.com$/i.test(url.hostname)) return { kind: 'other' };

  const matchId = ROOM_RE.exec(url.pathname)?.[1];
  if (matchId) return { kind: 'room', matchId: matchId.toLowerCase() };

  const nickname = PLAYER_RE.exec(url.pathname)?.[1];
  if (nickname) {
    try {
      return { kind: 'player', nickname: decodeURIComponent(nickname) };
    } catch {
      return { kind: 'player', nickname };
    }
  }
  return { kind: 'other' };
}

/** Clé stable d'une route : sert à ne pas remonter l'interface pour la même page. */
export function routeKey(route: FaceitRoute): string {
  if (route.kind === 'room') return `room:${route.matchId}`;
  if (route.kind === 'player') return `player:${route.nickname.toLowerCase()}`;
  return 'other';
}

/** Lien vers la salle FACEIT d'un match (utilisé par la popup). */
export function faceitRoomUrl(matchId: string, lang = 'fr'): string {
  return `https://www.faceit.com/${lang}/cs2/room/${encodeURIComponent(matchId)}`;
}
