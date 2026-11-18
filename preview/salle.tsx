/**
 * Réplique de la maquette « Salle de match » (Claude Design, 1440 px) : la page FACEIT est
 * simulée avec les mêmes repères que le vrai site (name="roster1|info|roster2",
 * aria-haspopup, Nickname__Name, EndSlotContainer, SkillIcon, RosterPlayerStatsV2…) et
 * nos blocs y sont insérés par le vrai code (injectRoomWidgets), avec les vraies marges.
 */
import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { injectRoomWidgets } from '../src/features/room';
import { WidgetManager } from '../src/lib/inject/widgets';
import { DEFAULT_SETTINGS } from '../src/lib/settings';
import { fmtInt } from '../src/lib/format';
import { roomStore } from './fixtures';
import './salle.css';

const params = new URLSearchParams(location.search);
const settings = { ...DEFAULT_SETTINGS, hideFaceitStats: params.get('compact') === null };
const repeek = params.get('repeek') !== '0';

interface MockPlayer {
  nick: string;
  elo: number;
  challenger?: number;
  repeek?: string;
}

const TEAM_A: MockPlayer[] = [
  { nick: 'Nivera-', elo: 3856, challenger: 361, repeek: '58 % V · 1,21 Rtg · 18/16/5 · 1,19 K/D · 85,3 ADR' },
  { nick: 'Kyojin', elo: 3500, repeek: '100 % V · 1,15 Rtg · 20/20/7 · 1,00 K/D · 57,1 ADR' },
  { nick: 'ScreaM', elo: 3210, repeek: '68 % V · 1,20 Rtg · 18/14/5 · 1,30 K/D · 89,5 ADR' },
  { nick: 'Maka_', elo: 3018, repeek: '55 % V · 1,06 Rtg · 16/16/4 · 1,02 K/D · 76,0 ADR' },
  { nick: 'ryZz', elo: 2805, repeek: '45 % V · 0,97 Rtg · 15/17/4 · 0,91 K/D · 70,3 ADR' },
];
const SUBS_A: MockPlayer[] = [{ nick: 'shox', elo: 3235 }];
const TEAM_B: MockPlayer[] = [
  { nick: 'HeMan_', elo: 3341, repeek: '70 % V · 1,16 Rtg · 15/15/4 · 1,02 K/D · 74,9 ADR' },
  { nick: 'Imperfect10n', elo: 3137, repeek: '50 % V · 1,04 Rtg · 19/19/7 · 1,00 K/D · 94,0 ADR' },
  { nick: 'fanatic997', elo: 3263, repeek: '50 % V · 0,95 Rtg · 15/17/6 · 0,85 K/D · 69,6 ADR' },
  { nick: 'Lezard_du_Nord_1', elo: 3071, repeek: '50 % V · 1,02 Rtg · 16/16/5 · 1,00 K/D · 73,0 ADR' },
  { nick: 'zeNNN', elo: 2998, repeek: '40 % V · 0,94 Rtg · 14/17/5 · 0,88 K/D · 68,2 ADR' },
];
const SUBS_B: MockPlayer[] = [{ nick: 'gim44', elo: 3454 }];

