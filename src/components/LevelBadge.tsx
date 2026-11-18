import { useId } from 'react';
import type { LevelInfo } from '../lib/levels';

/**
 * Badge de niveau FRTV 11 à 20 : un écu (ni cercle comme FACEIT, ni hexagone), chiffre en
 * Barlow Condensed, quatre paliers de prestige et des crans qui situent le niveau dans son
 * palier. Les niveaux ≤ 10 (panneau de secours) gardent un simple cercle neutre.
 */
const SHIELD_OUTER = 'M16 1.5 L29.5 6 V16.5 C29.5 23.6 23.8 29 16 31 C8.2 29 2.5 23.6 2.5 16.5 V6 Z';
const SHIELD_INNER = 'M16 3.3 L27.9 7.2 V16.5 C27.9 22.6 23 27.4 16 29.3 C9 27.4 4.1 22.6 4.1 16.5 V7.2 Z';
const SHIELD_CORE = 'M16 5.1 L26.3 8.4 V16.5 C26.3 21.6 22.2 25.8 16 27.6 C9.8 25.8 5.7 21.6 5.7 16.5 V8.4 Z';

type Tier = 1 | 2 | 3 | 4;

export function badgeTier(level: number): Tier {
  if (level >= 20) return 4;
  if (level >= 17) return 3;
  if (level >= 14) return 2;
  return 1;
}

/** Nombre de crans (1 à 3) : position du niveau dans son palier de trois. */
export function badgeNotches(level: number): number {
  return level >= 20 ? 0 : ((level - 11) % 3) + 1;
}

// Direction CSS 160° convertie en coordonnées SVG (objectBoundingBox).
const DIAG = { x1: '0.33', y1: '0.03', x2: '0.67', y2: '0.97' };

export function LevelBadge({ info, size = 32 }: { info: LevelInfo; size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const level = info.level;

  if (!info.isCustom) {
    return (
      <span
        className="frtv-badge-std"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
        title={`Niveau ${level} FACEIT`}
        aria-label={`Niveau ${level} FACEIT`}
      >
        {level}
      </span>
    );
  }

  const tier = badgeTier(level);
  const notches = badgeNotches(level);
  const label = `Niveau ${level} FRTV`;
  const ids = { grad: `fg-${uid}`, veil: `fv-${uid}`, max: `fm-${uid}`, shadow: `fs-${uid}` };
  const notchWidth = notches * 3 + (notches - 1) * 2;
  const numberColor = tier === 1 ? '#f1f1f1' : '#ffffff';

  return (
    <svg
      className={`frtv-badge${tier === 4 ? ' frtv-badge--max' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={ids.grad} {...DIAG}>
          <stop offset="0" stopColor="#FF6A17" />
          <stop offset="1" stopColor="#FF3363" />
        </linearGradient>
        <linearGradient id={ids.max} {...DIAG}>
          <stop offset="0" stopColor="#9569DC" />
          <stop offset="1" stopColor="#FA356B" />
        </linearGradient>
        <linearGradient id={ids.veil} {...DIAG}>
          <stop offset="0" stopColor="#000" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>
        <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>

      {tier === 4 ? (
        <>
          <path d={SHIELD_OUTER} fill={`url(#${ids.max})`} />
          <path d={SHIELD_INNER} fill="#121212" />
          <path d={SHIELD_CORE} fill={`url(#${ids.max})`} />
        </>
      ) : (
        <>
          <path d={SHIELD_OUTER} fill={`url(#${ids.grad})`} />
          {tier === 1 && <path d={SHIELD_INNER} fill="#1a1a1a" />}
          {tier === 2 && (
            <>
              <path d={SHIELD_INNER} fill={`url(#${ids.grad})`} />
              <path d={SHIELD_INNER} fill="rgba(22,22,22,0.72)" />
            </>
          )}
          {tier === 3 && (
            <>
              <path d={SHIELD_INNER} fill={`url(#${ids.grad})`} />
              <path d={SHIELD_INNER} fill={`url(#${ids.veil})`} />
            </>
          )}
        </>
      )}

      <text
        x="16"
        y={tier === 4 ? 15 : 14}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Barlow Condensed', Geist, system-ui, sans-serif"
        fontWeight="700"
        fontSize="15"
        fill={numberColor}
        filter={tier >= 3 ? `url(#${ids.shadow})` : undefined}
      >
        {level}
      </text>

      {Array.from({ length: notches }, (_, i) => (
        <rect
          key={i}
          x={16 - notchWidth / 2 + i * 5}
          y="23"
          width="3"
          height="2"
          rx="1"
          fill={tier === 1 ? '#FF5A3C' : tier === 2 ? 'rgba(255,255,255,0.9)' : '#ffffff'}
        />
      ))}
    </svg>
  );
}
