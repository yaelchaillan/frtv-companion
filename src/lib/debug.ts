/** Journal de débogage, activable depuis la popup (Réglages → Mode debug). */
let enabled = false;

export function setDebug(value: boolean): void {
  enabled = value;
}

export function debugLog(label: string, ...data: unknown[]): void {
  if (enabled) console.info(`[FRTV] ${label}`, ...data);
}
