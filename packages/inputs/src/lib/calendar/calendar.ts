import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  computed,
  contentChild,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  addDays,
  addMonths,
  addYears,
  sameDay,
  sameMonth,
  startOfDay,
  weekNumber,
} from '@oge-ui/core';
import { OgeControlBase } from '../field/control-base';
import {
  decadeCells,
  isDayDisabled,
  monthCells,
  navigate,
  resolveFirstDayOfWeek,
  viewLabel,
  weekdayNames,
  yearCells,
  type CalendarCell,
} from './calendar-engine';
import type {
  OgeCalendarCellClickEvent,
  OgeCalendarCellTemplateContext,
  OgeCalendarDisabledDates,
  OgeCalendarRange,
  OgeCalendarSelectionMode,
  OgeCalendarWeekNumberOptions,
  OgeCalendarZoomLevel,
} from './calendar-types';

/** Custom calendar cell rendering slot. */
@Directive({ selector: '[ogeCalendarCellTemplate]' })
export class OgeCalendarCellTemplate {
  readonly template = inject(TemplateRef<OgeCalendarCellTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeCalendarCellTemplate,
    _ctx: unknown,
  ): _ctx is OgeCalendarCellTemplateContext {
    return true;
  }
}

const ZOOM_ORDER: OgeCalendarZoomLevel[] = ['month', 'year', 'decade'];

/**
 * Standalone month calendar with year/decade drill-down — WAI-ARIA date grid
 * with a roving-tabindex day button (arrows move ±1/±7 days, PgUp/PgDn ±1
 * month, Shift+PgUp/PgDn ±1 year, Home/End week edges), localized entirely
 * through `Intl` (no date library):
 *
 * ```html
 * <oge-calendar [(value)]="date" />
 * <oge-calendar
 *   [(values)]="dates"
 *   selectionMode="multiple"
 *   [min]="min"
 *   [disabledDates]="isWeekend"
 *   [showTodayButton]="true"
 * />
 * ```
 *
 * Works standalone via `[(value)]`, with Signal Forms via `[formField]`, and
 * with reactive/template forms via `formControl`/`ngModel`. The date box
 * embeds this component as its picker.
 */
