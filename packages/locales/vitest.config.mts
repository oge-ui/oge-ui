import { defineConfig } from 'vitest/config';
import { workspaceAliases } from '../../tools/vite/workspace-aliases.mjs';

export default defineConfig(() => ({
  resolve: { alias: workspaceAliases() },
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/locales',
  test: {
    name: 'locales',
    watch: false,
    globals: true,
    // pure data and string checks — no DOM needed
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/locales',
      provider: 'v8' as const,
      // ratchet floor: measured level − 1, rounded down. Raise it when
      // coverage grows (docs/ARCHITECTURE.md → Testing → coverage ratchet)
      thresholds: {
        statements: 99,
        branches: 99,
        functions: 99,
        lines: 99,
      },
    },
  },
}));
