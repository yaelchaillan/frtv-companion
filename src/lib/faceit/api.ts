/**
 * Lecture des données FACEIT depuis faceit.com (même origine, session de l'utilisateur),
 * comme le font les extensions du même genre. Aucune clé API n'est embarquée.
 *
 * Routes internes non documentées, VÉRIFIÉES le 2026-11-17 sur faceit.com
 * (match v2 et users v1 ici, stats v1 dans stats.ts). Elles peuvent changer sans
 * préavis : la lecture reste défensive (plusieurs noms de champs possibles) et les
 * réponses brutes sont journalisées en mode debug pour ajuster rapidement.
 */
import { debugLog } from '../debug';

export interface FaceitPlayer {
  id: string | null;
  nickname: string;
  avatar: string | null;
  elo: number | null;
  skillLevel: number | null;
  country: string | null;
  /** Rang régional « Challenger » (top 1000), si FACEIT le fournit. */
  regionalRank: number | null;
  /** Groupe avec lequel le joueur a lancé la partie (matchmaking). */
  partyId: string | null;
}

export interface FaceitTeam {
  id: string | null;
  name: string;
  avatar: string | null;
  roster: FaceitPlayer[];
  /** Remplaçants (matchs de ligue). */
  substitutes: FaceitPlayer[];
}

export interface FaceitMatch {
  id: string;
  teams: FaceitTeam[];
  scheduledAt: Date | null;
  competitionName: string | null;
  state: string | null;
  /** `true` si le match fait gagner / perdre de l'Elo FACEIT (matchmaking). */
  calculateElo: boolean | null;
  /** `championship` (ligue), `matchmaking`… */
  entityType: string | null;
  /** Score final [équipe 1, équipe 2] si le match est terminé. */
  score: [number, number] | null;
  /** Index (0 ou 1) de l'équipe gagnante. */
  winner: 0 | 1 | null;
  /** Map choisie (ex. `de_dust2`). */
  map: string | null;
  finishedAt: Date | null;
}

// Routes vérifiées sur faceit.com le 2026-11-17.
export const FACEIT_ENDPOINTS = {
  match: (id: string) => `/api/match/v2/match/${encodeURIComponent(id)}`,
  player: (nickname: string) => `/api/users/v1/nicknames/${encodeURIComponent(nickname)}`,
};

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

function firstNum(...values: unknown[]): number | null {
  for (const v of values) {
    const n = num(v);
    if (n !== null) return n;
  }
  return null;
}

function firstStr(...values: unknown[]): string | null {
  for (const v of values) {
    const s = str(v);
    if (s !== null) return s;
  }
  return null;
}

function toDate(v: unknown): Date | null {
  const n = num(v);
  if (n !== null) return new Date(n < 1e12 ? n * 1000 : n); // secondes ou millisecondes
  const s = str(v);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t) : null;
}

/** Réponses FACEIT : `{ payload: … }` le plus souvent, parfois l'objet directement. */
export function unwrap(json: unknown): unknown {
  return isObject(json) && 'payload' in json ? json.payload : json;
}

export function parsePlayer(raw: unknown, game = 'cs2'): FaceitPlayer | null {
  if (!isObject(raw)) return null;
  const nickname = firstStr(raw.nickname, raw.name);
  if (!nickname) return null;

  const games = isObject(raw.games) ? raw.games : {};
  const g = isObject(games[game]) ? (games[game] as Json) : {};

  return {
    id: firstStr(raw.id, raw.playerId, raw.player_id, raw.guid, raw.user_id),
    nickname,
    avatar: firstStr(raw.avatar),
    elo: firstNum(raw.elo, raw.faceitElo, raw.faceit_elo, g.faceit_elo, g.faceitElo, g.elo),
    skillLevel: firstNum(raw.gameSkillLevel, raw.skillLevel, raw.skill_level, g.skill_level, g.skillLevel),
    country: firstStr(raw.country),
    regionalRank: firstNum(
      raw.regionalRank,
      isObject(raw.regionalRank) ? raw.regionalRank.position : null,
      isObject(raw.regionalRank) ? raw.regionalRank.rank : null,
    ),
    partyId: firstStr(raw.partyId, raw.party_id),
  };
}

function parseTeam(raw: unknown): FaceitTeam | null {
  if (!isObject(raw)) return null;
  const list = Array.isArray(raw.roster) ? raw.roster : Array.isArray(raw.players) ? raw.players : [];
  const subs = Array.isArray(raw.substitutes) ? raw.substitutes : [];
  const players = (items: unknown[]) => items.map((p) => parsePlayer(p)).filter((p): p is FaceitPlayer => p !== null);
  return {
    id: firstStr(raw.id, raw.faction_id, raw.teamId),
    name: firstStr(raw.name, raw.nickname) ?? 'Équipe',
    avatar: firstStr(raw.avatar),
    roster: players(list),
    substitutes: players(subs),
  };
}

