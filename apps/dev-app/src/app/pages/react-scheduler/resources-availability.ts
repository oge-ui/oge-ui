import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  Fragment,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  OgeScheduler,
  useOgeSchedulerDraggable,
  type OgeSchedulerAppointment,
  type OgeSchedulerAppointmentDroppedEvent,
  type OgeSchedulerHandle,
} from '@oge-ui/react-scheduler';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  BACKLOG_TASKS,
  BLOCKED_SLOTS,
  DEPTH_DATE,
  SHIFT_RESOURCE,
  availabilityAppointments,
  conflictAppointments,
  teamAppointments,
  type DepthAppt,
  type DepthTask,
} from '../scheduler/scheduler-depth-data';
import { SCHEDULER_RESOURCES_AVAILABILITY_DEMOS } from './resources-availability-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_SCHEDULER_RESOURCES_AVAILABILITY_SECTIONS = [
  'Disabled slots & work hours',
  'Conflicts',
  'Drag in from outside',
  'Selection, clipboard & undo',
] as const;

const availabilityData = availabilityAppointments();
const conflictData = conflictAppointments();

const onlyTentative = (
  _appointment: DepthAppt,
  conflicts: readonly OgeSchedulerAppointment<DepthAppt>[],
): boolean => conflicts.every((c) => c.source['tentative'] === true);

const BUTTON = 'rounded border px-2 py-1 disabled:opacity-50';

function AvailabilityDemo(): ReactNode {
  return createElement(OgeScheduler<DepthAppt>, {
    dataSource: availabilityData,
    defaultCurrentDate: DEPTH_DATE,
    defaultCurrentView: 'workWeek',
    views: ['day', 'workWeek', 'timelineWeek'],
    resources: [SHIFT_RESOURCE],
    groups: ['ownerId'],
    disabledSlots: BLOCKED_SLOTS,
    snapToWorkHours: true,
    dayStartHour: 7,
    dayEndHour: 19,
    cellDuration: 60,
    style: { height: 640 },
  });
}

function ConflictsDemo(): ReactNode {
  return createElement(OgeScheduler<DepthAppt>, {
    dataSource: conflictData,
    defaultCurrentDate: DEPTH_DATE,
    defaultCurrentView: 'day',
    allowOverlap: false,
    conflictCheck: onlyTentative,
    dayStartHour: 8,
    dayEndHour: 18,
    style: { height: 560 },
  });
}

function TaskChip({ task }: { task: DepthTask }): ReactNode {
  const drag = useOgeSchedulerDraggable({ data: task, duration: task.minutes });
  return createElement(
    'div',
    {
      ...drag,
      className: `${drag.className} rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-600`,
      style: { borderLeft: `4px solid ${task.color}` },
    },
    `${task.text} · ${task.minutes} min`,
  );
}

function DragInDemo(): ReactNode {
  const [tasks, setTasks] = useState<readonly DepthTask[]>(BACKLOG_TASKS);
  const [lastAction, setLastAction] = useState('');
  const [appointments] = useState<DepthAppt[]>(() => []);
  const dropped = (event: OgeSchedulerAppointmentDroppedEvent<DepthAppt>) => {
    if (!event.added) return;
    const task = event.itemData as DepthTask;
    setTasks((list) => list.filter((t) => t.id !== task.id));
    setLastAction(`Scheduled ${task.text}`);
  };
  return createElement(
    Fragment,
    null,
    createElement(
      'div',
      {
        className: 'mb-3 flex flex-wrap gap-2',
        role: 'group',
        'aria-label': 'Backlog',
      },
      tasks.length
        ? tasks.map((task) => createElement(TaskChip, { key: task.id, task }))
        : createElement(
            'p',
            { className: 'text-sm text-(--oge-muted-color)' },
            'Backlog empty.',
          ),
    ),
    createElement(OgeScheduler<DepthAppt>, {
      dataSource: appointments,
      defaultCurrentDate: DEPTH_DATE,
      defaultCurrentView: 'week',
      dayStartHour: 8,
      dayEndHour: 18,
      onAppointmentDropped: dropped,
      onDragOut: (event) =>
        setLastAction(`Dragged out: ${event.appointment.text}`),
      style: { height: 560 },
    }),
    createElement(
      'p',
      { className: 'mt-2 text-sm', 'aria-live': 'polite' },
      lastAction,
    ),
  );
}

