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
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { sameDay } from '@oge-ui/core';
import {
  beginPointerGesture,
  isMonthViewDay,
  isOgeSchedulerDragOut,
  buildMonthGrid,
  buildMonthWeekLayouts,
  chipKey,
  chipSelectKey,
  chipTabIndexOf,
  escapeAttr,
  monthBlockedDays,
  monthCellKey,
  monthCellSelected,
  monthChipOrder,
  monthColumnHeaderText,
  monthDropCell,
  monthMaxLanes,
  monthOriginIndex,
  monthOverflowEntries,
  proposeMove,
  schedulerChipAriaLabel,
  schedulerDayCellAriaLabel,
  schedulerGridAriaLabel,
  schedulerMoreAriaLabel,
  schedulerMoreText,
  schedulerShortcut,
  schedulerWeekNumber,
  schedulerWeekNumberTexts,
  weekdayShortText,
  withSelectedLabel,
  withUnavailableLabel,
  type AppointmentProposal,
  type LaneLayout,
  type MonthGridVm,
  type OgeSchedulerDisabledSlots,
  type OgeSchedulerDropSlot,
  type OgeSchedulerResolvedMessages,
  type OgeSchedulerWeekNumberRule,
  type SchedulerAppointment,
  type SchedulerCellEvent,
  type SchedulerChipEvent,
  type SchedulerPasteTarget,
  type SchedulerProposalEvent,
} from '@oge-ui/scheduler-engine';
import { OgeSchedulerAppointmentChip } from './appointment';
import type {
  SchedulerDragOutRequest,
  SchedulerSelectRequest,
} from './day-week-view';
import type {
  OgeAppointmentTemplate,
  OgeSchedulerCellTemplate,
} from './scheduler-templates';

/** A "+N more" press: the day and the button the popup anchors to. */
export interface SchedulerMoreRequest {
  readonly date: Date;
  readonly anchor: HTMLElement;
}

/**
 * Internal month view: a `role="grid"` of week rows (six, or every week of
 * a multi-month `intervalCount`) with roving cell focus (OgeCalendar keys),
 * packed appointment lanes forming the second tab stop and "+N more"
 * buttons — Tab-reachable — that open the day's popup list (or drill into
 * the day view under `moreMode: 'drill'`).
 */
