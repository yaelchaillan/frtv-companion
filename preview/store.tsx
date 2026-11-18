/**
 * Visuels de la fiche Chrome Web Store (`npm run preview:ui` puis /store.html) :
 * 5 captures 1280 × 800, la petite vignette 440 × 280 et la grande 1400 × 560.
 * Composants réels, données fictives (preview/store-fixtures.ts) ; la popup affiche les
 * vraies données publiques FRTV.
 */
import type { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { LevelBadge } from '../src/components/LevelBadge';
import { LevelTracker } from '../src/components/native/LevelTracker';
import { MatchHeader } from '../src/components/native/MatchHeader';
import { ProfileFrtvCard } from '../src/components/native/ProfileFrtvCard';
import { RoomCard } from '../src/components/native/RoomCard';
import { RosterColumn } from '../src/components/native/RosterColumn';
import { App as Popup } from '../src/entrypoints/popup/App';
import { computeLevel } from '../src/lib/levels';
import { DEFAULT_SETTINGS } from '../src/lib/settings';
import type { Store } from '../src/lib/store';
import type { RoomState } from '../src/features/state';
import { createStore } from '../src/lib/store';
import '../src/entrypoints/popup/popup.css';
import { profileStore } from './fixtures';
import { leagueStore, matchmakingStore, rename } from './store-fixtures';
import './preview.css';
import './store.css';

const settings = DEFAULT_SETTINGS;
const noop = () => undefined;

function Slide({ id, kicker, title, sub, children, className = '' }: { id: string; kicker?: string; title: ReactNode; sub: string; children: ReactNode; className?: string }) {
  return (
    <section className={`st-slide ${className}`} data-shot={id}>
      <header className="st-head">
        <span className="st-kicker">{kicker ?? 'FRTV Companion'}</span>
        <h2 className="st-title">{title}</h2>
        <p className="st-sub">{sub}</p>
      </header>
      {children}
    </section>
  );
}

/** Salle complète : en-tête du match puis colonnes joueurs et carte d'analyse. */
function Room({ store, card = true }: { store: Store<RoomState>; card?: boolean }) {
  return (
    <div className="frtv st-room">
      <div className="st-room__header">
        <MatchHeader store={store} />
      </div>
      <div className="st-room__grid">
        <RosterColumn store={store} side={0} settings={settings} />
        <div className="st-room__info">{card && <RoomCard store={store} onRetry={noop} />}</div>
        <RosterColumn store={store} side={1} settings={settings} />
      </div>
    </div>
  );
}

function Wordmark({ height }: { height: number }) {
  return <img className="st-wordmark" src="/wordmark.png" alt="FRTV" style={{ height }} />;
}

function Store() {
  const league = leagueStore();
  const mm = matchmakingStore();
  const profile = createStore(rename(profileStore('ranked').get()));

  return (
    <div className="st">
      <Slide
        id="1-salle"
        title="La salle de match, version scène FR"
        sub="Équipes, Elo FRTV, forme de chaque joueur et comparatif lisible, directement dans FACEIT."
      >
        <div className="st-frame st-frame--room">
          <Room store={league} />
        </div>
      </Slide>

      <Slide
        id="2-analyse"
        title="Prévision, veto probable et maps"
        sub="Pour chaque match de ligue : chances de victoire, bans habituels, bilans par map et forme récente."
      >
        <div className="st-cards">
          {[0, 1, 2].map((i) => (
            <div key={i} className="frtv st-card" data-card={i}>
              <RoomCard store={league} onRetry={noop} />
            </div>
          ))}
        </div>
      </Slide>

      <Slide
        id="3-joueurs"
        title="Qui est en forme, qui joue ensemble"
        sub="5 derniers matchs, Elo sur 20 matchs, rating FRTV et groupes de matchmaking reliés d'un trait."
      >
        <div className="st-frame st-frame--mm">
          <Room store={mm} card={false} />
        </div>
      </Slide>

      <Slide id="4-niveaux" title="Niveaux 11 à 20" sub="Au-delà du niveau 10, un niveau FRTV tous les 250 Elo : dans la salle de match et sur les profils.">
        <div className="frtv st-levels">
          <div className="st-badges">
            {Array.from({ length: 10 }, (_, i) => 11 + i).map((lvl) => (
              <LevelBadge key={lvl} info={computeLevel(2001 + (lvl - 10) * 250 + 10)!} size={88} />
            ))}
          </div>
          <div className="st-trackers">
            <div className="st-season">
              <LevelTracker info={computeLevel(3420)!} />
            </div>
            <div className="st-season">
              <LevelTracker info={computeLevel(4620)!} />
            </div>
          </div>
          <div className="st-profile">
            <ProfileFrtvCard store={profile} nickname="Moustik" />
          </div>
        </div>
      </Slide>

      <Slide id="5-popup" title="La scène FR dans ta barre d'outils" sub="Toutes les séries FR du jour, le classement Elo FRTV et tes réglages, en un clic.">
        <div className="st-popups">
          {(['today', 'elo', 'settings'] as const).map((t) => (
            <div key={t} className="pv-popup st-popup">
              <Popup initialTab={t} />
            </div>
          ))}
        </div>
      </Slide>

      {/* Petite vignette 440 × 280 */}
      <section className="st-tile" data-shot="tile-440x280">
        <div className="st-tile__text">
          <Wordmark height={54} />
          <span className="st-tile__tag">Companion</span>
          <span className="st-tile__line">La scène CS2 FR, directement dans FACEIT</span>
        </div>
        <div className="frtv st-tile__badge">
          <LevelBadge info={computeLevel(3800)!} size={104} />
        </div>
      </section>

      {/* Grande vignette 1400 × 560 */}
      <section className="st-marquee" data-shot="marquee-1400x560">
        <div className="st-marquee__text">
          <Wordmark height={64} />
          <span className="st-tile__tag">Companion</span>
          <h2 className="st-marquee__title">La scène CS2 FR, directement dans FACEIT</h2>
          <p className="st-sub">Elo FRTV, veto probable, forme des joueurs et niveaux 11 à 20.</p>
        </div>
        <div className="st-marquee__shot">
          <Room store={league} />
        </div>
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Store />);
