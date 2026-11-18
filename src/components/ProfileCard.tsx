import { fetchFaceitPlayer } from '../lib/faceit/api';
import { frtv, playerRatingIndex } from '../lib/frtv/service';
import { capToFaceit, computeLevel, MAX_LEVEL } from '../lib/levels';
import type { Settings } from '../lib/settings';
import { fmtDecimal, fmtInt, fmtRating } from './format';
import { LevelBadge } from './LevelBadge';
import { Section, Shell, Skeleton } from './Shell';
import { useAsync } from './useAsync';

/** Carte affichée sur un profil joueur FACEIT. */
export function ProfileCard({ nickname, settings }: { nickname: string; settings: Settings }) {
  const player = useAsync(() => fetchFaceitPlayer(nickname), [nickname]);
  const frtvData = useAsync(async () => {
    const [ratings, elo] = await Promise.all([playerRatingIndex(), frtv.eloRanking().catch(() => null)]);
    return { ratings, elo };
  }, []);

  return (
    <Shell title={nickname}>
      <Section title="Niveau">
        {player.status === 'loading' ? <Skeleton lines={2} /> : <LevelBlock player={player.status === 'ready' ? player.data : null} settings={settings} />}
      </Section>

      <Section title="Scène FRTV">
        {frtvData.status === 'loading' && <Skeleton lines={3} />}
        {frtvData.status === 'error' && <p className="frtv-error">FRTV est injoignable ({frtvData.error}).</p>}
        {frtvData.status === 'ready' && <FrtvBlock nickname={nickname} data={frtvData.data} />}
      </Section>
    </Shell>
  );
}

function LevelBlock({
  player,
  settings,
}: {
  player: Awaited<ReturnType<typeof fetchFaceitPlayer>>;
  settings: Settings;
}) {
  const computed = player ? computeLevel(player.elo, player.skillLevel) : null;
  if (!player || !computed) {
    return (
      <p className="frtv-note">
        Elo FACEIT non lu. Active le mode debug dans la popup pour voir la réponse brute dans la console.
      </p>
    );
  }
  const level = settings.customLevels ? computed : capToFaceit(computed);
  const toNext = level.nextAt !== null && level.elo !== null ? level.nextAt - level.elo : null;

  return (
    <>
      <div className="frtv-level-hero">
        <LevelBadge info={level} size={54} />
        <div>
          <div className="frtv-level-hero__label">
            Niveau {level.level}
            {level.isCustom ? ' FRTV' : ''}
          </div>
          <div className="frtv-small">{level.elo !== null ? `${fmtInt(level.elo)} Elo FACEIT` : 'Elo inconnu'}</div>
        </div>
      </div>
      {level.progress !== null && (
        <>
          <div className="frtv-progress" aria-hidden="true">
            <span style={{ width: `${Math.round(level.progress * 100)}%` }} />
          </div>
          <p className="frtv-small" style={{ margin: '6px 0 0' }}>
            {level.level >= MAX_LEVEL && settings.customLevels
              ? 'Niveau maximum atteint.'
              : toNext !== null
                ? `Encore ${fmtInt(toNext)} Elo avant le niveau ${level.level + 1}.`
                : 'Niveaux 11+ désactivés dans les réglages.'}
          </p>
        </>
      )}
    </>
  );
}

function FrtvBlock({
  nickname,
  data,
}: {
  nickname: string;
  data: {
    ratings: Awaited<ReturnType<typeof playerRatingIndex>>;
    elo: Awaited<ReturnType<typeof frtv.eloRanking>> | null;
  };
}) {
  const row = data.ratings.byNickname.get(nickname.toLowerCase());
  if (!row) {
    const rule =
      data.ratings.minMaps && data.ratings.periodMonths
        ? ` Il faut ${data.ratings.minMaps} maps sur ${data.ratings.periodMonths} mois dans les compétitions suivies.`
        : '';
    return <p className="frtv-note">Pas (encore) classé au rating FRTV.{rule}</p>;
  }

  const team = row.team ? data.elo?.ranking.find((t) => t.teamId === row.team?._id) : undefined;
  return (
    <>
      <div className="frtv-row">
        <span>
          Rating FRTV <strong>{fmtRating(row.avgRating)}</strong>
        </span>
        <span className="frtv-small">
          #{row.rank} · {row.maps} maps{data.ratings.periodMonths ? ` · ${data.ratings.periodMonths} mois` : ''}
        </span>
      </div>
      <div className="frtv-stats">
        <Stat label="K/D" value={typeof row.kd === 'number' ? fmtRating(row.kd) : '—'} />
        <Stat label="ADR" value={typeof row.adr === 'number' ? fmtDecimal(row.adr) : '—'} />
        <Stat label="KAST" value={typeof row.kast === 'number' ? `${fmtDecimal(row.kast)} %` : '—'} />
        <Stat label="Maps" value={String(row.maps)} />
      </div>
      {row.team && (
        <div className="frtv-row" style={{ marginTop: 8 }}>
          <span className="frtv-row__label">Équipe : {row.team.team_name}</span>
          {team && (
            <span className="frtv-small">
              #{team.rank} · {fmtInt(team.rating)} Elo FRTV
            </span>
          )}
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="frtv-stat">
      <div className="frtv-stat__value">{value}</div>
      <div className="frtv-stat__label">{label}</div>
    </div>
  );
}
