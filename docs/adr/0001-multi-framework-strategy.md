# ADR 0001 — Multi-framework strategy: native render layers over a shared substrate

- **Status:** Accepted
- **Date:** 2026-08-12
- **Supersedes:** —

## Context

OGE ships as an Angular component suite. We want to serve React (and, later,
plain JavaScript) without turning the Angular product into a second-class
citizen of its own codebase.

A measurement of the workspace at the time of writing sets the terms of the
decision. Excluding specs:

| Layer                                                                          |   Lines | Portable as-is |
| ------------------------------------------------------------------------------ | ------: | -------------- |
| `packages/core` (framework-free)                                               |   5,240 | yes            |
| per-package `engine/` folders (bpmn, scheduler, gantt, kanban, charts, inputs) |  12,450 | yes            |
| Angular-bound component code                                                   | ~69,000 | no             |
| SCSS (`.oge-*` global classes, `ViewEncapsulation.None`)                       |  13,732 | yes            |

So roughly **20% of the logic is framework-free by line count** — though 173 of
373 non-spec TypeScript files import no Angular at all, meaning the shared layer
is more "scattered and unnamed" than "missing". `grid` is the worst case: 6,002
lines with no `engine/` folder at all. `bpmn` is the best: 7,143 of 14,157 lines
already sit in `engine/`.

The naive framing — "core is already framework-free, React just binds to it" —
is therefore false, and any plan built on it would fail late.

## Decision drivers

- The Angular product must not regress or slow down to serve the React one.
- The differentiator is API quality: signal inputs, Signal Forms integration,
  WAI-ARIA APG conformance, `TemplateRef` slots. Anything that flattens those
  into a lowest-common-denominator API destroys the reason to choose OGE.
- Feature parity between frameworks has to be mechanically checkable, not a
  matter of discipline.

## Options considered

Four patterns exist in the market:

| Pattern                                                                      | Who                                                                                                                                                                      | Verdict                                                                                                                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A.** One DOM-owning core + thin generated wrappers                         | Syncfusion (`ej2-*` → `ej2-react-*`), DevExtreme, Ionic/Stencil, AG Grid                                                                                                 | Rejected. Cheap and parity-safe, but the wrapper is exactly where our API value lives. It is why Syncfusion's and DevExtreme's React bindings feel imperative and un-idiomatic. |
| **B.** Native implementation per framework + shared framework-free substrate | Kendo UI: KendoReact / Angular / Vue / jQuery are separate implementations sharing `kendo-theme-*`, `kendo-data-query`, `kendo-intl`, `kendo-date-math`, `kendo-drawing` | **Chosen.** Most expensive, best developer experience, and the only option that preserves an idiomatic API on both sides.                                                       |
| **C.** Pure headless core, no DOM                                            | TanStack Table/Virtual, React Aria + react-stately, Zag.js / Ark UI                                                                                                      | Rejected as the product. Consumers write their own rendering — that is a different product from a styled, accessible suite. Adopted as a _technique_, see below.                |
| **D.** Unrelated codebases sharing only a design language                    | Angular Material ↔ MUI                                                                                                                                                   | Rejected. Zero sharing, double the parity risk.                                                                                                                                 |

A cautionary data point for B: DevExpress once ran a genuinely React-native
second grid alongside its wrapper product (DevExtreme Reactive,
`@devexpress/dx-react-grid`) and could not sustain both; it went to maintenance.
Two parallel products need a shared substrate deep enough to make the second one
cheap, or they diverge and one dies.

## Decision

**Pattern B, with the shared substrate pushed as deep as Zag.js pushes it.**

Kendo shares themes and data utilities but writes interaction logic separately
per framework. We go further: component _behaviour_ — keyboard maps, focus
management, open/close and selection state, drag hit-testing — becomes
framework-free too, in the shape Zag.js proved (pure state machines plus a thin
host adapter, reactivity owned by the framework layer).

Four layers, the first three single-sourced:

1. **`@oge-ui/core`** — data: `DataSource`, filtering, grouping, pivot,
   virtualization arithmetic. Exists today.
