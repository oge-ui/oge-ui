/// <reference types='vitest' />
import { join } from 'node:path';
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/charts',
  // This config only runs vitest; without an explicit tsconfig the plugin
  // probes for tsconfig.app.json and warns (the lib has tsconfig.spec.json).
  plugins: [
    angular({ tsconfig: join(__dirname, 'tsconfig.spec.json') }),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
  ],
  test: {
    name: 'charts',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: [
      '{src,export-image}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/charts',
      provider: 'v8' as const,
    },
  },
}));
