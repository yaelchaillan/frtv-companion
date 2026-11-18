/**
 * Intégration dans une salle de match FACEIT :
 * - carte d'analyse FRTV dans la colonne centrale (bloc C) ;
 * - forme sous chaque joueur (bloc A), étendue si « Masquer les stats FACEIT » est actif ;
 * - badges de niveau 11 à 20 à la place de l'icône FACEIT (bloc B).
 * Si les repères FACEIT sont introuvables (refonte du site), on affiche le panneau flottant.
 */
import { LevelBadge } from '../components/LevelBadge';
import { MatchPanel } from '../components/MatchPanel';
import { PlayerStrip } from '../components/native/PlayerStrip';
import { RoomCard } from '../components/native/RoomCard';
import { RosterColumn } from '../components/native/RosterColumn';
import { TeamLink } from '../components/native/TeamLink';
import { MatchHeader } from '../components/native/MatchHeader';
import { allPlayers, fetchCurrentUserId, fetchFaceitMatch, fetchFaceitPlayer, type FaceitMatch } from '../lib/faceit/api';
import {
  findRoomInfoStack,
  findRoomPlayerCards,
  hideElement,
  insertBeforeForeign,
  clearForeignMarks,
  isAfterNativeContent,
  markForeignBlocks,
  restoreHidden,
} from '../lib/faceit/dom';
import { fetchRecentStats, mapLimit } from '../lib/faceit/stats';
import { buildMatchInsight, findSeriesByFaceitId, frtv, playerRatingIndex } from '../lib/frtv/service';
import { WidgetManager } from '../lib/inject/widgets';
import { watchDom } from '../lib/inject/watch';
import { computeLevel } from '../lib/levels';
import type { Settings } from '../lib/settings';
import { createStore, type Store } from '../lib/store';
import type { RankedPlayer, RoomState } from './state';

const FALLBACK_DELAY_MS = 8000;
export const SKIN_CLASS = 'frtv-skin-room';
/** États de match où nos colonnes remplacent celles de FACEIT (pas de phase de jeu en cours). */
const TAKEOVER_STATES = new Set(['FINISHED', 'SCHEDULED', 'CANCELLED']);
const ROSTER_COLUMNS = '[name="roster1"], [name="roster2"]';
const HEADER_CARD = '[class*="styles__HeaderWrapper"] > [class*="styles__Container"]';
const FACTION_INFO = '[class*="styles__FactionInfo"]';
const FACTIONS = '[class*="styles__Faction-"]';
const ROOM_WIDTH_VAR = '--frtv-room-w';

/**
 * Marges du bloc A pour obtenir l'espacement de la maquette : 8 px sous la carte du
 * joueur, 12 px avant le joueur suivant. FACEIT ajoute déjà une marge interne verticale
 * sur chaque carte (12 px) et un espacement de groupe (8 px) : on les compense.
 */
function stripMargins(card: HTMLElement): { top: number; bottom: number } {
  const gapOf = (el: Element | null) => (el ? parseFloat(getComputedStyle(el).rowGap) || 0 : 0);
  const own = getComputedStyle(card);
  const padBottom = parseFloat(own.paddingBottom) || 0;
  const padTop = parseFloat(own.paddingTop) || 0;

  // Notre bloc est inséré juste après la carte, dans son parent direct.
  const top = 8 - padBottom - gapOf(card.parentElement);

  // Selon les salles, la carte est directement dans le groupe (ligue) ou enveloppée dans un
  // conteneur par joueur (matchmaking) : on remonte jusqu'à l'élément enfant du groupe.
  let item: HTMLElement = card;
  while (item.parentElement && !item.parentElement.matches('[class*="Roster__Group"]')) item = item.parentElement;
  const group = item.parentElement;
  if (!group) return { top, bottom: 0 };
  let nextCard: HTMLElement | null = null;
  for (let el = item.nextElementSibling; el && !nextCard; el = el.nextElementSibling) {
    nextCard = el.matches(CARD) ? (el as HTMLElement) : el.querySelector<HTMLElement>(CARD);
  }
  if (!nextCard) return { top, bottom: 0 };
  // 12 px jusqu'au haut VISIBLE du joueur suivant : sur FACEIT, son avatar dépasse au-dessus
  // de la carte et occupe la marge interne ; on ne compense donc que l'espace réellement vide.
  return { top, bottom: 12 - gapOf(group) - visibleTopOffset(nextCard, padTop) };
}

const CARD = '[aria-haspopup="dialog"]';

/** Distance entre le haut d'une carte FACEIT et son premier élément visible (avatar, fond). */
function visibleTopOffset(card: HTMLElement, fallback: number): number {
  const box = card.getBoundingClientRect();
  if (box.height === 0) return fallback; // page pas encore mise en page
  const tops = [...card.querySelectorAll<HTMLElement>('[class*="Avatar"], [class*="Background"], img')]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.height > 0)
    .map((r) => r.top - box.top);
  return tops.length ? Math.max(0, Math.min(fallback, ...tops)) : fallback;
}
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Insère (ou replace) les blocs dans la salle de match FACEIT présente dans `root`.
 * Exporté pour que l'aperçu (preview/salle) passe par exactement le même code.
 */
