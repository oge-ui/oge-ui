import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { sameDay } from '@oge-ui/core';
import { layoutDayColumn } from '../engine/layout';
import type { SchedulerAppointment } from '../engine/scheduler-model';
import {
  buildTimeGrid,
  partitionAllDay,
  segmentTimedAppointments,
  type TimeGridVm,
} from '../engine/view-model';
import type { OgeSchedulerGridMessages } from '../config';
import type {
  OgeSchedulerResource,
  OgeSchedulerResourceItem,
} from '../scheduler-types';
import type { SchedulerChipEvent } from './day-week-view';

/** One positioned timeline bar. */
interface TimelineBar<T> {
  readonly appointment: SchedulerAppointment<T>;
  readonly leftPct: number;
  readonly widthPct: number;
  readonly lane: number;
  readonly clippedStart: boolean;
  readonly clippedEnd: boolean;
}

/** One timeline row (a resource, or the single unassigned row). */
interface TimelineRow<T> {
  readonly id: unknown;
  readonly text: string;
  readonly color: string | undefined;
  readonly bars: readonly TimelineBar<T>[];
  readonly laneCount: number;
}

/**
 * Internal timeline view: a horizontal time axis (day or week) with one row
 * per resource of the grouping field — or a single row without grouping.
 * Bars stack into lanes via the overlap-layout kernel (transposed: the
 * column index becomes the vertical lane). v0.2 scope: click/keyboard
 * interaction; drag gestures stay with the vertical views for now.
 */
