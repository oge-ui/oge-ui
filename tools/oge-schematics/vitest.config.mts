/// <reference types='vitest' />
import { defineConfig } from 'vite';

// Plain Node code (no Angular compilation): the schematic runs inside the
// Angular CLI, so it is tested through `SchematicTestRunner` in a node env.
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/tools/oge-schematics',
  test: {
    name: 'oge-schematics',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/tools/oge-schematics',
      provider: 'v8' as const,
    },
  },
}));
