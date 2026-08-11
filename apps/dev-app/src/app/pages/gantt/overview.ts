import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OgeGantt,
  OgeGanttTaskTemplate,
  OgeGanttTooltipTemplate,
  type OgeGanttScaleType,
  type OgeGanttStripLine,
  type OgeGanttTaskDeletingEvent,
  type OgeGanttTaskUpdatingEvent,
  type OgeGanttWorkCalendar,
} from '@oge-ui/gantt';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  BASELINES_SNIPPET,
  CONFIG_SNIPPET,
  CRITICAL_PATH_SNIPPET,
  EDITING_SNIPPET,
  FIELD_MAPPING_SNIPPET,
  GETTING_STARTED_SNIPPET,
  TEMPLATE_SNIPPET,
  TOOLBAR_SNIPPET,
  WORK_EXPORT_SNIPPET,
} from './overview-snippets';

const SECTIONS = [
  'Getting started',
  'Field mapping',
  'Dependencies & critical path',
  'Baselines, strip lines & resources',
  'Editing pipeline',
  'Toolbar, scales & undo/redo',
  'Work calendar, teams & export',
  'Task template',
  'Configuration & i18n',
] as const;

type DemoTask = Record<string, unknown>;

@Component({
  selector: 'app-gantt-overview',
  imports: [
    DemoCard,
    DocHeader,
    OgeGantt,
    OgeGanttTaskTemplate,
    OgeGanttTooltipTemplate,
    PageToc,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Gantt"
      category="Gantt"
      categoryLink="/components/gantt"
      [chips]="[
        'task tree + timeline',
        'dependencies',
        'critical path',
        'baselines',
        'undo/redo',
      ]"
    >
      <p>
        A project-plan Gantt built on a framework-free kernel: a virtualized
        treegrid task pane and a timeline chart share one scroll model, with
        summary brackets, milestone diamonds, baseline bars, FS/SS/FF/SF
        dependency arrows routed orthogonally, critical-path highlighting,
        forward auto-scheduling and calendar-true hour/day/week/month scales.
        Bars drag to move, resize and set progress — Escape cancels mid-gesture
        — link dots draw dependencies with cycle rejection, and every edit is
        one snapshot undo/redo step. Dates are plain local <code>Date</code>s —
        no date library, no adapter — and every string, aria labels included,
        lives in the messages config. No WAI-ARIA APG gantt pattern exists, so
        the widget composes the treegrid pattern with roving-tabindex rows — the
        focused row drives its bar with
        <strong>Ctrl+Arrow keyboard move/resize</strong> — and a polite live
        region announcing every change.
      </p>
      <p>
        <code>&#64;oge-ui/gantt</code> is a commercial package — free for
        evaluation and development, with no watermark and no runtime license
        checks. See
        <a routerLink="/license" class="text-indigo-600 dark:text-indigo-400"
          >licensing</a
        >
        for the terms.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['task tree', 'milestones', 'drag & resize', 'Escape-cancel']"
      heading="Getting started"
      description="One element, a working Gantt. Drag a bar to move it (Escape cancels mid-drag), pull its edges to resize, drag the bottom knob to set progress, drag a link dot onto another bar to draw a dependency. Double-click a bar or row for the task dialog — or double-click / drag on <em>empty</em> chart space to create a task right there. Right-click opens the built-in menu (edit, new subtask, indent/outdent, delete); Alt+Shift+Left/Right reparents from the keyboard."
      [code]="gettingStartedSnippet"
      language="ts"
    >
      <oge-gantt
        [tasks]="basicTasks"
        [dependencies]="basicLinks"
        style="height: 480px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['keyExpr', 'dotted paths', 'string dates']"
      heading="Field mapping"
      description="Any item shape binds through the <code>*Expr</code> inputs — field names, dotted paths or getter functions — for tasks and dependency links alike. String dates parse as local wall time and write back in the same storage shape after edits."
      [code]="fieldMappingSnippet"
      language="ts"
    >
      <oge-gantt
        [tasks]="mappedTasks"
        [dependencies]="mappedLinks"
        keyExpr="code"
        parentKeyExpr="parentCode"
        titleExpr="subject"
        startExpr="plan.begin"
        endExpr="plan.finish"
        progressExpr="done"
        dependencyKeyExpr="relId"
        predecessorKeyExpr="fromCode"
        successorKeyExpr="toCode"
        style="height: 360px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['showCriticalPath', 'autoScheduling', 'cycle rejection']"
      heading="Dependencies & critical path"
      description="<code>showCriticalPath</code> outlines the zero-slack chain; <code>autoScheduling</code> pushes successors forward whenever a predecessor moves, honoring FS/SS/FF/SF semantics. Drawing a link that would close a cycle is rejected and announced."
      [code]="criticalPathSnippet"
      language="ts"
    >
      <oge-gantt
        [tasks]="criticalTasks"
        [dependencies]="criticalLinks"
        [showCriticalPath]="true"
        [autoScheduling]="true"
        style="height: 420px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['baselines', 'stripLines', 'resources', 'holidays']"
      heading="Baselines, strip lines & resources"
      description="Baseline bars render the original plan under the live bars for slippage at a glance; <code>stripLines</code> mark deadlines (a line) or freeze windows (a range); <code>resources</code> label the bars; weekends shade automatically and <code>holidays</code> join the off-day shading."
      [code]="baselinesSnippet"
      language="ts"
    >
      <oge-gantt
        [tasks]="baselineTasks"
        [stripLines]="baselineStripLines"
        [resources]="people"
        [holidays]="holidays"
        style="height: 380px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['taskUpdating', 'cancel', 'allow flags', 'readOnly']"
      heading="Editing pipeline"
      description="Every mutation runs a cancelable <code>-ing</code> event before the store changes; the past-tense event fires only for applied changes — persist from there. This demo locks finished tasks, asks before deleting, and disables dependency drawing."
      [code]="editingSnippet"
      language="ts"
    >
      <oge-gantt
        [tasks]="editingTasks"
        [allowDependencyAdding]="false"
        (taskUpdating)="protectDone($event)"
        (taskDeleting)="confirmDelete($event)"
        style="height: 360px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['scaleType', 'zoom to fit', 'undo/redo', 'columns']"
      heading="Toolbar, scales & undo/redo"
      description="The toolbar adds tasks, zooms between calendar-true hour/day/week/month scales (Ctrl+wheel on the chart works too), fits the whole plan, expands/collapses the tree and drives snapshot undo/redo — every edit, drags included, is one undo step. The task pane is a virtualized treegrid with configurable <code>columns</code> and a draggable splitter."
      [code]="toolbarSnippet"
      language="ts"
    >
      <oge-gantt
        [tasks]="toolbarTasks"
        [(scaleType)]="scale"
        [columns]="toolbarColumns"
        [taskListWidth]="300"
        style="height: 420px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['workCalendar', 'multi-resource', 'export-excel', 'export-pdf']"
      heading="Work calendar, teams & export"
      description="<code>workCalendar</code> shades every off day (a four-day week here plus a holiday) and auto-scheduling rolls pushed starts onto working days, preserving working-day durations — a resource's own <code>calendar</code> overrides it per task. <code>resourceId</code> may hold an array of ids — the dialog edits assignments with a tag editor, bar labels join the names and <code>showResourceWorkload</code> renders the per-resource utilization band (overallocation in red). Three lazy export entry points: <code>export-excel</code> (exceljs, typed worksheet), <code>export-pdf</code> (jspdf, drawn vector chart) and <code>export-image</code> (dependency-free PNG)."
      [code]="workExportSnippet"
      language="ts"
    >
      <div class="mb-2 flex gap-2">
        <button
          type="button"
          class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          (click)="exportExcel(plan)"
        >
          Export Excel
        </button>
        <button
          type="button"
          class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          (click)="exportPdf(plan)"
        >
          Export PDF
        </button>
        <button
          type="button"
          class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          (click)="exportPng(plan)"
        >
          Export PNG
        </button>
      </div>
      <oge-gantt
        #plan
        [tasks]="workTasks"
        [dependencies]="workLinks"
        [resources]="people"
        [workCalendar]="workCalendarDemo"
        [showResourceWorkload]="true"
        [autoScheduling]="true"
        style="height: 400px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['*ogeGanttTaskTemplate']"
      heading="Task template"
      description="<code>*ogeGanttTaskTemplate</code> replaces the bar's title content and <code>*ogeGanttTooltipTemplate</code> the hover tooltip (default: title, dates + duration, progress, resources) — bar surface, gestures and keyboard semantics stay with the component."
      [code]="templateSnippet"
      language="ts"
    >
      <oge-gantt [tasks]="templateTasks" style="height: 300px">
        <ng-template ogeGanttTaskTemplate let-task>
          <strong>{{ task.title }}</strong>
          <span class="opacity-75"> · {{ task.progress }}%</span>
        </ng-template>
        <ng-template ogeGanttTooltipTemplate let-task>
          <strong>{{ task.title }}</strong>
          <em>{{ task.progress }}% complete</em>
        </ng-template>
      </oge-gantt>
    </app-demo-card>

    <app-demo-card
      [chips]="['provideOgeGanttConfig', 'messages', 'locale']"
      heading="Configuration & i18n"
      description="Every user-facing string, aria labels included, lives in <code>OgeGanttMessages</code> — provide once with <code>provideOgeGanttConfig()</code> or override per instance with <code>[messages]</code>. <code>locale</code> drives every <code>Intl</code> date format; <code>rowHeight</code> and <code>undoLimit</code> are config-level."
      [code]="configSnippet"
      language="ts"
    >
      <oge-gantt [tasks]="configTasks" locale="de" style="height: 300px" />
    </app-demo-card>
  `,
})
export class GanttOverviewPage {
  protected readonly sections = SECTIONS;
  protected readonly gettingStartedSnippet = GETTING_STARTED_SNIPPET;
  protected readonly fieldMappingSnippet = FIELD_MAPPING_SNIPPET;
  protected readonly criticalPathSnippet = CRITICAL_PATH_SNIPPET;
  protected readonly baselinesSnippet = BASELINES_SNIPPET;
  protected readonly editingSnippet = EDITING_SNIPPET;
  protected readonly toolbarSnippet = TOOLBAR_SNIPPET;
  protected readonly workExportSnippet = WORK_EXPORT_SNIPPET;
  protected readonly templateSnippet = TEMPLATE_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly scale = signal<OgeGanttScaleType>('weeks');

  protected readonly basicTasks: DemoTask[] = [
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

  protected readonly basicLinks = [
    { id: 'a', predecessorId: 2, successorId: 3 },
    { id: 'b', predecessorId: 3, successorId: 4 },
  ];

  protected readonly mappedTasks = [
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

  protected readonly mappedLinks = [
    { relId: 1, fromCode: 'T-1', toCode: 'T-2' },
  ];

  protected readonly criticalTasks: DemoTask[] = [
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

  protected readonly criticalLinks = [
    { id: 1, predecessorId: 1, successorId: 2 },
    { id: 2, predecessorId: 2, successorId: 3 },
    { id: 3, predecessorId: 3, successorId: 5 },
    { id: 4, predecessorId: 4, successorId: 5 },
  ];

  protected readonly baselineTasks: DemoTask[] = [
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

  protected readonly baselineStripLines: OgeGanttStripLine[] = [
    { start: new Date(2026, 7, 18), label: 'Go-live', color: '#dc2626' },
    {
      start: new Date(2026, 7, 14),
      end: new Date(2026, 7, 17),
      label: 'Freeze',
    },
  ];

  protected readonly people = [
    { id: 'ada', text: 'Ada', color: '#7c3aed' },
    {
      id: 'grace',
      text: 'Grace',
      color: '#0891b2',
      calendar: { workingDays: [1, 2, 3, 4, 5] },
    },
  ];

  protected readonly holidays = [new Date(2026, 7, 10)];

  protected readonly editingTasks: DemoTask[] = [
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

  protected readonly toolbarColumns = [
    { field: 'title' },
    { field: 'progress' },
    { field: 'owner', header: 'Owner' },
  ] as const;

  protected readonly toolbarTasks: DemoTask[] = [
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

  protected readonly templateTasks: DemoTask[] = [
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

  protected readonly configTasks: DemoTask[] = [
    {
      id: 1,
      title: 'Planung',
      start: new Date(2026, 7, 3),
      end: new Date(2026, 7, 10),
      progress: 25,
    },
  ];

  protected readonly workCalendarDemo: OgeGanttWorkCalendar = {
    workingDays: [1, 2, 3, 4],
    holidays: [new Date(2026, 7, 12)],
  };

  protected readonly workTasks: DemoTask[] = [
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

  protected readonly workLinks = [{ id: 1, predecessorId: 1, successorId: 2 }];

  /** exceljs stays out of the initial bundle — loaded on first click. */
  protected async exportExcel<T extends object, D extends object>(
    gantt: OgeGantt<T, D>,
  ): Promise<void> {
    const { exportGanttToExcel } = await import('@oge-ui/gantt/export-excel');
    await exportGanttToExcel(gantt, { filename: 'plan.xlsx' });
  }

  /** jspdf loads lazily the same way. */
  protected async exportPdf<T extends object, D extends object>(
    gantt: OgeGantt<T, D>,
  ): Promise<void> {
    const { exportGanttToPdf } = await import('@oge-ui/gantt/export-pdf');
    await exportGanttToPdf(gantt, { filename: 'plan.pdf', title: 'Plan' });
  }

  /** PNG needs no third-party library at all — plain canvas drawing. */
  protected async exportPng<T extends object, D extends object>(
    gantt: OgeGantt<T, D>,
  ): Promise<void> {
    const { exportGanttToPng } = await import('@oge-ui/gantt/export-image');
    await exportGanttToPng(gantt, { filename: 'plan.png' });
  }

  protected protectDone(event: OgeGanttTaskUpdatingEvent<DemoTask>): void {
    if ((event.oldData['progress'] as number) === 100) event.cancel = true;
  }

  protected confirmDelete(event: OgeGanttTaskDeletingEvent<DemoTask>): void {
    event.cancel = !confirm('Delete this task?');
  }
}
