# ADR 0003 — Commercial engines live in per-family engine packages

- **Status:** Accepted
- **Date:** 2026-09-30
- **Decided by:** product owner (choice between three options), implementation by the maintainers
- **Related:** ADR 0001 (multi-framework strategy), `docs/ARCHITECTURE.md` → Licensing, `docs/REACT-PARITY.md`

## Context

ADR 0001 has every render layer share one framework-free implementation, with
the existing `engine/` folders as the seed of `@oge-ui/behavior`. That worked
for the MIT families (grid, forms, upload, inputs…): their cores moved into
behavior and both layers import them.

Six families are **commercial** — charts, scheduler, gantt, kanban, pivot and
bpmn (source-available, paid for production). `@oge-ui/behavior` is MIT and
carries a public "will remain MIT" commitment. Moving a commercial engine into
it would relicense the product's substance under MIT, which the licensing rule
forbids ("never move … into the commercial tier" has a mirror: never move
commercial code out of it). The React layer of these families still needs the
same engine the Angular one runs — ADR 0001's "behavior is shared code, not a
port" rule is not negotiable either.

## Options considered

1. **Per-family engine packages** — `@oge-ui/<family>-engine`, framework-free,
   carrying the family's commercial LICENSE; the Angular and the React package
   of the family both depend on it. _(chosen)_
2. **One shared `@oge-ui/pro-engine`** with a sub-path per family — one package,
   but one license artifact spanning several products that are priced and sold
   separately.
3. **Move the engines into MIT behavior** — simplest, gives the commercial tier away.

## Decision

Option 1.

- **Name:** `@oge-ui/<family>-engine` → `packages/<family>-engine`
  (`charts-engine`, `scheduler-engine`, `gantt-engine`, `kanban-engine`,
  `bpmn-engine`, `pivot-engine`). Nx project name = folder name.
- **Shape:** a framework-free library like `@oge-ui/core` — rollup build
  (`@nx/rollup`, `swc`, cjs + esm), `platform:agnostic` + `scope:<family>-engine`
  tags, vitest in node/jsdom, **no Angular or React import anywhere**
  (the root eslint `platform:agnostic` bans enforce it). It may depend on
  `@oge-ui/core` and `@oge-ui/behavior` (both MIT — commercial may depend on MIT,
  never the reverse).
- **License:** a copy of the family's `LICENSE` and
  `"license": "SEE LICENSE IN LICENSE"`, like the family's Angular package.
- **What goes in:** everything a second render layer would otherwise have to
  duplicate — the existing `engine/` folder, plus interaction machines,
  view-model builders, keyboard maps, default configs and message catalogs
  that are framework-free. Styles stay in the Angular package's SCSS and are
  compiled verbatim by the React package (ARCHITECTURE, "React package template").
- **Rewire in the same change:** the Angular package imports from the engine
  package (dependency + `allowedNonPeerDependencies`), its engine folder is
  removed, and its existing specs pass unchanged (the engine's own specs move
  with the code).
- **Pivot:** its data engine is already in MIT `@oge-ui/core` (historical,
  0.5.0) and stays there. `@oge-ui/pivot-engine` is created only for pivot logic
  that is not yet framework-free (field chooser model, layout/header math, …).
- **Umbrella:** neither the MIT `oge-ui` nor the MIT `@oge-ui/react` umbrella
  depends on an engine package or a commercial render package.
- **Registration** follows ARCHITECTURE's "New package checklist" (tsconfig
  paths, nx.json release projects, eslint depConstraints, manifest, README table).

## Consequences

**Positive:** licensing stays per product; both layers run one engine; a
future third render layer (Vue, web components) reuses the same packages.

**Negative:** six more npm packages to version and publish (they release in
lockstep with the suite like every other package); a React user of a
commercial family installs two packages (the render package pulls the engine
in as a dependency, so it is one `npm install`).
