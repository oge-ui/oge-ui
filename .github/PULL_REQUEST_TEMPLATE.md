<!-- Thanks for contributing! Please read CONTRIBUTING.md first. -->

## What & why

<!-- Short description of the change and the problem it solves. Link issues with "Fixes #123". -->

## Checklist

- [ ] `npx nx run-many -t lint test build typecheck` passes locally
- [ ] Follows the conventions in `docs/ARCHITECTURE.md` (signals only, OnPush,
      `.oge-*` classes, design tokens, messages catalogs for user-facing text)
- [ ] Specs added/updated beside the source
- [ ] Public API changes land in both render layers, with `*-api-data.ts`
      rows, `*-snippets.ts` demos and regenerated `llms` artifacts
      (`npx nx run docs-tools:llms`)
- [ ] Does **not** modify a commercial family (`pivot`, `bpmn`, `scheduler`,
      `gantt`, `kanban`, `charts`, their `*-engine` and `react-*` packages) —
      external PRs are not accepted there; see CONTRIBUTING.md
