import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { startProfile } from '../../features/profile';
import { startRoom } from '../../features/room';
import { setDebug } from '../../lib/debug';
import { parseFaceitRoute, routeKey } from '../../lib/faceit/route';
import { getSettings, settingsItem } from '../../lib/settings';
import skinCss from '../../styles/faceit-skin.css?inline';

/**
 * Script injecté sur faceit.com (application monopage). À chaque changement d'URL, on
 * arrête l'intégration de la page précédente et on démarre celle de la nouvelle page :
 * salle de match (features/room) ou profil joueur (features/profile).
 */
export default defineContentScript({
  matches: ['https://www.faceit.com/*'],
  cssInjectionMode: 'manual', // le CSS est injecté dans chaque bloc (Shadow DOM)

  async main(ctx) {
    injectFonts();
    injectSkin();

    let current: { key: string; stop: () => void } | null = null;
    let token = 0;

    const render = async (href: string, force = false) => {
      const route = parseFaceitRoute(href);
      const key = routeKey(route);
      if (!force && current?.key === key) return;

      const mine = ++token;
      const settings = await getSettings();
      if (mine !== token) return; // navigation plus récente entre-temps
      setDebug(settings.debug);

      current?.stop();
      current = null;
      if (route.kind === 'room') current = { key, stop: startRoom(route.matchId, settings) };
      else if (route.kind === 'player') current = { key, stop: startProfile(route.nickname, settings) };
    };

    await render(location.href);
    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => void render(newUrl.href));

    // Réglages modifiés depuis la popup : on relance l'intégration avec les nouvelles options.
    const unwatch = settingsItem.watch(() => void render(location.href, true));

    ctx.onInvalidated(() => {
      unwatch();
      current?.stop();
      current = null;
    });
  },
});

/** Habillage de la salle de match : inactif tant que <html> n'a pas la classe frtv-skin-room. */
function injectSkin() {
  if (document.getElementById('frtv-companion-skin')) return;
  const style = document.createElement('style');
  style.id = 'frtv-companion-skin';
  style.textContent = skinCss;
  document.head.append(style);
}

/**
 * Barlow Condensed (chiffres des badges, rating héros) : un @font-face déclaré dans un
 * Shadow DOM n'est pas chargé par Chrome, on le déclare donc une fois dans la page.
 * Les fichiers sont locaux (web_accessible_resources) : aucune ressource distante.
 */
function injectFonts() {
  if (document.getElementById('frtv-companion-fonts')) return;
  const faces = [
    [500, browser.runtime.getURL('/fonts/barlow-condensed-500.woff2')],
    [600, browser.runtime.getURL('/fonts/barlow-condensed-600.woff2')],
    [700, browser.runtime.getURL('/fonts/barlow-condensed-700.woff2')],
  ] as const;
  const style = document.createElement('style');
  style.id = 'frtv-companion-fonts';
  style.textContent = faces
    .map(
      ([weight, url]) =>
        `@font-face{font-family:"Barlow Condensed";font-style:normal;font-weight:${weight};font-display:swap;src:url("${url}") format("woff2");}`,
    )
    .join('');
  document.head.append(style);
}
