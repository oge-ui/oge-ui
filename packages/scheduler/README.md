# @oge-ui/scheduler

> **Commercial package.** Unlike the rest of the OGE UI suite (MIT), the
> scheduler is source-available commercial software: free for evaluation,
> development and testing — a paid license is required for production use.
> No watermark, no runtime license checks. See [LICENSE](LICENSE) and
> [ogeui.com/license](https://ogeui.com/license).

The only Angular-native scheduler / event calendar: signal-based
`<oge-scheduler>` with day, week and month views, an all-day strip, a pure
framework-free layout kernel (overlap columns, lane packing, "+N more"
overflow), drag-move / resize with Escape-cancel, an anchored appointment
popup and a form-based appointment editor.

Unlike `@oge-ui/bpmn` (deliberately self-contained), this package is a
_consumer_ of the MIT suite by design: the appointment popup comes from
`@oge-ui/overlay`, the editors from `@oge-ui/inputs` and the appointment
form from `@oge-ui/forms` — that composition is the selling point, so the
dependencies are taken instead of rebuilt.

**Views & data**

- `'day' | 'week' | 'workWeek' | 'month'` views with `[(currentDate)]` /
  `[(currentView)]`, per-view hour-window and slot-duration overrides,
  `hiddenWeekDays`, `min`/`max` navigation bounds and a toolbar
  date-navigator calendar (embeds `@oge-ui/inputs`' `OgeCalendar`)
- Planner ergonomics: `workHours` off-hours shading, weekend shading,
  `shadeUntilCurrentTime`, `scrollTime`/`scrollTo(date)`, `snapDuration`
  and a `readOnly` display-only shorthand
- Binds plain arrays or any `@oge-ui/core` `DataSource` (OData, custom);
  field mapping via `startDateExpr` / `endDateExpr` / `textExpr` /
  `allDayExpr` / `colorExpr` / … (dotted paths or getter functions);
  string-dated stores round-trip without changing their storage shape
- Deterministic overlap layout: transitive-overlap clusters with greedy
  column assignment (day/week), shared lane packing for the all-day strip
  and month rows, per-day "+N more" overflow counts
- Recurrence fields (`recurrenceRule` / `recurrenceException`) are parsed
  and validated in v0.1 against a documented RFC 5545 subset (FREQ
  DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL, COUNT ⊕ UNTIL, BYDAY, BYMONTHDAY,
  BYMONTH, WKST); the expansion engine ships in v0.2

**Editing**

- Click-to-create, drag-to-create range selection, drag-move and edge
  resize with slot snapping, a 3px movement threshold and mid-gesture
  Escape-cancel; context-menu events with full payloads
- Anchored appointment popup (edit / delete, with location line) and a
  modal appointment form (`@oge-ui/forms` — subject, location, start/end,
  all-day, color, notes) with an `editorShowing` hook for custom fields;
  toolbar "new appointment" button (`showAddButton`)
- Cancelable `appointmentAdding` / `appointmentUpdating` /
  `appointmentDeleting` events (sync or `Promise`-based)

**Accessibility (honest limits)**

No WAI-ARIA APG pattern covers a scheduler; the widget composes the
calendar-grid pattern instead: the view body is a `role="grid"` with roving
tabindex and arrow/Page/Home/End navigation, appointments form a second tab
stop of `role="button"` chips with keyboard move/resize (Ctrl+Arrow,
Ctrl+Shift+Up/Down) and polite live-region announcements. All strings,
including every aria label, live in `OgeSchedulerMessages`
(`provideOgeSchedulerConfig`).

**Dates** are Intl-only local wall time (house rule: no date library, no
DateAdapter, no TZ database) — RRULE `UNTIL=…Z` stamps are therefore read
as local wall time; that limit is documented rather than half-supported.

Docs: [ogeui.com/components/scheduler](https://ogeui.com/components/scheduler)
· AI reference: [`llms.txt`](llms.txt)
