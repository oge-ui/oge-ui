/**
 * `OgeSchedulerCore` — the scheduler shell's machine, shared by the Angular
 * `<oge-scheduler>` and the React `<OgeScheduler>` (ADR 0003).
 *
 * It owns the writable working set, the data-source loads, the cancelable
 * CRUD pipelines, the recurrence scope routing (occurrence vs. series), the
 * editor model mapping, navigation, the built-in context menu state, the
 * live-region announcements and the reminder scan. What it does not own is
 * rendering: the host hands in its inputs as live getters, its reactivity
 * primitives through an `OgeReactivityAdapter`, and a set of sinks — event
 * emitters and the popup/editor/menu surfaces it drives.
 *
 * The machine is not reactive itself. Every value it derives goes through
 * the adapter's `derived`, so Angular gets `computed()` signals and React a
 * per-render memo, and every state it holds is an adapter `cell`.
 */
import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';
import {
  addMinutes,
  clampDate,
  nextDay,
  resolveFirstDayOfWeek,
  startOfDay,
  type DataSource,
  type RowKey,
} from '@oge-ui/core';
import type { OgeSchedulerConfig, OgeSchedulerMessages } from './config';
import {
  buildItemFromEditor,
  buildPatchFromEditor,
  draftEditorModel,
  editorModelFrom,
  type SchedulerEditorModel,
  type SchedulerEditorResult,
} from './editor';
import type { AppointmentProposal } from './gesture-math';
import { appendException } from './rrule-expand';
import {
  appointmentPatch,
  resolveSchedulerFields,
  type ResolvedSchedulerFields,
  type SchedulerAppointment,
  type SchedulerFieldExpr,
} from './scheduler-model';
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
  OgeSchedulerReminderEvent,
  OgeSchedulerResource,
  OgeSchedulerView,
  OgeSchedulerViewOptions,
} from './scheduler-types';
import {
  canNavigateScheduler,
  dayWeekViewOf,
  dueSchedulerReminders,
  fillSchedulerTemplate,
  groupResourceIdReader,
  isTodayInSchedulerView,
  mergeSchedulerMessages,
  normalizeSchedulerStore,
  resolveActiveSchedulerView,
  resolveColorResource,
  resolveGroupResource,
  resolveSchedulerViews,
  schedulerKeyReader,
  schedulerPeriodTitle,
  visibleSchedulerAppointments,
  type ResolvedSchedulerView,
} from './shell';
import type {
  SchedulerCellEvent,
  SchedulerChipEvent,
  SchedulerProposalEvent,
  SchedulerRangeEvent,
} from './view-events';
import { navigateDate, viewRange } from './view-model';

/** Every scheduler input, read live (Angular passes its input signals). */
export interface OgeSchedulerCoreInputs<T> {
  dataSource(): readonly T[] | DataSource<T> | null;
  keyExpr(): string | ((item: T) => unknown) | undefined;
  textExpr(): SchedulerFieldExpr<T, unknown>;
  startDateExpr(): SchedulerFieldExpr<T, unknown>;
  endDateExpr(): SchedulerFieldExpr<T, unknown>;
  allDayExpr(): SchedulerFieldExpr<T, unknown>;
  colorExpr(): SchedulerFieldExpr<T, unknown>;
  locationExpr(): SchedulerFieldExpr<T, unknown>;
  descriptionExpr(): SchedulerFieldExpr<T, unknown>;
  recurrenceRuleExpr(): SchedulerFieldExpr<T, unknown>;
  recurrenceExceptionExpr(): SchedulerFieldExpr<T, unknown>;
  disabledExpr(): SchedulerFieldExpr<T, unknown>;
  reminderExpr(): SchedulerFieldExpr<T, unknown>;
  currentDate(): Date;
  currentView(): OgeSchedulerView;
  views(): readonly (OgeSchedulerView | OgeSchedulerViewOptions)[];
  firstDayOfWeek(): number | undefined;
  dayStartHour(): number;
  dayEndHour(): number;
  cellDuration(): number;
  agendaDuration(): number;
  resources(): readonly OgeSchedulerResource[];
  groups(): readonly string[];
  locale(): string | undefined;
  messages(): Partial<OgeSchedulerMessages> | undefined;
  allowAdding(): boolean;
  allowUpdating(): boolean;
  allowDeleting(): boolean;
  allowDragging(): boolean;
  allowResizing(): boolean;
  readOnly(): boolean;
  recurrenceEditMode(): 'dialog' | 'occurrence' | 'series';
  min(): Date | undefined;
  max(): Date | undefined;
  dateNavigatorText():
    ((start: Date, end: Date, view: OgeSchedulerView) => string) | undefined;
}