2. **`@oge-ui/behavior`** _(new)_ — interaction and accessibility: roving
   tabindex, APG keyboard maps, popup positioning, focus trap, the Escape stack,
   drag hit-testing, type-ahead, the cancelable-pipeline shape. Pure TypeScript
   over a small DOM-adapter interface. The existing `engine/` folders and
   `overlay`'s already-pure `position.ts` / `focus-trap.ts` / `scroll-lock.ts` /
   `overlay-stack.ts` (359 lines) are its seed.
3. **`@oge-ui/themes`** — the SCSS. Because styles are global `.oge-*` classes
   under `ViewEncapsulation.None`, they are shared verbatim with zero work. This
   is the single largest free win available and mirrors Kendo's biggest one.
4. **Render layer, per framework** — templates and bindings only. Target: 1,500–2,500
   lines per package, not 6,000.

**The shared layers must not be reactive.** No shared signal library. Engines
stay pure classes and view-model-returning functions; Angular owns its `signal()`
and React owns `useSyncExternalStore`/`useMemo`. Introducing a common reactivity
primitive would require refactoring every existing Angular component, which is
precisely the cost this decision exists to avoid.

**`core` does not get re-sorted into `behavior`.** Several of core's `util/`
helpers are interaction logic by topic — `nav-index`, `type-ahead`,
`toolbar-fit`, `split-sizes`, `slider-math`, `menubar-compact`, `drawer-mode` —
and would be in `behavior` if the packages were designed in one go. They stay
where they are. Both packages are `platform:agnostic`, so every render layer can
already reach them; moving them would break published import paths in exchange
for nothing but a tidier taxonomy. The line between the two packages is the date
they were written, and that is an acceptable thing for a line to be.

The reverse case is different and is why `behavior` exists at all: the four
files it seeds from were sitting in `@oge-ui/overlay`, which is
`platform:angular`. A React overlay could not have imported them. That is a real
barrier, not a taxonomy preference.

### Naming and layout

Single Nx monorepo. Angular packages keep their names — existing consumers are
not broken — and React packages take a `react-` prefix, matching Kendo's
`@progress/kendo-react-grid`:

```
packages/
  core/            → @oge-ui/core            platform:agnostic
  behavior/        → @oge-ui/behavior        platform:agnostic
  grid/            → @oge-ui/grid            platform:angular
  react/
    grid/          → @oge-ui/react-grid      platform:react
    buttons/       → @oge-ui/react-buttons   platform:react
```

One repository, not two: the cross-framework parity gate and a shared CI are
only possible with both implementations in the same graph.

### Enforcement

Every project carries a `platform:` tag beside its `scope:` tag, and
`@nx/enforce-module-boundaries` in the root `eslint.config.mjs` gains three
rules. Nx applies _all_ matching constraints, so the platform rules intersect
with the existing per-package scope rules rather than replacing them:

- `platform:agnostic` may depend only on `platform:agnostic`, and bans
  `@angular/*`, `rxjs*`, `zone.js*`, `react`, `react-dom`.
- `platform:angular` may depend on `platform:angular` and `platform:agnostic`;
  bans `react`, `react-dom`.
- `platform:react` may depend on `platform:react` and `platform:agnostic`;
  bans `@angular/*`, `zone.js*`.

This replaces the `bannedExternalImports` that used to hang off `scope:core`.

> **Known gap:** `bannedExternalImports` can only classify packages that exist in
> the project graph, so the `react` bans are inert until React is actually
> installed in Faz 2. Verified: a probe importing `@angular/core` from `core`
> fails with _"A project tagged with `platform:agnostic` is not allowed to import
> `@angular/core`"_, while the same probe importing `react` passes today. Re-run
> the React probe once `react` is a workspace dependency.

## Phased plan