@Component({
  selector: 'oge-scheduler-month-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeSchedulerAppointmentChip],
  host: {
    class: 'oge-scheduler-view oge-scheduler-month',
    '[style.--oge-scheduler-month-rows]': 'grid().weeks.length',
  },
  template: `
    <!-- visual headers; the grid's own columnheader row carries the names -->
    <div class="oge-scheduler-month-weekdays" aria-hidden="true">
      @for (day of grid().weeks[0]; track day.getTime()) {
        <div class="oge-scheduler-month-weekday">
          {{ weekdayText(day) }}
        </div>
      }
    </div>
    <!-- the wrapper carries the lane layers so the grid element owns ONLY
         rows (aria-required-children) -->
    <div #monthGridEl class="oge-scheduler-month-area">
      <!-- delegated keydown; focus lives on the roving gridcell -->
      <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
      <div
        class="oge-scheduler-month-grid"
        role="grid"
        [attr.aria-label]="gridAriaLabel()"
        [attr.aria-readonly]="readOnly() ? 'true' : null"
        (keydown)="onGridKeydown($event)"
      >
        <div class="oge-scheduler-sr-header-row" role="row">
          @for (day of grid().weeks[0]; track day.getTime()) {
            <div class="oge-scheduler-sr-header" role="columnheader">
              {{ columnHeaderText(day) }}
            </div>
          }
        </div>
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
                [class.oge-scheduler-cell-weekend]="
                  weekendDays().includes(day.getDay())
                "
                [class.oge-scheduler-cell-disabled]="
                  isBlocked(weekIndex, dayIndex)
                "
                [class.oge-scheduler-cell-focused]="
                  isFocusedCell(weekIndex, dayIndex)
                "
                [class.oge-scheduler-drop-target]="
                  isDropTarget(weekIndex, dayIndex, day)
                "
                [attr.aria-disabled]="
                  isBlocked(weekIndex, dayIndex) ? 'true' : null
                "
                [tabindex]="isFocusedCell(weekIndex, dayIndex) ? 0 : -1"
                [attr.aria-selected]="isSelectedCell(weekIndex, dayIndex)"
                [attr.data-focus-target]="
                  isFocusedCell(weekIndex, dayIndex) ? '' : null
                "
                [attr.aria-label]="cellAriaLabel(day, weekIndex, dayIndex)"
                (click)="onCellClick(weekIndex, dayIndex, $event)"
                (dblclick)="onCellDblClick(day, $event)"
                (keydown)="onCellKeydown(weekIndex, dayIndex, $event)"
                (contextmenu)="
                  cellContextMenu.emit({
                    cellDate: day,
                    allDay: true,
                    event: $event,
                  })
                "
              >
                @if (dayIndex === 0 && weekBadge(week[0]); as badge) {
                  <span class="oge-scheduler-week-number" aria-hidden="true">{{
                    badge
                  }}</span>
                }
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
          </div>
        }
      </div>
      @for (
        week of grid().weeks;
        track week[0].getTime();
        let weekIndex = $index
      ) {
        <div
          class="oge-scheduler-month-lane-layer"
          role="presentation"
          [style.--oge-scheduler-month-lanes]="maxLanes()"
          [style.top.%]="(weekIndex / grid().weeks.length) * 100"
          [style.height.%]="100 / grid().weeks.length"
        >
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
              [class.oge-scheduler-chip-selected]="isSelected(item.appointment)"
              [style.grid-column]="
                item.startDayIndex + 1 + ' / ' + (item.endDayIndex + 2)
              "
              [style.grid-row]="item.lane + 1"
              [class.oge-scheduler-dragging]="
                draggedKey() === item.appointment.key
              "
              (click)="onChipClick(item.appointment, $event)"
              (dblclick)="onChipDblClick(item.appointment, $event)"
              (keydown)="onChipKeydown(item.appointment, $event)"
              (contextmenu)="onChipContextMenu(item.appointment, $event)"
              (focus)="focusedChipKey.set(item.appointment.key)"
              (pointerdown)="onBarPointerDown(item.appointment, $event)"
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
              aria-haspopup="dialog"
              [attr.aria-label]="
                moreAriaLabel(overflow.count, week[overflow.dayIndex])
              "
              [style.grid-column]="overflow.dayIndex + 1"
              [style.grid-row]="maxLanes() + 1"
              (click)="onMoreClick(week[overflow.dayIndex], $event)"
            >
              {{ moreText(overflow.count) }}
            </button>
          }
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
  /** Weekend days (0 = Sunday) the grid shades — the scheduler's resolved list. */
  readonly weekendDays = input<readonly number[]>([0, 6]);
  readonly maxAppointmentsPerCell = input.required<number | 'auto'>();
  /** Months the grid shows. */
  readonly intervalCount = input(1);
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input.required<OgeSchedulerResolvedMessages['grid']>();
  readonly periodLabel = input('');
  readonly allowDragging = input(true);
  /** `aria-readonly` on the grid — the scheduler cannot change anything. */
  readonly readOnly = input(false);
  /** Right-to-left layout: mirrors Left/Right keys and horizontal drag deltas. */
  readonly rtl = input(false);
  readonly showWeekNumbers = input(false);
  readonly weekNumberRule = input<OgeSchedulerWeekNumberRule>('iso');
  readonly disabledSlots = input<OgeSchedulerDisabledSlots | null>(null);
  readonly selection = input<readonly T[]>([]);
  readonly dropPreview = input<{
    readonly slot: OgeSchedulerDropSlot;
    readonly durationMinutes: number;
  } | null>(null);
  readonly appointmentTemplate = input<OgeAppointmentTemplate<T> | null>(null);
  readonly cellTemplate = input<OgeSchedulerCellTemplate | null>(null);

  /** "+N more" pressed — the shell opens the day's popup (or drills in). */
  readonly moreClick = output<SchedulerMoreRequest>();
  readonly cellClicked = output<SchedulerCellEvent>();
  readonly cellDblClicked = output<SchedulerCellEvent>();
  readonly cellActivated = output<SchedulerCellEvent>();
  readonly chipClicked = output<SchedulerChipEvent<T>>();
  readonly chipDblClicked = output<SchedulerChipEvent<T>>();
  readonly chipActivated = output<SchedulerChipEvent<T>>();
  readonly chipDeleteRequested = output<SchedulerAppointment<T>>();
  readonly escapePressed = output<void>();
  /** A day-drag landed (time of day preserved). */
  readonly moveCommitted = output<SchedulerProposalEvent<T>>();
  /** A drag was cancelled with Escape/blur. */
  readonly gestureCancelled = output<void>();
  /** Right-click on a chip. */
  readonly chipContextMenu = output<SchedulerChipEvent<T>>();
  /** Right-click on an empty cell. */
  readonly cellContextMenu = output<SchedulerCellEvent>();
  readonly copyRequested = output<SchedulerAppointment<T>>();
  readonly pasteRequested = output<SchedulerPasteTarget>();
  readonly selectRequested = output<SchedulerSelectRequest<T>>();
  readonly dragOut = output<SchedulerDragOutRequest<T>>();

  protected onChipContextMenu(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.chipContextMenu.emit(this.chipEvent(appointment, event));
  }

  protected readonly grid = computed<MonthGridVm>(() =>
    buildMonthGrid(
      this.anchorDate(),
      this.firstDayOfWeek(),
      this.intervalCount(),
    ),
  );

  protected readonly maxLanes = computed(() =>
    monthMaxLanes(this.maxAppointmentsPerCell()),
  );

  protected readonly weekLanes = computed<readonly LaneLayout<T>[]>(() =>
    buildMonthWeekLayouts(
      this.appointments(),
      this.grid().weeks,
      this.maxLanes(),
    ),
  );

  protected readonly overflowEntries = computed(() =>
    monthOverflowEntries(this.weekLanes()),
  );

  /** Chronological order of the visible chips for the keyboard cycle. */
  protected readonly chipOrder = computed<readonly SchedulerAppointment<T>[]>(
    () => monthChipOrder(this.weekLanes()),
  );

  private readonly blockedDays = computed(() =>
    monthBlockedDays(this.grid().weeks, this.disabledSlots()),
  );

  protected isBlocked(weekIndex: number, dayIndex: number): boolean {
    return this.blockedDays().has(`${weekIndex}:${dayIndex}`);
  }

  /** The week-number badge of a row (`W32`), or `null` when off. */
  protected weekBadge(firstDay: Date): string | null {
    if (!this.showWeekNumbers()) return null;
    return schedulerWeekNumberTexts(
      schedulerWeekNumber(
        firstDay,
        this.weekNumberRule(),
        this.firstDayOfWeek(),
        this.locale(),
      ),
      this.messages(),
    ).badge;
  }

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

  /** `aria-selected`: the roving current day. */
  protected isSelectedCell(weekIndex: number, dayIndex: number): boolean {
    return monthCellSelected(weekIndex, dayIndex, this.focusedCell());
  }

  protected columnHeaderText(day: Date): string {
    return monthColumnHeaderText(day, this.locale());
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
    if (schedulerShortcut(event, false) === 'paste') {
      event.preventDefault();
      this.pasteRequested.emit({
        date: this.grid().weeks[weekIndex][dayIndex],
        allDay: true,
        values: {},
      });
      return;
    }
    const action = monthCellKey(
      event.key,
      weekIndex,
      dayIndex,
      this.rtl(),
      this.grid().weeks.length,
    );
    if (action === null) return;
    event.preventDefault();
    if (action.kind === 'activate') {
      this.cellActivated.emit({
        cellDate: this.grid().weeks[weekIndex][dayIndex],
        allDay: true,
        event,
      });
      return;
    }
    this.focusedCell.set({ week: action.row, day: action.col });
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

  /* ---------- drag gesture (day-only, bpmn five-part pattern) ---------- */

  private readonly monthGridEl =
    viewChild<ElementRef<HTMLElement>>('monthGridEl');

  protected readonly draggedKey = signal<unknown>(null);
  private readonly dropTarget = signal<{ week: number; day: number } | null>(
    null,
  );

  protected isDropTarget(
    weekIndex: number,
    dayIndex: number,
    day: Date,
  ): boolean {
    const target = this.dropTarget();
    if (target !== null) {
      return target.week === weekIndex && target.day === dayIndex;
    }
    const drop = this.dropPreview();
    return drop !== null && sameDay(drop.slot.startDate, day);
  }

  protected onBarPointerDown(
    appointment: SchedulerAppointment<T>,
    event: PointerEvent,
  ): void {
    if (!this.allowDragging() || appointment.disabled || event.button !== 0) {
      return;
    }
    const gridEl = this.monthGridEl()?.nativeElement;
    if (gridEl === undefined) return;
    const rect = gridEl.getBoundingClientRect();
    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const weekCount = this.grid().weeks.length;
    const originIndex = monthOriginIndex(this.grid().weeks, appointment);
    let proposal: AppointmentProposal | null = null;
    let lastX = event.clientX;
    let lastY = event.clientY;
    beginPointerGesture(event, {
      onMove: (_deltaX, _deltaY, moveEvent) => {
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        const { week, day } = monthDropCell(
          moveEvent.clientX,
          moveEvent.clientY,
          rect,
          this.rtl(),
          weekCount,
        );
        this.dropTarget.set({ week, day });
        if (originIndex === -1) return;
        const deltaDays = week * 7 + day - originIndex;
        proposal = proposeMove(appointment, deltaDays, 0, 30);
        this.draggedKey.set(appointment.key);
      },
      onFinish: (commit, cancelled) => {
        this.draggedKey.set(null);
        this.dropTarget.set(null);
        const outside = isOgeSchedulerDragOut(hostRect, lastX, lastY);
        if (commit && outside) {
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

  /** The day under a viewport point — the shell's drop-target `resolve`. */
  dropSlotAt(clientX: number, clientY: number): OgeSchedulerDropSlot | null {
    const gridEl = this.monthGridEl()?.nativeElement;
    if (gridEl === undefined) return null;
    const rect = gridEl.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      clientX < rect.left ||
      clientX >= rect.right ||
      clientY < rect.top ||
      clientY >= rect.bottom
    ) {
      return null;
    }
    const { week, day } = monthDropCell(
      clientX,
      clientY,
      rect,
      this.rtl(),
      this.grid().weeks.length,
    );
    const date = this.grid().weeks[week]?.[day];
    return date === undefined
      ? null
      : { startDate: date, allDay: true, resources: {} };
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
    this.chipClicked.emit(this.chipEvent(appointment, event));
  }

  protected onChipDblClick(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.chipDblClicked.emit(this.chipEvent(appointment, event));
  }

  protected onMoreClick(date: Date, event: MouseEvent): void {
    event.stopPropagation();
    this.moreClick.emit({
      date,
      anchor: event.currentTarget as HTMLElement,
    });
  }

  /* ---------- labels ---------- */

  protected gridAriaLabel(): string {
    return schedulerGridAriaLabel(this.messages(), this.periodLabel());
  }

  protected cellAriaLabel(
    day: Date,
    weekIndex: number,
    dayIndex: number,
  ): string {
    let label = schedulerDayCellAriaLabel(this.messages(), day, this.locale());
    if (dayIndex === 0 && this.showWeekNumbers()) {
      label = `${label}, ${
        schedulerWeekNumberTexts(
          schedulerWeekNumber(
            day,
            this.weekNumberRule(),
            this.firstDayOfWeek(),
            this.locale(),
          ),
          this.messages(),
        ).label
      }`;
    }
    return withUnavailableLabel(
      label,
      this.isBlocked(weekIndex, dayIndex),
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

  protected isCurrentMonth(day: Date): boolean {
    return isMonthViewDay(day, this.anchorDate(), this.intervalCount());
  }

  protected isToday(day: Date): boolean {
    return sameDay(day, new Date());
  }

  protected weekdayText(day: Date): string {
    return weekdayShortText(day, this.locale());
  }

  protected moreText(count: number): string {
    return schedulerMoreText(this.messages(), count);
  }

  protected moreAriaLabel(count: number, day: Date): string {
    return schedulerMoreAriaLabel(this.messages(), count, day, this.locale());
  }

  protected readonly String = String;
}
