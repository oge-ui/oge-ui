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
  agendaDayText,
  agendaTimeText,
  buildAgendaDays,
  toSchedulerView,
  type AgendaDay,
  type SchedulerAppointment,
  type SchedulerChipEvent,
} from '@oge-ui/scheduler-engine';
import type { OgeSchedulerGridMessages } from '../config';

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
              @for (appointment of group.appointments; track appointment.key) {
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
  /** The display zone: "today" and the now-line follow its clocks. */
  readonly timeZone = input<string | undefined>(undefined);
  readonly messages = input.required<OgeSchedulerGridMessages>();

  readonly chipClicked = output<SchedulerChipEvent<T>>();
  readonly chipDblClicked = output<SchedulerChipEvent<T>>();
  readonly chipDeleteRequested = output<SchedulerAppointment<T>>();

  protected readonly days = computed<readonly AgendaDay<T>[]>(() =>
    buildAgendaDays(
      this.anchorDate(),
      this.agendaDuration(),
      this.appointments(),
    ),
  );

  protected isToday(day: Date): boolean {
    return sameDay(day, toSchedulerView(new Date(), this.timeZone()));
  }

  protected dayText(day: Date): string {
    return agendaDayText(day, this.locale());
  }

  protected timeText(appointment: SchedulerAppointment<T>, day: Date): string {
    return agendaTimeText(
      appointment,
      day,
      this.locale(),
      this.messages().allDayLabel,
    );
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
