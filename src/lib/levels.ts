/**
 * Niveaux FRTV : prolongement de l'échelle FACEIT au-delà du niveau 10.
 *
 * - Niveaux 1 à 9 : on reprend tel quel le niveau fourni par FACEIT
 *   (aucune table de seuils recopiée ici, FACEIT reste la source).
 * - Niveau 10 : dès 2001 Elo (seuil officiel FACEIT, sans plafond chez FACEIT).
 * - Niveaux 11 à 20 : paliers FRTV de 250 Elo (11 = 2251+, …, 20 = 4501+).
 */
export const LEVEL_10_MIN_ELO = 2001;
export const CUSTOM_LEVEL_STEP = 250;
export const MAX_LEVEL = 20;

export interface LevelInfo {
  level: number;
  /** `true` pour les niveaux FRTV (11 et plus). */
  isCustom: boolean;
  elo: number | null;
  /** Elo minimum du palier courant (connu à partir du niveau 10). */
  floor: number | null;
  /** Elo à atteindre pour le niveau suivant (`null` au niveau max ou si inconnu). */
  nextAt: number | null;
  /** Progression de 0 à 1 dans le palier courant (`null` si inconnue). */
  progress: number | null;
}

/** Elo minimum d'un niveau ≥ 10, `null` sinon. */
export function levelFloor(level: number): number | null {
  if (!Number.isInteger(level) || level < 10 || level > MAX_LEVEL) return null;
  return LEVEL_10_MIN_ELO + (level - 10) * CUSTOM_LEVEL_STEP;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Calcule le niveau à afficher.
 * L'Elo prime dès 2001 (niveaux 10 à 15) ; en dessous, on garde le niveau FACEIT.
 */
export function computeLevel(elo?: number | null, faceitLevel?: number | null): LevelInfo | null {
  const rawElo = asFiniteNumber(elo);
  const validElo = rawElo === null ? null : Math.round(rawElo);

  if (validElo !== null && validElo >= LEVEL_10_MIN_ELO) {
    const steps = Math.floor((validElo - LEVEL_10_MIN_ELO) / CUSTOM_LEVEL_STEP);
    const level = Math.min(10 + steps, MAX_LEVEL);
    const floor = LEVEL_10_MIN_ELO + (level - 10) * CUSTOM_LEVEL_STEP;
    const nextAt = level < MAX_LEVEL ? floor + CUSTOM_LEVEL_STEP : null;
    return {
      level,
      isCustom: level > 10,
      elo: validElo,
      floor,
      nextAt,
      progress: nextAt === null ? 1 : (validElo - floor) / CUSTOM_LEVEL_STEP,
    };
  }

  const rawLevel = asFiniteNumber(faceitLevel);
  if (rawLevel !== null && rawLevel >= 1 && rawLevel <= 10) {
    const level = Math.floor(rawLevel);
    return {
      level,
      isCustom: false,
      elo: validElo,
      floor: null,
      // Seul le passage 9 → 10 est connu de façon certaine (2001 Elo).
      nextAt: level === 9 ? LEVEL_10_MIN_ELO : null,
      progress: null,
    };
  }

  return null;
}

/** Niveau affiché quand l'utilisateur a désactivé les niveaux 11+ (plafonné à 10). */
export function capToFaceit(info: LevelInfo): LevelInfo {
  if (info.level <= 10) return info;
  return { ...info, level: 10, isCustom: false, floor: LEVEL_10_MIN_ELO, nextAt: null, progress: 1 };
}
