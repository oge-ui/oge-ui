import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { sameDay, sameMonth } from '@oge-ui/core';
import type { LaneLayout } from '../engine/lanes';
import { buildMonthWeekLanes } from '../engine/month-layout';
import type { SchedulerAppointment } from '../engine/scheduler-model';
import { buildMonthGrid, type MonthGridVm } from '../engine/view-model';
import type { OgeSchedulerGridMessages } from '../config';
import { OgeSchedulerAppointmentChip } from './appointment';
import {
  escapeAttr,
  type SchedulerCellEvent,
  type SchedulerChipEvent,
} from './day-week-view';
import type {
  OgeAppointmentTemplate,
  OgeSchedulerCellTemplate,
} from './scheduler-templates';

/**
 * Internal month view: a `role="grid"` of six week rows with roving cell
 * focus (OgeCalendar keys), packed appointment lanes forming the second tab
 * stop and a "+N more" overflow button that asks the shell to drill into
 * the day view (dx parity — no fourth popup surface in v0.1).
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
        <div class="oge-scheduler-month-weekday" aria-hidden="true">
          {{ weekdayText(day) }}
        </div>
      }
    </div>
    <!-- delegated keydown; focus lives on the roving gridcell -->
    <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
    <div
      class="oge-scheduler-month-grid"
      role="grid"
      [attr.aria-label]="gridAriaLabel()"
      (keydown)="onGridKeydown($event)"
    >
      @for (
        week of grid().weeks;
        track week[0].getTime();
        let weekIndex = $index
      ) {
        <div
          class="oge-scheduler-month-week"
          role="row"
          [style.--oge-scheduler-month-lanes]="maxLanes()"
        >
          @for (day of week; track day.getTime(); let dayIndex = $index) {
            <div
              class="oge-scheduler-month-cell"
              role="gridcell"
              [class.oge-scheduler-month-other]="!isCurrentMonth(day)"
              [class.oge-scheduler-day-today]="isToday(day)"
              [class.oge-scheduler-cell-focused]="
                isFocusedCell(weekIndex, dayIndex)
              "
              [tabindex]="isFocusedCell(weekIndex, dayIndex) ? 0 : -1"
              [attr.data-focus-target]="
                isFocusedCell(weekIndex, dayIndex) ? '' : null
              "
              [attr.aria-label]="cellAriaLabel(day)"
              (click)="onCellClick(weekIndex, dayIndex, $event)"
              (dblclick)="onCellDblClick(day, $event)"
              (keydown)="onCellKeydown(weekIndex, dayIndex, $event)"
            >
              <span class="oge-scheduler-month-daynum" aria-hidden="true">{{
                day.getDate()
              }}</span>
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
          <div class="oge-scheduler-month-lane-layer" role="presentation">
            @for (
              item of weekLanes()[weekIndex].visible;
              track item.appointment.key
            ) {
              <div
                class="oge-scheduler-month-bar oge-scheduler-chip-stop"
                role="button"
                [attr.aria-label]="chipLabel(item.appointment)"
                aria-haspopup="dialog"
                [tabindex]="chipTabIndex(item.appointment)"
                [attr.data-appointment-key]="String(item.appointment.key)"
                [class.oge-scheduler-bar-clipped-start]="item.clippedStart"
                [class.oge-scheduler-bar-clipped-end]="item.clippedEnd"
                [style.grid-column]="
                  item.startDayIndex + 1 + ' / ' + (item.endDayIndex + 2)
                "
                [style.grid-row]="item.lane + 1"
                (click)="onChipClick(item.appointment, $event)"
                (dblclick)="onChipDblClick(item.appointment, $event)"
                (keydown)="onChipKeydown(item.appointment, $event)"
                (focus)="focusedChipKey.set(item.appointment.key)"
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
                tabindex="-1"
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
    </div>
  `,
})
export class OgeSchedulerMonthView<T = unknown> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly anchorDate = input.required<Date>();
  readonly appointments = input.required<readonly SchedulerAppointment<T>[]>();
  readonly firstDayOfWeek = input.required<number>();
  readonly maxAppointmentsPerCell = input.required<number | 'auto'>();
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input.required<OgeSchedulerGridMessages>();
  readonly periodLabel = input('');
  readonly appointmentTemplate = input<OgeAppointmentTemplate<T> | null>(null);
  readonly cellTemplate = input<OgeSchedulerCellTemplate | null>(null);

  /** "+N more" clicked — the shell navigates to the day view on that date. */
  readonly moreClick = output<Date>();
  readonly cellClicked = output<SchedulerCellEvent>();
  readonly cellDblClicked = output<SchedulerCellEvent>();
  readonly cellActivated = output<SchedulerCellEvent>();
  readonly chipClicked = output<SchedulerChipEvent<T>>();
  readonly chipDblClicked = output<SchedulerChipEvent<T>>();
  readonly chipActivated = output<SchedulerChipEvent<T>>();
  readonly chipDeleteRequested = output<SchedulerAppointment<T>>();
  readonly escapePressed = output<void>();

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

  /** Chronological order of the visible chips for the keyboard cycle. */
  protected readonly chipOrder = computed<readonly SchedulerAppointment<T>[]>(
    () => {
      const seen = new Set<unknown>();
      const ordered: SchedulerAppointment<T>[] = [];
      for (const layout of this.weekLanes()) {
        for (const item of layout.visible) {
          if (seen.has(item.appointment.key)) continue;
          seen.add(item.appointment.key);
          ordered.push(item.appointment);
        }
      }
      return ordered;
    },
  );

  /* ---------- roving focus ---------- */

  protected readonly focusedCell = signal<{ week: number; day: number }>({
    week: 0,
    day: 0,
  });
  protected readonly focusedChipKey = signal<unknown>(null);

  protected isFocusedCell(weekIndex: number, dayIndex: number): boolean {
    const focused = this.focusedCell();
    return focused.week === weekIndex && focused.day === dayIndex;
  }

  protected chipTabIndex(appointment: SchedulerAppointment<T>): number {
    const order = this.chipOrder();
    if (order.length === 0) return -1;
    const focusedKey = this.focusedChipKey();
    const active = order.find((entry) => entry.key === focusedKey) ?? order[0];
    return appointment.key === active.key ? 0 : -1;
  }

  private queueFocusTarget(): void {
    setTimeout(() => {
      this.host.nativeElement
        .querySelector<HTMLElement>('[data-focus-target]')
        ?.focus();
    });
  }

  /** Focuses the roving grid cell. */
  focusGrid(): void {
    this.queueFocusTarget();
  }

  /** Focuses the chip element rendered for `key`. */
  focusChip(key: unknown): void {
    this.focusedChipKey.set(key);
    setTimeout(() => {
      this.host.nativeElement
        .querySelector<HTMLElement>(
          `[data-appointment-key="${escapeAttr(String(key))}"]`,
        )
        ?.focus();
    });
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.escapePressed.emit();
  }

  protected onCellKeydown(
    weekIndex: number,
    dayIndex: number,
    event: KeyboardEvent,
  ): void {
    let week = weekIndex;
    let day = dayIndex;
    switch (event.key) {
      case 'ArrowUp':
        week = Math.max(0, week - 1);
        break;
      case 'ArrowDown':
        week = Math.min(5, week + 1);
        break;
      case 'ArrowLeft':
        day = Math.max(0, day - 1);
        break;
      case 'ArrowRight':
        day = Math.min(6, day + 1);
        break;
      case 'Home':
        day = 0;
        break;
      case 'End':
        day = 6;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.cellActivated.emit({
          cellDate: this.grid().weeks[weekIndex][dayIndex],
          allDay: true,
          event,
        });
        return;
      default:
        return;
    }
    event.preventDefault();
    this.focusedCell.set({ week, day });
    this.queueFocusTarget();
  }

  protected onChipKeydown(
    appointment: SchedulerAppointment<T>,
    event: KeyboardEvent,
  ): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.chipActivated.emit({
          appointment,
          event,
          rect: (event.target as HTMLElement).getBoundingClientRect(),
        });
        return;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        this.chipDeleteRequested.emit(appointment);
        return;
      case 'ArrowLeft':
      case 'ArrowRight': {
        event.preventDefault();
        const order = this.chipOrder();
        const index = order.findIndex((entry) => entry.key === appointment.key);
        const next =
          order[
            event.key === 'ArrowRight'
              ? Math.min(order.length - 1, index + 1)
              : Math.max(0, index - 1)
          ];
        this.focusChip(next.key);
        return;
      }
      case 'Escape':
        this.escapePressed.emit();
        return;
      default:
        return;
    }
  }

  /* ---------- pointer ---------- */

  protected onCellClick(
    weekIndex: number,
    dayIndex: number,
    event: MouseEvent,
  ): void {
    this.focusedCell.set({ week: weekIndex, day: dayIndex });
    this.cellClicked.emit({
      cellDate: this.grid().weeks[weekIndex][dayIndex],
      allDay: true,
      event,
    });
  }

  protected onCellDblClick(day: Date, event: MouseEvent): void {
    this.cellDblClicked.emit({ cellDate: day, allDay: true, event });
  }

  protected onChipClick(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.chipClicked.emit({
      appointment,
      event,
      rect: (event.currentTarget as HTMLElement).getBoundingClientRect(),
    });
  }

  protected onChipDblClick(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.chipDblClicked.emit({
      appointment,
      event,
      rect: (event.currentTarget as HTMLElement).getBoundingClientRect(),
    });
  }

  /* ---------- labels ---------- */

  protected gridAriaLabel(): string {
    const label = this.messages().gridLabel.replace(
      '{period}',
      this.periodLabel(),
    );
    return `${label}. ${this.messages().gridHint}`;
  }

  protected cellAriaLabel(day: Date): string {
    return this.messages().dayCellLabel.replace(
      '{date}',
      new Intl.DateTimeFormat(this.locale(), { dateStyle: 'full' }).format(day),
    );
  }

  protected chipLabel(appointment: SchedulerAppointment<T>): string {
    const format = new Intl.DateTimeFormat(this.locale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return this.messages()
      .appointmentLabel.replace('{text}', appointment.text)
      .replace('{start}', format.format(appointment.startDate))
      .replace('{end}', format.format(appointment.endDate));
  }

  protected isCurrentMonth(day: Date): boolean {
    return sameMonth(day, this.anchorDate());
  }

  protected isToday(day: Date): boolean {
    return sameDay(day, new Date());
  }

  protected weekdayText(day: Date): string {
    return new Intl.DateTimeFormat(this.locale(), { weekday: 'short' }).format(
      day,
    );
  }

  protected moreText(count: number): string {
    return this.messages().moreLabel.replace('{count}', String(count));
  }

  protected readonly String = String;
}
