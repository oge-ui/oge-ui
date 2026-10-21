import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/rollup.config.{js,ts,mjs,mts,cjs,cts}',
            '{projectRoot}/vitest.config.{js,ts,mjs,mts}',
            // the golden-corpus tooling (Windows + Excel), never published
            '{projectRoot}/testing/**',
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    // The engine runs in Web Workers and Node (ADR 0005): a 1M-cell workbook
    // is parsed off the main thread, and server pipelines read xlsx without a
    // browser. None of these globals exists there, so none may appear in
    // library code — the render layers own the DOM. Specs are exempt.
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'DOMParser',
          'XMLSerializer',
          'HTMLElement',
          'localStorage',
          'sessionStorage',
        ].map((name) => ({
          name,
          message:
            'The spreadsheet engine runs without a DOM (Web Workers, Node) — ADR 0005.',
        })),
      ],
    },
  },
];