/** The scheduler's public events, as plain emitters. */
export interface OgeSchedulerCoreEvents<T, TItem> {
  appointmentAdding(event: OgeSchedulerAppointmentAddingEvent<T>): void;
  appointmentAdded(event: OgeSchedulerAppointmentAddedEvent<T>): void;
  appointmentUpdating(event: OgeSchedulerAppointmentUpdatingEvent<T>): void;
  appointmentUpdated(event: OgeSchedulerAppointmentUpdatedEvent<T>): void;
  appointmentDeleting(event: OgeSchedulerAppointmentDeletingEvent<T>): void;
  appointmentDeleted(event: OgeSchedulerAppointmentDeletedEvent<T>): void;
  appointmentClick(event: OgeSchedulerAppointmentClickEvent<T>): void;
  appointmentDblClick(event: OgeSchedulerAppointmentClickEvent<T>): void;
  cellClick(event: OgeSchedulerCellClickEvent): void;
  cellDblClick(event: OgeSchedulerCellClickEvent): void;
  editorShowing(event: OgeSchedulerEditorShowingEvent<T, TItem>): void;
  rangeSelected(event: OgeSchedulerRangeSelectedEvent): void;
  appointmentContextMenu(event: OgeSchedulerAppointmentClickEvent<T>): void;
  cellContextMenu(event: OgeSchedulerCellClickEvent): void;
  reminderTriggered(event: OgeSchedulerReminderEvent<T>): void;
}

/** The UI surfaces the core drives but does not render. */
export interface OgeSchedulerCoreSurfaces<T, TItem> {
  /** Opens the summary popup anchored at the chip's screen rect. */
  openPopup(appointment: SchedulerAppointment<T>, rect: DOMRect): void;
  closePopup(): void;
  /** The default form items for the editor about to open on `model`. */
  editorItems(model: SchedulerEditorModel): TItem[];
  /** Opens the editor dialog on `model` with the (possibly replaced) items. */
  openEditor(model: SchedulerEditorModel, isNew: boolean, items: TItem[]): void;
  closeEditor(): void;
  /** The host element's viewport rect — the context menu's origin. */
  hostRect(): { readonly left: number; readonly top: number } | null;
  /** Focuses the first enabled context-menu item once it has rendered. */
  focusMenu(): void;
}

/** Everything `OgeSchedulerCore` is constructed with. */
export interface OgeSchedulerCoreOptions<T, TItem> {
  readonly rx: OgeReactivityAdapter;
  readonly inputs: OgeSchedulerCoreInputs<T>;
  /** The resolved DI / context config (read live). */
  readonly config: () => OgeSchedulerConfig;
  /** Writes the two-way `currentDate` model. */
  setCurrentDate(date: Date): void;
  /** Writes the two-way `currentView` model. */
  setCurrentView(view: OgeSchedulerView): void;
  readonly events: OgeSchedulerCoreEvents<T, TItem>;
  readonly surfaces: OgeSchedulerCoreSurfaces<T, TItem>;
}

/** The recurrence actions that ask "this occurrence or the series?". */
export type SchedulerScopeAction = 'edit' | 'delete' | 'moved' | 'resized';

/** A pending occurrence action awaiting the scope choice. */
export interface SchedulerScopePending<T> {
  readonly action: SchedulerScopeAction;
  readonly appointment: SchedulerAppointment<T>;
  readonly proposal?: AppointmentProposal;
}

