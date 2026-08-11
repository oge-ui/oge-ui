import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { sameDay, sameMonth } from '@oge-ui/core';
import type { LaneLayout } from '../engine/lanes';
import { buildMonthWeekLanes } from '../engine/month-layout';
import type { SchedulerAppointment } from '../engine/scheduler-model';
import { buildMonthGrid, type MonthGridVm } from '../engine/view-model';
import type { OgeSchedulerGridMessages } from '../config';
import { OgeSchedulerAppointmentChip } from './appointment';
import type {
  OgeAppointmentTemplate,
  OgeSchedulerCellTemplate,
} from './scheduler-templates';

/**
 * Internal month view: six week rows of day cells with packed appointment
 * lanes and a "+N more" overflow button per day, which asks the shell to
 * drill into the day view (dx parity — no fourth popup surface in v0.1).
 */
@Component({
  selector: 'oge-scheduler-month-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeSchedulerAppointmentChip],
  host: { class: 'oge-scheduler-view oge-scheduler-month' },
  template: `
    <div class="oge-scheduler-month-weekdays" role="presentation">
      @for (day of grid().weeks[0]; track day.getTime()) {
        <div class="oge-scheduler-month-weekday">{{ weekdayText(day) }}</div>
      }
    </div>
    @for (week of grid().weeks; track week[0].getTime(); let weekIndex = $index) {
      <div
        class="oge-scheduler-month-week"
        [style.--oge-scheduler-month-lanes]="maxLanes()"
      >
        @for (day of week; track day.getTime()) {
          <div
            class="oge-scheduler-month-cell"
            [class.oge-scheduler-month-other]="!isCurrentMonth(day)"
            [class.oge-scheduler-day-today]="isToday(day)"
          >
            <span class="oge-scheduler-month-daynum">{{ day.getDate() }}</span>
            @if (cellTemplate(); as tpl) {
              <ng-container
                [ngTemplateOutlet]="tpl.templateRef"
                [ngTemplateOutletContext]="{
                  $implicit: day,
                  view: 'month',
                  allDay: true,
                }"
              />
            }
          </div>
        }
        <div class="oge-scheduler-month-lane-layer">
          @for (
            item of weekLanes()[weekIndex].visible;
            track item.appointment.key
          ) {
            <div
              class="oge-scheduler-month-bar"
              [class.oge-scheduler-bar-clipped-start]="item.clippedStart"
              [class.oge-scheduler-bar-clipped-end]="item.clippedEnd"
              [style.grid-column]="
                item.startDayIndex + 1 + ' / ' + (item.endDayIndex + 2)
              "
              [style.grid-row]="item.lane + 1"
            >
              <oge-scheduler-appointment
                [appointment]="item.appointment"
                view="month"
                [compact]="true"
                [locale]="locale()"
                [template]="appointmentTemplate()"
              />
            </div>
          }
          @for (
            overflow of overflowEntries()[weekIndex];
            track overflow.dayIndex
          ) {
            <button
              type="button"
              class="oge-scheduler-month-more"
              [style.grid-column]="overflow.dayIndex + 1"
              [style.grid-row]="maxLanes() + 1"
              (click)="moreClick.emit(week[overflow.dayIndex])"
            >
              {{ moreText(overflow.count) }}
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class OgeSchedulerMonthView<T = unknown> {
  readonly anchorDate = input.required<Date>();
  readonly appointments = input.required<readonly SchedulerAppointment<T>[]>();
  readonly firstDayOfWeek = input.required<number>();
  readonly maxAppointmentsPerCell = input.required<number | 'auto'>();
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input.required<OgeSchedulerGridMessages>();
  readonly appointmentTemplate = input<OgeAppointmentTemplate<T> | null>(null);
  readonly cellTemplate = input<OgeSchedulerCellTemplate | null>(null);

  /** "+N more" clicked — the shell navigates to the day view on that date. */
  readonly moreClick = output<Date>();

  protected readonly grid = computed<MonthGridVm>(() =>
    buildMonthGrid(this.anchorDate(), this.firstDayOfWeek()),
  );

  protected readonly maxLanes = computed(() => {
    const raw = this.maxAppointmentsPerCell();
    return raw === 'auto' ? 3 : Math.max(1, raw);
  });

  protected readonly weekLanes = computed<readonly LaneLayout<T>[]>(() => {
    const appointments = this.appointments();
    const maxLanes = this.maxLanes();
    return this.grid().weeks.map((week) =>
      buildMonthWeekLanes(appointments, week, maxLanes),
    );
  });

  protected readonly overflowEntries = computed(() =>
    this.weekLanes().map((layout) =>
      [...layout.overflowByDay.entries()]
        .map(([dayIndex, count]) => ({ dayIndex, count }))
        .sort((a, b) => a.dayIndex - b.dayIndex),
    ),
  );

  protected isCurrentMonth(day: Date): boolean {
    return sameMonth(day, this.anchorDate());
  }

  protected isToday(day: Date): boolean {
    return sameDay(day, new Date());
  }

  protected weekdayText(day: Date): string {
    return new Intl.DateTimeFormat(this.locale(), {
      weekday: 'short',
    }).format(day);
  }

  protected moreText(count: number): string {
    return this.messages().moreLabel.replace('{count}', String(count));
  }
}
