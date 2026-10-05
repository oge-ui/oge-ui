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
  type OgeGanttHandle,
  type OgeGanttScaleType,
} from '@oge-ui/react-gantt';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  CONSTRAINT_COLUMNS,
  DEPTH_CALENDAR,
  LAG_COLUMNS,
  ROADMAP_PRESETS,
  STATUS_DATE,
  constraintLinks,
  constraintTasks,
  roadmapTasks,
  schedulingLinks,
  schedulingTasks,
  trackingLinks,
  trackingTasks,
  type DepthLink,
  type DepthTask,
} from '../gantt/gantt-depth-data';
import { GANTT_SCHEDULING_DEMOS } from './scheduling-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_GANTT_SCHEDULING_SECTIONS = [
  'Lag, lead & slack',
  'Constraints, deadlines & conflicts',
  'Baselines, split tasks & progress line',
  'Quarter & year scales',
] as const;

const BUTTON = 'rounded border px-3 py-1 text-sm';

const button = (label: string, onClick: () => void): ReactNode =>
  createElement(
    'button',
    { type: 'button', className: BUTTON, onClick },
    label,
  );

function LagDemo(): ReactNode {
  const gantt = useRef<OgeGanttHandle<DepthTask, DepthLink>>(null);
  const [tasks] = useState(() => schedulingTasks());
  const [links] = useState(() => schedulingLinks());
  return createElement(
    Fragment,
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-2' },
      button('Recalculate', () => gantt.current?.scheduleProject()),
    ),
    createElement(OgeGantt<DepthTask, DepthLink>, {
      ref: gantt,
      tasks,
      dependencies: links,
      columns: LAG_COLUMNS,
      workCalendar: DEPTH_CALENDAR,
      autoScheduling: true,
      showCriticalPath: true,
      inlineEditing: true,
      taskListWidth: 470,
      style: { height: 420 },
    }),
  );
}

function ConstraintsDemo(): ReactNode {
  const [tasks] = useState(() => constraintTasks());
  const [links] = useState(() => constraintLinks());
  const [messages, setMessages] = useState<string[]>([]);
  return createElement(
    Fragment,
    null,
    createElement(OgeGantt<DepthTask, DepthLink>, {
      tasks,
      dependencies: links,
      columns: CONSTRAINT_COLUMNS,
      autoScheduling: true,
      taskListWidth: 400,
      style: { height: 420 },
      onSchedulingConflict: (event) =>
        setMessages(event.conflicts.map((conflict) => conflict.message)),
    }),
    createElement(
      'ul',
      { className: 'mt-3 list-disc ps-6 text-sm', 'aria-live': 'polite' },
      messages.map((message) => createElement('li', { key: message }, message)),
    ),
  );
}

function TrackingDemo(): ReactNode {
  const gantt = useRef<OgeGanttHandle<DepthTask, DepthLink>>(null);
  const [tasks] = useState(() => trackingTasks());
  const [links] = useState(() => trackingLinks());
  const [baseline, setBaseline] = useState(0);
  return createElement(
    Fragment,
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-2' },
      button('Save as baseline 3', () => gantt.current?.setBaseline(2)),
    ),
    createElement(OgeGantt<DepthTask, DepthLink>, {
      ref: gantt,
      tasks,
      dependencies: links,
      showProgressLine: true,
      statusDate: STATUS_DATE,
      showRollups: true,
      baselineIndex: baseline,
      onBaselineIndexChange: setBaseline,
      style: { height: 360 },
    }),
  );
}

function ScalesDemo(): ReactNode {
  const [tasks] = useState(() => roadmapTasks());
  const [scale, setScale] = useState<OgeGanttScaleType>('quarters');
  return createElement(OgeGantt<DepthTask>, {
    tasks,
    zoomPresets: ROADMAP_PRESETS,
    scaleType: scale,
    onScaleTypeChange: setScale,
    style: { height: 300 },
  });
}

/**
 * The React half of "Scheduling & constraints" — rendered inside
 * `/components/gantt/scheduling` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-gantt-scheduling-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/gantt/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
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
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="lag" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'constraintType',
        'deadline',
        'manuallyScheduled',
        'onSchedulingConflict',
      ]"
      heading="Constraints, deadlines & conflicts"
      description="SNET and FNET set a floor, MSO and MFO pin a task, SNLT and FNLT cap it, ALAP slides it late. The security review cannot start before the 10th; the frontend overshoots its deadline flag; the manual vendor install ignores its link; go-live must finish on the 21st but its predecessors end later. Each conflict draws a dashed outline and a badge, joins the row's accessible name and arrives in <code>onSchedulingConflict</code>."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="constraints" />
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
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="tracking" />
    </app-demo-card>

    <app-demo-card
      [chips]="['quarters', 'years', 'zoomPresets']"
      heading="Quarter & year scales"
      description="Quarters (under year headers) and years (under decades) extend the zoom ladder for roadmaps. <code>zoomPresets</code> fills the toolbar's scale chooser — a scale plus an optional tick width and label."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="scales" />
    </app-demo-card>
  `,
})
export class ReactGanttSchedulingDemos {
  protected readonly demos = GANTT_SCHEDULING_DEMOS;
  protected readonly lag = () => createElement(LagDemo);
  protected readonly constraints = () => createElement(ConstraintsDemo);
  protected readonly tracking = () => createElement(TrackingDemo);
  protected readonly scales = () => createElement(ScalesDemo);
}