/** The open built-in context menu (host-relative position). */
export interface SchedulerContextMenuState<T> {
  readonly x: number;
  readonly y: number;
  readonly appointment: SchedulerAppointment<T> | null;
  readonly cell: {
    readonly cellDate: Date;
    readonly allDay: boolean;
    readonly resourceId?: unknown;
  } | null;
}

export class OgeSchedulerCore<T extends object, TItem = unknown> {
  private readonly inputs: OgeSchedulerCoreInputs<T>;

  /* ---------- state ---------- */

  /**
   * The writable working set. Array inputs are copied here (the input array
   * itself is never mutated — hosts persist through the CRUD events);
   * `DataSource` loads land here too and CRUD goes through the source's own
   * `insert`/`update`/`remove` before a reload.
   */
  readonly store: OgeReactiveCell<readonly T[]>;
  /** A pending occurrence action awaiting the scope choice. */
  readonly scopePending: OgeReactiveCell<SchedulerScopePending<T> | null>;
  /** The open built-in context menu, or `null`. */
  readonly contextMenu: OgeReactiveCell<SchedulerContextMenuState<T> | null>;
  /** The polite live-region text. */
  readonly announcement: OgeReactiveCell<string>;

  private loadEpoch = 0;
  private boundSource: readonly T[] | DataSource<T> | null | undefined =
    undefined;
  private editedSource: T | null = null;
  /** The occurrence being detached by an occurrence-scope edit. */
  private editingOccurrence: SchedulerAppointment<T> | null = null;
  private readonly firedReminders = new Set<unknown>();

  /* ---------- derived ---------- */

  /** Per-instance messages merged over the configured ones. */
  readonly msg: () => OgeSchedulerMessages;
  /** Minimum rendered chip height, in minutes. */
  readonly minAppointmentMinutes: () => number;
  /** Per-instance locale, falling back to the config, then the browser. */
  readonly effectiveLocale: () => string | undefined;
  readonly resolvedFirstDayOfWeek: () => number;
  readonly resolvedViews: () => readonly ResolvedSchedulerView[];
  readonly activeView: () => ResolvedSchedulerView;
  readonly dayWeekView: () => 'day' | 'week' | 'workWeek';
  readonly canAdd: () => boolean;
  readonly canUpdate: () => boolean;
  readonly canDelete: () => boolean;
  readonly canDrag: () => boolean;
  readonly canResize: () => boolean;
  readonly fields: () => ResolvedSchedulerFields<T>;
  /** The resource that colors uncolored appointments, if any. */
  readonly colorResource: () => OgeSchedulerResource | null;
  /** The grouping resource (first `groups` field). */
  readonly groupResource: () => OgeSchedulerResource | null;
  readonly groupResourceIdOf: () => (item: T) => unknown;
  readonly keyOf: () => (item: T, index: number) => unknown;
  /** Every normalized appointment (unfiltered, series unexpanded). */
  readonly appointments: () => readonly SchedulerAppointment<T>[];
  /** Appointments overlapping the visible period (occurrences expanded). */
  readonly visibleAppointments: () => readonly SchedulerAppointment<T>[];
  readonly periodTitle: () => string;

