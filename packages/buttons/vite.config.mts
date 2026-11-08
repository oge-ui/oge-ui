/// <reference types='vitest' />
import { join } from 'node:path';
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { workspaceAliases } from '../../tools/vite/workspace-aliases.mjs';

export default defineConfig(() => ({
  resolve: { alias: workspaceAliases() },
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/buttons',
  // This config only runs vitest; without an explicit tsconfig the plugin
  // probes for tsconfig.app.json and warns (the lib has tsconfig.spec.json).
  plugins: [angular({ tsconfig: join(__dirname, 'tsconfig.spec.json') })],
  test: {
    name: 'buttons',
    watch: false,
    globals: true,
    environment: 'jsdom',
    // the primary entry plus every secondary entry point's sources
    include: ['{src,*/src}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules/**'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/buttons',
      provider: 'v8' as const,
      // ratchet floor: measured level − 1, rounded down. Raise it when
      // coverage grows (docs/ARCHITECTURE.md → Testing → coverage ratchet)
      thresholds: {
        statements: 93,
        branches: 86,
        functions: 90,
        lines: 96,
      },
    },
  },
}));
