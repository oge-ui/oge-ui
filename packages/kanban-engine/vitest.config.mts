import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/kanban-engine',
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  test: {
    name: 'kanban-engine',
    watch: false,
    globals: true,
    // the pointer-gesture machine and the geometry readers touch the DOM
    // (document listeners, getBoundingClientRect), so the specs need one
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/kanban-engine',
      provider: 'v8' as const,
      // ratchet floor: measured level − 1, rounded down. Raise it when
      // coverage grows (docs/ARCHITECTURE.md → Testing → coverage ratchet)
      thresholds: {
        statements: 93,
        branches: 84,
        functions: 95,
        lines: 94,
      },
    },
  },
}));
