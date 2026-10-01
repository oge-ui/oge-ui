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
  allDayDragProposal,
  beginPointerGesture,
  buildAllDayLayout,
  buildDayWeekColumns,
  buildGutterSlots,
  buildTimeGrid,
  chipKey,
  chipLeftPercent,
  chipTabIndexOf,
  chipWidthPercent,
  dayWeekCellDate,
  dayWeekCellSelected,
  dayWeekChipOrder,
  dayWeekColumnHeaderText,
  dayWeekDragMove,
  dayWeekGroupItems,
  dayWeekPreviewBox,
  dayWeekResizeProposal,
  dayWeekSelectionBox,
  dragSelectionRange,
  escapeAttr,
  isOffHoursCell,
  isWeekendDay,
  layoutDayWeekSegments,
  nowLineFraction,
  originDayIndex,
  partitionAllDay,
  resourceIndexOf,
  schedulerCellAriaLabel,
  schedulerChipAriaLabel,
  schedulerGridAriaLabel,
  segmentKey,
  timeGridCellKey,
  timeGridChipCtrlKey,
  weekdayShortText,
  type AllDayBar,
  type AppointmentProposal,
  type DayWeekColumn,
  type DayWeekSegment,
  type DayWeekSelection,
  type LaneLayout,
  type SchedulerAppointment,
  type SchedulerCellEvent,
  type SchedulerChipEvent,
  type SchedulerOverlayBox,
  type SchedulerProposalEvent,
  type SchedulerRangeEvent,
  type TimeGridVm,
} from '@oge-ui/scheduler-engine';
import type { OgeSchedulerGridMessages } from '../config';
import type {
  OgeSchedulerResource,
  OgeSchedulerWorkHours,
} from '../scheduler-types';
import { OgeSchedulerAppointmentChip } from './appointment';
import type {
  OgeAppointmentTemplate,
  OgeDateHeaderTemplate,
  OgeSchedulerCellTemplate,
} from './scheduler-templates';

/**
 * Internal day/week view: date headers, the all-day strip, the scrollable
 * slot grid (`role="grid"`, row-major, roving tabindex — the OgeCalendar
 * pattern) and one absolutely-positioned chip layer forming the second tab
 * stop. Layout, keyboard maps and gesture arithmetic come from
 * `@oge-ui/scheduler-engine` — the same functions the React view renders
 * from.
 */