| Faz | Scope                                                                                                                                                                                | Why in this order                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | This ADR, the `platform:` tags, the boundary rules, `ARCHITECTURE.md`                                                                                                                | The contract precedes the code.                                                                                                                                                                                                                  |
| 1   | ✅ **Done.** `@oge-ui/behavior` scaffolded; `overlay`'s four already-pure files migrated verbatim and the Angular side rewired                                                       | Proves the package and its build with **zero logic change**, so a failure here is unambiguously a tooling failure.                                                                                                                               |
| 2   | React pipeline + narrow pilot: `packages/react/buttons`, `OgeButton` + `OgeButtonGroup` only (851 lines; drop-down excluded because it needs `overlay`)                              | The deliverable is not a product, it is a **repeatable package template**: Vite lib mode, React 19 peer (`^18 \|\| ^19`), `"use client"`, vitest + Testing Library, `apps/dev-app-react`, the docs-tools React branch, first npm publish.        |
| 3   | `overlay` split across both frameworks; positioning, focus trap, Escape stack, menu keyboard machine move into `behavior`                                                            | **The real test.** Whether a shared layer is actually shared is only knowable with two consumers, and this fazda the Angular side gets refactored too. If the architecture is wrong, it is wrong here — with three packages ported, not fifteen. |
| 4   | Cross-framework parity gate                                                                                                                                                          | B's known failure mode is parity drift. The gate must land after the _second_ package, not the tenth.                                                                                                                                            |
| 5   | Scale out: `inputs` → `layout`/`tabs`/`navigation` → `forms` → `grid` → `tree-list`. In parallel: `bpmn` (no dependencies, 50% already engine) and `pivot` (depends on `core` alone) | Dependency order, with the two low-coupling packages free to run off the main chain.                                                                                                                                                             |

Two things Faz 1 taught, recorded because they generalise to every later split:

- **A "pure" file is not the same as a pure spec.** `overlay-stack.spec.ts` was
  two `describe` blocks: stack arithmetic, and an Escape-ordering regression that
  constructs an `OgeAnchoredPanel`. The arithmetic moved; the regression went
  back to `overlay` as `anchored-panel-stack.spec.ts`, where it now tests the
  thing that genuinely cannot move — that the Angular panel _joins_ the one
  shared stack. Expect this split on every migration, and keep the
  render-layer half rather than deleting it.
- **Moving a file out of a package changes its `@internal` surface.**
  `resetScrollLockForTests` was module-private to `overlay`; the specs that need
  it now live a package away, so it is exported from `behavior`'s barrel — and
  deliberately _not_ re-exported from any component package's barrel.

`grid` is deliberately last: it is the largest package, the most
`TemplateRef`-dependent, and it pulls in `inputs` + `overlay` + `forms` — porting
it early would mean porting the whole suite at once.

### The parity gate (Faz 4)

Both halves already exist as machine-readable inputs:

- `*-api-data.ts` per family is hand-compiled but structured, and
  `docs-tools:llms` already parses it. Extend the generator to diff the Angular
  and React member tables and fail CI on divergence.
- `apps/dev-app-e2e`'s Playwright + axe specs run against a dev-app URL. Point
  them at both dev-apps; because behaviour is shared, most specs transfer
  verbatim, and the ones that do not are exactly the places where the shared
  layer leaked.

## Consequences

**Accepted costs.**

- Full parity is on the order of 50–60k lines of new code. This is a second
  product with its own budget, not an extension of the Angular one.
- Every public API change now lands in two render layers plus the AI-facing docs
  pipeline. The parity gate makes that visible rather than optional.
- `docs-tools` grows a framework dimension: `manifest.mjs`, `llms.txt` and the
  snippet type-check gate all need a React branch.

**Accepted risks.**

- _Parity drift_ — mitigated by Faz 4, deliberately scheduled early.
- _Behaviour layer leaks_ — a machine that turns out to need framework
  facilities is discovered in Faz 3 by construction.
- _Market_ — React's grid segment is crowded (AG Grid, TanStack, MUI X) and our
  Angular-side differentiation does not automatically transfer. This does not
  change the architecture; it changes the schedule and the go-to-market
  expectation, and is recorded here so the trade is explicit.

**Explicitly not decided here.** Vanilla-JS/custom-element packaging. Once the
behaviour layer exists it is close to free, but it is a third priority and gets
its own ADR.
