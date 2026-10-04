import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  Fragment,
  createElement,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  OgeGantt,
  OgeGanttConfigProvider,
  type OgeGanttHandle,
  type OgeGanttScaleType,
  type OgeGanttStripLine,
  type OgeGanttTaskDeletingEvent,
  type OgeGanttTaskUpdatingEvent,
  type OgeGanttWorkCalendar,
} from '@oge-ui/react-gantt';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { GANTT_OVERVIEW_DEMOS } from './overview-snippets';
import { loadDocsPdfFont } from '../../shared/pdf-font';

/**
 * TOC of the React view — the same ten sections as the Angular overview, in
 * the same order with the same headings (`docs/REACT-PARITY.md`).
 */
export const REACT_GANTT_OVERVIEW_SECTIONS = [
  'Getting started',
  'Field mapping',
  'Dependencies & critical path',
  'Baselines, strip lines & resources',
  'Editing pipeline',
  'Toolbar, scales & undo/redo',
  'Work calendar, teams & export',
  'Task template',
  'Configuration & i18n',
  'RTL',
] as const;

type DemoTask = Record<string, unknown>;

const basicTasks: DemoTask[] = [
  {
    id: 1,
    title: 'Release 1.0',
    start: new Date(2026, 7, 3),
    end: new Date(2026, 7, 21),
  },
  {
    id: 2,
    parentId: 1,
    title: 'Design',
    start: new Date(2026, 7, 3),
    end: new Date(2026, 7, 7),
    progress: 100,
  },
  {
    id: 3,
    parentId: 1,
    title: 'Implementation',
    start: new Date(2026, 7, 7),
    end: new Date(2026, 7, 17),
    progress: 45,
  },
  {
    id: 4,
    parentId: 1,
    title: 'Ship',
    start: new Date(2026, 7, 21),
    end: new Date(2026, 7, 21),
  },
];
const basicLinks: DemoTask[] = [
  { id: 'a', predecessorId: 2, successorId: 3 },
  { id: 'b', predecessorId: 3, successorId: 4 },
];

const mappedTasks: DemoTask[] = [
  {
    code: 'EPIC-1',
    subject: 'Checkout revamp',
    plan: { begin: '2026-08-03', finish: '2026-08-14' },
  },
  {
    code: 'T-1',
    parentCode: 'EPIC-1',
    subject: 'Payment API',
    plan: { begin: '2026-08-03', finish: '2026-08-07' },
    done: 80,
  },
  {
    code: 'T-2',
    parentCode: 'EPIC-1',
    subject: 'Wallet UI',
    plan: { begin: '2026-08-07', finish: '2026-08-14' },
    done: 20,
  },
];
const mappedLinks: DemoTask[] = [{ relId: 1, fromCode: 'T-1', toCode: 'T-2' }];

const criticalTasks: DemoTask[] = [
  {
    id: 1,
    title: 'Foundation',
    start: new Date(2026, 7, 3),
    end: new Date(2026, 7, 6),
    progress: 100,
  },
  {
    id: 2,
    title: 'Framing',
    start: new Date(2026, 7, 6),
    end: new Date(2026, 7, 12),
    progress: 60,
  },
  {
    id: 3,
    title: 'Electrical',
    start: new Date(2026, 7, 12),
    end: new Date(2026, 7, 15),
  },
  {
    id: 4,
    title: 'Landscaping',
    start: new Date(2026, 7, 6),
    end: new Date(2026, 7, 10),
  },
  {
    id: 5,
    title: 'Inspection',
    start: new Date(2026, 7, 17),
    end: new Date(2026, 7, 18),
  },
];
const criticalLinks: DemoTask[] = [
  { id: 1, predecessorId: 1, successorId: 2 },
  { id: 2, predecessorId: 2, successorId: 3 },
  { id: 3, predecessorId: 3, successorId: 5 },
  { id: 4, predecessorId: 4, successorId: 5 },
];

