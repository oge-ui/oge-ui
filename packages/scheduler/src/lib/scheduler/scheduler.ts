import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  addMinutes,
  clampDate,
  nextDay,
  rangesOverlap,
  resolveFirstDayOfWeek,
  startOfDay,
  type DataSource,
  type RowKey,
} from '@oge-ui/core';
import { OgeCalendar } from '@oge-ui/inputs';
import { OgeAnchoredPanel, OgePopup } from '@oge-ui/overlay';
import type { OgeSchedulerMessages } from '../config';
import { OGE_SCHEDULER_CONFIG } from '../config';
import {
  parseRecurrenceRule,
  serializeRecurrenceRule,
  type RecurrenceRule,
} from '../engine/rrule';
import { appendException } from '../engine/rrule-expand';
import {
  appointmentPatch,
  expandAppointment,
  normalizeAppointment,
  resolveSchedulerFields,
  type SchedulerAppointment,
  type SchedulerFieldExpr,
} from '../engine/scheduler-model';
import { navigateDate, viewRange } from '../engine/view-model';
import type {
  OgeSchedulerAppointmentAddedEvent,
  OgeSchedulerAppointmentAddingEvent,
  OgeSchedulerAppointmentClickEvent,
  OgeSchedulerAppointmentDeletedEvent,
  OgeSchedulerAppointmentDeletingEvent,
  OgeSchedulerAppointmentUpdatedEvent,
  OgeSchedulerAppointmentUpdatingEvent,
  OgeSchedulerCellClickEvent,
  OgeSchedulerEditorShowingEvent,
  OgeSchedulerRangeSelectedEvent,
  OgeSchedulerView,
  OgeSchedulerViewOptions,
  OgeSchedulerWorkHours,
} from '../scheduler-types';
import {
  OgeSchedulerAppointmentDialog,
  type SchedulerEditorModel,
  type SchedulerEditorResult,
} from './appointment-dialog';
import { OgeSchedulerAppointmentPopup } from './appointment-popup';
import {
  OgeSchedulerDayWeekView,
  type SchedulerCellEvent,
  type SchedulerChipEvent,
  type SchedulerProposalEvent,
} from './day-week-view';
import { OgeSchedulerMonthView } from './month-view';
import {
  OgeAppointmentTemplate,
  OgeDateHeaderTemplate,
  OgeSchedulerCellTemplate,
} from './scheduler-templates';

/** A resolved view-switcher entry. */
interface ResolvedView {
  readonly type: OgeSchedulerView;
  readonly name: string;
  readonly dayStartHour: number;
  readonly dayEndHour: number;
  readonly cellDuration: number;
}

/**
 * Signal-based scheduler / event calendar with day, week and month views —
 * commercial (`@oge-ui/scheduler`).
 *
 * ```html
 * <oge-scheduler
 *   [dataSource]="appointments"
 *   [(currentDate)]="date"
 *   [(currentView)]="view"
 *   [dayStartHour]="8"
 *   [dayEndHour]="19"
 * />
 * ```
 */
