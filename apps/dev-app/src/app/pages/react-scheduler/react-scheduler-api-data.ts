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
            'Resource field grouping the views (first entry): timeline rows, and day/week columns split per resource — grouped cells prefill the resource on create, and drags across subcolumns/rows reassign it.',
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
          type: "'day' | 'week' | 'workWeek' | 'month' | 'agenda' | 'timelineDay' | 'timelineWeek' | 'year'",
          description:
            'The active view — controlled when given, with <code>onCurrentViewChange</code>.',
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
            'View-switcher entries; option objects override <code>name</code>, <code>dayStartHour</code>, <code>dayEndHour</code> and <code>cellDuration</code> per view.',
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
            '<strong>Display-only shorthand</strong>: overrides every <code>allow*</code> flag at once and hides the editing affordances.',
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
            'Working-hours emphasis: cells outside <code>{ start, end, days? }</code> get the off-hours shading.',
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
            'Month-view lane budget per cell; the overflow folds into a "+N more" button that drills into the day view.',
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
          name: 'onCurrentDateChange / onCurrentViewChange',
          type: '(value: Date) =&gt; void / (value: OgeSchedulerView) =&gt; void',
          description:
            'The controlled halves of <code>currentDate</code> / <code>currentView</code>; they also report uncontrolled changes.',
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
            'Per-view overrides: <code>type</code>, <code>name</code>, <code>dayStartHour</code>, <code>dayEndHour</code>, <code>cellDuration</code>.',
        },
        {
          name: 'OgeSchedulerWorkHours',
          type: 'interface',
          description:
            '<code>{ start, end, days? }</code> — the emphasized working hours.',
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
