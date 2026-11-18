import type { ReactElement } from 'react';
import type { ProfileState, TeamSnapshot } from '../../features/state';
import type { ProfileTeam } from '../../lib/faceit/dom';
import { faceitRoomUrl } from '../../lib/faceit/route';
import { winProbability } from '../../lib/frtv/analysis';
import type { PlayerRatingIndex } from '../../lib/frtv/service';
import type { FrtvEloRanking, FrtvEloRow, FrtvPlayerRankRow } from '../../lib/frtv/types';
import { fmtDecimal, fmtInt, fmtPct, fmtRating, fmtRelativeDay, fmtSigned, fmtTier } from '../../lib/format';
import { useStore, type Store } from '../../lib/store';
import { TeamLogo } from '../Shell';
import { Wordmark } from '../Wordmark';

const FRTV = 'https://frtv.fr';

/**
 * Bloc F, sous la carte « Season » du profil (1074 × 116), en trois variantes :
 * joueur classé, joueur non classé, joueur non classé dont l'équipe est classée.
 */
export function ProfileFrtvCard({ store, nickname }: { store: Store<ProfileState>; nickname: string }) {
  const frtv = useStore(store, (s) => s.frtv);
  const team = useStore(store, (s) => s.team);
  const teamData = useStore(store, (s) => s.teamData);

  let subtitle = 'Rating FRTV 2.0 · 3 mois · compétitions suivies';
  let row: ReactElement;

  if (frtv.status === 'loading') {
    row = <LoadingRow />;
  } else if (frtv.status === 'error') {
    row = (
      <div className="frtv-pcol">
        <span className="frtv-pval">FRTV injoignable</span>
        <span className="frtv-plbl">Les données de la scène FR ne répondent pas pour le moment.</span>
      </div>
    );
  } else {
    const { ratings, elo, season } = frtv.data;
    const player = ratings.byNickname.get(nickname.toLowerCase());
    const teamElo = team ? findTeamElo(elo, team.name) : null;
    if (player) {
      row = <RankedRow player={player} ratings={ratings} elo={elo} />;
    } else if (teamElo && team) {
      subtitle = `Elo FRTV des équipes${season ? ` · ESEA ${season}` : ''}`;
      row = <TeamRow team={team} teamElo={teamElo} data={teamData?.status === 'ready' ? teamData.data : null} ratings={ratings} />;
    } else {
      row = <UnrankedRow ratings={ratings} team={team} />;
    }
  }

  return (
    <section className="frtv-pcard" aria-label="Scène FR">
      <header className="frtv-pcard__head">
        <Wordmark height={14} />
        <span className="frtv-pcard__title">Scène FR</span>
        <span className="frtv-pcard__sub">{subtitle}</span>
        <span className="frtv-grow" />
        <span className="frtv-mention">Non affilié à FACEIT</span>
        <a className="frtv-link" href={FRTV} target="_blank" rel="noreferrer">
          frtv.fr ↗
        </a>
      </header>
      <div className="frtv-pcard__row">{row}</div>
    </section>
  );
}

export function findTeamElo(elo: FrtvEloRanking | null, name: string): FrtvEloRow | null {
  const key = name.trim().toLowerCase();
  return elo?.ranking.find((r) => r.name.trim().toLowerCase() === key) ?? null;
}

function teamLine(row: FrtvEloRow, withTier: boolean): string {
  const parts = [`#${row.rank} Elo FRTV`, fmtInt(row.rating), withTier ? fmtTier(row.currentTier) : null];
  if (row.isProvisional) parts.push('provisoire');
  return parts.filter(Boolean).join(' · ');
}

function TeamBlock({
  name,
  logo,
  eloRow,
  size = '36',
  withTier = true,
}: {
  name: string;
  logo: string | null;
  eloRow: FrtvEloRow | null;
  size?: '36' | '40';
  /** Division affichée ou non (retirée quand la place manque, à côté des stats du joueur). */
  withTier?: boolean;
}) {
  const delta = eloRow?.delta7d ?? 0;
  return (
    <div className="frtv-pteam">
      <TeamLogo src={logo} name={name} size={size} />
      <div className="frtv-pcol">
        <span className="frtv-pteam__name" title={name}>
          {name}
        </span>
        <span className="frtv-pteam__sub" title={eloRow ? teamLine(eloRow, true) : undefined}>
          {eloRow ? (
            <>
              {teamLine(eloRow, withTier)}
              {delta !== 0 && (
                <>
                  {' · '}
                  <b className={delta > 0 ? 'frtv-up' : 'frtv-down'}>{fmtSigned(delta)}</b> sur 7 j
                </>
              )}
            </>
          ) : (
            'Pas classée FRTV'
          )}
        </span>
      </div>
    </div>
  );
}

function RankedRow({ player, ratings, elo }: { player: FrtvPlayerRankRow; ratings: PlayerRatingIndex; elo: FrtvEloRanking | null }) {
  const eloRow = player.team ? (elo?.ranking.find((t) => t.teamId === player.team?._id) ?? null) : null;
  return (
    <>
      <div className="frtv-pcol frtv-pcol--rank">
        <span className="frtv-hero">{fmtRating(player.avgRating)}</span>
        <div className="frtv-pcol">
          <span>
            <span className="frtv-rank frtv-rank--lg">#{player.rank}</span>
          </span>
          <span className="frtv-plbl">sur {fmtInt(ratings.total)} joueurs classés</span>
        </div>
      </div>
      <span className="frtv-vsep" />
      <div className="frtv-pstats">
        <Stat value={typeof player.kd === 'number' ? fmtRating(player.kd) : '—'} label="K/D" />
        <Stat value={typeof player.adr === 'number' ? fmtDecimal(player.adr) : '—'} label="ADR" />
        <Stat value={typeof player.kast === 'number' ? fmtPct(player.kast / 100) : '—'} label="KAST" />
        <Stat value={fmtInt(player.maps)} label="Maps" />
      </div>
      {player.team && (
        <>
          <span className="frtv-vsep" />
          <TeamBlock name={player.team.team_name} logo={player.team.team_logo ?? null} eloRow={eloRow} withTier={false} />
        </>
      )}
      <span className="frtv-pactions">
        <a className="frtv-btn" href={`${FRTV}/player/${encodeURIComponent(player.playerId)}`} target="_blank" rel="noreferrer">
          Fiche joueur ↗
        </a>
      </span>
    </>
  );
}

