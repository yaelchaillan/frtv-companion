import { useEffect, useState, type ReactNode } from 'react';
import { collapsedItem } from '../lib/settings';
import { Wordmark } from './Wordmark';

/** Cadre commun du panneau flottant : en-tête, corps défilant, pied de page, mode réduit. */
export function Shell({ title, children }: { title: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    void collapsedItem.getValue().then(setCollapsed);
    return collapsedItem.watch((value) => setCollapsed(Boolean(value)));
  }, []);

  const toggle = () => void collapsedItem.setValue(!collapsed);

  return (
    <div className="frtv frtv-dock">
      {collapsed ? (
        <button type="button" className="frtv-fab" onClick={toggle} title="Ouvrir FRTV Companion">
          <Wordmark height={13} />
          <span>Companion</span>
        </button>
      ) : (
        <section className="frtv-panel" aria-label="FRTV Companion">
          <header className="frtv-panel__head">
            <Wordmark height={14} />
            <span className="frtv-panel__title">{title}</span>
            <button type="button" className="frtv-icon-btn" onClick={toggle} aria-label="Réduire le panneau">
              –
            </button>
          </header>
          <div className="frtv-panel__body">{children}</div>
          <footer className="frtv-panel__foot">
            <a href="https://frtv.fr" target="_blank" rel="noreferrer">
              frtv.fr ↗
            </a>
            <span>Non affilié à FACEIT</span>
          </footer>
        </section>
      )}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="frtv-sec">
      <h3 className="frtv-sec__title">{title}</h3>
      {children}
    </section>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-busy="true" aria-label="Chargement">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="frtv-skeleton" style={{ width: `${90 - i * 17}%` }} />
      ))}
    </div>
  );
}

/** Deux initiales significatives : « French in Pyjamas » → « FP », « OldBoys » → « OL ». */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !/^(in|de|du|la|le|les|the|of|et)$/i.test(w));
  if (words.length >= 2) return `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`.toUpperCase();
  const word = words[0] ?? name;
  // « OldBoys » → OB (majuscule interne), « regnum4games » → R4 (premier chiffre).
  const inner = /^.[^A-Z]*([A-Z])/.exec(word)?.[1] ?? /\d/.exec(word.slice(1))?.[0];
  if (inner) return `${word[0]}${inner}`.toUpperCase();
  return word.slice(0, 2).toUpperCase();
}

type LogoSize = 'sm' | '20' | '28' | '36' | '40';

/** Logo d'équipe (CDN FACEIT) avec repli sur les initiales si absent ou en erreur. */
export function TeamLogo({
  src,
  name,
  small = false,
  size,
}: {
  src?: string | null;
  name: string;
  small?: boolean;
  size?: LogoSize;
}) {
  const [failed, setFailed] = useState(false);
  const variant = size ?? (small ? 'sm' : '20');
  const className = `frtv-logo-img${variant === '20' ? '' : ` frtv-logo-img--${variant}`}`;
  if (!src || failed) {
    return (
      <span className={className} aria-hidden="true">
        {variant === 'sm' ? initials(name).slice(0, 1) : initials(name)}
      </span>
    );
  }
  return <img className={className} src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
}
