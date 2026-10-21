import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/spreadsheet-engine',
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  test: {
    name: 'spreadsheet-engine',
    watch: false,
    globals: true,
    // no DOM on purpose: the engine runs in Web Workers and Node (ADR 0005),
    // so its specs run where a DOM global would be a ReferenceError
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/spreadsheet-engine',
      provider: 'v8' as const,
      // test helpers (fixture builder, Excel-capture readers) are not the engine
      exclude: ['src/testing/**', 'src/**/*.spec.ts'],
      // ratchet floor: measured level − 1, rounded down. Raise it when
      // coverage grows (docs/ARCHITECTURE.md → Testing → coverage ratchet)
      thresholds: {
        statements: 96,
        branches: 92,
        functions: 97,
        lines: 97,
      },
    },
  },
}));
