import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

/**
 * ng-packagr assembles the Angular packages' npm payload (README, LICENSE and
 * the `assets: ["llms.txt"]` entry); Vite lib mode emits only the JS/CSS/d.ts,
 * so this package has to carry its own equivalent — without it the published
 * tarball has no README, no license and no AI-facing docs.
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
  cacheDir: '../../../node_modules/.vite/packages/react/pivot',
  plugins: [
    react(),
    nxViteTsPaths(),
    publishAssets('../../../dist/packages/react/pivot'),
    dts({
      entryRoot: 'src',
      tsconfigPath: `${__dirname}/tsconfig.lib.json`,
      // Without this the workspace tsconfig `paths` are inlined into the
      // emitted declarations, so `@oge-ui/pivot-engine` would ship as a
      // relative path into this repo's sources.
      aliasesExclude: [/^@oge-ui\//],
    }),
  ],
  build: {
    outDir: '../../../dist/packages/react/pivot',
    emptyOutDir: true,
    reportCompressedSize: true,
    lib: {
      // The stylesheet is its own entry so the JS never imports CSS; the
      // Excel / PDF exports are their own entries so only an app that imports one pays
      // for `exceljs` / `jspdf` — the Angular package's secondary-entry shape.
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
        '@oge-ui/core',
        '@oge-ui/pivot-engine',
        '@oge-ui/pivot-engine/export-excel',
        '@oge-ui/pivot-engine/export-pdf',
        '@oge-ui/react-grid',
        'exceljs',
        'jspdf',
        'jspdf-autotable',
      ],
      output: {
        // Rollup strips module-level directives when it bundles; re-add
        // `'use client'` to every emitted chunk so RSC imports stay safe.
        banner: "'use client';",
        assetFileNames: (asset) =>
          asset.names?.some((n) => n.endsWith('.css'))
            ? 'styles.css'
            : '[name][extname]',
      },
    },
  },
  test: {
    name: 'react-pivot',
    watch: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/packages/react/pivot',
      provider: 'v8' as const,
    },
  },
}));
