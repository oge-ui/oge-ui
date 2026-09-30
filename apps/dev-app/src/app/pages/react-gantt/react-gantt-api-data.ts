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
      ],
    },
    {
      title: 'Appearance & behavior',
      entries: [
        {
          name: 'scaleType / defaultScaleType',
          type: "'hours' | 'days' | 'weeks' | 'months'",
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
            'Task-list columns: built-in fields (<code>title</code>, <code>start</code>, <code>end</code>, <code>duration</code>, <code>progress</code>) or any data field, with optional <code>header</code>, <code>widthPx</code> and <code>format</code>.',
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
          name: 'autoScheduling',
          type: 'boolean',
          default: 'false',
          description:
            'Forward-pass scheduling: moving a predecessor pushes its successors to satisfy FS/SS/FF/SF constraints (never pulls them earlier).',
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
          name: 'insertDependency(predecessorKey, successorKey, type?) / deleteDependency(dependencyData)',
          type: 'void',
          description:
            'Guarded link CRUD; inserting runs the same cycle check as interactive drawing.',
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
            'Steps the scale (hours ⇄ days ⇄ weeks ⇄ months) / picks the finest scale that fits the whole plan. Each reports through <code>onScaleTypeChange</code>.',
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
            'Lazy PDF export (<code>jspdf</code> peer): the chart drawn as vector graphics — scale header, bars with progress fill, summary brackets, milestone diamonds, optional critical-path outlining, multi-page pagination.',
        },
        {
          name: 'exportGanttToPng(handle, options?) / buildGanttCanvas(data, options?)',
          type: '@oge-ui/react-gantt/export-image',
          description:
            'Lazy PNG export with <strong>no dependencies</strong> — plain canvas drawing of the same chart.',
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
            'Single-row selection changed (task or <code>null</code>).',
        },
        {
          name: 'onScaleTypeChange / onSelectedTaskKeyChange',
          type: '(value: OgeGanttScaleType) / (key: RowKey | null) =&gt; void',
          description:
            'The controlled halves of <code>scaleType</code> and <code>selectedTaskKey</code>.',
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
            'The normalized task — the payload of callbacks and render props: <code>key</code>, <code>parentKey</code>, <code>source</code> (the original item), <code>title</code>, <code>start</code>/<code>end</code>, <code>progress</code>, <code>color</code>, baseline dates, <code>isSummary</code>/<code>isMilestone</code> and <code>level</code>.',
        },
        {
          name: 'OgeGanttDependency&lt;D&gt;',
          type: 'interface',
          description:
            'The normalized link: <code>key</code>, <code>source</code>, <code>predecessorKey</code>, <code>successorKey</code>, <code>type</code>.',
        },
        {
          name: 'OgeGanttDependencyType',
          type: "'FS' | 'SS' | 'FF' | 'SF'",
          description:
            'Finish-to-start, start-to-start, finish-to-finish, start-to-finish.',
        },
        {
          name: 'OgeGanttScaleType',
          type: "'hours' | 'days' | 'weeks' | 'months'",
          description: 'The timeline scale units.',
        },
        {
          name: 'OgeGanttColumn',
          type: 'interface',
          description:
            'A task-list column: <code>{ field, header?, widthPx?, format? }</code>.',
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
            '<code>{ id, text, color?, calendar? }</code> — one assignable resource.',
        },
        {
          name: 'OgeGanttExportData&lt;T&gt; / OgeGanttExportColumn&lt;T&gt;',
          type: 'interface',
          description:
            'The exporter snapshot: <code>tasks</code>, <code>columns</code> (header + pane-identical <code>text()</code>), <code>rangeStart</code>/<code>rangeEnd</code>, <code>critical</code> keys and <code>resourceText()</code>.',
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
            'Every user-facing string, aria labels included: <code>toolbar</code>, <code>menu</code>, <code>columns</code>, <code>dialog</code>, <code>grid</code> (aria templates with <code>{token}</code> placeholders) and <code>announcements</code> (live-region templates). Defaults: <code>OGE_DEFAULT_GANTT_MESSAGES</code> — single-sourced in <code>@oge-ui/gantt-engine</code>, identical to the Angular catalog.',
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
