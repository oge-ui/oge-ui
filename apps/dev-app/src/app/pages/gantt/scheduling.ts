import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeGantt,
  type OgeGanttScaleType,
  type OgeGanttSchedulingConflictEvent,
} from '@oge-ui/gantt';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_GANTT_SCHEDULING_SECTIONS,
  ReactGanttSchedulingDemos,
} from '../react-gantt/scheduling';
import {
  CONSTRAINT_COLUMNS,
  DEPTH_CALENDAR,
  LAG_COLUMNS,
  ROADMAP_PRESETS,
  STATUS_DATE,
  roadmapTasks,
  constraintLinks,
  constraintTasks,
  schedulingLinks,
  schedulingTasks,
  trackingLinks,
  trackingTasks,
  type DepthTask,
} from './gantt-depth-data';
import {
  CONSTRAINTS_SNIPPET,
  LAG_SNIPPET,
  SCALES_SNIPPET,
  TRACKING_SNIPPET,
} from './scheduling-snippets';

const SECTIONS = [
  'Lag, lead & slack',
  'Constraints, deadlines & conflicts',
  'Baselines, split tasks & progress line',
  'Quarter & year scales',
] as const;

const BUTTON = 'rounded border px-3 py-1 text-sm';

@Component({
  selector: 'app-gantt-scheduling',
  imports: [DemoCard, DocHeader, OgeGantt, PageToc, ReactGanttSchedulingDemos],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Scheduling & constraints"
      category="Gantt"
      categoryLink="/components/gantt"
      [chips]="[
        'lag / lead',
        'constraints',
        'deadlines',
        'manual tasks',
        'slack',
        'baselines',
      ]"
    >
      <p>
        With <code>autoScheduling</code> the engine re-plans after every edit: a
        forward pass places each task at the earliest date its links (with lag
        or lead) and its constraint allow — pulling tasks earlier as well as
        pushing them later — and a backward pass slides ALAP tasks as late as
        their successors allow. Manually scheduled tasks never move; what cannot
        be satisfied is reported as a scheduling conflict.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-gantt-scheduling-demos />
    } @else {
      <app-demo-card
        [chips]="[
          'lag',
          'lagUnit',
          'totalSlack',
          'freeSlack',
          'scheduleProject()',
        ]"
        heading="Lag, lead & slack"
        description="Links carry a <code>lag</code> (negative = lead) in working days on the <code>workCalendar</code> or in <code>hours</code>, drawn as a badge on the arrow. Double-click an arrow — or select it and press Enter — to edit the type and lag; or type <code>2FS+2d</code> into a Predecessors cell (double-click or F2). The slack columns come from the same backward pass that marks the critical path."
        [code]="lagSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            [class]="button"
            (click)="lagGantt.scheduleProject()"
          >
            Recalculate
          </button>
        </div>
        <oge-gantt
          #lagGantt
          [tasks]="lagTasks"
          [dependencies]="lagLinks"
          [columns]="lagColumns"
          [workCalendar]="calendar"
          [autoScheduling]="true"
          [showCriticalPath]="true"
          [inlineEditing]="true"
          [taskListWidth]="470"
          style="height: 420px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'constraintType',
          'deadline',
          'manuallyScheduled',
          'schedulingConflict',
        ]"
        heading="Constraints, deadlines & conflicts"
        description="SNET and FNET set a floor, MSO and MFO pin a task, SNLT and FNLT cap it, ALAP slides it late. The security review cannot start before the 10th; the frontend overshoots its deadline flag; the manual vendor install ignores its link; go-live must finish on the 21st but its predecessors end later. Each conflict draws a dashed outline and a badge, joins the row's accessible name and arrives in <code>schedulingConflict</code>."
        [code]="constraintsSnippet"
        language="ts"
      >
        <oge-gantt
          [tasks]="constraintTasks"
          [dependencies]="constraintLinks"
          [columns]="constraintColumns"
          [autoScheduling]="true"
          [taskListWidth]="400"
          style="height: 420px"
          (schedulingConflict)="onConflicts($event)"
        />
        <ul class="mt-3 list-disc ps-6 text-sm" aria-live="polite">
          @for (message of conflictMessages(); track message) {
            <li>{{ message }}</li>
          }
        </ul>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'baselines',
          'segments',
          'showProgressLine',
          'showRollups',
          'setBaseline()',
        ]"
        heading="Baselines, split tasks & progress line"
        description="Each task carries two baselines here — pick one in the toolbar chooser (or hide them); <code>setBaseline(i)</code> saves the current dates as baseline <code>i</code>. The data copy is a split task (two pieces). The progress line zig-zags through the status date to how far each started task really is, and the summary bar shows its child milestones."
        [code]="trackingSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            [class]="button"
            (click)="trackingGantt.setBaseline(2)"
          >
            Save as baseline 3
          </button>
        </div>
        <oge-gantt
          #trackingGantt
          [tasks]="trackingTasks"
          [dependencies]="trackingLinks"
          [showProgressLine]="true"
          [statusDate]="statusDate"
          [showRollups]="true"
          [(baselineIndex)]="baseline"
          style="height: 360px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['quarters', 'years', 'zoomPresets']"
        heading="Quarter & year scales"
        description="Quarters (under year headers) and years (under decades) extend the zoom ladder for roadmaps. <code>zoomPresets</code> fills the toolbar's scale chooser — a scale plus an optional tick width and label."
        [code]="scalesSnippet"
        language="ts"
      >
        <oge-gantt
          [tasks]="roadmap"
          [zoomPresets]="presets"
          [(scaleType)]="scale"
          style="height: 300px"
        />
      </app-demo-card>
    }
  `,
})
export class GanttSchedulingPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_GANTT_SCHEDULING_SECTIONS;
  protected readonly button = BUTTON;
  protected readonly lagSnippet = LAG_SNIPPET;
  protected readonly constraintsSnippet = CONSTRAINTS_SNIPPET;
  protected readonly trackingSnippet = TRACKING_SNIPPET;
  protected readonly scalesSnippet = SCALES_SNIPPET;

  protected readonly calendar = DEPTH_CALENDAR;
  protected readonly lagTasks = schedulingTasks();
  protected readonly lagLinks = schedulingLinks();
  protected readonly lagColumns = LAG_COLUMNS;
  protected readonly constraintTasks = constraintTasks();
  protected readonly constraintLinks = constraintLinks();
  protected readonly constraintColumns = CONSTRAINT_COLUMNS;
  protected readonly conflictMessages = signal<string[]>([]);
  protected readonly trackingTasks = trackingTasks();
  protected readonly trackingLinks = trackingLinks();
  protected readonly statusDate = STATUS_DATE;
  protected readonly baseline = signal(0);
  protected readonly roadmap = roadmapTasks();
  protected readonly presets = ROADMAP_PRESETS;
  protected readonly scale = signal<OgeGanttScaleType>('quarters');

  protected onConflicts(
    event: OgeGanttSchedulingConflictEvent<DepthTask>,
  ): void {
    this.conflictMessages.set(
      event.conflicts.map((conflict) => conflict.message),
    );
  }
}
