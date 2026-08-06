const { withNx } = require('@nx/rollup/with-nx');

module.exports = withNx(
  {
    main: './src/index.ts',
    outputPath: '../../dist/packages/core',
    tsConfig: './tsconfig.lib.json',
    compiler: 'swc',
    format: ['cjs', 'esm'],
    // note: '{projectRoot}' tokens are not interpolated inside rollup.config —
    // the path must be spelled out relative to the workspace root
    assets: [
      { input: 'packages/core', output: '.', glob: '*.md' },
      { input: 'packages/core', output: '.', glob: 'LICENSE' },
    ],
  },
  {
    // Provide additional rollup configuration here. See: https://rollupjs.org/configuration-options
    // e.g.
    // output: { sourcemap: true },
  },
);