@Component({
  selector: 'oge-scheduler-day-week-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeSchedulerAppointmentChip],
  host: {
    class: 'oge-scheduler-view oge-scheduler-day-week',
    '[style.--oge-scheduler-day-count]': 'grid().days.length',
    '[style.--oge-scheduler-col-count]': 'colCount()',
  },
  template: `
    <!-- visual headers; the grid's own columnheader row carries the names -->
    <div class="oge-scheduler-header-row" aria-hidden="true">
      <div class="oge-scheduler-gutter-spacer"></div>
      @for (day of grid().days; track day.getTime()) {
        <div class="oge-scheduler-date-header">
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

    @if (groupItems(); as items) {
      <div class="oge-scheduler-resource-row" aria-hidden="true">
        <div class="oge-scheduler-gutter-spacer"></div>
        @for (col of columns(); track col.colIndex) {
          <div class="oge-scheduler-resource-head">{{ col.resourceText }}</div>
        }
      </div>
    }

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
      <!-- the wrapper carries the overlay layers so the grid element owns
           ONLY rows (aria-required-children) -->
      <div #rowsEl class="oge-scheduler-rows">
        <!-- delegated keydown; focus lives on the roving gridcell -->
        <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
        <div
          class="oge-scheduler-grid"
          role="grid"
          [attr.aria-label]="gridAriaLabel()"
          [attr.aria-readonly]="readOnly() ? 'true' : null"
          (keydown)="onGridKeydown($event)"
        >
          <div class="oge-scheduler-sr-header-row" role="row">
            @for (col of columns(); track col.colIndex) {
              <div class="oge-scheduler-sr-header" role="columnheader">
                {{ columnHeaderText(col) }}
              </div>
            }
          </div>
          @for (
            minutes of grid().slotStartMinutes;
            track minutes;
            let slotIndex = $index
          ) {
            <div class="oge-scheduler-row" role="row">
              @for (col of columns(); track col.colIndex) {
                <div
                  class="oge-scheduler-cell"
                  role="gridcell"
                  [class.oge-scheduler-cell-hour]="minutes % 60 === 0"
                  [class.oge-scheduler-day-today]="isToday(col.day)"
                  [class.oge-scheduler-cell-weekend]="isWeekend(col.day)"
                  [class.oge-scheduler-cell-daybreak]="
                    col.resIndex === 0 && col.colIndex !== 0
                  "
                  [class.oge-scheduler-cell-off-hours]="
                    isOffHours(col.day, minutes)
                  "
                  [class.oge-scheduler-cell-focused]="
                    isFocusedCell(col.colIndex, slotIndex)
                  "
                  [tabindex]="isFocusedCell(col.colIndex, slotIndex) ? 0 : -1"
                  [attr.aria-selected]="
                    isSelectedCell(col.colIndex, slotIndex, minutes)
                  "
                  [attr.data-focus-target]="
                    isFocusedCell(col.colIndex, slotIndex) ? '' : null
                  "
                  [attr.aria-label]="cellAriaLabel(col.colIndex, minutes)"
                  (click)="onCellClick(col.colIndex, slotIndex, $event)"
                  (dblclick)="onCellDblClick(col.colIndex, slotIndex, $event)"
                  (keydown)="onCellKeydown(col.colIndex, slotIndex, $event)"
                  (pointerdown)="
                    onCellPointerDown(col.colIndex, slotIndex, $event)
                  "
                  (contextmenu)="
                    cellContextMenu.emit({
                      cellDate: cellDate(col.colIndex, minutes),
                      allDay: false,
                      event: $event,
                      resourceId: col.resourceId,
                    })
                  "
                >
                  @if (cellTemplate(); as tpl) {
                    <ng-container
                      [ngTemplateOutlet]="tpl.templateRef"
                      [ngTemplateOutletContext]="{
                        $implicit: cellDate(col.colIndex, minutes),
                        view: view(),
                        allDay: false,
                      }"
                    />
                  }
                </div>
              }
            </div>
          }
        </div>
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
              (contextmenu)="onChipContextMenu(segment.appointment, $event)"
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
        @if (selectionBox(); as box) {
          <div
            class="oge-scheduler-selection"
            aria-hidden="true"
            [style.top.%]="box.top"
            [style.height.%]="box.height"
            [style.left.%]="box.left"
            [style.width.%]="box.width"
          ></div>
        }
        @for (day of grid().days; track day.getTime(); let dayIndex = $index) {
          @if (nowFraction(dayIndex); as fraction) {
            @if (shadeUntilCurrentTime()) {
              <div
                class="oge-scheduler-shade"
                [style.height.%]="fraction * 100"
                [style.left.%]="(dayIndex / grid().days.length) * 100"
                [style.width.%]="(1 / grid().days.length) * 100"
                aria-hidden="true"
              ></div>
            }
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

  readonly view = input.required<'day' | 'week' | 'workWeek'>();
  readonly anchorDate = input.required<Date>();
  readonly appointments = input.required<readonly SchedulerAppointment<T>[]>();
  readonly firstDayOfWeek = input.required<number>();
  /** Weekend days (0 = Sunday) the grid shades — the scheduler's resolved list. */
  readonly weekendDays = input<readonly number[]>([0, 6]);
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
  readonly allowAdding = input(true);
  /** `aria-readonly` on the grid — the scheduler cannot change anything. */
  readonly readOnly = input(false);
  /** Weekdays (0 = Sunday) hidden from week-shaped grids. */
  readonly hiddenWeekDays = input<readonly number[] | undefined>(undefined);
  /** Emphasized working hours; cells outside get the off-hours shading. */
  readonly workHours = input<OgeSchedulerWorkHours | null>(null);
  /** Shades today's column above the now-line (dx parity). */
  readonly shadeUntilCurrentTime = input(false);
  /** Drag snap raster in minutes; defaults to `cellDuration`. */
  readonly snapDuration = input<number | undefined>(undefined);
  /** Column-grouping resource (day columns split per item); `null` = off. */
  readonly groupResource = input<OgeSchedulerResource | null>(null);
  /** Reads the assigned resource id of an item. */
  readonly resourceIdOf = input<(item: T) => unknown>(() => null);
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
  /** A drag-to-create cell-range selection landed. */
  readonly rangeSelected = output<SchedulerRangeEvent>();
  /** Right-click on a chip. */
  readonly chipContextMenu = output<SchedulerChipEvent<T>>();
  /** Right-click on an empty cell. */
  readonly cellContextMenu = output<SchedulerCellEvent>();

  protected onChipContextMenu(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.chipContextMenu.emit({
      appointment,
      event,
      rect: (event.currentTarget as HTMLElement).getBoundingClientRect(),
    });
  }

  readonly grid = computed<TimeGridVm>(() =>
    buildTimeGrid({
      anchorDate: this.anchorDate(),
      view: this.view(),
      firstDayOfWeek: this.firstDayOfWeek(),
      dayStartHour: this.dayStartHour(),
      dayEndHour: this.dayEndHour(),
      cellDuration: this.cellDuration(),
      hiddenWeekDays: this.hiddenWeekDays(),
      weekendDays: this.weekendDays(),
    }),
  );

  private snapMinutes(): number {
    return this.snapDuration() ?? this.grid().cellDuration;
  }

  /* ---------- column grouping ---------- */

  /** Resource items splitting each day column; `null` = ungrouped. */
  protected readonly groupItems = computed(() =>
    dayWeekGroupItems(this.groupResource()),
  );

  protected readonly resCount = computed(() => this.groupItems()?.length ?? 1);

  protected readonly colCount = computed(
    () => this.grid().days.length * this.resCount(),
  );

  /** All rendered columns as (day, resource) pairs. */
  protected readonly columns = computed(() =>
    buildDayWeekColumns(this.grid().days, this.groupItems()),
  );

  /** Whether a cell sits outside the emphasized working hours. */
  protected isOffHours(day: Date, minutes: number): boolean {
    return isOffHoursCell(this.workHours(), day, minutes);
  }

  protected isWeekend(day: Date): boolean {
    return isWeekendDay(day, this.weekendDays());
  }

  private readonly partitioned = computed(() =>
    partitionAllDay(this.appointments()),
  );

  /** Layouted segments annotated with their rendered column index. */
  protected readonly layouted = computed<readonly DayWeekSegment<T>[]>(() =>
    layoutDayWeekSegments(
      this.partitioned().timed,
      this.grid(),
      this.groupItems(),
      this.resourceIdOf(),
      this.minAppointmentMinutes(),
    ),
  );

  /** Chronological chip order for the keyboard cycle (all-day then timed). */
  protected readonly chipOrder = computed<readonly SchedulerAppointment<T>[]>(
    () => dayWeekChipOrder(this.allDayBars(), this.layouted()),
  );

  private readonly allDayLayout = computed<LaneLayout<T>>(() =>
    buildAllDayLayout(this.partitioned().allDay, this.grid()),
  );

  protected readonly allDayBars = computed<readonly AllDayBar<T>[]>(
    () => this.allDayLayout().visible,
  );

  protected readonly allDayLaneCount = computed(() =>
    Math.max(1, this.allDayLayout().laneCount),
  );

  protected readonly gutterSlots = computed(() =>
    buildGutterSlots(this.grid(), this.locale()),
  );

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

  /** `aria-selected`: the live drag range, else the roving current cell. */
  protected isSelectedCell(
    colIndex: number,
    slotIndex: number,
    minutes: number,
  ): boolean {
    return dayWeekCellSelected(
      colIndex,
      slotIndex,
      minutes,
      this.focusedCell(),
      this.selection(),
    );
  }

  protected columnHeaderText(column: DayWeekColumn): string {
    return dayWeekColumnHeaderText(column, this.locale());
  }

  protected chipTabIndex(appointment: SchedulerAppointment<T>): number {
    return chipTabIndexOf(this.chipOrder(), this.focusedChipKey(), appointment);
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
    const action = timeGridCellKey(
      event.key,
      dayIndex,
      slotIndex,
      this.colCount(),
      grid.slotStartMinutes.length,
    );
    if (action === null) return;
    event.preventDefault();
    if (action.kind === 'activate') {
      this.cellActivated.emit({
        cellDate: this.cellDate(dayIndex, grid.slotStartMinutes[slotIndex]),
        allDay: false,
        event,
        resourceId: this.columns()[dayIndex]?.resourceId,
      });
      return;
    }
    this.focusedCell.set({ day: action.col, slot: action.row });
    this.queueFocusTarget();
  }

  protected onChipKeydown(
    appointment: SchedulerAppointment<T>,
    event: KeyboardEvent,
  ): void {
    const ctrl = timeGridChipCtrlKey(
      appointment,
      event,
      this.grid().cellDuration,
      this.allowDragging(),
      this.allowResizing(),
    );
    if (ctrl.handled) {
      if (ctrl.commit !== undefined) {
        event.preventDefault();
        const committed = {
          appointment,
          proposal: ctrl.commit.proposal,
        };
        if (ctrl.commit.kind === 'resize') this.resizeCommitted.emit(committed);
        else this.moveCommitted.emit(committed);
      }
      return;
    }
    const action = chipKey(event.key, appointment, this.chipOrder());
    if (action === null) return;
    switch (action.kind) {
      case 'activate':
        event.preventDefault();
        this.chipActivated.emit({
          appointment,
          event,
          rect: (event.target as HTMLElement).getBoundingClientRect(),
        });
        return;
      case 'delete':
        event.preventDefault();
        this.chipDeleteRequested.emit(appointment);
        return;
      case 'focus':
        event.preventDefault();
        this.focusChip(action.key);
        return;
      case 'escape':
        this.escapePressed.emit();
        return;
    }
  }

  /* ---------- pointer gestures (bpmn five-part pattern) ---------- */

  private readonly rowsEl = viewChild<ElementRef<HTMLElement>>('rowsEl');

  /** The live preview of the dragged/resized appointment. */
  protected readonly preview = signal<{
    key: unknown;
    proposal: AppointmentProposal;
    resIndex?: number;
  } | null>(null);

  protected isDragging(appointment: SchedulerAppointment<T>): boolean {
    return this.preview()?.key === appointment.key;
  }

  /** Geometry of the preview box (percent of the rows area). */
  protected readonly previewBox = computed<SchedulerOverlayBox | null>(() => {
    const preview = this.preview();
    if (preview === null) return null;
    return dayWeekPreviewBox(
      preview.proposal,
      preview.resIndex,
      this.grid(),
      this.minAppointmentMinutes(),
      this.colCount(),
      this.resCount(),
    );
  });

  /** The live drag-to-create selection (single day column). */
  protected readonly selection = signal<DayWeekSelection | null>(null);

  protected readonly selectionBox = computed<SchedulerOverlayBox | null>(() => {
    const selection = this.selection();
    return selection === null
      ? null
      : dayWeekSelectionBox(selection, this.grid(), this.colCount());
  });

  /** Drag-to-create: pointer drag over empty cells selects a time range. */
  protected onCellPointerDown(
    dayIndex: number,
    slotIndex: number,
    event: PointerEvent,
  ): void {
    if (!this.allowAdding() || event.button !== 0) return;
    const rows = this.rowsEl()?.nativeElement;
    if (rows === undefined) return;
    const grid = this.grid();
    const rect = rows.getBoundingClientRect();
    const anchorMinutes = grid.slotStartMinutes[slotIndex];
    const snap = this.snapMinutes();
    let range: { startMinutes: number; endMinutes: number } | null = null;
    beginPointerGesture(event, {
      onMove: (_deltaX, _deltaY, moveEvent) => {
        range = dragSelectionRange(
          moveEvent.clientY,
          rect.top,
          rect.height,
          grid,
          anchorMinutes,
          snap,
        );
        this.selection.set({ dayIndex, ...range });
      },
      onFinish: (commit, cancelled) => {
        this.selection.set(null);
        if (commit && range !== null) {
          this.rangeSelected.emit({
            startDate: this.cellDate(dayIndex, range.startMinutes),
            endDate: this.cellDate(dayIndex, range.endMinutes),
            resourceId: this.columns()[dayIndex]?.resourceId,
          });
        } else if (cancelled) {
          this.gestureCancelled.emit();
        }
      },
    });
  }

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
    const resCount = this.resCount();
    const colCount = this.colCount();
    const originRes = resourceIndexOf(
      appointment,
      this.groupItems(),
      this.resourceIdOf(),
    );
    const originDay = originDayIndex(grid, appointment);
    let proposal: AppointmentProposal | null = null;
    let targetRes = originRes;
    beginPointerGesture(event, {
      onMove: (deltaX, deltaY) => {
        const move = dayWeekDragMove(
          appointment,
          deltaX,
          deltaY,
          rect.width,
          rect.height,
          grid,
          colCount,
          resCount,
          originDay,
          originRes,
          this.snapMinutes(),
        );
        proposal = move.proposal;
        targetRes = move.targetRes;
        this.preview.set({
          key: appointment.key,
          proposal,
          resIndex: targetRes,
        });
      },
      onFinish: (commit, cancelled) => {
        this.preview.set(null);
        if (commit && proposal !== null) {
          const items = this.groupItems();
          const changedRes = items !== null && targetRes !== originRes;
          this.moveCommitted.emit({
            appointment,
            proposal,
            ...(changedRes ? { resourceId: items[targetRes].id } : {}),
          });
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
    let proposal: AppointmentProposal | null = null;
    beginPointerGesture(event, {
      onMove: (_deltaX, deltaY) => {
        proposal = dayWeekResizeProposal(
          appointment,
          edge,
          deltaY,
          rect.height,
          grid,
          this.snapMinutes(),
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
        proposal = allDayDragProposal(
          appointment,
          deltaX,
          rect.width,
          grid.days.length,
          this.snapMinutes(),
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
      cellDate: this.cellDate(
        dayIndex,
        this.grid().slotStartMinutes[slotIndex],
      ),
      allDay: false,
      event,
      resourceId: this.columns()[dayIndex]?.resourceId,
    });
  }

  protected onCellDblClick(
    dayIndex: number,
    slotIndex: number,
    event: MouseEvent,
  ): void {
    this.cellDblClicked.emit({
      cellDate: this.cellDate(
        dayIndex,
        this.grid().slotStartMinutes[slotIndex],
      ),
      allDay: false,
      event,
      resourceId: this.columns()[dayIndex]?.resourceId,
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
    return schedulerGridAriaLabel(this.messages(), this.periodLabel());
  }

  protected cellAriaLabel(colIndex: number, minutes: number): string {
    return schedulerCellAriaLabel(
      this.messages(),
      this.cellDate(colIndex, minutes),
      this.locale(),
      this.columns()[colIndex]?.resourceText,
    );
  }

  protected chipLabel(appointment: SchedulerAppointment<T>): string {
    return schedulerChipAriaLabel(this.messages(), appointment, this.locale());
  }

  protected chipLeft(segment: DayWeekSegment<T>): number {
    return chipLeftPercent(segment, this.colCount());
  }

  protected chipWidth(segment: DayWeekSegment<T>): number {
    return chipWidthPercent(segment, this.colCount());
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
    return nowLineFraction(
      this.grid(),
      dayIndex,
      this.now(),
      this.showCurrentTimeIndicator(),
    );
  }

  protected isToday(day: Date): boolean {
    return sameDay(day, this.now());
  }

  protected weekdayText(day: Date): string {
    return weekdayShortText(day, this.locale());
  }

  protected cellDate(colIndex: number, minutes: number): Date {
    return dayWeekCellDate(
      this.columns(),
      this.grid().days,
      this.resCount(),
      colIndex,
      minutes,
    );
  }

  protected segmentKey(segment: DayWeekSegment<T>): string {
    return segmentKey(segment);
  }

  protected readonly String = String;
}
