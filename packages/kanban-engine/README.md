# @oge-ui/kanban-engine

The framework-free engine behind the OGE UI Kanban board. Both render layers —
[`@oge-ui/kanban`](https://www.npmjs.com/package/@oge-ui/kanban) (Angular) and
[`@oge-ui/react-kanban`](https://www.npmjs.com/package/@oge-ui/react-kanban)
(React) — run this exact code, so a board behaves the same in either framework.

You rarely install it directly: both board packages depend on it.

## What is inside

- **Board model** — card normalization over `*Expr` field mappings (names,
  dotted paths or getters), write-back that preserves your item's storage
  shape, column derivation and ordering, swimlane grouping, fold-insensitive
  search.
- **View model** — visible columns (declared, derived or added at runtime,
  in the persisted or live-dragged order), grid tracks, per-column counts and
  WIP state, accessible labels, roving tab stops, per-cell virtual windows.
- **Interaction machines** — the pointer-gesture machine (3px threshold,
  pointer capture, capture-phase Escape), drag hit-testing and edge
  auto-scroll, arrow-key roving and the Ctrl+Arrow keyboard move twin, the
  move pipeline (plan → cancelable event → commit onto the working set with
  midpoint ordering or array reordering).
- **Editor model** — the dialog's working model, the default form items,
  the choice lists and the write-back onto an item.
- **Configuration** — `OgeKanbanMessages` (every user-facing string) and the
  config defaults both providers resolve.

No Angular, React or rxjs import anywhere — lint-enforced by the workspace's
`platform:agnostic` rules. Depends only on `@oge-ui/core` and
`@oge-ui/behavior` (both MIT).

## License

Source-available commercial software, like the Kanban board it powers — free
for evaluation and development, a paid license for production. See
[LICENSE](LICENSE) and [ogeui.com/license](https://www.ogeui.com/license).
