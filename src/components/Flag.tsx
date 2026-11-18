import { useState } from 'react';
import { browser } from 'wxt/browser';

/** Codes FACEIT qui ne sont pas des codes ISO de drapeau. */
const ALIASES: Record<string, string> = { uk: 'gb', en: 'gb', el: 'gr' };

/**
 * Drapeau du pays d'un joueur (flag-icons, MIT), servi par l'extension : la page FACEIT
 * bloque les images distantes. Repli sur le code pays si le drapeau n'existe pas.
 */
export function Flag({ code }: { code: string }) {
  const [failed, setFailed] = useState(false);
  const lower = code.trim().toLowerCase();
  const iso = ALIASES[lower] ?? lower;
  if (failed || !/^[a-z]{2}$/.test(iso)) return <span className="frtv-pc__cc">{code.toUpperCase()}</span>;
  const url = (browser.runtime.getURL as (path: string) => string)(`/flags/${iso}.svg`);
  return <img className="frtv-flag" src={url} alt={code.toUpperCase()} title={code.toUpperCase()} onError={() => setFailed(true)} />;
}
