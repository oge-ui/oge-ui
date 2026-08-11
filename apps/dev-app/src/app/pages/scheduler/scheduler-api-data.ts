// Hand-compiled from packages/scheduler/src/lib/** — keep in sync with the
// source TSDoc.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_SCHEDULER_API: ApiSections = {
  properties: [
    {
      title: 'Data',
      entries: [
        {
          name: 'dataSource',
          type: 'readonly T[] | DataSource&lt;T&gt; | null',
          default: 'null',
          description:
            'Appointment items: a plain array (copied into an internal working set — the input is never mutated) or any <code>&#64;oge-ui/core</code> <code>DataSource</code>, whose <code>insert</code>/<code>update</code>/<code>remove</code> are used for CRUD when present.',
        },
        {
          name: 'keyExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'id'",
          description:
            'Key field or selector; items without a resolvable key fall back to their index.',
        },
        {
          name: 'textExpr / startDateExpr / endDateExpr / allDayExpr / colorExpr / descriptionExpr / disabledExpr',
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
            'Reserved recurrence fields — parsed and validated against the documented RFC 5545 subset in v0.1; the expansion engine ships in v0.2.',
        },
      ],
    },
    {
      title: 'Date & views',
      entries: [
        {
          name: 'currentDate',
          type: 'Date',
          default: 'new Date()',
          description:
            'Anchor date of the visible period. Two-way (<code>[(currentDate)]</code>); writes clamp into <code>[min, max]</code>.',
        },
        {
          name: 'currentView',
          type: "'day' | 'week' | 'workWeek' | 'month'",
          default: "'week'",
          description:
            'The active view. Two-way (<code>[(currentView)]</code>).',
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
          name: 'scrollTime',
          type: 'number | undefined',
          description:
            'Initial scroll position of the day/week body in hours (fractions allowed, e.g. <code>8.5</code>); re-applied on view/period changes.',
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
          default: '{}',
          description:
            'Per-instance message overrides, merged over the DI config per top-level block.',
        },
        {
          name: 'dateNavigatorText',
          type: '(start: Date, end: Date, view: OgeSchedulerView) =&gt; string',
          description: 'Custom period-title formatter for the toolbar.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'addAppointment(appointmentData)',
          type: 'void',
          description:
            'Inserts programmatically through the same cancelable <code>appointmentAdding</code> pipeline as interactive creation.',
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
          name: 'appointmentAdding / appointmentUpdating / appointmentDeleting',
          type: 'OgeSchedulerAppointment*ingEvent&lt;T&gt;',
          description:
            'Cancelable pre-events — set <code>cancel = true</code> to veto before the store changes.',
        },
        {
          name: 'appointmentAdded / appointmentUpdated / appointmentDeleted',
          type: 'OgeSchedulerAppointment*edEvent&lt;T&gt;',
          description:
            'Fired only for applied changes — persist from these when binding plain arrays.',
        },
        {
          name: 'editorShowing',
          type: 'OgeSchedulerEditorShowingEvent&lt;T&gt;',
          description:
            'Cancelable, before the editor opens; replace <code>formItems</code> to customize the form (dx <code>onAppointmentFormOpening</code> parity).',
        },
      ],
    },
    {
      title: 'Interaction',
      entries: [
        {
          name: 'appointmentClick / appointmentDblClick',
          type: 'OgeSchedulerAppointmentClickEvent&lt;T&gt;',
          description:
            'Chip clicks; single click also opens the popup, double click the editor.',
        },
        {
          name: 'cellClick / cellDblClick',
          type: 'OgeSchedulerCellClickEvent',
          description:
            'Empty-cell clicks; double click also opens the prefilled create editor.',
        },
        {
          name: 'appointmentContextMenu / cellContextMenu',
          type: 'OgeSchedulerAppointmentClickEvent&lt;T&gt; / OgeSchedulerCellClickEvent',
          description:
            'Right-clicks with full payloads — build your own context menu (pairs with <code>&#64;oge-ui/overlay</code>).',
        },
        {
          name: 'rangeSelected',
          type: 'OgeSchedulerRangeSelectedEvent',
          description:
            'A drag-to-create cell-range selection landed; the prefilled create editor opens next.',
        },
        {
          name: 'currentDateChange / currentViewChange',
          type: 'Date / OgeSchedulerView',
          description: 'The two-way model outputs.',
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
          name: '[ogeAppointmentTemplate]',
          type: 'structural directive',
          description:
            'Replaces the chip content; context <code>{ $implicit: OgeSchedulerAppointment&lt;T&gt;, view }</code>.',
        },
        {
          name: 'OgeSchedulerCellTemplate',
          type: 'structural directive [ogeCellTemplate]',
          description:
            '<strong>OGE extra</strong> — custom empty-cell content; context <code>{ $implicit: Date, view, allDay }</code>.',
        },
        {
          name: 'OgeDateHeaderTemplate',
          type: 'structural directive [ogeDateHeaderTemplate]',
          description:
            '<strong>OGE extra</strong> — custom date-header content; context <code>{ $implicit: Date, view }</code>.',
        },
      ],
    },
  ],
};

export const OGE_SCHEDULER_CONFIG_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'provideOgeSchedulerConfig(config)',
          type: 'Provider',
          description:
            'Configures every scheduler below the provider; shallow merge per top-level key (a partial <code>messages</code> replaces whole nested blocks).',
        },
        {
          name: 'messages',
          type: 'OgeSchedulerMessages',
          description:
            'Every user-facing string, aria labels included: <code>toolbar</code> (labels, view names, date-navigator), <code>popup</code>, <code>editor</code> (titles, field labels, validation), <code>grid</code> (aria templates with <code>{token}</code> placeholders, "+{count} more") and <code>announcements</code> (live-region templates).',
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
