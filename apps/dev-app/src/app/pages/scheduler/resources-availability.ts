import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  OgeScheduler,
  OgeSchedulerDraggable,
  type OgeSchedulerAppointment,
  type OgeSchedulerAppointmentDroppedEvent,
  type OgeSchedulerDragOutEvent,
} from '@oge-ui/scheduler';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_SCHEDULER_RESOURCES_AVAILABILITY_SECTIONS,
  ReactSchedulerResourcesAvailabilityDemos,
} from '../react-scheduler/resources-availability';
import {
  AVAILABILITY_SNIPPET,
  CONFLICTS_SNIPPET,
  DRAG_IN_SNIPPET,
  SELECTION_SNIPPET,
} from './resources-availability-snippets';
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
} from './scheduler-depth-data';

const SECTIONS = [
  'Disabled slots & work hours',
  'Conflicts',
  'Drag in from outside',
  'Selection, clipboard & undo',
] as const;

@Component({
  selector: 'app-scheduler-resources-availability',
  imports: [
    DemoCard,
    DocHeader,
    OgeScheduler,
    OgeSchedulerDraggable,
    PageToc,
    ReactSchedulerResourcesAvailabilityDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Resources & availability"
      category="Scheduler"
      categoryLink="/components/scheduler"
      [chips]="[
        'disabledSlots',
        'per-resource hours',
        'conflicts',
        'drag-in',
        'undo / redo',
      ]"
    >
      <p>
        Planning rules the scheduler enforces itself: hatched non-bookable
        slots, per-resource working hours with snapping, overlap refusal with a
        custom conflict check, items dragged in from any list, and a
        multi-selection with copy, paste, undo and redo. Every refusal is shown
        and announced, and every gesture has a keyboard path.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-scheduler-resources-availability-demos />
    } @else {
      <app-demo-card
        [chips]="['disabledSlots', 'workHours per resource', 'snapToWorkHours']"
        heading="Disabled slots & work hours"
        description="Lunch is blocked every weekday and Friday is Ada's training day — both hatched, marked <code>aria-disabled</code> and refused for create, move, resize, paste and drop. Ada works 8–14 and Grace 12–18 (Monday to Thursday), so each column shades its own off-hours; <code>snapToWorkHours</code> pulls a move back into them."
        [code]="availabilitySnippet"
        language="ts"
      >
        <oge-scheduler
          [dataSource]="availabilityData"
          [currentDate]="date"
          currentView="workWeek"
          [views]="['day', 'workWeek', 'timelineWeek']"
          [resources]="staff"
          [groups]="['ownerId']"
          [disabledSlots]="blocked"
          [snapToWorkHours]="true"
          [dayStartHour]="7"
          [dayEndHour]="19"
          [cellDuration]="60"
          style="height: 640px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['allowOverlap', 'conflictCheck']"
        heading="Conflicts"
        description="Try dragging the grey hold into the surgery block: <code>allowOverlap</code> off refuses it with a visible notice and a screen-reader announcement. <code>conflictCheck</code> decides case by case — here anything may overlap the tentative hold, nothing the confirmed block."
        [code]="conflictsSnippet"
        language="ts"
      >
        <oge-scheduler
          [dataSource]="conflictData"
          [currentDate]="date"
          currentView="day"
          [allowOverlap]="false"
          [conflictCheck]="onlyTentative"
          [dayStartHour]="8"
          [dayEndHour]="18"
          style="height: 560px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['ogeSchedulerDraggable', 'appointmentDropped', 'dragOut']"
        heading="Drag in from outside"
        description="Drag a backlog task onto the week — or focus it, press Enter and press Enter again on a cell. The drop previews the slot, builds the appointment through <code>appointmentAdding</code> and reports it in <code>appointmentDropped</code>; dragging a chip out of the scheduler fires <code>dragOut</code>."
        [code]="dragInSnippet"
        language="ts"
      >
        <ul class="mb-3 flex flex-wrap gap-2">
          @for (task of tasks(); track task.id) {
            <li
              [ogeSchedulerDraggable]="task"
              [ogeSchedulerDraggableDuration]="task.minutes"
              class="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-600"
              [style.border-left]="'4px solid ' + task.color"
            >
              {{ task.text }} · {{ task.minutes }} min
            </li>
          } @empty {
            <li class="text-sm opacity-70">Backlog empty.</li>
          }
        </ul>
        <oge-scheduler
          [dataSource]="dropData"
          [currentDate]="date"
          currentView="week"
          [dayStartHour]="8"
          [dayEndHour]="18"
          (appointmentDropped)="dropped($event)"
          (dragOut)="draggedOut($event)"
          style="height: 560px"
        />
        <p class="mt-2 text-sm" aria-live="polite">{{ lastAction() }}</p>
      </app-demo-card>

      <app-demo-card
        [chips]="['selectedAppointments', 'Ctrl+C / Ctrl+V', 'undo()']"
        heading="Selection, clipboard & undo"
        description="Ctrl/⌘-click chips to select several (Shift-click extends, Ctrl+Space from the keyboard), Ctrl+C copies them and Ctrl+V on a focused cell pastes the group there. Ctrl+Z / Ctrl+Y undo and redo every edit — moves, resizes, pastes, deletes — and the buttons call the same methods."
        [code]="selectionSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            class="rounded border px-2 py-1 disabled:opacity-50"
            (click)="selectionScheduler().undo()"
            [disabled]="!selectionScheduler().canUndo()"
          >
            Undo
          </button>
          <button
            type="button"
            class="rounded border px-2 py-1 disabled:opacity-50"
            (click)="selectionScheduler().redo()"
            [disabled]="!selectionScheduler().canRedo()"
          >
            Redo
          </button>
          <button
            type="button"
            class="rounded border px-2 py-1"
            (click)="selectionScheduler().clearSelection()"
          >
            Clear selection
          </button>
          <span>{{ selected().length }} selected</span>
        </div>
        <oge-scheduler
          #selectionCal
          [dataSource]="selectionData"
          [currentDate]="date"
          currentView="week"
          [(selectedAppointments)]="selected"
          [undoLimit]="100"
          [dayStartHour]="8"
          [dayEndHour]="18"
          style="height: 560px"
        />
      </app-demo-card>
    }
  `,
})
export class SchedulerResourcesAvailabilityPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections =
    REACT_SCHEDULER_RESOURCES_AVAILABILITY_SECTIONS;
  protected readonly availabilitySnippet = AVAILABILITY_SNIPPET;
  protected readonly conflictsSnippet = CONFLICTS_SNIPPET;
  protected readonly dragInSnippet = DRAG_IN_SNIPPET;
  protected readonly selectionSnippet = SELECTION_SNIPPET;

  protected readonly selectionScheduler =
    viewChild.required<OgeScheduler<DepthAppt>>('selectionCal');

  protected readonly date = DEPTH_DATE;
  protected readonly staff = [SHIFT_RESOURCE];
  protected readonly blocked = BLOCKED_SLOTS;
  protected readonly availabilityData = availabilityAppointments();
  protected readonly conflictData = conflictAppointments();
  protected readonly dropData: DepthAppt[] = [];
  protected readonly selectionData = teamAppointments();
  protected readonly tasks = signal<readonly DepthTask[]>(BACKLOG_TASKS);
  protected readonly lastAction = signal('');
  protected readonly selected = signal<readonly DepthAppt[]>([]);

  protected readonly onlyTentative = (
    _appointment: DepthAppt,
    conflicts: readonly OgeSchedulerAppointment<DepthAppt>[],
  ): boolean => conflicts.every((c) => c.source['tentative'] === true);

  protected dropped(
    event: OgeSchedulerAppointmentDroppedEvent<DepthAppt>,
  ): void {
    if (!event.added) return;
    const task = event.itemData as DepthTask;
    this.tasks.update((list) => list.filter((t) => t.id !== task.id));
    this.lastAction.set('Scheduled ' + task.text);
  }

  protected draggedOut(event: OgeSchedulerDragOutEvent<DepthAppt>): void {
    this.lastAction.set('Dragged out: ' + event.appointment.text);
  }
}
