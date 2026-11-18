/**
 * Données des visuels du Chrome Web Store : le jeu de référence avec des joueurs et des
 * équipes FICTIFS (on ne publie pas de statistiques inventées sous le nom de vrais joueurs).
 */
import type { RoomState } from '../src/features/state';
import type { FaceitMatch, FaceitTeam } from '../src/lib/faceit/api';
import { createStore } from '../src/lib/store';
import { roomStore } from './fixtures';

const NAMES: Array<[string, string]> = [
  ['Lezard_du_Nord_1', 'Cassoulet_42'],
  ['French in Pyjamas', 'Zénith Gaming'],
  ['Brest Esport', 'Les Corsaires'],
  ['regnum4games', 'Méridien Esport'],
  ['Les Frerots', 'Les Ardents'],
  ['Imperfect10n', 'Pyxel'],
  ['fanatic997', 'Brumaire'],
  ['OldBoys', 'Team Aurore'],
  ['Nivera-', 'Kaelix'],
  ['Kyojin', 'Moustik'],
  ['ScreaM', 'Ravyn'],
  ['HeMan_', 'Falkor_'],
  ['Maka_', 'Tchoupi_'],
  ['zeNNN', 'Volt'],
  ['gim44', 'Lyrex'],
  ['eSuba', 'Nova Lyon'],
  ['ryZz', 'nevzz'],
  ['shox', 'Orbe'],
];

function swap(text: string): string {
  let out = text;
  for (const [from, to] of NAMES) {
    out = out.split(from).join(to);
    if (from.toLowerCase() !== from) out = out.split(from.toLowerCase()).join(to.toLowerCase());
  }
  return out;
}

/** Renomme en profondeur (clés comprises) : chaînes, tableaux, objets et Map. */
export function rename<T>(value: T): T {
  if (typeof value === 'string') return swap(value) as T;
  if (Array.isArray(value)) return value.map(rename) as T;
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [rename(k), rename(v)])) as T;
  if (value instanceof Date || value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [swap(k), rename(v)])) as T;
}

/** Salle de ligue (match programmé ce soir à 20:00) : Team Aurore contre Méridien Esport. */
export function leagueStore() {
  const base = rename(roomStore().get());
  const match = (base.faceit as { data: FaceitMatch }).data;
  const scheduledAt = new Date(new Date().setHours(20, 0, 0, 0));
  return createStore<RoomState>({ ...base, faceit: { status: 'ready', data: { ...match, scheduledAt } } });
}

/** Salle de matchmaking terminée, avec des groupes : trio + 2 solos contre 2 duos + 1 solo. */
export function matchmakingStore() {
  const base = rename(roomStore().get());
  const league = (base.faceit as { data: FaceitMatch }).data;
  const parties = [
    ['p-a', 'p-a', 'p-a', null, null],
    ['p-b', 'p-b', null, 'p-c', 'p-c'],
  ];
  const teams = league.teams.map((t, side): FaceitTeam => ({
    ...t,
    name: `team_${t.roster[side === 0 ? 1 : 0]!.nickname}`,
    substitutes: [],
    roster: t.roster.map((p, i) => ({ ...p, partyId: parties[side]![i] ?? null })),
  }));
  const match: FaceitMatch = {
    ...league,
    competitionName: '5v5 RANKED',
    entityType: 'matchmaking',
    calculateElo: true,
    state: 'FINISHED',
    score: [13, 9],
    winner: 0,
    map: 'de_mirage',
    teams,
  };
  return createStore<RoomState>({ ...base, faceit: { status: 'ready', data: match }, insight: { status: 'ready', data: null }, meId: null });
}
