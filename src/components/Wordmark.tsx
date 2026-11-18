import { browser } from 'wxt/browser';

/** Wordmark FRTV (« frtv » + vague en dégradé), recadré sans le slogan. Ratio 786 × 320. */
export function Wordmark({ height, opacity = 1 }: { height: number; opacity?: number }) {
  return (
    <img
      className="frtv-wordmark"
      src={browser.runtime.getURL('/wordmark.png')}
      alt="FRTV"
      style={{ height, width: Math.round((height * 786) / 320), opacity }}
    />
  );
}