function UnrankedRow({ ratings, team }: { ratings: PlayerRatingIndex; team: ProfileTeam | null }) {
  const rule = `${ratings.minMaps ?? 20} maps sur ${ratings.periodMonths ?? 3} mois requises`;
  return (
    <>
      <div className="frtv-pcol">
        <span className="frtv-pval">Pas encore classé</span>
        <span className="frtv-plbl">{rule}</span>
      </div>
      {team && (
        <>
          <span className="frtv-vsep" />
          <TeamBlock name={team.name} logo={null} eloRow={null} />
        </>
      )}
      <span className="frtv-vsep" />
      <p className="frtv-pnote">Le rating se calcule sur 3 mois dans les ligues ESEA suivies. Les matchmakings ne comptent pas.</p>
      <span className="frtv-pactions">
        <a className="frtv-link" href={`${FRTV}/classement-joueurs`} target="_blank" rel="noreferrer">
          Classement joueurs ↗
        </a>
        <a className="frtv-btn" href={`${FRTV}/recruitment`} target="_blank" rel="noreferrer">
          Hub recrutement ↗
        </a>
      </span>
    </>
  );
}

function TeamRow({ team, teamElo, data, ratings }: { team: ProfileTeam; teamElo: FrtvEloRow; data: TeamSnapshot | null; ratings: PlayerRatingIndex }) {
  const next = data?.next ?? null;
  const opponent = next
    ? [next.match_series_teams?.team1?.id, next.match_series_teams?.team2?.id].find((t) => t && t._id !== teamElo.teamId)
    : undefined;
  const probability = data?.nextOpponentElo ? winProbability(teamElo.rating, data.nextOpponentElo.rating) : null;
  const form = [...(data?.form ?? [])].reverse();
  const delta = teamElo.delta7d ?? 0;

  return (
    <>
      <div className="frtv-pteam">
        <TeamLogo src={teamElo.logo ?? null} name={team.name} size="40" />
        <div className="frtv-pcol">
          <span className="frtv-pteam__name frtv-pteam__name--lg" title={team.name}>
            {team.name}
          </span>
          <span className="frtv-pteam__sub">
            {[fmtTier(teamElo.currentTier), team.members ? `${team.members} membres` : null].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
      <span className="frtv-vsep" />
      <div className="frtv-pcol">
        <span className="frtv-pval">
          <span className="frtv-rank frtv-rank--lg">#{teamElo.rank}</span> {fmtInt(teamElo.rating)}
        </span>
        <span className="frtv-plbl">Elo FRTV</span>
      </div>
      <div className="frtv-pcol">
        <span className={`frtv-pval ${delta > 0 ? 'frtv-up' : delta < 0 ? 'frtv-down' : 'frtv-flat'}`}>{delta === 0 ? '=' : fmtSigned(delta)}</span>
        <span className="frtv-plbl">7 jours</span>
      </div>
      <div className="frtv-pcol">
        <span className="frtv-form">
          {form.length ? (
            form.map((r, i) => (
              <span key={i} className={`frtv-sq frtv-sq--${r}`}>
                {r}
              </span>
            ))
          ) : (
            <span className="frtv-plbl">—</span>
          )}
        </span>
        <span className="frtv-plbl">Forme · 5 dernières séries</span>
      </div>
      {next && (
        <>
          <span className="frtv-vsep" />
          <div className="frtv-pcol">
            <span className="frtv-pteam__name">
              {fmtRelativeDay(next.match_series_dates?.scheduled ?? '')} · {opponent?.team_name ?? 'À définir'}
            </span>
            <span className="frtv-pteam__sub">
              {probability !== null
                ? `${probability >= 0.5 ? 'favoris' : 'outsiders'} à ${fmtPct(Math.max(probability, 1 - probability))} selon l'Elo FRTV`
                : next.match_series_competition_id?.event_name ?? 'Prochain match'}
            </span>
          </div>
        </>
      )}
      <span className="frtv-pactions">
        <span className="frtv-plbl" title={`Rating FRTV : ${ratings.minMaps ?? 20} maps requises sur ${ratings.periodMonths ?? 3} mois`}>
          Joueur non classé
        </span>
        {next?.match_series_faceit_id && (
          <a className="frtv-btn" href={faceitRoomUrl(next.match_series_faceit_id)} target="_blank" rel="noreferrer">
            Salle du match ↗
          </a>
        )}
      </span>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="frtv-pstat">
      <div className="frtv-pstat__v">{value}</div>
      <div className="frtv-pstat__l">{label}</div>
    </div>
  );
}

function LoadingRow() {
  return (
    <>
      <span className="frtv-skel" style={{ width: 120, height: 40 }} />
      <span className="frtv-vsep" />
      <span className="frtv-skel" style={{ width: 300, height: 32 }} />
      <span className="frtv-vsep" />
      <span className="frtv-skel" style={{ width: 200, height: 32 }} />
    </>
  );
}
