# @oge-ui/react-gantt

React Gantt chart from the OGE UI suite — running the **same** framework-free
engine as the Angular `@oge-ui/gantt` package: the task-tree model, the time
scales, auto-scheduling, the critical path, dependency routing and the whole
controller (`OgeGanttCore`: editing pipelines, undo/redo, virtualization,
keyboard map, gestures) come from
[`@oge-ui/gantt-engine`](https://www.npmjs.com/package/@oge-ui/gantt-engine),
and the markup is the same `.oge-gantt` structure the one shared stylesheet
styles. Nothing here wraps Angular.

> **Commercial.** `@oge-ui/react-gantt` is source-available commercial
> software — free for evaluation and development, with no watermark and no
> runtime license checks; production use requires a paid license. See
> [LICENSE](LICENSE) and <https://ogeui.com/license>.

## What ships

- **`<OgeGantt>`** — a virtualized treegrid task pane and a timeline chart
  sharing one scroll model; summary brackets, milestone diamonds, baseline
  bars, FS/SS/FF/SF dependency arrows, critical path, forward auto-scheduling
  on work calendars (per-resource calendars included), strip lines, resource
  labels and the workload band. Drag a bar to move it (Escape cancels), pull
  its edges to resize, drag the knob to set progress, drag a link dot to draw
  a dependency (cycles are rejected), draw on empty chart space to create a
  task; a built-in context menu and task dialog (`<OgeModal>` +
  `<OgeForm>`); Ctrl+Arrow keyboard move/resize, Alt+Shift+Arrow
  indent/outdent; every edit is one snapshot undo/redo step and every change
  is announced politely.
- **Every Angular input is a prop**, every output an `onX` callback, the two
  models (`scaleType`, `selectedTaskKey`) are controlled/uncontrolled pairs,
  the public methods are on the `ref` handle (`OgeGanttHandle`) and the two
  template slots are the `renderTask` / `renderTooltip` render props.
- **`<OgeGanttConfigProvider>`** — the counterpart of
  `provideOgeGanttConfig()`; every message string and default is
  single-sourced in the engine.
- **Export entry points** — `@oge-ui/react-gantt/export-excel`
  (`exceljs`), `/export-pdf` (`jspdf`) and `/export-image` (no dependency),
  each taking the Gantt's handle.

## Installation

```sh
npm install @oge-ui/react-gantt
```

```tsx
import { OgeGantt } from '@oge-ui/react-gantt';
import '@oge-ui/react-gantt/styles.css';
// the task dialog renders the overlay and forms families' components:
import '@oge-ui/react-overlay/styles.css';
import '@oge-ui/react-forms/styles.css';
import '@oge-ui/react-inputs/styles.css';

export function Plan() {
  return (
    <OgeGantt
      tasks={[
        { id: 1, title: 'Design', start: new Date(2026, 7, 3), end: new Date(2026, 7, 7) },
        { id: 2, title: 'Build', start: new Date(2026, 7, 7), end: new Date(2026, 7, 17) },
      ]}
      dependencies={[{ id: 'a', predecessorId: 1, successorId: 2 }]}
      style={{ height: 480 }}
    />
  );
}
```

Full docs and live demos: <https://ogeui.com/components/gantt> (pick React in
the header switch).
