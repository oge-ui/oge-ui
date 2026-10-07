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
import {
  beginPointerGesture,
  buildGroupedTimelineRows,
  buildHorizontalTimelineRow,
  buildTimelineGrid,
  chipSelectKey,
  isOgeSchedulerDragOut,
  isWeekendDay,
  leafWorkHours,
  sameGroupValues,
  schedulerChipAriaLabel,
  schedulerShortcut,
  chipForeground,
  shouldVirtualizeTimeline,
  timelineAxisPct,
  timelineBarCtrlKey,
  timelineBlockDragMove,
  timelineBlockedBoxes,
  timelineDateAt,
  timelineDragMove,
  timelineHeaderCells,
  timelineHourLabels,
  timelineOffHoursBoxes,
  timelineRowAt,
  timelineRowHeight,
  timelineRowIdReader,
  timelineScaleOf,
  timelineVirtualWindow,
  toSchedulerView,
  withSelectedLabel,
  type AppointmentProposal,
  type OgeSchedulerDisabledSlots,
  type OgeSchedulerDropSlot,
  type OgeSchedulerGroupOrientation,
  type OgeSchedulerResolvedMessages,
  type SchedulerAppointment,
  type SchedulerChipEvent,
  type SchedulerGroupLeaf,
  type SchedulerTimelineViewType,
  type TimelineBar,
  type TimelineGridVm,
  type TimelineMoveEvent,
  type TimelineRow,
} from '@oge-ui/scheduler-engine';
import type {
  OgeSchedulerResource,
  OgeSchedulerResourceItem,
  OgeSchedulerWorkHours,
} from '../scheduler-types';
import type {
  SchedulerDragOutRequest,
  SchedulerSelectRequest,
} from './day-week-view';
import type {
  OgeResourceHeaderTemplate,
  OgeResourceHeaderTemplateContext,
} from './scheduler-templates';

/**
 * Internal timeline view: a horizontal time axis (day, week and work week
 * at hour scale; month and year at day scale) with one row per grouped leaf
 * — nested levels add group header rows — or one track of side-by-side
 * blocks under horizontal grouping. Bars stack into lanes via the overlap
 * kernel (transposed). Long resource lists virtualize on fixed row heights
 * (`virtualScrolling`, core's offset tree).
 */
