import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Aperçu de l'interface hors extension (`npm run preview:ui`).
 * - les API d'extension (`wxt/browser`, stockage) sont simulées ;
 * - l'API FRTV est réelle, relayée par le serveur Vite (pas de souci CORS) ;
 * - les données FACEIT sont simulées (voir preview/main.tsx).
 */
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: here('.'),
  publicDir: here('../public'),
  plugins: [react()],
  resolve: {
    alias: {
      'wxt/browser': here('./fake-browser.ts'),
      'wxt/utils/storage': here('./fake-storage.ts'),
    },
  },
  server: {
    port: 5190,
    strictPort: true,
    proxy: {
      '/frtv-api': {
        target: 'https://frtv.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/frtv-api/, ''),
      },
    },
  },
});
