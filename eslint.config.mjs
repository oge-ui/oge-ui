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
          checkDynamicDependenciesExceptions: [
            '@oge-ui/grid',
            '@oge-ui/pivot',
            '@oge-ui/gantt',
            '@oge-ui/charts',
          ],
          depConstraints: [
            // ---------------------------------------------------------------
            // Platform layering (see docs/adr/0001-multi-framework-strategy.md)
            //
            // Every project carries a `platform:` tag next to its `scope:` tag,
            // and Nx applies *all* matching constraints — so the platform rules
            // below intersect with the per-package scope rules further down.
            //
            //   platform:agnostic  shared substrate — no framework, ever
            //   platform:angular   the Angular render layer (packages/<name>)
            //   platform:react     the React render layer (packages/react/<name>)
            //
            // The two render layers may depend on the substrate and never on
            // each other. This is what keeps `@oge-ui/behavior` honest: a
            // behaviour that quietly reaches for Angular stops being shareable,
            // and the build says so instead of a reviewer having to notice.
            // ---------------------------------------------------------------
            {
              sourceTag: 'platform:agnostic',
              onlyDependOnLibsWithTags: ['platform:agnostic'],
              bannedExternalImports: [
                '@angular/*',
                'rxjs*',
                'zone.js*',
                'react',
                'react-dom',
                'react/*',
                'react-dom/*',
              ],
            },
            {
              sourceTag: 'platform:angular',
              onlyDependOnLibsWithTags: [
                'platform:angular',
                'platform:agnostic',
              ],
              bannedExternalImports: [
                'react',
                'react-dom',
                'react/*',
                'react-dom/*',
              ],
            },
            {
              sourceTag: 'platform:react',
              onlyDependOnLibsWithTags: ['platform:react', 'platform:agnostic'],
              bannedExternalImports: ['@angular/*', 'zone.js*'],
            },
            {
              // The docs site is the one project that must hold both render
              // layers at once: showing an Angular and a React component side
              // by side, under one shell and one homepage, is its whole job.
              // It is a leaf — nothing depends on it — so this cannot leak.
              sourceTag: 'platform:docs',
              onlyDependOnLibsWithTags: [
                'platform:docs',
                'platform:angular',
                'platform:react',
                'platform:agnostic',
              ],
            },
            {
              sourceTag: 'scope:core',
              onlyDependOnLibsWithTags: ['scope:core'],
            },
            {
              // the interaction/a11y sibling of core: positioning, focus
              // trapping, the overlay Escape stack, scroll locking. It may
              // take core's arithmetic but nothing above it — a behaviour
              // that needs a component is not a behaviour (ADR 0001).
              sourceTag: 'scope:behavior',
              onlyDependOnLibsWithTags: ['scope:behavior', 'scope:core'],
            },
            {
              // React render layer. Note there is no `scope:buttons` here: the
              // React buttons must reach the shared substrate directly, never
              // the Angular package — the `platform:` rules above already
              // forbid it, and this keeps the intent readable per package.
              // `react-overlay` mirrors the Angular dependency shape
              // (buttons → overlay for the drop-down button).
              sourceTag: 'scope:react-buttons',
              onlyDependOnLibsWithTags: [
                'scope:react-buttons',
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:react-overlay',
              onlyDependOnLibsWithTags: [
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // mirrors the Angular inputs' dependency shape (inputs →
              // overlay lands with the dropdown editors)
              sourceTag: 'scope:react-inputs',
              onlyDependOnLibsWithTags: [
                'scope:react-inputs',
                'scope:react-overlay',
                // the tree select hosts @oge-ui/react-navigation's tree inside
                // the dropdown; the editor chrome (the field, the commit
                // pipeline, the validation subscript) only exists here, so the
                // edge points this way — mirroring the Angular
                // `scope:inputs → scope:navigation` edge, the same direction
                // Kendo's dropdowns → treeview takes. react-navigation never
                // imports react-inputs, so this cannot close a cycle.
                'scope:react-navigation',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:react-tabs',
              onlyDependOnLibsWithTags: [
                'scope:react-tabs',
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // the React umbrella: one install, one import path. It may take
              // every React family and nothing else — it is a leaf, so this
              // cannot create a cycle (mirrors `scope:ui` on the Angular side).
              sourceTag: 'scope:react-oge',
              onlyDependOnLibsWithTags: [
                'scope:react-oge',
                'scope:react-buttons',
                'scope:react-inputs',
                'scope:react-tabs',
                'scope:react-layout',
                'scope:react-navigation',
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:react-layout',
              onlyDependOnLibsWithTags: [
                'scope:react-layout',
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:react-navigation',
              onlyDependOnLibsWithTags: [
                'scope:react-navigation',
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
              ],
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
              // commercial charts: dependency-free SVG rendering; only the
              // shared kernel (core) and the overlay primitives are taken
              sourceTag: 'scope:charts',
              onlyDependOnLibsWithTags: [
                'scope:charts',
                'scope:core',
                'scope:overlay',
              ],
            },
            {
              // commercial gantt: like the scheduler, a deliberate consumer
              // of the MIT suite (task dialog = forms, tooltips = overlay);
              // the tree pane builds on core's tree engine, not tree-list
              sourceTag: 'scope:gantt',
              onlyDependOnLibsWithTags: [
                'scope:gantt',
                'scope:core',
                'scope:overlay',
                'scope:inputs',
                'scope:forms',
              ],
            },
            {
              // commercial kanban: like the scheduler and gantt, a deliberate
              // consumer of the MIT suite (card dialog = forms, menus/modal =
              // overlay, editors = inputs); virtualization and field
              // accessors come from core's kernel
              sourceTag: 'scope:kanban',
              onlyDependOnLibsWithTags: [
                'scope:kanban',
                'scope:core',
                'scope:overlay',
                'scope:inputs',
                'scope:forms',
              ],
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
              onlyDependOnLibsWithTags: [
                'scope:overlay',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:inputs',
              onlyDependOnLibsWithTags: [
                'scope:inputs',
                'scope:behavior',
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
                'scope:behavior',
                'scope:overlay',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:tabs',
              onlyDependOnLibsWithTags: [
                'scope:tabs',
                'scope:overlay',
                'scope:behavior',
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
                'scope:behavior',
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
                'scope:behavior',
              ],
            },
            {
              // the uploader draws its own chrome, so it takes none of the
              // editor packages — only core's navigation arithmetic today,
              // and layout's progress bar once transfers land
              sourceTag: 'scope:upload',
              onlyDependOnLibsWithTags: [
                'scope:upload',
                'scope:layout',
                'scope:buttons',
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
                'scope:upload',
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
                'scope:upload',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:app',
              onlyDependOnLibsWithTags: [
                'scope:app',
                // the docs site renders the React components beside the
                // Angular ones on the same page (ADR 0001)
                'scope:react-buttons',
                'scope:react-inputs',
                'scope:react-tabs',
                'scope:react-layout',
                'scope:react-navigation',
                'scope:react-oge',
                'scope:react-overlay',
                'scope:behavior',
                'scope:grid',
                'scope:tree-list',
                'scope:pivot',
                'scope:bpmn',
                'scope:scheduler',
                'scope:gantt',
                'scope:kanban',
                'scope:charts',
                'scope:buttons',
                'scope:overlay',
                'scope:inputs',
                'scope:tabs',
                'scope:layout',
                'scope:navigation',
                'scope:forms',
                'scope:upload',
                'scope:core',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    // The `ng add` schematics are platform:agnostic like the rest of the
    // substrate, and the code they ship honours that. Their tests cannot:
    // @angular-devkit's `SchematicTestRunner.callRule` returns an Observable,
    // so awaiting it means importing rxjs. Exempting the spec files keeps the
    // ban meaningful where it matters — on shipped code — instead of granting
    // the whole tools/ tree an exemption it does not need.
    files: ['tools/oge-schematics/src/**/*.spec.ts'],
    rules: { '@nx/enforce-module-boundaries': 'off' },
  },
];
