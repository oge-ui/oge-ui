import { defineConfig } from 'vitest/config';
import { workspaceAliases } from '../../tools/vite/workspace-aliases.mjs';

export default defineConfig(() => ({
  resolve: { alias: workspaceAliases() },
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/bpmn-engine',
  test: {
    name: 'bpmn-engine',
    watch: false,
    globals: true,
    // the XML reader parses with the platform DOMParser, and the editor core
    // drives real document listeners — jsdom supplies both
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/bpmn-engine',
      provider: 'v8' as const,
      // ratchet floor: measured level − 1, rounded down. Raise it when
      // coverage grows (docs/ARCHITECTURE.md → Testing → coverage ratchet)
      thresholds: {
        statements: 71,
        branches: 65,
        functions: 74,
        lines: 72,
      },
    },
  },
}));