@Component({
  selector: 'oge-scheduler',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    OgeCalendar,
    OgePopup,
    OgeSchedulerAppointmentDialog,
    OgeSchedulerAppointmentPopup,
    OgeSchedulerDayWeekView,
    OgeSchedulerMonthView,
  ],
  host: { class: 'oge-scheduler' },
  styleUrl: './scheduler.scss',
  template: `
    <div
      class="oge-scheduler-toolbar"
      role="toolbar"
      [attr.aria-label]="msg().toolbar.label"
    >
      <div class="oge-scheduler-nav">
        <button
          type="button"
          class="oge-scheduler-btn"
          [disabled]="isTodayVisible()"
          (click)="goToday()"
        >
          {{ msg().toolbar.today }}
        </button>
        <button
          type="button"
          class="oge-scheduler-btn oge-scheduler-btn-icon"
          [attr.aria-label]="msg().toolbar.previous"
          [disabled]="!canNavigate(-1)"
          (click)="navigate(-1)"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m10 3.5-4.5 4.5L10 12.5" />
          </svg>
        </button>
        <button
          type="button"
          class="oge-scheduler-btn oge-scheduler-btn-icon"
          [attr.aria-label]="msg().toolbar.next"
          [disabled]="!canNavigate(1)"
          (click)="navigate(1)"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 3.5 4.5 4.5L6 12.5" />
          </svg>
        </button>
        @if (showAddButton() && canAdd()) {
          <button
            type="button"
            class="oge-scheduler-btn oge-scheduler-btn-primary oge-scheduler-btn-add"
            (click)="showAppointmentPopup(undefined, true)"
          >
            <svg
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M8 3.5v9M3.5 8h9" />
            </svg>
            {{ msg().toolbar.newAppointment }}
          </button>
        }
      </div>
      <button
        type="button"
        class="oge-scheduler-title"
        [attr.aria-label]="msg().toolbar.dateNavigatorLabel"
        [attr.aria-expanded]="navigatorPanel.isOpen()"
        [attr.aria-controls]="navigatorPanel.panelId"
        aria-haspopup="dialog"
        (click)="navigatorPanel.toggle()"
      >
        <span aria-live="polite">{{ periodTitle() }}</span>
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
          <path d="m4 6.5 4 4 4-4" />
        </svg>
      </button>
      @if (navigatorPanel.isOpen()) {
        <oge-popup [panel]="navigatorPanel">
          <div class="oge-scheduler-navigator" #navigatorEl>
            <oge-calendar
              [value]="currentDate()"
              (valueChange)="onNavigatorPicked($event)"
              [firstDayOfWeek]="firstDayOfWeek()"
              [min]="min()"
              [max]="max()"
              [locale]="locale()"
            />
          </div>
        </oge-popup>
      }
      <div
        class="oge-scheduler-views"
        role="group"
        [attr.aria-label]="msg().toolbar.viewSwitcherLabel"
      >
        @for (entry of resolvedViews(); track entry.type) {
          <button
            type="button"
            class="oge-scheduler-btn oge-scheduler-view-btn"
            [class.oge-scheduler-view-active]="entry.type === currentView()"
            [attr.aria-pressed]="entry.type === currentView()"
            (click)="currentView.set(entry.type)"
          >
            {{ entry.name }}
          </button>
        }
      </div>
    </div>

    @switch (currentView()) {
      @case ('month') {
        <oge-scheduler-month-view
          [anchorDate]="currentDate()"
          [appointments]="visibleAppointments()"
          [firstDayOfWeek]="resolvedFirstDayOfWeek()"
          [maxAppointmentsPerCell]="maxAppointmentsPerCell()"
          [locale]="locale()"
          [messages]="msg().grid"
          [periodLabel]="periodTitle()"
          [appointmentTemplate]="appointmentTemplate() ?? null"
          [cellTemplate]="cellTemplate() ?? null"
          (moreClick)="drillIntoDay($event)"
          (cellClicked)="onCellClicked($event)"
          (cellDblClicked)="onCellDblClicked($event)"
          (cellActivated)="onCellActivated($event)"
          (chipClicked)="onChipClicked($event)"
          (chipDblClicked)="onChipDblClicked($event)"
          (chipActivated)="onChipActivated($event)"
          (chipDeleteRequested)="onDeleteRequested($event)"
          [allowDragging]="canDrag()"
          (moveCommitted)="onMoveCommitted($event)"
          (gestureCancelled)="onGestureCancelled()"
          (chipContextMenu)="onChipContextMenu($event)"
          (cellContextMenu)="onCellContextMenu($event)"
        />
      }
      @default {
        <oge-scheduler-day-week-view
          [view]="dayWeekView()"
          [anchorDate]="currentDate()"
          [appointments]="visibleAppointments()"
          [firstDayOfWeek]="resolvedFirstDayOfWeek()"
          [dayStartHour]="activeView().dayStartHour"
          [dayEndHour]="activeView().dayEndHour"
          [cellDuration]="activeView().cellDuration"
          [showAllDayPanel]="showAllDayPanel()"
          [showCurrentTimeIndicator]="showCurrentTimeIndicator()"
          [minAppointmentMinutes]="minAppointmentMinutes()"
          [locale]="locale()"
          [messages]="msg().grid"
          [periodLabel]="periodTitle()"
          [appointmentTemplate]="appointmentTemplate() ?? null"
          [cellTemplate]="cellTemplate() ?? null"
          [dateHeaderTemplate]="dateHeaderTemplate() ?? null"
          (cellClicked)="onCellClicked($event)"
          (cellDblClicked)="onCellDblClicked($event)"
          (cellActivated)="onCellActivated($event)"
          (chipClicked)="onChipClicked($event)"
          (chipDblClicked)="onChipDblClicked($event)"
          (chipActivated)="onChipActivated($event)"
          (chipDeleteRequested)="onDeleteRequested($event)"
          [allowDragging]="canDrag()"
          [allowResizing]="canResize()"
          [allowAdding]="canAdd()"
          [hiddenWeekDays]="hiddenWeekDays()"
          [workHours]="workHours()"
          [shadeUntilCurrentTime]="shadeUntilCurrentTime()"
          [snapDuration]="snapDuration()"
          (moveCommitted)="onMoveCommitted($event)"
          (resizeCommitted)="onResizeCommitted($event)"
          (gestureCancelled)="onGestureCancelled()"
          (rangeSelected)="onRangeSelected($event)"
          (chipContextMenu)="onChipContextMenu($event)"
          (cellContextMenu)="onCellContextMenu($event)"
        />
      }
    }

    <oge-scheduler-appointment-popup
      [messages]="msg().popup"
      [locale]="locale()"
      [allowEditing]="canUpdate()"
      [allowDeleting]="canDelete()"
      (editRequested)="openEditorFor($any($event))"
      (deleteRequested)="onDeleteRequested($any($event))"
    />
    <oge-scheduler-appointment-dialog
      [messages]="msg().editor"
      [locale]="locale()"
      (saved)="onEditorSaved($event)"
    />
    @if (scopePending(); as pending) {
      <div
        class="oge-scheduler-scope-backdrop"
        (click)="scopePending.set(null)"
        aria-hidden="true"
      ></div>
      <div
        class="oge-scheduler-scope"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="msg().recurrenceScope.title"
      >
        <div class="oge-scheduler-scope-title">
          {{ msg().recurrenceScope.title }}
        </div>
        <div class="oge-scheduler-scope-text">{{ scopeText(pending) }}</div>
        <div class="oge-scheduler-scope-actions">
          <button
            type="button"
            class="oge-scheduler-btn"
            (click)="scopePending.set(null)"
          >
            {{ msg().recurrenceScope.cancel }}
          </button>
          <button
            type="button"
            class="oge-scheduler-btn"
            (click)="resolveScope('occurrence')"
          >
            {{ msg().recurrenceScope.occurrence }}
          </button>
          <button
            type="button"
            class="oge-scheduler-btn oge-scheduler-btn-primary"
            (click)="resolveScope('series')"
          >
            {{ msg().recurrenceScope.series }}
          </button>
        </div>
      </div>
    }
    <div class="oge-scheduler-live" aria-live="polite">
      {{ announcement() }}
    </div>
  `,
})
export class OgeScheduler<T extends object = Record<string, unknown>> {
  private readonly config = inject(OGE_SCHEDULER_CONFIG);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Appointment items: a plain array or any `@oge-ui/core` `DataSource`. */
  readonly dataSource = input<readonly T[] | DataSource<T> | null>(null);
  /** Key field or selector; defaults to `id`, falling back to the item index. */
  readonly keyExpr = input<string | ((item: T) => unknown) | undefined>(
    undefined,
  );

