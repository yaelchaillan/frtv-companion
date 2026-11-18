import { fmtInt, fmtPct } from '../../lib/format';
import { LEVEL_10_MIN_ELO, MAX_LEVEL, type LevelInfo } from '../../lib/levels';
import { LevelBadge } from '../LevelBadge';
import { Wordmark } from '../Wordmark';

/**
 * Bloc D, au centre de la carte « Season » du profil (340 × 88). On n'affiche pas l'Elo :
 * FACEIT le montre en grand juste à gauche. Niveau, distance au palier suivant, pourcentage.
 */
export function LevelTracker({ info }: { info: LevelInfo }) {
  const atMax = info.level >= MAX_LEVEL;
  const progress = Math.max(0.02, Math.min(1, info.progress ?? 0));
  const toNext = info.nextAt !== null && info.elo !== null ? info.nextAt - info.elo : null;

  let sub: string;
  if (atMax) {
    const floor = info.floor ?? LEVEL_10_MIN_ELO;
    sub = `${fmtInt((info.elo ?? floor) - floor)} Elo au-dessus du palier ${fmtInt(floor)}`;
  } else if (info.level === 10) {
    sub = toNext !== null ? `Encore ${fmtInt(toNext)} Elo avant le niveau 11 FRTV` : 'Prochain palier : niveau 11 FRTV';
  } else {
    sub = toNext !== null ? `Encore ${fmtInt(toNext)} Elo avant le niveau ${info.level + 1}` : '';
  }

  return (
    <div className="frtv-tracker" aria-label={`Niveau ${info.level}. ${sub}`}>
      <div className="frtv-tracker__top">
        <LevelBadge info={info} size={40} />
        <div className="frtv-tracker__col">
          <div className="frtv-tracker__title">
            Niveau {info.level}
            <Wordmark height={10} />
          </div>
          <div className="frtv-tracker__sub" title={sub}>
            {sub}
          </div>
        </div>
        {atMax ? (
          <span className="frtv-tracker__max">MAX</span>
        ) : (
          <span className="frtv-tracker__pct">{fmtPct(Math.floor((info.progress ?? 0) * 100) / 100)}</span>
        )}
      </div>
      <div className={`frtv-bar frtv-bar--track${atMax ? ' frtv-bar--max' : ''}`} aria-hidden="true">
        <span style={{ width: `${atMax ? 100 : Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}