const baselineTasks: DemoTask[] = [
  {
    id: 1,
    title: 'Data migration',
    start: new Date(2026, 7, 4),
    end: new Date(2026, 7, 11),
    baselineStart: new Date(2026, 7, 3),
    baselineEnd: new Date(2026, 7, 7),
    progress: 70,
    resourceId: 'ada',
  },
  {
    id: 2,
    title: 'Cutover rehearsal',
    start: new Date(2026, 7, 11),
    end: new Date(2026, 7, 14),
    baselineStart: new Date(2026, 7, 10),
    baselineEnd: new Date(2026, 7, 12),
    resourceId: 'grace',
  },
];
const baselineStripLines: OgeGanttStripLine[] = [
  { start: new Date(2026, 7, 18), label: 'Go-live', color: '#dc2626' },
  { start: new Date(2026, 7, 14), end: new Date(2026, 7, 17), label: 'Freeze' },
];
const people = [
  { id: 'ada', text: 'Ada', color: '#7c3aed' },
  {
    id: 'grace',
    text: 'Grace',
    color: '#0891b2',
    calendar: { workingDays: [1, 2, 3, 4, 5] },
  },
];
const holidays = [new Date(2026, 7, 10)];

const editingTasks: DemoTask[] = [
  {
    id: 1,
    title: 'Audit (done — locked)',
    start: new Date(2026, 7, 3),
    end: new Date(2026, 7, 6),
    progress: 100,
  },
  {
    id: 2,
    title: 'Remediation',
    start: new Date(2026, 7, 6),
    end: new Date(2026, 7, 13),
    progress: 30,
  },
];

const toolbarColumns = [
  { field: 'title' },
  { field: 'progress' },
  { field: 'owner', header: 'Owner' },
];
const toolbarTasks: DemoTask[] = [
  {
    id: 1,
    title: 'Discovery',
    start: new Date(2026, 6, 6),
    end: new Date(2026, 6, 24),
    progress: 100,
    owner: 'Ada',
  },
  {
    id: 2,
    title: 'Build',
    start: new Date(2026, 6, 27),
    end: new Date(2026, 8, 4),
    progress: 40,
    owner: 'Grace',
  },
  {
    id: 3,
    title: 'Rollout',
    start: new Date(2026, 8, 7),
    end: new Date(2026, 8, 25),
    owner: 'Ada',
  },
];

const workCalendarDemo: OgeGanttWorkCalendar = {
  workingDays: [1, 2, 3, 4],
  holidays: [new Date(2026, 7, 12)],
};
const workTasks: DemoTask[] = [
  {
    id: 1,
    title: 'Prototype',
    start: new Date(2026, 7, 3),
    end: new Date(2026, 7, 6),
    progress: 80,
    resourceId: ['ada', 'grace'],
  },
  {
    id: 2,
    title: 'Field test',
    start: new Date(2026, 7, 6),
    end: new Date(2026, 7, 11),
    resourceId: 'grace',
  },
];
const workLinks: DemoTask[] = [{ id: 1, predecessorId: 1, successorId: 2 }];

const templateTasks: DemoTask[] = [
  {
    id: 1,
    title: 'Usability study',
    start: new Date(2026, 7, 3),
    end: new Date(2026, 7, 12),
    progress: 55,
    color: '#0f766e',
  },
  {
    id: 2,
    title: 'Findings report',
    start: new Date(2026, 7, 12),
    end: new Date(2026, 7, 17),
    progress: 10,
  },
];

const configTasks: DemoTask[] = [
  {
    id: 1,
    title: 'Planung',
    start: new Date(2026, 7, 3),
    end: new Date(2026, 7, 10),
    progress: 25,
  },
];

const gantt = (props: Parameters<typeof OgeGantt<DemoTask, DemoTask>>[0]) =>
  createElement(OgeGantt<DemoTask, DemoTask>, props);

function ToolbarDemo(): ReactNode {
  const [scale, setScale] = useState<OgeGanttScaleType>('weeks');
  return gantt({
    tasks: toolbarTasks,
    scaleType: scale,
    onScaleTypeChange: setScale,
    columns: toolbarColumns,
    taskListWidth: 300,
    style: { height: 420 },
  });
}

const exportButton =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800';

