import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { sameDay } from '@oge-ui/core';
import {
  buildYearMonths,
  countAppointmentsByDay,
  yearCellLabel,
  yearWeekdayText,
  type SchedulerAppointment,
  type YearCell,
  type YearMonth,
} from '@oge-ui/scheduler-engine';
import type { OgeSchedulerGridMessages } from '../config';

/**
 * Internal year view: twelve mini months with per-day appointment counts
 * (dot + count badge). Clicking a day drills into the day view — the year
 * view is a navigation overview, not an editing surface (Kendo Year
 * parity; the FC multi-month view behaves the same way).
 */
@Component({
  selector: 'oge-scheduler-year-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-scheduler-view oge-scheduler-year' },
  template: `
    <div class="oge-scheduler-year-grid">
      @for (month of months(); track month.anchor.getTime()) {
        <section class="oge-scheduler-year-month">
          <h3 class="oge-scheduler-year-title">{{ month.title }}</h3>
          <div class="oge-scheduler-year-weekdays" aria-hidden="true">
            @for (day of month.weeks[0]; track day.day.getTime()) {
              <span>{{ weekdayText(day.day) }}</span>
            }
          </div>
          @for (week of month.weeks; track week[0].day.getTime()) {
            <div class="oge-scheduler-year-week">
              @for (cell of week; track cell.day.getTime()) {
                <button
                  type="button"
                  class="oge-scheduler-year-cell"
                  [class.oge-scheduler-year-other]="cell.otherMonth"
                  [class.oge-scheduler-date-today]="isToday(cell.day)"
                  [class.oge-scheduler-year-busy]="cell.count > 0"
                  [attr.aria-label]="cellLabel(cell)"
                  [attr.tabindex]="cell.otherMonth ? -1 : 0"
                  (click)="dayPicked.emit(cell.day)"
                >
                  {{ cell.day.getDate() }}
                  @if (cell.count > 0 && !cell.otherMonth) {
                    <span
                      class="oge-scheduler-year-dot"
                      aria-hidden="true"
                    ></span>
                  }
                </button>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class OgeSchedulerYearView<T = unknown> {
  readonly anchorDate = input.required<Date>();
  readonly appointments = input.required<readonly SchedulerAppointment<T>[]>();
  readonly firstDayOfWeek = input.required<number>();
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input.required<OgeSchedulerGridMessages>();

  /** A day was clicked — the shell drills into the day view. */
  readonly dayPicked = output<Date>();

  /** Appointment counts per local day key (`y-m-d`). */
  private readonly countsByDay = computed<ReadonlyMap<string, number>>(() =>
    countAppointmentsByDay(this.appointments()),
  );

  protected readonly months = computed<readonly YearMonth[]>(() =>
    buildYearMonths(
      this.anchorDate().getFullYear(),
      this.firstDayOfWeek(),
      this.countsByDay(),
      this.locale(),
    ),
  );

  protected isToday(day: Date): boolean {
    return sameDay(day, new Date());
  }

  protected weekdayText(day: Date): string {
    return yearWeekdayText(day, this.locale());
  }

  protected cellLabel(cell: YearCell): string {
    return yearCellLabel(cell, this.locale());
  }
}