  readonly textExpr = input<SchedulerFieldExpr<T, unknown>>('text');
  readonly startDateExpr = input<SchedulerFieldExpr<T, unknown>>('startDate');
  readonly endDateExpr = input<SchedulerFieldExpr<T, unknown>>('endDate');
  readonly allDayExpr = input<SchedulerFieldExpr<T, unknown>>('allDay');
  readonly colorExpr = input<SchedulerFieldExpr<T, unknown>>('color');
  readonly locationExpr = input<SchedulerFieldExpr<T, unknown>>('location');
  readonly descriptionExpr =
    input<SchedulerFieldExpr<T, unknown>>('description');
  readonly recurrenceRuleExpr =
    input<SchedulerFieldExpr<T, unknown>>('recurrenceRule');
  readonly recurrenceExceptionExpr = input<SchedulerFieldExpr<T, unknown>>(
    'recurrenceException',
  );
  readonly disabledExpr = input<SchedulerFieldExpr<T, unknown>>('disabled');

  /** The anchor date of the visible period (two-way). */
  readonly currentDate = model<Date>(new Date());
  /** The active view (two-way). */
  readonly currentView = model<OgeSchedulerView>('week');

  /** The views offered by the switcher, optionally with per-view overrides. */
  readonly views = input<
    readonly (OgeSchedulerView | OgeSchedulerViewOptions)[]
  >(['day', 'week', 'month']);

  /** First day of week (0 = Sunday); `undefined` resolves from the locale. */
  readonly firstDayOfWeek = input<number | undefined>(undefined);
  readonly dayStartHour = input(0);
  readonly dayEndHour = input(24);
  /** Slot raster in minutes. */
  readonly cellDuration = input(30);
  readonly showAllDayPanel = input(true);
  readonly showCurrentTimeIndicator = input(true);
  /** Month-view lane budget per cell; `'auto'` picks a sensible default. */
  readonly maxAppointmentsPerCell = input<number | 'auto'>('auto');
  /** BCP 47 locale for every `Intl` format; defaults to the browser locale. */
  readonly locale = input<string | undefined>(undefined);
  /** Per-instance overrides of the DI-configured messages. */
  readonly messages = input<Partial<OgeSchedulerMessages>>({});

  readonly allowAdding = input(true);
  readonly allowUpdating = input(true);
  readonly allowDeleting = input(true);
  readonly allowDragging = input(true);
  readonly allowResizing = input(true);
  /** Shows the toolbar "new appointment" button. */
  readonly showAddButton = input(true);
  /**
   * How edits to a recurring occurrence apply: ask per action (`'dialog'`),
   * always detach the occurrence, or always change the series.
   */
  readonly recurrenceEditMode = input<'dialog' | 'occurrence' | 'series'>(
    'dialog',
  );
  /** Display-only shorthand: overrides every `allow*` flag at once. */
  readonly readOnly = input(false);
  /** Earliest navigable date (clamps navigation and the date navigator). */
  readonly min = input<Date | undefined>(undefined);
  /** Latest navigable date. */
  readonly max = input<Date | undefined>(undefined);
  /** Weekdays (0 = Sunday) hidden from the week views. */
  readonly hiddenWeekDays = input<readonly number[] | undefined>(undefined);
  /** Working-hours emphasis; cells outside get the off-hours shading. */
  readonly workHours = input<OgeSchedulerWorkHours | null>(null);
  /** Shades today's column above the now-line (dx parity). */
  readonly shadeUntilCurrentTime = input(false);
  /** Drag/resize snap raster in minutes; defaults to `cellDuration`. */
  readonly snapDuration = input<number | undefined>(undefined);
  /** Initial scroll position of the day/week body, in hours (e.g. `8.5`). */
  readonly scrollTime = input<number | undefined>(undefined);
  /** Custom period-title formatter for the toolbar date navigator. */
  readonly dateNavigatorText = input<
    ((start: Date, end: Date, view: OgeSchedulerView) => string) | undefined
  >(undefined);

  protected readonly canAdd = computed(
    () => this.allowAdding() && !this.readOnly(),
  );
  protected readonly canUpdate = computed(
    () => this.allowUpdating() && !this.readOnly(),
  );
  protected readonly canDelete = computed(
    () => this.allowDeleting() && !this.readOnly(),
  );
  protected readonly canDrag = computed(
    () => this.allowDragging() && !this.readOnly(),
  );
  protected readonly canResize = computed(
    () => this.allowResizing() && !this.readOnly(),
  );

  /* ---------- events ---------- */

  /** Cancelable: before a new appointment reaches the store. */
  readonly appointmentAdding = output<OgeSchedulerAppointmentAddingEvent<T>>();
  /** After an appointment was inserted. */
  readonly appointmentAdded = output<OgeSchedulerAppointmentAddedEvent<T>>();
  /** Cancelable: before an update reaches the store. */
  readonly appointmentUpdating =
    output<OgeSchedulerAppointmentUpdatingEvent<T>>();
  /** After an appointment was updated. */
  readonly appointmentUpdated =
    output<OgeSchedulerAppointmentUpdatedEvent<T>>();
  /** Cancelable: before an appointment is removed from the store. */
  readonly appointmentDeleting =
    output<OgeSchedulerAppointmentDeletingEvent<T>>();
  /** After an appointment was removed. */
  readonly appointmentDeleted =
    output<OgeSchedulerAppointmentDeletedEvent<T>>();
  /** Chip single click (also opens the appointment popup). */
  readonly appointmentClick = output<OgeSchedulerAppointmentClickEvent<T>>();
  /** Chip double click (also opens the editor). */
  readonly appointmentDblClick = output<OgeSchedulerAppointmentClickEvent<T>>();
  /** Empty-cell click. */
  readonly cellClick = output<OgeSchedulerCellClickEvent>();
  /** Empty-cell double click (also opens the create editor). */
  readonly cellDblClick = output<OgeSchedulerCellClickEvent>();
  /** Cancelable: before the editor opens; customize `formItems` here. */
  readonly editorShowing = output<OgeSchedulerEditorShowingEvent<T>>();
  /** A drag-to-create range selection landed (also opens the editor). */
  readonly rangeSelected = output<OgeSchedulerRangeSelectedEvent>();
  /** Right-click on a chip (build your own context menu from it). */
  readonly appointmentContextMenu =
    output<OgeSchedulerAppointmentClickEvent<T>>();
  /** Right-click on an empty cell. */
  readonly cellContextMenu = output<OgeSchedulerCellClickEvent>();

