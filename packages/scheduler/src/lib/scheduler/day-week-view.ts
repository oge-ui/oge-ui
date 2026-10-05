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
  beginPointerGesture,
  buildColumnHeaderRows,
  buildDayWeekGroupLayout,
  buildGutterSlots,
  buildLayoutAllDayStrip,
  buildTimeGrid,
  cellDateAt,
  chipHeightPercent,
  chipKey,
  chipLeftPercent,
  chipSelectKey,
  chipTabIndexOf,
  chipTopPercent,
  chipWidthPercent,
  dayWeekBlockedCells,
  dayWeekCellKey,
  dayWeekCellOffHours,
  dayWeekCellSelected,
  dayWeekChipOrder,
  dayWeekColumnHeaderText,
  dayWeekGridRows,
  dayWeekLayoutCellLeaf,
  dayWeekLayoutCellValues,
  dayWeekLayoutDragMove,
  dayWeekLayoutPreviewBox,
  dayWeekNowBoxes,
  dayWeekResizeProposal,
  dayWeekSelectionBox,
  dayWeekSlotAt,
  dragSelectionRange,
  escapeAttr,
  isOgeSchedulerDragOut,
  isWeekendDay,
  layoutGroupedDayWeekSegments,
  leafIndexOfValues,
  allDayDragProposal,
  partitionAllDay,
  schedulerCellAriaLabel,
  schedulerChipAriaLabel,
  schedulerGridAriaLabel,
  schedulerShortcut,
  schedulerWeekNumberTexts,
  segmentKey,
  timeGridCellKey,
  timeGridChipCtrlKey,
  weekNumbersOfDays,
  weekdayShortText,
  withSelectedLabel,
  withUnavailableLabel,
  type AllDayPlacedBar,
  type AppointmentProposal,
  type DayWeekColumn,
  type DayWeekGridRow,
  type DayWeekSegment,
  type DayWeekSelection,
  type OgeSchedulerDisabledSlots,
  type OgeSchedulerDropSlot,
  type OgeSchedulerGroupOrientation,
  type OgeSchedulerResolvedMessages,
  type OgeSchedulerWeekNumberRule,
  type SchedulerAppointment,
  type SchedulerCellEvent,
  type SchedulerChipEvent,
  type SchedulerGroupLeaf,
  type SchedulerHeaderCell,
  type SchedulerOverlayBox,
  type SchedulerPasteTarget,
  type SchedulerProposalEvent,
  type SchedulerRangeEvent,
  type SchedulerSelectGesture,
  type TimeGridVm,
} from '@oge-ui/scheduler-engine';
import type {
  OgeSchedulerResource,
  OgeSchedulerWorkHours,
} from '../scheduler-types';
import { OgeSchedulerAppointmentChip } from './appointment';
import type {
  OgeAppointmentTemplate,
  OgeDateHeaderTemplate,
  OgeResourceHeaderTemplate,
  OgeSchedulerCellTemplate,
} from './scheduler-templates';

/** A chip drag released outside the view (the shell hands it on). */
export interface SchedulerDragOutRequest<T> {
  readonly appointment: SchedulerAppointment<T>;
  readonly clientX: number;
  readonly clientY: number;
}

/** A selection gesture from the keyboard (Ctrl/Shift+Space). */
export interface SchedulerSelectRequest<T> {
  readonly appointment: SchedulerAppointment<T>;
  readonly gesture: SchedulerSelectGesture;
  readonly order: readonly SchedulerAppointment<T>[];
}

