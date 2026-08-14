import baseConfig from '../../../eslint.config.mjs';

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
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
          ],
          // This package is a pure re-export barrel: it never imports `react`
          // itself, but every component it re-exports needs the consumer to
          // have it — so the peer stays declared even though no source file
          // references it. (The Angular umbrella has the same shape.)
          ignoredDependencies: ['react'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
