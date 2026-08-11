# @oge-ui/gantt

> **Commercial package.** Unlike the rest of the OGE UI suite (MIT), the
> Gantt is source-available commercial software: free for evaluation,
> development and testing — a paid license is required for production use.
> No watermark, no runtime license checks. See [LICENSE](LICENSE) and
> [ogeui.com/license](https://ogeui.com/license).

A signal-based Angular Gantt chart: `<oge-gantt>` pairs a virtualized
treegrid task pane with a timeline chart over a pure, framework-free
kernel — tree indexing and summary roll-up, calendar-true time scales,
forward auto-scheduling, a critical-path backward pass, orthogonal
dependency routing and all gesture math live in plain TypeScript.

Like `@oge-ui/scheduler` (and unlike the deliberately self-contained
`@oge-ui/bpmn`), this package is a _consumer_ of the MIT suite by design:
the task dialog comes from `@oge-ui/overlay` + `@oge-ui/forms` and its
editors from `@oge-ui/inputs` — that composition is the selling point, so
the dependencies are taken instead of rebuilt.

**Chart & data**

- Task tree with summary brackets (duration-weighted progress roll-up),
  milestone diamonds (zero-duration tasks), baseline under-bars, resource
  labels, weekend/holiday shading, `stripLines` markers and ranges, a
  today line and `showCriticalPath` zero-slack outlining
- FS / SS / FF / SF dependency arrows routed orthogonally (dx numeric
  codes 0–3 also parse); drawing a link that would close a cycle is
  rejected and announced; `autoScheduling` pushes successors forward when
  a predecessor moves
- Calendar-true `'hours' | 'days' | 'weeks' | 'months'` scales — real
  month lengths, DST-safe — with toolbar zoom, Ctrl+wheel zoom and
  `zoomToFit()`
- Binds plain task/dependency arrays with field mapping via `keyExpr` /
  `parentKeyExpr` / `startExpr` / `endExpr` / `predecessorKeyExpr` / …
  (dotted paths or getter functions); string-dated stores round-trip
  without changing their storage shape; inputs are never mutated
- Both panes virtualize rows over a fixed `rowHeight` and share one
  scroll model; the task pane has configurable `columns` and a draggable
  splitter

**Editing**

- Drag to move, edge-resize, progress-knob drag and link-dot dependency
  drawing — 3px threshold, live drag tip, mid-gesture Escape-cancel
- Task dialog (`@oge-ui/forms`) with a `taskEditDialogShowing` hook for
  custom fields; toolbar add / undo / redo / expand / collapse; snapshot
  undo/redo where every applied edit, drags included, is exactly one step
- Cancelable `taskInserting` / `taskUpdating` / `taskDeleting` /
  `dependencyInserting` / `dependencyDeleting` events; past-tense events
  fire only for applied changes; `editingEnabled`, per-capability
  `allow*` flags and a `readOnly` shorthand

**Accessibility (honest limits)**

No WAI-ARIA APG pattern covers a gantt; the widget composes the treegrid
pattern instead: the task pane is a `role="treegrid"` with roving-tabindex
rows (arrows, Left/Right collapse/expand, Enter edits, Delete deletes) and
the focused row drives its bar from the keyboard — Ctrl+Left/Right moves,
Ctrl+Shift+Left/Right resizes — with polite live-region announcements;
the chart is a focusable, labeled scroll region. All strings, including every aria label, live in
`OgeGanttMessages` (`provideOgeGanttConfig`).

**Dates** are Intl-only local wall time (house rule: no date library, no
DateAdapter, no TZ database); `locale` (config-level or per instance)
drives every `Intl` format.

Docs: [ogeui.com/components/gantt](https://ogeui.com/components/gantt)
· AI reference: [`llms.txt`](llms.txt)