  protected readonly appointmentTemplate = contentChild(
    OgeAppointmentTemplate<T>,
    { descendants: false },
  );
  protected readonly cellTemplate = contentChild(OgeSchedulerCellTemplate, {
    descendants: false,
  });
  protected readonly dateHeaderTemplate = contentChild(OgeDateHeaderTemplate, {
    descendants: false,
  });

  private readonly popup = viewChild.required(OgeSchedulerAppointmentPopup<T>);
  private readonly dialog = viewChild.required(OgeSchedulerAppointmentDialog);
  private readonly dayWeekViewRef = viewChild(OgeSchedulerDayWeekView<T>);
  private readonly monthViewRef = viewChild(OgeSchedulerMonthView<T>);

  protected readonly msg = computed<OgeSchedulerMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly minAppointmentMinutes = computed(
    () => this.config.minAppointmentMinutes ?? 15,
  );

  protected readonly resolvedFirstDayOfWeek = computed(() =>
    resolveFirstDayOfWeek(this.firstDayOfWeek(), this.locale()),
  );

  protected readonly resolvedViews = computed<readonly ResolvedView[]>(() =>
    this.views().map((entry) => {
      const options: OgeSchedulerViewOptions =
        typeof entry === 'string' ? { type: entry } : entry;
      return {
        type: options.type,
        name: options.name ?? this.msg().toolbar.viewNames[options.type],
        dayStartHour: options.dayStartHour ?? this.dayStartHour(),
        dayEndHour: options.dayEndHour ?? this.dayEndHour(),
        cellDuration: options.cellDuration ?? this.cellDuration(),
      };
    }),
  );

  protected readonly activeView = computed<ResolvedView>(() => {
    const view = this.currentView();
    return (
      this.resolvedViews().find((entry) => entry.type === view) ?? {
        type: view,
        name: this.msg().toolbar.viewNames[view],
        dayStartHour: this.dayStartHour(),
        dayEndHour: this.dayEndHour(),
        cellDuration: this.cellDuration(),
      }
    );
  });

  protected readonly dayWeekView = computed<'day' | 'week' | 'workWeek'>(() => {
    const view = this.currentView();
    return view === 'month' ? 'week' : view;
  });

  private readonly fields = computed(() =>
    resolveSchedulerFields<T>({
      textExpr: this.textExpr(),
      startDateExpr: this.startDateExpr(),
      endDateExpr: this.endDateExpr(),
      allDayExpr: this.allDayExpr(),
      colorExpr: this.colorExpr(),
      locationExpr: this.locationExpr(),
      descriptionExpr: this.descriptionExpr(),
      recurrenceRuleExpr: this.recurrenceRuleExpr(),
      recurrenceExceptionExpr: this.recurrenceExceptionExpr(),
      disabledExpr: this.disabledExpr(),
    }),
  );

  /* ---------- data store ---------- */

  /**
   * The writable working set. Array inputs are copied here (the input array
   * itself is never mutated — hosts persist through the CRUD events);
   * `DataSource` loads land here too and CRUD goes through the source's own
   * `insert`/`update`/`remove` before a reload.
   */
  private readonly store = signal<readonly T[]>([]);
  private loadEpoch = 0;

  constructor() {
    effect(() => {
      const source = this.dataSource();
      this.loadEpoch++;
      if (source === null) {
        this.store.set([]);
        return;
      }
      if (Array.isArray(source)) {
        this.store.set([...(source as readonly T[])]);
        return;
      }
      this.reload(source as DataSource<T>);
    });
    this.destroyRef.onDestroy(() => {
      this.loadEpoch++;
    });
    // initial scroll position of the time grid (FC scrollTime parity);
    // re-applied when the view or period changes
    effect(() => {
      const scrollTime = this.scrollTime();
      this.currentView();
      this.currentDate();
      if (scrollTime === undefined) return;
      setTimeout(() => {
        this.scrollToTime(Math.floor(scrollTime), (scrollTime % 1) * 60);
      });
    });
  }

  private reload(source: DataSource<T>): void {
    const epoch = ++this.loadEpoch;
    void source
      .load({})
      .then((result) => {
        if (epoch !== this.loadEpoch) return;
        this.store.set(result.data as readonly T[]);
      })
      .catch(() => {
        if (epoch === this.loadEpoch) this.store.set([]);
      });
  }

  private readonly keyOf = computed<(item: T, index: number) => unknown>(() => {
    const keyExpr = this.keyExpr();
    if (typeof keyExpr === 'function') return (item) => keyExpr(item);
    const field = keyExpr ?? 'id';
    return (item, index) => {
      const value = (item as Record<string, unknown>)[field];
      return value === undefined ? index : value;
    };
  });

  /** Every normalized appointment (unfiltered). */
  private readonly appointments = computed<readonly SchedulerAppointment<T>[]>(
    () => {
      const fields = this.fields();
      const keyOf = this.keyOf();
      const result: SchedulerAppointment<T>[] = [];
      this.store().forEach((item, index) => {
        const appointment = normalizeAppointment(
          item,
          keyOf(item, index),
          fields,
        );
        if (appointment !== null) result.push(appointment);
      });
      return result;
    },
  );

  /** Appointments overlapping the visible period (client-side window). */
  protected readonly visibleAppointments = computed<
    readonly SchedulerAppointment<T>[]
  >(() => {
    const { start, end } = viewRange(
      this.currentView(),
      this.currentDate(),
      this.resolvedFirstDayOfWeek(),
    );
    return this.appointments()
      .flatMap((appointment) => expandAppointment(appointment, start, end))
      .filter(
        (appointment) =>
          rangesOverlap(
            appointment.startDate,
            appointment.endDate,
            start,
            end,
          ) ||
          (appointment.startDate.getTime() === appointment.endDate.getTime() &&
            appointment.startDate.getTime() >= start.getTime() &&
            appointment.startDate.getTime() < end.getTime()),
      );
  });

