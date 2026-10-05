// Hand-compiled from packages/react/scheduler/src/lib/** — keep in sync with
// the source TSDoc.
//
// Mirrors `pages/scheduler/scheduler-api-data.ts` block for block and group
// for group, so the two views read as one page across the switch and the
// parity gate can diff them member by member. What differs is the idiom —
// controlled `currentDate` / `currentView` pairs instead of `model()`,
// `on`-prefixed callbacks instead of outputs, a `ref` handle instead of
// public methods, render props instead of structural directives, a context
// provider instead of DI.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_REACT_SCHEDULER_API: ApiSections = {
  properties: [
    {
      title: 'Data',
      entries: [
        {
          name: 'dataSource',
          type: 'readonly T[] | DataSource&lt;T&gt; | null',
          default: 'null',
          description:
            'Appointment items: a plain array (copied into an internal working set — the prop is never mutated) or any <code>&#64;oge-ui/core</code> <code>DataSource</code>, whose <code>insert</code>/<code>update</code>/<code>remove</code> are used for CRUD when present. Bound before the first paint.',
        },
        {
          name: 'keyExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'id'",
          description:
            'Key field or selector; items without a resolvable key fall back to their index.',
        },
        {
          name: 'textExpr / startDateExpr / endDateExpr / allDayExpr / colorExpr / locationExpr / descriptionExpr / disabledExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'text' / 'startDate' / …",
          description:
            'Field mapping: names (dotted paths reach nested objects) or getter functions. String dates parse as <em>local</em> wall time and write back in the same storage shape.',
        },
        {
          name: 'recurrenceRuleExpr / recurrenceExceptionExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'recurrenceRule' / 'recurrenceException'",
          description:
            'Recurrence fields: rules in the documented RFC 5545 subset expand into occurrence instances in every view; exceptions are comma-separated EXDATE stamps.',
        },
        {
          name: 'reminderExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'reminder'",
          description:
            'Minutes before the start a reminder fires (see <code>onReminderTriggered</code>) — <strong>OGE extra</strong> (Outlook parity).',
        },
        {
          name: 'resources',
          type: 'readonly OgeSchedulerResource[]',
          default: '[]',
          description:
            'Resource kinds (<code>{ fieldExpr, items, label?, useColorAsDefault? }</code>): editor select fields, default appointment colors and timeline rows.',
        },
        {
          name: 'groups',
          type: 'readonly string[]',
          default: '[]',
          description:
            'Resource fields grouping the views, outermost first — <code>[\'roomId\', \'ownerId\']</code> nests owners inside rooms (<strong>multi-level</strong>, nested headers): day/week columns or row blocks, timeline rows with group header rows. Grouped cells prefill every level on create, and drags across columns / rows / blocks reassign them.',
        },
        {
          name: 'groupOrientation',
          type: "'horizontal' | 'vertical' | undefined",
          default: 'undefined',
          description:
            'How grouped resources lay out: side by side, or stacked — day/week <strong>row blocks</strong> (a group label column, every block a full time grid) and the timeline rows. Unset = horizontal for day/week, vertical for the timelines; a view option’s own <code>groupOrientation</code> wins. Horizontal timelines lay the leaves out as blocks of one track.',
        },
        {
          name: 'groupByDate',
          type: 'boolean',
          default: 'true',
          description:
            'Horizontal day/week grouping is date-major (each day split into its resources — the 1.x layout) or, with <code>false</code>, resource-major (each resource’s days side by side, the all-day strip packed per resource).',
        },
        {
          name: 'disabledSlots',
          type: 'OgeSchedulerDisabledSlots | null',
          default: 'null',
          description:
            'Non-bookable slots — a predicate <code>(date, resources) =&gt; boolean</code> or a list of <code>{ startDate, endDate, resources?, recurrenceRule?, text? }</code> ranges (lunch every weekday, a room under maintenance). Rendered <strong>hatched</strong> with <code>aria-disabled</code> and an "unavailable" suffix; create, move, resize, paste and drop are refused there and announced.',
        },
        {
          name: 'recurrenceEditMode',
          type: "'dialog' | 'occurrence' | 'series'",
          default: "'dialog'",
          description:
            'How edits to a recurring occurrence apply: ask per action, always detach the occurrence (EXDATE + standalone copy), or always change the series.',
        },
      ],
    },
    {
      title: 'Date & views',
      entries: [
        {
          name: 'currentDate',
          type: 'Date',
          description:
            'Anchor date of the visible period — controlled when given, with <code>onCurrentDateChange</code>; <code>defaultCurrentDate</code> (today when omitted) seeds the uncontrolled state at mount. Writes clamp into <code>[min, max]</code>.',
        },
        {
          name: 'defaultCurrentDate',
          type: 'Date',
          default: 'new Date()',
          description: 'Uncontrolled initial anchor date.',
        },
        {
          name: 'currentView',
          type: "'day' | 'week' | 'workWeek' | 'month' | 'agenda' | 'timelineDay' | 'timelineWeek' | 'timelineWorkWeek' | 'timelineMonth' | 'timelineYear' | 'year'",
          description:
            'The active view — controlled when given, with <code>onCurrentViewChange</code>. The month and year timelines run at day scale (one column per day, bars snap to days).',
        },
        {
          name: 'defaultCurrentView',
          type: 'OgeSchedulerView',
          default: "'week'",
          description: 'Uncontrolled initial view.',
        },
        {
          name: 'views',
          type: 'readonly (OgeSchedulerView | OgeSchedulerViewOptions)[]',
          default: "['day', 'week', 'month']",
          description:
            'View-switcher entries; option objects override <code>name</code>, <code>dayStartHour</code>, <code>dayEndHour</code>, <code>cellDuration</code> and <code>groupOrientation</code> per view, and <code>intervalCount</code> makes <strong>custom N-day / N-week / N-month views</strong> (<code>{ type: \'day\', intervalCount: 3, name: \'3 days\' }</code>); navigation steps by the whole interval. Entries sharing a type are told apart by the switcher.',
        },
        {
          name: 'showWeekNumbers',
          type: 'boolean',
          default: 'false',
          description:
            'Week numbers in the month rows and the day/week header corner (<code>W32</code>, <code>W32–33</code> for a fortnight); the grid label carries the spoken text.',
        },
        {
          name: 'weekNumberRule',
          type: "'iso' | 'locale'",
          default: "'iso'",
          description:
            'ISO 8601 (Monday-first, 4-day rule) or the locale’s own numbering — the first day of week and <code>Intl.Locale</code> minimal days (US: Sunday-first, the week holding January 1st is week 1).',
        },
        {
          name: 'moreMode',
          type: "'popup' | 'drill'",
          default: "'popup'",
          description:
            'What a month "+N more" does: open a keyboard-accessible <strong>popup list</strong> of the day (Tab-reachable button, focus moves in, Up/Down/Home/End, Enter opens an entry, Escape returns, a "Go to day" action) or drill into the day view.',
        },
        {
          name: 'virtualScrolling',
          type: "boolean | 'auto'",
          default: "'auto'",
          description:
            'Timeline <strong>row virtualization</strong> for many resources — rows render at fixed heights on core’s offset tree, so the window is exact; <code>\'auto\'</code> turns it on above 50 rows. The axis headers stay sticky.',
        },
        {
          name: 'adaptiveView',
          type: 'boolean | { breakpoint?: number; view?: OgeSchedulerView }',
          default: 'false',
          description:
            "Switches the visible view to <code>view</code> (agenda) when the scheduler's <strong>own</strong> width — a <code>ResizeObserver</code>, never the window — drops below <code>breakpoint</code> (600px), and back to the previous view when it grows again. The switch writes <code>currentView</code> like a user pick, on crossings only, so the switcher keeps working at any width and a view picked while narrow wins.",
        },
        {
          name: 'min / max',
          type: 'Date | undefined',
          description:
            'Navigable date bounds: navigation buttons disable at the edges and every date write clamps.',
        },
        {
          name: 'firstDayOfWeek',
          type: 'number | undefined',
          description:
            'First day of week (0 = Sunday); <code>undefined</code> resolves from the locale via <code>Intl.Locale.weekInfo</code>.',
        },
        {
          name: 'weekendDays',
          type: 'readonly number[] | undefined',
          description:
            'Weekend days (0 = Sunday … 6 = Saturday) the day/week, month and timeline views shade and the <code>workWeek</code> view drops. <code>undefined</code> resolves from the locale via <code>Intl.Locale#getWeekInfo()</code> (Friday + Saturday in <code>he-IL</code>), falling back to Saturday + Sunday.',
        },
        {
          name: 'hiddenWeekDays',
          type: 'readonly number[] | undefined',
          description:
            'Weekdays removed from the week views; the <code>workWeek</code> view always drops the weekend on top.',
        },
        {
          name: 'dayStartHour / dayEndHour / cellDuration',
          type: 'number',
          default: '0 / 24 / 30',
          description:
            'Visible hour window and slot raster (minutes) of the time grids.',
        },
        {
          name: 'agendaDuration',
          type: 'number',
          default: '7',
          description: 'Days the agenda view lists from the anchor date.',
        },
        {
          name: 'scrollTime',
          type: 'number | undefined',
          description:
            'Initial scroll position of the day/week body in hours (fractions allowed, e.g. <code>8.5</code>); applied at mount and re-applied on view/period changes.',
        },
        {
          name: 'rtlEnabled',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            'Right-to-left layout: day columns, month cells and the timeline run right-to-left (the first day is the rightmost column), the toolbar chevrons flip, Left/Right (and Ctrl+Left/Right moves) mirror and horizontal drag deltas invert. Unset follows the page — <code>ogeResolveDirection</code> reads the computed <code>direction</code> or the nearest <code>dir</code> attribute after the first render and observes later <code>dir</code> changes; an explicit value also sets <code>dir</code> on the host.',
        },
      ],
    },
    {
      title: 'Behavior',
      entries: [
        {
          name: 'allowAdding / allowUpdating / allowDeleting / allowDragging / allowResizing',
          type: 'boolean',
          default: 'true',
          description: 'Per-capability editing gates.',
        },
        {
          name: 'readOnly',
          type: 'boolean',
          default: 'false',
          description:
            '<strong>Display-only shorthand</strong>: overrides every <code>allow*</code> flag at once and hides the editing affordances. The day/week and month grids then carry <code>aria-readonly="true"</code> (also when every <code>allow*</code> flag is off).',
        },
        {
          name: 'snapDuration',
          type: 'number | undefined',
          description:
            'Drag/resize snap raster in minutes; defaults to <code>cellDuration</code>.',
        },
        {
          name: 'workHours',
          type: 'OgeSchedulerWorkHours | null',
          default: 'null',
          description:
            'Working-hours emphasis: cells outside <code>{ start, end, days? }</code> get the off-hours shading. A resource item’s own <code>workHours</code> / <code>workDays</code> win for its grouped columns, rows and blocks (the innermost level that sets them).',
        },
        {
          name: 'snapToWorkHours',
          type: 'boolean',
          default: 'false',
          description:
            'Clamps timed moves, drag-to-create ranges and drops into the target’s working hours (keeping the length when it fits).',
        },
        {
          name: 'allowOverlap',
          type: 'boolean',
          default: 'true',
          description:
            '<code>false</code> refuses a create / move / resize / paste / drop that overlaps another appointment — on the same resource when grouped, recurring series expanded; the change is cancelled with a visible notice and an announcement.',
        },
        {
          name: 'conflictCheck',
          type: '(appointment: T, conflicts: readonly OgeSchedulerAppointment&lt;T&gt;[]) =&gt; boolean',
          description:
            'Decides overlapping changes: return <code>true</code> to let one land. Wins over <code>allowOverlap</code>.',
        },
        {
          name: 'selectedAppointments',
          type: 'readonly T[]',
          description:
            'The selected items — controlled when given, with <code>onSelectedAppointmentsChange</code>: Ctrl/⌘-click toggles, Shift-click extends over the chip order, a plain click replaces; Ctrl+Space / Shift+Space from the keyboard. Selected chips get an accent ring and a "selected" suffix; Ctrl+C copies the selection.',
        },
        {
          name: 'defaultSelectedAppointments',
          type: 'readonly T[]',
          default: '[]',
          description: 'Uncontrolled initial selection.',
        },
        {
          name: 'undoLimit',
          type: 'number',
          default: '50',
          description:
            'Undo steps kept for Ctrl/⌘+Z and Ctrl/⌘+Y (Ctrl/⌘+Shift+Z). One user action — a move, a paste, a detached occurrence — is one step; an undo replays through the normal cancelable pipelines. <code>0</code> turns undo off.',
        },
        {
          name: 'showAddButton',
          type: 'boolean',
          default: 'true',
          description:
            'Shows the toolbar "new appointment" button (Outlook parity) — creation without double-click; hidden while <code>readOnly</code> or <code>allowAdding={false}</code>.',
        },
        {
          name: 'showAllDayPanel',
          type: 'boolean',
          default: 'true',
          description: 'Shows the all-day strip in the day/week views.',
        },
        {
          name: 'showCurrentTimeIndicator',
          type: 'boolean',
          default: 'true',
          description: "The accent now-line in today's column.",
        },
        {
          name: 'shadeUntilCurrentTime',
          type: 'boolean',
          default: 'false',
          description: "Dims today's column above the now-line.",
        },
        {
          name: 'maxAppointmentsPerCell',
          type: "number | 'auto'",
          default: "'auto'",
          description:
            'Month-view lane budget per cell; the overflow folds into a "+N more" button (see <code>moreMode</code>).',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'BCP 47 locale for every <code>Intl</code> format; defaults to the browser locale.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeSchedulerMessages&gt;',
          description:
            'Per-instance message overrides, merged over <code>&lt;OgeSchedulerConfigProvider&gt;</code> per top-level block.',
        },
        {
          name: 'dateNavigatorText',
          type: '(start: Date, end: Date, view: OgeSchedulerView) =&gt; string',
          description: 'Custom period-title formatter for the toolbar.',
        },
        {
          name: 'renderAppointment',
          type: '(context: OgeAppointmentRenderContext&lt;T&gt;) =&gt; ReactNode',
          description:
            'Replaces the chip content — the React face of <code>*ogeAppointmentTemplate</code>. Context: <code>appointment</code> and <code>view</code>; the colored surface, gestures and keyboard semantics stay with the component.',
        },
        {
          name: 'renderCell',
          type: '(context: OgeSchedulerCellRenderContext) =&gt; ReactNode',
          description:
            '<strong>OGE extra</strong> — rendered inside every empty grid cell; the React face of <code>ogeCellTemplate</code>. Context: <code>date</code>, <code>view</code>, <code>allDay</code>.',
        },
        {
          name: 'renderDateHeader',
          type: '(context: OgeDateHeaderRenderContext) =&gt; ReactNode',
          description:
            '<strong>OGE extra</strong> — replaces the day/week date headers; the React face of <code>ogeDateHeaderTemplate</code>. Context: <code>date</code>, <code>view</code>.',
        },
        {
          name: 'renderResourceHeader',
          type: '(context: OgeResourceHeaderRenderContext) =&gt; ReactNode',
          description:
            'Replaces the grouped resource headers (day/week column headers, vertical group labels, timeline row heads and group rows); the React face of <code>ogeResourceHeaderTemplate</code>. Context: <code>item</code>, <code>resource</code>, <code>level</code>, <code>view</code>.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description: 'Applied to the <code>.oge-scheduler</code> host.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Imperative handle (ref)',
      entries: [
        {
          name: 'addAppointment(appointmentData)',
          type: 'void',
          description:
            'Inserts programmatically through the same cancelable <code>onAppointmentAdding</code> pipeline as interactive creation.',
        },
        {
          name: 'updateAppointment(appointmentData, patch)',
          type: 'void',
          description: 'Applies a patch through the guarded update pipeline.',
        },
        {
          name: 'deleteAppointment(appointmentData)',
          type: 'void',
          description: 'Deletes through the guarded delete pipeline.',
        },
        {
          name: 'showAppointmentPopup(appointmentData?, createNew?)',
          type: 'void',
          description:
            'Opens the editing form — prefilled create form with <code>createNew</code>/no data, edit form otherwise (dx parity: the method opens the <em>form</em>).',
        },
        {
          name: 'hideAppointmentPopup()',
          type: 'void',
          description: 'Closes the editor dialog and the summary popup.',
        },
        {
          name: 'scrollToTime(hours, minutes?)',
          type: 'void',
          description: 'Scrolls the day/week body to the given time of day.',
        },
        {
          name: 'scrollTo(date)',
          type: 'void',
          description:
            'Navigates to <code>date</code> and scrolls to its time of day.',
        },
        {
          name: 'getStartViewDate() / getEndViewDate()',
          type: 'Date',
          description: 'First moment / exclusive end of the visible period.',
        },
        {
          name: 'getDataSource()',
          type: 'readonly T[] | DataSource&lt;T&gt; | null',
          description: 'The bound data source, as given.',
        },
        {
          name: 'focus()',
          type: 'void',
          description: "Focuses the active view's grid (roving cell).",
        },
        {
          name: 'goToday() / navigate(direction)',
          type: 'void',
          description:
            'Toolbar equivalents: jump to today / step one period (respects <code>min</code>/<code>max</code>).',
        },
        {
          name: 'copyAppointments(appointment?) / pasteAppointments(target)',
          type: 'number',
          description:
            'The clipboard (what Ctrl+C on a chip and Ctrl+V on a cell do): copies the selection — or <code>appointment</code> when it is not part of it — and pastes so the earliest copy starts at <code>target.date</code> (<code>{ date, allDay, values }</code>), keys dropped, a grouped target’s resources applied, each copy through the guarded insert pipeline, all as one undo step. Return the count.',
        },
        {
          name: 'clearSelection()',
          type: 'void',
          description: 'Empties the selection.',
        },
        {
          name: 'undo() / redo()',
          type: 'boolean',
          description:
            'Reverts / re-applies the last scheduler edit (the Ctrl+Z / Ctrl+Y keys); <code>false</code> when there is none.',
        },
        {
          name: 'canUndo() / canRedo()',
          type: 'boolean',
          description: 'Whether a step is available (as of the last render).',
        },
        {
          name: 'getExportData(range?)',
          type: 'OgeSchedulerExportData&lt;T&gt;',
          description:
            'The export model the <code>/export-*</code> entries read: every appointment (series unexpanded) plus the expanded, chronological rows of <code>range</code> — the visible period by default.',
        },
        {
          name: 'print(options?)',
          type: 'Promise&lt;void&gt;',
          description:
            'Prints the current view: the scheduler cloned with the page’s stylesheets into a hidden frame (scroll areas expanded), then the browser’s print dialog.',
        },
      ],
    },
    {
      title: 'Import / export (lazy secondary entries)',
      entries: [
        {
          name: 'exportToICalendar(scheduler, options?) / importICalendar(scheduler, text, options?)',
          type: '@oge-ui/react-scheduler/export-ical',
          description:
            '<strong>No dependencies</strong> — RFC 5545 <code>.ics</code> export from the ref handle (downloads unless <code>download: false</code>, returns the text): one <code>VEVENT</code> per appointment with <code>UID</code>, <code>DTSTAMP</code>, <code>DTSTART</code>/<code>DTEND</code> (<code>VALUE=DATE</code> + exclusive end for all-day), <code>RRULE</code>, <code>RDATE</code>, <code>EXDATE</code>, TEXT escaping and 75-octet folding. The import reads <code>DURATION</code>, UTC values, <code>RECURRENCE-ID</code> overrides (folded into the series as EXDATE + a standalone item) and maps every event through the <code>*Expr</code> field names into <code>addAppointment</code>. Floating local time — time zones are a later release.',
        },
        {
          name: 'exportSchedulerToPdf(scheduler, options?) / buildSchedulerPdfDocument(data, options?)',
          type: '@oge-ui/react-scheduler/export-pdf',
          description:
            'Lazy PDF list export (<code>jspdf</code> peer): the period’s appointments grouped by day (time, subject, location, resources), paginated with the header repeated. Text outside WinAnsi needs a Unicode TrueType <code>font</code> — per export, or once via <code>setOgePdfDefaultFont()</code> from <code>@oge-ui/behavior</code>.',
        },
        {
          name: 'exportSchedulerToExcel(scheduler, options?) / buildSchedulerExcelWorkbook(data, options?)',
          type: '@oge-ui/react-scheduler/export-excel',
          description:
            'Lazy Excel list export (<code>exceljs</code> peer): one row per appointment / occurrence with typed Date cells, all-day and recurring columns and one column per resource kind.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Editing (cancelable pipeline)',
      entries: [
        {
          name: 'onAppointmentAdding / onAppointmentUpdating / onAppointmentDeleting',
          type: '(event: OgeSchedulerAppointment*ingEvent&lt;T&gt;) =&gt; void',
          description:
            'Cancelable pre-events — set <code>event.cancel = true</code> to veto before the store changes.',
        },
        {
          name: 'onAppointmentAdded / onAppointmentUpdated / onAppointmentDeleted',
          type: '(event: OgeSchedulerAppointment*edEvent&lt;T&gt;) =&gt; void',
          description:
            'Fired only for applied changes — persist from these when binding plain arrays.',
        },
        {
          name: 'onEditorShowing',
          type: '(event: OgeSchedulerEditorShowingEvent&lt;T&gt;) =&gt; void',
          description:
            'Cancelable, before the editor opens; replace <code>formItems</code> (<code>&lt;OgeForm&gt;</code> item definitions, render props included) to customize the form (dx <code>onAppointmentFormOpening</code> parity).',
        },
      ],
    },
    {
      title: 'Reminders',
      entries: [
        {
          name: 'onReminderTriggered',
          type: '(event: OgeSchedulerReminderEvent&lt;T&gt;) =&gt; void',
          description:
            'Fires once per occurrence when <code>start − reminder</code> minutes is reached (checked about every 30 s while mounted) — <strong>OGE extra</strong>.',
        },
      ],
    },
    {
      title: 'Interaction',
      entries: [
        {
          name: 'onAppointmentClick / onAppointmentDblClick',
          type: '(event: OgeSchedulerAppointmentClickEvent&lt;T&gt;) =&gt; void',
          description:
            'Chip clicks; single click also opens the popup, double click the editor.',
        },
        {
          name: 'onCellClick / onCellDblClick',
          type: '(event: OgeSchedulerCellClickEvent) =&gt; void',
          description:
            'Empty-cell clicks; double click also opens the prefilled create editor.',
        },
        {
          name: 'onAppointmentContextMenu / onCellContextMenu',
          type: '(event: OgeSchedulerAppointmentClickEvent&lt;T&gt; | OgeSchedulerCellClickEvent) =&gt; void',
          description:
            'Right-clicks with full payloads. A <strong>built-in context menu</strong> also opens (chip: edit/delete through the guarded pipelines incl. recurrence scope; cell: new appointment prefilled at that slot — labels in <code>messages.menu</code>); listen to these to add your own entries alongside it.',
        },
        {
          name: 'onRangeSelected',
          type: '(event: OgeSchedulerRangeSelectedEvent) =&gt; void',
          description:
            'A drag-to-create cell-range selection landed; the prefilled create editor opens next.',
        },
        {
          name: 'onAppointmentDropped',
          type: '(event: OgeSchedulerAppointmentDroppedEvent&lt;T&gt;) =&gt; void',
          description:
            'A <code>useOgeSchedulerDraggable</code> item — or another scheduler’s appointment — was dropped in (pointer, touch, or the keyboard twin); the built item went through <code>onAppointmentAdding</code>. Payload: <code>itemData</code>, <code>appointmentData</code>, <code>startDate</code>/<code>endDate</code>/<code>allDay</code>, the slot’s <code>resources</code> and <code>added</code>.',
        },
        {
          name: 'onDragOut',
          type: '(event: OgeSchedulerDragOutEvent&lt;T&gt;) =&gt; void',
          description:
            'An appointment was dragged out of the scheduler and released: <code>appointment</code>, <code>appointmentData</code>, the pointer, the <code>target</code> under it and <code>droppedOnScheduler</code> (another scheduler added a copy) — the app decides whether to remove it here.',
        },
        {
          name: 'onCurrentDateChange / onCurrentViewChange / onSelectedAppointmentsChange',
          type: '(value: Date) =&gt; void / (value: OgeSchedulerView) =&gt; void / (items: readonly T[]) =&gt; void',
          description:
            'The controlled halves of <code>currentDate</code> / <code>currentView</code> / <code>selectedAppointments</code>; they also report uncontrolled changes.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeSchedulerAppointment&lt;T&gt;',
          type: 'interface',
          description:
            'The normalized appointment: <code>key</code>, <code>source</code> (the original item), <code>text</code>, <code>startDate</code>/<code>endDate</code>, <code>allDay</code>, <code>color</code>, <code>description</code>, recurrence fields and <code>disabled</code>.',
        },
        {
          name: 'OgeSchedulerViewOptions',
          type: 'interface',
          description:
            'Per-view overrides: <code>type</code>, <code>name</code>, <code>dayStartHour</code>, <code>dayEndHour</code>, <code>cellDuration</code>, <code>intervalCount</code>, <code>groupOrientation</code>.',
        },
        {
          name: 'OgeSchedulerWorkHours',
          type: 'interface',
          description:
            '<code>{ start, end, days? }</code> — the emphasized working hours.',
        },
        {
          name: 'OgeSchedulerResourceItem',
          type: 'interface',
          description:
            '<code>{ id, text, color?, workHours?, workDays? }</code> — one assignable resource; its own working hours shade its grouped columns / rows.',
        },
        {
          name: 'OgeSchedulerDisabledSlots / OgeSchedulerBlockedRange',
          type: 'type / interface',
          description:
            'A predicate <code>(date, resources) =&gt; boolean</code> or a list of <code>{ startDate, endDate, resources?, recurrenceRule?, text? }</code> — <code>resources</code> limits a range to <code>{ field: id | id[] }</code>.',
        },
        {
          name: 'OgeSchedulerConflictCheck&lt;T&gt;',
          type: 'type',
          description:
            '<code>(appointment, conflicts) =&gt; boolean</code> — <code>true</code> lets an overlapping change land.',
        },
        {
          name: 'OgeSchedulerAppointmentDroppedEvent&lt;T&gt; / OgeSchedulerDragOutEvent&lt;T&gt;',
          type: 'interface',
          description: 'The drag-in / drag-out payloads (see the events).',
        },
        {
          name: 'OgeSchedulerExportData&lt;T&gt;',
          type: 'interface',
          description:
            '<code>{ title, rangeStart, rangeEnd, locale, rows, appointments, fields, resources, messages }</code> — what <code>getExportData()</code> returns and the export builders read.',
        },
        {
          name: 'OgeResourceHeaderRenderContext',
          type: 'interface',
          description:
            '<code>{ item, resource, level, view }</code> — what <code>renderResourceHeader</code> receives.',
        },
        {
          name: 'OgeAppointmentRenderContext&lt;T&gt;',
          type: 'interface',
          description:
            '<code>{ appointment, view }</code> — what <code>renderAppointment</code> receives.',
        },
        {
          name: 'OgeSchedulerCellRenderContext',
          type: 'interface',
          description:
            '<code>{ date, view, allDay }</code> — what <code>renderCell</code> receives.',
        },
        {
          name: 'OgeDateHeaderRenderContext',
          type: 'interface',
          description:
            '<code>{ date, view }</code> — what <code>renderDateHeader</code> receives.',
        },
        {
          name: 'OgeSchedulerHandle&lt;T&gt;',
          type: 'interface',
          description:
            'The <code>ref</code> surface — every method in the table above.',
        },
      ],
    },
  ],
};

export const OGE_REACT_SCHEDULER_DRAGGABLE_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'data',
          type: 'unknown',
          description:
            'The item a drop turns into an appointment — its fields are kept and start / end / all-day plus the slot’s resources are written through the target scheduler’s <code>*Expr</code> field names. Spread the returned props on the element: it becomes a <code>role="button"</code> tab stop.',
        },
        {
          name: 'duration',
          type: 'number | undefined',
          description:
            'Appointment length in minutes; omitted = the target’s cell duration (whole days on day-scale targets).',
        },
        {
          name: 'text',
          type: 'string | undefined',
          description:
            'The label announced on pick-up; defaults to the element’s text.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'Gestures',
          type: 'pointer · touch · keyboard',
          description:
            'Pointer and touch run the shared drag-drop gesture (ghost preview, 300 ms touch hold, Escape cancels) with a live drop preview in the target; the <strong>keyboard / single-pointer twin</strong>: Enter, Space or a click picks the item up (<code>aria-pressed</code>, announced) and Enter or a click on any scheduler cell places it — Escape puts it down.',
        },
      ],
    },
  ],
};

