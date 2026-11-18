/**
 * Générateurs de phrases et de tableaux de la carte d'analyse (règles simples, pas d'IA).
 * Tout est pur et testé (narrative.test.ts) avec le match OldBoys / regnum4games.
 */
import { eloStakes } from '../faceit/stats';
import { fmtDayMonth, fmtInt, fmtPct, fmtSigned } from '../format';
import { mapLabel, type MapCount, type Outcome, type ScoreLine, type VetoTendencies } from './analysis';

const MINUS = '−';
type Pair<T> = [T, T];
export type Side = 0 | 1;

export interface Headline {
  title: string;
  subtitle: string;
}

export interface EloLite {
  rating: number;
  rank: number;
  tier: string | null;
}

const joinOr = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ou ${items[items.length - 1]}`;

// ---------------------------------------------------------------- Résumé

/** Match de ligue suivi par FRTV. */
export function leagueHeadline(names: Pair<string>, elo: Pair<EloLite | null>, probability: number | null): Headline {
  const title =
    probability === null
      ? 'Match non classé FRTV'
      : Math.round(probability * 100) === 50
        ? 'Match équilibré'
        : `${probability >= 0.5 ? names[0] : names[1]} favoris à ${fmtPct(Math.max(probability, 1 - probability))}`;

  const [a, b] = elo;
  const describe = (e: EloLite) => `Elo FRTV ${fmtInt(e.rating)}, #${e.rank}${e.tier ? ` ${e.tier}` : ''}`;
  let context: string;
  if (a && b) context = `Elo FRTV ${fmtInt(a.rating)} (#${a.rank}) contre ${fmtInt(b.rating)} (#${b.rank}).`;
  else if (a || b) context = `${describe((a ?? b) as EloLite)}, face à une équipe pas encore classée.`;
  else context = "Aucune des deux équipes n'est encore classée.";

  return { title, subtitle: `${context} Match de ligue : aucun Elo FACEIT en jeu.` };
}

/** Matchmaking : prévision à partir de l'Elo FACEIT moyen, du point de vue du joueur s'il joue. */
export function matchmakingHeadline(
  names: Pair<string>,
  avgElo: Pair<number>,
  mySide: Side | null,
  calculateElo: boolean,
): Headline {
  const s: Side = mySide ?? 0;
  const o: Side = s === 0 ? 1 : 0;
  const stakes = eloStakes(avgElo[s], avgElo[o]);
  const p = stakes.probability;
  const elo = calculateElo ? ` · +${stakes.win} / ${MINUS}${stakes.loss} Elo` : '';

  let title: string;
  if (Math.round(p * 100) === 50) {
    title = `Match équilibré${elo}`;
  } else if (mySide !== null) {
    title = p >= 0.5 ? `Votre équipe favorite à ${fmtPct(p)}${elo}` : `Adversaires favoris à ${fmtPct(1 - p)}${elo}`;
  } else {
    title = `${p >= 0.5 ? names[s] : names[o]} favoris à ${fmtPct(Math.max(p, 1 - p))}`;
  }
  return {
    title,
    subtitle: `Elo FACEIT moyen ${fmtInt(avgElo[s])} contre ${fmtInt(avgElo[o])}. Estimation FRTV à partir des deux moyennes.`,
  };
}

// ---------------------------------------------------------------- Veto

export interface VetoCell {
  kind: 'ban' | 'pick' | null;
  count: number;
  total: number;
}

export interface VetoRow {
  map: string;
  cells: Pair<VetoCell>;
  probable: boolean;
}

export interface VetoPlan {
  rows: VetoRow[];
  /** Maps qui restent après les bans habituels (au plus deux). */
  probable: string[];
  sentence: string | null;
}

export interface MapTally {
  map: string;
  played: number;
  won: number;
}

const countOf = (list: MapCount[], map: string) => list.find((m) => m.map === map)?.count ?? 0;
const playedOn = (maps: Pair<MapTally[]>, map: string) =>
  (maps[0].find((m) => m.map === map)?.played ?? 0) + (maps[1].find((m) => m.map === map)?.played ?? 0);