@Component({
  selector: 'oge-scheduler-timeline-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: {
    class: 'oge-scheduler-view oge-scheduler-timeline',
    '[class.oge-scheduler-timeline-day-scale]': "grid().scale === 'day'",
    '[class.oge-scheduler-timeline-year]': "view() === 'timelineYear'",
    '[style.--oge-scheduler-timeline-days]':
      'grid().days.length * blockCount()',
  },
  template: `
    <div #scrollEl class="oge-scheduler-timeline-scroll" (scroll)="onScroll()">
      <div class="oge-scheduler-timeline-inner">
        @if (horizontal()) {
          <div class="oge-scheduler-timeline-header" role="presentation">
            <div class="oge-scheduler-timeline-corner"></div>
            <div class="oge-scheduler-timeline-days">
              @for (block of horizontalBlocks(); track $index; let b = $index) {
                <div
                  class="oge-scheduler-timeline-dayhead oge-scheduler-timeline-blockhead"
                  [style.inset-inline-start.%]="(b * 100) / blockCount()"
                  [style.width.%]="100 / blockCount()"
                >
                  @if (headerTemplateFor(block); as tpl) {
                    <ng-container
                      [ngTemplateOutlet]="tpl.templateRef"
                      [ngTemplateOutletContext]="headerContext(block)"
                    />
                  } @else {
                    {{ block.text }}
                  }
                </div>
              }
            </div>
          </div>
        }
        <div class="oge-scheduler-timeline-header" role="presentation">
          <div class="oge-scheduler-timeline-corner"></div>
          <div class="oge-scheduler-timeline-days">
            @for (b of blockIndexes(); track b) {
              @for (cell of headerCells(); track cell.key) {
                <div
                  class="oge-scheduler-timeline-dayhead"
                  [class.oge-scheduler-day-today]="cell.today"
                  [style.inset-inline-start.%]="blockPct(b, cell.pct)"
                  [style.width.%]="cell.widthPct / blockCount()"
                >
                  {{ cell.text }}
                </div>
              }
            }
          </div>
        </div>
        @if (hourLabels().length > 0) {
          <div class="oge-scheduler-timeline-subheader" role="presentation">
            <div class="oge-scheduler-timeline-corner"></div>
            <div class="oge-scheduler-timeline-days">
              @for (b of blockIndexes(); track b) {
                @for (label of hourLabels(); track label.pct) {
                  <span
                    class="oge-scheduler-timeline-hour"
                    [style.inset-inline-start.%]="blockPct(b, label.pct)"
                    >{{ label.text }}</span
                  >
                }
              }
            </div>
          </div>
        }
        <div #bodyEl class="oge-scheduler-timeline-body">
          @if (windowed().padStart > 0) {
            <div
              class="oge-scheduler-timeline-spacer"
              aria-hidden="true"
              [style.height.px]="windowed().padStart"
            ></div>
          }
          @for (entry of windowed().rows; track entry.key) {
            @if (entry.row.kind === 'group') {
              <div
                class="oge-scheduler-timeline-row oge-scheduler-timeline-group-row"
                [style.height.px]="entry.height"
                [style.--oge-scheduler-timeline-level]="entry.row.level ?? 0"
              >
                <div class="oge-scheduler-timeline-rowhead">
                  @if (headerTemplateFor(entry.row); as tpl) {
                    <ng-container
                      [ngTemplateOutlet]="tpl.templateRef"
                      [ngTemplateOutletContext]="headerContext(entry.row)"
                    />
                  } @else {
                    {{ entry.row.text }}
                  }
                </div>
                <div class="oge-scheduler-timeline-group-fill"></div>
              </div>
            } @else {
              <div
                class="oge-scheduler-timeline-row"
                [style.height.px]="entry.height"
                [style.--oge-scheduler-timeline-level]="entry.row.level ?? 0"
              >
                <div class="oge-scheduler-timeline-rowhead">
                  <span
                    class="oge-scheduler-agenda-dot"
                    [style.background-color]="entry.row.color ?? null"
                    aria-hidden="true"
                  ></span>
                  @if (headerTemplateFor(entry.row); as tpl) {
                    <ng-container
                      [ngTemplateOutlet]="tpl.templateRef"
                      [ngTemplateOutletContext]="headerContext(entry.row)"
                    />
                  } @else {
                    {{ entry.row.text }}
                  }
                </div>
                <div
                  class="oge-scheduler-timeline-track"
                  [attr.data-row-index]="entry.index"
                  [style.--oge-scheduler-timeline-lanes]="entry.row.laneCount"
                >
                  @for (day of trackDays(); track $index) {
                    <div
                      class="oge-scheduler-timeline-daycol"
                      [class.oge-scheduler-cell-weekend]="isWeekend(day)"
                      [style.width.%]="100 / trackDays().length"
                    ></div>
                  }
                  @for (box of offHoursOf(entry.row); track box.key) {
                    <div
                      class="oge-scheduler-timeline-offhours"
                      aria-hidden="true"
                      [style.inset-inline-start.%]="box.leftPct"
                      [style.width.%]="box.widthPct"
                    ></div>
                  }
                  @for (box of blockedOf(entry.row); track box.key) {
                    <div
                      class="oge-scheduler-timeline-blocked"
                      aria-hidden="true"
                      [attr.title]="box.text ?? null"
                      [style.inset-inline-start.%]="box.leftPct"
                      [style.width.%]="box.widthPct"
                    ></div>
                  }
                  @for (bar of entry.row.bars; track bar.key) {
                    <button
                      type="button"
                      class="oge-scheduler-timeline-bar oge-scheduler-chip-stop"
                      [attr.aria-label]="barLabel(bar.appointment)"
                      [attr.data-appointment-key]="String(bar.appointment.key)"
                      [class.oge-scheduler-bar-clipped-start]="bar.clippedStart"
                      [class.oge-scheduler-bar-clipped-end]="bar.clippedEnd"
                      [class.oge-scheduler-chip-selected]="
                        isSelected(bar.appointment)
                      "
                      [class.oge-scheduler-dragging]="
                        preview()?.key === bar.appointment.key
                      "
                      [style.inset-inline-start.%]="bar.leftPct"
                      [style.width.%]="bar.widthPct"
                      [style.top.px]="4 + bar.lane * 26"
                      [style.background-color]="bar.appointment.color ?? null"
                      [style.color]="chipForeground(bar.appointment.color)"
                      (click)="onBarClick(bar.appointment, $event)"
                      (dblclick)="onBarDblClick(bar.appointment, $event)"
                      (keydown)="onBarKeydown(bar.appointment, $event)"
                      (pointerdown)="onBarPointerDown(bar, entry.index, $event)"
                    >
                      {{ bar.appointment.text }}
                    </button>
                  }
                  @if (preview(); as p) {
                    @if (p.rowIndex === entry.index) {
                      <div
                        class="oge-scheduler-drag-preview oge-scheduler-timeline-preview"
                        aria-hidden="true"
                        [style.inset-inline-start.%]="p.leftPct"
                        [style.width.%]="p.widthPct"
                      ></div>
                    }
                  }
                  @if (dropBar(); as drop) {
                    @if (drop.rowIndex === entry.index) {
                      <div
                        class="oge-scheduler-drag-preview oge-scheduler-timeline-preview oge-scheduler-drop-preview"
                        aria-hidden="true"
                        [style.inset-inline-start.%]="drop.leftPct"
                        [style.width.%]="drop.widthPct"
                      ></div>
                    }
                  }
                </div>
              </div>
            }
          }
          @if (windowed().padEnd > 0) {
            <div
              class="oge-scheduler-timeline-spacer"
              aria-hidden="true"
              [style.height.px]="windowed().padEnd"
            ></div>
          }
        </div>
      </div>
    </div>
  `,
})
export class OgeSchedulerTimelineView<T = unknown> {
  readonly view = input.required<SchedulerTimelineViewType>();
  readonly anchorDate = input.required<Date>();
  readonly appointments = input.required<readonly SchedulerAppointment<T>[]>();
  readonly firstDayOfWeek = input.required<number>();
  /** Weekend days (0 = Sunday) the grid shades — the scheduler's resolved list. */
  readonly weekendDays = input<readonly number[]>([0, 6]);
  readonly hiddenWeekDays = input<readonly number[] | undefined>(undefined);
  readonly dayStartHour = input.required<number>();
  readonly dayEndHour = input.required<number>();
  readonly cellDuration = input.required<number>();
  readonly intervalCount = input(1);
  readonly locale = input<string | undefined>(undefined);
  /** The display zone: "today" and the now-line follow its clocks. */
  readonly timeZone = input<string | undefined>(undefined);
  readonly messages = input.required<OgeSchedulerResolvedMessages['grid']>();
  readonly groupLevels = input<readonly OgeSchedulerResource[]>([]);
  readonly groupLeaves = input<readonly SchedulerGroupLeaf[]>([]);
  readonly groupOrientation = input<OgeSchedulerGroupOrientation>('vertical');
  readonly allowDragging = input(true);
  /** Drag snap raster in minutes; defaults to `cellDuration`. */
  readonly snapDuration = input<number | undefined>(undefined);
  /** Right-to-left layout: mirrors Left/Right keys and horizontal drag deltas. */
  readonly rtl = input(false);
  readonly workHours = input<OgeSchedulerWorkHours | null>(null);
  readonly disabledSlots = input<OgeSchedulerDisabledSlots | null>(null);
  readonly selection = input<readonly T[]>([]);
  readonly virtualScrolling = input<boolean | 'auto'>('auto');
  readonly dropPreview = input<{
    readonly slot: OgeSchedulerDropSlot;
    readonly durationMinutes: number;
  } | null>(null);
  readonly resourceHeaderTemplate = input<OgeResourceHeaderTemplate | null>(
    null,
  );

