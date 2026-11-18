import { useState } from 'react';
import type { RoomState } from '../../features/state';
import type { FaceitMatch, FaceitTeam } from '../../lib/faceit/api';
import { groupByParty, partySummary } from '../../lib/faceit/party';
import { summarizeForm } from '../../lib/faceit/stats';
import { formatLabel, mapLabel } from '../../lib/frtv/analysis';
import type { TeamInsight } from '../../lib/frtv/service';
import { fmtDateTime, fmtDecimal, fmtInt, fmtPct, fmtRating } from '../../lib/format';
import { useStore, type Store } from '../../lib/store';
import { initials } from '../Shell';
import { Wordmark } from '../Wordmark';

/**
 * En-tête du match redessiné (remplace le bloc des équipes de FACEIT, sous la barre du fil
 * d'Ariane qui reste celle de FACEIT, sur l'image de la map) : équipes, Elo, liens FRTV et
 * FACEIT, score ou horaire, et comparatif lisible des deux équipes.
 */
export function MatchHeader({ store }: { store: Store<RoomState> }) {
  const faceit = useStore(store, (s) => s.faceit);
  const insight = useStore(store, (s) => s.insight);
  const stats = useStore(store, (s) => s.stats);
  if (faceit.status !== 'ready' || faceit.data.teams.length < 2) return null;
  const match = faceit.data;
  const [a, b] = match.teams as [FaceitTeam, FaceitTeam];
  const frtvTeams = insight.status === 'ready' && insight.data ? insight.data.teams : null;
  const frtvOf = (team: FaceitTeam) => frtvTeams?.find((t) => t.name.trim().toLowerCase() === team.name.trim().toLowerCase()) ?? null;
  const format = insight.status === 'ready' && insight.data ? formatLabel(insight.data.series.match_series_format) : null;

  const teamStats = (team: FaceitTeam) => {
    const forms = team.roster.flatMap((p) => {
      const s = stats[p.nickname.toLowerCase()];
      const f = s?.status === 'ready' ? summarizeForm(s.data) : null;
      return f ? [f] : [];
    });
    const avg = (pick: (f: (typeof forms)[number]) => number | null) => {
      const values = forms.map(pick).filter((v): v is number => v !== null);
      return values.length ? values.reduce((x, y) => x + y, 0) / values.length : null;
    };
    const elos = team.roster.map((p) => p.elo).filter((e): e is number => e !== null);
    return {
      elo: elos.length ? elos.reduce((x, y) => x + y, 0) / elos.length : null,
      winRate: avg((f) => f.winRate),
      kd: avg((f) => f.kd),
      adr: avg((f) => f.adr),
      hs: avg((f) => f.hsPct),
    };
  };
  const sa = teamStats(a);
  const sb = teamStats(b);

  return (
    <div className="frtv-mh">
      <div className="frtv-mh__teams">
        <TeamSide match={match} team={a} index={0} frtv={frtvOf(a)} />
        <div className="frtv-mh__center">
          <Center match={match} format={format} />
        </div>
        <TeamSide match={match} team={b} index={1} frtv={frtvOf(b)} />
      </div>
      <div className="frtv-mh__cmp" aria-label="Comparatif des équipes">
        <CompareRow label="Elo moyen" a={sa.elo} b={sb.elo} format={fmtInt} />
        <CompareRow label="Victoires · 20 derniers" a={sa.winRate} b={sb.winRate} format={fmtPct} />
        <CompareRow label="K/D" a={sa.kd} b={sb.kd} format={fmtRating} />
        <CompareRow label="ADR" a={sa.adr} b={sb.adr} format={fmtDecimal} />
        <CompareRow label="Headshots" a={sa.hs} b={sb.hs} format={fmtPct} />
      </div>
    </div>
  );
}

