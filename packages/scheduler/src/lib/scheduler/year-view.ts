import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { sameDay, sameMonth } from '@oge-ui/core';
import { buildMonthGrid } from '../engine/view-model';
import type { SchedulerAppointment } from '../engine/scheduler-model';
import type { OgeSchedulerGridMessages } from '../config';

/** One mini-month cell. */
interface YearCell {
  readonly day: Date;
  readonly otherMonth: boolean;
  readonly count: number;
}

/** One mini month of the year grid. */
interface YearMonth {
  readonly anchor: Date;
  readonly title: string;
  readonly weeks: readonly (readonly YearCell[])[];
}

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
  private readonly countsByDay = computed<ReadonlyMap<string, number>>(() => {
    const counts = new Map<string, number>();
    for (const appointment of this.appointments()) {
      const cursor = new Date(
        appointment.startDate.getFullYear(),
        appointment.startDate.getMonth(),
        appointment.startDate.getDate(),
      );
      const lastMs = Math.max(
        appointment.endDate.getTime() - 1,
        appointment.startDate.getTime(),
      );
      for (let guard = 0; guard < 366; guard++) {
        if (cursor.getTime() > lastMs) break;
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return counts;
  });

  protected readonly months = computed<readonly YearMonth[]>(() => {
    const year = this.anchorDate().getFullYear();
    const firstDayOfWeek = this.firstDayOfWeek();
    const counts = this.countsByDay();
    const titleFormat = new Intl.DateTimeFormat(this.locale(), {
      month: 'long',
    });
    return Array.from({ length: 12 }, (_, month) => {
      const anchor = new Date(year, month, 1);
      const grid = buildMonthGrid(anchor, firstDayOfWeek);
      return {
        anchor,
        title: titleFormat.format(anchor),
        weeks: grid.weeks.map((week) =>
          week.map((day) => ({
            day,
            otherMonth: !sameMonth(day, anchor),
            count:
              counts.get(
                `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`,
              ) ?? 0,
          })),
        ),
      };
    });
  });

  protected isToday(day: Date): boolean {
    return sameDay(day, new Date());
  }

  protected weekdayText(day: Date): string {
    return new Intl.DateTimeFormat(this.locale(), {
      weekday: 'narrow',
    }).format(day);
  }

  protected cellLabel(cell: YearCell): string {
    const date = new Intl.DateTimeFormat(this.locale(), {
      dateStyle: 'full',
    }).format(cell.day);
    return cell.count > 0 ? `${date} (${cell.count})` : date;
  }
}
