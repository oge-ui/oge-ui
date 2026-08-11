import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { sameDay } from '@oge-ui/core';
import { layoutDayColumn, type LayoutedSegment } from '../engine/layout';
import { packLanes, type LaneLayout } from '../engine/lanes';
import type { SchedulerAppointment } from '../engine/scheduler-model';
import { minutesOfDay } from '../engine/time-math';
import {
  buildTimeGrid,
  partitionAllDay,
  segmentTimedAppointments,
  type TimeGridVm,
} from '../engine/view-model';
import type { OgeSchedulerGridMessages } from '../config';
import {
  OgeSchedulerAppointmentChip,
} from './appointment';
import type {
  OgeAppointmentTemplate,
  OgeDateHeaderTemplate,
  OgeSchedulerCellTemplate,
} from './scheduler-templates';

/** One rendered all-day bar with its grid placement. */
interface AllDayBar<T> {
  readonly appointment: SchedulerAppointment<T>;
  readonly lane: number;
  readonly startDayIndex: number;
  readonly endDayIndex: number;
  readonly clippedStart: boolean;
  readonly clippedEnd: boolean;
}

/**
 * Internal day/week view: date headers, the all-day strip, the scrollable
 * slot grid and the positioned chip layer. Interaction (keyboard, gestures)
 * is layered on in later waves; the DOM contract (`role="grid"`, `.oge-*`
 * classes) is final from the start.
 */
