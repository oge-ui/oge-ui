// Hand-compiled from packages/gantt/src/lib/** — keep in sync with the
// source TSDoc.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_GANTT_API: ApiSections = {
  properties: [
    {
      title: 'Data',
      entries: [
        {
          name: 'tasks',
          type: 'readonly T[]',
          default: '[]',
          description:
            'Task items — a plain array, copied into an internal working set; the input is never mutated. Edits surface through the past-tense events.',
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
          type: 'readonly { id, text, color? }[]',
          default: '[]',
          description:
            'Resource choices: labels next to the bars and the assignment select in the task dialog.',
        },
        {
          name: 'resourceIdExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'resourceId'",
          description: "The task's assigned resource id field.",
        },
      ],
    },
    {
      title: 'Appearance & behavior',
      entries: [
        {
          name: 'scaleType',
          type: "'hours' | 'days' | 'weeks' | 'months'",
          default: "'days'",
          description:
            'Timeline scale — calendar-true ticks (real month lengths, DST-safe). Two-way (<code>[(scaleType)]</code>); the toolbar zoom and Ctrl+wheel write it.',
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
            'Initial width (px) of the task pane; the splitter between the panes drags.',
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
          name: 'stripLines',
          type: 'readonly OgeGanttStripLine[]',
          default: '[]',
          description:
            'Vertical markers: <code>{ start, end?, label?, color? }</code> — a line without <code>end</code>, a shaded range with it (dx parity).',
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
            'BCP 47 locale for every <code>Intl</code> format; defaults to the config locale, then the browser locale.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeGanttMessages&gt;',
          default: '{}',
          description:
            'Per-instance message overrides, merged over the DI config per top-level block.',
        },
        {
          name: 'selectedTaskKey',
          type: 'RowKey | null',
          default: 'null',
          description:
            'The selected task. Two-way (<code>[(selectedTaskKey)]</code>).',
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
            '<strong>Display-only shorthand</strong>: equivalent to <code>editingEnabled=false</code>, hides every editing affordance.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'insertTask(taskData) / updateTask(taskData, patch) / deleteTask(taskData)',
          type: 'void',
          description:
            'Programmatic CRUD through the same cancelable pipelines as interactive editing — one undo step each.',
        },
        {
          name: 'insertDependency(predecessorData, successorData, type?) / deleteDependency(dependencyData)',
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
            'Steps the scale (hours ⇄ days ⇄ weeks ⇄ months) / picks the scale that fits the whole plan and scrolls to it.',
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
            'Tree expansion control; <code>expandToTask</code> also selects and reveals the row.',
        },
        {
          name: 'showTaskDetailsDialog(taskData?)',
          type: 'void',
          description:
            'Opens the task dialog — edit form for the given task, prefilled create form without one.',
        },
        {
          name: 'focus()',
          type: 'void',
          description: 'Focuses the task tree (roving row).',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Editing (cancelable pipeline)',
      entries: [
        {
          name: 'taskInserting / taskUpdating / taskDeleting',
          type: 'OgeGanttTask*ingEvent&lt;T&gt;',
          description:
            'Cancelable pre-events — set <code>cancel = true</code> to veto before the store changes.',
        },
        {
          name: 'taskInserted / taskUpdated / taskDeleted',
          type: 'OgeGanttTask*edEvent&lt;T&gt;',
          description: 'Fired only for applied changes — persist from these.',
        },
        {
          name: 'dependencyInserting / dependencyDeleting',
          type: 'OgeGanttDependency*ingEvent',
          description:
            'Cancelable link pre-events; inserting carries <code>predecessorKey</code>, <code>successorKey</code> and <code>type</code>.',
        },
        {
          name: 'dependencyInserted / dependencyDeleted',
          type: 'OgeGanttDependency*edEvent&lt;D&gt;',
          description: 'Applied link changes.',
        },
        {
          name: 'taskEditDialogShowing',
          type: 'OgeGanttDialogShowingEvent&lt;T&gt;',
          description:
            'Cancelable, before the task dialog opens; replace <code>formItems</code> to customize the form (dx <code>onTaskEditDialogShowing</code> parity).',
        },
      ],
    },
    {
      title: 'Interaction',
      entries: [
        {
          name: 'taskClick / taskDblClick / taskContextMenu',
          type: 'OgeGanttTaskClickEvent&lt;T&gt;',
          description:
            'Bar/row pointer events with the normalized task and the raw <code>MouseEvent</code> — build your own context menu (pairs with <code>&#64;oge-ui/overlay</code>).',
        },
        {
          name: 'selectionChanged',
          type: 'OgeGanttSelectionChangedEvent&lt;T&gt;',
          description:
            'Single-row selection changed (task or <code>null</code>).',
        },
        {
          name: 'scaleTypeChange / selectedTaskKeyChange',
          type: 'OgeGanttScaleType / RowKey | null',
          description: 'The two-way model outputs.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeGanttTask&lt;T&gt;',
          type: 'interface',
          description:
            'The normalized task — the payload of events and templates: <code>key</code>, <code>parentKey</code>, <code>source</code> (the original item), <code>title</code>, <code>start</code>/<code>end</code>, <code>progress</code>, <code>color</code>, baseline dates, <code>isSummary</code>/<code>isMilestone</code> and <code>level</code>.',
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
          name: 'OgeGanttTaskTitlePosition',
          type: "'inside' | 'outside' | 'none'",
          description: 'Task title placement relative to the bar.',
        },
        {
          name: '[ogeGanttTaskTemplate]',
          type: 'structural directive (OgeGanttTaskTemplate)',
          description:
            "Replaces the bar's title content; context <code>OgeGanttTaskTemplateContext</code>: <code>{ $implicit: OgeGanttTask&lt;T&gt; }</code>.",
        },
      ],
    },
  ],
};

export const OGE_GANTT_CONFIG_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'provideOgeGanttConfig(config)',
          type: 'Provider',
          description:
            'Configures every Gantt below the provider (<code>OgeGanttConfigInput</code>); shallow merge over <code>OGE_DEFAULT_GANTT_CONFIG</code> per top-level key — a partial <code>messages</code> replaces whole nested blocks. The token is <code>OGE_GANTT_CONFIG</code> (<code>OgeGanttConfig</code>).',
        },
        {
          name: 'messages',
          type: 'OgeGanttMessages',
          description:
            'Every user-facing string, aria labels included: <code>toolbar</code> (<code>OgeGanttToolbarMessages</code>), <code>columns</code> (<code>OgeGanttColumnMessages</code>), <code>dialog</code> (<code>OgeGanttDialogMessages</code>), <code>grid</code> (<code>OgeGanttGridMessages</code>, aria templates with <code>{token}</code> placeholders) and <code>announcements</code> (<code>OgeGanttAnnouncementMessages</code>, live-region templates). Defaults: <code>OGE_DEFAULT_GANTT_MESSAGES</code>.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'BCP 47 locale for every <code>Intl</code> format in scope; a per-instance <code>[locale]</code> input wins.',
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
