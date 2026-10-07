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
 * tarball has no README, no license terms and no AI-facing docs.
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
  cacheDir: '../../../node_modules/.vite/packages/react/charts',
  plugins: [
    react(),
    nxViteTsPaths(),
    publishAssets('../../../dist/packages/react/charts'),
    dts({
      entryRoot: 'src',
      tsconfigPath: `${__dirname}/tsconfig.lib.json`,
      // Without this the workspace tsconfig `paths` are inlined into the
      // emitted declarations, so `@oge-ui/charts-engine` would ship as a
      // relative path into this repo's sources and break once installed.
      aliasesExclude: [/^@oge-ui\//],
      // explicit `.js` specifiers + a `.d.cts` twin for the `require` condition
      afterBuild: ogeDualTypes,
    }),
  ],
  build: {
    outDir: '../../../dist/packages/react/charts',
    emptyOutDir: true,
    reportCompressedSize: true,
    lib: {
      // Separate entries on purpose: the JS never imports the stylesheet (a
      // consumer rendering on the server, or bundling without a CSS loader,
      // is not forced to resolve it), and the image exporter is its own
      // module, like the Angular package's `/export-image` secondary entry.
      entry: {
        index: 'src/index.ts',
        styles: 'src/styles.ts',
        'export-image': 'src/export-image.ts',
        // the word-sized chart: never pulls the cartesian chart
        sparkline: 'src/sparkline.ts',
        // the only module that reaches the optional `jspdf` peer
        'export-pdf': 'src/export-pdf.ts',
      },
      fileName: (format, name) =>
        format === 'es' ? `${name}.js` : `${name}.cjs`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // never bundle the host's React, and keep the engine a real dependency
      // so both render layers load exactly one copy of it
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@oge-ui/charts-engine',
        '@oge-ui/charts-engine/export-image',
        '@oge-ui/charts-engine/export-pdf',
        '@oge-ui/core',
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
    name: 'react-charts',
    watch: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/packages/react/charts',
      provider: 'v8' as const,
      // ratchet floor: measured level − 1, rounded down. Raise it when
      // coverage grows (docs/ARCHITECTURE.md → Testing → coverage ratchet)
      thresholds: {
        statements: 80,
        branches: 71,
        functions: 75,
        lines: 84,
      },
    },
  },
}));