  readonly chipClicked = output<SchedulerChipEvent<T>>();
  readonly chipDblClicked = output<SchedulerChipEvent<T>>();
  readonly chipDeleteRequested = output<SchedulerAppointment<T>>();
  /** A bar drag landed — time shift + optional resource-row change. */
  readonly moveCommitted = output<TimelineMoveEvent<T>>();
  readonly gestureCancelled = output<void>();
  readonly copyRequested = output<SchedulerAppointment<T>>();
  readonly selectRequested = output<SchedulerSelectRequest<T>>();
  readonly dragOut = output<SchedulerDragOutRequest<T>>();

  protected readonly grid = computed<TimelineGridVm>(() =>
    buildTimelineGrid(
      this.view(),
      this.anchorDate(),
      this.firstDayOfWeek(),
      this.dayStartHour(),
      this.dayEndHour(),
      this.cellDuration(),
      {
        intervalCount: this.intervalCount(),
        hiddenWeekDays: this.hiddenWeekDays(),
        weekendDays: this.weekendDays(),
      },
    ),
  );

  private readonly scale = computed(() => timelineScaleOf(this.view()));

  /** Snap raster: the slot (hour scale) or one day (day scale). */
  private snapMinutes(): number {
    return this.scale() === 'day'
      ? 1440
      : (this.snapDuration() ?? this.cellDuration());
  }

