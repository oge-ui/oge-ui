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
          // the export-excel secondary entries are intentionally lazy-loaded
          // while the primary package entries stay static imports
          checkDynamicDependenciesExceptions: ['@oge-ui/grid', '@oge-ui/pivot'],
          depConstraints: [
            {
              sourceTag: 'scope:core',
              onlyDependOnLibsWithTags: ['scope:core'],
              bannedExternalImports: ['@angular/*', 'rxjs*', 'zone.js*'],
            },
            {
              sourceTag: 'scope:grid',
              onlyDependOnLibsWithTags: [
                'scope:grid',
                'scope:core',
                'scope:inputs',
                'scope:overlay',
              ],
            },
            {
              sourceTag: 'scope:tree-list',
              onlyDependOnLibsWithTags: [
                'scope:tree-list',
                'scope:grid',
                'scope:core',
                'scope:inputs',
                'scope:overlay',
              ],
            },
            {
              sourceTag: 'scope:pivot',
              onlyDependOnLibsWithTags: [
                'scope:pivot',
                'scope:grid',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:overlay',
              onlyDependOnLibsWithTags: ['scope:overlay', 'scope:core'],
            },
            {
              sourceTag: 'scope:inputs',
              onlyDependOnLibsWithTags: [
                'scope:inputs',
                'scope:overlay',
                // the tree select hosts @oge-ui/navigation's tree inside the
                // dropdown; the editor chrome (OgeInputBase, CVA, Signal
                // Forms) only exists here, so the edge points this way —
                // the same direction Kendo's dropdowns → treeview takes
                'scope:navigation',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:buttons',
              onlyDependOnLibsWithTags: [
                'scope:buttons',
                'scope:overlay',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:tabs',
              onlyDependOnLibsWithTags: [
                'scope:tabs',
                'scope:overlay',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:layout',
              onlyDependOnLibsWithTags: ['scope:layout', 'scope:core'],
            },
            {
              sourceTag: 'scope:navigation',
              onlyDependOnLibsWithTags: ['scope:navigation', 'scope:core'],
            },
            {
              // umbrella package: re-exports every MIT family.
              // scope:pivot is deliberately absent — the umbrella must never
              // depend on the commercial tier (see LICENSE).
              sourceTag: 'scope:ui',
              onlyDependOnLibsWithTags: [
                'scope:grid',
                'scope:tree-list',
                'scope:buttons',
                'scope:overlay',
                'scope:inputs',
                'scope:tabs',
                'scope:layout',
                'scope:navigation',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:app',
              onlyDependOnLibsWithTags: [
                'scope:app',
                'scope:grid',
                'scope:tree-list',
                'scope:pivot',
                'scope:buttons',
                'scope:overlay',
                'scope:inputs',
                'scope:tabs',
                'scope:layout',
                'scope:navigation',
                'scope:core',
              ],
            },
          ],
        },
      ],
    },
  },
];