  constructor(private readonly options: OgeSchedulerCoreOptions<T, TItem>) {
    const { rx, inputs } = options;
    this.inputs = inputs;
    this.store = rx.cell<readonly T[]>([]);
    this.scopePending = rx.cell<SchedulerScopePending<T> | null>(null);
    this.contextMenu = rx.cell<SchedulerContextMenuState<T> | null>(null);
    this.announcement = rx.cell('');

    this.msg = rx.derived(() =>
      mergeSchedulerMessages(options.config().messages, inputs.messages()),
    );
    this.minAppointmentMinutes = rx.derived(
      () => options.config().minAppointmentMinutes ?? 15,
    );
    this.effectiveLocale = rx.derived(
      () => inputs.locale() ?? options.config().locale,
    );
    this.resolvedFirstDayOfWeek = rx.derived(() =>
      resolveFirstDayOfWeek(inputs.firstDayOfWeek(), this.effectiveLocale()),
    );
    this.resolvedViews = rx.derived(() =>
      resolveSchedulerViews(inputs.views(), this.msg().toolbar, {
        dayStartHour: inputs.dayStartHour(),
        dayEndHour: inputs.dayEndHour(),
        cellDuration: inputs.cellDuration(),
      }),
    );
    this.activeView = rx.derived(() =>
      resolveActiveSchedulerView(
        inputs.currentView(),
        this.resolvedViews(),
        this.msg().toolbar,
        {
          dayStartHour: inputs.dayStartHour(),
          dayEndHour: inputs.dayEndHour(),
          cellDuration: inputs.cellDuration(),
        },
      ),
    );
    this.dayWeekView = rx.derived(() => dayWeekViewOf(inputs.currentView()));
    this.canAdd = rx.derived(() => inputs.allowAdding() && !inputs.readOnly());
    this.canUpdate = rx.derived(
      () => inputs.allowUpdating() && !inputs.readOnly(),
    );
    this.canDelete = rx.derived(
      () => inputs.allowDeleting() && !inputs.readOnly(),
    );
    this.canDrag = rx.derived(
      () => inputs.allowDragging() && !inputs.readOnly(),
    );
    this.canResize = rx.derived(
      () => inputs.allowResizing() && !inputs.readOnly(),
    );
    this.fields = rx.derived(() =>
      resolveSchedulerFields<T>({
        textExpr: inputs.textExpr(),
        startDateExpr: inputs.startDateExpr(),
        endDateExpr: inputs.endDateExpr(),
        allDayExpr: inputs.allDayExpr(),
        colorExpr: inputs.colorExpr(),
        locationExpr: inputs.locationExpr(),
        descriptionExpr: inputs.descriptionExpr(),
        reminderExpr: inputs.reminderExpr(),
        recurrenceRuleExpr: inputs.recurrenceRuleExpr(),
        recurrenceExceptionExpr: inputs.recurrenceExceptionExpr(),
        disabledExpr: inputs.disabledExpr(),
      }),
    );
    this.colorResource = rx.derived(() =>
      resolveColorResource(inputs.resources()),
    );
    this.groupResource = rx.derived(() =>
      resolveGroupResource(inputs.resources(), inputs.groups()),
    );
    this.groupResourceIdOf = rx.derived(() =>
      groupResourceIdReader<T>(this.groupResource()),
    );
    this.keyOf = rx.derived(() => schedulerKeyReader<T>(inputs.keyExpr()));
    this.appointments = rx.derived(() =>
      normalizeSchedulerStore(
        this.store(),
        this.fields(),
        this.keyOf(),
        this.colorResource(),
      ),
    );
    this.visibleAppointments = rx.derived(() =>
      visibleSchedulerAppointments(
        this.appointments(),
        inputs.currentView(),
        inputs.currentDate(),
        this.resolvedFirstDayOfWeek(),
        inputs.agendaDuration(),
      ),
    );
    this.periodTitle = rx.derived(() =>
      schedulerPeriodTitle(
        inputs.currentView(),
        inputs.currentDate(),
        this.effectiveLocale(),
        this.resolvedFirstDayOfWeek(),
        inputs.agendaDuration(),
        inputs.dateNavigatorText(),
      ),
    );
  }

  /* ---------- data loading ---------- */

  /**
   * Binds the `dataSource` input: `null` empties the store, an array is
   * copied, a `DataSource` loads. Re-binding the same source is a no-op, so
   * a host may call this on every change notification.
   */
  bindSource(source: readonly T[] | DataSource<T> | null): void {
    if (source === this.boundSource) return;
    this.boundSource = source;
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
  }