/**
 * Veto probable. Chaque équipe bannit 3 maps en BO1 (2 en BO3) : on retire ses bans les
 * plus fréquents (« bans habituels ») ; ce qui reste est probable. S'il reste plus de
 * deux maps, on garde les deux plus jouées.
 */
export function vetoPlan(veto: Pair<VetoTendencies>, maps: Pair<MapTally[]>, format: number | null): VetoPlan {
  const bansPerTeam = format === 1 ? 3 : 2;
  const vetoMaps = new Set<string>();
  veto.forEach((v) => [...v.bans, ...v.picks].forEach((m) => vetoMaps.add(m.map)));
  // Pool : maps vues dans les veto, complété par les maps jouées (jusqu'à 7).
  const pool = [...vetoMaps];
  [...maps[0], ...maps[1]]
    .sort((x, y) => y.played - x.played)
    .forEach((m) => {
      if (pool.length < 7 && !pool.includes(m.map)) pool.push(m.map);
    });

  const habitual = new Set(veto.flatMap((v) => v.bans.slice(0, bansPerTeam).map((m) => m.map)));
  let probable = pool.filter((m) => !habitual.has(m));
  probable.sort((x, y) => playedOn(maps, y) - playedOn(maps, x) || x.localeCompare(y));
  probable = probable.slice(0, 2);

  const cell = (v: VetoTendencies, map: string): VetoCell => {
    const bans = countOf(v.bans, map);
    const picks = countOf(v.picks, map);
    if (bans === 0 && picks === 0) return { kind: null, count: 0, total: v.sample };
    return bans >= picks ? { kind: 'ban', count: bans, total: v.sample } : { kind: 'pick', count: picks, total: v.sample };
  };

  // Ordre de la maquette : plus gros ban d'une équipe, puis total des deux équipes, puis picks.
  const maxOf = (map: string, kind: 'bans' | 'picks') => Math.max(countOf(veto[0][kind], map), countOf(veto[1][kind], map));
  const totalOf = (map: string, kind: 'bans' | 'picks') => countOf(veto[0][kind], map) + countOf(veto[1][kind], map);
  const rows = pool
    .map((map): VetoRow => ({ map, cells: [cell(veto[0], map), cell(veto[1], map)], probable: probable.includes(map) }))
    .sort((x, y) => {
      if (x.probable !== y.probable) return x.probable ? 1 : -1;
      if (x.probable) return probable.indexOf(x.map) - probable.indexOf(y.map);
      return (
        maxOf(y.map, 'bans') - maxOf(x.map, 'bans') ||
        totalOf(y.map, 'bans') - totalOf(x.map, 'bans') ||
        maxOf(y.map, 'picks') - maxOf(x.map, 'picks') ||
        x.map.localeCompare(y.map)
      );
    });

  // Ban le plus systématique, toutes équipes confondues.
  const firstBans = veto
    .map((v) => ({ ban: v.bans[0], sample: v.sample }))
    .filter((x): x is { ban: MapCount; sample: number } => Boolean(x.ban) && x.sample > 0)
    .sort((x, y) => y.ban.count / y.sample - x.ban.count / x.sample || y.ban.count - x.ban.count);
  const top = firstBans[0];
  let sentence: string | null = null;
  if (top) {
    sentence = `${mapLabel(top.ban.map)} saute au premier ban (${top.ban.count} fois sur ${top.sample}).`;
    if (probable.length) sentence += ` Après les bans habituels, il reste ${joinOr(probable.map(mapLabel))}.`;
  }
  return { rows, probable, sentence };
}

// ---------------------------------------------------------------- Maps

export interface MapCompareRow {
  map: string;
  tallies: Pair<MapTally | null>;
  probable: boolean;
}

export function mapCompareRows(maps: Pair<MapTally[]>, probable: string[], limit = 7): MapCompareRow[] {
  const all = new Set([...maps[0], ...maps[1]].map((m) => m.map));
  return [...all]
    .map((map): MapCompareRow => ({
      map,
      tallies: [maps[0].find((m) => m.map === map) ?? null, maps[1].find((m) => m.map === map) ?? null],
      probable: probable.includes(map),
    }))
    .sort((x, y) => {
      if (x.probable !== y.probable) return x.probable ? -1 : 1;
      if (x.probable) return probable.indexOf(x.map) - probable.indexOf(y.map);
      return playedOn(maps, y.map) - playedOn(maps, x.map) || x.map.localeCompare(y.map);
    })
    .slice(0, limit);
}

