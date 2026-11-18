/**
 * Groupes (« parties ») du matchmaking : quels joueurs ont lancé la partie ensemble.
 * Chaque joueur du match porte un \`partyId\` ; un joueur seul a son propre groupe.
 */
import type { FaceitPlayer } from './api';

export interface PartySegment {
  partyId: string | null;
  players: FaceitPlayer[];
}

/**
 * Regroupe les joueurs par groupe en gardant l'ordre de FACEIT : chaque groupe apparaît à
 * la position de son premier membre, ses membres sont rendus adjacents.
 */
export function groupByParty(players: FaceitPlayer[]): PartySegment[] {
  const segments: PartySegment[] = [];
  const byId = new Map<string, PartySegment>();
  for (const player of players) {
    const id = player.partyId;
    const existing = id ? byId.get(id) : undefined;
    if (existing) {
      existing.players.push(player);
      continue;
    }
    const segment: PartySegment = { partyId: id, players: [player] };
    if (id) byId.set(id, segment);
    segments.push(segment);
  }
  return segments;
}

const WORD: Record<number, string> = { 2: 'duo', 3: 'trio' };

/** « Groupe de 5 », « Trio + duo », « Duo + 3 solos », « 5 solos »… */
export function partySummary(sizes: number[]): string | null {
  const sorted = sizes.filter((s) => s > 0).sort((a, b) => b - a);
  if (sorted.length === 0) return null;
  const solos = sorted.filter((s) => s === 1).length;
  const groups = sorted.filter((s) => s > 1);
  if (groups.length === 0) return `${solos} solo${solos > 1 ? 's' : ''}`;

  const counts = new Map<number, number>();
  groups.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
  const parts = [...counts.entries()].map(([size, n]) => {
    const word = WORD[size];
    if (word) return n > 1 ? `${n} ${word}s` : word;
    return n > 1 ? `${n} groupes de ${size}` : `groupe de ${size}`;
  });
  if (solos) parts.push(`${solos} solo${solos > 1 ? 's' : ''}`);
  const text = parts.join(' + ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
