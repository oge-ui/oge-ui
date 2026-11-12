import { defineConfig } from 'vitest/config';
import { workspaceAliases } from '../../tools/vite/workspace-aliases.mjs';

export default defineConfig(() => ({
  resolve: { alias: workspaceAliases() },
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/server',
  test: {
    name: 'server',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/server',
      provider: 'v8' as const,
      // ratchet floor: measured level − 1, rounded down (docs/ARCHITECTURE.md
      // → Testing → coverage ratchet)
      thresholds: {
        statements: 97,
        branches: 95,
        functions: 95,
        lines: 98,
      },
    },
  },
}));
