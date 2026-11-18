import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { isFrtvRequest } from '../lib/frtv/client';
import { DEFAULT_TTL_MS, fetchFrtv } from '../lib/frtv/fetcher';

/**
 * Service d'arrière-plan : relaie les GET vers l'API FRTV (permission d'hôte frtv.fr,
 * pas de souci CORS) et met les réponses en cache.
 */
export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // N'accepte que les messages venant de cette extension.
    if (sender.id !== browser.runtime.id || !isFrtvRequest(message)) return undefined;

    fetchFrtv(message.path, message.ttlMs ?? DEFAULT_TTL_MS).then(
      (data) => sendResponse({ ok: true, data }),
      (error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
    );
    return true; // réponse asynchrone
  });
});
