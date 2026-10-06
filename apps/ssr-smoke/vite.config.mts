/// <reference types='vitest' />
import { join } from 'node:path';
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

/**
 * Server-render smoke specs for every Angular family (ARCHITECTURE → "SSR and
 * hydration"). A dedicated project rather than a spec per package because the
 * packages run vitest under jsdom with a TestBed setup file: there `window`
 * and `document` exist, so an unguarded browser global would pass. Here the
 * environment is plain Node — what `renderApplication` sees in a prerender
 * worker or an SSR server — and only the hydration round-trip spec opts into
 * jsdom, per file.
 */
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/ssr-smoke',
  plugins: [
    angular({ tsconfig: join(__dirname, 'tsconfig.spec.json') }),
    // the React specs and the React packages' sources are .tsx; the Angular
    // plugin owns every .ts file
    react({ include: /\.tsx$/ }),
    nxViteTsPaths(),
  ],
  test: {
    name: 'ssr-smoke',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    // every spec boots a whole platform and JIT-compiles a family's templates
    testTimeout: 30_000,
  },
}));