export function injectRoomWidgets({
  store,
  settings,
  widgets,
  keep,
  onRetry,
  root = document,
}: {
  store: Store<RoomState>;
  settings: Settings;
  widgets: WidgetManager;
  keep: Set<string>;
  onRetry: () => void;
  root?: ParentNode;
}) {
  const stack = findRoomInfoStack(root);
  const cards = findRoomPlayerCards(root);
  const { stats, faceit } = store.get();

  // Colonnes de joueurs de la maquette, à la place de celles de FACEIT. Uniquement hors
  // phase de jeu : pendant un match (prêt, veto, connexion…), FACEIT garde ses colonnes.
  const takeover =
    settings.restyleRoom && faceit.status === 'ready' && TAKEOVER_STATES.has((faceit.data.state ?? '').toUpperCase());
  if (takeover) {
    root.querySelectorAll<HTMLElement>(ROSTER_COLUMNS).forEach((column) => {
      const side: 0 | 1 = column.getAttribute('name') === 'roster2' ? 1 : 0;
      for (const child of column.children) if (child.tagName !== 'FRTV-WIDGET') hideElement(child);
      keep.add(`roster:${side}`);
      widgets.ensure(
        `roster:${side}`,
        (host) => column.append(host),
        () => <RosterColumn store={store} side={side} settings={settings} />,
        undefined,
        (host) => host.parentElement === column,
      );
    });
  }

  // Colonnes aussi larges que le bandeau d'en-tête du match (habillage, styles/faceit-skin.css).
  if (settings.restyleRoom) {
    const width = root.querySelector<HTMLElement>(HEADER_CARD)?.getBoundingClientRect().width;
    if (width) document.documentElement.style.setProperty(ROOM_WIDTH_VAR, `${Math.round(width)}px`);
  }

  // En-tête redessiné (équipes, score, comparatif) à la place du bloc des équipes de FACEIT,
  // sous le fil d'Ariane et sur l'image de la map. Hors phase de jeu uniquement.
  const factions = root.querySelector<HTMLElement>(FACTIONS)?.parentElement ?? null;
  if (takeover && factions) {
    hideElement(factions);
    keep.add('match-header');
    widgets.ensure(
      'match-header',
      (host) => factions.before(host),
      () => <MatchHeader store={store} />,
      undefined,
      (host) => host.nextElementSibling === factions,
    );
  } else if (settings.matchPanel) {
    // Sinon : bouton « Équipe sur FRTV » sous le nom de chaque équipe de FACEIT.
    root.querySelectorAll<HTMLElement>(FACTION_INFO).forEach((info, i) => {
      const name = info.querySelector('[class*="Text__StyledText"]')?.textContent?.trim();
      if (!name) return;
      keep.add(`team-link:${i}`);
      widgets.ensure(
        `team-link:${i}`,
        (host) => info.append(host),
        () => <TeamLink store={store} teamName={name} />,
        { inline: true },
        (host) => host.parentElement === info,
      );
    });
  }

  if (settings.matchPanel && stack) {
    keep.add('room-card');
    widgets.ensure(
      'room-card',
      (host) => insertBeforeForeign(stack, host),
      () => <RoomCard store={store} onRetry={onRetry} />,
      { margin: { top: 16 } }, // maquette : 12 px d'espacement + 4 px de marge
      (host) => isAfterNativeContent(stack, host),
    );
  }

  // Nos colonnes remplacent les cartes FACEIT : rien à insérer dedans.
  for (const player of takeover ? [] : cards) {
    const key = player.nickname.toLowerCase();
    const inMatch = Boolean(stats[key]); // pas de bloc pour le coach
    if (settings.restyleRoom) markForeignBlocks(player.card);

    // Bloc A : forme (fiche étendue si la boîte FACEIT est masquée).
    if (settings.playerStrips && inMatch) {
      const extended = settings.hideFaceitStats;
      if (extended && player.statsBox) hideElement(player.statsBox);
      keep.add(`strip:${key}`);
      widgets.ensure(
        `strip:${key}`,
        (host) => player.card.after(host),
        () => <PlayerStrip store={store} nickname={player.nickname} extended={extended} />,
        { margin: stripMargins(player.card) },
        (host) => player.card.nextElementSibling === host,
      );
    }

    // Bloc B : badge 11+ à la place de l'icône FACEIT (les « Challenger » gardent leur badge).
    const level = computeLevel(player.elo);
    if (settings.customLevels && player.skillIcon && level?.isCustom) {
      const icon = player.skillIcon;
      keep.add(`lvl:${key}`);
      hideElement(icon);
      widgets.ensure(
        `lvl:${key}`,
        (host) => icon.before(host),
        () => <LevelBadge info={level} size={32} />,
        { inline: true },
        (host) => host.nextElementSibling === icon,
      );
    }
  }
  return { stack, cards };
}

