// Hand-compiled from packages/react/gantt/src/lib/** — keep in sync with the
// source TSDoc. Mirrors `../gantt/gantt-api-data.ts` block for block and member
// for member (`docs-tools:parity` diffs the two).
import type { ApiSections } from '../../shared/api-reference';

export const OGE_REACT_GANTT_API: ApiSections = {
  properties: [
    {
      title: 'Data',
      entries: [
        {
          name: 'tasks',
          type: 'readonly T[]',
          default: '[]',
          description:
            'Task items — a plain array, copied into an internal working set; the prop is never mutated. Edits surface through the past-tense callbacks. A new array reference resets the working set and the undo history.',
        },
        {
          name: 'dependencies',
          type: 'readonly D[]',
          default: '[]',
          description:
            'Dependency links between tasks; same working-set semantics as <code>tasks</code>.',
        },
        {
          name: 'keyExpr / parentKeyExpr / titleExpr / startExpr / endExpr / progressExpr / colorExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default:
            "'id' / 'parentId' / 'title' / 'start' / 'end' / 'progress' / 'color'",
          description:
            'Task field mapping: names (dotted paths reach nested objects) or getter functions. String dates parse as <em>local</em> wall time and write back in the same storage shape.',
        },
        {
          name: 'baselineStartExpr / baselineEndExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'baselineStart' / 'baselineEnd'",
          description:
            'Baseline plan fields — tasks with both render the original plan as a slim bar under the live bar.',
        },
        {
          name: 'dependencyKeyExpr / predecessorKeyExpr / successorKeyExpr / dependencyTypeExpr',
          type: 'string | ((item: D) =&gt; unknown)',
          default: "'id' / 'predecessorId' / 'successorId' / 'type'",
          description:
            "Dependency field mapping. Types are <code>'FS' | 'SS' | 'FF' | 'SF'</code> (dx numeric codes 0–3 also parse); missing type means FS.",
        },
        {
          name: 'resources',
          type: 'readonly OgeGanttResource[]',
          default: '[]',
          description:
            "Resource choices (<code>{ id, text, color?, calendar? }</code>): labels next to the bars, the multi-assignment tag editor in the task dialog, the workload band rows — and a resource's own <code>calendar</code> overrides <code>workCalendar</code> for its tasks (first assigned resource with a calendar wins).",
        },
        {
          name: 'resourceIdExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'resourceId'",
          description:
            "The task's assigned resource field — a single id or an array of ids (multi-assignment). Write-back preserves the storage shape.",
        },
        {
          name: 'dependencyLagExpr / dependencyLagUnitExpr',
          type: 'string | ((item: D) =&gt; unknown)',
          default: "'lag' / 'lagUnit'",
          description:
            "Link <strong>lag / lead</strong>: an amount (negative = lead) and its unit, <code>'days'</code> (working days on a <code>workCalendar</code>) or <code>'hours'</code>. Drawn as a <code>+2d</code> badge on the arrow, honoured by auto-scheduling for all four link types, edited in the dependency editor (double-click an arrow, or Enter on a clicked one) and in the <code>predecessors</code> column (<code>3FS+2d</code>).",
        },
        {
          name: 'manuallyScheduledExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'manuallyScheduled'",
          description:
            'Per-task scheduling mode \u2014 <code>true</code> pins the task: auto-scheduling never moves it, and a link it breaks is reported as a <code>dependency</code> conflict. Bars draw a hatched pattern.',
        },
        {
          name: 'constraintTypeExpr / constraintDateExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'constraintType' / 'constraintDate'",
          description:
            "Task constraint (MS Project vocabulary): <code>'ASAP' | 'ALAP' | 'SNET' | 'SNLT' | 'FNET' | 'FNLT' | 'MSO' | 'MFO'</code> and its date. SNET/FNET set a floor, MSO/MFO pin the task, SNLT/FNLT cap it; links win over SNLT/FNLT/MSO and the violation is reported. ALAP slides the task as late as its successors allow (backward pass). A dated type without a date reads as ASAP.",
        },
        {
          name: 'deadlineExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'deadline'",
          description:
            'Target finish: a flag marker on the bar row, an <em>overdue</em> state (and a <code>deadline</code> conflict) when the task ends later.',
        },
        {
          name: 'segmentsExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'segments'",
          description:
            "Split tasks: <code>[{ start, end }, \u2026]</code> \u2014 two or more pieces draw as separate bars joined by a dotted line; the task spans its pieces. Moving drags every piece; resizing moves the first piece's start or the last piece's end.",
        },
        {
          name: 'baselinesExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'baselines'",
          description:
            'Several baselines: <code>[{ start, end }, \u2026]</code>, index = baseline number \u2212 1. Wins over <code>baselineStartExpr</code>/<code>baselineEndExpr</code> (which remain baseline 1). The toolbar shows a chooser when a task carries more than one.',
        },
        {
          name: 'unitsExpr / effortExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'units' / 'effort'",
          description:
            'Assignment <strong>units</strong> in % (a number for every assigned resource, an array aligned with the resource ids, or an id-keyed map; default 100) and work in hours (<code>effortDriven</code>).',
        },
      ],
    },
    {
      title: 'Appearance & behavior',
      entries: [
        {
          name: 'scaleType / defaultScaleType',
          type: "'hours' | 'days' | 'weeks' | 'months' | 'quarters' | 'years'",
          default: "'days'",
          description:
            'Timeline scale — calendar-true ticks (real month lengths, DST-safe). Controlled when <code>scaleType</code> is set (pair it with <code>onScaleTypeChange</code>); <code>defaultScaleType</code> seeds the uncontrolled state. The toolbar zoom and zoom-to-fit write it.',
        },
        {
          name: 'firstDayOfWeek',
          type: 'number | undefined',
          description:
            'First day of week (0 = Sunday) for the weeks scale; <code>undefined</code> resolves from the locale.',
        },
        {
          name: 'columns',
          type: 'readonly OgeGanttColumn[]',
          default: 'title / start / end / duration',
          description:
            'Task-list columns: built-in fields (<code>title</code>, <code>start</code>, <code>end</code>, <code>duration</code>, <code>progress</code>, <code>wbs</code>, <code>predecessors</code>, <code>totalSlack</code>, <code>freeSlack</code>, <code>constraint</code>, <code>deadline</code>, <code>resources</code>, <code>units</code>, <code>effort</code>) or any data field, with optional <code>header</code>, <code>widthPx</code>, <code>format</code>, <code>editor</code> (<code>false</code> = read-only), <code>allowSorting</code> and <code>frozen</code> (pinned to the start edge, frozen columns lead).',
        },
        {
          name: 'taskListWidth',
          type: 'number',
          default: '360',
          description:
            'Width (px) of the task pane; the splitter between the panes drags it, and a new value re-applies.',
        },
        {
          name: 'taskTitlePosition',
          type: "'inside' | 'outside' | 'none'",
          default: "'inside'",
          description: 'Where the task title renders relative to its bar.',
        },
        {
          name: 'showDependencies / showRowLines',
          type: 'boolean',
          default: 'true',
          description: 'Dependency arrows / horizontal row guides.',
        },
        {
          name: 'showCriticalPath',
          type: 'boolean',
          default: 'false',
          description:
            'Outlines the zero-slack chain (backward-pass latest-finish relaxation over all four link types).',
        },
        {
          name: 'weekendsHighlighted / holidays',
          type: 'boolean / readonly Date[]',
          default: 'true / []',
          description: 'Off-day shading on the days scale.',
        },
        {
          name: 'weekendDays',
          type: 'readonly number[] | undefined',
          description:
            'Weekend days (0 = Sunday … 6 = Saturday) <code>weekendsHighlighted</code> shades. <code>undefined</code> resolves from the locale via <code>Intl.Locale#getWeekInfo()</code> (Friday + Saturday in <code>he-IL</code>), falling back to Saturday + Sunday. A <code>workCalendar</code> takes precedence.',
        },
        {
          name: 'workCalendar',
          type: 'OgeGanttWorkCalendar | null',
          default: 'null',
          description:
            'Work-time calendar (<code>{ workingDays?, holidays? }</code>, 0 = Sunday): shades every off day and makes auto-scheduling roll pushed starts onto working days, preserving durations in <em>working</em> days. The <code>holidays</code> prop merges in; per-resource <code>calendar</code>s override it per task.',
        },
        {
          name: 'showResourceWorkload',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the per-resource workload band under the chart: merged assignment segments per resource, overallocated stretches in the danger color.',
        },
        {
          name: 'stripLines',
          type: 'readonly OgeGanttStripLine[]',
          default: '[]',
          description:
            'Vertical markers: <code>{ start, end?, label?, color? }</code> — a line without <code>end</code>, a shaded range with it.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'BCP 47 locale for every <code>Intl</code> format; defaults to the provider locale, then the browser locale.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeGanttMessages&gt;',
          default: '{}',
          description:
            'Per-instance message overrides, merged over the provider config per top-level block.',
        },
        {
          name: 'rtlEnabled',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            'Right-to-left layout: the task tree moves to the right, the timeline runs from right to left (dependency arrows, baselines, today line and drag tip included), pointer drags and the splitter invert their direction and the Left/Right keys mirror — Left expands a summary, Alt+Shift+Left indents and Ctrl+Left moves a bar later. Unset follows the page: the computed <code>direction</code> or the nearest <code>dir</code> attribute, read after the first render and kept current while it changes; an explicit value also sets <code>dir</code> on the host.',
        },
        {
          name: 'selectedTaskKey / defaultSelectedTaskKey',
          type: 'RowKey | null',
          default: 'null',
          description:
            'The selected task. Controlled when <code>selectedTaskKey</code> is set (pair it with <code>onSelectedTaskKeyChange</code>); <code>defaultSelectedTaskKey</code> seeds the uncontrolled state and is applied at mount.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description:
            'Applied to the <code>.oge-gantt</code> host — give it a height (the body scrolls inside it).',
        },
      ],
    },
    {
      title: 'Scheduling',
      entries: [
        {
          name: 'autoScheduling',
          type: 'boolean',
          default: 'false',
          description:
            'Project-level auto-scheduling: after every edit the engine places each auto-scheduled task at the earliest date its links (with lag) and constraint allow \u2014 <strong>moving tasks earlier as well as later</strong> \u2014 then slides ALAP tasks late (backward pass). Manually scheduled tasks stay put. <code>scheduleProject()</code> runs it on demand.',
        },
        {
          name: 'projectStart',
          type: 'Date | null',
          default: 'null',
          description:
            'Where unlinked ASAP tasks start while auto-scheduling; <code>null</code> keeps their current start (only links and constraints move a task).',
        },
        {
          name: 'baselineIndex / defaultBaselineIndex',
          type: 'number',
          default: '0',
          description:
            'Which baseline renders (0-based); <code>-1</code> hides baselines. Controlled when provided; the toolbar chooser calls <code>onBaselineIndexChange</code>.',
        },
        {
          name: 'showProgressLine / statusDate',
          type: 'boolean / Date | null',
          default: 'false / null',
          description:
            "The progress line: a zig-zag through every visible row from the status date to the point each started task's progress has reached (status date default: today).",
        },
        {
          name: 'showRollups',
          type: 'boolean',
          default: 'false',
          description:
            'Draws every child milestone onto its summary bar (useful when the summary is collapsed).',
        },
        {
          name: 'zoomPresets',
          type: 'readonly OgeGanttZoomPreset[] | null',
          default: 'null',
          description:
            "The toolbar's scale chooser: <code>{ scaleType, tickWidth?, label? }</code> entries; <code>null</code> lists one per scale (hours \u2026 years).",
        },
      ],
    },
    {
      title: 'Task list',
      entries: [
        {
          name: 'inlineEditing',
          type: 'boolean',
          default: 'false',
          description:
            'Edits task-list cells in place: double-click a cell or press <strong>F2</strong> on a row; Enter commits, Escape cancels, Tab / Shift+Tab commit and move along the row. Text, date, number, duration (days) and predecessor (<code>3FS+2d, 5SS</code>) editors; summaries keep their rolled-up dates read-only. Every commit is one undoable update through the cancelable pipeline.',
        },
        {
          name: 'allowSorting',
          type: 'boolean',
          default: 'false',
          description:
            'Header click / Enter sorts (ascending \u2192 descending \u2192 off) \u2014 siblings within each parent, WBS numbers keep the store order. <code>aria-sort</code> on the header.',
        },
        {
          name: 'allowColumnResizing / allowColumnReordering',
          type: 'boolean',
          default: 'false',
          description:
            'Header edge drag or <strong>Alt+Left/Right</strong> (Shift: 1px) resizes a column; header drag or <strong>Ctrl+Shift+Left/Right</strong> moves it. Headers become one roving tab stop (Left/Right between them, Down into the rows).',
        },
        {
          name: 'filterRow / searchPanel',
          type: 'boolean',
          default: 'false',
          description:
            'A filter row under the headers (per column) and a toolbar search box (any column): fold-insensitive \u201ccontains\u201d on the cell text; matches keep their ancestors and open collapsed summaries.',
        },
        {
          name: 'selectionMode',
          type: "'single' | 'multiple'",
          default: "'single'",
          description:
            "<code>'multiple'</code>: Ctrl/Cmd-click toggles, Shift-click and Shift+Up/Down extend, Ctrl+Space toggles, Ctrl+A selects all; Delete, Alt+Shift+Left/Right and the context menu act on the whole selection as <strong>one undo step</strong>.",
        },
        {
          name: 'selectedTaskKeys / defaultSelectedTaskKeys',
          type: 'readonly RowKey[]',
          default: '[]',
          description:
            'Every selected key in multiple mode (the primary row is <code>selectedTaskKey</code>). Controlled when provided.',
        },
      ],
    },
    {
      title: 'Resources & views',
      entries: [
        {
          name: 'effortDriven / hoursPerDay',
          type: 'boolean / number',
          default: 'false / 8',
          description:
            "Effort-driven scheduling: changing a task's resources, units or work recomputes its finish as <code>work \u00f7 (hoursPerDay \u00d7 \u03a3 units)</code> in working days.",
        },
        {
          name: 'showResourceHistogram',
          type: 'boolean',
          default: 'false',
          description:
            "Per-resource utilization rows under the chart: one bar per timeline period (units \u00d7 overlap), a dashed capacity line (<code>OgeGanttResource.capacity</code>, default 100%), over-allocated periods in the danger colour; each row's accessible name summarizes the peak and the periods over capacity.",
        },
        {
          name: 'viewMode / defaultViewMode',
          type: "'tasks' | 'resources'",
          default: "'tasks'",
          description:
            "<code>'resources'</code> regroups the rows by resource (an <em>Unassigned</em> group last); assignment rows edit the real task. The toolbar toggle (shown when <code>resources</code> exist) calls <code>onViewModeChange</code>.",
        },
      ],
    },
    {
      title: 'Editing gates',
      entries: [
        {
          name: 'editingEnabled',
          type: 'boolean',
          default: 'true',
          description:
            'Master editing switch (dx <code>editing.enabled</code>).',
        },
        {
          name: 'allowTaskAdding / allowTaskUpdating / allowTaskDeleting / allowDependencyAdding / allowDependencyDeleting',
          type: 'boolean',
          default: 'true',
          description: 'Per-capability editing gates.',
        },
        {
          name: 'readOnly',
          type: 'boolean',
          default: 'false',
          description:
            '<strong>Display-only shorthand</strong>: equivalent to <code>editingEnabled={false}</code>, hides every editing affordance.',
        },
      ],
    },
    {
      title: 'Render props',
      entries: [
        {
          name: 'renderTask',
          type: '(context: OgeGanttTaskRenderContext&lt;T&gt;) =&gt; ReactNode',
          description:
            "Replaces the bar's title content; context <code>{ task }</code> — the React form of <code>*ogeGanttTaskTemplate</code>.",
        },
        {
          name: 'renderTooltip',
          type: '(context: OgeGanttTooltipRenderContext&lt;T&gt;) =&gt; ReactNode',
          description:
            "Replaces the hover tooltip's content (default: title, dates + duration, progress, resources); context <code>{ task }</code> — the React form of <code>*ogeGanttTooltipTemplate</code>.",
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: 'insertTask(taskData) / updateTask(taskData, patch) / deleteTask(taskData)',
          type: 'void',
          description:
            'Programmatic CRUD through the same cancelable pipelines as interactive editing — one undo step each.',
        },
        {
          name: 'insertDependency(predecessorKey, successorKey, type?, options?) / deleteDependency(dependencyData)',
          type: 'void',
          description:
            'Guarded link CRUD; inserting runs the same cycle check as interactive drawing and takes an optional <code>{ lag, lagUnit }</code>.',
        },
        {
          name: 'undo() / redo()',
          type: 'void',
          description:
            'Snapshot history — every applied edit, drags included, is exactly one step (depth: config <code>undoLimit</code>).',
        },
        {
          name: 'zoomIn() / zoomOut() / zoomToFit()',
          type: 'void',
          description:
            'Steps the scale (hours ⇄ days ⇄ weeks ⇄ months ⇄ quarters ⇄ years) / picks the finest scale that fits the whole plan. Each reports through <code>onScaleTypeChange</code>.',
        },
        {
          name: 'scrollToDate(date)',
          type: 'void',
          description: 'Scrolls the chart so <code>date</code> is in view.',
        },
        {
          name: 'expandAll() / collapseAll() / expandAllToLevel(level) / expandToTask(key)',
          type: 'void',
          description:
            'Tree expansion control; <code>expandToTask</code> also focuses and reveals the row.',
        },
        {
          name: 'showTaskDetailsDialog(taskData?)',
          type: 'void',
          description:
            'Opens the task dialog — edit form for the given task, prefilled create form without one.',
        },
        {
          name: 'indentTask(task) / outdentTask(task)',
          type: 'void',
          description:
            'Reparents through the guarded update pipeline: indent makes the task a child of its previous sibling, outdent lifts it to the grandparent. Also on the built-in context menu and <strong>Alt+Shift+Left/Right</strong> on the focused row.',
        },
        {
          name: 'focus()',
          type: 'void',
          description: 'Focuses the task tree (roving row).',
        },
        {
          name: 'getExportData()',
          type: 'OgeGanttExportData&lt;T&gt;',
          description:
            'Snapshot for the exporters: every task in tree order (collapse ignored), the resolved columns with pane-identical formatting, the chart range and the critical-path keys.',
        },
      ],
    },
    {
      title: 'Scheduling, task list & selection',
      entries: [
        {
          name: 'scheduleProject()',
          type: 'void',
          description:
            'Runs the scheduling engine now \u2014 even with <code>autoScheduling</code> off \u2014 as one undo step.',
        },
        {
          name: 'updateDependency(dependencyData, patch)',
          type: 'void',
          description:
            "Updates a link's fields (type, lag, lag unit\u2026) through the cancelable <code>dependencyUpdating</code> pipeline; auto-scheduling re-runs.",
        },
        {
          name: 'getTaskSlack(key)',
          type: 'OgeGanttSlack | null',
          description:
            'Total and free slack of a leaf task in days (working days on a calendar) \u2014 also the <code>totalSlack</code> / <code>freeSlack</code> columns.',
        },
        {
          name: 'setBaseline(index?)',
          type: 'void',
          description:
            "Saves every leaf task's current dates as baseline <code>index</code> (0-based, default 0) \u2014 MS Project \u201cSet Baseline\u201d, one undo step.",
        },
        {
          name: 'applyZoomPreset(index)',
          type: 'void',
          description: 'Applies a zoom preset (scale + tick width) by index.',
        },
        {
          name: 'sortBy(field, direction?) / setFilter(field, text) / setSearchText(text) / clearFilters()',
          type: 'void',
          description:
            'Programmatic sort (<code>null</code> clears), filter-row text and search.',
        },
        {
          name: 'setColumnWidth(field, widthPx) / moveColumn(field, toIndex)',
          type: 'void',
          description:
            'Column width (clamped 40\u2013600px) and order \u2014 the same paths as the header gestures, with their events.',
        },
        {
          name: 'editCell(task, field?)',
          type: 'boolean',
          description:
            'Opens the inline editor on a cell (unset field = the first editable one); <code>false</code> when the cell is read-only.',
        },
        {
          name: 'getSelectedTasks() / selectAll() / clearSelection()',
          type: 'OgeGanttTask&lt;T&gt;[] / void',
          description:
            'The multi-selection in tree order, select every visible task, clear.',
        },
        {
          name: 'deleteTasks(items) / indentTasks(tasks) / outdentTasks(tasks)',
          type: 'void',
          description:
            'Bulk edits \u2014 each one undo step and one plural announcement.',
        },
      ],
    },
    {
      title: 'Export entry points (lazy, optional peers)',
      entries: [
        {
          name: 'exportGanttToExcel(handle, options?) / buildGanttExcelWorkbook(data, options?)',
          type: '@oge-ui/react-gantt/export-excel',
          description:
            "Lazy Excel export (<code>exceljs</code> peer) from the Gantt's <code>ref</code> handle: the task tree as a typed worksheet — indented titles, bold summary rows, real Date cells, an appended resource column. The builder is the same one the Angular entry re-exports.",
        },
        {
          name: 'exportGanttToPdf(handle, options?) / buildGanttPdfDocument(data, options?)',
          type: '@oge-ui/react-gantt/export-pdf',
          description:
            'Lazy PDF export (<code>jspdf</code> peer): the chart drawn as vector graphics — scale header, bars with progress fill, summary brackets, milestone diamonds, optional critical-path outlining, multi-page pagination. Text outside WinAnsi (Turkish <code>ğ ş ı İ</code>, Central European, Greek, Cyrillic) needs a Unicode TrueType <code>font</code> — per export, or once for every PDF via <code>setOgePdfDefaultFont({ family, normal, bold })</code> from <code>@oge-ui/behavior</code>; without one the built-in Helvetica cannot draw it (a dev-mode warning says so).',
        },
        {
          name: 'exportGanttToPng(handle, options?) / buildGanttCanvas(data, options?)',
          type: '@oge-ui/react-gantt/export-image',
          description:
            'Lazy PNG export with <strong>no dependencies</strong> — plain canvas drawing of the same chart.',
        },
        {
          name: 'exportGanttToMsProject(handle, options?) / importMsProjectXml(xml)',
          type: '@oge-ui/react-gantt/export-msproject',
          description:
            'MS Project XML (MSPDI) <strong>without dependencies</strong>: the export writes tasks with WBS, outline levels, manual mode, constraints, deadlines and baselines, links with <code>LinkLag</code>, resources with max units, assignments with units and work, and the calendar (working weekdays + holiday exceptions), then downloads (<code>download: false</code> returns the XML only). The import parses with a small DOM-free reader (no Trusted Types sink, no DTD entities) into plain <code>tasks</code> / <code>dependencies</code> / <code>resources</code> / <code>workCalendar</code> in the default field names \u2014 bind them. Midnight-to-midnight dates map to 08:00\u201317:00 and back, so a round trip is lossless.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Editing (cancelable pipeline)',
      entries: [
        {
          name: 'onTaskInserting / onTaskUpdating / onTaskDeleting',
          type: '(event: OgeGanttTask*ingEvent&lt;T&gt;) =&gt; void',
          description:
            'Cancelable pre-events — set <code>event.cancel = true</code> to veto before the store changes.',
        },
        {
          name: 'onTaskInserted / onTaskUpdated / onTaskDeleted',
          type: '(event: OgeGanttTask*edEvent&lt;T&gt;) =&gt; void',
          description: 'Fired only for applied changes — persist from these.',
        },
        {
          name: 'onDependencyInserting / onDependencyDeleting',
          type: '(event: OgeGanttDependency*ingEvent) =&gt; void',
          description:
            'Cancelable link pre-events; inserting carries <code>predecessorKey</code>, <code>successorKey</code> and <code>type</code>.',
        },
        {
          name: 'onDependencyInserted / onDependencyDeleted',
          type: '(event: OgeGanttDependency*edEvent&lt;D&gt;) =&gt; void',
          description: 'Applied link changes.',
        },
        {
          name: 'onTaskEditDialogShowing',
          type: '(event: OgeGanttDialogShowingEvent&lt;T&gt;) =&gt; void',
          description:
            'Cancelable, before the task dialog opens; replace <code>formItems</code> (React form items, render props allowed) to customize the form.',
        },
      ],
    },
    {
      title: 'Interaction',
      entries: [
        {
          name: 'onTaskClick / onTaskDblClick / onTaskContextMenu',
          type: '(event: OgeGanttTaskClickEvent&lt;T&gt;) =&gt; void',
          description:
            'Bar/row pointer events with the normalized task and the native <code>MouseEvent</code>. Right-click also opens the <strong>built-in context menu</strong> (labels in <code>messages.menu</code>).',
        },
        {
          name: 'onSelectionChanged',
          type: '(event: OgeGanttSelectionChangedEvent&lt;T&gt;) =&gt; void',
          description:
            'Selection changed: <code>task</code> (the primary row, or <code>null</code>) and <code>tasks</code> (every selected task; multiple mode).',
        },
        {
          name: 'onScaleTypeChange / onSelectedTaskKeyChange',
          type: '(value: OgeGanttScaleType) / (key: RowKey | null) =&gt; void',
          description:
            'The controlled halves of <code>scaleType</code> and <code>selectedTaskKey</code>.',
        },
      ],
    },
    {
      title: 'Scheduling & task list',
      entries: [
        {
          name: 'onSchedulingConflict',
          type: 'OgeGanttSchedulingConflictEvent&lt;T&gt;',
          description:
            "The conflict set changed (also when it empties): <code>conflicts</code> with the task, the <code>kind</code> (<code>'dependency' | 'constraint' | 'deadline'</code>), the violated link / constraint / date and a readable <code>message</code>. Conflicted bars draw a dashed danger outline and a <code>!</code> badge; their row labels name the conflict.",
        },
        {
          name: 'onDependencyUpdating / onDependencyUpdated',
          type: 'OgeGanttDependencyUpdat*Event&lt;D&gt;',
          description:
            'Cancelable link update (type / lag) and its applied twin.',
        },
        {
          name: 'onSortChanged / onColumnResized / onColumnReordered',
          type: 'OgeGanttSortChangedEvent / OgeGanttColumnResizedEvent / OgeGanttColumnReorderedEvent',
          description:
            'Task-list state changes: <code>{ field, direction }</code> (<code>null</code> = cleared), <code>{ field, widthPx }</code>, <code>{ field, fromIndex, toIndex }</code>.',
        },
        {
          name: 'onSelectedTaskKeysChange / onBaselineIndexChange / onViewModeChange',
          type: 'readonly RowKey[] / number / OgeGanttViewMode',
          description:
            'The controlled halves of <code>selectedTaskKeys</code>, <code>baselineIndex</code> and <code>viewMode</code>.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeGanttHandle&lt;T, D&gt;',
          type: 'interface',
          description:
            'The <code>ref</code> handle: every method listed above.',
        },
        {
          name: 'OgeGanttTask&lt;T&gt;',
          type: 'interface',
          description:
            'The normalized task — the payload of events and templates: <code>key</code>, <code>parentKey</code>, <code>source</code> (the original item), <code>title</code>, <code>start</code>/<code>end</code>, <code>progress</code>, <code>color</code>, baseline dates and <code>baselines</code>, <code>isSummary</code>/<code>isMilestone</code>, <code>level</code>, <code>wbs</code>, <code>manuallyScheduled</code>, <code>constraintType</code>/<code>constraintDate</code>, <code>deadline</code>, <code>segments</code>, <code>resourceIds</code> with aligned <code>units</code>, and <code>effort</code>.',
        },
        {
          name: 'OgeGanttDependency&lt;D&gt;',
          type: 'interface',
          description:
            'The normalized link: <code>key</code>, <code>source</code>, <code>predecessorKey</code>, <code>successorKey</code>, <code>type</code>, <code>lag</code> (negative = lead) and <code>lagUnit</code>.',
        },
        {
          name: 'OgeGanttDependencyType',
          type: "'FS' | 'SS' | 'FF' | 'SF'",
          description:
            'Finish-to-start, start-to-start, finish-to-finish, start-to-finish.',
        },
        {
          name: 'OgeGanttScaleType',
          type: "'hours' | 'days' | 'weeks' | 'months' | 'quarters' | 'years'",
          description: 'The timeline scale units.',
        },
        {
          name: 'OgeGanttColumn',
          type: 'interface',
          description:
            'A task-list column: <code>{ field, header?, widthPx?, format?, editor?, allowSorting?, frozen? }</code>.',
        },
        {
          name: 'OgeGanttStripLine',
          type: 'interface',
          description:
            '<code>{ start, end?, label?, color? }</code> — a chart marker line or range.',
        },
        {
          name: 'OgeGanttWorkCalendar',
          type: 'interface',
          description:
            '<code>{ workingDays?, holidays? }</code> — the work-time calendar (0 = Sunday; default working week Monday-Friday).',
        },
        {
          name: 'OgeGanttResource',
          type: 'interface',
          description:
            "<code>{ id, text, color?, calendar?, capacity? }</code> — one assignable resource (the <code>resources</code> item type); <code>capacity</code> (%, default 100) is the histogram's over-allocation line.",
        },
        {
          name: 'OgeGanttExportData&lt;T&gt; / OgeGanttExportColumn&lt;T&gt;',
          type: 'interface',
          description:
            'The exporter snapshot: <code>tasks</code>, <code>columns</code> (header + pane-identical <code>text()</code>), <code>rangeStart</code>/<code>rangeEnd</code>, <code>critical</code> keys, <code>resourceText()</code>, and (optional, for hand-built snapshots) <code>dependencies</code>, <code>resources</code>, <code>workCalendar</code> and <code>slack</code>.',
        },
        {
          name: 'OgeGanttTaskTitlePosition',
          type: "'inside' | 'outside' | 'none'",
          description: 'Task title placement relative to the bar.',
        },
        {
          name: 'OgeGanttTaskRenderContext&lt;T&gt; / OgeGanttTooltipRenderContext&lt;T&gt;',
          type: 'interface',
          description:
            'The render-prop contexts: <code>{ task: OgeGanttTask&lt;T&gt; }</code>.',
        },
        {
          name: 'OgeGanttConstraintType / OgeGanttLagUnit',
          type: "'ASAP' | 'ALAP' | 'SNET' | 'SNLT' | 'FNET' | 'FNLT' | 'MSO' | 'MFO' / 'days' | 'hours'",
          description: 'Constraint types and the lag unit.',
        },
        {
          name: 'OgeGanttSegment / OgeGanttSlack',
          type: 'interface',
          description:
            '<code>{ start, end }</code> (split piece or baseline) / <code>{ totalSlack, freeSlack }</code> in days.',
        },
        {
          name: 'OgeGanttZoomPreset',
          type: 'interface',
          description:
            '<code>{ scaleType, tickWidth?, label? }</code> \u2014 one zoom-chooser entry.',
        },
        {
          name: 'OgeGanttSchedulingConflict&lt;T&gt; / OgeGanttConflictKind',
          type: 'interface',
          description:
            '<code>{ key, task, kind, constraintType?, dependencyKey?, date?, message }</code>.',
        },
        {
          name: 'OgeGanttViewMode / OgeGanttSelectionMode / OgeGanttSortDirection / OgeGanttCellEditorType',
          type: 'string unions',
          description:
            "<code>'tasks' | 'resources'</code>, <code>'single' | 'multiple'</code>, <code>'asc' | 'desc'</code>, <code>'text' | 'number' | 'date' | 'duration' | 'predecessor'</code>.",
        },
      ],
    },
  ],
};

export const OGE_REACT_GANTT_CONFIG_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'OgeGanttConfigProvider',
          type: '<OgeGanttConfigProvider config>',
          description:
            'Configures every Gantt below it (<code>OgeGanttConfigInput</code>); shallow merge over the enclosing provider (or <code>OGE_DEFAULT_GANTT_CONFIG</code>) per top-level key — a partial <code>messages</code> replaces whole nested blocks. A new <code>config</code> object re-resolves, so switching the UI language at runtime is a state change.',
        },
        {
          name: 'useOgeGanttConfig()',
          type: 'OgeGanttConfig',
          description: 'The resolved Gantt config for the current subtree.',
        },
        {
          name: 'messages',
          type: 'OgeGanttMessages',
          description:
            'Every user-facing string, aria labels included: <code>toolbar</code>, <code>menu</code>, <code>columns</code>, <code>dialog</code>, <code>grid</code> (aria templates with <code>{token}</code> placeholders) and <code>announcements</code> (live-region templates, ICU plurals for counts), plus the optional <code>scales</code>, <code>scheduling</code> and <code>dependencyEditor</code> blocks — keys added after 1.1 are optional and filled from English (<code>fillGanttMessages</code>). Defaults: <code>OGE_DEFAULT_GANTT_MESSAGES</code> — single-sourced in <code>@oge-ui/gantt-engine</code>, identical to the Angular catalog.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'BCP 47 locale for every <code>Intl</code> format in scope; a per-instance <code>locale</code> prop wins.',
        },
        {
          name: 'rowHeight',
          type: 'number',
          default: '36',
          description:
            'Fixed row height in px — the invariant behind the row virtualization of both panes.',
        },
        {
          name: 'undoLimit',
          type: 'number',
          default: '50',
          description: 'Undo history depth.',
        },
      ],
    },
  ],
};
