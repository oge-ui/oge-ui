# OGE React Layer — Parity Roadmap

The React render layer's execution plan for [ADR 0001](docs/adr/0001-multi-framework-strategy.md)
(one framework-free engine, native render layers per framework) and
[ADR 0002](docs/adr/0002-framework-aware-docs.md) (one docs site, a global
framework switch). This file is the schedule; the ADRs are the rationale.

Last updated: 2026-08-13 (R4 complete: layout, tabs, navigation + the
`@oge-ui/react` umbrella).

## The parity principle

**The React layer targets full component and feature parity with the Angular
suite.** Every family, every feature and every public API member gets a
first-class React counterpart — `@oge-ui/react-buttons` is the first family,
not the extent of the layer. Three rules keep parity a property of the
architecture rather than a promise:

1. **Logic lives once.** Anything both layers need — interaction machines,
   selection arithmetic, config defaults, variant vocabularies, positioning,
   focus management — is extracted into `@oge-ui/behavior` (interaction) or
   `@oge-ui/core` (data) _before_ the React component is written. A private
   copy in either render layer is a defect (the Angular ButtonGroup carried
   one for a while; it is now rewired — nothing else may regress this way).
2. **Styles live once.** React packages compile their `styles.css` from the
   Angular package's SCSS. There is no second stylesheet and no second theme.
3. **No family ships trimmed.** A React package publishes when its parity
   table is fully checked, not before. Missing members are a red gate, not a
   footnote. (Deliberate, documented exceptions only — e.g. Angular
   `TemplateRef` APIs map to render props, `ng add` has no React equivalent.)

## Definition of Done — every React family

Distilled from the Faz 2 audit; all of it is enforceable and most of it is
already gated. The docs half of the bar — pages mirrored section for section,
demos as real React state, llms/llms-full coverage — is spelled out in
[`docs/REACT-PARITY.md`](docs/REACT-PARITY.md) ("the exact copy" rule).

- [ ] Shared logic extracted to `behavior`/`core`; the Angular component
      rewired onto it **in the same change**, with its existing specs passing
      unchanged.
- [ ] StrictMode-safe lifecycle: machines held in refs are revived on the
      effect's mount side (`machine.revive()` pattern) — a StrictMode-wrapped
      spec is mandatory, because every Next.js/CRA dev session runs it.
- [ ] `'use client'` present in the **built** `index.js`/`index.cjs`
      (`output.banner` in the Vite config), not only in the sources.
- [ ] SSR-safe: no layout effects on the server path
      (`useIsomorphicLayoutEffect`), first-paint attribute parity for roving
      tabindex and friends.
- [ ] Vitest + Testing Library specs beside the source, covering gestures,
      controlled/uncontrolled state, a11y semantics and DOM-order parity.
- [ ] Publishable dist: `package.json` (nx-generated), `README.md`, `LICENSE`,
      `llms.txt` all present in `dist/packages/react/<family>` (the
      `publishAssets` Vite plugin), peer deps exactly what is imported.
- [ ] Docs in the same change (CLAUDE.md rule, applied to React):
      `pages/react-<family>/` demos via `reactDemoSource()`, api-data tables,
      `FrameworkService.COVERAGE` row (page-granular), manifest entry with
      `platform: 'react'`, schematics registration, `npx nx run
docs-tools:llms` regenerated and committed.
- [ ] E2e: the family's page mounts real React trees in the switch's React
      view, axe-clean.
- [ ] Parity table (Angular member ↔ React member) reviewed row by row; the
      cross-framework parity gate (R2) diffs it mechanically once it exists.

## Phases

Dependency order, from ADR 0001 Faz 3–5. Each phase lands as one reviewable
unit: behavior extraction + Angular rewire + React package + docs + e2e.

