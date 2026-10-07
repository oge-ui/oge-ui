import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/charts-engine',
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  test: {
    name: 'charts-engine',
    watch: false,
    globals: true,
    // the kernel is arithmetic, but the gesture machine, the size observer and
    // the image exporter touch the DOM — so, like `behavior`, a document
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    // the perf specs scale their time budgets under coverage instrumentation
    env: {
      OGE_COVERAGE: process.argv.some((arg) => arg.startsWith('--coverage'))
        ? '1'
        : '',
    },
    coverage: {
      reportsDirectory: '../../coverage/packages/charts-engine',
      provider: 'v8' as const,
      // ratchet floor: measured level − 1, rounded down. Raise it when
      // coverage grows (docs/ARCHITECTURE.md → Testing → coverage ratchet)
      thresholds: {
        statements: 90,
        branches: 78,
        functions: 93,
        lines: 93,
      },
    },
  },
}));
