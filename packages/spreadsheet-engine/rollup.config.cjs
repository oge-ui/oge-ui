const { withNx } = require('@nx/rollup/with-nx');

module.exports = withNx(
  {
    main: './src/index.ts',
    outputPath: '../../dist/packages/spreadsheet-engine',
    tsConfig: './tsconfig.lib.json',
    compiler: 'swc',
    format: ['cjs', 'esm'],
    // note: '{projectRoot}' tokens are not interpolated inside rollup.config —
    // the path must be spelled out relative to the workspace root
    assets: [
      { input: 'packages/spreadsheet-engine', output: '.', glob: '*.md' },
      // the commercial license travels with the engine (ADR 0003)
      { input: 'packages/spreadsheet-engine', output: '.', glob: 'LICENSE' },
    ],
  },
  {},
);
