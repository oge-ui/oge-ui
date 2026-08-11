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
                // the form/popup edit surfaces render <oge-form>; forms
                // depends on inputs/tabs/layout, never on grid, so no cycle
                'scope:forms',
                'scope:tabs',
                'scope:layout',
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
                'scope:forms',
                'scope:tabs',
                'scope:layout',
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
              // commercial BPMN editor: self-contained by design — the whole
              // engine (XML + geometry) lives inside the package, so the only
              // allowed edge is core (and today not even that is used)
              sourceTag: 'scope:bpmn',
              onlyDependOnLibsWithTags: ['scope:bpmn', 'scope:core'],
            },
            {
              // commercial scheduler: deliberately a *consumer* of the MIT
              // suite — the appointment popup (overlay), editors (inputs)
              // and the appointment form (forms) are the selling point, so
              // unlike bpmn it takes those edges instead of rebuilding them
              sourceTag: 'scope:scheduler',
              onlyDependOnLibsWithTags: [
                'scope:scheduler',
                'scope:core',
                'scope:overlay',
                'scope:inputs',
                'scope:forms',
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
              // the toolbar's overflow menu runs on OgeAnchoredPanel +
              // oge-menu-list, the same surfaces tabs uses; overlay depends
              // on core only, so this edge cannot close a cycle
              onlyDependOnLibsWithTags: [
                'scope:layout',
                'scope:overlay',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:navigation',
              // the drawer is a modal surface in two of its three modes, so it
              // joins overlay's shared Escape stack and reuses its focus trap
              // and scroll lock; overlay depends on core only, so this edge
              // cannot close a cycle
              onlyDependOnLibsWithTags: [
                'scope:navigation',
                'scope:overlay',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:forms',
              onlyDependOnLibsWithTags: [
                'scope:forms',
                'scope:inputs',
                'scope:buttons',
                'scope:overlay',
                'scope:tabs',
                'scope:layout',
                'scope:navigation',
                'scope:core',
              ],
            },
            {
              // umbrella package: re-exports every MIT family.
              // scope:pivot and scope:bpmn are deliberately absent — the
              // umbrella must never depend on the commercial tier (see
              // LICENSE).
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
                'scope:forms',
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
                'scope:bpmn',
                'scope:scheduler',
                'scope:buttons',
                'scope:overlay',
                'scope:inputs',
                'scope:tabs',
                'scope:layout',
                'scope:navigation',
                'scope:forms',
                'scope:core',
              ],
            },
          ],
        },
      ],
    },
  },
];
