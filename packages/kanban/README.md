# @oge-ui/kanban

> **Commercial package.** Unlike the rest of the OGE UI suite (MIT), the
> Kanban is source-available commercial software: free for evaluation,
> development and testing — a paid license is required for production use.
> No watermark, no runtime license checks. See [LICENSE](LICENSE) and
> [ogeui.com/license](https://www.ogeui.com/license).

A signal-based Angular Kanban board: `<oge-kanban>` renders columns,
swimlanes and cards over a pure, framework-free kernel — card
normalization and write-back, drag hit-testing, per-column virtual
windows and WIP arithmetic all live in plain TypeScript.

Like `@oge-ui/scheduler` and `@oge-ui/gantt` (and unlike the deliberately
self-contained `@oge-ui/bpmn`), this package is a _consumer_ of the MIT
suite by design: the card dialog comes from `@oge-ui/overlay` +
`@oge-ui/forms` and its editors from `@oge-ui/inputs` — that composition
is the selling point, so the dependencies are taken instead of rebuilt.

**Board & data**

- Binds a plain card array with field mapping via `keyExpr` /
  `columnExpr` / `titleExpr` / `orderExpr` / `swimlaneExpr` / … (dotted
  paths or getter functions); write-back preserves the storage shape and
  inputs are never mutated
- Columns declared (`key`, `title`, `color`, `wipLimit`, `allowAdding`)
  or auto-derived from the data; collapsible columns and swimlanes with
  two-way collapsed state; per-column card counts and WIP badges that
  turn to the danger tone on overflow — including a live preview while a
  drag hovers the column
- Per-column vertical virtualization over a fixed `cardHeight` (10k
  cards stay smooth; rich card templates may opt out with
  `virtualScrolling: false`), native horizontal board scrolling
- Card anatomy out of the box: color stripe, title, clamped description,
  tag chips, assignee initials, due-date badge (danger when overdue) and
  a priority indicator; `*ogeKanbanCardTemplate` replaces the body while
  gestures, keyboard and ARIA stay on the component

**Editing**

- Card drag & drop within and across columns and swimlanes — 3px
  threshold, live placeholder, lifted tilt, edge auto-scroll, mid-drag
  Escape restore, exactly one commit; column drag reordering; on touch,
  cards and column headers lift after a 300 ms long press so the board
  still scrolls
- Double-click a card to edit (`@oge-ui/forms` dialog with a
  `cardEditDialogShowing` hook for custom fields), double-click an empty
  column to add; built-in right-click menu (edit, delete, move to
  column) and hover quick actions; toolbar with search, collapse-all and
  add-card; friendly empty states with a first-card shortcut
- Cancelable `cardAdding` / `cardUpdating` / `cardDeleting` /
  `cardMoving` events; past-tense events fire only for applied changes;
  per-capability `allow*` flags and a `readOnly` shorthand

**Accessibility (honest limits)**

No WAI-ARIA APG pattern covers a kanban; the widget composes list
semantics with a roving focus instead: each column is a labeled
`role="list"` of `listitem` wrappers, each holding a focusable
`role="group"` card with `aria-roledescription` (`messages.board.cardRoleDescription`)
and `aria-current` for the selection. One Tab stop per column; arrows
navigate within and across columns, Enter edits, Delete deletes, and
Ctrl+Arrow moves the focused card — the exact keyboard twin of the drag —
with polite live-region announcements. Quick actions are real labeled
buttons with 24px hit areas (44px on coarse pointers), and controls inside a
custom card template are reachable with Tab (Escape returns to the card). All strings, including every aria label, live in
`OgeKanbanMessages` (`provideOgeKanbanConfig`).

Docs: [ogeui.com/components/kanban](https://www.ogeui.com/components/kanban)
· AI reference: [`llms.txt`](llms.txt)