const rate = (t: MapTally | null) => (t && t.played > 0 ? t.won / t.played : null);

/** Ligue : qui a le plus d'expérience sur les maps probables. */
export function leagueMapsSentence(names: Pair<string>, rows: MapCompareRow[], probable: string[]): string | null {
  const probableRows = probable
    .map((map) => rows.find((r) => r.map === map))
    .filter((r): r is MapCompareRow => Boolean(r));
  if (probableRows.length === 0) return null;

  const played = (i: Side) => probableRows.reduce((s, r) => s + (r.tallies[i]?.played ?? 0), 0);
  const won = (i: Side) => probableRows.reduce((s, r) => s + (r.tallies[i]?.won ?? 0), 0);
  if (played(0) + played(1) === 0) return null;

  let team: Side;
  let verb: string;
  if (played(0) !== played(1)) {
    team = played(0) > played(1) ? 0 : 1;
    verb = 'a plus joué';
  } else {
    team = won(0) / Math.max(1, played(0)) >= won(1) / Math.max(1, played(1)) ? 0 : 1;
    verb = 'a le meilleur bilan';
  }
  const list = probableRows
    .filter((r) => r.tallies[team])
    .map((r) => `${r.tallies[team]?.won}/${r.tallies[team]?.played} sur ${mapLabel(r.map)}`)
    .join(', ');
  const scope = probableRows.length === 2 ? 'les deux maps probables' : 'la map probable';
  return `Sur ${scope}, ${names[team]} ${verb} : ${list}.`;
}

/** Matchmaking : meilleure et pire map (écart de taux de victoire), du point de vue du joueur. */
export function matchmakingMapsSentence(names: Pair<string>, rows: MapCompareRow[], mySide: Side | null): string | null {
  const s: Side = mySide ?? 0;
  const o: Side = s === 0 ? 1 : 0;
  const eligible = rows
    .map((r) => ({ r, mine: rate(r.tallies[s]), theirs: rate(r.tallies[o]) }))
    .filter((x) => x.mine !== null && x.theirs !== null && (x.r.tallies[s]?.played ?? 0) >= 2 && (x.r.tallies[o]?.played ?? 0) >= 2)
    .map((x) => ({ ...x, diff: (x.mine as number) - (x.theirs as number) }));
  if (eligible.length === 0) return null;

  const best = eligible.reduce((a, b) => (b.diff > a.diff ? b : a));
  const worst = eligible.reduce((a, b) => (b.diff < a.diff ? b : a));
  const theirLowest = eligible.reduce((a, b) => ((b.theirs as number) < (a.theirs as number) ? b : a));
  const avoid = worst.diff < 0 && worst.r.map !== best.r.map ? ` Évitez ${mapLabel(worst.r.map)}.` : '';

  if (mySide !== null) {
    const them =
      theirLowest.r.map === best.r.map
        ? `et leur pire (${fmtPct(best.theirs as number)})`
        : `contre ${fmtPct(best.theirs as number)} en face`;
    return `${mapLabel(best.r.map)} est votre meilleure map (${fmtPct(best.mine as number)}) ${them}.${avoid}`;
  }
  return `${mapLabel(best.r.map)} avantage ${names[s]} (${fmtPct(best.mine as number)} contre ${fmtPct(best.theirs as number)}).${
    worst.diff < 0 && worst.r.map !== best.r.map ? ` ${mapLabel(worst.r.map)} avantage ${names[o]}.` : ''
  }`;
}

// ---------------------------------------------------------------- Forme

