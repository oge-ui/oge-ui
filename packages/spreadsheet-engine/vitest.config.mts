import { defineConfig } from 'vitest/config';
import { workspaceAliases } from '../../tools/vite/workspace-aliases.mjs';

export default defineConfig(() => ({
  resolve: { alias: workspaceAliases() },
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/spreadsheet-engine',
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
