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
            '@oge-ui/react-grid',
            '@oge-ui/tree-list',
            '@oge-ui/react-tree-list',
            '@oge-ui/pivot',
            '@oge-ui/react-pivot',
            '@oge-ui/gantt',
            '@oge-ui/charts',
            '@oge-ui/react-charts',
            '@oge-ui/react-gantt',
            '@oge-ui/scheduler',
            '@oge-ui/react-scheduler',
            '@oge-ui/kanban',
            '@oge-ui/react-kanban',
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
              // ready-made translations (MIT). The packs are typed against
              // every catalog, so this scope reaches the commercial engines —
              // but ONLY through `import type` (the engines' message
              // interfaces), which the build erases: the published package has
              // no runtime dependency on any of them (optional peers, types
              // only). The one sanctioned MIT → commercial edge, and a
              // type-level one; never import a value from an engine here.
              // `scope:core` is for the specs (`ogeFormatMessage`).
              sourceTag: 'scope:locales',
              onlyDependOnLibsWithTags: [
                'scope:locales',
                'scope:behavior',
                'scope:core',
                'scope:pivot-engine',
                'scope:scheduler-engine',
                'scope:gantt-engine',
                'scope:kanban-engine',
                'scope:bpmn-engine',
                'scope:charts-engine',
              ],
            },
            {
              // the charts family's commercial, framework-free engine
              // (ADR 0003): commercial may depend on MIT substrate, never the
              // reverse — no MIT project lists this tag.
              sourceTag: 'scope:charts-engine',
              onlyDependOnLibsWithTags: [
                'scope:charts-engine',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // React render layer of the commercial charts family: the
              // engine is its whole substrate, like the Angular package's.
              sourceTag: 'scope:react-charts',
              onlyDependOnLibsWithTags: [
                'scope:react-charts',
                'scope:charts-engine',
                'scope:behavior',
                'scope:core',
              ],
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
                'scope:react-forms',
                'scope:react-upload',
                'scope:react-editor',
                'scope:react-grid',
                'scope:react-tree-list',
                'scope:react-overlay',
                // <OgeLocaleProvider> composes the family providers
                'scope:locales',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // the React tree list builds on the React grid's foundation
              // (cell editor, pager, filter builder, editing bridge) exactly as
              // the Angular tree list builds on `@oge-ui/grid/foundation`
              sourceTag: 'scope:react-tree-list',
              onlyDependOnLibsWithTags: [
                'scope:react-tree-list',
                'scope:react-grid',
                'scope:react-forms',
                'scope:react-inputs',
                'scope:react-layout',
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // the React grid renders the inputs family's editors on its
              // filter row, the overlay's popup/menu for the operator and
              // context menus, and the forms family for `editing` in `form`
              // and `popup` mode — the same edges the Angular grid package has
              sourceTag: 'scope:react-grid',
              onlyDependOnLibsWithTags: [
                'scope:react-grid',
                'scope:react-forms',
                'scope:react-inputs',
                'scope:react-layout',
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // commercial engine (ADR 0003): framework-free like core and
              // behavior, and like them it may take only the MIT substrate —
              // commercial may depend on MIT, never the reverse, so no MIT
              // scope lists this tag except the two Gantt render layers
              sourceTag: 'scope:gantt-engine',
              onlyDependOnLibsWithTags: [
                'scope:gantt-engine',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // the React Gantt mirrors the Angular package's edges: its
              // engine, the task dialog (react-forms → react-inputs) and the
              // modal around it (react-overlay)
              sourceTag: 'scope:react-gantt',
              onlyDependOnLibsWithTags: [
                'scope:react-gantt',
                'scope:gantt-engine',
                'scope:react-forms',
                'scope:react-inputs',
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:react-upload',
              onlyDependOnLibsWithTags: [
                'scope:react-upload',
                'scope:react-layout',
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // the React rich-text editor mirrors the Angular package's
              // edges: the toolbar (react-layout), the popups and the link /
              // image prompts (react-overlay), the colour palette
              // (react-inputs); the editor machine itself lives in behavior
              sourceTag: 'scope:react-editor',
              onlyDependOnLibsWithTags: [
                'scope:react-editor',
                'scope:react-inputs',
                'scope:react-layout',
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
              // the React form renders the inputs family's editors and lays
              // its sections out with the tabs / layout / navigation ones —
              // the same edges the Angular forms package has
              sourceTag: 'scope:react-forms',
              onlyDependOnLibsWithTags: [
                'scope:react-forms',
                'scope:react-inputs',
                'scope:react-layout',
                'scope:react-navigation',
                'scope:react-tabs',
                'scope:react-overlay',
                'scope:react-upload',
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
                'scope:behavior',
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
                // the tree list's data model is `@oge-ui/behavior`'s
                // OgeTreeListCore, shared with @oge-ui/react-tree-list
                'scope:behavior',
                'scope:core',
                'scope:inputs',
                'scope:overlay',
                'scope:forms',
                'scope:tabs',
                'scope:layout',
              ],
            },
            {
              // commercial engine packages (ADR 0003): framework-free like
              // core/behavior, carrying the family's commercial license. They
              // may take the MIT substrate (commercial may depend on MIT,
              // never the reverse) and nothing above it.
              sourceTag: 'scope:pivot-engine',
              onlyDependOnLibsWithTags: [
                'scope:pivot-engine',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              sourceTag: 'scope:pivot',
              onlyDependOnLibsWithTags: [
                'scope:pivot',
                'scope:pivot-engine',
                'scope:grid',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // the React pivot: the shared engine, plus react-grid for the
              // same `stateKey` storage context the React grid persists
              // through — the edge the Angular pivot → grid has
              sourceTag: 'scope:react-pivot',
              onlyDependOnLibsWithTags: [
                'scope:react-pivot',
                'scope:react-grid',
                'scope:pivot-engine',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // the commercial BPMN engine (ADR 0003): framework-free and
              // dependency-free — model, XML/JSON/SVG, routing, rules, the
              // command stack and the editor core both render layers run.
              // It may take the MIT substrate, never a render layer.
              sourceTag: 'scope:bpmn-engine',
              onlyDependOnLibsWithTags: [
                'scope:bpmn-engine',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // commercial BPMN editor (Angular): a thin template over the
              // engine package — nothing else
              sourceTag: 'scope:bpmn',
              onlyDependOnLibsWithTags: [
                'scope:bpmn',
                'scope:bpmn-engine',
                'scope:core',
              ],
            },
            {
              // commercial BPMN editor (React): the same engine, and the MIT
              // behavior layer for URL sanitizing — no other React family
              sourceTag: 'scope:react-bpmn',
              onlyDependOnLibsWithTags: [
                'scope:react-bpmn',
                'scope:bpmn-engine',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // commercial charts: dependency-free SVG rendering; only the
              // shared kernel (core), the family's engine package (ADR 0003)
              // and the overlay primitives are taken
              sourceTag: 'scope:charts',
              onlyDependOnLibsWithTags: [
                'scope:charts',
                'scope:charts-engine',
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
                'scope:gantt-engine',
                'scope:behavior',
                'scope:core',
                'scope:overlay',
                'scope:inputs',
                'scope:forms',
              ],
            },
            {
              // the commercial kanban engine both render layers run (ADR 0003):
              // framework-free like behavior, and it may take the MIT substrate
              // (commercial may depend on MIT, never the reverse) — nothing else
              sourceTag: 'scope:kanban-engine',
              onlyDependOnLibsWithTags: [
                'scope:kanban-engine',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // the React kanban mirrors the Angular package's edges: the card
              // dialog is the React form, the modal comes from react-overlay
              sourceTag: 'scope:react-kanban',
              onlyDependOnLibsWithTags: [
                'scope:react-kanban',
                'scope:kanban-engine',
                'scope:react-forms',
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
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
                'scope:kanban-engine',
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
                // ADR 0003: the framework-free engine both render layers run
                'scope:scheduler-engine',
                'scope:behavior',
                'scope:core',
                'scope:overlay',
                'scope:inputs',
                'scope:forms',
              ],
            },
            {
              // ADR 0003: the scheduler's commercial engine — framework-free
              // (the platform:agnostic rules above ban Angular/React), and
              // like every commercial package it may take the MIT substrate,
              // never the reverse
              sourceTag: 'scope:scheduler-engine',
              onlyDependOnLibsWithTags: [
                'scope:scheduler-engine',
                'scope:behavior',
                'scope:core',
              ],
            },
            {
              // the React scheduler mirrors the Angular package's edges onto
              // the React families: popup/modal (overlay), the calendar
              // (inputs) and the appointment form (forms)
              sourceTag: 'scope:react-scheduler',
              onlyDependOnLibsWithTags: [
                'scope:react-scheduler',
                'scope:scheduler-engine',
                'scope:react-forms',
                'scope:react-inputs',
                'scope:react-overlay',
                'scope:behavior',
                'scope:core',
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
              // editor packages — the engine and the uploader machine live
              // in behavior (shared with the React uploader), layout lends
              // the progress bar and overlay the lightbox
              sourceTag: 'scope:upload',
              onlyDependOnLibsWithTags: [
                'scope:upload',
                'scope:layout',
                'scope:buttons',
                'scope:overlay',
                'scope:core',
                'scope:behavior',
              ],
            },
            {
              // the rich-text editor: the editor machine and the sanitizer
              // live in behavior (shared with the React editor); layout lends
              // the APG toolbar, overlay the popups and the link / image
              // prompts, inputs the colour palette. Nothing depends on it.
              sourceTag: 'scope:editor',
              onlyDependOnLibsWithTags: [
                'scope:editor',
                'scope:inputs',
                'scope:layout',
                'scope:overlay',
                'scope:core',
                'scope:behavior',
              ],
            },
            {
              sourceTag: 'scope:forms',
              onlyDependOnLibsWithTags: [
                'scope:forms',
                'scope:behavior',
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
                'scope:editor',
                // provideOgeLocale(): the MIT translation packs (their
                // type-only references to commercial engines are erased) and
                // the default catalogs a pack is merged over
                'scope:locales',
                'scope:behavior',
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
                'scope:react-forms',
                'scope:react-upload',
                'scope:react-editor',
                'scope:react-grid',
                'scope:react-kanban',
                'scope:react-tree-list',
                'scope:react-bpmn',
                'scope:react-oge',
                'scope:react-overlay',
                'scope:react-scheduler',
                'scope:behavior',
                'scope:kanban-engine',
                'scope:react-charts',
                'scope:react-pivot',
                'scope:charts-engine',
                'scope:react-gantt',
                'scope:gantt-engine',
                'scope:grid',
                'scope:tree-list',
                'scope:pivot',
                'scope:pivot-engine',
                'scope:bpmn',
                'scope:bpmn-engine',
                'scope:scheduler',
                'scope:scheduler-engine',
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
                'scope:editor',
                'scope:locales',
                // the localization page's demo runs provideOgeLocale itself
                'scope:ui',
                'scope:core',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    // House i18n rule (docs/ARCHITECTURE.md, "Public API language"): every
    // user-facing string, aria labels included, lives in a messages
    // interface. A literal English accessible name in a template or in JSX
    // cannot be translated, so it is a lint error. Narrow on purpose — a
    // capitalised literal on `aria-label` only — so it never fires on data,
    // class names or test fixtures. The dev-app opts out: its demos show
    // consumer code, where a literal label is exactly right.
    files: ['**/*.html'],
    // inline templates of spec hosts arrive as `<file>.spec.ts/<n>.html`
    ignores: ['**/*.spec.ts/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "TextAttribute[name='aria-label'][value=/^[A-Z][a-z]/]",
          message:
            'Literal English aria-label: move the string into the family messages interface and bind it.',
        },
        {
          selector:
            "BoundAttribute[name='aria-label'] LiteralPrimitive[value=/^[A-Z][a-z]/]",
          message:
            'Literal English aria-label: move the string into the family messages interface and bind it.',
        },
      ],
    },
  },
  {
    files: ['**/*.tsx', '**/*.jsx'],
    ignores: ['**/*.spec.tsx', '**/*.test.tsx', '**/*.test-utils.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXAttribute[name.name='aria-label'] > Literal[value=/^[A-Z][a-z]/]",
          message:
            'Literal English aria-label: move the string into the family messages interface and bind it.',
        },
        {
          selector:
            "JSXAttribute[name.name='aria-label'] > JSXExpressionContainer > Literal[value=/^[A-Z][a-z]/]",
          message:
            'Literal English aria-label: move the string into the family messages interface and bind it.',
        },
        {
          selector:
            "JSXAttribute[name.name='aria-label'] > JSXExpressionContainer > TemplateLiteral[expressions.length=0] > TemplateElement[value.raw=/^[A-Z][a-z]/]",
          message:
            'Literal English aria-label: move the string into the family messages interface and bind it.',
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