@Component({
  selector: 'oge-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: {
    class: 'oge-calendar',
    '[class.oge-calendar-invalid]': 'showError()',
    '[class.oge-calendar-readonly]': 'readonly()',
  },
  template: `
    <div class="oge-calendar-header">
      <button
        type="button"
        class="oge-calendar-nav"
        [attr.aria-label]="msg().calendarPrev"
        [disabled]="effectiveDisabled()"
        (click)="go(-1)"
      >
        <svg
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M10 3 5 8l5 5" />
        </svg>
      </button>
      <button
        type="button"
        class="oge-calendar-view-label"
        [attr.aria-label]="msg().calendarZoomOut"
        [disabled]="effectiveDisabled() || !canZoomOut()"
        (click)="zoomOut()"
      >
        {{ headerLabel() }}
      </button>
      <button
        type="button"
        class="oge-calendar-nav"
        [attr.aria-label]="msg().calendarNext"
        [disabled]="effectiveDisabled()"
        (click)="go(1)"
      >
        <svg
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m6 3 5 5-5 5" />
        </svg>
      </button>
    </div>
    <!-- Delegated keyboard handler: focus lives on the roving-tabindex cell buttons inside. -->
    <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- keyboard access is provided by the roving-tabindex/listbox key handling on the container -->
    <div
      class="oge-calendar-grid"
      role="grid"
      [class.oge-calendar-grid-days]="zoom() === 'month'"
      [attr.aria-label]="label() || msg().calendarLabel"
      (keydown)="onGridKeydown($event)"
    >
      @if (zoom() === 'month') {
        <div class="oge-calendar-views" (mouseleave)="onGridLeave()">
          @for (offset of viewOffsets(); track offset) {
            <div class="oge-calendar-view">
              @if (viewsCount() === 2) {
                <div class="oge-calendar-view-title" role="presentation">
                  {{ monthTitle(offset) }}
                </div>
              }
              <div class="oge-calendar-row oge-calendar-weekdays" role="row">
                @if (weekNumbersOn()) {
                  <span class="oge-calendar-weeknum" role="columnheader">
                    <span class="oge-calendar-sr-only">{{
                      msg().weekColumnLabel
                    }}</span>
                  </span>
                }
                @for (name of weekdays(); track $index) {
                  <span class="oge-calendar-weekday" role="columnheader">{{
                    name
                  }}</span>
                }
              </div>
              @for (week of weeksFor(offset); track $index) {
                <div class="oge-calendar-row" role="row">
                  @if (weekNumbersOn()) {
                    <span class="oge-calendar-weeknum" role="rowheader">{{
                      weekNumberOf(week[0].date)
                    }}</span>
                  }
                  @for (cell of week; track cell.date.getTime()) {
                    <button
                      type="button"
                      class="oge-calendar-cell"
                      role="gridcell"
                      [class.oge-calendar-cell-other]="cell.otherPeriod"
                      [class.oge-calendar-cell-selected]="isSelected(cell.date)"
                      [class.oge-calendar-cell-in-range]="isInRange(cell.date)"
                      [class.oge-calendar-cell-today]="isToday(cell.date)"
                      [disabled]="effectiveDisabled() || cell.disabled"
                      [tabindex]="
                        isFocusTarget(cell.date, cell.otherPeriod)
                          ? tabIndex()
                          : -1
                      "
                      [attr.aria-selected]="isSelected(cell.date)"
                      [attr.aria-current]="isToday(cell.date) ? 'date' : null"
                      [attr.aria-label]="dayAriaLabel(cell.date)"
                      [attr.data-focus-target]="
                        isFocusTarget(cell.date, cell.otherPeriod) ? '' : null
                      "
                      (click)="onCellClick(cell, $event)"
                      (mouseenter)="onCellHover(cell.date)"
                      (focus)="onCellFocus(cell.date)"
                    >
                      <ng-container
                        *ngTemplateOutlet="
                          cellTemplateRef() ?? defaultCell;
                          context: cellContext(cell)
                        "
                      />
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>
      } @else {
        @for (row of zoomedRows(); track $index) {
          <div class="oge-calendar-row" role="row">
            @for (cell of row; track cell.date.getTime()) {
              <button
                type="button"
                class="oge-calendar-cell oge-calendar-cell-wide"
                role="gridcell"
                [class.oge-calendar-cell-other]="cell.otherPeriod"
                [class.oge-calendar-cell-selected]="isZoomedSelected(cell.date)"
                [disabled]="effectiveDisabled() || cell.disabled"
                [tabindex]="isFocusTarget(cell.date) ? tabIndex() : -1"
                [attr.data-focus-target]="isFocusTarget(cell.date) ? '' : null"
                (click)="onCellClick(cell, $event)"
                (focus)="onCellFocus(cell.date)"
              >
                <ng-container
                  *ngTemplateOutlet="
                    cellTemplateRef() ?? defaultCell;
                    context: cellContext(cell)
                  "
                />
              </button>
            }
          </div>
        }
      }
    </div>
    @if (showTodayButton()) {
      <button
        type="button"
        class="oge-calendar-today-btn"
        [disabled]="effectiveDisabled() || todayDisabled()"
        (click)="selectToday($event)"
      >
        {{ msg().todayButton }}
      </button>
    }
    <ng-template #defaultCell let-text="text">{{ text }}</ng-template>
  `,
  styleUrl: './calendar.scss',
})
export class OgeCalendar
  extends OgeControlBase<Date | null>
  implements FormValueControl<Date | null>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The selected day (`selectionMode: 'single'`) — two-way. */
  readonly value = model<Date | null>(null);
  /** The selected days (`selectionMode: 'multiple'`) — two-way. */
  readonly values = model<readonly Date[]>([]);
  /** The selected `[start, end]` (`selectionMode: 'range'`) — two-way. */
  readonly range = model<OgeCalendarRange>([null, null]);
  readonly selectionMode = input<OgeCalendarSelectionMode>('single');
  /** Side-by-side month views (`2` is the range-picking layout). */
  readonly viewsCount = input<1 | 2>(1);
  /** Current drill level — two-way (`month` = days). */
  readonly zoomLevel = model<OgeCalendarZoomLevel>('month');
  /** Most zoomed-out reachable level. */
  readonly minZoomLevel = input<OgeCalendarZoomLevel>('decade');
  /** Most zoomed-in reachable level. */
  readonly maxZoomLevel = input<OgeCalendarZoomLevel>('month');
  /** First selectable day (`undefined` = unbounded). */
  readonly min = input<Date | undefined>(undefined);
  /** Last selectable day (`undefined` = unbounded). */
  readonly max = input<Date | undefined>(undefined);
  /** Individual unselectable days: an array or a predicate. */
  readonly disabledDates = input<OgeCalendarDisabledDates | undefined>(
    undefined,
  );
  /** `0`–`6` (Sunday-first); `undefined` resolves from the locale. */
  readonly firstDayOfWeek = input<number | undefined>(undefined);
  readonly showTodayButton = input(false);
  /** Week-number column: `true` (ISO rule) or `{ rule }`. */
  readonly showWeekNumbers = input<boolean | OgeCalendarWeekNumberOptions>(
    false,
  );
  /** The keyboard-focused day — two-way (Kendo-style controlled navigation). */
  readonly focusedDate = model<Date | null>(null);
  /** BCP 47 locale for all texts; `undefined` = the runtime default. */
  readonly locale = input<string | undefined>(undefined);
  /** Accessible name of the grid (`aria-label`). */
  readonly label = input('');
  /** Custom cell rendering. */
  readonly cellTemplate = input<
    TemplateRef<OgeCalendarCellTemplateContext> | undefined
  >(undefined);

  /** A day/month/year cell was activated by click or keyboard. */
  readonly cellClick = output<OgeCalendarCellClickEvent>();

  protected readonly zoom = this.zoomLevel;

  /** Anchor of the visible view (any date inside the month/year/decade). */
  private readonly viewDate = signal(startOfDay(new Date()));

  protected readonly effFirstDay = computed(() =>
    resolveFirstDayOfWeek(this.firstDayOfWeek(), this.locale()),
  );

  protected readonly weekNumbersOn = computed(
    () => this.showWeekNumbers() !== false,
  );

  private readonly weekRule = computed(() => {
    const option = this.showWeekNumbers();
    return typeof option === 'object' ? option.rule : 'firstFourDays';
  });

  protected readonly weekdays = computed(() =>
    weekdayNames(this.locale(), this.effFirstDay()),
  );

  protected readonly headerLabel = computed(() =>
    viewLabel(this.viewDate(), this.zoom(), this.locale()),
  );

  /** `[0]` or `[0, 1]` — the month offsets of the visible views. */
  protected readonly viewOffsets = computed<readonly number[]>(() =>
    this.viewsCount() === 2 ? [0, 1] : [0],
  );

  private readonly viewWeeks = computed<CalendarCell[][][]>(() =>
    this.viewOffsets().map((offset) => {
      const cells = monthCells(
        addMonths(this.viewDate(), offset),
        this.effFirstDay(),
        this.locale(),
        this.min(),
        this.max(),
        this.disabledDates(),
      );
      return Array.from({ length: 6 }, (_, week) =>
        cells.slice(week * 7, week * 7 + 7),
      );
    }),
  );

  protected weeksFor(offset: number): CalendarCell[][] {
    return this.viewWeeks()[this.viewOffsets().indexOf(offset)] ?? [];
  }

  protected monthTitle(offset: number): string {
    return viewLabel(
      addMonths(this.viewDate(), offset),
      'month',
      this.locale(),
    );
  }

  protected readonly zoomedRows = computed<CalendarCell[][]>(() => {
    const cells =
      this.zoom() === 'year'
        ? yearCells(this.viewDate(), this.locale(), this.min(), this.max())
        : decadeCells(this.viewDate(), this.min(), this.max());
    return Array.from({ length: 3 }, (_, row) =>
      cells.slice(row * 4, row * 4 + 4),
    );
  });

  /** The single grid cell carrying the reachable tabindex. */
  private readonly focusTarget = computed<Date>(() => {
    const focused = this.focusedDate() ?? this.value() ?? new Date();
    const anchor = this.viewDate();
    if (this.zoom() === 'month') {
      const visible = this.viewOffsets().some((offset) =>
        sameMonth(focused, addMonths(anchor, offset)),
      );
      return visible ? startOfDay(focused) : anchor;
    }
    return anchor;
  });

  // --- range selection -------------------------------------------------------

  /** Hovered day while picking a range end (preview shading). */
  private readonly hoveredDate = signal<Date | null>(null);

  private readonly rangePreviewEnd = computed<Date | null>(() => {
    if (this.selectionMode() !== 'range') return null;
    const [start, end] = this.range();
    if (!start) return null;
    return end ?? this.hoveredDate();
  });

  protected isRangeEdge(date: Date): boolean {
    if (this.selectionMode() !== 'range') return false;
    const [start, end] = this.range();
    return sameDay(start, date) || sameDay(end, date);
  }

  protected isInRange(date: Date): boolean {
    if (this.selectionMode() !== 'range') return false;
    const [start] = this.range();
    const end = this.rangePreviewEnd();
    if (!start || !end) return false;
    const time = startOfDay(date).getTime();
    const a = startOfDay(start).getTime();
    const b = startOfDay(end).getTime();
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    return time > lo && time < hi;
  }

  protected onCellHover(date: Date): void {
    if (this.selectionMode() === 'range') this.hoveredDate.set(date);
  }

  protected onGridLeave(): void {
    this.hoveredDate.set(null);
  }

  private readonly dayLabelFormat = computed(
    () => new Intl.DateTimeFormat(this.locale(), { dateStyle: 'full' }),
  );

  protected dayAriaLabel(date: Date): string {
    return this.dayLabelFormat().format(date);
  }

  protected cellContext(cell: CalendarCell): OgeCalendarCellTemplateContext {
    return {
      $implicit: cell.date,
      view: this.zoom(),
      text: cell.text,
      disabled: cell.disabled,
      selected:
        this.zoom() === 'month'
          ? this.isSelected(cell.date)
          : this.isZoomedSelected(cell.date),
      today: this.zoom() === 'month' && this.isToday(cell.date),
      otherPeriod: cell.otherPeriod,
    };
  }

  protected isSelected(date: Date): boolean {
    if (this.selectionMode() === 'multiple') {
      return this.values().some((candidate) => sameDay(candidate, date));
    }
    if (this.selectionMode() === 'range') return this.isRangeEdge(date);
    return sameDay(this.value(), date);
  }

  protected isZoomedSelected(date: Date): boolean {
    const selected = this.value();
    if (!selected) return false;
    return this.zoom() === 'year'
      ? sameMonth(selected, date)
      : selected.getFullYear() === date.getFullYear();
  }

  protected isToday(date: Date): boolean {
    return sameDay(date, new Date());
  }

  protected isFocusTarget(date: Date, otherPeriod = false): boolean {
    if (this.zoom() === 'month') {
      // with two views a lead-in/out day exists twice — only its own month's
      // cell may carry the tabindex
      if (this.viewsCount() === 2 && otherPeriod) return false;
      return sameDay(date, this.focusTarget());
    }
    if (this.zoom() === 'year') {
      return sameMonth(date, this.focusTarget());
    }
    return date.getFullYear() === this.focusTarget().getFullYear();
  }

  protected weekNumberOf(date: Date): number {
    return weekNumber(date, this.weekRule());
  }

  protected canZoomOut(): boolean {
    return (
      ZOOM_ORDER.indexOf(this.zoom()) < ZOOM_ORDER.indexOf(this.minZoomLevel())
    );
  }

  protected zoomOut(): void {
    if (!this.canZoomOut()) return;
    this.zoomLevel.set(ZOOM_ORDER[ZOOM_ORDER.indexOf(this.zoom()) + 1]);
  }

  protected go(direction: 1 | -1): void {
    this.viewDate.set(navigate(this.viewDate(), this.zoom(), direction));
  }

  protected todayDisabled(): boolean {
    return isDayDisabled(
      new Date(),
      this.min(),
      this.max(),
      this.disabledDates(),
    );
  }

  protected selectToday(event: Event): void {
    const today = startOfDay(new Date());
    this.viewDate.set(today);
    this.zoomLevel.set(this.maxZoomLevel());
    this.selectDay(today, event);
  }

  protected onCellFocus(date: Date): void {
    if (this.zoom() === 'month') this.focusedDate.set(startOfDay(date));
  }

  protected onCellClick(cell: CalendarCell, event: Event): void {
    if (this.effectiveDisabled() || this.readonly() || cell.disabled) return;
    this.cellClick.emit({ date: cell.date, view: this.zoom(), event });
    if (this.zoom() === 'month') {
      this.selectDay(cell.date, event);
      return;
    }
    // drill in: year → its month view, decade → its year view
    this.viewDate.set(cell.date);
    this.zoomLevel.set(this.zoom() === 'decade' ? 'year' : 'month');
    this.queueFocusTarget();
  }

  private selectDay(date: Date, event: Event): void {
    const day = startOfDay(date);
    this.focusedDate.set(day);
    // keep the visible views steady while the day is already on screen
    const visible = this.viewOffsets().some((offset) =>
      sameMonth(day, addMonths(this.viewDate(), offset)),
    );
    if (!visible) this.viewDate.set(day);
    if (this.selectionMode() === 'multiple') {
      const current = this.values();
      const exists = current.some((candidate) => sameDay(candidate, day));
      this.values.set(
        exists
          ? current.filter((candidate) => !sameDay(candidate, day))
          : [...current, day],
      );
      this.selfDirty.set(true);
      return;
    }
    if (this.selectionMode() === 'range') {
      const [start, end] = this.range();
      if (!start || end) {
        this.range.set([day, null]);
      } else {
        this.range.set(
          day.getTime() < start.getTime() ? [day, start] : [start, day],
        );
      }
      this.selfDirty.set(true);
      return;
    }
    this.commitNow(day, event);
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) return;
    const zoom = this.zoom();
    const focused = this.focusTarget();
    let next: Date | null = null;
    switch (event.key) {
      case 'ArrowLeft':
        next = this.step(focused, zoom, -1);
        break;
      case 'ArrowRight':
        next = this.step(focused, zoom, 1);
        break;
      case 'ArrowUp':
        next = this.step(focused, zoom, zoom === 'month' ? -7 : -4);
        break;
      case 'ArrowDown':
        next = this.step(focused, zoom, zoom === 'month' ? 7 : 4);
        break;
      case 'PageUp':
        next =
          zoom === 'month'
            ? event.shiftKey
              ? addYears(focused, -1)
              : addMonths(focused, -1)
            : null;
        break;
      case 'PageDown':
        next =
          zoom === 'month'
            ? event.shiftKey
              ? addYears(focused, 1)
              : addMonths(focused, 1)
            : null;
        break;
      case 'Home':
      case 'End': {
        if (zoom !== 'month') break;
        const index = (focused.getDay() - this.effFirstDay() + 7) % 7;
        next = addDays(focused, event.key === 'Home' ? -index : 6 - index);
        break;
      }
    }
    if (next === null) return;
    event.preventDefault();
    this.moveFocusTo(next);
  }

  private step(
    focused: Date,
    zoom: OgeCalendarZoomLevel,
    amount: number,
  ): Date {
    if (zoom === 'month') return addDays(focused, amount);
    if (zoom === 'year') return addMonths(focused, amount);
    return addYears(focused, amount);
  }

  private moveFocusTo(date: Date): void {
    this.focusedDate.set(startOfDay(date));
    this.viewDate.set(startOfDay(date));
    this.queueFocusTarget();
  }

  /** Focuses the roving-tabindex cell after the pending render. */
  private queueFocusTarget(): void {
    setTimeout(() =>
      this.hostEl.nativeElement
        .querySelector<HTMLElement>('[data-focus-target]')
        ?.focus(),
    );
  }

  // --- base contract ---------------------------------------------------------

  protected override onValueWritten(): void {
    const value = this.value();
    if (value) {
      this.viewDate.set(startOfDay(value));
      this.focusedDate.set(startOfDay(value));
    }
  }

  protected nativeElement(): HTMLElement | null {
    return (
      this.hostEl.nativeElement.querySelector<HTMLElement>(
        '[data-focus-target]',
      ) ?? null
    );
  }

  protected emptyValue(): Date | null {
    return null;
  }

  protected valueIsEmpty(value: Date | null): boolean {
    return value === null;
  }

  protected override normalizeWrite(value: unknown): Date | null {
    return value instanceof Date && !Number.isNaN(value.getTime())
      ? value
      : null;
  }

  private readonly projectedCellTemplate = contentChild(
    OgeCalendarCellTemplate,
  );

  protected readonly cellTemplateRef = computed(
    () => this.cellTemplate() ?? this.projectedCellTemplate()?.template,
  );
}
