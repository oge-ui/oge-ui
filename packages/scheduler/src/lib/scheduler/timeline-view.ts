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
import { sameDay } from '@oge-ui/core';
import {
  beginPointerGesture,
  buildTimelineGrid,
  buildTimelineRows,
  isWeekendDay,
  timelineBarCtrlKey,
  timelineDayText,
  timelineDragMove,
  timelineHourLabels,
  timelineRowAt,
  type AppointmentProposal,
  type SchedulerAppointment,
  type SchedulerChipEvent,
  type TimeGridVm,
  type TimelineMoveEvent,
  type TimelineRow,
} from '@oge-ui/scheduler-engine';
import type { OgeSchedulerGridMessages } from '../config';
import type { OgeSchedulerResource } from '../scheduler-types';

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
        @for (row of rows(); track $index; let rowIndex = $index) {
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
                  [class.oge-scheduler-dragging]="
                    preview()?.key === bar.appointment.key
                  "
                  [style.inset-inline-start.%]="bar.leftPct"
                  [style.width.%]="bar.widthPct"
                  [style.top.px]="4 + bar.lane * 26"
                  [style.background-color]="bar.appointment.color ?? null"
                  (click)="onBarClick(bar.appointment, $event)"
                  (dblclick)="onBarDblClick(bar.appointment, $event)"
                  (keydown)="onBarKeydown(bar.appointment, $event)"
                  (pointerdown)="onBarPointerDown(bar.appointment, $event)"
                >
                  {{ bar.appointment.text }}
                </button>
              }
              @if (preview(); as p) {
                @if (p.rowIndex === rowIndex) {
                  <div
                    class="oge-scheduler-drag-preview oge-scheduler-timeline-preview"
                    aria-hidden="true"
                    [style.inset-inline-start.%]="p.leftPct"
                    [style.width.%]="p.widthPct"
                  ></div>
                }
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
  /** Weekend days (0 = Sunday) the grid shades — the scheduler's resolved list. */
  readonly weekendDays = input<readonly number[]>([0, 6]);
  readonly dayStartHour = input.required<number>();
  readonly dayEndHour = input.required<number>();
  readonly cellDuration = input.required<number>();
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input.required<OgeSchedulerGridMessages>();
  /** The grouping resource; `null` renders one combined row. */
  readonly groupResource = input<OgeSchedulerResource | null>(null);
  /** Reads the assigned resource id of an item. */
  readonly resourceIdOf = input.required<(item: T) => unknown>();
  readonly allowDragging = input(true);
  /** Drag snap raster in minutes; defaults to `cellDuration`. */
  readonly snapDuration = input<number | undefined>(undefined);
  /** Right-to-left layout: mirrors Left/Right keys and horizontal drag deltas. */
  readonly rtl = input(false);

  readonly chipClicked = output<SchedulerChipEvent<T>>();
  readonly chipDblClicked = output<SchedulerChipEvent<T>>();
  readonly chipDeleteRequested = output<SchedulerAppointment<T>>();
  /** A bar drag landed — time shift + optional resource-row change. */
  readonly moveCommitted = output<TimelineMoveEvent<T>>();
  readonly gestureCancelled = output<void>();

  protected readonly grid = computed<TimeGridVm>(() =>
    buildTimelineGrid(
      this.view(),
      this.anchorDate(),
      this.firstDayOfWeek(),
      this.dayStartHour(),
      this.dayEndHour(),
      this.cellDuration(),
    ),
  );

  protected readonly rows = computed<readonly TimelineRow<T>[]>(() =>
    buildTimelineRows(
      this.appointments(),
      this.grid(),
      this.cellDuration(),
      this.groupResource(),
      this.resourceIdOf(),
      this.messages().unassignedLabel,
    ),
  );

  protected readonly hourLabels = computed(() =>
    timelineHourLabels(this.grid(), this.view(), this.locale()),
  );

  protected isToday(day: Date): boolean {
    return sameDay(day, new Date());
  }

  protected isWeekend(day: Date): boolean {
    return isWeekendDay(day, this.weekendDays());
  }

  protected dayText(day: Date): string {
    return timelineDayText(day, this.locale());
  }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Live drag preview: proposed bar geometry + target row. */
  protected readonly preview = signal<{
    key: unknown;
    leftPct: number;
    widthPct: number;
    rowIndex: number;
  } | null>(null);

  private snapMinutes(): number {
    return this.snapDuration() ?? this.cellDuration();
  }

  /**
   * Bar drag: horizontal = day + slot-snapped time shift, vertical = target
   * resource row (grouped timelines only). Recurring occurrences shift in
   * time through the scope routing but keep their row — resource reassign
   * of a single occurrence is deliberately not supported.
   */
  protected onBarPointerDown(
    appointment: SchedulerAppointment<T>,
    event: PointerEvent,
  ): void {
    if (!this.allowDragging() || appointment.disabled || event.button !== 0) {
      return;
    }
    const tracks = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        '.oge-scheduler-timeline-track',
      ),
    );
    const originRow = tracks.findIndex((track) =>
      track.contains(event.currentTarget as HTMLElement),
    );
    if (originRow === -1) return;
    const trackRect = tracks[originRow].getBoundingClientRect();
    const rowRects = tracks.map((track) => track.getBoundingClientRect());
    const grid = this.grid();
    const barEl = event.currentTarget as HTMLElement;
    const startLeftPct = parseFloat(barEl.style.insetInlineStart) || 0;
    const widthPct = parseFloat(barEl.style.width) || 0;
    let proposal: AppointmentProposal | null = null;
    let targetRow = originRow;
    beginPointerGesture(event, {
      onMove: (deltaX, _deltaY, moveEvent) => {
        const move = timelineDragMove(
          appointment,
          deltaX,
          trackRect.width,
          grid,
          this.snapMinutes(),
          startLeftPct,
          this.rtl(),
        );
        proposal = move.proposal;
        targetRow = timelineRowAt(moveEvent.clientY, rowRects, originRow);
        this.preview.set({
          key: appointment.key,
          leftPct: move.leftPct,
          widthPct,
          rowIndex: targetRow,
        });
      },
      onFinish: (commit, cancelled) => {
        this.preview.set(null);
        if (commit && proposal !== null) {
          const rowId = this.rows()[targetRow]?.id ?? null;
          const changedRow = targetRow !== originRow && rowId !== null;
          this.moveCommitted.emit({
            appointment,
            proposal,
            ...(changedRow ? { resourceId: rowId } : {}),
          });
        } else if (cancelled) {
          this.gestureCancelled.emit();
        }
      },
    });
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

  /** Keyboard drag equivalents: Ctrl+Arrows move, Ctrl+Shift+Right/Left resize. */
  protected onBarKeydown(
    appointment: SchedulerAppointment<T>,
    event: KeyboardEvent,
  ): void {
    const ctrl = timelineBarCtrlKey(
      appointment,
      event,
      this.snapMinutes(),
      this.allowDragging(),
      this.rows(),
      this.resourceIdOf(),
      this.rtl(),
    );
    if (ctrl.handled) {
      if (ctrl.commit !== undefined) {
        event.preventDefault();
        this.moveCommitted.emit({
          appointment,
          proposal: ctrl.commit.proposal,
          ...(ctrl.commit.resourceId !== undefined
            ? { resourceId: ctrl.commit.resourceId }
            : {}),
        });
      }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.chipDeleteRequested.emit(appointment);
    }
  }
}
