/// <reference types='vitest' />
import { defineConfig } from 'vite';

// Plain Node code: the token converter and the plugin build.
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/tools/figma-tokens',
  test: {
    name: 'figma-tokens',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/tools/figma-tokens',
      provider: 'v8' as const,
      // ratchet floor: measured level − 1, rounded down
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
      },
    },
  },
}));