function SelectionDemo(): ReactNode {
  const scheduler = useRef<OgeSchedulerHandle<DepthAppt>>(null);
  const [data] = useState(() => teamAppointments());
  const [selected, setSelected] = useState<readonly DepthAppt[]>([]);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const button = (
    label: string,
    run: () => void,
    disabled = false,
  ): ReactNode =>
    createElement(
      'button',
      {
        type: 'button',
        className: BUTTON,
        disabled,
        onClick: () => {
          run();
          refresh();
        },
      },
      label,
    );
  return createElement(
    Fragment,
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap items-center gap-2 text-sm' },
      button(
        'Undo',
        () => scheduler.current?.undo(),
        !scheduler.current?.canUndo(),
      ),
      button(
        'Redo',
        () => scheduler.current?.redo(),
        !scheduler.current?.canRedo(),
      ),
      button('Clear selection', () => scheduler.current?.clearSelection()),
      createElement('span', null, `${selected.length} selected`),
    ),
    createElement(OgeScheduler<DepthAppt>, {
      ref: scheduler,
      dataSource: data,
      defaultCurrentDate: DEPTH_DATE,
      defaultCurrentView: 'week',
      selectedAppointments: selected,
      onSelectedAppointmentsChange: setSelected,
      onAppointmentAdded: refresh,
      onAppointmentUpdated: refresh,
      onAppointmentDeleted: refresh,
      undoLimit: 100,
      dayStartHour: 8,
      dayEndHour: 18,
      style: { height: 560 },
    }),
  );
}

/**
 * The React half of "Resources & availability" — rendered inside
 * `/components/scheduler/resources-availability` when the reader has chosen
 * React.
 */
@Component({
  selector: 'app-react-scheduler-resources-availability-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/scheduler/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['disabledSlots', 'workHours per resource', 'snapToWorkHours']"
      heading="Disabled slots & work hours"
      description="Lunch is blocked every weekday and Friday is Ada's training day — both hatched, marked <code>aria-disabled</code> and refused for create, move, resize, paste and drop. Ada works 8–14 and Grace 12–18 (Monday to Thursday), so each column shades its own off-hours; <code>snapToWorkHours</code> pulls a move back into them."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="availability" />
    </app-demo-card>

    <app-demo-card
      [chips]="['allowOverlap', 'conflictCheck']"
      heading="Conflicts"
      description="Try dragging the grey hold into the surgery block: <code>allowOverlap</code> off refuses it with a visible notice and a screen-reader announcement. <code>conflictCheck</code> decides case by case — here anything may overlap the tentative hold, nothing the confirmed block."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="conflicts" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'useOgeSchedulerDraggable',
        'onAppointmentDropped',
        'onDragOut',
      ]"
      heading="Drag in from outside"
      description="Drag a backlog task onto the week — or focus it, press Enter and press Enter again on a cell. The drop previews the slot, builds the appointment through <code>onAppointmentAdding</code> and reports it in <code>onAppointmentDropped</code>; dragging a chip out of the scheduler fires <code>onDragOut</code>."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="dragIn" />
    </app-demo-card>

    <app-demo-card
      [chips]="['selectedAppointments', 'Ctrl+C / Ctrl+V', 'undo()']"
      heading="Selection, clipboard & undo"
      description="Ctrl/⌘-click chips to select several (Shift-click extends, Ctrl+Space from the keyboard), Ctrl+C copies them and Ctrl+V on a focused cell pastes the group there. Ctrl+Z / Ctrl+Y undo and redo every edit — moves, resizes, pastes, deletes — and the buttons call the same handle methods."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="selection" />
    </app-demo-card>
  `,
})
export class ReactSchedulerResourcesAvailabilityDemos {
  protected readonly demos = SCHEDULER_RESOURCES_AVAILABILITY_DEMOS;
  protected readonly availability = () => createElement(AvailabilityDemo);
  protected readonly conflicts = () => createElement(ConflictsDemo);
  protected readonly dragIn = () => createElement(DragInDemo);
  protected readonly selection = () => createElement(SelectionDemo);
}