  /** Cancels in-flight loads (host destroy / effect cleanup). */
  destroy(): void {
    this.loadEpoch++;
    // the next bind (a StrictMode remount, a revived host) loads again
    this.boundSource = undefined;
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

  private dataSourceOf(): DataSource<T> | null {
    const source = this.inputs.dataSource();
    return source !== null && !Array.isArray(source)
      ? (source as DataSource<T>)
      : null;
  }

  /* ---------- reminders ---------- */

  /**
   * Fires `reminderTriggered` once per occurrence whose lead time has been
   * reached (24 h look-ahead). Hosts call this on a ~30 s ticker.
   */
  checkReminders(now: Date = new Date()): void {
    for (const appointment of dueSchedulerReminders(
      this.appointments(),
      now,
      this.firedReminders,
    )) {
      this.options.events.reminderTriggered({
        appointmentData: appointment.source,
        appointment,
      });
    }
  }

  /* ---------- announcements ---------- */

  private announce(
    template: string,
    tokens: Readonly<Record<string, string>>,
  ): void {
    this.announcement.set(fillSchedulerTemplate(template, tokens));
  }

  /* ---------- navigation ---------- */

  /** Writes `currentDate`, clamped into `[min, max]`. */
  setDate(date: Date): void {
    this.options.setCurrentDate(
      clampDate(date, this.inputs.min(), this.inputs.max()),
    );
  }

  /** Whether today falls inside the visible period (disables "Today"). */
  isTodayVisible(): boolean {
    return isTodayInSchedulerView(
      this.inputs.currentView(),
      this.inputs.currentDate(),
      this.resolvedFirstDayOfWeek(),
      this.inputs.agendaDuration(),
    );
  }

  /** Whether stepping one period keeps some of `[min, max]` visible. */
  canNavigate(direction: -1 | 1): boolean {
    return canNavigateScheduler(
      this.inputs.currentView(),
      this.inputs.currentDate(),
      direction,
      this.resolvedFirstDayOfWeek(),
      this.inputs.agendaDuration(),
      this.inputs.min(),
      this.inputs.max(),
    );
  }

  /** Moves the visible period to today. */
  goToday(): void {
    this.setDate(new Date());
  }

  /** Steps the visible period backwards (`-1`) or forwards (`1`). */
  navigate(direction: -1 | 1): void {
    if (!this.canNavigate(direction)) return;
    this.setDate(
      navigateDate(
        this.inputs.currentView(),
        this.inputs.currentDate(),
        direction,
        this.inputs.agendaDuration(),
      ),
    );
  }

  /** Switches the active view (the toolbar's view switcher). */
  setView(view: OgeSchedulerView): void {
    this.options.setCurrentView(view);
  }

  /** Navigates to `date` in the day view ("+N more", year cells). */
  drillIntoDay(date: Date): void {
    this.setDate(date);
    this.options.setCurrentView('day');
  }

  /** The date navigator picked a day. */
  onNavigatorPicked(date: Date | null): void {
    if (date !== null) this.setDate(date);
  }

  /** First moment of the visible period. */
  getStartViewDate(): Date {
    return this.visibleRange().start;
  }

  /** Exclusive end of the visible period. */
  getEndViewDate(): Date {
    return this.visibleRange().end;
  }

  private visibleRange(): { start: Date; end: Date } {
    return viewRange(
      this.inputs.currentView(),
      this.inputs.currentDate(),
      this.resolvedFirstDayOfWeek(),
      this.inputs.agendaDuration(),
    );
  }

  /* ---------- interaction plumbing ---------- */

  onCellClicked(event: SchedulerCellEvent): void {
    if (event.event instanceof MouseEvent) {
      this.options.events.cellClick({
        cellDate: event.cellDate,
        allDay: event.allDay,
        event: event.event,
      });
    }
  }

  onCellDblClicked(event: SchedulerCellEvent): void {
    if (event.event instanceof MouseEvent) {
      this.options.events.cellDblClick({
        cellDate: event.cellDate,
        allDay: event.allDay,
        event: event.event,
      });
    }
    this.openCreateEditor(event.cellDate, event.allDay, event.resourceId);
  }

  onCellActivated(event: SchedulerCellEvent): void {
    this.openCreateEditor(event.cellDate, event.allDay, event.resourceId);
  }

  onChipClicked(event: SchedulerChipEvent<T>): void {
    if (event.event instanceof MouseEvent) {
      this.options.events.appointmentClick({
        appointment: event.appointment,
        event: event.event,
      });
    }
    this.options.surfaces.openPopup(event.appointment, event.rect);
  }

  onChipDblClicked(event: SchedulerChipEvent<T>): void {
    if (event.event instanceof MouseEvent) {
      this.options.events.appointmentDblClick({
        appointment: event.appointment,
        event: event.event,
      });
    }
    this.openEditorFor(event.appointment);
  }

  onChipActivated(event: SchedulerChipEvent<T>): void {
    this.options.surfaces.openPopup(event.appointment, event.rect);
  }

  /* ---------- recurrence scope routing ---------- */

  /** The scope dialog's body text for a pending action. */
  scopeText(pending: { readonly action: SchedulerScopeAction }): string {
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
    action: SchedulerScopeAction,
    appointment: SchedulerAppointment<T>,
    proposal?: AppointmentProposal,
  ): void {
    const mode = this.inputs.recurrenceEditMode();
    if (mode === 'dialog') {
      this.scopePending.set({ action, appointment, proposal });
      return;
    }
    this.applyScoped(mode, { action, appointment, proposal });
  }

  /** The scope dialog's answer. */
  resolveScope(scope: 'occurrence' | 'series'): void {
    const pending = this.scopePending();
    this.scopePending.set(null);
    if (pending !== null) this.applyScoped(scope, pending);
  }

  /** Dismisses the scope dialog without applying anything. */
  cancelScope(): void {
    this.scopePending.set(null);
  }

  private applyScoped(
    scope: 'occurrence' | 'series',
    pending: SchedulerScopePending<T>,
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
    return this.appointments().find(
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
        editorModelFrom(appointment, false, this.inputs.resources()),
        appointment.source,
        false,
      );
      return;
    }
    const series = this.seriesOf(appointment) ?? appointment;
    this.editingOccurrence = null;
    this.openEditor(
      editorModelFrom(series, true, this.inputs.resources()),
      series.source,
      false,
    );
  }

