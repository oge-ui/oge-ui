import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { addDays, rangesOverlap, sameDay, startOfDay } from '@oge-ui/core';
import type { SchedulerAppointment } from '../engine/scheduler-model';
import type { OgeSchedulerGridMessages } from '../config';
import type { SchedulerChipEvent } from './day-week-view';

/** One agenda day group. */
interface AgendaDay<T> {
  readonly day: Date;
  readonly appointments: readonly SchedulerAppointment<T>[];
}

/**
 * Internal agenda (list) view: day-grouped appointment rows for
 * `agendaDuration` days from the anchor. Empty days are skipped (dx
 * parity); an empty period renders the `agendaNoData` message. Rows are
 * plain buttons in the Tab order — a list needs no composite-widget
 * keyboard model.
 */
@Component({
  selector: 'oge-scheduler-agenda-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-scheduler-view oge-scheduler-agenda' },
  template: `
    @if (days().length === 0) {
      <div class="oge-scheduler-agenda-empty">
        {{ messages().agendaNoData }}
      </div>
    } @else {
      <ul class="oge-scheduler-agenda-list">
        @for (group of days(); track group.day.getTime()) {
          <li class="oge-scheduler-agenda-day">
            <div class="oge-scheduler-agenda-date">
              <span
                class="oge-scheduler-agenda-daynum"
                [class.oge-scheduler-date-today]="isToday(group.day)"
                >{{ group.day.getDate() }}</span
              >
              <span class="oge-scheduler-agenda-weekday">{{
                dayText(group.day)
              }}</span>
            </div>
            <ul class="oge-scheduler-agenda-items">
              @for (
                appointment of group.appointments;
                track appointment.key
              ) {
                <li>
                  <button
                    type="button"
                    class="oge-scheduler-agenda-item"
                    [class.oge-scheduler-chip-disabled]="appointment.disabled"
                    (click)="onClick(appointment, $event)"
                    (dblclick)="onDblClick(appointment, $event)"
                    (keydown)="onKeydown(appointment, $event)"
                  >
                    <span
                      class="oge-scheduler-agenda-dot"
                      [style.background-color]="appointment.color ?? null"
                      aria-hidden="true"
                    ></span>
                    <span class="oge-scheduler-agenda-time">{{
                      timeText(appointment, group.day)
                    }}</span>
                    <span class="oge-scheduler-agenda-text">
                      {{ appointment.text }}
                      @if (appointment.location) {
                        <em class="oge-scheduler-agenda-location">{{
                          appointment.location
                        }}</em>
                      }
                    </span>
                  </button>
                </li>
              }
            </ul>
          </li>
        }
      </ul>
    }
  `,
})
export class OgeSchedulerAgendaView<T = unknown> {
  readonly anchorDate = input.required<Date>();
  readonly agendaDuration = input.required<number>();
  readonly appointments = input.required<readonly SchedulerAppointment<T>[]>();
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input.required<OgeSchedulerGridMessages>();

  readonly chipClicked = output<SchedulerChipEvent<T>>();
  readonly chipDblClicked = output<SchedulerChipEvent<T>>();
  readonly chipDeleteRequested = output<SchedulerAppointment<T>>();

  protected readonly days = computed<readonly AgendaDay<T>[]>(() => {
    const first = startOfDay(this.anchorDate());
    const count = Math.max(1, this.agendaDuration());
    const appointments = this.appointments();
    const groups: AgendaDay<T>[] = [];
    for (let index = 0; index < count; index++) {
      const day = addDays(first, index);
      const dayEnd = addDays(day, 1);
      const matches = appointments
        .filter(
          (appointment) =>
            rangesOverlap(
              appointment.startDate,
              appointment.endDate,
              day,
              dayEnd,
            ) ||
            (appointment.startDate.getTime() ===
              appointment.endDate.getTime() &&
              sameDay(appointment.startDate, day)),
        )
        .sort(
          (a, b) =>
            Number(b.displayAllDay) - Number(a.displayAllDay) ||
            a.startDate.getTime() - b.startDate.getTime(),
        );
      if (matches.length > 0) groups.push({ day, appointments: matches });
    }
    return groups;
  });

  protected isToday(day: Date): boolean {
    return sameDay(day, new Date());
  }

  protected dayText(day: Date): string {
    return new Intl.DateTimeFormat(this.locale(), {
      weekday: 'long',
      month: 'long',
      year: 'numeric',
    }).format(day);
  }

  protected timeText(
    appointment: SchedulerAppointment<T>,
    day: Date,
  ): string {
    if (appointment.displayAllDay) return this.messages().allDayLabel;
    const format = new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      minute: '2-digit',
    });
    const start = sameDay(appointment.startDate, day)
      ? format.format(appointment.startDate)
      : format.format(day);
    return `${start} – ${format.format(appointment.endDate)}`;
  }

  protected onClick(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    this.chipClicked.emit({
      appointment,
      event,
      rect: (event.currentTarget as HTMLElement).getBoundingClientRect(),
    });
  }

  protected onDblClick(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    this.chipDblClicked.emit({
      appointment,
      event,
      rect: (event.currentTarget as HTMLElement).getBoundingClientRect(),
    });
  }

  protected onKeydown(
    appointment: SchedulerAppointment<T>,
    event: KeyboardEvent,
  ): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.chipDeleteRequested.emit(appointment);
    }
  }
}
