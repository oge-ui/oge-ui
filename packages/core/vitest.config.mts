import { defineConfig } from 'vitest/config';
import { workspaceAliases } from '../../tools/vite/workspace-aliases.mjs';

export default defineConfig(() => ({
  resolve: { alias: workspaceAliases() },
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/core',
  test: {
    name: 'core',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    // the perf specs scale their time budgets under coverage instrumentation
    env: {
      OGE_COVERAGE: process.argv.some((arg) => arg.startsWith('--coverage'))
        ? '1'
        : '',
    },
    coverage: {
      reportsDirectory: '../../coverage/packages/core',
      provider: 'v8' as const,
      // ratchet floor: measured level − 1, rounded down. Raise it when
      // coverage grows (docs/ARCHITECTURE.md → Testing → coverage ratchet)
      thresholds: {
        statements: 89,
        branches: 82,
        functions: 92,
        lines: 91,
      },
    },
  },
}));