export function startRoom(matchId: string, settings: Settings): () => void {
  const store = createStore<RoomState>({
    faceit: { status: 'loading' },
    insight: { status: 'loading' },
    stats: {},
    ratings: null,
    meId: null,
    countries: {},
    frtvPlayers: {},
  });
  const widgets = new WidgetManager();
  const startedAt = Date.now();
  let stopped = false;
  let match: FaceitMatch | null = null;

  // Habillage de la salle (styles/faceit-skin.css) : avant le premier passage, pour que les
  // marges de nos blocs soient calculées sur la carte déjà compactée.
  if (settings.restyleRoom) document.documentElement.classList.add(SKIN_CLASS);

  void load();

  async function load() {
    void fetchCurrentUserId().then((meId) => !stopped && store.set({ meId }));

    playerRatingIndex()
      .then((index) => {
        if (stopped) return;
        const ratings = new Map<string, RankedPlayer>();
        index.byNickname.forEach((row, nick) =>
          ratings.set(nick, {
            playerId: row.playerId,
            avgRating: row.avgRating,
            rank: row.rank,
            maps: row.maps,
            kd: row.kd ?? null,
            adr: row.adr ?? null,
            kast: row.kast ?? null,
          }),
        );
        store.set({ ratings });
      })
      .catch(() => undefined);

    try {
      match = await fetchFaceitMatch(matchId);
      if (stopped) return;
      store.set({ faceit: { status: 'ready', data: match } });
    } catch (error) {
      if (stopped) return;
      store.set({ faceit: { status: 'error', error: errorText(error) } });
    }

    loadInsight();

    if (!match) return;
    const players = allPlayers(match).filter((p) => p.id);

    // Page FRTV de chaque joueur (bouton sur sa carte).
    void mapLimit(players, 4, async (player) => {
      const id = await frtv.playerId(player.nickname).catch(() => null);
      if (id && !stopped) {
        const key = player.nickname.toLowerCase();
        store.set((s) => ({ frtvPlayers: { ...s.frtvPlayers, [key]: id } }));
      }
    });

    // Pays des joueurs (profil FACEIT, mis en cache) pour nos cartes joueurs.
    void mapLimit(players, 4, async (player) => {
      const profile = await fetchFaceitPlayer(player.nickname);
      if (profile?.country && !stopped) {
        const key = player.nickname.toLowerCase();
        store.set((s) => ({ countries: { ...s.countries, [key]: (profile.country as string).toUpperCase() } }));
      }
    });
    store.set({ stats: Object.fromEntries(players.map((p) => [p.nickname.toLowerCase(), { status: 'loading' as const }])) });
    await mapLimit(players, 4, async (player) => {
      const key = player.nickname.toLowerCase();
      try {
        const data = await fetchRecentStats(player.id as string);
        if (!stopped) store.set((s) => ({ stats: { ...s.stats, [key]: { status: 'ready', data } } }));
      } catch (error) {
        if (!stopped) store.set((s) => ({ stats: { ...s.stats, [key]: { status: 'error', error: errorText(error) } } }));
      }
    });
  }

  /** Données FRTV (relancé par le bouton « Réessayer »). */
  function loadInsight() {
    store.set({ insight: { status: 'loading' } });
    findSeriesByFaceitId(matchId, { teamNames: match?.teams.map((t) => t.name), around: match?.scheduledAt })
      .then((series) => (series ? buildMatchInsight(series) : null))
      .then(
        (data) => !stopped && store.set({ insight: { status: 'ready', data } }),
        (error: unknown) => !stopped && store.set({ insight: { status: 'error', error: errorText(error) } }),
      );
  }

  function scan() {
    if (stopped) return;
    const keep = new Set<string>();
    const { stack, cards } = injectRoomWidgets({ store, settings, widgets, keep, onRetry: loadInsight });

    // Repères introuvables sur l'onglet « Aperçu » : panneau flottant de secours.
    const onOverview = /\/room\/[^/]+\/?$/.test(location.pathname);
    if (settings.matchPanel && onOverview && !stack && cards.length === 0 && Date.now() - startedAt > FALLBACK_DELAY_MS) {
      keep.add('fallback');
      widgets.ensure('fallback', (host) => document.body.append(host), () => <MatchPanel matchId={matchId} settings={settings} />);
    }

    widgets.sweep(keep);
  }

  const stopWatching = watchDom(scan);
  const unsubscribe = store.subscribe(scan);
  const fallbackTimer = setTimeout(scan, FALLBACK_DELAY_MS + 100);

  return () => {
    stopped = true;
    stopWatching();
    unsubscribe();
    clearTimeout(fallbackTimer);
    widgets.clear();
    restoreHidden();
    clearForeignMarks();
    document.documentElement.classList.remove(SKIN_CLASS);
    document.documentElement.style.removeProperty(ROOM_WIDTH_VAR);
  };
}