| Phase              | Deliverable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Why this order                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **R0**             | ✅ Faz 2 hardening: StrictMode revive, `'use client'` banner, group selection rewire, publishable dist, page-granular coverage, snippet-gate fix. **Remaining: first npm publish.**                                                                                                                                                                                                                                                                                                                                                                                                                                  | The pilot must be honest before it becomes a template.                                                         |
| **R1**             | ✅ `@oge-ui/react-overlay` shipped: `OgeAnchoredPanelCore`, the menu nav/type-ahead machines and the overlay timing defaults moved into `behavior` with the Angular panel/menu rewired onto them (specs unchanged); React `useAnchoredPanel` + `<OgePopup>` + `<OgeMenuList>` (submenus, type-ahead); **`<OgeDropDownButton>` completes Buttons-family parity** (lazy items, split, rememberLastAction, renderContent). Docs, coverage and e2e in the same change. Publish rides with R0's.                                                                                                                          | **The real test** of the shared layer: two consumers or it isn't shared. Unblocks drop-down button parity.     |
| **R2**             | ✅ `docs-tools:parity` (in CI): diffs each dual-layer family's Angular and React api-data tables block by block and member by member, with mechanical naming rules (`onX`↔`x`, `defaultX`, compounds) — every other difference must carry a written reason in `check-parity.mjs` or the build is red. First run caught a real gap (React `value` prop undocumented). New families join by adding one entry to its `FAMILIES` list.                                                                                                                                                                                   | Parity drift is architecture B's known failure mode; the gate lands after the _second_ package, not the tenth. |
| **R3**             | `@oge-ui/react-inputs` — **components complete (15):** text/text-area/number, check-box/switch/radio-group, select-box/tag-box/autocomplete (with `virtualScroll` + `acceptCustomValue`), slider/range-slider, color-box, calendar, date-box/date-range-box. Tree select was a recorded parity exception until R4's navigation tree landed; it now ships on the shared tree engine, so the family is **15/15**. ✅ Docs parity too: all eleven pages branch, the API tables pass `docs-tools:parity`, `llms`/`llms-full` regenerated, e2e covers every page. **Remaining: the first npm publish (rides with R0's).** | Highest-demand family; exercises forms-adjacent patterns (controlled values) the later families reuse.         |
| **R4**             | `@oge-ui/react-layout` (7), `@oge-ui/react-tabs` (2) and `@oge-ui/react-navigation` (6) — all three complete, components and docs parity, plus `@oge-ui/react`, the umbrella package that re-exports every shipped family behind one install and one stylesheet.                                                                                                                                                                                                                                                                                                                                                     | Mid-size families over now-proven overlay + behavior substrate.                                                |
| **R5**             | `@oge-ui/react-forms`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Needs inputs/tabs/layout/navigation in place (same dependency shape as Angular).                               |
| **R6**             | `@oge-ui/react-grid`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Largest, most `TemplateRef`-dependent (→ render props); deliberately after the substrate is battle-tested.     |
| **R7**             | `@oge-ui/react-tree-list`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Shares the grid's internals.                                                                                   |
| **Parallel track** | `react-bpmn` (no deps), `react-pivot` (commercial, `core` only), then `react-charts` / `react-scheduler` / `react-gantt` / `react-kanban` / `react-upload`.                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Low coupling to the main chain; schedule opportunistically.                                                    |

Docs follow the packages automatically: each phase adds its `COVERAGE` row and
its `pages/react-<family>/` dir, the header switch and the shell notice do the
rest (ADR 0002 item 8 shrinks family by family).

## Status

| Family                             | React package              | Status                                                                |
| ---------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| Buttons (button, group, drop-down) | `@oge-ui/react-buttons`    | ✅ full family parity (R1)                                            |
| Overlay (anchored panel, menu)     | `@oge-ui/react-overlay`    | ✅ primitives shipped (R1); tooltip/modal/toast follow                |
| Inputs (15 editors)                | `@oge-ui/react-inputs`     | ✅ full family parity (R3; tree select closed in R4)                  |
| Tabs (tabs, tab panel)             | `@oge-ui/react-tabs`       | ✅ full family parity (R4); the routed page is a recorded exception   |
| Layout (7 components)              | `@oge-ui/react-layout`     | ✅ full family parity (R4)                                            |
| Navigation (6 components)          | `@oge-ui/react-navigation` | ✅ full family parity (R4); both routed pages are recorded exceptions |
| The whole suite, one install       | `@oge-ui/react`            | ✅ umbrella over every shipped family                                 |
| Everything else                    | —                          | planned per the phases above                                          |