function Center({ match, format }: { match: FaceitMatch; format: string | null }) {
  const state = (match.state ?? '').toUpperCase();
  const map = match.map ? mapLabel(match.map) : null;
  if (match.score) {
    const [s1, s2] = match.score;
    const cls = (i: 0 | 1) => (match.winner === null ? '' : match.winner === i ? ' frtv-mh__n--win' : ' frtv-mh__n--lose');
    return (
      <>
        <div className="frtv-mh__score" aria-label={`Score ${s1} à ${s2}`}>
          <span className={`frtv-mh__n${cls(0)}`}>{s1}</span>
          <span className="frtv-mh__dash">:</span>
          <span className={`frtv-mh__n${cls(1)}`}>{s2}</span>
        </div>
        <div className="frtv-mh__status">{['Terminé', format, map].filter(Boolean).join(' · ')}</div>
      </>
    );
  }
  return (
    <>
      <div className="frtv-mh__vs">VS</div>
      <div className="frtv-mh__status">
        {state === 'CANCELLED' ? 'Annulé' : [fmtDateTime(match.scheduledAt?.toISOString()), format, map].filter(Boolean).join(' · ')}
      </div>
    </>
  );
}

function TeamSide({ match, team, index, frtv }: { match: FaceitMatch; team: FaceitTeam; index: 0 | 1; frtv: TeamInsight | null }) {
  const outcome = match.winner === null ? null : match.winner === index ? 'win' : 'loss';
  const isLeague = (match.entityType ?? '').toLowerCase() === 'championship';
  const frtvSlug = frtv ? (frtv.elo?.slug && frtv.elo.slug === frtv.name.toLowerCase() ? frtv.elo.slug : frtv.id) : null;

  return (
    <div className={`frtv-mh__team frtv-mh__team--${index === 0 ? 'a' : 'b'}`}>
      <Logo src={team.avatar} name={team.name} />
      <div className="frtv-mh__info">
        {outcome && <span className={`frtv-mh__outcome frtv-mh__outcome--${outcome}`}>{outcome === 'win' ? 'Victoire' : 'Défaite'}</span>}
        <span className="frtv-mh__name" title={team.name}>
          {team.name}
        </span>
        {(match.entityType ?? '').toLowerCase() !== 'championship' && partySummary(groupByParty(team.roster).map((s) => s.players.length)) && (
          <span className="frtv-mh__meta" title="Joueurs qui ont lancé la partie ensemble">
            {partySummary(groupByParty(team.roster).map((s) => s.players.length))}
          </span>
        )}
        {frtv?.elo ? (
          <span className="frtv-mh__meta">
            <span className="frtv-rank">#{frtv.elo.rank}</span> Elo FRTV <b>{fmtInt(frtv.elo.rating)}</b>
          </span>
        ) : frtv ? (
          <span className="frtv-mh__meta">Pas encore classée FRTV</span>
        ) : null}
        <span className="frtv-mh__links">
          {frtv && frtvSlug && (
            <a className="frtv-mh__btn frtv-mh__btn--frtv" href={`https://frtv.fr/team/${encodeURIComponent(frtvSlug)}`} target="_blank" rel="noreferrer">
              <Wordmark height={10} />
              Équipe ↗
            </a>
          )}
          {isLeague && team.id && (
            <a className="frtv-mh__btn" href={`/fr/teams/${encodeURIComponent(team.id)}`}>
              Page FACEIT ↗
            </a>
          )}
        </span>
      </div>
    </div>
  );
}

function Logo({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="frtv-mh__logo frtv-mh__logo--init">{initials(name)}</span>;
  return <img className="frtv-mh__logo" src={src} alt="" onError={() => setFailed(true)} />;
}

function CompareRow({ label, a, b, format }: { label: string; a: number | null; b: number | null; format: (v: number) => string }) {
  if (a === null && b === null) return null;
  const better = a !== null && b !== null && a !== b ? (a > b ? 0 : 1) : null;
  const cls = (i: 0 | 1) => (better === null ? '' : better === i ? ' frtv-mh__v--better' : ' frtv-mh__v--worse');
  return (
    <div className="frtv-mh__row">
      <span className={`frtv-mh__v frtv-mh__v--a${cls(0)}`}>{a === null ? '—' : format(a)}</span>
      <span className="frtv-mh__label">{label}</span>
      <span className={`frtv-mh__v${cls(1)}`}>{b === null ? '—' : format(b)}</span>
    </div>
  );
}