export const OGE_REACT_SCHEDULER_CONFIG_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'OgeSchedulerConfigProvider',
          type: '(props: { config?: OgeSchedulerConfigInput; children?: ReactNode }) =&gt; JSX.Element',
          description:
            'Configures every scheduler below the provider — the React counterpart of Angular’s <code>provideOgeSchedulerConfig()</code>; shallow merge per top-level key (a partial <code>messages</code> replaces whole nested blocks). Nested providers merge over the outer one, and a new <code>config</code> object re-resolves the subtree (switch the UI language at runtime).',
        },
        {
          name: 'useOgeSchedulerConfig()',
          type: '() =&gt; OgeSchedulerConfig',
          description: 'Reads the resolved config of the current subtree.',
        },
        {
          name: 'messages',
          type: 'OgeSchedulerMessages',
          description:
            'Every user-facing string, aria labels included: <code>toolbar</code> (labels, view names, date-navigator), <code>popup</code>, <code>editor</code> (titles, field labels, validation), <code>grid</code> (aria templates with <code>{token}</code> placeholders, "+{count} more") and <code>announcements</code> (live-region templates). Single-sourced in <code>&#64;oge-ui/scheduler-engine</code>, shared with the Angular scheduler.',
        },
        {
          name: 'minAppointmentMinutes',
          type: 'number',
          default: '15',
          description:
            'Minimum rendered chip height in minutes — zero-length reminders stay clickable.',
        },
      ],
    },
  ],
};