/** Décrit une forme (du plus récent au plus ancien). `weight` sert à choisir l'ordre des phrases. */
export function describeForm(form: Outcome[]): { text: string; weight: number } {
  const n = form.length;
  if (n === 0) return { text: "n'a pas de série récente", weight: 0 };
  const v = form.filter((r) => r === 'V').length;
  const d = form.filter((r) => r === 'D').length;
  let changes = 0;
  for (let i = 0; i < n - 1; i += 1) if (form[i] !== form[i + 1]) changes += 1;
  let streak = 1;
  while (streak < n && form[streak] === form[0]) streak += 1;

  if (d >= 4) return { text: `reste sur ${d} défaites en ${n} matchs`, weight: d };
  if (v >= 4) return { text: `reste sur ${v} victoires en ${n} matchs`, weight: v };
  if (n >= 4 && v > 0 && d > 0 && changes >= n - 2) return { text: 'alterne', weight: 1 };
  if (streak >= 3) return { text: `reste sur ${streak} ${form[0] === 'V' ? 'victoires' : 'défaites'}`, weight: streak };
  return { text: `compte ${v} V et ${d} D sur ${n} matchs`, weight: 2 };
}

export function formSentence(names: Pair<string>, forms: Pair<Outcome[]>): string {
  const parts = names
    .map((name, i) => ({ name, ...describeForm(forms[i] ?? []) }))
    .sort((x, y) => y.weight - x.weight);
  return `${parts.map((p) => `${p.name} ${p.text}`).join(' ; ')}.`;
}

export interface H2hInput {
  winsA: number;
  winsB: number;
  last: { score: ScoreLine | null; map: string | null; date: string | null } | null;
}

export function h2hSentence(names: Pair<string>, h2h: H2hInput): string {
  if (h2h.winsA + h2h.winsB === 0 && !h2h.last) return 'Première confrontation dans les données FRTV.';
  const { winsA: a, winsB: b } = h2h;
  const lead = a > b ? `${names[0]} mène ${a}–${b}` : a < b ? `${names[1]} mène ${b}–${a}` : `Égalité ${a}–${b}`;
  const last = h2h.last;
  if (!last?.score) return `${lead}.`;
  const details = [`${last.score.mine}–${last.score.theirs}`, last.map ? `sur ${mapLabel(last.map)}` : null]
    .filter(Boolean)
    .join(' ');
  const date = last.date ? `, ${fmtDayMonth(last.date)}` : '';
  return `${lead} (dernier : ${details}${date}).`;
}

/** Matchmaking : Elo cumulé des joueurs sur leurs 20 derniers matchs. */
export function eloTrendSentence(names: Pair<string>, deltas: Pair<number>, mySide: Side | null): string {
  const s: Side = mySide ?? 0;
  const o: Side = s === 0 ? 1 : 0;
  if (mySide !== null) {
    return `Vos joueurs cumulent ${fmtSigned(deltas[s])} Elo sur 20 matchs, contre ${fmtSigned(deltas[o])} en face.`;
  }
  return `${names[s]} cumule ${fmtSigned(deltas[s])} Elo sur 20 matchs, contre ${fmtSigned(deltas[o])} pour ${names[o]}.`;
}

/** Matchmaking : matchs joués aujourd'hui par joueur (fatigue ou échauffement). */
export function fatigueSentence(names: Pair<string>, today: Pair<number[]>, mySide: Side | null): string {
  const s: Side = mySide ?? 0;
  const o: Side = s === 0 ? 1 : 0;
  const who = mySide !== null ? 'votre équipe' : names[s];
  const mine = today[s];
  const theirs = today[o];
  const tired = mine.filter((c) => c >= 3);
  const maxTheirs = theirs.length ? Math.max(...theirs) : 0;

  const first = tired.length
    ? `${tired.length} joueur${tired.length > 1 ? 's' : ''} de ${who} ${tired.length > 1 ? 'en sont' : 'en est'} au moins à leur ${Math.min(...tired) + 1}e match aujourd'hui.`
    : `Personne dans ${who} n'a joué plus de ${mine.length ? Math.max(...mine) : 0} match${(mine.length ? Math.max(...mine) : 0) > 1 ? 's' : ''} aujourd'hui.`;
  const tiredTheirs = theirs.filter((c) => c >= 3).length;
  const second =
    tiredTheirs > 0
      ? `En face, ${tiredTheirs} joueur${tiredTheirs > 1 ? 's' : ''} aussi.`
      : maxTheirs > 0
        ? `En face, personne au-delà de ${maxTheirs}.`
        : "En face, aucun match aujourd'hui.";
  return `${first} ${second}`;
}
