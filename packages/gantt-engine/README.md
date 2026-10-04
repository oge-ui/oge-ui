# @oge-ui/gantt-engine

The framework-free **engine** behind the OGE UI Gantt chart. Plain TypeScript,
shipped as ESM + CJS, with no dependency on Angular, React or any other
framework — the one implementation both render layers run:

- [`@oge-ui/gantt`](https://www.npmjs.com/package/@oge-ui/gantt) — the Angular
  `<oge-gantt>`,
- [`@oge-ui/react-gantt`](https://www.npmjs.com/package/@oge-ui/react-gantt) —
  the React `<OgeGantt>`.

You normally do not install this package yourself: each render package
depends on it and re-exports its public types, so `npm install @oge-ui/gantt`
or `npm install @oge-ui/react-gantt` is the whole setup.

> **Commercial.** Like the Gantt packages themselves, this engine is
> source-available commercial software — free for evaluation and development,
> paid for production. See [LICENSE](LICENSE) and <https://www.ogeui.com/license>.

## What's inside

- **The kernel** — the task-tree model with `*Expr` field mapping (names,
  dotted paths, getters), summary roll-ups and storage-shape-preserving
  write-back (`buildGanttTasks`, `ganttTaskPatch`); dependency links with
  cycle detection; calendar-true hour/day/week/month time scales; forward
  auto-scheduling honoring FS/SS/FF/SF on work calendars; the critical-path
  backward pass; orthogonal dependency routing; resource workload segments;
  the move/resize/progress gesture math.
- **`OgeGanttCore`** — the whole controller: working-set stores and snapshot
  undo/redo, the derived bars/arrows/scale/workload view models, row
  virtualization, the cancelable editing pipelines (task and dependency CRUD,
  indent/outdent, auto-scheduling), the treegrid keyboard map, the pointer
  gestures with Escape-cancel, the context-menu model and every label and
  live-region announcement. It takes an `OgeReactivityAdapter` from
  `@oge-ui/behavior` — Angular backs it with signals, React with a versioned
  store.
- **Config and messages** — `OGE_DEFAULT_GANTT_CONFIG`,
  `OGE_DEFAULT_GANTT_MESSAGES` and `resolveGanttConfig`, which both
  `provideOgeGanttConfig()` and `<OgeGanttConfigProvider>` resolve through.
- **Export builders** — separate entry points with optional peers, so only an
  app that exports pays for the library:
  - `@oge-ui/gantt-engine/export-excel` → `buildGanttExcelWorkbook` (`exceljs`),
  - `@oge-ui/gantt-engine/export-pdf` → `buildGanttPdfDocument` (`jspdf`),
  - `@oge-ui/gantt-engine/export-image` → `buildGanttCanvas` (no dependency).

Every module has a spec beside it; `src/index.spec.ts` guards the barrel, which
is both render layers' import surface.
