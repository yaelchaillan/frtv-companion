import { defineConfig } from 'vitest/config';

// Lancer les tests avec `npm test` (voir scripts/test.mjs pour le contournement Windows).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
