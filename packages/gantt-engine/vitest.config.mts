import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/gantt-engine',
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  test: {
    name: 'gantt-engine',
    watch: false,
    globals: true,
    // the controller and the gesture machine read and write the DOM (scroll
    // offsets, pointer capture, document listeners) and the PNG builder draws
    // on a canvas, so the specs need a document — like `behavior`, unlike `core`
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/gantt-engine',
      provider: 'v8' as const,
    },
  },
}));
