import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
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
    // The umbrella emits only re-export chunks, so make the folder rather
    // than assume an earlier write created it.
    mkdirSync(join(__dirname, outDir), { recursive: true });
    for (const file of ['README.md', 'LICENSE', 'llms.txt']) {
      copyFileSync(join(__dirname, file), join(__dirname, outDir, file));
    }
  },
});

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/packages/react/oge',
  plugins: [
    react(),
    nxViteTsPaths(),
    publishAssets('../../../dist/packages/react/oge'),
    dts({
      entryRoot: 'src',
      tsconfigPath: `${__dirname}/tsconfig.lib.json`,
      // Without this the workspace tsconfig `paths` are inlined into the
      // emitted declarations, so `@oge-ui/behavior` would ship as a relative
      // path into this repo's sources and break the moment it is installed.
      aliasesExclude: [/^@oge-ui\//],
    }),
  ],
  build: {
    outDir: '../../../dist/packages/react/oge',
    emptyOutDir: true,
    reportCompressedSize: true,
    lib: {
      // Two entries on purpose: the JS never imports the stylesheet, so a
      // consumer that renders on the server (or bundles without a CSS loader)
      // is not forced to resolve it. `styles.css` is imported once by the app,
      // which is what the docs tell people to do.
      entry: { index: 'src/index.ts', styles: 'src/styles.ts' },
      fileName: (format, name) =>
        format === 'es' ? `${name}.js` : `${name}.cjs`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // Never bundle the host's React — and never bundle a sibling family
      // either: this package is a re-export barrel, so every `@oge-ui/*`
      // import stays a real dependency. Bundling them would ship a second
      // copy of each component next to the one an app that also installs a
      // scoped package already has.
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@oge-ui/behavior',
        '@oge-ui/react-buttons',
        '@oge-ui/react-inputs',
        '@oge-ui/react-layout',
        '@oge-ui/react-navigation',
        '@oge-ui/react-overlay',
        '@oge-ui/react-tabs',
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
    name: 'react-oge',
    watch: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/packages/react/oge',
      provider: 'v8' as const,
    },
  },
}));