  private performProposal(
    appointment: SchedulerAppointment<T>,
    proposal: AppointmentProposal,
    scope: 'occurrence' | 'series',
    kind: 'moved' | 'resized',
  ): void {
    if (!this.canUpdate()) return;
    if (scope === 'occurrence') {
      const model = editorModelFrom(
        appointment,
        false,
        this.inputs.resources(),
      );
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

  /* ---------- editor ---------- */

  /** Opens the editor for an existing appointment (occurrences route). */
  openEditorFor(appointment: SchedulerAppointment<T>): void {
    if (!this.canUpdate()) return;
    if (appointment.seriesKey !== null) {
      this.routeRecurring('edit', appointment);
      return;
    }
    this.editingOccurrence = null;
    this.openEditor(
      editorModelFrom(appointment, true, this.inputs.resources()),
      appointment.source,
      false,
    );
  }

  /** Deletes an appointment, routing recurring occurrences by scope. */
  onDeleteRequested(appointment: SchedulerAppointment<T>): void {
    if (!this.canDelete()) return;
    if (appointment.seriesKey !== null) {
      this.routeRecurring('delete', appointment);
      return;
    }
    this.deleteBySource(appointment.source);
  }

  /** Opens the prefilled create editor at a cell. */
  openCreateEditor(
    cellDate: Date,
    allDay: boolean,
    resourceId?: unknown,
  ): void {
    if (!this.canAdd()) return;
    const startDate = allDay ? startOfDay(cellDate) : cellDate;
    const endDate = allDay
      ? nextDay(startDate)
      : addMinutes(startDate, this.activeView().cellDuration);
    const model = draftEditorModel(
      startDate,
      endDate,
      allDay,
      this.prefillResources(resourceId),
    );
    this.openEditor(model, this.buildItem(model), true);
  }

  private openEditor(
    editorModel: SchedulerEditorModel,
    source: T,
    isNew: boolean,
  ): void {
    const event: OgeSchedulerEditorShowingEvent<T, TItem> = {
      appointmentData: source,
      isNew,
      formItems: this.options.surfaces.editorItems(editorModel),
      cancel: false,
    };
    this.options.events.editorShowing(event);
    if (event.cancel) return;
    this.editedSource = isNew ? null : source;
    this.options.surfaces.openEditor(editorModel, isNew, event.formItems);
  }

  /** The editor dialog saved. */
  onEditorSaved(result: SchedulerEditorResult): void {
    if (result.isNew) {
      this.insertItem(this.buildItem(result.model));
    } else if (this.editingOccurrence !== null) {
      this.detachOccurrence(this.editingOccurrence, result.model);
    } else if (this.editedSource !== null) {
      this.updateItem(
        this.editedSource,
        buildPatchFromEditor(
          this.editedSource,
          result.model,
          this.fields(),
          this.inputs.resources(),
        ),
      );
    }
    this.editedSource = null;
    this.editingOccurrence = null;
  }

  private buildItem(editorModel: SchedulerEditorModel): T {
    return buildItemFromEditor<T>(
      editorModel,
      this.fields(),
      this.inputs.resources(),
    );
  }

  /** Resource prefill of grouped create flows. */
  private prefillResources(resourceId: unknown): Record<string, unknown> {
    const resource = this.groupResource();
    return resource !== null && resourceId !== undefined
      ? { [resource.fieldExpr]: resourceId }
      : {};
  }

  /* ---------- CRUD executor ---------- */

  private insertItem(item: T): void {
    if (!this.canAdd()) return;
    const event: OgeSchedulerAppointmentAddingEvent<T> = {
      appointmentData: item,
      cancel: false,
    };
    this.options.events.appointmentAdding(event);
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
    this.options.events.appointmentAdded({ appointmentData: item });
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
    this.options.events.appointmentUpdating(event);
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
    this.options.events.appointmentUpdated({ appointmentData: updated });
    this.announce(this.msg().announcements.updated, {
      text: String(this.fields().text(updated) ?? ''),
    });
  }

  /** Deletes the appointment rendered from `item` (guarded + evented). */
  deleteBySource(item: T): void {
    if (!this.canDelete()) return;
    const event: OgeSchedulerAppointmentDeletingEvent<T> = {
      appointmentData: item,
      cancel: false,
    };
    this.options.events.appointmentDeleting(event);
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
    this.options.events.appointmentDeleted({ appointmentData: item });
    this.announce(this.msg().announcements.deleted, {
      text: String(this.fields().text(item) ?? ''),
    });
  }

  /* ---------- gestures ---------- */

  /** A month/day-only drag landed. */
  onMoveCommitted(event: SchedulerProposalEvent<T>): void {
    if (event.appointment.seriesKey !== null) {
      this.routeRecurring('moved', event.appointment, event.proposal);
      return;
    }
    this.commitProposal(event, 'moved');
  }

  /** A resize landed (pointer or keyboard). */
  onResizeCommitted(event: SchedulerProposalEvent<T>): void {
    if (event.appointment.seriesKey !== null) {
      this.routeRecurring('resized', event.appointment, event.proposal);
      return;
    }
    this.commitProposal(event, 'resized');
  }

  /** A gesture was cancelled with Escape/blur. */
  onGestureCancelled(): void {
    this.announcement.set(this.msg().announcements.cancelled);
  }

  /**
   * Time-grid / timeline drag commit: the time shift runs the normal
   * (recurrence-aware) move pipeline; a resource change patches the grouping
   * field — for plain appointments and series scope only (an occurrence
   * keeps its row).
   */
  onGroupedMoveCommitted(event: SchedulerProposalEvent<T>): void {
    const resource = this.groupResource();
    if (event.appointment.seriesKey !== null) {
      this.routeRecurring('moved', event.appointment, event.proposal);
      return;
    }
    if (!this.canUpdate()) return;
    const patch: Record<string, unknown> = {
      ...(appointmentPatch(
        event.appointment.source,
        event.proposal,
        this.fields(),
      ) as Record<string, unknown>),
    };
    if (event.resourceId !== undefined && resource !== null) {
      patch[resource.fieldExpr] = event.resourceId;
    }
    this.updateItem(event.appointment.source, patch as Partial<T>);
    this.announceProposal('moved', event);
  }

  /** A drag-to-create range landed: emits, then opens the create editor. */
  onRangeSelected(range: SchedulerRangeEvent): void {
    this.options.events.rangeSelected(range);
    if (!this.canAdd()) return;
    const model = draftEditorModel(
      range.startDate,
      range.endDate,
      false,
      this.prefillResources(range.resourceId),
    );
    this.openEditor(model, this.buildItem(model), true);
  }

  private commitProposal(
    event: SchedulerProposalEvent<T>,
    kind: 'moved' | 'resized',
  ): void {
    if (!this.canUpdate()) return;
    const patch = appointmentPatch(
      event.appointment.source,
      event.proposal,
      this.fields(),
    );
    this.updateItem(event.appointment.source, patch);
    this.announceProposal(kind, event);
  }

  private announceProposal(
    kind: 'moved' | 'resized',
    event: SchedulerProposalEvent<T>,
  ): void {
    const format = new Intl.DateTimeFormat(this.effectiveLocale(), {
      dateStyle: 'medium',
      timeStyle: event.appointment.allDay ? undefined : 'short',
    });
    this.announce(this.msg().announcements[kind], {
      text: event.appointment.text,
      start: format.format(event.proposal.startDate),
      end: format.format(event.proposal.endDate),
    });
  }

  /* ---------- built-in context menu ---------- */

  onChipContextMenu(event: SchedulerChipEvent<T>): void {
    if (event.event instanceof MouseEvent) {
      this.options.events.appointmentContextMenu({
        appointment: event.appointment,
        event: event.event,
      });
      this.openMenu(event.event, event.appointment, null);
    }
  }

  onCellContextMenu(event: SchedulerCellEvent): void {
    if (event.event instanceof MouseEvent) {
      this.options.events.cellContextMenu({
        cellDate: event.cellDate,
        allDay: event.allDay,
        event: event.event,
      });
      this.openMenu(event.event, null, {
        cellDate: event.cellDate,
        allDay: event.allDay,
        resourceId: event.resourceId,
      });
    }
  }

  private openMenu(
    event: MouseEvent,
    appointment: SchedulerAppointment<T> | null,
    cell: SchedulerContextMenuState<T>['cell'],
  ): void {
    // no available action → keep the native browser menu
    const available =
      appointment !== null
        ? this.canUpdate() || this.canDelete()
        : this.canAdd();
    if (!available) return;
    event.preventDefault();
    const hostRect = this.options.surfaces.hostRect() ?? { left: 0, top: 0 };
    this.contextMenu.set({
      x: event.clientX - hostRect.left,
      y: event.clientY - hostRect.top,
      appointment,
      cell,
    });
    this.options.surfaces.focusMenu();
  }

  closeMenu(): void {
    this.contextMenu.set(null);
  }

  menuEdit(): void {
    const menu = this.contextMenu();
    this.closeMenu();
    if (menu?.appointment) this.openEditorFor(menu.appointment);
  }

  menuDelete(): void {
    const menu = this.contextMenu();
    this.closeMenu();
    if (menu?.appointment) this.onDeleteRequested(menu.appointment);
  }

  menuCreate(): void {
    const menu = this.contextMenu();
    this.closeMenu();
    if (menu?.cell) {
      this.openCreateEditor(
        menu.cell.cellDate,
        menu.cell.allDay,
        menu.cell.resourceId,
      );
    }
  }

  /* ---------- imperative API ---------- */

  /**
   * Opens the appointment editor: with `createNew` (or no data) a prefilled
   * create form, otherwise the edit form of the given item (dx parity —
   * `showAppointmentPopup` opens the *form*, not the summary popup).
   */
  showAppointmentPopup(appointmentData?: Partial<T>, createNew = false): void {
    if (createNew || appointmentData === undefined) {
      const base = this.inputs.currentDate();
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
    const appointment = this.appointments().find(
      (entry) => entry.source === appointmentData,
    );
    if (appointment !== undefined) this.openEditorFor(appointment);
  }

  /** Closes the appointment editor and the summary popup. */
  hideAppointmentPopup(): void {
    this.options.surfaces.closeEditor();
    this.options.surfaces.closePopup();
  }

  /** Inserts through the same cancelable pipeline as interactive creation. */
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
}
