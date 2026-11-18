import { useState, type CSSProperties } from 'react';
import type { RoomState } from '../../features/state';
import type { FaceitPlayer, FaceitTeam } from '../../lib/faceit/api';
import { groupByParty } from '../../lib/faceit/party';
import { fmtInt } from '../../lib/format';
import { capToFaceit, computeLevel } from '../../lib/levels';
import type { Settings } from '../../lib/settings';
import { useStore, type Store } from '../../lib/store';
import { Flag } from '../Flag';
import { LevelBadge } from '../LevelBadge';
import { Wordmark } from '../Wordmark';
import { PlayerStrip } from './PlayerStrip';

const FRTV = 'https://frtv.fr';
/** Couleurs des groupes (ni vert ni rouge, réservés aux victoires / défaites). */
const PARTY_COLORS = ['#FF6A17', '#9569DC', '#4A9EFF'];

/**
 * Colonne de joueurs de la maquette « Salle de match » : remplace la colonne FACEIT quand
 * le match est terminé ou programmé. Pour chaque joueur, une carte de 72 px (avatar 48 px,
 * drapeau, pseudo, Elo, badge, lien FRTV) puis la fiche FRTV à 8 px, 12 px avant le suivant.
 */
export function RosterColumn({ store, side, settings }: { store: Store<RoomState>; side: 0 | 1; settings: Settings }) {
  const faceit = useStore(store, (s) => s.faceit);
  const countries = useStore(store, (s) => s.countries);
  const frtvPlayers = useStore(store, (s) => s.frtvPlayers);
  if (faceit.status !== 'ready') return null;
  const team = faceit.data.teams[side] as FaceitTeam | undefined;
  if (!team) return null;

  const block = (p: FaceitPlayer) => {
    const key = p.nickname.toLowerCase();
    return <PlayerBlock key={p.nickname} player={p} country={countries[key]} frtvId={frtvPlayers[key]} store={store} settings={settings} />;
  };

  // Matchmaking : les joueurs qui ont lancé la partie ensemble sont regroupés et reliés.
  const matchmaking = (faceit.data.entityType ?? '').toLowerCase() !== 'championship';
  const segments = groupByParty(team.roster);
  let colorIndex = 0;

  return (
    <div className={`frtv-rcol${matchmaking ? ' frtv-rcol--parties' : ''}`}>
      <div className="frtv-rcol__title">Joueurs</div>
      {segments.map((seg, i) => {
        if (!matchmaking || seg.players.length < 2) return seg.players.map(block);
        const color = PARTY_COLORS[colorIndex++ % PARTY_COLORS.length];
        const label = `Ont lancé la partie ensemble (groupe de ${seg.players.length})`;
        return (
          <div key={seg.partyId ?? i} className="frtv-party" style={{ '--party': color } as CSSProperties} title={label}>
            <span className="frtv-party__line" aria-hidden="true" />
            <span className="frtv-party__size" aria-label={label}>
              {seg.players.length}
            </span>
            {seg.players.map(block)}
          </div>
        );
      })}
      {team.substitutes.length > 0 && (
        <>
          <div className="frtv-rcol__title frtv-rcol__title--subs">Remplaçants</div>
          {team.substitutes.map(block)}
        </>
      )}
    </div>
  );
}

function PlayerBlock({
  player,
  country,
  frtvId,
  store,
  settings,
}: {
  player: FaceitPlayer;
  country: string | undefined;
  frtvId: string | undefined;
  store: Store<RoomState>;
  settings: Settings;
}) {
  const computed = computeLevel(player.elo, player.skillLevel);
  const level = computed && !settings.customLevels ? capToFaceit(computed) : computed;
  const challenger = player.regionalRank !== null && player.regionalRank <= 1000 && (level?.level ?? 0) >= 10;

  return (
    <div className="frtv-pblock">
      <div className="frtv-pc">
        <a className="frtv-pc__main" href={`/fr/players/${encodeURIComponent(player.nickname)}`} title={`Profil FACEIT de ${player.nickname}`}>
          <Avatar src={player.avatar} nickname={player.nickname} />
          <span className="frtv-pc__name">
            {country && <Flag code={country} />}
            <span className="frtv-pc__nick">{player.nickname}</span>
          </span>
        </a>
        {player.elo !== null && <span className="frtv-pc__elo">{fmtInt(player.elo)}</span>}
        {challenger ? (
          <span className="frtv-pc__chal" title="Rang Challenger">
            #{player.regionalRank}
          </span>
        ) : (
          level && <LevelBadge info={level} size={32} />
        )}
        {frtvId && (
          <a
            className="frtv-pc__frtv"
            href={`${FRTV}/player/${encodeURIComponent(frtvId)}`}
            target="_blank"
            rel="noreferrer"
            title={`Voir ${player.nickname} sur FRTV`}
            aria-label={`Voir ${player.nickname} sur FRTV`}
          >
            <Wordmark height={9} />
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      <PlayerStrip store={store} nickname={player.nickname} extended />
    </div>
  );
}

function Avatar({ src, nickname }: { src: string | null; nickname: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className="frtv-pc__avatar frtv-pc__avatar--init">{nickname.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase()}</span>;
  }
  return <img className="frtv-pc__avatar" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
}
