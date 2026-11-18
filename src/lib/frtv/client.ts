import { browser } from 'wxt/browser';

/**
 * Côté pages (script de contenu, popup) : les appels FRTV passent par le service
 * d'arrière-plan, qui a la permission d'hôte frtv.fr et met les réponses en cache.
 */
export interface FrtvRequest {
  type: 'frtv:get';
  path: string;
  ttlMs?: number;
}

export type FrtvResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export function isFrtvRequest(message: unknown): message is FrtvRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as FrtvRequest).type === 'frtv:get' &&
    typeof (message as FrtvRequest).path === 'string'
  );
}

export async function frtvGet<T>(path: string, ttlMs?: number): Promise<T> {
  const request: FrtvRequest = { type: 'frtv:get', path, ttlMs };
  const response = (await browser.runtime.sendMessage(request)) as FrtvResponse<T> | undefined;
  if (!response) throw new Error('Pas de réponse du service FRTV');
  if (!response.ok) throw new Error(response.error);
  return response.data;
}