/** Carte joueur « FACEIT » simulée (structure et marges du vrai site : padding 12 px 0). */
function FaceitCard({ p }: { p: MockPlayer }) {
  return (
    <div aria-haspopup="dialog" className="styles__Holder-sc-mock" style={{ padding: '12px 0' }}>
      <div className="mk-card">
        <div className="ListContentPlayer__Holder-sc-mock mk-card__row">
          <span className="mk-avatar">{p.nick.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase()}</span>
          <span className="mk-name">
            <span className="mk-flag" />
            <span className="Nickname__Name-sc-mock">{p.nick}</span>
          </span>
          <span className="styles__EndSlotContainer-sc-mock mk-end">
            <span className="TextBlock__Holder-sc-mock">{fmtInt(p.elo)}</span>
            {p.challenger ? (
              <span className="mk-challenger">#{p.challenger}</span>
            ) : (
              <svg className="SkillIcon__StyledSvg-sc-mock" width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="13" fill="none" stroke="#ff5f1f" strokeWidth="3" />
                <text x="16" y="21" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">
                  10
                </text>
              </svg>
            )}
          </span>
        </div>
        {repeek && p.repeek && (
          <div className="mk-repeek">
            <span>Repeek · 20 derniers</span>
            <span>{p.repeek}</span>
          </div>
        )}
        <div className="RosterPlayerStatsV2__Container-sc-mock mk-faceitbox">
          <div className="mk-faceitbox__tabs">
            <span>Global</span>
            <span>20 derniers matchs</span>
          </div>
          <div className="mk-faceitbox__grid">
            <span>—<small>Matchs</small></span>
            <span>—<small>Ratio de victoires</small></span>
            <span>—<small>MDM / HS</small></span>
            <span>—<small>K/D / K/R moy.</small></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Roster({ name, players, subs }: { name: string; players: MockPlayer[]; subs: MockPlayer[] }) {
  return (
    <div {...{ name }} className="styles__Column-sc-mock">
      <div className="Roster__Wrapper-sc-mock mk-wrapper">
        <div className="Roster__Group-sc-mock mk-group">
          <span className="mk-title">Joueurs</span>
          {players.map((p) => (
            <FaceitCard key={p.nick} p={p} />
          ))}
        </div>
        <div className="Roster__Group-sc-mock mk-group">
          <span className="mk-title">Remplaçants</span>
          {subs.map((p) => (
            <FaceitCard key={p.nick} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Salle() {
  useEffect(() => {
    const widgets = new WidgetManager();
    const store = roomStore();
    injectRoomWidgets({ store, settings, widgets, keep: new Set(), onRetry: () => undefined });
    return () => widgets.clear();
  }, []);

  return (
    <div className="mk-page">
      <div className="mk-crumbs">
        <span className="mk-green">ESEA League</span>
        <span>/</span>
        <b>S59 EU Advanced Central - Regular Season</b>
        <span>/</span>
        <b>Groupe A</b>
        <span>/</span>
        <b>Manche 13</b>
        <span style={{ flex: 1 }} />
        <b>17 nov.</b>
      </div>
      <div className="mk-main">
        <div className="mk-header">
          <div className="mk-header__team mk-header__team--a">
            <div>
              <div className="mk-header__name">OldBoys</div>
              <div className="mk-header__sub">
                <b>3 513</b> Elo moyen · 9 966 matchs
              </div>
            </div>
            <span className="mk-header__logo">OB</span>
          </div>
          <div className="mk-header__vs">
            <span>VS</span>
            <b>mar. 17 nov., 20:00</b>
          </div>
          <div className="mk-header__team">
            <span className="mk-header__logo">R4</span>
            <div>
              <div className="mk-header__name">regnum4games</div>
              <div className="mk-header__sub">
                <b>3 227</b> Elo moyen · 22 672 matchs
              </div>
            </div>
          </div>
        </div>
        <div className="styles__Grid-sc-mock mk-grid">
          <Roster name="roster1" players={TEAM_A} subs={SUBS_A} />
          <div {...{ name: 'info' }} className="styles__Column-sc-mock">
            <div className="styles__Stack-sc-mock mk-stack">
              <div className="mk-title">Serveur</div>
              <div className="mk-box mk-server">
                <span className="mk-flag mk-flag--lg" />
                <b>Netherlands</b>
              </div>
              <div className="mk-upcoming">Match à venir</div>
              <div className="mk-box mk-resched">
                <b>Reprogrammer la proposition</b>
                <span>Prévu : mar., 17 nov. - 20:00</span>
              </div>
              <div data-repeek-widget="" className="mk-sponsor">
                Encart sponsorisé d'une autre extension (position imposée, sous notre carte)
              </div>
            </div>
          </div>
          <Roster name="roster2" players={TEAM_B} subs={SUBS_B} />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Salle />);