  protected readonly horizontal = computed(
    () =>
      this.groupOrientation() === 'horizontal' && this.groupLevels().length > 0,
  );

  private readonly groupedRows = computed<readonly TimelineRow<T>[]>(() =>
    buildGroupedTimelineRows(
      this.appointments(),
      this.grid(),
      this.scale() === 'day' ? 1440 : this.cellDuration(),
      this.groupLevels(),
      this.groupLeaves(),
      this.messages().unassignedLabel,
      this.scale(),
    ),
  );

  private readonly horizontalRow = computed(() =>
    buildHorizontalTimelineRow(
      this.groupedRows(),
      this.messages().unassignedLabel,
    ),
  );

  /** The rendered rows (horizontal grouping: one track of blocks). */
  protected readonly rows = computed<readonly TimelineRow<T>[]>(() =>
    this.horizontal() ? [this.horizontalRow().row] : this.groupedRows(),
  );

  protected readonly horizontalBlocks = computed(
    () => this.horizontalRow().blocks,
  );

  protected readonly blockCount = computed(() =>
    this.horizontal() ? Math.max(1, this.horizontalBlocks().length) : 1,
  );

  protected readonly blockIndexes = computed(() =>
    Array.from({ length: this.blockCount() }, (_, index) => index),
  );

  protected blockPct(block: number, pct: number): number {
    return (block * 100 + pct) / this.blockCount();
  }

  /** The day columns of a track (repeated per block when side by side). */
  protected readonly trackDays = computed(() => {
    const days = this.grid().days;
    return this.blockCount() === 1
      ? days
      : this.blockIndexes().flatMap(() => days);
  });

  protected readonly headerCells = computed(() =>
    timelineHeaderCells(
      this.grid(),
      this.view(),
      this.locale(),
      toSchedulerView(new Date(), this.timeZone()),
    ),
  );

  protected readonly hourLabels = computed(() =>
    timelineHourLabels(this.grid(), this.view(), this.locale()),
  );

  private readonly resourceRows = computed(() =>
    this.rows().filter((row) => row.kind !== 'group'),
  );

  private readonly rowIdOf = computed(() =>
    timelineRowIdReader<T>(this.groupLevels(), this.groupLeaves()),
  );

  /* ---------- availability shading ---------- */

