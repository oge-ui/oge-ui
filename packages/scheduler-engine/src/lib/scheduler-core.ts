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
import {
  ogeElementAtPoint,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
} from '@oge-ui/behavior';
import {
  ogeDateTimeFormat,
  ogeFormatMessage,
  addDays,
  addMinutes,
  clampDate,
  nextDay,
  resolveFirstDayOfWeek,
  resolveWeekendDays,
  serializeLikeOriginal,
  startOfDay,
  type DataSource,
  type RowKey,
} from '@oge-ui/core';
import {
  isDayBlocked,
  isRangeBlocked,
  snapProposalToWorkHours,
} from './availability';
import {
  planSchedulerPaste,
  schedulerClipboardEntries,
  type SchedulerClipboardEntry,
  type SchedulerPasteTarget,
} from './clipboard';
import type {
  OgeSchedulerConfig,
  OgeSchedulerMessages,
  OgeSchedulerResolvedMessages,
} from './config';
import { findSchedulerConflicts } from './conflicts';
import { buildSchedulerExportData, type OgeSchedulerExportData } from './export-data';
import {
  findOgeSchedulerDropTarget,
  takeArmedOgeSchedulerPayload,
  type OgeSchedulerDragPayload,
  type OgeSchedulerDropSlot,
} from './external-drag';
import {
  buildGroupLeaves,
  groupLeafMatcher,
  leafWorkHours,
  resolveGroupLevels,
  resourceValuesOfItem,
  type SchedulerGroupLeaf,
} from './grouping';
import {
  SchedulerEditHistory,
  restorePatch,
  type SchedulerHistoryOp,
} from './history';
import type { SchedulerSelectGesture } from './keyboard';
import { appointmentsOnDay } from './month-vm';
import { nextSchedulerSelection } from './selection';
import {
  buildItemFromEditor,
  buildPatchFromEditor,
  draftEditorModel,
  editorModelFrom,
  type SchedulerEditorModel,
  type SchedulerEditorResult,
} from './editor';
import type { AppointmentProposal } from './gesture-math';
import { schedulerGridReadOnly } from './day-week-vm';
import { appendException } from './rrule-expand';
import {
  appointmentPatch,
  normalizeAppointment,
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
  OgeSchedulerAppointmentDroppedEvent,
  OgeSchedulerAppointmentUpdatedEvent,
  OgeSchedulerAppointmentUpdatingEvent,
  OgeSchedulerCellClickEvent,
  OgeSchedulerConflictCheck,
  OgeSchedulerDisabledSlots,
  OgeSchedulerDragOutEvent,
  OgeSchedulerEditorShowingEvent,
  OgeSchedulerGroupOrientation,
  OgeSchedulerMoreMode,
  OgeSchedulerRangeSelectedEvent,
  OgeSchedulerReminderEvent,
  OgeSchedulerResource,
  OgeSchedulerView,
  OgeSchedulerViewOptions,
  OgeSchedulerWorkHours,
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
import { isTimelineView, navigateDate, viewRange } from './view-model';

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
  /** Weekend days (0 = Sunday); `undefined` resolves from the locale. */
  weekendDays(): readonly number[] | undefined;
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
  /*
   * G3 inputs — optional so an older host still type-checks; each falls
   * back to the documented default.
   */
  /** Grouped layout: side by side or stacked (default per view family). */
  groupOrientation?(): OgeSchedulerGroupOrientation | undefined;
  /** Horizontal grouping puts the leaves inside each day (default `true`). */
  groupByDate?(): boolean;
  /** Blocked slots (predicate or ranges). */
  disabledSlots?(): OgeSchedulerDisabledSlots | null | undefined;
  /** The scheduler-wide working hours (`workHours`). */
  workHours?(): OgeSchedulerWorkHours | null;
  /** Clamps timed moves / creates into the target's working hours. */
  snapToWorkHours?(): boolean;
  /** `false` refuses changes overlapping another appointment. */
  allowOverlap?(): boolean;
  /** Decides overlapping changes (wins over `allowOverlap`). */
  conflictCheck?(): OgeSchedulerConflictCheck<T> | undefined;
  /** The selected items (two-way `selectedAppointments`). */
  selectedAppointments?(): readonly T[];
  /** Undo steps kept (`0` turns undo off; default 50). */
  undoLimit?(): number;
  /** What a month "+N more" does (default `'popup'`). */
  moreMode?(): OgeSchedulerMoreMode;
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
  /** An external item (or another scheduler's appointment) was dropped in. */
  appointmentDropped?(event: OgeSchedulerAppointmentDroppedEvent<T>): void;
  /** An appointment was dragged out of the scheduler and released. */
  dragOut?(event: OgeSchedulerDragOutEvent<T>): void;
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
  /** The scheduler host element (drag-out hit-testing excludes it). */
  hostElement?(): Element | null;
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
  /** Writes the two-way `selectedAppointments` model. */
  setSelectedAppointments?(items: readonly T[]): void;
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
    readonly resources?: Readonly<Record<string, unknown>>;
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
  /**
   * A short visible notice for refused changes (blocked slot, conflict) —
   * `aria-hidden`, the announcement speaks the same text. Clears itself.
   */
  readonly notice: OgeReactiveCell<string>;
  /** The switcher entry last pressed (entries sharing a type), or `null`. */
  readonly selectedViewIndex: OgeReactiveCell<number | null>;
  /** The day whose "+N more" popup is open, or `null`. */
  readonly moreDay: OgeReactiveCell<Date | null>;
  /** The live external-drop preview (the slot under the pointer). */
  readonly dropPreview: OgeReactiveCell<{
    readonly slot: OgeSchedulerDropSlot;
    readonly durationMinutes: number;
  } | null>;
  /** Bumped on every history change, so `canUndo()` / `canRedo()` re-render. */
  readonly historyVersion: OgeReactiveCell<number>;

  private readonly history: SchedulerEditHistory<T>;
  private clipboard: readonly SchedulerClipboardEntry<T>[] = [];
  private selectionAnchor: T | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  /** True while undo / redo replays (no guards, no selection churn). */
  private replaying = false;

  private loadEpoch = 0;
  private boundSource: readonly T[] | DataSource<T> | null | undefined =
    undefined;
  private editedSource: T | null = null;
  /** The occurrence being detached by an occurrence-scope edit. */
  private editingOccurrence: SchedulerAppointment<T> | null = null;
  private readonly firedReminders = new Set<unknown>();

  /* ---------- derived ---------- */

  /** Per-instance messages merged over the configured ones (gaps filled). */
  readonly msg: () => OgeSchedulerResolvedMessages;
  /** Minimum rendered chip height, in minutes. */
  readonly minAppointmentMinutes: () => number;
  /** Per-instance locale, falling back to the config, then the browser. */
  readonly effectiveLocale: () => string | undefined;
  readonly resolvedFirstDayOfWeek: () => number;
  /**
   * The weekend the views shade and `workWeek` drops (0 = Sunday): the
   * `weekendDays` input, else the locale's `Intl.Locale` week data, else
   * Saturday and Sunday.
   */
  readonly resolvedWeekendDays: () => readonly number[];
  readonly resolvedViews: () => readonly ResolvedSchedulerView[];
  readonly activeView: () => ResolvedSchedulerView;
  readonly dayWeekView: () => 'day' | 'week' | 'workWeek';
  readonly canAdd: () => boolean;
  readonly canUpdate: () => boolean;
  readonly canDelete: () => boolean;
  readonly canDrag: () => boolean;
  readonly canResize: () => boolean;
  /** `aria-readonly` of the view grids — nothing can be created or changed. */
  readonly gridReadOnly: () => boolean;
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
  /** The active view's `intervalCount`. */
  readonly intervalCount: () => number;
  /** The grouping levels (every `groups` field naming a resource). */
  readonly groupLevels: () => readonly OgeSchedulerResource[];
  /** The leaves of the grouping levels (`[]` ungrouped). */
  readonly groupLeaves: () => readonly SchedulerGroupLeaf[];
  /** Maps an item to its leaf index (`-1` unmatched; `0` ungrouped). */
  readonly leafOf: () => (item: T) => number;
  /** The active view's resolved group orientation. */
  readonly groupOrientation: () => OgeSchedulerGroupOrientation;
  /** Whether horizontal day/week grouping is date-major. */
  readonly groupByDate: () => boolean;
  /** The selected items (the two-way `selectedAppointments`). */
  readonly selection: () => readonly T[];
  /** The appointments of the open "+N more" popup's day. */
  readonly moreAppointments: () => readonly SchedulerAppointment<T>[];

  constructor(private readonly options: OgeSchedulerCoreOptions<T, TItem>) {
    const { rx, inputs } = options;
    this.inputs = inputs;
    this.store = rx.cell<readonly T[]>([]);
    this.scopePending = rx.cell<SchedulerScopePending<T> | null>(null);
    this.contextMenu = rx.cell<SchedulerContextMenuState<T> | null>(null);
    this.announcement = rx.cell('');
    this.notice = rx.cell('');
    this.selectedViewIndex = rx.cell<number | null>(null);
    this.moreDay = rx.cell<Date | null>(null);
    this.dropPreview = rx.cell<{
      readonly slot: OgeSchedulerDropSlot;
      readonly durationMinutes: number;
    } | null>(null);
    this.historyVersion = rx.cell(0);
    this.history = new SchedulerEditHistory<T>(
      () => inputs.undoLimit?.() ?? 50,
    );

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
    this.resolvedWeekendDays = rx.derived(() =>
      resolveWeekendDays(inputs.weekendDays(), this.effectiveLocale()),
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
        this.selectedViewIndex(),
      ),
    );
    this.intervalCount = rx.derived(() => this.activeView().intervalCount);
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
    this.gridReadOnly = rx.derived(() =>
      schedulerGridReadOnly({
        canAdd: this.canAdd(),
        canUpdate: this.canUpdate(),
        canDelete: this.canDelete(),
        canDrag: this.canDrag(),
        canResize: this.canResize(),
      }),
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
    this.groupLevels = rx.derived(() =>
      resolveGroupLevels(inputs.resources(), inputs.groups()),
    );
    this.groupLeaves = rx.derived(() => buildGroupLeaves(this.groupLevels()));
    this.leafOf = rx.derived(() =>
      groupLeafMatcher<T>(this.groupLevels(), this.groupLeaves()),
    );
    this.groupOrientation = rx.derived(
      () =>
        this.activeView().groupOrientation ??
        inputs.groupOrientation?.() ??
        (isTimelineView(inputs.currentView()) ? 'vertical' : 'horizontal'),
    );
    this.groupByDate = rx.derived(() => inputs.groupByDate?.() ?? true);
    this.selection = rx.derived(() => inputs.selectedAppointments?.() ?? []);
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
        this.intervalCount(),
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
        this.intervalCount(),
      ),
    );
    this.moreAppointments = rx.derived(() => {
      const day = this.moreDay();
      return day === null
        ? []
        : appointmentsOnDay(this.visibleAppointments(), day);
    });
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
    // the undo log refers to the old working set
    this.history.clear();
    this.bumpHistory();
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
    if (this.noticeTimer !== null) clearTimeout(this.noticeTimer);
    this.noticeTimer = null;
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

  /** Speaks an ICU message (plural counts) through the live region. */
  private announceIcu(
    template: string,
    values: Readonly<Record<string, string | number>>,
  ): void {
    this.announcement.set(
      ogeFormatMessage(template, values, this.effectiveLocale()),
    );
  }

  /** A refused change: announced, and shown as a short visible notice. */
  private refuse(text: string): void {
    this.announcement.set(text);
    this.notice.set(text);
    if (this.noticeTimer !== null) clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => {
      this.noticeTimer = null;
      this.notice.set('');
    }, 4000);
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
      Date.now(),
      this.intervalCount(),
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
      this.intervalCount(),
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
        this.intervalCount(),
      ),
    );
  }

  /**
   * Switches the active view (the toolbar's view switcher). `index` names
   * the switcher entry when several share a type (a day and a 3-day view).
   */
  setView(view: OgeSchedulerView, index?: number): void {
    this.selectedViewIndex.set(index ?? null);
    this.moreDay.set(null);
    this.options.setCurrentView(view);
  }

  /** Whether a switcher entry is the active view (`aria-pressed`). */
  isViewActive(entry: ResolvedSchedulerView): boolean {
    return this.activeView().index === entry.index;
  }

  /** Navigates to `date` in the day view ("+N more", year cells). */
  drillIntoDay(date: Date): void {
    this.moreDay.set(null);
    this.setDate(date);
    // prefer a single-day entry over a multi-day one sharing the type
    const single = this.resolvedViews().find(
      (entry) => entry.type === 'day' && entry.intervalCount === 1,
    );
    this.selectedViewIndex.set(single?.index ?? null);
    this.options.setCurrentView('day');
  }

  /* ---------- "+N more" ---------- */

  /**
   * A month "+N more" was pressed: opens the day's popup list
   * (`moreMode: 'popup'`, the default) or drills into the day view.
   */
  onMoreRequested(date: Date): void {
    if ((this.inputs.moreMode?.() ?? 'popup') === 'drill') {
      this.drillIntoDay(date);
      return;
    }
    this.moreDay.set(startOfDay(date));
  }

  /** Closes the "+N more" popup. */
  closeMore(): void {
    this.moreDay.set(null);
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
      this.intervalCount(),
    );
  }

  /* ---------- interaction plumbing ---------- */

  /** The grouped values of a cell event (`resources`, else the single id). */
  private cellValues(event: {
    readonly resourceId?: unknown;
    readonly resources?: Readonly<Record<string, unknown>>;
  }): Readonly<Record<string, unknown>> {
    if (event.resources !== undefined) return event.resources;
    const resource = this.groupResource();
    return resource !== null && event.resourceId !== undefined
      ? { [resource.fieldExpr]: event.resourceId }
      : {};
  }

  /** The drop slot a cell event describes. */
  private cellSlot(event: SchedulerCellEvent): OgeSchedulerDropSlot {
    return {
      startDate: event.cellDate,
      allDay: event.allDay,
      resources: this.cellValues(event),
    };
  }

  onCellClicked(event: SchedulerCellEvent): void {
    if (event.event instanceof MouseEvent) {
      this.options.events.cellClick({
        cellDate: event.cellDate,
        allDay: event.allDay,
        event: event.event,
        resources: this.cellValues(event),
      });
      // the single-pointer twin of drag-in: a picked-up item lands here
      const armed = takeArmedOgeSchedulerPayload();
      if (armed !== null) this.onExternalDrop(armed, this.cellSlot(event));
    }
  }

  onCellDblClicked(event: SchedulerCellEvent): void {
    if (event.event instanceof MouseEvent) {
      this.options.events.cellDblClick({
        cellDate: event.cellDate,
        allDay: event.allDay,
        event: event.event,
        resources: this.cellValues(event),
      });
    }
    this.openCreateEditor(
      event.cellDate,
      event.allDay,
      event.resourceId,
      this.cellValues(event),
    );
  }

  onCellActivated(event: SchedulerCellEvent): void {
    // the keyboard twin of drag-in: Enter places a picked-up item
    const armed = takeArmedOgeSchedulerPayload();
    if (armed !== null) {
      this.onExternalDrop(armed, this.cellSlot(event));
      return;
    }
    this.openCreateEditor(
      event.cellDate,
      event.allDay,
      event.resourceId,
      this.cellValues(event),
    );
  }

  onChipClicked(event: SchedulerChipEvent<T>): void {
    const pointer = event.event instanceof MouseEvent ? event.event : null;
    if (pointer !== null) {
      this.options.events.appointmentClick({
        appointment: event.appointment,
        event: pointer,
      });
    }
    // Ctrl/⌘-click toggles and Shift-click extends without the popup
    if (pointer !== null && (pointer.ctrlKey || pointer.metaKey || pointer.shiftKey)) {
      this.selectAppointment(
        event.appointment,
        pointer.shiftKey ? 'range' : 'toggle',
        event.order ?? [],
      );
      return;
    }
    this.selectAppointment(event.appointment, 'replace', event.order ?? []);
    this.options.surfaces.openPopup(event.appointment, event.rect);
  }

  /* ---------- selection ---------- */

  /** Whether an appointment's item is selected (every occurrence of a series). */
  isSelected(appointment: SchedulerAppointment<T>): boolean {
    return this.selection().includes(appointment.source);
  }

  /**
   * Applies a selection gesture: `'replace'` (a plain click), `'toggle'`
   * (Ctrl/⌘-click, Ctrl+Space) or `'range'` (Shift-click, Shift+Space over
   * `order`, the view's chip order). Writes `selectedAppointments`.
   */
  selectAppointment(
    appointment: SchedulerAppointment<T>,
    gesture: SchedulerSelectGesture,
    order: readonly SchedulerAppointment<T>[],
  ): void {
    const next = nextSchedulerSelection(
      this.selection(),
      appointment,
      gesture,
      order,
      this.selectionAnchor,
    );
    if (gesture !== 'range') this.selectionAnchor = appointment.source;
    this.writeSelection(next);
    if (gesture !== 'replace') {
      this.announceIcu(this.msg().announcements.selected, {
        count: next.length,
      });
    }
  }

  /** Empties the selection. */
  clearSelection(): void {
    this.selectionAnchor = null;
    this.writeSelection([]);
  }

  private writeSelection(items: readonly T[]): void {
    const current = this.selection();
    if (
      items.length === current.length &&
      items.every((item, index) => item === current[index])
    ) {
      return;
    }
    this.options.setSelectedAppointments?.(items);
  }

  /* ---------- clipboard ---------- */

  /**
   * Ctrl+C: copies the selection — or `focused` when it is not part of it —
   * at the extents rendered now (an occurrence copies as itself).
   * `visible` is the view's appointments, to find each selected item's
   * occurrence on screen.
   */
  copyAppointments(focused: SchedulerAppointment<T> | null): number {
    const selection = this.selection();
    const visible = this.visibleAppointments();
    const picked: SchedulerAppointment<T>[] = [];
    if (focused !== null && !selection.includes(focused.source)) {
      picked.push(focused);
    } else {
      for (const source of selection) {
        const shown =
          focused !== null && focused.source === source
            ? focused
            : visible.find((appointment) => appointment.source === source);
        if (shown !== undefined) picked.push(shown);
      }
    }
    if (picked.length === 0) return 0;
    this.clipboard = schedulerClipboardEntries(picked);
    this.announceIcu(this.msg().announcements.copied, {
      count: picked.length,
    });
    return picked.length;
  }

  /** Whether a paste has anything to insert. */
  canPaste(): boolean {
    return this.clipboard.length > 0;
  }

  /**
   * Ctrl+V into the focused slot: the copies keep their relative offsets,
   * the earliest lands on `target`, a grouped target assigns its resources;
   * each copy runs the guarded insert pipeline, all as one undo step.
   */
  paste(target: SchedulerPasteTarget): number {
    if (!this.canAdd() || this.clipboard.length === 0) return 0;
    const keyExpr = this.inputs.keyExpr();
    const keyField =
      typeof keyExpr === 'function' ? null : (keyExpr ?? 'id');
    const items = planSchedulerPaste(
      this.clipboard,
      target,
      this.fields(),
      keyField,
    );
    let pasted = 0;
    this.history.transaction(() => {
      for (const item of items) {
        if (this.insertItem(item, true, false)) pasted++;
      }
    });
    this.bumpHistory();
    if (pasted > 0) {
      this.announceIcu(this.msg().announcements.pasted, { count: pasted });
    }
    return pasted;
  }

  /* ---------- undo / redo ---------- */

  private bumpHistory(): void {
    this.historyVersion.set(this.historyVersion() + 1);
  }

  /** Whether an undo step is available. */
  canUndo(): boolean {
    this.historyVersion();
    return this.history.canUndo();
  }

  /** Whether a redo step is available. */
  canRedo(): boolean {
    this.historyVersion();
    return this.history.canRedo();
  }

  /**
   * Reverts the last scheduler edit (one user action — a move, a paste, a
   * detached occurrence — is one step) through the normal CRUD pipelines,
   * so the `-ing` / `-ed` events fire and a handler may still veto.
   */
  undo(): boolean {
    const done = this.history.undo((ops) => this.replayInverse(ops));
    this.bumpHistory();
    if (done) this.announcement.set(this.msg().announcements.undone);
    return done;
  }

  /** Re-applies the last undone edit. */
  redo(): boolean {
    const done = this.history.redo((ops) => this.replayInverse(ops));
    this.bumpHistory();
    if (done) this.announcement.set(this.msg().announcements.redone);
    return done;
  }

  /** The store's current copy of a recorded item (identity, then key). */
  private findStored(item: T): T | undefined {
    const store = this.store();
    if (store.includes(item)) return item;
    const keyExpr = this.inputs.keyExpr();
    const keyOf =
      typeof keyExpr === 'function'
        ? keyExpr
        : (entry: T) =>
            (entry as Record<string, unknown>)[keyExpr ?? 'id'];
    const key = keyOf(item);
    if (key === undefined || key === null) return undefined;
    return store.find((entry) => keyOf(entry) === key);
  }

  private replayInverse(ops: readonly SchedulerHistoryOp<T>[]): void {
    this.replaying = true;
    try {
      for (const op of ops) {
        switch (op.kind) {
          case 'insert': {
            const stored = this.findStored(op.item);
            if (stored !== undefined) this.deleteBySource(stored);
            break;
          }
          case 'remove':
            this.insertItem(op.item, false, false);
            break;
          case 'update': {
            const stored = this.findStored(op.after);
            if (stored !== undefined) {
              this.updateItem(stored, restorePatch(stored, op.before), false);
            }
            break;
          }
        }
      }
    } finally {
      this.replaying = false;
    }
  }

  /** Host-level keys: Ctrl/⌘+Z undo, Ctrl/⌘+Y / Ctrl/⌘+Shift+Z redo. */
  onShortcut(shortcut: 'undo' | 'redo'): boolean {
    return shortcut === 'undo' ? this.undo() : this.redo();
  }

  /* ---------- availability & conflicts ---------- */

  /** The leaf whose values `values` holds (`null` ungrouped / unmatched). */
  private leafForValues(
    values: Readonly<Record<string, unknown>>,
  ): SchedulerGroupLeaf | null {
    const levels = this.groupLevels();
    if (levels.length === 0) return null;
    return (
      this.groupLeaves().find((leaf) =>
        levels.every(
          (level) => leaf.values[level.fieldExpr] === values[level.fieldExpr],
        ),
      ) ?? null
    );
  }

  /**
   * The working hours bounding a slot with these resource values: its
   * grouped leaf's, else (ungrouped) those of the assigned resource items,
   * else the scheduler-wide `workHours`.
   */
  workHoursFor(
    values: Readonly<Record<string, unknown>>,
  ): OgeSchedulerWorkHours | null {
    const global = this.inputs.workHours?.() ?? null;
    const leaf = this.leafForValues(values);
    if (leaf !== null) return leafWorkHours(leaf, global);
    const path = this.inputs
      .resources()
      .map((resource) =>
        resource.items.find((item) => item.id === values[resource.fieldExpr]),
      )
      .filter((item): item is NonNullable<typeof item> => item !== undefined);
    if (path.length === 0) return global;
    return leafWorkHours(
      { index: -1, values, path, text: '', label: '', color: undefined },
      global,
    );
  }

  /** Applies `snapToWorkHours` to a proposal landing on `values`. */
  private snapped(
    proposal: AppointmentProposal,
    values: Readonly<Record<string, unknown>>,
  ): AppointmentProposal {
    return this.inputs.snapToWorkHours?.() === true
      ? snapProposalToWorkHours(proposal, this.workHoursFor(values))
      : proposal;
  }

  /** Whether a slot / range with these resource values is blocked. */
  isBlocked(
    start: Date,
    end: Date,
    allDay: boolean,
    values: Readonly<Record<string, unknown>>,
  ): boolean {
    const disabled = this.inputs.disabledSlots?.();
    if (disabled === null || disabled === undefined) return false;
    if (allDay) {
      // all-day items are refused only by a fully blocked day
      for (
        let day = startOfDay(start);
        day.getTime() < Math.max(end.getTime(), start.getTime() + 1);
        day = addDays(day, 1)
      ) {
        if (isDayBlocked(disabled, day, values)) return true;
      }
      return false;
    }
    return isRangeBlocked(
      disabled,
      start,
      end,
      values,
      this.activeView().cellDuration,
    );
  }

  /**
   * The guard every interactive change runs before its pipeline: a blocked
   * slot or a refused overlap cancels the change (announced + noticed).
   * `source` is the item being changed (excluded from its own conflicts).
   */
  private guard(proposed: T, source: T | undefined): boolean {
    if (this.replaying) return true;
    const appointment = normalizeAppointment(proposed, null, this.fields());
    if (appointment === null) return true;
    const values = resourceValuesOfItem(proposed, this.inputs.resources());
    const messages = this.msg().announcements;
    if (
      this.isBlocked(
        appointment.startDate,
        appointment.endDate,
        appointment.displayAllDay,
        values,
      )
    ) {
      this.refuse(messages.slotUnavailable);
      return false;
    }
    const check = this.inputs.conflictCheck?.();
    const allowOverlap = this.inputs.allowOverlap?.() ?? true;
    if (check === undefined && allowOverlap) return true;
    const conflicts = findSchedulerConflicts(
      {
        startDate: appointment.startDate,
        endDate: appointment.endDate,
        source,
        values,
      },
      this.appointments(),
      this.groupLevels(),
    );
    if (conflicts.length === 0) return true;
    const allowed =
      check !== undefined ? check(proposed, conflicts) : allowOverlap;
    if (!allowed) {
      this.refuse(
        fillSchedulerTemplate(messages.conflict, { text: appointment.text }),
      );
    }
    return allowed;
  }

  /* ---------- external drops & drag out ---------- */

  /**
   * Builds and inserts an appointment for something dropped in (an
   * `[ogeSchedulerDraggable]` item, or another scheduler's appointment):
   * the item's own fields are kept, start / end / all-day and the slot's
   * resources are written through the `*Expr` field names. Emits
   * `appointmentDropped`; returns whether the item reached the store.
   */
  onExternalDrop(
    payload: OgeSchedulerDragPayload,
    slot: OgeSchedulerDropSlot,
  ): boolean {
    this.dropPreview.set(null);
    if (!this.canAdd()) return false;
    const minutes = Math.max(
      1,
      payload.durationMinutes ?? this.activeView().cellDuration,
    );
    const start = slot.allDay ? startOfDay(slot.startDate) : slot.startDate;
    const proposal = this.snapped(
      {
        startDate: start,
        endDate: slot.allDay
          ? addDays(start, Math.max(1, Math.round(minutes / 1440)))
          : addMinutes(start, minutes),
        allDay: slot.allDay,
      },
      slot.resources,
    );
    const item = this.buildDroppedItem(payload, proposal, slot.resources);
    const added = this.insertItem(item, true);
    const text = String(this.fields().text(item) ?? payload.text ?? '');
    this.options.events.appointmentDropped?.({
      itemData: payload.data,
      appointmentData: item,
      startDate: proposal.startDate,
      endDate: proposal.endDate,
      allDay: proposal.allDay,
      resources: slot.resources,
      added,
    });
    if (added) this.announce(this.msg().announcements.dropped, { text });
    return added;
  }

  private buildDroppedItem(
    payload: OgeSchedulerDragPayload,
    proposal: AppointmentProposal,
    resources: Readonly<Record<string, unknown>>,
  ): T {
    const fields = this.fields();
    const names = fields.fieldNames;
    const base: Record<string, unknown> =
      payload.data !== null && typeof payload.data === 'object'
        ? { ...(payload.data as Record<string, unknown>) }
        : {};
    if (
      (payload.data === null || typeof payload.data !== 'object') &&
      names.text !== null
    ) {
      base[names.text] = String(payload.data ?? payload.text ?? '');
    }
    const source = base as T;
    if (names.startDate !== null) {
      base[names.startDate] = serializeLikeOriginal(
        proposal.startDate,
        fields.startDate(source),
      );
    }
    if (names.endDate !== null) {
      base[names.endDate] = serializeLikeOriginal(
        proposal.endDate,
        fields.endDate(source),
      );
    }
    if (names.allDay !== null) {
      if (proposal.allDay) base[names.allDay] = true;
      else if (names.allDay in base) base[names.allDay] = false;
    }
    for (const [field, value] of Object.entries(resources)) {
      base[field] = value;
    }
    return base as T;
  }

  /** Drives the drop preview of an external drag hovering this scheduler. */
  onExternalOver(
    slot: OgeSchedulerDropSlot | null,
    payload: OgeSchedulerDragPayload | null,
  ): void {
    this.dropPreview.set(
      slot === null || payload === null || !this.canAdd()
        ? null
        : {
            slot,
            durationMinutes:
              payload.durationMinutes ?? this.activeView().cellDuration,
          },
    );
  }

  /**
   * A chip drag ended outside the view: hands the appointment to another
   * scheduler under the pointer (it emits `appointmentDropped`) and emits
   * `dragOut` either way — the app decides whether the source keeps it.
   */
  onDragOut(
    appointment: SchedulerAppointment<T>,
    clientX: number,
    clientY: number,
  ): void {
    const hit = ogeElementAtPoint(clientX, clientY);
    const own = this.options.surfaces.hostElement?.() ?? null;
    const target = findOgeSchedulerDropTarget(hit);
    let dropped = false;
    if (target !== null && target.element !== own) {
      const slot = target.resolve(clientX, clientY, hit);
      if (slot !== null) {
        dropped = target.drop(
          {
            data: appointment.source,
            durationMinutes: Math.max(
              1,
              Math.round(
                (appointment.endDate.getTime() -
                  appointment.startDate.getTime()) /
                  60_000,
              ),
            ),
            text: appointment.text,
            sourceHost: own,
          },
          slot,
        );
      }
    }
    this.options.events.dragOut?.({
      appointment,
      appointmentData: appointment.source,
      clientX,
      clientY,
      target: hit,
      droppedOnScheduler: dropped,
    });
  }

  /* ---------- export ---------- */

  /**
   * The export model: every appointment (series unexpanded, for iCalendar)
   * plus the expanded rows of `[startDate, endDate)` — the visible period
   * by default — for the PDF / Excel lists.
   */
  getExportData(range?: {
    readonly startDate: Date;
    readonly endDate: Date;
  }): OgeSchedulerExportData<T> {
    const visible = this.visibleRange();
    return buildSchedulerExportData({
      appointments: this.appointments(),
      rangeStart: range?.startDate ?? visible.start,
      rangeEnd: range?.endDate ?? visible.end,
      title: this.periodTitle(),
      locale: this.effectiveLocale(),
      fields: this.fields(),
      resources: this.inputs.resources(),
      messages: this.msg().export,
    });
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

  /**
   * Detaches an occurrence: EXDATE on the series + a standalone copy, as
   * one undo step. A copy that hits a blocked slot or a refused overlap
   * leaves the series untouched.
   */
  private detachOccurrence(
    occurrence: SchedulerAppointment<T>,
    replacement: SchedulerEditorModel | null,
  ): void {
    const fields = this.fields();
    const source = occurrence.source;
    const copy = replacement === null ? null : this.buildItem(replacement);
    if (copy !== null && !this.guard(copy, source)) return;
    const exceptionField = fields.fieldNames.recurrenceException;
    this.history.transaction(() => {
      if (exceptionField !== null) {
        this.updateItem(source, {
          [exceptionField]: appendException(
            occurrence.recurrenceException,
            occurrence.startDate,
          ),
        } as Partial<T>);
      }
      if (copy !== null) {
        this.insertItem(copy);
      } else {
        this.announce(this.msg().announcements.deleted, {
          text: occurrence.text,
        });
      }
    });
    this.bumpHistory();
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

  /**
   * Opens the prefilled create editor at a cell; a blocked cell refuses
   * (announced) instead. `resources` carries every grouped level's id.
   */
  openCreateEditor(
    cellDate: Date,
    allDay: boolean,
    resourceId?: unknown,
    resources?: Readonly<Record<string, unknown>>,
  ): void {
    if (!this.canAdd()) return;
    const values = resources ?? this.cellValues({ resourceId });
    const startDate = allDay ? startOfDay(cellDate) : cellDate;
    const endDate = allDay
      ? nextDay(startDate)
      : addMinutes(startDate, this.activeView().cellDuration);
    if (this.isBlocked(startDate, endDate, allDay, values)) {
      this.refuse(this.msg().announcements.slotUnavailable);
      return;
    }
    const model = draftEditorModel(
      startDate,
      endDate,
      allDay,
      this.prefillResources(resourceId, values),
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
      this.insertItem(this.buildItem(result.model), true);
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
        true,
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

  /** Resource prefill of grouped create flows (every grouped level). */
  private prefillResources(
    resourceId: unknown,
    values?: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    if (values !== undefined && Object.keys(values).length > 0) {
      return { ...values };
    }
    const resource = this.groupResource();
    return resource !== null && resourceId !== undefined
      ? { [resource.fieldExpr]: resourceId }
      : {};
  }

  /* ---------- CRUD executor ---------- */

  /**
   * The insert pipeline: the availability / overlap guard (interactive
   * paths only), the cancelable `appointmentAdding`, the store or the
   * source's `insert`, then `appointmentAdded`, the announcement and the
   * undo record. Returns whether the item went in (a source write counts
   * once requested).
   */
  private insertItem(item: T, guarded = false, announce = true): boolean {
    if (!this.canAdd()) return false;
    if (guarded && !this.guard(item, undefined)) return false;
    const event: OgeSchedulerAppointmentAddingEvent<T> = {
      appointmentData: item,
      cancel: false,
    };
    this.options.events.appointmentAdding(event);
    if (event.cancel) return false;
    const source = this.dataSourceOf();
    if (source?.insert) {
      void source.insert(item).then(() => {
        this.reload(source);
        this.finishAdd(item, announce);
      });
      return true;
    }
    this.store.set([...this.store(), item]);
    this.finishAdd(item, announce);
    return true;
  }

  private finishAdd(item: T, announce = true): void {
    this.history.record({ kind: 'insert', item });
    this.bumpHistory();
    this.options.events.appointmentAdded({ appointmentData: item });
    if (announce) {
      this.announce(this.msg().announcements.created, {
        text: String(this.fields().text(item) ?? ''),
      });
    }
  }

  private updateItem(original: T, patch: Partial<T>, guarded = false): boolean {
    if (!this.canUpdate()) return false;
    const updated = { ...original, ...patch };
    if (guarded && !this.guard(updated, original)) return false;
    const event: OgeSchedulerAppointmentUpdatingEvent<T> = {
      oldData: original,
      newData: patch,
      cancel: false,
    };
    this.options.events.appointmentUpdating(event);
    if (event.cancel) return false;
    const source = this.dataSourceOf();
    if (source?.update) {
      const index = this.store().indexOf(original);
      const key = this.keyOf()(original, index) as RowKey;
      void source.update(key, patch).then(() => {
        this.reload(source);
        this.finishUpdate(original, updated);
      });
      return true;
    }
    this.store.set(
      this.store().map((entry) => (entry === original ? updated : entry)),
    );
    this.finishUpdate(original, updated);
    return true;
  }

  private finishUpdate(original: T, updated: T): void {
    this.history.record({ kind: 'update', before: original, after: updated });
    this.bumpHistory();
    // the selection follows the item to its new object
    const selection = this.selection();
    if (selection.includes(original)) {
      this.writeSelection(
        selection.map((entry) => (entry === original ? updated : entry)),
      );
    }
    if (this.selectionAnchor === original) this.selectionAnchor = updated;
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
    this.history.record({ kind: 'remove', item });
    this.bumpHistory();
    const selection = this.selection();
    if (selection.includes(item)) {
      this.writeSelection(selection.filter((entry) => entry !== item));
    }
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
   * (recurrence-aware) move pipeline; a resource change patches the
   * grouping fields — every level of a multi-level target — for plain
   * appointments and series scope only (an occurrence keeps its row).
   */
  onGroupedMoveCommitted(event: SchedulerProposalEvent<T>): void {
    const resource = this.groupResource();
    if (event.appointment.seriesKey !== null) {
      this.routeRecurring('moved', event.appointment, event.proposal);
      return;
    }
    if (!this.canUpdate()) return;
    const target: Record<string, unknown> =
      event.resources !== undefined
        ? { ...event.resources }
        : event.resourceId !== undefined && resource !== null
          ? { [resource.fieldExpr]: event.resourceId }
          : {};
    const values = {
      ...resourceValuesOfItem(event.appointment.source, this.inputs.resources()),
      ...target,
    };
    const proposal = this.snapped(event.proposal, values);
    const patch: Record<string, unknown> = {
      ...(appointmentPatch(
        event.appointment.source,
        proposal,
        this.fields(),
      ) as Record<string, unknown>),
      ...target,
    };
    if (this.updateItem(event.appointment.source, patch as Partial<T>, true)) {
      this.announceProposal('moved', { ...event, proposal });
    }
  }

  /** A drag-to-create range landed: emits, then opens the create editor. */
  onRangeSelected(range: SchedulerRangeEvent): void {
    this.options.events.rangeSelected(range);
    if (!this.canAdd()) return;
    const values = range.resources ?? this.cellValues(range);
    const proposal = this.snapped(
      { startDate: range.startDate, endDate: range.endDate, allDay: false },
      values,
    );
    if (this.isBlocked(proposal.startDate, proposal.endDate, false, values)) {
      this.refuse(this.msg().announcements.slotUnavailable);
      return;
    }
    const model = draftEditorModel(
      proposal.startDate,
      proposal.endDate,
      false,
      this.prefillResources(range.resourceId, values),
    );
    this.openEditor(model, this.buildItem(model), true);
  }

  private commitProposal(
    event: SchedulerProposalEvent<T>,
    kind: 'moved' | 'resized',
  ): void {
    if (!this.canUpdate()) return;
    const values = resourceValuesOfItem(
      event.appointment.source,
      this.inputs.resources(),
    );
    const proposal =
      kind === 'moved' ? this.snapped(event.proposal, values) : event.proposal;
    const patch = appointmentPatch(
      event.appointment.source,
      proposal,
      this.fields(),
    );
    if (this.updateItem(event.appointment.source, patch, true)) {
      this.announceProposal(kind, { ...event, proposal });
    }
  }

  private announceProposal(
    kind: 'moved' | 'resized',
    event: SchedulerProposalEvent<T>,
  ): void {
    const format = ogeDateTimeFormat(this.effectiveLocale(), {
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
        resources: this.cellValues(event),
      });
      this.openMenu(event.event, null, {
        cellDate: event.cellDate,
        allDay: event.allDay,
        resourceId: event.resourceId,
        resources: this.cellValues(event),
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
        menu.cell.resources,
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
