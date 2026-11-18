import { fetchFaceitMatch, fillMissingElo, type FaceitMatch, type FaceitPlayer } from '../lib/faceit/api';
import { formatLabel, mapLabel, seriesScore, type MapRecord, type Outcome } from '../lib/frtv/analysis';
import {
  buildMatchInsight,
  findSeriesByFaceitId,
  playerRatingIndex,
  type MatchInsight,
  type PlayerRatingIndex,
  type TeamInsight,
} from '../lib/frtv/service';
import { capToFaceit, computeLevel } from '../lib/levels';
import type { Settings } from '../lib/settings';
import { fmtDateTime, fmtInt, fmtPercent, fmtRating, fmtShortDate, fmtSigned, fmtTier } from './format';
import { LevelBadge } from './LevelBadge';
import { Section, Shell, Skeleton, TeamLogo } from './Shell';
import { useAsync, type AsyncState } from './useAsync';

const STATUS_LABEL: Record<string, string> = { Upcoming: 'À venir', Finished: 'Terminé', Ongoing: 'En cours' };

/** Panneau affiché dans une salle de match FACEIT. */
export function MatchPanel({ matchId, settings }: { matchId: string; settings: Settings }) {
  const faceit = useAsync(async () => {
    const match = await fetchFaceitMatch(matchId);
    const teams = await Promise.all(match.teams.map(async (t) => ({ ...t, roster: await fillMissingElo(t.roster) })));
    return { ...match, teams };
  }, [matchId]);
  const ratings = useAsync(() => playerRatingIndex(), []);

  return (
    <Shell title="Salle de match">
      {faceit.status === 'loading' ? (
        <Skeleton lines={4} />
      ) : (
        <FrtvInsightSection matchId={matchId} faceit={faceit.status === 'ready' ? faceit.data : null} />
      )}
      <PlayersSection faceit={faceit} ratings={ratings} settings={settings} />
    </Shell>
  );
}

/** Cherche la série FRTV correspondant à la salle puis affiche l'analyse. */
function FrtvInsightSection({ matchId, faceit }: { matchId: string; faceit: FaceitMatch | null }) {
  const insight = useAsync(async () => {
    const series = await findSeriesByFaceitId(matchId, {
      teamNames: faceit?.teams.map((t) => t.name),
      around: faceit?.scheduledAt,
    });
    return series ? buildMatchInsight(series) : null;
  }, [matchId]);

  if (insight.status === 'loading') return <Skeleton lines={5} />;
  if (insight.status === 'error') {
    return (
      <Section title="Données FRTV">
        <p className="frtv-error">FRTV est injoignable pour le moment ({insight.error}).</p>
      </Section>
    );
  }
  if (!insight.data) {
    return (
      <Section title="Données FRTV">
        <p className="frtv-note">
          Ce match n'est pas dans les compétitions suivies par FRTV (matchmaking ou ligue hors base).
        </p>
      </Section>
    );
  }
  return <Insight insight={insight.data} />;
}