function WorkExportDemo(): ReactNode {
  const plan = useRef<OgeGanttHandle<DemoTask, DemoTask>>(null);
  // exceljs / jspdf stay out of the initial bundle — loaded on first click
  const exportExcel = async (): Promise<void> => {
    const { exportGanttToExcel } =
      await import('@oge-ui/react-gantt/export-excel');
    if (plan.current)
      await exportGanttToExcel(plan.current, { filename: 'plan.xlsx' });
  };
  const exportPdf = async (): Promise<void> => {
    const { exportGanttToPdf } = await import('@oge-ui/react-gantt/export-pdf');
    if (plan.current) {
      await loadDocsPdfFont(); // Unicode font: Turkish ğ ş ı İ
      await exportGanttToPdf(plan.current, {
        filename: 'plan.pdf',
        title: 'Plan',
      });
    }
  };
  const exportPng = async (): Promise<void> => {
    const { exportGanttToPng } =
      await import('@oge-ui/react-gantt/export-image');
    if (plan.current)
      await exportGanttToPng(plan.current, { filename: 'plan.png' });
  };
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 flex gap-2' },
      createElement(
        'button',
        { type: 'button', className: exportButton, onClick: exportExcel },
        'Export Excel',
      ),
      createElement(
        'button',
        { type: 'button', className: exportButton, onClick: exportPdf },
        'Export PDF',
      ),
      createElement(
        'button',
        { type: 'button', className: exportButton, onClick: exportPng },
        'Export PNG',
      ),
    ),
    gantt({
      ref: plan,
      tasks: workTasks,
      dependencies: workLinks,
      resources: people,
      workCalendar: workCalendarDemo,
      showResourceWorkload: true,
      autoScheduling: true,
      style: { height: 400 },
    }),
  );
}

const protectDone = (event: OgeGanttTaskUpdatingEvent<DemoTask>): void => {
  if ((event.oldData['progress'] as number) === 100) event.cancel = true;
};
const confirmDelete = (event: OgeGanttTaskDeletingEvent<DemoTask>): void => {
  event.cancel = !confirm('Delete this task?');
};

