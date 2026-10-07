import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { ogeDualTypes } from '../../../tools/react-package/dual-types.mjs';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

/**
 * ng-packagr assembles the Angular packages' npm payload (README, LICENSE and
 * the `assets: ["llms.txt"]` entry); Vite lib mode emits only the JS/CSS/d.ts,
 * so this package has to carry its own equivalent — without it the published
 * tarball has no README and no AI-facing docs.
 */
const publishAssets = (outDir: string): Plugin => ({
  name: 'oge:publish-assets',
  closeBundle() {
    for (const file of ['README.md', 'LICENSE', 'llms.txt']) {
      copyFileSync(join(__dirname, file), join(__dirname, outDir, file));
    }
  },
});

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/packages/react/tree-list',
  plugins: [
    react(),
    nxViteTsPaths(),
    publishAssets('../../../dist/packages/react/tree-list'),
    dts({
      entryRoot: 'src',
      tsconfigPath: `${__dirname}/tsconfig.lib.json`,
      // Without this the workspace tsconfig `paths` are inlined into the
      // emitted declarations, so `@oge-ui/behavior` would ship as a relative
      // path into this repo's sources and break the moment it is installed.
      aliasesExclude: [/^@oge-ui\//],
      // explicit `.js` specifiers + a `.d.cts` twin for the `require` condition
      afterBuild: ogeDualTypes,
    }),
  ],
  build: {
    outDir: '../../../dist/packages/react/tree-list',
    emptyOutDir: true,
    reportCompressedSize: true,
    lib: {
      // Separate entries on purpose: the JS never imports the stylesheet (a
      // consumer rendering on the server is not forced to resolve it), and
      // `exceljs` / `jspdf` are optional peers that only the `export-excel`
      // / `export-pdf` entries pull in — the same shape as the Angular
      // package's secondary entries.
      entry: {
        index: 'src/index.ts',
        styles: 'src/styles.ts',
        'export-excel': 'src/export-excel.ts',
        'export-pdf': 'src/export-pdf.ts',
      },
      fileName: (format, name) =>
        format === 'es' ? `${name}.js` : `${name}.cjs`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // never bundle the host's React, and keep the shared substrate a real
      // dependency so both render layers load exactly one copy of it
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@oge-ui/behavior',
        '@oge-ui/behavior/export-excel',
        '@oge-ui/behavior/export-pdf',
        '@oge-ui/core',
        'exceljs',
        'jspdf',
        'jspdf-autotable',
        '@oge-ui/react-forms',
        '@oge-ui/react-grid',
        '@oge-ui/react-grid/foundation',
        '@oge-ui/react-inputs',
        '@oge-ui/react-layout',
        '@oge-ui/react-overlay',
      ],
      output: {
        // Rollup strips module-level directives when it bundles, so the
        // `'use client'` the sources carry would never reach the published
        // JS — and importing from a React Server Component would crash at
        // runtime. Re-add it to every emitted chunk.
        banner: "'use client';",
        assetFileNames: (asset) =>
          asset.names?.some((n) => n.endsWith('.css'))
            ? 'styles.css'
            : '[name][extname]',
      },
    },
  },
  test: {
    name: 'react-tree-list',
    watch: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/packages/react/tree-list',
      provider: 'v8' as const,
      // ratchet floor: measured level − 1, rounded down. Raise it when
      // coverage grows (docs/ARCHITECTURE.md → Testing → coverage ratchet)
      thresholds: {
        statements: 75,
        branches: 68,
        functions: 74,
        lines: 78,
      },
    },
  },
}));
