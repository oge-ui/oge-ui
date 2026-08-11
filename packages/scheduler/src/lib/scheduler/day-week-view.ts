import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { sameDay } from '@oge-ui/core';
import {
  proposeMove,
  proposeResize,
  type AppointmentProposal,
} from '../engine/gesture-math';
import { layoutDayColumn, type LayoutedSegment } from '../engine/layout';
import { packLanes, type LaneLayout } from '../engine/lanes';
import type { SchedulerAppointment } from '../engine/scheduler-model';
import { durationMinutes, minutesOfDay } from '../engine/time-math';
import { beginPointerGesture } from './gesture';
import {
  buildTimeGrid,
  partitionAllDay,
  segmentTimedAppointments,
  type TimeGridVm,
} from '../engine/view-model';
import type { OgeSchedulerGridMessages } from '../config';
import { OgeSchedulerAppointmentChip } from './appointment';
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

/** Escapes a value for use inside a double-quoted attribute selector. */
export function escapeAttr(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** A chip interaction surfaced to the shell, with its screen rect. */
export interface SchedulerChipEvent<T> {
  readonly appointment: SchedulerAppointment<T>;
  readonly event: MouseEvent | KeyboardEvent;
  readonly rect: DOMRect;
}

/** A cell interaction surfaced to the shell. */
export interface SchedulerCellEvent {
  readonly cellDate: Date;
  readonly allDay: boolean;
  readonly event: MouseEvent | KeyboardEvent;
}

/** A committed move/resize surfaced to the shell. */
export interface SchedulerProposalEvent<T> {
  readonly appointment: SchedulerAppointment<T>;
  readonly proposal: AppointmentProposal;
}

/**
 * Internal day/week view: date headers, the all-day strip, the scrollable
 * slot grid (`role="grid"`, row-major, roving tabindex — the OgeCalendar
 * pattern) and one absolutely-positioned chip layer forming the second tab
 * stop. Pointer gestures land in the next wave.
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
        <div class="oge-scheduler-gutter-label" aria-hidden="true">
          {{ messages().allDayLabel }}
        </div>
        <div
          class="oge-scheduler-allday-lanes"
          [style.--oge-scheduler-allday-lane-count]="allDayLaneCount()"
        >
          @for (day of grid().days; track day.getTime()) {
            <!-- pointer affordance only; keyboard creation goes through the grid cells -->
            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
            <div
              class="oge-scheduler-allday-cell"
              (click)="onAllDayCellClick(day, $event)"
              (dblclick)="onAllDayCellDblClick(day, $event)"
            ></div>
          }
          @for (bar of allDayBars(); track bar.appointment.key) {
            <div
              class="oge-scheduler-allday-bar oge-scheduler-chip-stop"
              role="button"
              [attr.aria-label]="chipLabel(bar.appointment)"
              aria-haspopup="dialog"
              [tabindex]="chipTabIndex(bar.appointment)"
              [attr.data-appointment-key]="String(bar.appointment.key)"
              [class.oge-scheduler-bar-clipped-start]="bar.clippedStart"
              [class.oge-scheduler-bar-clipped-end]="bar.clippedEnd"
              [style.grid-column]="
                bar.startDayIndex + 1 + ' / ' + (bar.endDayIndex + 2)
              "
              [style.grid-row]="bar.lane + 1"
              [class.oge-scheduler-dragging]="isDragging(bar.appointment)"
              (click)="onChipClick(bar.appointment, $event)"
              (dblclick)="onChipDblClick(bar.appointment, $event)"
              (keydown)="onChipKeydown(bar.appointment, $event)"
              (focus)="focusedChipKey.set(bar.appointment.key)"
              (pointerdown)="onAllDayBarPointerDown(bar.appointment, $event)"
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
      <div class="oge-scheduler-gutter" aria-hidden="true">
        @for (slot of gutterSlots(); track slot.minutes) {
          <div class="oge-scheduler-gutter-slot">
            <span class="oge-scheduler-gutter-text">{{ slot.text }}</span>
          </div>
        }
      </div>
      <!-- delegated keydown; focus lives on the roving gridcell -->
      <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
      <div
        #rowsEl
        class="oge-scheduler-rows"
        role="grid"
        [attr.aria-label]="gridAriaLabel()"
        (keydown)="onGridKeydown($event)"
      >
        @for (
          minutes of grid().slotStartMinutes;
          track minutes;
          let slotIndex = $index
        ) {
          <div class="oge-scheduler-row" role="row">
            @for (
              day of grid().days;
              track day.getTime();
              let dayIndex = $index
            ) {
              <div
                class="oge-scheduler-cell"
                role="gridcell"
                [class.oge-scheduler-cell-hour]="minutes % 60 === 0"
                [class.oge-scheduler-day-today]="isToday(day)"
                [class.oge-scheduler-cell-focused]="
                  isFocusedCell(dayIndex, slotIndex)
                "
                [tabindex]="isFocusedCell(dayIndex, slotIndex) ? 0 : -1"
                [attr.data-focus-target]="
                  isFocusedCell(dayIndex, slotIndex) ? '' : null
                "
                [attr.aria-label]="cellAriaLabel(dayIndex, minutes)"
                (click)="onCellClick(dayIndex, slotIndex, $event)"
                (dblclick)="onCellDblClick(dayIndex, slotIndex, $event)"
                (keydown)="onCellKeydown(dayIndex, slotIndex, $event)"
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
          </div>
        }
        <div class="oge-scheduler-chip-layer" role="presentation">
          @for (segment of layouted(); track segmentKey(segment)) {
            <div
              class="oge-scheduler-chip-box oge-scheduler-chip-stop"
              role="button"
              [attr.aria-label]="chipLabel(segment.appointment)"
              aria-haspopup="dialog"
              [tabindex]="chipTabIndex(segment.appointment)"
              [attr.data-appointment-key]="String(segment.appointment.key)"
              [class.oge-scheduler-chip-clipped-start]="segment.clippedStart"
              [class.oge-scheduler-chip-clipped-end]="segment.clippedEnd"
              [style.top.%]="segment.topFraction * 100"
              [style.height.%]="segment.heightFraction * 100"
              [style.left.%]="chipLeft(segment)"
              [style.width.%]="chipWidth(segment)"
              [class.oge-scheduler-dragging]="isDragging(segment.appointment)"
              (click)="onChipClick(segment.appointment, $event)"
              (dblclick)="onChipDblClick(segment.appointment, $event)"
              (keydown)="onChipKeydown(segment.appointment, $event)"
              (focus)="focusedChipKey.set(segment.appointment.key)"
              (pointerdown)="onChipPointerDown(segment.appointment, $event)"
            >
              <oge-scheduler-appointment
                [appointment]="segment.appointment"
                [view]="view()"
                [locale]="locale()"
                [template]="appointmentTemplate()"
              />
              @if (allowResizing() && !segment.appointment.disabled) {
                <div
                  class="oge-scheduler-resize-handle oge-scheduler-resize-start"
                  aria-hidden="true"
                  (pointerdown)="
                    onResizePointerDown(segment.appointment, 'start', $event)
                  "
                ></div>
                <div
                  class="oge-scheduler-resize-handle oge-scheduler-resize-end"
                  aria-hidden="true"
                  (pointerdown)="
                    onResizePointerDown(segment.appointment, 'end', $event)
                  "
                ></div>
              }
            </div>
          }
          @if (previewBox(); as box) {
            <div
              class="oge-scheduler-drag-preview"
              aria-hidden="true"
              [style.top.%]="box.top"
              [style.height.%]="box.height"
              [style.left.%]="box.left"
              [style.width.%]="box.width"
            ></div>
          }
        </div>
        @for (day of grid().days; track day.getTime(); let dayIndex = $index) {
          @if (nowFraction(dayIndex); as fraction) {
            <div
              class="oge-scheduler-now"
              [style.top.%]="fraction * 100"
              [style.left.%]="(dayIndex / grid().days.length) * 100"
              [style.width.%]="(1 / grid().days.length) * 100"
              aria-hidden="true"
            ></div>
          }
        }
      </div>
    </div>
  `,
})
export class OgeSchedulerDayWeekView<T = unknown> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

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
  readonly periodLabel = input('');
  readonly allowDragging = input(true);
  readonly allowResizing = input(true);
  readonly appointmentTemplate = input<OgeAppointmentTemplate<T> | null>(null);
  readonly cellTemplate = input<OgeSchedulerCellTemplate | null>(null);
  readonly dateHeaderTemplate = input<OgeDateHeaderTemplate | null>(null);

  readonly cellClicked = output<SchedulerCellEvent>();
  readonly cellDblClicked = output<SchedulerCellEvent>();
  /** Enter/Space on a focused cell — the shell opens the create editor. */
  readonly cellActivated = output<SchedulerCellEvent>();
  readonly chipClicked = output<SchedulerChipEvent<T>>();
  readonly chipDblClicked = output<SchedulerChipEvent<T>>();
  /** Enter on a focused chip — the shell opens the popup. */
  readonly chipActivated = output<SchedulerChipEvent<T>>();
  /** Delete/Backspace on a focused chip. */
  readonly chipDeleteRequested = output<SchedulerAppointment<T>>();
  /** Escape on the grid — arm the shell's tab-exit contract. */
  readonly escapePressed = output<void>();
  /** A drag-move landed (pointer or keyboard). */
  readonly moveCommitted = output<SchedulerProposalEvent<T>>();
  /** A resize landed (pointer or keyboard). */
  readonly resizeCommitted = output<SchedulerProposalEvent<T>>();
  /** A gesture was cancelled with Escape/blur. */
  readonly gestureCancelled = output<void>();

  readonly grid = computed<TimeGridVm>(() =>
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

  /** Layouted segments of all days (chip layer spans the whole grid). */
  protected readonly layouted = computed<readonly LayoutedSegment<T>[]>(() => {
    const grid = this.grid();
    const segments = segmentTimedAppointments(this.partitioned().timed, grid);
    return grid.days.flatMap((_, dayIndex) =>
      layoutDayColumn(
        segments.filter((segment) => segment.dayIndex === dayIndex),
        grid.windowStartMinutes,
        grid.windowEndMinutes,
        this.minAppointmentMinutes(),
      ),
    );
  });

  /** Chronological chip order for the keyboard cycle (timed then all-day). */
  protected readonly chipOrder = computed<readonly SchedulerAppointment<T>[]>(
    () => {
      const seen = new Set<unknown>();
      const ordered: SchedulerAppointment<T>[] = [];
      const push = (appointment: SchedulerAppointment<T>): void => {
        if (seen.has(appointment.key)) return;
        seen.add(appointment.key);
        ordered.push(appointment);
      };
      this.allDayBars().forEach((bar) => push(bar.appointment));
      [...this.layouted()]
        .sort(
          (a, b) =>
            a.appointment.startDate.getTime() -
            b.appointment.startDate.getTime(),
        )
        .forEach((segment) => push(segment.appointment));
      return ordered;
    },
  );

  private readonly allDayLayout = computed<LaneLayout<T>>(() => {
    const grid = this.grid();
    const dayCount = grid.days.length;
    const inputs = this.partitioned().allDay.map((appointment) => {
      const startsBefore =
        appointment.startDate.getTime() < grid.rangeStart.getTime();
      const endsAfter = appointment.endDate.getTime() > grid.rangeEnd.getTime();
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

  /* ---------- roving cell focus (OgeCalendar pattern) ---------- */

  protected readonly focusedCell = signal<{ day: number; slot: number }>({
    day: 0,
    slot: 0,
  });
  protected readonly focusedChipKey = signal<unknown>(null);

  protected isFocusedCell(dayIndex: number, slotIndex: number): boolean {
    const focused = this.focusedCell();
    return focused.day === dayIndex && focused.slot === slotIndex;
  }

  protected chipTabIndex(appointment: SchedulerAppointment<T>): number {
    const focusedKey = this.focusedChipKey();
    const order = this.chipOrder();
    if (order.length === 0) return -1;
    const active =
      order.find((entry) => entry.key === focusedKey) ?? order[0];
    return appointment.key === active.key ? 0 : -1;
  }

  private queueFocusTarget(): void {
    setTimeout(() => {
      this.host.nativeElement
        .querySelector<HTMLElement>('[data-focus-target]')
        ?.focus();
    });
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.escapePressed.emit();
      return;
    }
  }

  protected onCellKeydown(
    dayIndex: number,
    slotIndex: number,
    event: KeyboardEvent,
  ): void {
    const grid = this.grid();
    const dayCount = grid.days.length;
    const slotCount = grid.slotStartMinutes.length;
    let day = dayIndex;
    let slot = slotIndex;
    switch (event.key) {
      case 'ArrowUp':
        slot = Math.max(0, slot - 1);
        break;
      case 'ArrowDown':
        slot = Math.min(slotCount - 1, slot + 1);
        break;
      case 'ArrowLeft':
        day = Math.max(0, day - 1);
        break;
      case 'ArrowRight':
        day = Math.min(dayCount - 1, day + 1);
        break;
      case 'Home':
        day = 0;
        break;
      case 'End':
        day = dayCount - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.cellActivated.emit({
          cellDate: this.cellDate(dayIndex, grid.slotStartMinutes[slotIndex]),
          allDay: false,
          event,
        });
        return;
      default:
        return;
    }
    event.preventDefault();
    this.focusedCell.set({ day, slot });
    this.queueFocusTarget();
  }

  protected onChipKeydown(
    appointment: SchedulerAppointment<T>,
    event: KeyboardEvent,
  ): void {
    if (event.ctrlKey && this.handleChipCtrlKey(appointment, event)) return;
    switch (event.key) {
      case 'Enter':
      case ' ': {
        event.preventDefault();
        this.chipActivated.emit({
          appointment,
          event,
          rect: (event.target as HTMLElement).getBoundingClientRect(),
        });
        return;
      }
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        this.chipDeleteRequested.emit(appointment);
        return;
      case 'ArrowLeft':
      case 'ArrowRight': {
        event.preventDefault();
        const order = this.chipOrder();
        const index = order.findIndex(
          (entry) => entry.key === appointment.key,
        );
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

  /**
   * Keyboard move/resize (**OGE extra** — the keyboard equivalent of drag):
   * Ctrl+Arrow moves by slot/day, Ctrl+Shift+Up/Down resizes the end edge.
   */
  private handleChipCtrlKey(
    appointment: SchedulerAppointment<T>,
    event: KeyboardEvent,
  ): boolean {
    const cellDuration = this.grid().cellDuration;
    if (event.shiftKey) {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return false;
      if (!this.allowResizing() || appointment.disabled) return true;
      event.preventDefault();
      this.resizeCommitted.emit({
        appointment,
        proposal: proposeResize(
          appointment,
          'end',
          event.key === 'ArrowDown' ? cellDuration : -cellDuration,
          cellDuration,
        ),
      });
      return true;
    }
    let deltaDays = 0;
    let deltaMinutes = 0;
    switch (event.key) {
      case 'ArrowLeft':
        deltaDays = -1;
        break;
      case 'ArrowRight':
        deltaDays = 1;
        break;
      case 'ArrowUp':
        deltaMinutes = -cellDuration;
        break;
      case 'ArrowDown':
        deltaMinutes = cellDuration;
        break;
      default:
        return false;
    }
    if (!this.allowDragging() || appointment.disabled) return true;
    event.preventDefault();
    this.moveCommitted.emit({
      appointment,
      proposal: proposeMove(appointment, deltaDays, deltaMinutes, cellDuration),
    });
    return true;
  }

  /* ---------- pointer gestures (bpmn five-part pattern) ---------- */

  private readonly rowsEl =
    viewChild<ElementRef<HTMLElement>>('rowsEl');

  /** The live preview of the dragged/resized appointment. */
  protected readonly preview = signal<{
    key: unknown;
    proposal: AppointmentProposal;
  } | null>(null);

  protected isDragging(appointment: SchedulerAppointment<T>): boolean {
    return this.preview()?.key === appointment.key;
  }

  /** Geometry of the preview box (percent of the rows area). */
  protected readonly previewBox = computed<{
    top: number;
    height: number;
    left: number;
    width: number;
  } | null>(() => {
    const preview = this.preview();
    if (preview === null) return null;
    const grid = this.grid();
    const dayIndex = grid.days.findIndex((day) =>
      sameDay(day, preview.proposal.startDate),
    );
    if (dayIndex === -1) return null;
    const span = grid.windowEndMinutes - grid.windowStartMinutes;
    if (span <= 0) return null;
    const startMinutes = Math.max(
      minutesOfDay(preview.proposal.startDate),
      grid.windowStartMinutes,
    );
    const length = Math.max(
      durationMinutes(preview.proposal.startDate, preview.proposal.endDate),
      this.minAppointmentMinutes(),
    );
    const endMinutes = Math.min(startMinutes + length, grid.windowEndMinutes);
    return {
      top: ((startMinutes - grid.windowStartMinutes) / span) * 100,
      height: ((endMinutes - startMinutes) / span) * 100,
      left: (dayIndex / grid.days.length) * 100,
      width: (1 / grid.days.length) * 100,
    };
  });

  protected onChipPointerDown(
    appointment: SchedulerAppointment<T>,
    event: PointerEvent,
  ): void {
    if (
      !this.allowDragging() ||
      appointment.disabled ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest('.oge-scheduler-resize-handle')
    ) {
      return;
    }
    const rows = this.rowsEl()?.nativeElement;
    if (rows === undefined) return;
    const grid = this.grid();
    const rect = rows.getBoundingClientRect();
    const span = grid.windowEndMinutes - grid.windowStartMinutes;
    let proposal: AppointmentProposal | null = null;
    beginPointerGesture(event, {
      onMove: (deltaX, deltaY) => {
        const deltaDays = Math.round(
          deltaX / (rect.width / grid.days.length),
        );
        const deltaMinutes = (deltaY / rect.height) * span;
        proposal = proposeMove(
          appointment,
          deltaDays,
          deltaMinutes,
          grid.cellDuration,
        );
        this.preview.set({ key: appointment.key, proposal });
      },
      onFinish: (commit, cancelled) => {
        this.preview.set(null);
        if (commit && proposal !== null) {
          this.moveCommitted.emit({ appointment, proposal });
        } else if (cancelled) {
          this.gestureCancelled.emit();
        }
      },
    });
  }

  protected onResizePointerDown(
    appointment: SchedulerAppointment<T>,
    edge: 'start' | 'end',
    event: PointerEvent,
  ): void {
    if (!this.allowResizing() || appointment.disabled || event.button !== 0) {
      return;
    }
    event.stopPropagation();
    const rows = this.rowsEl()?.nativeElement;
    if (rows === undefined) return;
    const grid = this.grid();
    const rect = rows.getBoundingClientRect();
    const span = grid.windowEndMinutes - grid.windowStartMinutes;
    let proposal: AppointmentProposal | null = null;
    beginPointerGesture(event, {
      onMove: (_deltaX, deltaY) => {
        const deltaMinutes = (deltaY / rect.height) * span;
        proposal = proposeResize(
          appointment,
          edge,
          deltaMinutes,
          grid.cellDuration,
        );
        this.preview.set({ key: appointment.key, proposal });
      },
      onFinish: (commit, cancelled) => {
        this.preview.set(null);
        if (commit && proposal !== null) {
          this.resizeCommitted.emit({ appointment, proposal });
        } else if (cancelled) {
          this.gestureCancelled.emit();
        }
      },
    });
  }

  protected onAllDayBarPointerDown(
    appointment: SchedulerAppointment<T>,
    event: PointerEvent,
  ): void {
    if (!this.allowDragging() || appointment.disabled || event.button !== 0) {
      return;
    }
    const rows = this.rowsEl()?.nativeElement;
    if (rows === undefined) return;
    const grid = this.grid();
    const rect = rows.getBoundingClientRect();
    let proposal: AppointmentProposal | null = null;
    beginPointerGesture(event, {
      onMove: (deltaX) => {
        const deltaDays = Math.round(
          deltaX / (rect.width / grid.days.length),
        );
        // day-only move: the time of day (and all-day flag) survive
        proposal = proposeMove(appointment, deltaDays, 0, grid.cellDuration);
        this.preview.set({ key: appointment.key, proposal });
      },
      onFinish: (commit, cancelled) => {
        this.preview.set(null);
        if (commit && proposal !== null) {
          this.moveCommitted.emit({ appointment, proposal });
        } else if (cancelled) {
          this.gestureCancelled.emit();
        }
      },
    });
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

  /** Focuses the roving grid cell. */
  focusGrid(): void {
    this.queueFocusTarget();
  }

  /* ---------- pointer events ---------- */

  protected onCellClick(
    dayIndex: number,
    slotIndex: number,
    event: MouseEvent,
  ): void {
    this.focusedCell.set({ day: dayIndex, slot: slotIndex });
    this.cellClicked.emit({
      cellDate: this.cellDate(dayIndex, this.grid().slotStartMinutes[slotIndex]),
      allDay: false,
      event,
    });
  }

  protected onCellDblClick(
    dayIndex: number,
    slotIndex: number,
    event: MouseEvent,
  ): void {
    this.cellDblClicked.emit({
      cellDate: this.cellDate(dayIndex, this.grid().slotStartMinutes[slotIndex]),
      allDay: false,
      event,
    });
  }

  protected onAllDayCellClick(day: Date, event: MouseEvent): void {
    this.cellClicked.emit({ cellDate: day, allDay: true, event });
  }

  protected onAllDayCellDblClick(day: Date, event: MouseEvent): void {
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

  /* ---------- labels & geometry ---------- */

  protected gridAriaLabel(): string {
    const label = this.messages().gridLabel.replace(
      '{period}',
      this.periodLabel(),
    );
    return `${label}. ${this.messages().gridHint}`;
  }

  protected cellAriaLabel(dayIndex: number, minutes: number): string {
    const date = this.cellDate(dayIndex, minutes);
    return this.messages()
      .cellLabel.replace(
        '{date}',
        new Intl.DateTimeFormat(this.locale(), { dateStyle: 'full' }).format(
          date,
        ),
      )
      .replace(
        '{time}',
        new Intl.DateTimeFormat(this.locale(), {
          hour: 'numeric',
          minute: '2-digit',
        }).format(date),
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

  protected chipLeft(segment: LayoutedSegment<T>): number {
    const dayCount = this.grid().days.length;
    return ((segment.dayIndex + segment.leftFraction) / dayCount) * 100;
  }

  protected chipWidth(segment: LayoutedSegment<T>): number {
    const dayCount = this.grid().days.length;
    return (segment.widthFraction / dayCount) * 100;
  }

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
    return new Intl.DateTimeFormat(this.locale(), { weekday: 'short' }).format(
      day,
    );
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

  protected readonly String = String;
}
