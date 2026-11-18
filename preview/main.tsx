/**
 * Aperçu de tous les blocs avec le jeu de référence (`npm run preview:ui`).
 * Les blocs FACEIT/FRTV utilisent des données figées (preview/fixtures.ts) ; la popup
 * interroge l'API FRTV réelle via le proxy Vite.
 */
import type { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { LevelBadge } from '../src/components/LevelBadge';
import { LevelTracker } from '../src/components/native/LevelTracker';
import { PlayerStrip } from '../src/components/native/PlayerStrip';
import { ProfileFrtvCard } from '../src/components/native/ProfileFrtvCard';
import { RoomCard } from '../src/components/native/RoomCard';
import { App as Popup } from '../src/entrypoints/popup/App';
import { computeLevel } from '../src/lib/levels';
import '../src/entrypoints/popup/popup.css';
import { MM_MATCH, profileStore, roomStore } from './fixtures';
import './preview.css';

const store = roomStore();
const mmStore = roomStore({ faceit: { status: 'ready', data: MM_MATCH }, insight: { status: 'ready', data: null }, meId: 'id-Kyojin' });
const loadingStore = roomStore({ insight: { status: 'loading' } });
const errorStore = roomStore({ insight: { status: 'error', error: 'timeout' }, stats: {} });
const emptyStore = roomStore({ insight: { status: 'ready', data: null }, stats: {} });
const extendedStore = roomStore();

function Frame({ label, id, children, width }: { label: string; id?: string; children: ReactNode; width?: number }) {
  return (
    <figure className="pv-frame" data-pv={id}>
      <figcaption>{label}</figcaption>
      <div className="frtv" style={width ? { width } : undefined}>
        {children}
      </div>
    </figure>
  );
}

function Preview() {
  return (
    <div className="pv">
      <h1>FRTV Companion · aperçu de la refonte</h1>

      <h2>Badges 11 → 20</h2>
      <div className="frtv pv-badges">
        {[22, 32, 40].map((size) => (
          <div key={size} className="pv-row">
            {Array.from({ length: 10 }, (_, i) => 11 + i).map((lvl) => (
              <LevelBadge key={lvl} info={computeLevel(2001 + (lvl - 10) * 250 + 10)!} size={size} />
            ))}
          </div>
        ))}
      </div>

      <h2>Bloc A · forme sous chaque joueur (392 px)</h2>
      <div className="pv-grid">
        <Frame label="Classé FRTV" id="strip" width={392}>
          <PlayerStrip store={store} nickname="Kyojin" extended={false} />
        </Frame>
        <Frame label="Non classé" width={392}>
          <PlayerStrip store={store} nickname="ScreaM" extended={false} />
        </Frame>
        <Frame label="Remplaçant" width={392}>
          <PlayerStrip store={store} nickname="shox" extended={false} />
        </Frame>
        <Frame label="Chargement" width={392}>
          <PlayerStrip store={store} nickname="Lezard_du_Nord_1" extended={false} />
        </Frame>
        <Frame label="Aucun match récent" width={392}>
          <PlayerStrip store={store} nickname="gim44" extended={false} />
        </Frame>
        <Frame label="Étendu · classé" id="strip-ext-ranked" width={392}>
          <PlayerStrip store={extendedStore} nickname="Kyojin" extended />
        </Frame>
        <Frame label="Étendu · non classé" id="strip-ext" width={392}>
          <PlayerStrip store={extendedStore} nickname="ScreaM" extended />
        </Frame>
      </div>

      <h2>Bloc C · carte d'analyse (400 px)</h2>
      <div className="pv-grid">
        <Frame label="Ligue (onglet mémorisé)" id="card-league" width={400}>
          <RoomCard store={store} onRetry={() => undefined} />
        </Frame>
        <Frame label="Matchmaking" id="card-mm" width={400}>
          <RoomCard store={mmStore} onRetry={() => undefined} />
        </Frame>
        <Frame label="Chargement" width={400}>
          <RoomCard store={loadingStore} onRetry={() => undefined} />
        </Frame>
        <Frame label="Erreur" width={400}>
          <RoomCard store={errorStore} onRetry={() => undefined} />
        </Frame>
        <Frame label="Aucune donnée" width={400}>
          <RoomCard store={emptyStore} onRetry={() => undefined} />
        </Frame>
      </div>

      <h2>Bloc D · suivi de niveau (340 × 88)</h2>
      <div className="pv-grid pv-season">
        <Frame label="Kyojin · 3 500 Elo" id="tracker">
          <LevelTracker info={computeLevel(3500)!} />
        </Frame>
        <Frame label="Niveau max · 4 856 Elo">
          <LevelTracker info={computeLevel(4856)!} />
        </Frame>
        <Frame label="Niveau 10 · 2 120 Elo">
          <LevelTracker info={computeLevel(2120, 10)!} />
        </Frame>
      </div>

      <h2>Bloc F · carte Scène FR (1074 × 116)</h2>
      <div className="pv-stack">
        <Frame label="Joueur classé" id="pcard" width={1074}>
          <ProfileFrtvCard store={profileStore('ranked')} nickname="Kyojin" />
        </Frame>
        <Frame label="Non classé, équipe classée" width={1074}>
          <ProfileFrtvCard store={profileStore('team')} nickname="ScreaM" />
        </Frame>
        <Frame label="Non classé" width={1074}>
          <ProfileFrtvCard store={profileStore('unranked')} nickname="Lezard_du_Nord_1" />
        </Frame>
      </div>

      <h2>Popup (380 px · données FRTV réelles)</h2>
      <div className="pv-popups">
        {(['today', 'elo', 'live', 'settings'] as const).map((t) => (
          <figure key={t} className="pv-frame pv-popup" data-pv={`popup-${t}`}>
            <Popup initialTab={t} />
          </figure>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Preview />);
