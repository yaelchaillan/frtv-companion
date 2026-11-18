/** État partagé entre la logique d'une page et ses blocs (chaque bloc a sa racine React). */
import type { AsyncState } from '../components/useAsync';
import type { FaceitMatch } from '../lib/faceit/api';
import type { ProfileTeam } from '../lib/faceit/dom';
import type { FaceitMatchStat } from '../lib/faceit/stats';
import type { Outcome } from '../lib/frtv/analysis';
import type { MatchInsight, PlayerRatingIndex } from '../lib/frtv/service';
import type { FrtvEloRanking, FrtvEloRow, FrtvSeries } from '../lib/frtv/types';

/** Joueur classé au rating FRTV 2.0 (3 mois). */
export interface RankedPlayer {
  playerId: string;
  avgRating: number;
  rank: number;
  maps: number;
  kd: number | null;
  adr: number | null;
  kast: number | null;
}

export interface RoomState {
  faceit: AsyncState<FaceitMatch>;
  insight: AsyncState<MatchInsight | null>;
  /** 20 derniers matchs FACEIT par pseudo (en minuscules). */
  stats: Record<string, AsyncState<FaceitMatchStat[]>>;
  /** Rating FRTV par pseudo (en minuscules). */
  ratings: Map<string, RankedPlayer> | null;
  /** Identifiant FACEIT du joueur connecté (pour « Votre équipe »). */
  meId: string | null;
  /** Code pays par pseudo (en minuscules), lu dans le profil FACEIT. */
  countries: Record<string, string>;
  /** Identifiant (ou slug) de la page FRTV par pseudo (en minuscules). */
  frtvPlayers: Record<string, string>;
}

export interface TeamSnapshot {
  elo: FrtvEloRow | null;
  form: Outcome[];
  next: FrtvSeries | null;
  /** Elo FRTV de l'adversaire du prochain match (pour la prévision). */
  nextOpponentElo: FrtvEloRow | null;
}

export interface ProfileState {
  frtv: AsyncState<{ ratings: PlayerRatingIndex; elo: FrtvEloRanking | null; season: string | null }>;
  /** Équipe lue en haut du profil FACEIT. */
  team: ProfileTeam | null;
  /** Données FRTV de cette équipe (forme, prochain match). */
  teamData: AsyncState<TeamSnapshot> | null;
}