export function Insight({ insight }: { insight: MatchInsight }) {
  const { series, teams, winProbability, h2h } = insight;
  const [a, b] = teams;
  const competition = series.match_series_competition_id?.event_name;
  const status = series.match_series_status ?? '';

  return (
    <>
      <section className="frtv-sec">
        <div className="frtv-meta">
          <span className={`frtv-pill${status === 'Upcoming' ? ' frtv-pill--live' : ''}`}>
            {STATUS_LABEL[status] ?? status}
          </span>
          {formatLabel(series.match_series_format) && <span>{formatLabel(series.match_series_format)}</span>}
          {fmtDateTime(series.match_series_dates?.scheduled) && <span>· {fmtDateTime(series.match_series_dates?.scheduled)}</span>}
        </div>
        {competition && <p className="frtv-small" style={{ margin: '4px 0 0' }}>{competition}</p>}

        <div className="frtv-duel">
          <TeamColumn team={a} />
          <span className="frtv-vs">VS</span>
          <TeamColumn team={b} right />
        </div>

        {winProbability !== null && (
          <div className="frtv-prob" aria-label={`Probabilité de victoire : ${a.name} ${fmtPercent(winProbability)}`}>
            <div className="frtv-prob__bar">
              <span className="frtv-prob__a" style={{ width: `${winProbability * 100}%` }} />
              <span className="frtv-prob__b" style={{ width: `${(1 - winProbability) * 100}%` }} />
            </div>
            <div className="frtv-prob__labels">
              <span>{fmtPercent(winProbability)}</span>
              <span className="frtv-prob__caption">Probabilité selon l'Elo FRTV</span>
              <span>{fmtPercent(1 - winProbability)}</span>
            </div>
          </div>
        )}
      </section>

      <Section title="Forme (5 derniers)">
        {teams.map((team) => (
          <div key={team.side} className="frtv-row">
            <span className="frtv-row__label">{team.name}</span>
            <FormChips form={team.form} />
          </div>
        ))}
      </Section>

      <Section title="Face-à-face">
        {h2h.series.length === 0 ? (
          <p className="frtv-note">Première confrontation dans les données FRTV.</p>
        ) : (
          <>
            <div className="frtv-h2h">
              {a.name} <strong>{h2h.winsA} – {h2h.winsB}</strong> {b.name}
            </div>
            {h2h.series.slice(0, 3).map((s) => {
              const score = seriesScore(s, a.id);
              return (
                <div key={s._id} className="frtv-row frtv-small">
                  <span>{fmtShortDate(s.match_series_dates?.scheduled)}</span>
                  <span className="frtv-tabular">{score ? `${score.mine} – ${score.theirs}` : '—'}</span>
                </div>
              );
            })}
          </>
        )}
      </Section>

      <Section title="Veto habituels">
        {teams.map((team) => (
          <VetoBlock key={team.side} team={team} />
        ))}
      </Section>

      <Section title="Maps jouées (20 derniers matchs)">
        <MapsTable a={a} b={b} />
      </Section>
    </>
  );
}

function TeamColumn({ team, right = false }: { team: TeamInsight; right?: boolean }) {
  const elo = team.elo;
  return (
    <div className={`frtv-team${right ? ' frtv-team--right' : ''}`}>
      <TeamLogo src={team.logo ?? elo?.logo} name={team.name} />
      <span className="frtv-team__name" title={team.name}>
        {team.name}
      </span>
      {elo ? (
        <>
          <span className="frtv-team__elo">
            {fmtInt(elo.rating)} <span className="frtv-team__sub">Elo FRTV</span>
          </span>
          <span className="frtv-team__sub">
            #{elo.rank}
            {typeof elo.delta7d === 'number' && elo.delta7d !== 0 && (
              <span className={elo.delta7d > 0 ? 'frtv-up' : 'frtv-down'}> · {fmtSigned(elo.delta7d)} sur 7 j</span>
            )}
            {fmtTier(elo.currentTier) && <> · {fmtTier(elo.currentTier)}</>}
            {elo.isProvisional && <> · provisoire</>}
          </span>
        </>
      ) : (
        <span className="frtv-team__sub">Pas classée FRTV</span>
      )}
    </div>
  );
}

export function FormChips({ form }: { form: Outcome[] }) {
  if (form.length === 0) return <span className="frtv-small">Aucun match</span>;
  const labels: Record<Outcome, string> = { V: 'Victoire', D: 'Défaite', N: 'Nul' };
  return (
    <span className="frtv-chips">
      {form.map((outcome, i) => (
        <span key={i} className={`frtv-chip frtv-chip--${outcome}`} title={labels[outcome]}>
          {outcome}
        </span>
      ))}
    </span>
  );
}

function VetoBlock({ team }: { team: TeamInsight }) {
  const { veto } = team;
  return (
    <div className="frtv-veto">
      <div className="frtv-veto__team">
        {team.name} <span className="frtv-small">· {veto.sample} veto analysés</span>
      </div>
      {veto.sample === 0 ? (
        <p className="frtv-note">Pas de veto connu.</p>
      ) : (
        <>
          <div className="frtv-veto__line">
            <span className="frtv-veto__kind">Bans</span>
            {veto.bans.slice(0, 3).map((m) => (
              <span key={m.map} className="frtv-tag frtv-tag--ban">
                {mapLabel(m.map)} ×{m.count}
              </span>
            ))}
            {veto.bans.length === 0 && <span className="frtv-small">—</span>}
          </div>
          <div className="frtv-veto__line">
            <span className="frtv-veto__kind">Picks</span>
            {veto.picks.slice(0, 3).map((m) => (
              <span key={m.map} className="frtv-tag frtv-tag--pick">
                {mapLabel(m.map)} ×{m.count}
              </span>
            ))}
            {veto.picks.length === 0 && <span className="frtv-small">—</span>}
          </div>
        </>
      )}
    </div>
  );
}

