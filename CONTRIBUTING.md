# Contributing to OGE UI

Thanks for your interest! Contributions to the MIT-licensed packages are very
welcome — bug reports, fixes, docs and features alike.

## Where contributions are accepted

- **MIT packages** (`core`, `behavior`, `grid`, `tree-list`, `inputs`,
  `buttons`, `overlay`, `tabs`, `layout`, `navigation`, `forms`, `upload`,
  `ui`, their React twins under `packages/react/`, the dev-app and docs): open
  a PR. By submitting a PR you agree that your contribution is licensed under
  the repository's MIT license.
- **Commercial families** (`pivot`, `bpmn`, `scheduler`, `gantt`, `kanban`,
  `charts`, their `*-engine` packages and their `react-*` layers): external
  pull requests are currently **not accepted** — these packages need a single
  copyright holder to remain commercially licensable. Bug reports and feature
  requests for them are very welcome as GitHub issues; a CLA-based
  contribution flow may open later.

## Development

This is an Nx workspace:

```sh
npm ci
npx nx serve dev-app          # docs site on http://localhost:4200
npx nx run-many -t test       # vitest suites
npx nx run-many -t lint build # what CI runs
```

On a machine with limited memory, run the gates in chunks rather than one
`run-many` over everything — for example one family at a time
(`npx nx run-many -t lint test -p grid,react-grid`) and the docs gates on
their own: `npx nx run docs-tools:typecheck`, `docs-tools:llms-check` and
`docs-tools:parity`. Use the Bash shell (not Windows PowerShell 5.1) for
multi-target `nx` commands.

Architecture and house conventions (signal-only APIs, styling tokens, testing
patterns) live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — please read
it before opening a PR. Feature-parity tracking lives in
[`ROADMAP.md`](ROADMAP.md).

## Pull request checklist

- `npx nx run-many -t lint test build typecheck` passes locally.
- New components/features follow the conventions in `docs/ARCHITECTURE.md`
  (OnPush, signals only, `.oge-*` classes, tokens, messages catalogs).
- Specs live beside the source; user-visible strings go through the package's
  messages interface.
- Public API changes land in both render layers and in the AI-facing docs in
  the same PR: the family's `*-api-data.ts` rows, demos in `*-snippets.ts`
  through `demoSource()`, then `npx nx run docs-tools:llms` to regenerate the
  committed `llms` artifacts. CI enforces this with `docs-tools:typecheck`,
  `docs-tools:llms-check` and `docs-tools:parity`.
- `npx nx format:check` is clean (check its real exit code, not through a
  pipe).

## Dependency advisories

CI runs `node tools/audit-check.mjs`, which fails on any `npm audit` finding
at moderate or above. Fix a finding by upgrading or with a targeted
`overrides` entry in the root `package.json`. Only an advisory with **no
patched release** may go into `audit-allowlist.json`, as an entry with its
`id`, `package`, a `reason` explaining why it cannot reach consumers, the
`added` date and an `expires` date a few weeks out. When the entry expires the
gate fails again, so someone checks for a fix; delete entries the script
reports as no longer matching.
