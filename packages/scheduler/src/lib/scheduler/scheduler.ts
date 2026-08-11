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
  nextDay,
  rangesOverlap,
  resolveFirstDayOfWeek,
  startOfDay,
  type DataSource,
  type RowKey,
} from '@oge-ui/core';
import type { OgeSchedulerMessages } from '../config';
import { OGE_SCHEDULER_CONFIG } from '../config';
import {
  appointmentPatch,
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
  OgeSchedulerView,
  OgeSchedulerViewOptions,
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
        <button type="button" class="oge-scheduler-btn" (click)="goToday()">
          {{ msg().toolbar.today }}
        </button>
        <button
          type="button"
          class="oge-scheduler-btn oge-scheduler-btn-icon"
          [attr.aria-label]="msg().toolbar.previous"
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
      </div>
      <span class="oge-scheduler-title" aria-live="polite">{{
        periodTitle()
      }}</span>
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
          (chipDeleteRequested)="deleteBySource($event.source)"
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
          (chipDeleteRequested)="deleteBySource($event.source)"
        />
      }
    }

    <oge-scheduler-appointment-popup
      [messages]="msg().popup"
      [locale]="locale()"
      [allowEditing]="allowUpdating()"
      [allowDeleting]="allowDeleting()"
      (editRequested)="openEditorFor($any($event))"
      (deleteRequested)="deleteBySource($any($event).source)"
    />
    <oge-scheduler-appointment-dialog
      [messages]="msg().editor"
      [locale]="locale()"
      (saved)="onEditorSaved($event)"
    />
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

  /* ---------- events ---------- */

  /** Cancelable: before a new appointment reaches the store. */
  readonly appointmentAdding =
    output<OgeSchedulerAppointmentAddingEvent<T>>();
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
  readonly appointmentDblClick =
    output<OgeSchedulerAppointmentClickEvent<T>>();
  /** Empty-cell click. */
  readonly cellClick = output<OgeSchedulerCellClickEvent>();
  /** Empty-cell double click (also opens the create editor). */
  readonly cellDblClick = output<OgeSchedulerCellClickEvent>();
  /** Cancelable: before the editor opens; customize `formItems` here. */
  readonly editorShowing = output<OgeSchedulerEditorShowingEvent<T>>();

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

  private readonly popup = viewChild.required(
    OgeSchedulerAppointmentPopup<T>,
  );
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

  protected readonly dayWeekView = computed<'day' | 'week'>(() =>
    this.currentView() === 'day' ? 'day' : 'week',
  );

  private readonly fields = computed(() =>
    resolveSchedulerFields<T>({
      textExpr: this.textExpr(),
      startDateExpr: this.startDateExpr(),
      endDateExpr: this.endDateExpr(),
      allDayExpr: this.allDayExpr(),
      colorExpr: this.colorExpr(),
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
    return this.appointments().filter(
      (appointment) =>
        rangesOverlap(appointment.startDate, appointment.endDate, start, end) ||
        (appointment.startDate.getTime() === appointment.endDate.getTime() &&
          appointment.startDate.getTime() >= start.getTime() &&
          appointment.startDate.getTime() < end.getTime()),
    );
  });

  protected readonly periodTitle = computed(() => {
    const view = this.currentView();
    const date = this.currentDate();
    const locale = this.locale();
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

  /** Moves the visible period to today. */
  goToday(): void {
    this.currentDate.set(new Date());
  }

  /** Steps the visible period backwards (`-1`) or forwards (`1`). */
  navigate(direction: -1 | 1): void {
    this.currentDate.set(
      navigateDate(this.currentView(), untracked(this.currentDate), direction),
    );
  }

  protected drillIntoDay(date: Date): void {
    this.currentDate.set(date);
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

  /* ---------- editor ---------- */

  private editedSource: T | null = null;

  /** Opens the editor for an existing appointment. */
  protected openEditorFor(appointment: SchedulerAppointment<T>): void {
    if (!this.allowUpdating()) return;
    this.openEditor(
      {
        text: appointment.text,
        allDay: appointment.allDay,
        startDate: appointment.startDate,
        endDate: appointment.endDate,
        color: appointment.color,
        description: appointment.description,
      },
      appointment.source,
      false,
    );
  }

  private openCreateEditor(cellDate: Date, allDay: boolean): void {
    if (!this.allowAdding()) return;
    const startDate = allDay ? startOfDay(cellDate) : cellDate;
    const endDate = allDay
      ? nextDay(startDate)
      : addMinutes(startDate, this.activeView().cellDuration);
    const draft = this.buildItem({
      text: '',
      allDay,
      startDate,
      endDate,
    });
    this.openEditor(
      { text: '', allDay, startDate, endDate },
      draft,
      true,
    );
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
    } else if (this.editedSource !== null) {
      this.updateItem(this.editedSource, this.buildPatch(result.model));
    }
    this.editedSource = null;
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
    set(fields.fieldNames.description, editorModel.description);
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
      if (field !== null) patch[field] = value;
    };
    set(fields.fieldNames.text, editorModel.text);
    set(fields.fieldNames.allDay, editorModel.allDay);
    set(fields.fieldNames.color, editorModel.color);
    set(fields.fieldNames.description, editorModel.description);
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
    if (!this.allowAdding()) return;
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
    if (!this.allowUpdating()) return;
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

  /** Deletes the appointment rendered from `item` (guarded + evented). */
  protected deleteBySource(item: T): void {
    if (!this.allowDeleting()) return;
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
    const body =
      this.hostEl.nativeElement.querySelector<HTMLElement>(
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
}
