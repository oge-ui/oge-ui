# @oge-ui/react-scheduler

> **Commercial package.** Like the Angular `@oge-ui/scheduler`, this
> package is source-available commercial software: free for evaluation,
> development and testing — a paid license is required for production use.
> No watermark, no runtime license checks. See [LICENSE](LICENSE) and
> [ogeui.com/license](https://ogeui.com/license).

React scheduler / event calendar from the OGE UI suite — running the **same**
framework-free engine as the Angular `@oge-ui/scheduler`
([`@oge-ui/scheduler-engine`](https://www.npmjs.com/package/@oge-ui/scheduler-engine):
layout kernels, RRULE expansion, gesture math, keyboard maps, the CRUD and
recurrence core, the message catalog) and the same stylesheet.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular.

## What ships

- **`<OgeScheduler>`** — `'day' | 'week' | 'workWeek' | 'month' | 'agenda' |
'timelineDay' | 'timelineWeek' | 'year'` views with controlled or
  uncontrolled `currentDate` / `currentView`, per-view hour windows,
  `hiddenWeekDays`, `min`/`max` navigation bounds and a toolbar
  date-navigator calendar; an all-day strip; drag-move, edge-resize and
  drag-to-create with slot snapping and mid-gesture Escape-cancel; recurring
  series (documented RFC 5545 subset) with "this appointment or the entire
  series?" editing; resources with color-by-resource and grouped timeline
  rows / day-week columns; reminders; an anchored appointment popup, a
  modal form editor (`@oge-ui/react-forms`) with an `onEditorShowing` hook,
  a built-in context menu; cancelable `onAppointmentAdding` /
  `onAppointmentUpdating` / `onAppointmentDeleting`; three render props
  (`renderAppointment`, `renderCell`, `renderDateHeader`) and an imperative
  handle (`ref`).
- **`<OgeSchedulerConfigProvider>`** — the React counterpart of
  `provideOgeSchedulerConfig()`; every default and every message string is
  single-sourced in the engine.

## Installation

```sh
npm install @oge-ui/react-scheduler
```

Requires React 18 or 19. `@oge-ui/scheduler-engine`, `@oge-ui/react-overlay`
(popup, modal), `@oge-ui/react-inputs` (calendar, editors) and
`@oge-ui/react-forms` (the editor form) come along as regular dependencies.
The components are client components — `'use client'` ships in the published
files.

Import the stylesheets once at your app entry:

```ts
import '@oge-ui/react-scheduler/styles.css';
import '@oge-ui/react-overlay/styles.css';
import '@oge-ui/react-inputs/styles.css';
import '@oge-ui/react-forms/styles.css';
```

## Quick start

```tsx
'use client';

import { useState } from 'react';
import { OgeScheduler } from '@oge-ui/react-scheduler';

export function TeamCalendar() {
  const [date, setDate] = useState(new Date());
  return <OgeScheduler dataSource={appointments} currentDate={date} onCurrentDateChange={setDate} dayStartHour={8} dayEndHour={19} />;
}
```

Binding a plain array never mutates it: edits land in an internal working
set and the past-tense callbacks (`onAppointmentAdded`, …) carry the data to
persist. A `DataSource` with `insert`/`update`/`remove` is written through
and reloaded instead.

## Docs

Live demos and the full API reference: <https://ogeui.com/components/scheduler>
(pick **React** in the header). Machine-readable docs for coding assistants
ship inside the package at `node_modules/@oge-ui/react-scheduler/llms.txt`.

## License

Commercial — see [LICENSE](LICENSE).