function MapsTable({ a, b }: { a: TeamInsight; b: TeamInsight }) {
  const byMap = new Map<string, { a?: MapRecord; b?: MapRecord }>();
  a.maps.forEach((r) => byMap.set(r.map, { ...byMap.get(r.map), a: r }));
  b.maps.forEach((r) => byMap.set(r.map, { ...byMap.get(r.map), b: r }));
  const rows = [...byMap.entries()]
    .sort(([, x], [, y]) => (y.a?.played ?? 0) + (y.b?.played ?? 0) - ((x.a?.played ?? 0) + (x.b?.played ?? 0)))
    .slice(0, 7);

  if (rows.length === 0) return <p className="frtv-note">Aucune map jouée dans l'historique FRTV.</p>;

  const rate = (r?: MapRecord) => (r && r.played > 0 ? r.won / r.played : null);
  const cell = (r: MapRecord | undefined, best: boolean) =>
    r ? (
      <span className={best ? 'frtv-best' : undefined}>
        {r.won}/{r.played} · {fmtPercent(r.won / r.played)}
      </span>
    ) : (
      <span className="frtv-small">—</span>
    );

  return (
    <table className="frtv-table">
      <thead>
        <tr>
          <th scope="col">Map</th>
          <th scope="col">{a.name}</th>
          <th scope="col">{b.name}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([map, rec]) => {
          const ra = rate(rec.a);
          const rb = rate(rec.b);
          return (
            <tr key={map}>
              <td>{mapLabel(map)}</td>
              <td>{cell(rec.a, ra !== null && rb !== null && ra > rb)}</td>
              <td>{cell(rec.b, ra !== null && rb !== null && rb > ra)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PlayersSection({
  faceit,
  ratings,
  settings,
}: {
  faceit: AsyncState<FaceitMatch>;
  ratings: AsyncState<PlayerRatingIndex>;
  settings: Settings;
}) {
  if (faceit.status === 'loading') return null;
  if (faceit.status === 'error' || faceit.data.teams.length === 0) {
    return (
      <Section title="Joueurs & niveaux">
        <p className="frtv-note">
          Les joueurs FACEIT n'ont pas pu être lus
          {faceit.status === 'error' ? ` (${faceit.error})` : ''}. Active le mode debug dans la popup pour voir la
          réponse brute dans la console.
        </p>
      </Section>
    );
  }

  const index = ratings.status === 'ready' ? ratings.data.byNickname : null;
  return (
    <Section title="Joueurs & niveaux">
      {faceit.data.teams.map((team) => {
        const elos = team.roster.map((p) => p.elo).filter((e): e is number => e !== null);
        const avg = elos.length ? elos.reduce((s, e) => s + e, 0) / elos.length : null;
        return (
          <div key={team.id ?? team.name} className="frtv-roster">
            <div className="frtv-roster__head">
              <span>{team.name}</span>
              {avg !== null && <span className="frtv-small">Elo moyen {fmtInt(avg)}</span>}
            </div>
            {team.roster.map((player) => (
              <PlayerRow key={player.id ?? player.nickname} player={player} index={index} settings={settings} />
            ))}
          </div>
        );
      })}
    </Section>
  );
}

function PlayerRow({
  player,
  index,
  settings,
}: {
  player: FaceitPlayer;
  index: Map<string, { avgRating: number; maps: number }> | null;
  settings: Settings;
}) {
  const computed = computeLevel(player.elo, player.skillLevel);
  const level = computed && !settings.customLevels ? capToFaceit(computed) : computed;
  const frtvRow = index?.get(player.nickname.toLowerCase());

  return (
    <div className="frtv-player">
      {level ? <LevelBadge info={level} size={24} /> : <span />}
      <span className="frtv-player__nick" title={player.nickname}>
        {player.nickname}
      </span>
      <span className="frtv-player__elo">{player.elo !== null ? fmtInt(player.elo) : '—'}</span>
      {frtvRow ? (
        <span
          className={`frtv-rating${frtvRow.avgRating >= 1.15 ? ' frtv-rating--hot' : ''}`}
          title={`Rating FRTV sur ${frtvRow.maps} maps`}
        >
          {fmtRating(frtvRow.avgRating)}
        </span>
      ) : (
        <span className="frtv-rating frtv-rating--none" title="Pas classé FRTV">
          –
        </span>
      )}
    </div>
  );
}
