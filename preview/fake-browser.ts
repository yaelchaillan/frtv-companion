/** Simulation minimale de `wxt/browser` pour l'aperçu : les appels FRTV passent par le proxy Vite. */
import { buildFrtvUrl } from '../src/lib/frtv/url';

async function sendMessage(message: { type?: string; path?: string }) {
  if (message?.type !== 'frtv:get' || typeof message.path !== 'string') return undefined;
  try {
    buildFrtvUrl(message.path); // mêmes règles que le vrai service d'arrière-plan
    const response = await fetch(`/frtv-api${message.path}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return { ok: false, error: `FRTV a répondu ${response.status}` };
    return { ok: true, data: await response.json() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export const browser = {
  runtime: {
    id: 'preview',
    getURL: (path: string) => path,
    sendMessage,
  },
};
