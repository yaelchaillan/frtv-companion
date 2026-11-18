/**
 * Contrat (partiel) de l'API publique FRTV — https://frtv.fr/api/v1
 * Seuls les champs utilisés par l'extension sont typés ; tous peuvent manquer.
 * Vérifié le 2026-11-17.
 */

export interface FrtvTeamRef {
  _id: string;
  team_name: string;
  team_logo?: string | null;
  team_is_francophone?: boolean | null;
  team_country?: string | null;
}

export interface FrtvSeriesTeam {
  score?: number | null;
  id?: FrtvTeamRef | null;
}

export interface FrtvMap {
  match_number?: number;
  /** Ex. `de_dust2`. */
  match_map?: string | null;
  match_scores?: { team1?: number | null; team2?: number | null } | null;
  match_status?: string | null;
}

export interface FrtvVeto {
  /** Identifiant FRTV de l'équipe (même espace que `FrtvTeamRef._id`). */
  team_id: string;
  map: string;
  action: 'ban' | 'pick' | string;
  order?: number;
}

export type FrtvSeriesStatus = 'Upcoming' | 'Finished' | string;

export interface FrtvSeries {
  _id: string;
  /** Identique à l'identifiant de la salle FACEIT (`1-xxxxxxxx-…`). */
  match_series_faceit_id?: string | null;
  match_series_slug?: string | null;
  match_series_status?: FrtvSeriesStatus | null;
  /** Nombre de maps : 1 = BO1, 3 = BO3, 5 = BO5. */
  match_series_format?: number | null;
  match_series_competition_id?: {
    _id?: string;
    event_name?: string | null;
    event_season?: string | null;
    event_division?: string | null;
  } | null;
  match_series_teams?: { team1?: FrtvSeriesTeam | null; team2?: FrtvSeriesTeam | null } | null;
  match_series_matches?: FrtvMap[] | null;
  match_series_veto?: FrtvVeto[] | null;
  match_series_dates?: { scheduled?: string | null; started?: string | null; ended?: string | null } | null;
}

export interface FrtvPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage?: boolean;
}

export interface FrtvPaginated<T> {
  success?: boolean;
  data: T[];
  pagination?: FrtvPagination;
}

export interface FrtvEloRow {
  rank: number;
  /** Identifiant FRTV de l'équipe. */
  teamId: string;
  name: string;
  slug: string;
  logo?: string | null;
  rating: number;
  delta7d?: number | null;
  rankDelta?: number | null;
  matchesCounted?: number | null;
  isProvisional?: boolean | null;
  currentTier?: string | null;
  lastMatchAt?: string | null;
}

export interface FrtvEloRanking {
  generatedAt?: string;
  ranked?: number;
  provisional?: number;
  playersRated?: number;
  ranking: FrtvEloRow[];
}

export interface FrtvPlayerRankRow {
  rank: number;
  playerId: string;
  nickname: string;
  image?: string | null;
  team?: { _id: string; team_name: string; team_logo?: string | null } | null;
  /** Rating FRTV 2.0 moyen sur la période. */
  avgRating: number;
  maps: number;
  kd?: number | null;
  adr?: number | null;
  kast?: number | null;
}

export interface FrtvPlayerRanking {
  ratingVersion?: string;
  periodMonths?: number;
  minMaps?: number;
  rows: FrtvPlayerRankRow[];
}

export interface FrtvStream {
  id: string;
  user_login: string;
  user_name: string;
  title: string;
  viewer_count: number;
  /** Modèle Twitch avec `{width}` et `{height}` à remplacer. */
  thumbnail_url?: string | null;
  profile_image_url?: string | null;
  started_at?: string | null;
  language?: string | null;
}
