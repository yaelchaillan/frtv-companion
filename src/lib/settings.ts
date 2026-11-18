import { storage } from 'wxt/utils/storage';

/** Réglages de l'extension, modifiables depuis la popup. */
export interface Settings {
  /** Affiche les niveaux FRTV 11 à 20 (sinon plafonné au niveau 10 FACEIT). */
  customLevels: boolean;
  /** Carte d'analyse FRTV dans la colonne centrale des salles de match. */
  matchPanel: boolean;
  /** Bandeau de forme sous chaque joueur des salles de match. */
  playerStrips: boolean;
  /** Suivi de niveau et carte FRTV sur les profils joueur. */
  profileCard: boolean;
  /** Masque « Global / 20 derniers matchs » de FACEIT et affiche le bandeau étendu FRTV. */
  hideFaceitStats: boolean;
  /** Habillage FRTV de la salle de match (cartes joueurs compactes, en-tête sobre). */
  restyleRoom: boolean;
  /** Journalise les réponses brutes dans la console (préfixe [FRTV]). */
  debug: boolean;
  /** Version du schéma des réglages (migrations). */
  version?: number;
}

const SETTINGS_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  customLevels: true,
  matchPanel: true,
  playerStrips: true,
  profileCard: true,
  hideFaceitStats: true,
  restyleRoom: true,
  debug: false,
  version: SETTINGS_VERSION,
};

export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

/** État replié du panneau, partagé entre les pages. */
export const collapsedItem = storage.defineItem<boolean>('local:panelCollapsed', {
  fallback: false,
});

/** Onglet mémorisé de la carte d'analyse et de la popup. */
export const roomTabItem = storage.defineItem<string>('local:roomTab', { fallback: '' });
export const popupTabItem = storage.defineItem<string>('local:popupTab', { fallback: 'today' });

export async function getSettings(): Promise<Settings> {
  const stored = await settingsItem.getValue();
  const merged = { ...DEFAULT_SETTINGS, ...stored };
  // v2 : la maquette remplace la boîte FACEIT par la fiche FRTV étendue.
  if ((stored?.version ?? 1) < SETTINGS_VERSION) {
    const migrated = { ...merged, hideFaceitStats: true, version: SETTINGS_VERSION };
    await settingsItem.setValue(migrated);
    return migrated;
  }
  return merged;
}