/**
 * The React half of the Gantt overview — the same ten demos as the Angular
 * page, rendered as real React trees inside `/components/gantt` when the
 * reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-gantt-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React Gantt carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles, plus the modal
  // (overlay) and the form + editors (forms, inputs) its task dialog renders.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/gantt/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['task tree', 'milestones', 'drag & resize', 'Escape-cancel']"
      heading="Getting started"
      description="One component, a working Gantt. Drag a bar to move it (Escape cancels mid-drag), pull its edges to resize, drag the bottom knob to set progress, drag a link dot onto another bar to draw a dependency. Double-click a bar or row for the task dialog — or double-click / drag on <em>empty</em> chart space to create a task right there. Right-click opens the built-in menu (edit, new subtask, indent/outdent, delete); Alt+Shift+Left/Right reparents from the keyboard."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['keyExpr', 'dotted paths', 'string dates']"
      heading="Field mapping"
      description="Any item shape binds through the <code>*Expr</code> props — field names, dotted paths or getter functions — for tasks and dependency links alike. String dates parse as local wall time and write back in the same storage shape after edits."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="fieldMapping" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showCriticalPath', 'autoScheduling', 'cycle rejection']"
      heading="Dependencies & critical path"
      description="<code>showCriticalPath</code> outlines the zero-slack chain; <code>autoScheduling</code> pushes successors forward whenever a predecessor moves, honoring FS/SS/FF/SF semantics. Drawing a link that would close a cycle is rejected and announced."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="criticalPath" />
    </app-demo-card>

    <app-demo-card
      [chips]="['baselines', 'stripLines', 'resources', 'holidays']"
      heading="Baselines, strip lines & resources"
      description="Baseline bars render the original plan under the live bars for slippage at a glance; <code>stripLines</code> mark deadlines (a line) or freeze windows (a range); <code>resources</code> label the bars; weekends shade automatically and <code>holidays</code> join the off-day shading."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="baselines" />
    </app-demo-card>

    <app-demo-card
      [chips]="['onTaskUpdating', 'cancel', 'allow flags', 'readOnly']"
      heading="Editing pipeline"
      description="Every mutation runs a cancelable <code>-ing</code> callback before the store changes; the past-tense callback fires only for applied changes — persist from there. This demo locks finished tasks, asks before deleting, and disables dependency drawing."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="editing" />
    </app-demo-card>

    <app-demo-card
      [chips]="['scaleType', 'zoom to fit', 'undo/redo', 'columns']"
      heading="Toolbar, scales & undo/redo"
      description="The toolbar adds tasks, zooms between calendar-true hour/day/week/month scales (Ctrl+wheel on the chart works too), fits the whole plan, expands/collapses the tree and drives snapshot undo/redo — every edit, drags included, is one undo step. The task pane is a virtualized treegrid with configurable <code>columns</code> and a draggable splitter."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="toolbar" />
    </app-demo-card>

    <app-demo-card
      [chips]="['workCalendar', 'multi-resource', 'export-excel', 'export-pdf']"
      heading="Work calendar, teams & export"
      description="<code>workCalendar</code> shades every off day (a four-day week here plus a holiday) and auto-scheduling rolls pushed starts onto working days, preserving working-day durations — a resource's own <code>calendar</code> overrides it per task. <code>resourceId</code> may hold an array of ids — the dialog edits assignments with a tag editor, bar labels join the names and <code>showResourceWorkload</code> renders the per-resource utilization band (overallocation in red). Three lazy export entry points take the Gantt's <code>ref</code> handle: <code>export-excel</code> (exceljs, typed worksheet), <code>export-pdf</code> (jspdf, drawn vector chart) and <code>export-image</code> (dependency-free PNG)."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="workExport" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderTask']"
      heading="Task template"
      description="<code>renderTask</code> replaces the bar's title content and <code>renderTooltip</code> the hover tooltip (default: title, dates + duration, progress, resources) — bar surface, gestures and keyboard semantics stay with the component."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="template" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeGanttConfigProvider', 'messages', 'locale']"
      heading="Configuration & i18n"
      description="Every user-facing string, aria labels included, lives in <code>OgeGanttMessages</code> — provide once with <code>&amp;lt;OgeGanttConfigProvider&amp;gt;</code> or override per instance with <code>messages</code>. <code>locale</code> drives every <code>Intl</code> date format; <code>rowHeight</code> and <code>undoLimit</code> are config-level."
      [code]="demos[8].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>

    <app-demo-card
      [chips]="['rtlEnabled', 'dir', 'mirrored keys']"
      heading="RTL"
      description="<code>rtlEnabled</code> (unset follows the page's <code>dir</code>, live) mirrors the chart: the task tree moves to the right, the timeline runs right to left — dependency arrows, baselines, the today line and drags follow — and the Left/Right keys swap: Left expands a summary, Alt+Shift+Left indents, Ctrl+Left moves a bar later."
      [code]="demos[9].source"
      language="tsx"
    >
      <app-react-host [render]="rtl" />
    </app-demo-card>
  `,
})
export class ReactGanttOverviewDemos {
  protected readonly demos = GANTT_OVERVIEW_DEMOS;

  protected readonly gettingStarted = () =>
    gantt({
      tasks: basicTasks,
      dependencies: basicLinks,
      style: { height: 480 },
    });
  protected readonly fieldMapping = () =>
    gantt({
      tasks: mappedTasks,
      dependencies: mappedLinks,
      keyExpr: 'code',
      parentKeyExpr: 'parentCode',
      titleExpr: 'subject',
      startExpr: 'plan.begin',
      endExpr: 'plan.finish',
      progressExpr: 'done',
      dependencyKeyExpr: 'relId',
      predecessorKeyExpr: 'fromCode',
      successorKeyExpr: 'toCode',
      style: { height: 360 },
    });
  protected readonly criticalPath = () =>
    gantt({
      tasks: criticalTasks,
      dependencies: criticalLinks,
      showCriticalPath: true,
      autoScheduling: true,
      style: { height: 420 },
    });
  protected readonly baselines = () =>
    gantt({
      tasks: baselineTasks,
      stripLines: baselineStripLines,
      resources: people,
      holidays,
      style: { height: 380 },
    });
  protected readonly editing = () =>
    gantt({
      tasks: editingTasks,
      allowDependencyAdding: false,
      onTaskUpdating: protectDone,
      onTaskDeleting: confirmDelete,
      style: { height: 360 },
    });
  protected readonly toolbar = () => createElement(ToolbarDemo);
  protected readonly workExport = () => createElement(WorkExportDemo);
  protected readonly template = () =>
    gantt({
      tasks: templateTasks,
      style: { height: 300 },
      renderTask: ({ task }) =>
        createElement(
          Fragment,
          null,
          createElement('strong', null, task.title),
          createElement(
            'span',
            { className: 'opacity-75' },
            ` · ${task.progress}%`,
          ),
        ),
      renderTooltip: ({ task }) =>
        createElement(
          Fragment,
          null,
          createElement('strong', null, task.title),
          createElement('em', null, `${task.progress}% complete`),
        ),
    });
  protected readonly config = () =>
    createElement(
      OgeGanttConfigProvider,
      { config: { locale: 'de' } },
      gantt({ tasks: configTasks, locale: 'de', style: { height: 300 } }),
    );
  protected readonly rtl = () =>
    gantt({
      className: 'app-gantt-rtl-demo',
      tasks: basicTasks,
      dependencies: basicLinks,
      rtlEnabled: true,
      style: { height: 300 },
    });
}