@Component({
  selector: 'oge-scheduler-day-week-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeSchedulerAppointmentChip],
  host: {
    class: 'oge-scheduler-view oge-scheduler-day-week',
    '[style.--oge-scheduler-day-count]': 'grid().days.length',
  },
  template: `
    <div class="oge-scheduler-header-row" role="presentation">
      <div class="oge-scheduler-gutter-spacer" role="presentation"></div>
      @for (day of grid().days; track day.getTime()) {
        <div class="oge-scheduler-date-header" role="presentation">
          @if (dateHeaderTemplate(); as tpl) {
            <ng-container
              [ngTemplateOutlet]="tpl.templateRef"
              [ngTemplateOutletContext]="{ $implicit: day, view: view() }"
            />
          } @else {
            <span class="oge-scheduler-date-weekday">{{
              weekdayText(day)
            }}</span>
            <span
              class="oge-scheduler-date-num"
              [class.oge-scheduler-date-today]="isToday(day)"
              >{{ day.getDate() }}</span
            >
          }
        </div>
      }
    </div>

    @if (showAllDayPanel()) {
      <div class="oge-scheduler-allday" role="presentation">
        <div class="oge-scheduler-gutter-label">
          {{ messages().allDayLabel }}
        </div>
        <div
          class="oge-scheduler-allday-lanes"
          [style.--oge-scheduler-allday-lane-count]="allDayLaneCount()"
        >
          @for (day of grid().days; track day.getTime()) {
            <div class="oge-scheduler-allday-cell" role="presentation"></div>
          }
          @for (bar of allDayBars(); track bar.appointment.key) {
            <div
              class="oge-scheduler-allday-bar"
              [class.oge-scheduler-bar-clipped-start]="bar.clippedStart"
              [class.oge-scheduler-bar-clipped-end]="bar.clippedEnd"
              [style.grid-column]="
                bar.startDayIndex + 1 + ' / ' + (bar.endDayIndex + 2)
              "
              [style.grid-row]="bar.lane + 1"
            >
              <oge-scheduler-appointment
                [appointment]="bar.appointment"
                [view]="view()"
                [compact]="true"
                [locale]="locale()"
                [template]="appointmentTemplate()"
              />
            </div>
          }
        </div>
      </div>
    }

    <div class="oge-scheduler-body">
      <div class="oge-scheduler-gutter" role="presentation">
        @for (slot of gutterSlots(); track slot.minutes) {
          <div class="oge-scheduler-gutter-slot">
            <span class="oge-scheduler-gutter-text">{{ slot.text }}</span>
          </div>
        }
      </div>
      <div class="oge-scheduler-columns">
        @for (
          day of grid().days;
          track day.getTime();
          let dayIndex = $index
        ) {
          <div
            class="oge-scheduler-day-col"
            [class.oge-scheduler-day-today]="isToday(day)"
          >
            @for (minutes of grid().slotStartMinutes; track minutes) {
              <div
                class="oge-scheduler-cell"
                [class.oge-scheduler-cell-hour]="minutes % 60 === 0"
              >
                @if (cellTemplate(); as tpl) {
                  <ng-container
                    [ngTemplateOutlet]="tpl.templateRef"
                    [ngTemplateOutletContext]="{
                      $implicit: cellDate(dayIndex, minutes),
                      view: view(),
                      allDay: false,
                    }"
                  />
                }
              </div>
            }
            @for (
              segment of layoutByDay()[dayIndex];
              track segmentKey(segment)
            ) {
              <div
                class="oge-scheduler-chip-box"
                [class.oge-scheduler-chip-clipped-start]="segment.clippedStart"
                [class.oge-scheduler-chip-clipped-end]="segment.clippedEnd"
                [style.top.%]="segment.topFraction * 100"
                [style.height.%]="segment.heightFraction * 100"
                [style.left.%]="segment.leftFraction * 100"
                [style.width.%]="segment.widthFraction * 100"
              >
                <oge-scheduler-appointment
                  [appointment]="segment.appointment"
                  [view]="view()"
                  [locale]="locale()"
                  [template]="appointmentTemplate()"
                />
              </div>
            }
            @if (nowFraction(dayIndex); as fraction) {
              <div
                class="oge-scheduler-now"
                [style.top.%]="fraction * 100"
                aria-hidden="true"
              ></div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class OgeSchedulerDayWeekView<T = unknown> {
  readonly view = input.required<'day' | 'week'>();
  readonly anchorDate = input.required<Date>();
  readonly appointments = input.required<readonly SchedulerAppointment<T>[]>();
  readonly firstDayOfWeek = input.required<number>();
  readonly dayStartHour = input.required<number>();
  readonly dayEndHour = input.required<number>();
  readonly cellDuration = input.required<number>();
  readonly showAllDayPanel = input.required<boolean>();
  readonly showCurrentTimeIndicator = input.required<boolean>();
  readonly minAppointmentMinutes = input.required<number>();
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input.required<OgeSchedulerGridMessages>();
  readonly appointmentTemplate = input<OgeAppointmentTemplate<T> | null>(null);
  readonly cellTemplate = input<OgeSchedulerCellTemplate | null>(null);
  readonly dateHeaderTemplate = input<OgeDateHeaderTemplate | null>(null);

  protected readonly grid = computed<TimeGridVm>(() =>
    buildTimeGrid({
      anchorDate: this.anchorDate(),
      view: this.view(),
      firstDayOfWeek: this.firstDayOfWeek(),
      dayStartHour: this.dayStartHour(),
      dayEndHour: this.dayEndHour(),
      cellDuration: this.cellDuration(),
    }),
  );

  private readonly partitioned = computed(() =>
    partitionAllDay(this.appointments()),
  );

  /** Per-day layouted segments, indexed like `grid().days`. */
  protected readonly layoutByDay = computed<
    readonly (readonly LayoutedSegment<T>[])[]
  >(() => {
    const grid = this.grid();
    const segments = segmentTimedAppointments(
      this.partitioned().timed,
      grid,
    );
    return grid.days.map((_, dayIndex) =>
      layoutDayColumn(
        segments.filter((segment) => segment.dayIndex === dayIndex),
        grid.windowStartMinutes,
        grid.windowEndMinutes,
        this.minAppointmentMinutes(),
      ),
    );
  });

  private readonly allDayLayout = computed<LaneLayout<T>>(() => {
    const grid = this.grid();
    const dayCount = grid.days.length;
    const inputs = this.partitioned().allDay.map((appointment) => {
      const startsBefore =
        appointment.startDate.getTime() < grid.rangeStart.getTime();
      const endsAfter =
        appointment.endDate.getTime() > grid.rangeEnd.getTime();
      const startDayIndex = startsBefore
        ? 0
        : grid.days.findIndex((day) => sameDay(day, appointment.startDate));
      const lastMoment = new Date(appointment.endDate.getTime() - 1);
      let endDayIndex = endsAfter
        ? dayCount - 1
        : grid.days.findIndex((day) => sameDay(day, lastMoment));
      if (endDayIndex === -1) endDayIndex = startDayIndex;
      return {
        appointment,
        startDayIndex: Math.max(0, startDayIndex),
        endDayIndex: Math.max(0, endDayIndex),
        clippedStart: startsBefore,
        clippedEnd: endsAfter,
      };
    });
    return packLanes(inputs, null);
  });

  protected readonly allDayBars = computed<readonly AllDayBar<T>[]>(
    () => this.allDayLayout().visible,
  );

  protected readonly allDayLaneCount = computed(() =>
    Math.max(1, this.allDayLayout().laneCount),
  );

  protected readonly gutterSlots = computed(() => {
    const grid = this.grid();
    const format = new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      minute: grid.cellDuration % 60 === 0 ? undefined : '2-digit',
    });
    return grid.slotStartMinutes
      .filter((minutes) => minutes % 60 === 0)
      .map((minutes) => ({
        minutes,
        text: format.format(
          new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60),
        ),
      }));
  });

  /** Ticks every 30s so the now-indicator drifts without change detection hacks. */
  private readonly now = signal(new Date());

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const timer = setInterval(() => this.now.set(new Date()), 30_000);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  protected nowFraction(dayIndex: number): number | null {
    if (!this.showCurrentTimeIndicator()) return null;
    const grid = this.grid();
    const now = this.now();
    if (!sameDay(grid.days[dayIndex], now)) return null;
    const minutes = minutesOfDay(now);
    if (minutes < grid.windowStartMinutes || minutes > grid.windowEndMinutes) {
      return null;
    }
    const span = grid.windowEndMinutes - grid.windowStartMinutes;
    return span <= 0 ? null : (minutes - grid.windowStartMinutes) / span;
  }

  protected isToday(day: Date): boolean {
    return sameDay(day, this.now());
  }

  protected weekdayText(day: Date): string {
    return new Intl.DateTimeFormat(this.locale(), {
      weekday: 'short',
    }).format(day);
  }

  protected cellDate(dayIndex: number, minutes: number): Date {
    const day = this.grid().days[dayIndex];
    return new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      Math.floor(minutes / 60),
      minutes % 60,
    );
  }

  protected segmentKey(segment: LayoutedSegment<T>): string {
    return `${String(segment.appointment.key)}:${segment.dayIndex}`;
  }
}