@Component({
  selector: 'oge-scheduler-timeline-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-scheduler-view oge-scheduler-timeline' },
  template: `
    <div class="oge-scheduler-timeline-scroll">
      <div class="oge-scheduler-timeline-inner">
        <div class="oge-scheduler-timeline-header" role="presentation">
          <div class="oge-scheduler-timeline-corner"></div>
          <div class="oge-scheduler-timeline-days">
            @for (day of grid().days; track day.getTime()) {
              <div
                class="oge-scheduler-timeline-dayhead"
                [class.oge-scheduler-day-today]="isToday(day)"
                [style.width.%]="100 / grid().days.length"
              >
                {{ dayText(day) }}
              </div>
            }
          </div>
        </div>
        <div class="oge-scheduler-timeline-subheader" role="presentation">
          <div class="oge-scheduler-timeline-corner"></div>
          <div class="oge-scheduler-timeline-days">
            @for (label of hourLabels(); track label.pct) {
              <span
                class="oge-scheduler-timeline-hour"
                [style.inset-inline-start.%]="label.pct"
                >{{ label.text }}</span
              >
            }
          </div>
        </div>
        @for (row of rows(); track $index) {
          <div class="oge-scheduler-timeline-row">
            <div class="oge-scheduler-timeline-rowhead">
              <span
                class="oge-scheduler-agenda-dot"
                [style.background-color]="row.color ?? null"
                aria-hidden="true"
              ></span>
              {{ row.text }}
            </div>
            <div
              class="oge-scheduler-timeline-track"
              [style.--oge-scheduler-timeline-lanes]="row.laneCount"
            >
              @for (day of grid().days; track day.getTime()) {
                <div
                  class="oge-scheduler-timeline-daycol"
                  [class.oge-scheduler-cell-weekend]="isWeekend(day)"
                  [style.width.%]="100 / grid().days.length"
                ></div>
              }
              @for (bar of row.bars; track bar.appointment.key) {
                <button
                  type="button"
                  class="oge-scheduler-timeline-bar oge-scheduler-chip-stop"
                  [class.oge-scheduler-bar-clipped-start]="bar.clippedStart"
                  [class.oge-scheduler-bar-clipped-end]="bar.clippedEnd"
                  [style.inset-inline-start.%]="bar.leftPct"
                  [style.width.%]="bar.widthPct"
                  [style.top.px]="4 + bar.lane * 26"
                  [style.background-color]="bar.appointment.color ?? null"
                  (click)="onBarClick(bar.appointment, $event)"
                  (dblclick)="onBarDblClick(bar.appointment, $event)"
                  (keydown)="onBarKeydown(bar.appointment, $event)"
                >
                  {{ bar.appointment.text }}
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class OgeSchedulerTimelineView<T = unknown> {
  readonly view = input.required<'timelineDay' | 'timelineWeek'>();
  readonly anchorDate = input.required<Date>();
  readonly appointments = input.required<readonly SchedulerAppointment<T>[]>();
  readonly firstDayOfWeek = input.required<number>();
  readonly dayStartHour = input.required<number>();
  readonly dayEndHour = input.required<number>();
  readonly cellDuration = input.required<number>();
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input.required<OgeSchedulerGridMessages>();
  /** The grouping resource; `null` renders one combined row. */
  readonly groupResource = input<OgeSchedulerResource | null>(null);
  /** Reads the assigned resource id of an item. */
  readonly resourceIdOf = input.required<(item: T) => unknown>();

  readonly chipClicked = output<SchedulerChipEvent<T>>();
  readonly chipDblClicked = output<SchedulerChipEvent<T>>();
  readonly chipDeleteRequested = output<SchedulerAppointment<T>>();

  protected readonly grid = computed<TimeGridVm>(() =>
    buildTimeGrid({
      anchorDate: this.anchorDate(),
      view: this.view() === 'timelineDay' ? 'day' : 'week',
      firstDayOfWeek: this.firstDayOfWeek(),
      dayStartHour: this.dayStartHour(),
      dayEndHour: this.dayEndHour(),
      cellDuration: this.cellDuration(),
    }),
  );

  /** Bars of one appointment set, laid out on the global horizontal axis. */
  private layoutBars(
    appointments: readonly SchedulerAppointment<T>[],
  ): { bars: TimelineBar<T>[]; laneCount: number } {
    const grid = this.grid();
    const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
    const totalSpan = windowSpan * grid.days.length;
    if (totalSpan <= 0) return { bars: [], laneCount: 1 };
    const { timed, allDay } = partitionAllDay(appointments);
    // all-day items become full-day bars; timed items clip per day
    const segments = segmentTimedAppointments(timed, grid).map((segment) => ({
      ...segment,
      startMinutes:
        segment.dayIndex * windowSpan +
        (segment.startMinutes - grid.windowStartMinutes),
      endMinutes:
        segment.dayIndex * windowSpan +
        (segment.endMinutes - grid.windowStartMinutes),
    }));
    for (const appointment of allDay) {
      grid.days.forEach((day, dayIndex) => {
        const dayEnd = new Date(day.getTime() + 86_400_000);
        if (
          appointment.startDate.getTime() < dayEnd.getTime() &&
          appointment.endDate.getTime() > day.getTime()
        ) {
          segments.push({
            appointment,
            dayIndex,
            startMinutes: dayIndex * windowSpan,
            endMinutes: (dayIndex + 1) * windowSpan,
            clippedStart: !sameDay(appointment.startDate, day),
            clippedEnd: appointment.endDate.getTime() > dayEnd.getTime(),
          });
        }
      });
    }
    const layouted = layoutDayColumn(
      segments,
      0,
      totalSpan,
      this.cellDuration(),
    );
    const laneCount = layouted.reduce(
      (max, item) => Math.max(max, item.columnIndex + 1),
      1,
    );
    return {
      bars: layouted.map((item) => ({
        appointment: item.appointment,
        leftPct: item.topFraction * 100,
        widthPct: item.heightFraction * 100,
        lane: item.columnIndex,
        clippedStart: item.clippedStart,
        clippedEnd: item.clippedEnd,
      })),
      laneCount,
    };
  }

  protected readonly rows = computed<readonly TimelineRow<T>[]>(() => {
    const appointments = this.appointments();
    const resource = this.groupResource();
    if (resource === null) {
      const { bars, laneCount } = this.layoutBars(appointments);
      return [
        {
          id: null,
          text: this.messages().unassignedLabel,
          color: undefined,
          bars,
          laneCount,
        },
      ];
    }
    const idOf = this.resourceIdOf();
    const rows: TimelineRow<T>[] = resource.items.map(
      (item: OgeSchedulerResourceItem) => {
        const matches = appointments.filter(
          (appointment) => idOf(appointment.source) === item.id,
        );
        const { bars, laneCount } = this.layoutBars(matches);
        return { id: item.id, text: item.text, color: item.color, bars, laneCount };
      },
    );
    const unassigned = appointments.filter(
      (appointment) =>
        !resource.items.some((item) => idOf(appointment.source) === item.id),
    );
    if (unassigned.length > 0) {
      const { bars, laneCount } = this.layoutBars(unassigned);
      rows.push({
        id: null,
        text: this.messages().unassignedLabel,
        color: undefined,
        bars,
        laneCount,
      });
    }
    return rows;
  });

  protected readonly hourLabels = computed(() => {
    const grid = this.grid();
    const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
    const totalSpan = windowSpan * grid.days.length;
    if (totalSpan <= 0) return [];
    const format = new Intl.DateTimeFormat(this.locale(), { hour: 'numeric' });
    const stepMinutes = this.view() === 'timelineDay' ? 60 : 360;
    const labels: { pct: number; text: string }[] = [];
    for (let dayIndex = 0; dayIndex < grid.days.length; dayIndex++) {
      for (
        let minutes = grid.windowStartMinutes;
        minutes < grid.windowEndMinutes;
        minutes += stepMinutes
      ) {
        labels.push({
          pct:
            ((dayIndex * windowSpan + (minutes - grid.windowStartMinutes)) /
              totalSpan) *
            100,
          text: format.format(new Date(2000, 0, 1, Math.floor(minutes / 60))),
        });
      }
    }
    return labels;
  });

  protected isToday(day: Date): boolean {
    return sameDay(day, new Date());
  }

  protected isWeekend(day: Date): boolean {
    return day.getDay() === 0 || day.getDay() === 6;
  }

  protected dayText(day: Date): string {
    return new Intl.DateTimeFormat(this.locale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(day);
  }

  protected onBarClick(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    this.chipClicked.emit({
      appointment,
      event,
      rect: (event.currentTarget as HTMLElement).getBoundingClientRect(),
    });
  }

  protected onBarDblClick(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    this.chipDblClicked.emit({
      appointment,
      event,
      rect: (event.currentTarget as HTMLElement).getBoundingClientRect(),
    });
  }

  protected onBarKeydown(
    appointment: SchedulerAppointment<T>,
    event: KeyboardEvent,
  ): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.chipDeleteRequested.emit(appointment);
    }
  }
}
