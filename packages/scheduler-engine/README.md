# @oge-ui/scheduler-engine

> **Commercial package.** Like `@oge-ui/scheduler`, this engine is
> source-available commercial software: free for evaluation, development
> and testing — a paid license is required for production use. No
> watermark, no runtime license checks. See [LICENSE](LICENSE) and
> [ogeui.com/license](https://ogeui.com/license).

The framework-free engine behind the OGE UI scheduler. Plain TypeScript,
shipped as ESM + CJS, with **no Angular or React import anywhere** — both
render layers, [`@oge-ui/scheduler`](https://www.npmjs.com/package/@oge-ui/scheduler)
(Angular) and
[`@oge-ui/react-scheduler`](https://www.npmjs.com/package/@oge-ui/react-scheduler)
(React), run this one copy (ADR 0003: commercial engines live in per-family
engine packages, never in the MIT `@oge-ui/behavior`).

You rarely install it directly: it arrives as a dependency of either render
package.

## What's inside

- **Layout kernels** — `buildTimeGrid` / `buildMonthGrid` view models,
  `layoutDayColumn` (transitive-overlap clusters with greedy column
  assignment), `packLanes` / `buildMonthWeekLanes` (all-day strip and month
  rows with "+N more" overflow), the timeline's transposed lane layout.
- **Recurrence** — `parseRecurrenceRule` / `serializeRecurrenceRule` for the
  documented RFC 5545 subset (FREQ DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL,
  COUNT ⊕ UNTIL, BYDAY, BYMONTHDAY, BYMONTH, WKST), `expandRecurrence` and
  EXDATE handling.
- **Interaction** — gesture math (`proposeMove`, `proposeResize`, the drag
  arithmetic of every view), the pointer-gesture machine
  (`beginPointerGesture`: 3px threshold, capture-phase Escape-cancel) and
  the keyboard maps (`timeGridCellKey`, `chipKey`, `timeGridChipCtrlKey`,
  `timelineBarCtrlKey`).
- **View models** — day/week columns (per-resource split), month, timeline,
  agenda and year builders, aria-label and text formatters.
- **`OgeSchedulerCore`** — the shell machine: the working set, `DataSource`
  loads and write-through, the cancelable CRUD pipelines, occurrence vs.
  series routing, the editor model mapping and default form items,
  navigation, the built-in context menu state, live-region announcements
  and the reminder scan. It takes an `OgeReactivityAdapter` (signals in
  Angular, a versioned store in React), so its semantics exist once.
- **Config** — `OGE_DEFAULT_SCHEDULER_CONFIG`, the full
  `OgeSchedulerMessages` catalog and `resolveOgeSchedulerConfig`.

Every module with a decision in it has a spec beside it; `src/index.spec.ts`
guards the barrel, which is both render layers' import surface.

## License

Commercial — see [LICENSE](LICENSE).
