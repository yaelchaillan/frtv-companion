import type { RoomState } from '../../features/state';
import { useStore, type Store } from '../../lib/store';
import { Wordmark } from '../Wordmark';

/**
 * Bouton « Équipe sur FRTV » sous le nom d'une équipe, dans l'en-tête du match.
 * L'équipe est retrouvée par son nom parmi les équipes de la série FRTV (matchs de ligue).
 */
export function TeamLink({ store, teamName }: { store: Store<RoomState>; teamName: string }) {
  const insight = useStore(store, (s) => s.insight);
  if (insight.status !== 'ready' || !insight.data) return null;
  const key = teamName.trim().toLowerCase();
  const team = insight.data.teams.find((t) => t.name.trim().toLowerCase() === key);
  if (!team?.id) return null;
  const slug = team.elo?.slug && team.elo.slug === team.name.toLowerCase() ? team.elo.slug : team.id;

  return (
    <a
      className="frtv-tlink"
      href={`https://frtv.fr/team/${encodeURIComponent(slug)}`}
      target="_blank"
      rel="noreferrer"
      title={`Voir ${team.name} sur FRTV`}
    >
      <Wordmark height={10} />
      <span>Équipe</span>
      <span aria-hidden="true">↗</span>
    </a>
  );
}
