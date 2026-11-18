import { defineConfig } from 'wxt';

// Configuration WXT : génère le manifest MV3 et gère le build Chrome / Firefox.
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  // Identifiant de build (horodatage) : permet de vérifier quelle version tourne dans la page.
  vite: () => ({
    define: { __FRTV_BUILD__: JSON.stringify(new Date().toISOString()) },
  }),
  manifest: {
    name: 'FRTV Companion',
    description:
      'La scène CS2 francophone sur FACEIT : Elo FRTV, veto, forme des équipes et niveaux 11+.',
    // Le badge FRTV doit rester clairement distinct de FACEIT (pas d'affiliation).
    homepage_url: 'https://frtv.fr',
    permissions: ['storage'],
    host_permissions: ['https://frtv.fr/*', 'https://www.faceit.com/*'],
    web_accessible_resources: [
      {
        // Polices et logo utilisés par l'interface injectée sur faceit.com.
        resources: ['fonts/*.woff2', 'logo-white.png', 'wordmark.png', 'flags/*.svg'],
        matches: ['https://www.faceit.com/*'],
      },
    ],
  },
});