  protected offHoursOf(row: TimelineRow<T>) {
    const workHours = leafWorkHours(row.leaf, this.workHours());
    if (this.horizontal()) return [];
    return timelineOffHoursBoxes(this.grid(), workHours);
  }

  protected blockedOf(row: TimelineRow<T>) {
    if (this.horizontal()) {
      return this.horizontalBlocks().flatMap((block, index) =>
        timelineBlockedBoxes(
          this.grid(),
          this.disabledSlots(),
          block.values ?? {},
          this.cellDuration(),
        ).map((box) => ({
          ...box,
          key: `${index}-${box.key}`,
          leftPct: this.blockPct(index, box.leftPct),
          widthPct: box.widthPct / this.blockCount(),
        })),
      );
    }
    return timelineBlockedBoxes(
      this.grid(),
      this.disabledSlots(),
      row.values ?? {},
      this.cellDuration(),
    );
  }

  protected isWeekend(day: Date): boolean {
    return isWeekendDay(day, this.weekendDays());
  }

  /** The resource-header template for a row that heads a resource item. */
  protected headerTemplateFor(
    row: TimelineRow<T>,
  ): OgeResourceHeaderTemplate | null {
    return row.item !== undefined && row.resource !== undefined
      ? this.resourceHeaderTemplate()
      : null;
  }

  protected headerContext(
    row: TimelineRow<T>,
  ): OgeResourceHeaderTemplateContext {
    return {
      $implicit: row.item as OgeSchedulerResourceItem,
      resource: row.resource as OgeSchedulerResource,
      level: row.level ?? 0,
      view: this.view(),
    };
  }

  protected isSelected(appointment: SchedulerAppointment<T>): boolean {
    return this.selection().includes(appointment.source);
  }

  protected barLabel(appointment: SchedulerAppointment<T>): string {
    return withSelectedLabel(
      schedulerChipAriaLabel(this.messages(), appointment, this.locale()),
      this.isSelected(appointment),
      this.messages(),
    );
  }

  /* ---------- virtualization ---------- */

  private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');
  private readonly bodyEl = viewChild<ElementRef<HTMLElement>>('bodyEl');
  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(0);

  protected onScroll(): void {
    const scroll = this.scrollEl()?.nativeElement;
    const body = this.bodyEl()?.nativeElement;
    if (scroll === undefined || body === undefined) return;
    this.scrollTop.set(Math.max(0, scroll.scrollTop - body.offsetTop));
    this.viewportHeight.set(scroll.clientHeight);
  }

  protected readonly windowed = computed(() => {
    const rows = this.rows();
    const all = rows.map((row, index) => ({
      row,
      index,
      key: this.rowKey(row, index),
      height: timelineRowHeight(row),
    }));
    if (!shouldVirtualizeTimeline(this.virtualScrolling(), rows.length)) {
      return { rows: all, padStart: 0, padEnd: 0 };
    }
    const window = timelineVirtualWindow(
      rows,
      this.scrollTop(),
      this.viewportHeight(),
    );
    return {
      rows: all.slice(window.start, window.end),
      padStart: window.padStart,
      padEnd: window.padEnd,
    };
  });

