/**
 * Intégration sur un profil joueur FACEIT :
 * - suivi de niveau (bloc D) au centre de la carte « Season » ;
 * - badge FRTV (bloc E) à la place de l'icône de niveau FACEIT ;
 * - carte « Scène FR » (bloc F) sous la carte « Season ».
 * Panneau flottant de secours si les repères FACEIT sont introuvables.
 */
import { LevelBadge } from '../components/LevelBadge';
import { LevelTracker } from '../components/native/LevelTracker';
import { findTeamElo, ProfileFrtvCard } from '../components/native/ProfileFrtvCard';
import { ProfileCard } from '../components/ProfileCard';
import { findProfileAnchors, findProfileTeam, hideElement, restoreHidden } from '../lib/faceit/dom';
import { finishedHistory, recentForm, scheduledTime } from '../lib/frtv/analysis';
import { frtv, playerRatingIndex } from '../lib/frtv/service';
import { WidgetManager } from '../lib/inject/widgets';
import { watchDom } from '../lib/inject/watch';
import { capToFaceit, computeLevel } from '../lib/levels';
import type { Settings } from '../lib/settings';
import { createStore } from '../lib/store';
import type { ProfileState, TeamSnapshot } from './state';

const FALLBACK_DELAY_MS = 10_000;

export function startProfile(nickname: string, settings: Settings): () => void {
  const store = createStore<ProfileState>({ frtv: { status: 'loading' }, team: null, teamData: null });
  const widgets = new WidgetManager();
  const startedAt = Date.now();
  let stopped = false;
  let teamLoadedFor: string | null = null;

  Promise.all([playerRatingIndex(), frtv.eloRanking().catch(() => null), frtv.currentSeason().catch(() => null)]).then(
    ([ratings, elo, season]) => {
      if (stopped) return;
      store.set({ frtv: { status: 'ready', data: { ratings, elo, season } } });
      loadTeamData();
    },
    (error: unknown) =>
      !stopped && store.set({ frtv: { status: 'error', error: error instanceof Error ? error.message : String(error) } }),
  );

  /** Forme et prochain match de l'équipe du joueur, si elle est classée FRTV. */
  function loadTeamData() {
    const { team, frtv: data } = store.get();
    if (!team || data.status !== 'ready' || teamLoadedFor === team.name) return;
    const teamElo = findTeamElo(data.data.elo, team.name);
    if (!teamElo) return;
    teamLoadedFor = team.name;
    store.set({ teamData: { status: 'loading' } });
    frtv
      .teamSeries(team.name)
      .then((list) => {
        const upcoming = list
          .filter((s) => s.match_series_status === 'Upcoming' && scheduledTime(s) >= Date.now() - 3 * 3600_000)
          .sort((a, b) => scheduledTime(a) - scheduledTime(b));
        const next = upcoming[0] ?? null;
        const opponentId = next
          ? [next.match_series_teams?.team1?.id?._id, next.match_series_teams?.team2?.id?._id].find((id) => id && id !== teamElo.teamId)
          : undefined;
        const snapshot: TeamSnapshot = {
          elo: teamElo,
          form: recentForm(finishedHistory(list, teamElo.teamId), teamElo.teamId),
          next,
          nextOpponentElo: opponentId ? (data.data.elo?.ranking.find((r) => r.teamId === opponentId) ?? null) : null,
        };
        if (!stopped) store.set({ teamData: { status: 'ready', data: snapshot } });
      })
      .catch((error: unknown) => {
        if (!stopped) store.set({ teamData: { status: 'error', error: error instanceof Error ? error.message : String(error) } });
      });
  }

  function scan() {
    if (stopped) return;
    const keep = new Set<string>();
    const anchors = findProfileAnchors();

    // Équipe affichée en haut du profil (pour la variante « équipe classée »).
    const team = findProfileTeam();
    if (team && team.name !== store.get().team?.name) {
      store.set({ team });
      loadTeamData();
    }

    if (anchors && settings.profileCard) {
      const computed = computeLevel(anchors.elo);
      const level = computed && !settings.customLevels ? capToFaceit(computed) : computed;

      if (level && level.level >= 10) {
        keep.add('tracker');
        widgets.ensure(
          'tracker',
          (host) => anchors.eloBlock.after(host),
          () => <LevelTracker info={level} />,
          undefined,
          (host) => anchors.eloBlock.nextElementSibling === host,
        );
      }
      if (settings.customLevels && anchors.skillIcon && level?.isCustom) {
        const icon = anchors.skillIcon;
        keep.add('badge');
        hideElement(icon);
        widgets.ensure(
          'badge',
          (host) => icon.before(host),
          () => <LevelBadge info={level} size={40} />,
          { inline: true },
          (host) => host.nextElementSibling === icon,
        );
      }
      if (anchors.seasonCard) {
        const card = anchors.seasonCard;
        keep.add('frtv-card');
        widgets.ensure(
          'frtv-card',
          (host) => card.after(host),
          () => <ProfileFrtvCard store={store} nickname={nickname} />,
          undefined,
          (host) => card.nextElementSibling === host,
        );
      }
    }

    // Secours uniquement sur l'onglet « Résumé » (les autres onglets n'ont pas la carte Season).
    const onSummary = /\/players\/[^/]+\/?$/.test(location.pathname);
    if (settings.profileCard && onSummary && !anchors && Date.now() - startedAt > FALLBACK_DELAY_MS) {
      keep.add('fallback');
      widgets.ensure('fallback', (host) => document.body.append(host), () => <ProfileCard nickname={nickname} settings={settings} />);
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
  };
}