/** Tous les joueurs d'un match (titulaires puis remplaçants), sans doublon. */
export function allPlayers(match: FaceitMatch): FaceitPlayer[] {
  const seen = new Set<string>();
  return match.teams
    .flatMap((t) => [...t.roster, ...t.substitutes])
    .filter((p) => {
      const key = p.nickname.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function parseMatch(payload: unknown, matchId: string): FaceitMatch {
  const p = isObject(payload) ? payload : {};
  const teamsRaw = isObject(p.teams) ? p.teams : {};
  const teams = ['faction1', 'faction2']
    .map((key) => parseTeam(teamsRaw[key]))
    .filter((t): t is FaceitTeam => t !== null);

  const entity = isObject(p.entity) ? p.entity : {};
  return {
    id: matchId,
    teams,
    scheduledAt: toDate(p.scheduledAt ?? p.startTime ?? p.startedAt ?? p.configuredAt ?? p.createdAt),
    competitionName: firstStr(entity.name, p.competitionName, p.competition_name),
    state: firstStr(p.state, p.status),
    calculateElo: typeof p.calculateElo === 'boolean' ? p.calculateElo : null,
    entityType: firstStr(entity.type),
    ...parseResult(p),
    finishedAt: toDate(p.finishedAt),
  };
}

/** Score, gagnant et map d'un match (`results[0]`, `voting.map.pick`). */
function parseResult(p: Json): { score: [number, number] | null; winner: 0 | 1 | null; map: string | null } {
  const result = Array.isArray(p.results) && isObject(p.results[0]) ? p.results[0] : null;
  const factions = result && isObject(result.factions) ? result.factions : null;
  const scoreOf = (key: string) => (factions && isObject(factions[key]) ? num((factions[key] as Json).score) : null);
  const s1 = scoreOf('faction1');
  const s2 = scoreOf('faction2');
  const voting = isObject(p.voting) && isObject(p.voting.map) ? p.voting.map : null;
  const pick = voting && Array.isArray(voting.pick) ? voting.pick[0] : null;
  return {
    score: s1 !== null && s2 !== null ? [s1, s2] : null,
    winner: result?.winner === 'faction1' ? 0 : result?.winner === 'faction2' ? 1 : null,
    map: firstStr(pick),
  };
}

let currentUser: Promise<string | null> | null = null;

/** Identifiant FACEIT du joueur connecté (null si déconnecté). Mis en cache pour la page. */
export function fetchCurrentUserId(): Promise<string | null> {
  currentUser ??= getJson('/api/users/v1/sessions/me')
    .then((json) => {
      const p = unwrap(json);
      return isObject(p) ? firstStr(p.id) : null;
    })
    .catch(() => null);
  return currentUser;
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`FACEIT a répondu ${response.status} (${path})`);
  return response.json();
}

export async function fetchFaceitMatch(matchId: string): Promise<FaceitMatch> {
  const json = await getJson(FACEIT_ENDPOINTS.match(matchId));
  debugLog('FACEIT match brut', json);
  const match = parseMatch(unwrap(json), matchId);
  debugLog('FACEIT match lu', match);
  return match;
}

const playerCache = new Map<string, { t: number; value: Promise<FaceitPlayer | null> }>();
const PLAYER_TTL_MS = 5 * 60_000;

export function fetchFaceitPlayer(nickname: string): Promise<FaceitPlayer | null> {
  const key = nickname.toLowerCase();
  const hit = playerCache.get(key);
  if (hit && Date.now() - hit.t < PLAYER_TTL_MS) return hit.value;

  const value = getJson(FACEIT_ENDPOINTS.player(nickname))
    .then((json) => {
      debugLog(`FACEIT joueur brut (${nickname})`, json);
      return parsePlayer(unwrap(json));
    })
    .catch((error: unknown) => {
      debugLog(`FACEIT joueur indisponible (${nickname})`, error);
      playerCache.delete(key);
      return null;
    });
  playerCache.set(key, { t: Date.now(), value });
  return value;
}

/** Complète l'Elo des joueurs qui n'en ont pas (requêtes limitées à 4 en parallèle). */
export async function fillMissingElo(players: FaceitPlayer[]): Promise<FaceitPlayer[]> {
  const result = [...players];
  const missing = result.map((p, i) => ({ p, i })).filter(({ p }) => p.elo === null);
  for (let start = 0; start < missing.length; start += 4) {
    const batch = missing.slice(start, start + 4);
    const fetched = await Promise.all(batch.map(({ p }) => fetchFaceitPlayer(p.nickname)));
    batch.forEach(({ p, i }, k) => {
      const full = fetched[k];
      if (full) result[i] = { ...p, elo: full.elo ?? p.elo, skillLevel: full.skillLevel ?? p.skillLevel };
    });
  }
  return result;
}
