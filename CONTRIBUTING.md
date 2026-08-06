# Contributing to OGE UI

Thanks for your interest! Contributions to the MIT-licensed packages are very
welcome — bug reports, fixes, docs and features alike.

## Where contributions are accepted

- **MIT packages** (`core`, `grid`, `tree-list`, `inputs`, `buttons`,
  `overlay`, `ui`, the dev-app and docs): open a PR. By submitting a PR you
  agree that your contribution is licensed under the repository's MIT license.
- **`packages/pivot` (commercial):** external pull requests are currently
  **not accepted** — the package needs a single copyright holder to remain
  commercially licensable. Bug reports and feature requests for the pivot are
  very welcome as GitHub issues; a CLA-based contribution flow may open later.

## Development

This is an Nx workspace:

```sh
npm ci
npx nx serve dev-app          # docs site on http://localhost:4200
npx nx run-many -t test       # vitest suites
npx nx run-many -t lint build # what CI runs
```

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
