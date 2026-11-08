import { defineConfig } from 'vitest/config';
import { workspaceAliases } from '../../tools/vite/workspace-aliases.mjs';

export default defineConfig(() => ({
  resolve: { alias: workspaceAliases() },
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/behavior',
  test: {
    name: 'behavior',
    watch: false,
    globals: true,
    // unlike `core` (pure arithmetic, `node`), this package reads and writes the
    // DOM — focus order, computed styles, body scroll — so it needs a document
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/behavior',
      provider: 'v8' as const,
      // ratchet floor: measured level − 1, rounded down. Raise it when
      // coverage grows (docs/ARCHITECTURE.md → Testing → coverage ratchet)
      thresholds: {
        statements: 79,
        branches: 74,
        functions: 80,
        lines: 82,
      },
    },
  },
}));