/**
 * Internal day/week view: the (nested) date and resource headers, the
 * all-day strip, the scrollable slot grid (`role="grid"`, row-major, roving
 * tabindex — the OgeCalendar pattern; stacked row blocks under vertical
 * grouping) and one absolutely-positioned chip layer forming the second
 * tab stop. Layout, keyboard maps and gesture arithmetic come from
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
    '[class.oge-scheduler-day-week-vertical]': 'layout().vertical',
    '[style.--oge-scheduler-day-count]': 'grid().days.length',
    '[style.--oge-scheduler-col-count]': 'layout().colCount',
    '[style.--oge-scheduler-allday-cols]': 'allDayStrip().columnCount',
    '[style.--oge-scheduler-block-slots]': 'grid().slotStartMinutes.length',
  },
  template: `
    <!-- visual headers; the grid's own columnheader row carries the names -->
    @for (row of headerRows(); track $index; let first = $first) {
      <div
        class="oge-scheduler-header-row"
        [class.oge-scheduler-resource-row]="row[0]?.kind === 'group'"
        aria-hidden="true"
      >
        <div class="oge-scheduler-gutter-spacer">
          @if (first && weekBadge(); as badge) {
            <span class="oge-scheduler-week-number">{{ badge }}</span>
          }
        </div>
        @for (cell of row; track cell.key) {
          @if (cell.kind === 'date') {
            <div
              class="oge-scheduler-date-header"
              [style.grid-column]="gridColumn(cell)"
            >
              @if (dateHeaderTemplate(); as tpl) {
                <ng-container
                  [ngTemplateOutlet]="tpl.templateRef"
                  [ngTemplateOutletContext]="{
                    $implicit: cell.date!,
                    view: view(),
                  }"
                />
              } @else {
                <span class="oge-scheduler-date-weekday">{{
                  weekdayText(cell.date!)
                }}</span>
                <span
                  class="oge-scheduler-date-num"
                  [class.oge-scheduler-date-today]="isToday(cell.date!)"
                  >{{ cell.date!.getDate() }}</span
                >
              }
            </div>
          } @else {
            <div
              class="oge-scheduler-resource-head"
              [style.grid-column]="gridColumn(cell)"
            >
              @if (resourceHeaderTemplate(); as tpl) {
                <ng-container
                  [ngTemplateOutlet]="tpl.templateRef"
                  [ngTemplateOutletContext]="{
                    $implicit: cell.item!,
                    resource: cell.resource!,
                    level: cell.level ?? 0,
                    view: view(),
                  }"
                />
              } @else {
                {{ cell.text }}
              }
            </div>
          }
        }
      </div>
    }

    @if (showAllDayPanel()) {
      <div class="oge-scheduler-allday" role="presentation" #allDayEl>
        <div class="oge-scheduler-gutter-label" aria-hidden="true">
          {{ messages().allDayLabel }}
        </div>
        <div
          class="oge-scheduler-allday-lanes"
          [style.--oge-scheduler-allday-lane-count]="allDayLaneCount()"
        >
          @for (cell of allDayStrip().cells; track cell.key) {
            <!-- pointer affordance only; keyboard creation goes through the grid cells -->
            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
            <div
              class="oge-scheduler-allday-cell"
              (click)="onAllDayCellClick(cell.day, cell.values, $event)"
              (dblclick)="onAllDayCellDblClick(cell.day, cell.values, $event)"
            ></div>
          }
          @for (bar of allDayStrip().bars; track bar.appointment.key) {
            <div
              class="oge-scheduler-allday-bar oge-scheduler-chip-stop"
              role="button"
              [attr.aria-label]="chipLabel(bar.appointment)"
              aria-haspopup="dialog"
              [tabindex]="chipTabIndex(bar.appointment)"
              [attr.data-appointment-key]="String(bar.appointment.key)"
              [class.oge-scheduler-bar-clipped-start]="bar.clippedStart"
              [class.oge-scheduler-bar-clipped-end]="bar.clippedEnd"
              [class.oge-scheduler-chip-selected]="isSelected(bar.appointment)"
              [style.grid-column]="bar.colStart + ' / ' + bar.colEnd"
              [style.grid-row]="bar.lane + 1"
              [class.oge-scheduler-dragging]="isDragging(bar.appointment)"
              (click)="onChipClick(bar.appointment, $event)"
              (dblclick)="onChipDblClick(bar.appointment, $event)"
              (keydown)="onChipKeydown(bar.appointment, $event)"
              (focus)="focusedChipKey.set(bar.appointment.key)"
              (pointerdown)="onAllDayBarPointerDown(bar, $event)"
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
      @if (layout().vertical) {
        <div class="oge-scheduler-group-gutter" aria-hidden="true">
          @for (leaf of layout().leaves; track leaf.index) {
            <div class="oge-scheduler-group-label">
              @if (resourceHeaderTemplate(); as tpl) {
                <ng-container
                  [ngTemplateOutlet]="tpl.templateRef"
                  [ngTemplateOutletContext]="{
                    $implicit: leaf.path[leaf.path.length - 1],
                    resource: groupLevels()[groupLevels().length - 1],
                    level: groupLevels().length - 1,
                    view: view(),
                  }"
                />
              } @else {
                {{ leaf.label }}
              }
            </div>
          }
        </div>
      }
      <div class="oge-scheduler-gutter" aria-hidden="true">
        @for (block of blocks(); track block) {
          @for (slot of gutterSlots(); track slot.minutes) {
            <div class="oge-scheduler-gutter-slot">
              <span class="oge-scheduler-gutter-text">{{ slot.text }}</span>
            </div>
          }
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
          @for (row of gridRows(); track row.index) {
            <div class="oge-scheduler-row" role="row">
              @for (col of columns(); track col.colIndex) {
                <div
                  class="oge-scheduler-cell"
                  role="gridcell"
                  [class.oge-scheduler-cell-hour]="row.minutes % 60 === 0"
                  [class.oge-scheduler-block-start]="
                    row.slot === 0 && row.block > 0
                  "
                  [class.oge-scheduler-day-today]="isToday(col.day)"
                  [class.oge-scheduler-cell-weekend]="isWeekend(col.day)"
                  [class.oge-scheduler-cell-daybreak]="isBreak(col)"
                  [class.oge-scheduler-cell-off-hours]="isOffHours(col, row)"
                  [class.oge-scheduler-cell-disabled]="isBlocked(col, row)"
                  [class.oge-scheduler-cell-focused]="
                    isFocusedCell(col.colIndex, row.index)
                  "
                  [attr.aria-disabled]="isBlocked(col, row) ? 'true' : null"
                  [tabindex]="isFocusedCell(col.colIndex, row.index) ? 0 : -1"
                  [attr.aria-selected]="isSelectedCell(col.colIndex, row)"
                  [attr.data-focus-target]="
                    isFocusedCell(col.colIndex, row.index) ? '' : null
                  "
                  [attr.aria-label]="cellAriaLabel(col, row)"
                  (click)="onCellClick(col, row, $event)"
                  (dblclick)="onCellDblClick(col, row, $event)"
                  (keydown)="onCellKeydown(col, row, $event)"
                  (pointerdown)="onCellPointerDown(col, row, $event)"
                  (contextmenu)="
                    cellContextMenu.emit(cellEvent(col, row, $event))
                  "
                >
                  @if (cellTemplate(); as tpl) {
                    <ng-container
                      [ngTemplateOutlet]="tpl.templateRef"
                      [ngTemplateOutletContext]="{
                        $implicit: cellDateAt(col.day, row.minutes),
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
              [class.oge-scheduler-chip-selected]="
                isSelected(segment.appointment)
              "
              [style.top.%]="chipTop(segment)"
              [style.height.%]="chipHeight(segment)"
              [style.inset-inline-start.%]="chipLeft(segment)"
              [style.width.%]="chipWidth(segment)"
              [class.oge-scheduler-dragging]="isDragging(segment.appointment)"
              (click)="onChipClick(segment.appointment, $event)"
              (dblclick)="onChipDblClick(segment.appointment, $event)"
              (contextmenu)="onChipContextMenu(segment.appointment, $event)"
              (keydown)="onChipKeydown(segment.appointment, $event)"
              (focus)="focusedChipKey.set(segment.appointment.key)"
              (pointerdown)="onChipPointerDown(segment, $event)"
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
              [style.inset-inline-start.%]="box.left"
              [style.width.%]="box.width"
            ></div>
          }
          @if (dropBox(); as box) {
            <div
              class="oge-scheduler-drag-preview oge-scheduler-drop-preview"
              aria-hidden="true"
              [style.top.%]="box.top"
              [style.height.%]="box.height"
              [style.inset-inline-start.%]="box.left"
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
            [style.inset-inline-start.%]="box.left"
            [style.width.%]="box.width"
          ></div>
        }
        @for (line of nowBoxes(); track line.key) {
          @if (shadeUntilCurrentTime()) {
            <div
              class="oge-scheduler-shade"
              [style.top.%]="line.blockTop"
              [style.height.%]="line.top - line.blockTop"
              [style.inset-inline-start.%]="line.left"
              [style.width.%]="line.width"
              aria-hidden="true"
            ></div>
          }
          <div
            class="oge-scheduler-now"
            [style.top.%]="line.top"
            [style.inset-inline-start.%]="line.left"
            [style.width.%]="line.width"
            aria-hidden="true"
          ></div>
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
  /** Periods the grid shows (3 days, a fortnight). */
  readonly intervalCount = input(1);
  readonly showAllDayPanel = input.required<boolean>();
  readonly showCurrentTimeIndicator = input.required<boolean>();
  readonly minAppointmentMinutes = input.required<number>();
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input.required<OgeSchedulerResolvedMessages['grid']>();
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
  /** Right-to-left layout: mirrors Left/Right keys and horizontal drag deltas. */
  readonly rtl = input(false);
  /** Drag snap raster in minutes; defaults to `cellDuration`. */
  readonly snapDuration = input<number | undefined>(undefined);
  /** The grouping levels and their leaves (`[]` ungrouped). */
  readonly groupLevels = input<readonly OgeSchedulerResource[]>([]);
  readonly groupLeaves = input<readonly SchedulerGroupLeaf[]>([]);
  /** Maps an item to its leaf index. */
  readonly leafOf = input<(item: T) => number>(() => 0);
  readonly groupOrientation = input<OgeSchedulerGroupOrientation>('horizontal');
  readonly groupByDate = input(true);
  readonly showWeekNumbers = input(false);
  readonly weekNumberRule = input<OgeSchedulerWeekNumberRule>('iso');
  readonly disabledSlots = input<OgeSchedulerDisabledSlots | null>(null);
  /** The selected items (chips render selected). */
  readonly selection = input<readonly T[]>([]);
  /** The live external-drop preview from the shell. */
  readonly dropPreview = input<{
    readonly slot: OgeSchedulerDropSlot;
    readonly durationMinutes: number;
  } | null>(null);
  readonly appointmentTemplate = input<OgeAppointmentTemplate<T> | null>(null);
  readonly cellTemplate = input<OgeSchedulerCellTemplate | null>(null);
  readonly dateHeaderTemplate = input<OgeDateHeaderTemplate | null>(null);
  readonly resourceHeaderTemplate = input<OgeResourceHeaderTemplate | null>(
    null,
  );

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
  /** Ctrl+C on a chip. */
  readonly copyRequested = output<SchedulerAppointment<T>>();
  /** Ctrl+V on a cell. */
  readonly pasteRequested = output<SchedulerPasteTarget>();
  /** Ctrl/Shift+Space on a chip. */
  readonly selectRequested = output<SchedulerSelectRequest<T>>();
  /** A chip drag released outside the view. */
  readonly dragOut = output<SchedulerDragOutRequest<T>>();

  protected onChipContextMenu(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.chipContextMenu.emit(this.chipEvent(appointment, event));
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
      intervalCount: this.intervalCount(),
    }),
  );

  private snapMinutes(): number {
    return this.snapDuration() ?? this.grid().cellDuration;
  }

  /* ---------- grouping layout ---------- */

  protected readonly layout = computed(() =>
    buildDayWeekGroupLayout(this.grid().days, this.groupLeaves(), {
      vertical: this.groupOrientation() === 'vertical',
      groupByDate: this.groupByDate(),
    }),
  );

  /** All rendered columns of one block. */
  protected readonly columns = computed(() => this.layout().columns);

  protected readonly blocks = computed(() =>
    Array.from({ length: this.layout().blockCount }, (_, index) => index),
  );

  protected readonly gridRows = computed<readonly DayWeekGridRow[]>(() =>
    dayWeekGridRows(this.grid(), this.layout().blockCount),
  );

  protected readonly headerRows = computed(() =>
    buildColumnHeaderRows(
      this.grid().days,
      this.layout().vertical ? [] : this.groupLevels(),
      this.layout().vertical ? [] : this.groupLeaves(),
      this.groupByDate(),
      (day) => this.weekdayText(day),
    ),
  );

  protected gridColumn(cell: SchedulerHeaderCell): string {
    return `${cell.start + 2} / span ${cell.span}`;
  }

  private readonly blockedCells = computed(() =>
    dayWeekBlockedCells(this.grid(), this.layout(), this.disabledSlots()),
  );

  protected isBlocked(col: DayWeekColumn, row: DayWeekGridRow): boolean {
    return this.blockedCells().has(
      dayWeekCellKey(row.block, row.slot, col.colIndex),
    );
  }

  protected isOffHours(col: DayWeekColumn, row: DayWeekGridRow): boolean {
    return dayWeekCellOffHours(
      this.layout(),
      col.colIndex,
      row.block,
      col.day,
      row.minutes,
      this.workHours(),
    );
  }

  protected isBreak(col: DayWeekColumn): boolean {
    if (col.colIndex === 0 || this.layout().leaves.length === 0) return false;
    if (this.layout().vertical) return false;
    return this.layout().groupByDate ? col.resIndex === 0 : col.dayIndex === 0;
  }

  protected isWeekend(day: Date): boolean {
    return isWeekendDay(day, this.weekendDays());
  }

  private readonly partitioned = computed(() =>
    partitionAllDay(this.appointments()),
  );

  /** Layouted segments with their rendered column and block. */
  protected readonly layouted = computed<readonly DayWeekSegment<T>[]>(() =>
    layoutGroupedDayWeekSegments(
      this.partitioned().timed,
      this.grid(),
      this.layout(),
      this.leafOf(),
      this.minAppointmentMinutes(),
    ),
  );

  protected readonly allDayStrip = computed(() =>
    buildLayoutAllDayStrip(
      this.partitioned().allDay,
      this.grid(),
      this.layout(),
      this.leafOf(),
    ),
  );

  /** Chronological chip order for the keyboard cycle (all-day then timed). */
  protected readonly chipOrder = computed<readonly SchedulerAppointment<T>[]>(
    () => dayWeekChipOrder(this.allDayStrip().bars, this.layouted()),
  );

  protected readonly allDayLaneCount = computed(() =>
    Math.max(1, this.allDayStrip().laneCount),
  );

  protected readonly gutterSlots = computed(() =>
    buildGutterSlots(this.grid(), this.locale()),
  );

  /** The week-number badge of the header corner (`W32`, `W32–33`). */
  protected readonly weekNumbers = computed(() =>
    this.showWeekNumbers()
      ? weekNumbersOfDays(
          this.grid().days,
          this.weekNumberRule(),
          this.firstDayOfWeek(),
          this.locale(),
        )
      : [],
  );

  protected readonly weekBadge = computed(() => {
    const weeks = this.weekNumbers();
    if (weeks.length === 0) return null;
    const first = schedulerWeekNumberTexts(weeks[0], this.messages()).badge;
    return weeks.length === 1 ? first : `${first}–${weeks[weeks.length - 1]}`;
  });

  /* ---------- roving cell focus (OgeCalendar pattern) ---------- */

  protected readonly focusedCell = signal<{ day: number; slot: number }>({
    day: 0,
    slot: 0,
  });
  protected readonly focusedChipKey = signal<unknown>(null);

  protected isFocusedCell(colIndex: number, rowIndex: number): boolean {
    const focused = this.focusedCell();
    return focused.day === colIndex && focused.slot === rowIndex;
  }

  /** `aria-selected`: the live drag range, else the roving current cell. */
  protected isSelectedCell(colIndex: number, row: DayWeekGridRow): boolean {
    return dayWeekCellSelected(
      colIndex,
      row.index,
      row.minutes,
      this.focusedCell(),
      this.selection$(),
      row.block,
    );
  }

  protected columnHeaderText(column: DayWeekColumn): string {
    return dayWeekColumnHeaderText(column, this.locale());
  }

  protected chipTabIndex(appointment: SchedulerAppointment<T>): number {
    return chipTabIndexOf(this.chipOrder(), this.focusedChipKey(), appointment);
  }

  protected isSelected(appointment: SchedulerAppointment<T>): boolean {
    return this.selection().includes(appointment.source);
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

  protected cellDateAt = cellDateAt;

  private cellValues(
    col: DayWeekColumn,
    block: number,
  ): Readonly<Record<string, unknown>> {
    return dayWeekLayoutCellValues(this.layout(), col.colIndex, block);
  }

  protected cellEvent(
    col: DayWeekColumn,
    row: DayWeekGridRow,
    event: MouseEvent | KeyboardEvent,
  ): SchedulerCellEvent {
    const values = this.cellValues(col, row.block);
    const firstLevel = this.groupLevels()[0];
    return {
      cellDate: cellDateAt(col.day, row.minutes),
      allDay: false,
      event,
      resourceId:
        firstLevel === undefined ? undefined : values[firstLevel.fieldExpr],
      resources: values,
    };
  }

  protected onCellKeydown(
    col: DayWeekColumn,
    row: DayWeekGridRow,
    event: KeyboardEvent,
  ): void {
    if (schedulerShortcut(event, false) === 'paste') {
      event.preventDefault();
      this.pasteRequested.emit({
        date: cellDateAt(col.day, row.minutes),
        allDay: false,
        values: this.cellValues(col, row.block),
      });
      return;
    }
    const action = timeGridCellKey(
      event.key,
      col.colIndex,
      row.index,
      this.layout().colCount,
      this.gridRows().length,
      this.rtl(),
    );
    if (action === null) return;
    event.preventDefault();
    if (action.kind === 'activate') {
      this.cellActivated.emit(this.cellEvent(col, row, event));
      return;
    }
    this.focusedCell.set({ day: action.col, slot: action.row });
    this.queueFocusTarget();
  }

  private chipEvent(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent | KeyboardEvent,
    target: EventTarget | null = event.currentTarget,
  ): SchedulerChipEvent<T> {
    return {
      appointment,
      event,
      rect: (target as HTMLElement).getBoundingClientRect(),
      order: this.chipOrder(),
    };
  }

  protected onChipKeydown(
    appointment: SchedulerAppointment<T>,
    event: KeyboardEvent,
  ): void {
    if (schedulerShortcut(event, false) === 'copy') {
      event.preventDefault();
      this.copyRequested.emit(appointment);
      return;
    }
    const select = chipSelectKey(event);
    if (select !== null) {
      event.preventDefault();
      this.selectRequested.emit({
        appointment,
        gesture: select,
        order: this.chipOrder(),
      });
      return;
    }
    const ctrl = timeGridChipCtrlKey(
      appointment,
      event,
      this.grid().cellDuration,
      this.allowDragging(),
      this.allowResizing(),
      this.rtl(),
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
    const action = chipKey(
      event.key,
      appointment,
      this.chipOrder(),
      this.rtl(),
    );
    if (action === null) return;
    switch (action.kind) {
      case 'activate':
        event.preventDefault();
        this.chipActivated.emit(
          this.chipEvent(appointment, event, event.target),
        );
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
  private readonly allDayEl = viewChild<ElementRef<HTMLElement>>('allDayEl');

  /** The live preview of the dragged/resized appointment. */
  protected readonly preview = signal<{
    key: unknown;
    proposal: AppointmentProposal;
    leafIndex: number;
  } | null>(null);

  protected isDragging(appointment: SchedulerAppointment<T>): boolean {
    return this.preview()?.key === appointment.key;
  }

  /** Geometry of the preview box (percent of the rows area). */
  protected readonly previewBox = computed<SchedulerOverlayBox | null>(() => {
    const preview = this.preview();
    if (preview === null || preview.proposal.allDay) return null;
    return dayWeekLayoutPreviewBox(
      preview.proposal,
      preview.leafIndex,
      this.grid(),
      this.minAppointmentMinutes(),
      this.layout(),
    );
  });

  /** Geometry of the external-drop preview. */
  protected readonly dropBox = computed<SchedulerOverlayBox | null>(() => {
    const drop = this.dropPreview();
    if (drop === null || drop.slot.allDay) return null;
    const start = drop.slot.startDate;
    return dayWeekLayoutPreviewBox(
      {
        startDate: start,
        endDate: new Date(start.getTime() + drop.durationMinutes * 60_000),
        allDay: false,
      },
      Math.max(
        0,
        leafIndexOfValues(
          this.groupLevels(),
          this.groupLeaves(),
          drop.slot.resources,
        ),
      ),
      this.grid(),
      this.minAppointmentMinutes(),
      this.layout(),
    );
  });

  /** The live drag-to-create selection (single column of one block). */
  private readonly selection$ = signal<DayWeekSelection | null>(null);

  protected readonly selectionBox = computed<SchedulerOverlayBox | null>(() => {
    const selection = this.selection$();
    return selection === null
      ? null
      : dayWeekSelectionBox(
          selection,
          this.grid(),
          this.layout().colCount,
          this.layout().blockCount,
        );
  });

  /** Drag-to-create: pointer drag over empty cells selects a time range. */
  protected onCellPointerDown(
    col: DayWeekColumn,
    row: DayWeekGridRow,
    event: PointerEvent,
  ): void {
    if (!this.allowAdding() || event.button !== 0) return;
    const rows = this.rowsEl()?.nativeElement;
    if (rows === undefined) return;
    const grid = this.grid();
    const rect = rows.getBoundingClientRect();
    const blockHeight = rect.height / this.layout().blockCount;
    const blockTop = rect.top + row.block * blockHeight;
    const anchorMinutes = row.minutes;
    const snap = this.snapMinutes();
    let range: { startMinutes: number; endMinutes: number } | null = null;
    beginPointerGesture(event, {
      onMove: (_deltaX, _deltaY, moveEvent) => {
        range = dragSelectionRange(
          moveEvent.clientY,
          blockTop,
          blockHeight,
          grid,
          anchorMinutes,
          snap,
        );
        this.selection$.set({
          dayIndex: col.colIndex,
          block: row.block,
          ...range,
        });
      },
      onFinish: (commit, cancelled) => {
        this.selection$.set(null);
        if (commit && range !== null) {
          const values = this.cellValues(col, row.block);
          const firstLevel = this.groupLevels()[0];
          this.rangeSelected.emit({
            startDate: cellDateAt(col.day, range.startMinutes),
            endDate: cellDateAt(col.day, range.endMinutes),
            resourceId:
              firstLevel === undefined
                ? undefined
                : values[firstLevel.fieldExpr],
            resources: values,
          });
        } else if (cancelled) {
          this.gestureCancelled.emit();
        }
      },
    });
  }

  /** The grouped values a leaf index stands for (`undefined` ungrouped). */
  private leafValues(
    leafIndex: number,
  ): Readonly<Record<string, unknown>> | undefined {
    const leaf = this.groupLeaves()[leafIndex];
    return leaf === undefined ? undefined : leaf.values;
  }

  protected onChipPointerDown(
    segment: DayWeekSegment<T>,
    event: PointerEvent,
  ): void {
    const appointment = segment.appointment;
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
    const layout = this.layout();
    const rect = rows.getBoundingClientRect();
    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const originLeaf =
      layout.leaves.length === 0
        ? 0
        : Math.max(0, this.leafOf()(appointment.source));
    let proposal: AppointmentProposal | null = null;
    let leafIndex = originLeaf;
    let lastX = event.clientX;
    let lastY = event.clientY;
    beginPointerGesture(event, {
      onMove: (deltaX, deltaY, moveEvent) => {
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        const move = dayWeekLayoutDragMove(
          appointment,
          deltaX,
          deltaY,
          rect.width,
          rect.height,
          grid,
          layout,
          segment.colIndex,
          segment.block ?? 0,
          segment.startMinutes,
          this.snapMinutes(),
          this.rtl(),
        );
        proposal = move.proposal;
        leafIndex = move.leafIndex;
        this.preview.set({ key: appointment.key, proposal, leafIndex });
      },
      onFinish: (commit, cancelled) => {
        this.preview.set(null);
        if (commit && isOgeSchedulerDragOut(hostRect, lastX, lastY)) {
          this.dragOut.emit({ appointment, clientX: lastX, clientY: lastY });
          return;
        }
        if (commit && proposal !== null) {
          const changedLeaf =
            layout.leaves.length > 0 && leafIndex !== originLeaf;
          const values = changedLeaf ? this.leafValues(leafIndex) : undefined;
          const firstLevel = this.groupLevels()[0];
          this.moveCommitted.emit({
            appointment,
            proposal,
            ...(values !== undefined
              ? {
                  resources: values,
                  ...(firstLevel !== undefined
                    ? { resourceId: values[firstLevel.fieldExpr] }
                    : {}),
                }
              : {}),
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
    const blockHeight = rect.height / this.layout().blockCount;
    const leafIndex =
      this.layout().leaves.length === 0
        ? 0
        : Math.max(0, this.leafOf()(appointment.source));
    let proposal: AppointmentProposal | null = null;
    beginPointerGesture(event, {
      onMove: (_deltaX, deltaY) => {
        proposal = dayWeekResizeProposal(
          appointment,
          edge,
          deltaY,
          blockHeight,
          grid,
          this.snapMinutes(),
        );
        this.preview.set({ key: appointment.key, proposal, leafIndex });
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
    bar: AllDayPlacedBar<T>,
    event: PointerEvent,
  ): void {
    const appointment = bar.appointment;
    if (!this.allowDragging() || appointment.disabled || event.button !== 0) {
      return;
    }
    const rows = this.rowsEl()?.nativeElement;
    if (rows === undefined) return;
    const rect = rows.getBoundingClientRect();
    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const leafIndex =
      this.layout().leaves.length === 0
        ? 0
        : Math.max(0, this.leafOf()(appointment.source));
    // the strip's columns: one per day, or per (leaf, day) resource-major
    const stripDays = this.allDayStrip().columnCount;
    let proposal: AppointmentProposal | null = null;
    let lastX = event.clientX;
    let lastY = event.clientY;
    beginPointerGesture(event, {
      onMove: (deltaX, _deltaY, moveEvent) => {
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        proposal = allDayDragProposal(
          appointment,
          deltaX,
          rect.width,
          stripDays,
          this.snapMinutes(),
          this.rtl(),
        );
        this.preview.set({ key: appointment.key, proposal, leafIndex });
      },
      onFinish: (commit, cancelled) => {
        this.preview.set(null);
        if (commit && isOgeSchedulerDragOut(hostRect, lastX, lastY)) {
          this.dragOut.emit({ appointment, clientX: lastX, clientY: lastY });
          return;
        }
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

  /**
   * The slot under a viewport point — the shell's drop-target `resolve`:
   * a time-grid cell, or an all-day strip cell.
   */
  dropSlotAt(clientX: number, clientY: number): OgeSchedulerDropSlot | null {
    const rows = this.rowsEl()?.nativeElement;
    if (rows !== undefined) {
      const hit = dayWeekSlotAt(
        clientX,
        clientY,
        rows.getBoundingClientRect(),
        this.grid(),
        this.layout(),
        this.rtl(),
      );
      if (hit !== null) {
        return { startDate: hit.date, allDay: false, resources: hit.values };
      }
    }
    const strip = this.allDayEl()?.nativeElement.querySelector<HTMLElement>(
      '.oge-scheduler-allday-lanes',
    );
    if (strip !== undefined && strip !== null) {
      const rect = strip.getBoundingClientRect();
      const cells = this.allDayStrip().cells;
      if (
        rect.width > 0 &&
        clientX >= rect.left &&
        clientX < rect.right &&
        clientY >= rect.top &&
        clientY < rect.bottom
      ) {
        const raw = Math.floor(
          ((clientX - rect.left) / rect.width) * cells.length,
        );
        const cell = cells[this.rtl() ? cells.length - 1 - raw : raw];
        if (cell !== undefined) {
          return { startDate: cell.day, allDay: true, resources: cell.values };
        }
      }
    }
    return null;
  }

  /* ---------- pointer events ---------- */

  protected onCellClick(
    col: DayWeekColumn,
    row: DayWeekGridRow,
    event: MouseEvent,
  ): void {
    this.focusedCell.set({ day: col.colIndex, slot: row.index });
    this.cellClicked.emit(this.cellEvent(col, row, event));
  }

  protected onCellDblClick(
    col: DayWeekColumn,
    row: DayWeekGridRow,
    event: MouseEvent,
  ): void {
    this.cellDblClicked.emit(this.cellEvent(col, row, event));
  }

  protected onAllDayCellClick(
    day: Date,
    values: Readonly<Record<string, unknown>>,
    event: MouseEvent,
  ): void {
    this.cellClicked.emit({
      cellDate: day,
      allDay: true,
      event,
      resources: values,
    });
  }

  protected onAllDayCellDblClick(
    day: Date,
    values: Readonly<Record<string, unknown>>,
    event: MouseEvent,
  ): void {
    this.cellDblClicked.emit({
      cellDate: day,
      allDay: true,
      event,
      resources: values,
    });
  }

  protected onChipClick(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.chipClicked.emit(this.chipEvent(appointment, event));
  }

  protected onChipDblClick(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.chipDblClicked.emit(this.chipEvent(appointment, event));
  }

  /* ---------- labels & geometry ---------- */

  protected gridAriaLabel(): string {
    const weeks = this.weekNumbers();
    const period =
      weeks.length === 0
        ? this.periodLabel()
        : `${this.periodLabel()}, ${weeks
            .map(
              (week) => schedulerWeekNumberTexts(week, this.messages()).label,
            )
            .join(', ')}`;
    return schedulerGridAriaLabel(this.messages(), period);
  }

  protected cellAriaLabel(col: DayWeekColumn, row: DayWeekGridRow): string {
    const leaf = dayWeekLayoutCellLeaf(this.layout(), col.colIndex, row.block);
    return withUnavailableLabel(
      schedulerCellAriaLabel(
        this.messages(),
        cellDateAt(col.day, row.minutes),
        this.locale(),
        leaf?.label ?? col.resourceText,
      ),
      this.isBlocked(col, row),
      this.messages(),
    );
  }

  protected chipLabel(appointment: SchedulerAppointment<T>): string {
    return withSelectedLabel(
      schedulerChipAriaLabel(this.messages(), appointment, this.locale()),
      this.isSelected(appointment),
      this.messages(),
    );
  }

  protected chipTop(segment: DayWeekSegment<T>): number {
    return chipTopPercent(segment, this.layout().blockCount);
  }

  protected chipHeight(segment: DayWeekSegment<T>): number {
    return chipHeightPercent(segment, this.layout().blockCount);
  }

  protected chipLeft(segment: DayWeekSegment<T>): number {
    return chipLeftPercent(segment, this.layout().colCount);
  }

  protected chipWidth(segment: DayWeekSegment<T>): number {
    return chipWidthPercent(segment, this.layout().colCount);
  }

  /** Ticks every 30s so the now-indicator drifts without change detection hacks. */
  private readonly now = signal(new Date());

  protected readonly nowBoxes = computed(() =>
    dayWeekNowBoxes(
      this.grid(),
      this.layout(),
      this.now(),
      this.showCurrentTimeIndicator(),
    ),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const timer = setInterval(() => this.now.set(new Date()), 30_000);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  protected isToday(day: Date): boolean {
    return sameDay(day, this.now());
  }

  protected weekdayText(day: Date): string {
    return weekdayShortText(day, this.locale());
  }

  protected segmentKey(segment: DayWeekSegment<T>): string {
    return `${segmentKey(segment)}:${segment.block ?? 0}`;
  }

  protected readonly String = String;
}
