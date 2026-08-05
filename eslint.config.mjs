import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // the export-excel secondary entry is intentionally lazy-loaded while
          // the primary @oge-ui/grid entry stays a static import
          checkDynamicDependenciesExceptions: ['@oge-ui/grid'],
          depConstraints: [
            {
              sourceTag: 'scope:core',
              onlyDependOnLibsWithTags: ['scope:core'],
              bannedExternalImports: ['@angular/*', 'rxjs*', 'zone.js*'],
            },
            {
              sourceTag: 'scope:grid',
              onlyDependOnLibsWithTags: ['scope:grid', 'scope:core'],
            },
            {
              sourceTag: 'scope:tree-list',
              onlyDependOnLibsWithTags: ['scope:tree-list', 'scope:grid', 'scope:core'],
            },
            {
              sourceTag: 'scope:app',
              onlyDependOnLibsWithTags: [
                'scope:app',
                'scope:grid',
                'scope:tree-list',
                'scope:core',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
