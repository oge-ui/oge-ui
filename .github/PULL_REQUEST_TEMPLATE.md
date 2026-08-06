<!-- Thanks for contributing! Please read CONTRIBUTING.md first. -->

## What & why

<!-- Short description of the change and the problem it solves. Link issues with "Fixes #123". -->

## Checklist

- [ ] `npx nx run-many -t lint test build typecheck` passes locally
- [ ] Follows the conventions in `docs/ARCHITECTURE.md` (signals only, OnPush,
      `.oge-*` classes, design tokens, messages catalogs for user-facing text)
- [ ] Specs added/updated beside the source
- [ ] Docs updated if the public API changed (dev-app page + `<area>-api-data.ts`)
- [ ] Does **not** modify `packages/pivot` (commercial package — external PRs
      are not accepted there; see CONTRIBUTING.md)