  private rowKey(row: TimelineRow<T>, index: number): string {
    return `${row.kind ?? 'resource'}:${index}:${row.text}`;
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.onScroll();
      const scroll = this.scrollEl()?.nativeElement;
      if (scroll === undefined || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.onScroll());
      observer.observe(scroll);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Live drag preview: proposed bar geometry + target row. */
  protected readonly preview = signal<{
    key: unknown;
    leftPct: number;
    widthPct: number;
    rowIndex: number;
  } | null>(null);

  /** The external-drop preview bar. */
  protected readonly dropBar = computed(() => {
    const drop = this.dropPreview();
    if (drop === null) return null;
    const grid = this.grid();
    const start = timelineAxisPct(grid, drop.slot.startDate);
    if (start === null) return null;
    const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
    const totalSpan = windowSpan * grid.days.length;
    const minutes = this.scale() === 'day' ? 1440 : drop.durationMinutes;
    const width = (Math.min(minutes, windowSpan) / totalSpan) * 100;
    if (this.horizontal()) {
      const block = Math.max(
        0,
        this.horizontalBlocks().findIndex((entry) =>
          sameGroupValues(entry.values ?? {}, drop.slot.resources),
        ),
      );
      return {
        rowIndex: 0,
        leftPct: this.blockPct(block, start),
        widthPct: width / this.blockCount(),
      };
    }
    const rowIndex = this.rows().findIndex(
      (row) =>
        row.kind !== 'group' &&
        sameGroupValues(row.values ?? {}, drop.slot.resources),
    );
    return { rowIndex: Math.max(0, rowIndex), leftPct: start, widthPct: width };
  });

  private tracks(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        '.oge-scheduler-timeline-track',
      ),
    );
  }

  /** The row index a rendered track element stands for. */
  private trackRowIndex(track: HTMLElement): number {
    return Number(track.getAttribute('data-row-index') ?? -1);
  }

  /**
   * Bar drag: horizontal = day + slot-snapped time shift (and, side by
   * side, the target block), vertical = target resource row. Recurring
   * occurrences shift in time through the scope routing but keep their row.
   */
  protected onBarPointerDown(
    bar: TimelineBar<T>,
    rowIndex: number,
    event: PointerEvent,
  ): void {
    const appointment = bar.appointment;
    if (!this.allowDragging() || appointment.disabled || event.button !== 0) {
      return;
    }
    const tracks = this.tracks();
    const originTrack = tracks.find(
      (track) => this.trackRowIndex(track) === rowIndex,
    );
    if (originTrack === undefined) return;
    const trackRect = originTrack.getBoundingClientRect();
    const rowRects = tracks.map((track) => track.getBoundingClientRect());
    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const grid = this.grid();
    const horizontal = this.horizontal();
    let proposal: AppointmentProposal | null = null;
    let targetRow = rowIndex;
    let targetBlock = -1;
    let lastX = event.clientX;
    let lastY = event.clientY;
    beginPointerGesture(event, {
      onMove: (deltaX, _deltaY, moveEvent) => {
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        if (horizontal) {
          const move = timelineBlockDragMove(
            appointment,
            deltaX,
            trackRect.width,
            grid,
            this.snapMinutes(),
            bar.leftPct,
            this.blockCount(),
            this.rtl(),
          );
          proposal = move.proposal;
          targetBlock = move.block;
          this.preview.set({
            key: appointment.key,
            leftPct: move.leftPct,
            widthPct: bar.widthPct,
            rowIndex,
          });
          return;
        }
        const move = timelineDragMove(
          appointment,
          deltaX,
          trackRect.width,
          grid,
          this.snapMinutes(),
          bar.leftPct,
          this.rtl(),
        );
        proposal = move.proposal;
        const hit = timelineRowAt(moveEvent.clientY, rowRects, -1);
        targetRow = hit === -1 ? rowIndex : this.trackRowIndex(tracks[hit]);
        this.preview.set({
          key: appointment.key,
          leftPct: move.leftPct,
          widthPct: bar.widthPct,
          rowIndex: targetRow,
        });
      },
      onFinish: (commit, cancelled) => {
        this.preview.set(null);
        const outside = isOgeSchedulerDragOut(hostRect, lastX, lastY);
        if (commit && outside) {
          this.dragOut.emit({ appointment, clientX: lastX, clientY: lastY });
          return;
        }
        if (commit && proposal !== null) {
          let values: Readonly<Record<string, unknown>> | undefined;
          if (horizontal) {
            const block = this.horizontalBlocks()[targetBlock];
            const originBlock = Math.floor(
              (bar.leftPct / 100) * this.blockCount(),
            );
            if (
              block !== undefined &&
              targetBlock !== originBlock &&
              block.id !== null
            ) {
              values = block.values;
            }
          } else if (targetRow !== rowIndex) {
            const row = this.rows()[targetRow];
            if (row !== undefined && row.id !== null && row.kind !== 'group') {
              values = row.values;
            }
          }
          this.moveCommitted.emit(
            this.moveEvent(appointment, proposal, values),
          );
        } else if (cancelled) {
          this.gestureCancelled.emit();
        }
      },
    });
  }

  private moveEvent(
    appointment: SchedulerAppointment<T>,
    proposal: AppointmentProposal,
    values: Readonly<Record<string, unknown>> | undefined,
  ): TimelineMoveEvent<T> {
    if (values === undefined) return { appointment, proposal };
    const first = this.groupLevels()[0];
    return {
      appointment,
      proposal,
      resources: values,
      ...(first !== undefined ? { resourceId: values[first.fieldExpr] } : {}),
    };
  }

  /** The slot under a viewport point — the shell's drop-target `resolve`. */
  dropSlotAt(clientX: number, clientY: number): OgeSchedulerDropSlot | null {
    const tracks = this.tracks();
    const hit = timelineRowAt(
      clientY,
      tracks.map((track) => track.getBoundingClientRect()),
      -1,
    );
    if (hit === -1) return null;
    const track = tracks[hit];
    const rect = track.getBoundingClientRect();
    if (clientX < rect.left || clientX >= rect.right) return null;
    const grid = this.grid();
    const snap = this.snapMinutes();
    const allDay = this.scale() === 'day';
    if (this.horizontal()) {
      const count = this.blockCount();
      const blockWidth = rect.width / count;
      const offset = this.rtl() ? rect.right - clientX : clientX - rect.left;
      const block = Math.min(count - 1, Math.floor(offset / blockWidth));
      const within = offset - block * blockWidth;
      const date = timelineDateAt(grid, within, blockWidth, snap);
      if (date === null) return null;
      return {
        startDate: date,
        allDay,
        resources: this.horizontalBlocks()[block]?.values ?? {},
      };
    }
    const row = this.rows()[this.trackRowIndex(track)];
    const date = timelineDateAt(
      grid,
      clientX - rect.left,
      rect.width,
      snap,
      this.rtl(),
    );
    if (date === null || row === undefined) return null;
    return { startDate: date, allDay, resources: row.values ?? {} };
  }

  private chipEvent(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): SchedulerChipEvent<T> {
    return {
      appointment,
      event,
      rect: (event.currentTarget as HTMLElement).getBoundingClientRect(),
      order: this.rows().flatMap((row) =>
        row.bars.map((bar) => bar.appointment),
      ),
    };
  }

  protected onBarClick(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    this.chipClicked.emit(this.chipEvent(appointment, event));
  }

  protected onBarDblClick(
    appointment: SchedulerAppointment<T>,
    event: MouseEvent,
  ): void {
    this.chipDblClicked.emit(this.chipEvent(appointment, event));
  }

  /** Keyboard drag equivalents: Ctrl+Arrows move, Ctrl+Shift+Right/Left resize. */
  protected onBarKeydown(
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
        order: this.rows().flatMap((row) =>
          row.bars.map((bar) => bar.appointment),
        ),
      });
      return;
    }
    const ctrl = timelineBarCtrlKey(
      appointment,
      event,
      this.snapMinutes(),
      this.allowDragging(),
      this.horizontal() ? [] : this.resourceRows(),
      this.rowIdOf(),
      this.rtl(),
    );
    if (ctrl.handled) {
      if (ctrl.commit !== undefined) {
        event.preventDefault();
        const values =
          ctrl.commit.resourceId !== undefined
            ? this.resourceRows().find(
                (row) => row.id === ctrl.commit?.resourceId,
              )?.values
            : undefined;
        this.moveCommitted.emit(
          this.moveEvent(appointment, ctrl.commit.proposal, values),
        );
      }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.chipDeleteRequested.emit(appointment);
    }
  }

  protected readonly String = String;
  /** Readable text over a bar painted in its appointment colour. */
  protected readonly chipForeground = chipForeground;
}