  protected readonly periodTitle = computed(() => {
    const view = this.currentView();
    const date = this.currentDate();
    const locale = this.locale();
    const custom = this.dateNavigatorText();
    if (custom !== undefined) {
      const range = viewRange(view, date, this.resolvedFirstDayOfWeek());
      return custom(range.start, new Date(range.end.getTime() - 1), view);
    }
    if (view === 'day') {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(
        date,
      );
    }
    if (view === 'month') {
      return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
      }).format(date);
    }
    const { start, end } = viewRange(
      'week',
      date,
      this.resolvedFirstDayOfWeek(),
    );
    const last = new Date(end.getTime() - 1);
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).formatRange(start, last);
  });

  /* ---------- announcements ---------- */

  protected readonly announcement = signal('');

  private announce(
    template: string,
    tokens: Readonly<Record<string, string>>,
  ): void {
    let text = template;
    for (const [token, value] of Object.entries(tokens)) {
      text = text.replace(`{${token}}`, value);
    }
    this.announcement.set(text);
  }

  /* ---------- navigation ---------- */

  /** The toolbar date-navigator panel (title click opens a calendar). */
  protected readonly navigatorEl =
    viewChild<ElementRef<HTMLElement>>('navigatorEl');
  readonly navigatorPanel = new OgeAnchoredPanel({
    anchor: () =>
      this.hostEl.nativeElement.querySelector('.oge-scheduler-title'),
    panel: () => this.navigatorEl()?.nativeElement ?? null,
    placement: () => 'bottom',
  });

  protected onNavigatorPicked(date: Date | null): void {
    if (date !== null) this.setDate(date);
    this.navigatorPanel.close();
  }

  private setDate(date: Date): void {
    this.currentDate.set(clampDate(date, this.min(), this.max()));
  }

  /** Whether today falls inside the visible period (disables "Today"). */
  protected isTodayVisible(): boolean {
    const { start, end } = viewRange(
      this.currentView(),
      this.currentDate(),
      this.resolvedFirstDayOfWeek(),
    );
    const now = Date.now();
    return now >= start.getTime() && now < end.getTime();
  }

  /** Whether stepping one period keeps some of `[min, max]` visible. */
  protected canNavigate(direction: -1 | 1): boolean {
    const candidate = navigateDate(
      this.currentView(),
      this.currentDate(),
      direction,
    );
    const { start, end } = viewRange(
      this.currentView(),
      candidate,
      this.resolvedFirstDayOfWeek(),
    );
    const min = this.min();
    const max = this.max();
    if (min !== undefined && end.getTime() <= startOfDay(min).getTime()) {
      return false;
    }
    if (max !== undefined && start.getTime() > max.getTime()) return false;
    return true;
  }

  /** Moves the visible period to today. */
  goToday(): void {
    this.setDate(new Date());
  }

  /** Steps the visible period backwards (`-1`) or forwards (`1`). */
  navigate(direction: -1 | 1): void {
    if (!this.canNavigate(direction)) return;
    this.setDate(
      navigateDate(this.currentView(), untracked(this.currentDate), direction),
    );
  }

  protected drillIntoDay(date: Date): void {
    this.setDate(date);
    this.currentView.set('day');
  }

  /* ---------- interaction plumbing ---------- */

  protected onCellClicked(event: SchedulerCellEvent): void {
    if (event.event instanceof MouseEvent) {
      this.cellClick.emit({
        cellDate: event.cellDate,
        allDay: event.allDay,
        event: event.event,
      });
    }
  }

  protected onCellDblClicked(event: SchedulerCellEvent): void {
    if (event.event instanceof MouseEvent) {
      this.cellDblClick.emit({
        cellDate: event.cellDate,
        allDay: event.allDay,
        event: event.event,
      });
    }
    this.openCreateEditor(event.cellDate, event.allDay);
  }

  protected onCellActivated(event: SchedulerCellEvent): void {
    this.openCreateEditor(event.cellDate, event.allDay);
  }

  protected onChipClicked(event: SchedulerChipEvent<T>): void {
    if (event.event instanceof MouseEvent) {
      this.appointmentClick.emit({
        appointment: event.appointment,
        event: event.event,
      });
    }
    this.popup().open(event.appointment, event.rect);
  }

  protected onChipDblClicked(event: SchedulerChipEvent<T>): void {
    if (event.event instanceof MouseEvent) {
      this.appointmentDblClick.emit({
        appointment: event.appointment,
        event: event.event,
      });
    }
    this.openEditorFor(event.appointment);
  }

  protected onChipActivated(event: SchedulerChipEvent<T>): void {
    this.popup().open(event.appointment, event.rect);
  }

  /* ---------- recurrence scope routing ---------- */

  /** A pending occurrence action awaiting the scope choice. */
  protected readonly scopePending = signal<{
    action: 'edit' | 'delete' | 'moved' | 'resized';
    appointment: SchedulerAppointment<T>;
    proposal?: SchedulerProposalEvent<T>['proposal'];
  } | null>(null);

  protected scopeText(pending: {
    action: 'edit' | 'delete' | 'moved' | 'resized';
  }): string {
    const messages = this.msg().recurrenceScope;
    const action =
      pending.action === 'edit'
        ? messages.editAction
        : pending.action === 'delete'
          ? messages.deleteAction
          : messages.moveAction;
    return messages.text.replace('{action}', action);
  }

  private routeRecurring(
    action: 'edit' | 'delete' | 'moved' | 'resized',
    appointment: SchedulerAppointment<T>,
    proposal?: SchedulerProposalEvent<T>['proposal'],
  ): void {
    const mode = this.recurrenceEditMode();
    if (mode === 'dialog') {
      this.scopePending.set({ action, appointment, proposal });
      return;
    }
    this.applyScoped(mode, { action, appointment, proposal });
  }

  protected resolveScope(scope: 'occurrence' | 'series'): void {
    const pending = untracked(this.scopePending);
    this.scopePending.set(null);
    if (pending !== null) this.applyScoped(scope, pending);
  }

  private applyScoped(
    scope: 'occurrence' | 'series',
    pending: {
      action: 'edit' | 'delete' | 'moved' | 'resized';
      appointment: SchedulerAppointment<T>;
      proposal?: SchedulerProposalEvent<T>['proposal'];
    },
  ): void {
    switch (pending.action) {
      case 'edit':
        this.performEdit(pending.appointment, scope);
        return;
      case 'delete':
        this.performDelete(pending.appointment, scope);
        return;
      default:
        if (pending.proposal !== undefined) {
          this.performProposal(
            pending.appointment,
            pending.proposal,
            scope,
            pending.action,
          );
        }
    }
  }

  /** The series template appointment an occurrence was expanded from. */
  private seriesOf(
    occurrence: SchedulerAppointment<T>,
  ): SchedulerAppointment<T> | undefined {
    return untracked(this.appointments).find(
      (entry) => entry.key === occurrence.seriesKey,
    );
  }

  /** Detaches an occurrence: EXDATE on the series + a standalone copy. */
  private detachOccurrence(
    occurrence: SchedulerAppointment<T>,
    replacement: SchedulerEditorModel | null,
  ): void {
    const fields = this.fields();
    const source = occurrence.source;
    const exceptionField = fields.fieldNames.recurrenceException;
    if (exceptionField !== null) {
      this.updateItem(source, {
        [exceptionField]: appendException(
          occurrence.recurrenceException,
          occurrence.startDate,
        ),
      } as Partial<T>);
    }
    if (replacement !== null) {
      this.insertItem(this.buildItem(replacement));
    } else {
      this.announce(this.msg().announcements.deleted, {
        text: occurrence.text,
      });
    }
  }

  private performDelete(
    appointment: SchedulerAppointment<T>,
    scope: 'occurrence' | 'series',
  ): void {
    if (scope === 'occurrence') {
      this.detachOccurrence(appointment, null);
      return;
    }
    this.deleteBySource(appointment.source);
  }

  private performEdit(
    appointment: SchedulerAppointment<T>,
    scope: 'occurrence' | 'series',
  ): void {
    if (!this.canUpdate()) return;
    if (scope === 'occurrence') {
      this.editingOccurrence = appointment;
      this.openEditor(
        this.editorModelFrom(appointment, false),
        appointment.source,
        false,
      );
      return;
    }
    const series = this.seriesOf(appointment) ?? appointment;
    this.editingOccurrence = null;
    this.openEditor(this.editorModelFrom(series, true), series.source, false);
  }

  private performProposal(
    appointment: SchedulerAppointment<T>,
    proposal: SchedulerProposalEvent<T>['proposal'],
    scope: 'occurrence' | 'series',
    kind: 'moved' | 'resized',
  ): void {
    if (!this.canUpdate()) return;
    if (scope === 'occurrence') {
      const model = this.editorModelFrom(appointment, false);
      this.detachOccurrence(appointment, {
        ...model,
        startDate: proposal.startDate,
        endDate: proposal.endDate,
        allDay: proposal.allDay,
      });
      return;
    }
    const series = this.seriesOf(appointment);
    if (series === undefined) return;
    const deltaMs =
      proposal.startDate.getTime() - appointment.startDate.getTime();
    const lengthMs = proposal.endDate.getTime() - proposal.startDate.getTime();
    const newStart = new Date(series.startDate.getTime() + deltaMs);
    this.commitProposal(
      {
        appointment: series,
        proposal: {
          startDate: newStart,
          endDate: new Date(newStart.getTime() + lengthMs),
          allDay: proposal.allDay,
        },
      },
      kind,
    );
  }

  /* ---------- recurrence <-> editor mapping ---------- */

  private ruleFields(
    ruleString: string | undefined,
  ): Pick<
    SchedulerEditorModel,
    'repeat' | 'interval' | 'byDays' | 'endMode' | 'count' | 'until'
  > {
    const rule =
      ruleString === undefined ? null : parseRecurrenceRule(ruleString);
    if (rule === null) {
      return {
        repeat: 'never',
        interval: 1,
        byDays: [],
        endMode: 'never',
        count: 10,
        until: undefined,
      };
    }
    return {
      repeat: rule.freq,
      interval: rule.interval,
      byDays: rule.byDay?.map((entry) => entry.weekday) ?? [],
      endMode:
        rule.count !== undefined
          ? 'count'
          : rule.until !== undefined
            ? 'until'
            : 'never',
      count: rule.count ?? 10,
      until: rule.until,
    };
  }

  private editorRuleString(model: SchedulerEditorModel): string | undefined {
    if (model.repeat === 'never') return undefined;
    const rule: RecurrenceRule = {
      freq: model.repeat,
      interval: Math.max(1, Math.round(model.interval || 1)),
      ...(model.endMode === 'count'
        ? { count: Math.max(1, Math.round(model.count || 1)) }
        : {}),
      ...(model.endMode === 'until' && model.until instanceof Date
        ? {
            until: new Date(
              model.until.getFullYear(),
              model.until.getMonth(),
              model.until.getDate(),
              23,
              59,
              59,
            ),
          }
        : {}),
      ...(model.repeat === 'weekly' && model.byDays.length > 0
        ? {
            byDay: model.byDays.map((weekday) => ({
              ordinal: null,
              weekday,
            })),
          }
        : {}),
      weekStart: 1,
    };
    return serializeRecurrenceRule(rule);
  }

  /** Editor model of an appointment; `withRecurrence` maps its rule too. */
  private editorModelFrom(
    appointment: SchedulerAppointment<T>,
    withRecurrence: boolean,
  ): SchedulerEditorModel {
    return {
      text: appointment.text,
      allDay: appointment.allDay,
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      color: appointment.color,
      location: appointment.location,
      description: appointment.description,
      ...this.ruleFields(
        withRecurrence ? appointment.recurrenceRule : undefined,
      ),
    };
  }

  /* ---------- editor ---------- */

  private editedSource: T | null = null;
  /** The occurrence being detached by an occurrence-scope edit. */
  private editingOccurrence: SchedulerAppointment<T> | null = null;

  /** Opens the editor for an existing appointment (occurrences route). */
  protected openEditorFor(appointment: SchedulerAppointment<T>): void {
    if (!this.canUpdate()) return;
    if (appointment.seriesKey !== null) {
      this.routeRecurring('edit', appointment);
      return;
    }
    this.editingOccurrence = null;
    this.openEditor(
      this.editorModelFrom(appointment, true),
      appointment.source,
      false,
    );
  }

  /** Deletes an appointment, routing recurring occurrences by scope. */
  protected onDeleteRequested(appointment: SchedulerAppointment<T>): void {
    if (!this.canDelete()) return;
    if (appointment.seriesKey !== null) {
      this.routeRecurring('delete', appointment);
      return;
    }
    this.deleteBySource(appointment.source);
  }

  private openCreateEditor(cellDate: Date, allDay: boolean): void {
    if (!this.canAdd()) return;
    const startDate = allDay ? startOfDay(cellDate) : cellDate;
    const endDate = allDay
      ? nextDay(startDate)
      : addMinutes(startDate, this.activeView().cellDuration);
    const model: SchedulerEditorModel = {
      text: '',
      allDay,
      startDate,
      endDate,
      ...this.ruleFields(undefined),
    };
    this.openEditor(model, this.buildItem(model), true);
  }

  private openEditor(
    editorModel: SchedulerEditorModel,
    source: T,
    isNew: boolean,
  ): void {
    const dialog = this.dialog();
    const event: OgeSchedulerEditorShowingEvent<T> = {
      appointmentData: source,
      isNew,
      formItems: dialog.defaultItems(),
      cancel: false,
    };
    this.editorShowing.emit(event);
    if (event.cancel) return;
    this.editedSource = isNew ? null : source;
    dialog.open(editorModel, isNew, event.formItems);
  }

  protected onEditorSaved(result: SchedulerEditorResult): void {
    if (result.isNew) {
      this.insertItem(this.buildItem(result.model));
    } else if (this.editingOccurrence !== null) {
      this.detachOccurrence(this.editingOccurrence, result.model);
    } else if (this.editedSource !== null) {
      this.updateItem(this.editedSource, this.buildPatch(result.model));
    }
    this.editedSource = null;
    this.editingOccurrence = null;
  }

  /** Builds a new item from the editor model using the string field names. */
  private buildItem(editorModel: SchedulerEditorModel): T {
    const fields = this.fields();
    const item: Record<string, unknown> = {};
    const set = (field: string | null, value: unknown): void => {
      if (field !== null && value !== undefined) item[field] = value;
    };
    set(fields.fieldNames.text, editorModel.text);
    set(fields.fieldNames.startDate, editorModel.startDate);
    set(fields.fieldNames.endDate, editorModel.endDate);
    if (editorModel.allDay) set(fields.fieldNames.allDay, true);
    set(fields.fieldNames.color, editorModel.color);
    set(fields.fieldNames.location, editorModel.location);
    set(fields.fieldNames.description, editorModel.description);
    set(fields.fieldNames.recurrenceRule, this.editorRuleString(editorModel));
    return item as T;
  }

  private buildPatch(editorModel: SchedulerEditorModel): Partial<T> {
    const fields = this.fields();
    const original = this.editedSource as T;
    const patch: Record<string, unknown> = {
      ...(appointmentPatch(original, editorModel, fields) as Record<
        string,
        unknown
      >),
    };
    const set = (field: string | null, value: unknown): void => {
      if (field !== null && value !== undefined) patch[field] = value;
    };
    set(fields.fieldNames.text, editorModel.text);
    set(fields.fieldNames.allDay, editorModel.allDay);
    set(fields.fieldNames.color, editorModel.color);
    set(fields.fieldNames.location, editorModel.location);
    set(fields.fieldNames.description, editorModel.description);
    const ruleString = this.editorRuleString(editorModel);
    set(fields.fieldNames.recurrenceRule, ruleString ?? '');
    if (ruleString === undefined) {
      set(fields.fieldNames.recurrenceException, '');
    }
    return patch as Partial<T>;
  }

  /* ---------- CRUD executor ---------- */

  private dataSourceOf(): DataSource<T> | null {
    const source = this.dataSource();
    return source !== null && !Array.isArray(source)
      ? (source as DataSource<T>)
      : null;
  }

  private insertItem(item: T): void {
    if (!this.canAdd()) return;
    const event: OgeSchedulerAppointmentAddingEvent<T> = {
      appointmentData: item,
      cancel: false,
    };
    this.appointmentAdding.emit(event);
    if (event.cancel) return;
    const source = this.dataSourceOf();
    if (source?.insert) {
      void source.insert(item).then(() => {
        this.reload(source);
        this.finishAdd(item);
      });
      return;
    }
    this.store.set([...this.store(), item]);
    this.finishAdd(item);
  }

  private finishAdd(item: T): void {
    this.appointmentAdded.emit({ appointmentData: item });
    this.announce(this.msg().announcements.created, {
      text: String(this.fields().text(item) ?? ''),
    });
  }

  private updateItem(original: T, patch: Partial<T>): void {
    if (!this.canUpdate()) return;
    const event: OgeSchedulerAppointmentUpdatingEvent<T> = {
      oldData: original,
      newData: patch,
      cancel: false,
    };
    this.appointmentUpdating.emit(event);
    if (event.cancel) return;
    const updated = { ...original, ...patch };
    const source = this.dataSourceOf();
    if (source?.update) {
      const index = this.store().indexOf(original);
      const key = this.keyOf()(original, index) as RowKey;
      void source.update(key, patch).then(() => {
        this.reload(source);
        this.finishUpdate(updated);
      });
      return;
    }
    this.store.set(
      this.store().map((entry) => (entry === original ? updated : entry)),
    );
    this.finishUpdate(updated);
  }

  private finishUpdate(updated: T): void {
    this.appointmentUpdated.emit({ appointmentData: updated });
    this.announce(this.msg().announcements.updated, {
      text: String(this.fields().text(updated) ?? ''),
    });
  }

  protected onMoveCommitted(event: SchedulerProposalEvent<T>): void {
    if (event.appointment.seriesKey !== null) {
      this.routeRecurring('moved', event.appointment, event.proposal);
      return;
    }
    this.commitProposal(event, 'moved');
  }

  protected onResizeCommitted(event: SchedulerProposalEvent<T>): void {
    if (event.appointment.seriesKey !== null) {
      this.routeRecurring('resized', event.appointment, event.proposal);
      return;
    }
    this.commitProposal(event, 'resized');
  }

  protected onGestureCancelled(): void {
    this.announcement.set(this.msg().announcements.cancelled);
  }

  protected onRangeSelected(range: OgeSchedulerRangeSelectedEvent): void {
    this.rangeSelected.emit(range);
    if (!this.canAdd()) return;
    const model: SchedulerEditorModel = {
      text: '',
      allDay: false,
      startDate: range.startDate,
      endDate: range.endDate,
      ...this.ruleFields(undefined),
    };
    this.openEditor(model, this.buildItem(model), true);
  }

  protected onChipContextMenu(event: SchedulerChipEvent<T>): void {
    if (event.event instanceof MouseEvent) {
      this.appointmentContextMenu.emit({
        appointment: event.appointment,
        event: event.event,
      });
    }
  }

  protected onCellContextMenu(event: SchedulerCellEvent): void {
    if (event.event instanceof MouseEvent) {
      this.cellContextMenu.emit({
        cellDate: event.cellDate,
        allDay: event.allDay,
        event: event.event,
      });
    }
  }

  private commitProposal(
    event: SchedulerProposalEvent<T>,
    kind: 'moved' | 'resized',
  ): void {
    if (!this.canUpdate()) return;
    const fields = this.fields();
    const patch = appointmentPatch(
      event.appointment.source,
      event.proposal,
      fields,
    );
    this.updateItem(event.appointment.source, patch);
    const format = new Intl.DateTimeFormat(this.locale(), {
      dateStyle: 'medium',
      timeStyle: event.appointment.allDay ? undefined : 'short',
    });
    this.announce(this.msg().announcements[kind], {
      text: event.appointment.text,
      start: format.format(event.proposal.startDate),
      end: format.format(event.proposal.endDate),
    });
  }

  /** Deletes the appointment rendered from `item` (guarded + evented). */
  protected deleteBySource(item: T): void {
    if (!this.canDelete()) return;
    const event: OgeSchedulerAppointmentDeletingEvent<T> = {
      appointmentData: item,
      cancel: false,
    };
    this.appointmentDeleting.emit(event);
    if (event.cancel) return;
    const source = this.dataSourceOf();
    if (source?.remove) {
      const index = this.store().indexOf(item);
      const key = this.keyOf()(item, index) as RowKey;
      void source.remove(key).then(() => {
        this.reload(source);
        this.finishDelete(item);
      });
      return;
    }
    this.store.set(this.store().filter((entry) => entry !== item));
    this.finishDelete(item);
  }

  private finishDelete(item: T): void {
    this.appointmentDeleted.emit({ appointmentData: item });
    this.announce(this.msg().announcements.deleted, {
      text: String(this.fields().text(item) ?? ''),
    });
  }

  /* ---------- imperative API ---------- */

  /** Focuses the active view's grid. */
  focus(): void {
    this.dayWeekViewRef()?.focusGrid();
    this.monthViewRef()?.focusGrid();
  }

  /** Scrolls the day/week body so `hours:minutes` sits at the top. */
  scrollToTime(hours: number, minutes = 0): void {
    const view = this.dayWeekViewRef();
    if (view === undefined) return;
    const body = this.hostEl.nativeElement.querySelector<HTMLElement>(
      '.oge-scheduler-body',
    );
    const rows = this.hostEl.nativeElement.querySelector<HTMLElement>(
      '.oge-scheduler-rows',
    );
    if (body === null || rows === null) return;
    const grid = view.grid();
    const span = grid.windowEndMinutes - grid.windowStartMinutes;
    if (span <= 0) return;
    const fraction = Math.min(
      1,
      Math.max(0, (hours * 60 + minutes - grid.windowStartMinutes) / span),
    );
    body.scrollTop = fraction * rows.scrollHeight;
  }

  /**
   * Opens the appointment editor: with `createNew` (or no data) a prefilled
   * create form, otherwise the edit form of the given item (dx parity —
   * `showAppointmentPopup` opens the *form*, not the summary popup).
   */
  showAppointmentPopup(appointmentData?: Partial<T>, createNew = false): void {
    if (createNew || appointmentData === undefined) {
      const base = untracked(this.currentDate);
      this.openCreateEditor(
        new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          this.activeView().dayStartHour,
        ),
        false,
      );
      return;
    }
    const appointment = untracked(this.appointments).find(
      (entry) => entry.source === appointmentData,
    );
    if (appointment !== undefined) this.openEditorFor(appointment);
  }

  /** Closes the appointment editor and the summary popup. */
  hideAppointmentPopup(): void {
    this.dialog().close();
    this.popup().close();
  }

  /**
   * Inserts an appointment programmatically — runs the same cancelable
   * `appointmentAdding` pipeline as interactive creation.
   */
  addAppointment(appointmentData: T): void {
    this.insertItem(appointmentData);
  }

  /** Applies a patch to an existing item through the guarded pipeline. */
  updateAppointment(appointmentData: T, patch: Partial<T>): void {
    this.updateItem(appointmentData, patch);
  }

  /** Deletes an item through the guarded pipeline. */
  deleteAppointment(appointmentData: T): void {
    this.deleteBySource(appointmentData);
  }

  /** First moment of the visible period. */
  getStartViewDate(): Date {
    return viewRange(
      untracked(this.currentView),
      untracked(this.currentDate),
      this.resolvedFirstDayOfWeek(),
    ).start;
  }

  /** Exclusive end of the visible period. */
  getEndViewDate(): Date {
    return viewRange(
      untracked(this.currentView),
      untracked(this.currentDate),
      this.resolvedFirstDayOfWeek(),
    ).end;
  }

  /** The bound data source, as given. */
  getDataSource(): readonly T[] | DataSource<T> | null {
    return this.dataSource();
  }

  /** Navigates to `date` and scrolls the time grid to its time of day. */
  scrollTo(date: Date): void {
    this.setDate(date);
    this.scrollToTime(date.getHours(), date.getMinutes());
  }
}
