import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
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
import { observeDirection, ogeIsRtl } from '@oge-ui/behavior';
import type { OgeFormItemData } from '@oge-ui/forms';
import { OgeCalendar } from '@oge-ui/inputs/calendar';
import { OgeAnchoredPanel, OgePopup } from '@oge-ui/overlay';
import {
  OgeSchedulerAdaptiveViewController,
  OgeSchedulerCore,
  isSchedulerEditingTarget,
  isTimelineView,
  printOgeScheduler,
  registerOgeSchedulerDropTarget,
  schedulerShortcut,
  scrollOffsetForTime,
  toSchedulerView,
  type OgeSchedulerAdaptiveView,
  type OgeSchedulerDataSourceInput,
  type OgeSchedulerExportData,
  type OgeSchedulerPrintOptions,
  type ResolvedSchedulerView,
  type SchedulerCellEvent,
  type SchedulerChipEvent,
  type SchedulerEditorResult,
  type SchedulerFieldExpr,
  type SchedulerPasteTarget,
  type SchedulerProposalEvent,
  type SchedulerRangeEvent,
  type SchedulerScopeAction,
  type SchedulerTimelineViewType,
} from '@oge-ui/scheduler-engine';
import type { OgeSchedulerMessages } from '../config';
import { OGE_SCHEDULER_CONFIG } from '../config';
import type {
  OgeSchedulerAppointment,
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
  OgeSchedulerWeekNumberRule,
  OgeSchedulerWorkHours,
} from '../scheduler-types';
import { OgeSchedulerAppointmentDialog } from './appointment-dialog';
import { OgeSchedulerAppointmentPopup } from './appointment-popup';
import {
  OgeSchedulerDayWeekView,
  type SchedulerDragOutRequest,
  type SchedulerSelectRequest,
} from './day-week-view';
import { OgeSchedulerAgendaView } from './agenda-view';
import { OgeSchedulerMorePopup } from './more-popup';
import { OgeSchedulerTimelineView } from './timeline-view';
import { OgeSchedulerYearView } from './year-view';
import { OgeSchedulerMonthView, type SchedulerMoreRequest } from './month-view';
import {
  OgeAppointmentTemplate,
  OgeDateHeaderTemplate,
  OgeResourceHeaderTemplate,
  OgeSchedulerCellTemplate,
} from './scheduler-templates';
import { SIGNAL_ADAPTER } from './signal-adapter';

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
    OgeSchedulerAgendaView,
    OgeSchedulerTimelineView,
    OgeSchedulerYearView,
    OgeSchedulerAppointmentDialog,
    OgeSchedulerAppointmentPopup,
    OgeSchedulerDayWeekView,
    OgeSchedulerMonthView,
    OgeSchedulerMorePopup,
  ],
  host: {
    class: 'oge-scheduler',
    '[attr.dir]': 'hostDir()',
    '[attr.aria-busy]': 'core.loading() || null',
    '(keydown)': 'onHostKeydown($event)',
  },
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
              [value]="viewDate()"
              (valueChange)="onNavigatorPicked($event)"
              [firstDayOfWeek]="firstDayOfWeek()"
              [min]="core.viewMin()"
              [max]="core.viewMax()"
              [locale]="effectiveLocale()"
            />
          </div>
        </oge-popup>
      }
      <div
        class="oge-scheduler-views"
        role="group"
        [attr.aria-label]="msg().toolbar.viewSwitcherLabel"
      >
        @for (entry of resolvedViews(); track entry.index) {
          <button
            type="button"
            class="oge-scheduler-btn oge-scheduler-view-btn"
            [class.oge-scheduler-view-active]="isViewActive(entry)"
            [attr.aria-pressed]="isViewActive(entry)"
            (click)="setView(entry)"
          >
            {{ entry.name }}
          </button>
        }
      </div>
    </div>

    @if (notice(); as text) {
      <div class="oge-scheduler-notice" aria-hidden="true">{{ text }}</div>
    }
    <div
      class="oge-scheduler-load-status"
      role="status"
      [class.oge-scheduler-load-status-active]="loadStatus() !== ''"
      [class.oge-scheduler-load-status-error]="core.loadError()"
    >
      {{ loadStatus() }}
    </div>

    @switch (viewKind()) {
      @case ('agenda') {
        <oge-scheduler-agenda-view
          [anchorDate]="viewDate()"
          [timeZone]="viewTimeZone()"
          [agendaDuration]="agendaDuration()"
          [appointments]="visibleAppointments()"
          [locale]="effectiveLocale()"
          [messages]="msg().grid"
          (chipClicked)="onChipClicked($event)"
          (chipDblClicked)="onChipDblClicked($event)"
          (chipDeleteRequested)="onDeleteRequested($event)"
        />
      }
      @case ('year') {
        <oge-scheduler-year-view
          [anchorDate]="viewDate()"
          [timeZone]="viewTimeZone()"
          [appointments]="visibleAppointments()"
          [firstDayOfWeek]="resolvedFirstDayOfWeek()"
          [locale]="effectiveLocale()"
          [messages]="msg().grid"
          (dayPicked)="drillIntoDay($event)"
        />
      }
      @case ('timeline') {
        <oge-scheduler-timeline-view
          [view]="timelineView()"
          [anchorDate]="viewDate()"
          [timeZone]="viewTimeZone()"
          [appointments]="visibleAppointments()"
          [firstDayOfWeek]="resolvedFirstDayOfWeek()"
          [weekendDays]="resolvedWeekendDays()"
          [hiddenWeekDays]="hiddenWeekDays()"
          [dayStartHour]="activeView().dayStartHour"
          [dayEndHour]="activeView().dayEndHour"
          [cellDuration]="activeView().cellDuration"
          [intervalCount]="activeView().intervalCount"
          [locale]="effectiveLocale()"
          [messages]="msg().grid"
          [groupLevels]="groupLevels()"
          [groupLeaves]="groupLeaves()"
          [groupOrientation]="resolvedGroupOrientation()"
          [allowDragging]="canDrag()"
          [snapDuration]="snapDuration()"
          [rtl]="rtl()"
          [workHours]="workHours()"
          [disabledSlots]="viewDisabledSlots()"
          [selection]="selectedAppointments()"
          [virtualScrolling]="virtualScrolling()"
          [dropPreview]="dropPreview()"
          [resourceHeaderTemplate]="resourceHeaderTemplate() ?? null"
          (chipClicked)="onChipClicked($event)"
          (chipDblClicked)="onChipDblClicked($event)"
          (chipDeleteRequested)="onDeleteRequested($event)"
          (moveCommitted)="onTimelineMoveCommitted($event)"
          (gestureCancelled)="onGestureCancelled()"
          (copyRequested)="copyAppointments($event)"
          (selectRequested)="onSelectRequested($event)"
          (dragOut)="onDragOut($event)"
        />
      }
      @case ('month') {
        <oge-scheduler-month-view
          [anchorDate]="viewDate()"
          [timeZone]="viewTimeZone()"
          [appointments]="visibleAppointments()"
          [firstDayOfWeek]="resolvedFirstDayOfWeek()"
          [weekendDays]="resolvedWeekendDays()"
          [maxAppointmentsPerCell]="maxAppointmentsPerCell()"
          [intervalCount]="activeView().intervalCount"
          [locale]="effectiveLocale()"
          [messages]="msg().grid"
          [periodLabel]="periodTitle()"
          [showWeekNumbers]="showWeekNumbers()"
          [weekNumberRule]="weekNumberRule()"
          [disabledSlots]="viewDisabledSlots()"
          [selection]="selectedAppointments()"
          [dropPreview]="dropPreview()"
          [appointmentTemplate]="appointmentTemplate() ?? null"
          [cellTemplate]="cellTemplate() ?? null"
          (moreClick)="onMoreClick($event)"
          (cellClicked)="onCellClicked($event)"
          (cellDblClicked)="onCellDblClicked($event)"
          (cellActivated)="onCellActivated($event)"
          (chipClicked)="onChipClicked($event)"
          (chipDblClicked)="onChipDblClicked($event)"
          (chipActivated)="onChipActivated($event)"
          (chipDeleteRequested)="onDeleteRequested($event)"
          [allowDragging]="canDrag()"
          [readOnly]="gridReadOnly()"
          [rtl]="rtl()"
          (moveCommitted)="onMoveCommitted($event)"
          (gestureCancelled)="onGestureCancelled()"
          (chipContextMenu)="onChipContextMenu($event)"
          (cellContextMenu)="onCellContextMenu($event)"
          (copyRequested)="copyAppointments($event)"
          (pasteRequested)="pasteAppointments($event)"
          (selectRequested)="onSelectRequested($event)"
          (dragOut)="onDragOut($event)"
        />
      }
      @default {
        <oge-scheduler-day-week-view
          [view]="dayWeekView()"
          [anchorDate]="viewDate()"
          [timeZone]="viewTimeZone()"
          [appointments]="visibleAppointments()"
          [firstDayOfWeek]="resolvedFirstDayOfWeek()"
          [weekendDays]="resolvedWeekendDays()"
          [dayStartHour]="activeView().dayStartHour"
          [dayEndHour]="activeView().dayEndHour"
          [cellDuration]="activeView().cellDuration"
          [intervalCount]="activeView().intervalCount"
          [showAllDayPanel]="showAllDayPanel()"
          [showCurrentTimeIndicator]="showCurrentTimeIndicator()"
          [minAppointmentMinutes]="minAppointmentMinutes()"
          [locale]="effectiveLocale()"
          [messages]="msg().grid"
          [periodLabel]="periodTitle()"
          [appointmentTemplate]="appointmentTemplate() ?? null"
          [cellTemplate]="cellTemplate() ?? null"
          [dateHeaderTemplate]="dateHeaderTemplate() ?? null"
          [resourceHeaderTemplate]="resourceHeaderTemplate() ?? null"
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
          [readOnly]="gridReadOnly()"
          [hiddenWeekDays]="hiddenWeekDays()"
          [workHours]="workHours()"
          [shadeUntilCurrentTime]="shadeUntilCurrentTime()"
          [snapDuration]="snapDuration()"
          [groupLevels]="groupLevels()"
          [groupLeaves]="groupLeaves()"
          [leafOf]="leafOf()"
          [groupOrientation]="resolvedGroupOrientation()"
          [groupByDate]="groupByDate()"
          [showWeekNumbers]="showWeekNumbers()"
          [weekNumberRule]="weekNumberRule()"
          [disabledSlots]="viewDisabledSlots()"
          [selection]="selectedAppointments()"
          [dropPreview]="dropPreview()"
          [rtl]="rtl()"
          (moveCommitted)="onTimelineMoveCommitted($event)"
          (resizeCommitted)="onResizeCommitted($event)"
          (gestureCancelled)="onGestureCancelled()"
          (rangeSelected)="onRangeSelected($event)"
          (chipContextMenu)="onChipContextMenu($event)"
          (cellContextMenu)="onCellContextMenu($event)"
          (copyRequested)="copyAppointments($event)"
          (pasteRequested)="pasteAppointments($event)"
          (selectRequested)="onSelectRequested($event)"
          (dragOut)="onDragOut($event)"
        />
      }
    }

    <oge-scheduler-more-popup
      [messages]="msg().grid"
      [locale]="effectiveLocale()"
      [day]="moreDay()"
      [appointments]="moreAppointments()"
      (appointmentPicked)="onMorePicked($event)"
      (dayRequested)="drillIntoDay($event)"
      (closed)="core.closeMore()"
    />

    <oge-scheduler-appointment-popup
      [messages]="msg().popup"
      [locale]="effectiveLocale()"
      [allowEditing]="canUpdate()"
      [allowDeleting]="canDelete()"
      (editRequested)="openEditorFor($any($event))"
      (deleteRequested)="onDeleteRequested($any($event))"
    />
    <oge-scheduler-appointment-dialog
      [messages]="msg().editor"
      [locale]="effectiveLocale()"
      [resources]="resources()"
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
    @if (contextMenu(); as menu) {
      <!-- click-away surface only; Escape on the focused menu closes too -->
      <!-- eslint-disable @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div
        class="oge-scheduler-menu-backdrop"
        (click)="closeMenu()"
        (contextmenu)="$event.preventDefault(); closeMenu()"
      ></div>
      <!-- eslint-enable @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div
        class="oge-scheduler-menu"
        role="menu"
        tabindex="-1"
        [style.left.px]="menu.x"
        [style.top.px]="menu.y"
        (keydown.escape)="closeMenu()"
      >
        @if (menu.appointment !== null) {
          <button
            type="button"
            role="menuitem"
            class="oge-scheduler-menu-item"
            [disabled]="!canUpdate()"
            (click)="menuEdit()"
          >
            {{ msg().menu.edit }}
          </button>
          <button
            type="button"
            role="menuitem"
            class="oge-scheduler-menu-item oge-scheduler-menu-danger"
            [disabled]="!canDelete()"
            (click)="menuDelete()"
          >
            {{ msg().menu.deleteAppointment }}
          </button>
        } @else {
          <button
            type="button"
            role="menuitem"
            class="oge-scheduler-menu-item"
            [disabled]="!canAdd()"
            (click)="menuCreate()"
          >
            {{ msg().menu.newAppointment }}
          </button>
        }
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

  /**
   * Appointment items: a plain array, any `@oge-ui/core` `DataSource`
   * (loaded once — or per visible range with `remoteFiltering`), or an
   * `OgeSchedulerDataSource` whose `load({ startDate, endDate, resources,
   * signal })` runs per visible range (neighbours prefetched, navigation
   * debounced, ranges cached, stale requests aborted).
   */
  readonly dataSource = input<OgeSchedulerDataSourceInput<T>>(null);
  /**
   * Loads a filtering core `DataSource` per visible range: the scheduler
   * sends a range filter on the date fields (plus every recurring series).
   */
  readonly remoteFiltering = input(false);
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
  /** The item field / getter holding an appointment's start zone (IANA). */
  readonly startTimeZoneExpr =
    input<SchedulerFieldExpr<T, unknown>>('startTimeZone');
  /** The item field / getter holding an appointment's end zone (IANA). */
  readonly endTimeZoneExpr =
    input<SchedulerFieldExpr<T, unknown>>('endTimeZone');
  /**
   * The display zone (IANA, e.g. `'Europe/Istanbul'`); unset = the
   * browser's. Stored dates stay instants — slots, day boundaries (23- and
   * 25-hour days), drags and recurrence follow this zone's clocks.
   */
  readonly timeZone = input<string | undefined>(undefined);
  /** Shows start / end time-zone pickers in the appointment editor. */
  readonly showTimeZoneEditor = input(false);

  /** The anchor date of the visible period (two-way). */
  readonly currentDate = model<Date>(new Date());
  /** The active view (two-way). */
  readonly currentView = model<OgeSchedulerView>('week');

  /** The views offered by the switcher, optionally with per-view overrides. */
  readonly views = input<
    readonly (OgeSchedulerView | OgeSchedulerViewOptions)[]
  >(['day', 'week', 'month']);

  /**
   * Switches the visible view to agenda when the scheduler's **own** width
   * (a `ResizeObserver`, not the window) drops below 600px, and back to the
   * previous view when it grows again — `true`, or
   * `{ breakpoint, view }`. Off (`false`) by default. The switch writes
   * `currentView` like a user pick, on crossings only, so the switcher keeps
   * working at any width.
   */
  readonly adaptiveView = input<OgeSchedulerAdaptiveView>(false);

  /** First day of week (0 = Sunday); `undefined` resolves from the locale. */
  readonly firstDayOfWeek = input<number | undefined>(undefined);
  /**
   * Weekend days (0 = Sunday … 6 = Saturday) the views shade and the
   * `workWeek` view drops; `undefined` resolves from the locale's
   * `Intl.Locale` week data (Friday + Saturday in `he-IL`), falling back to
   * Saturday + Sunday.
   */
  readonly weekendDays = input<readonly number[] | undefined>(undefined);
  readonly dayStartHour = input(0);
  readonly dayEndHour = input(24);
  /** Slot raster in minutes. */
  readonly cellDuration = input(30);
  readonly showAllDayPanel = input(true);
  readonly showCurrentTimeIndicator = input(true);
  /** Month-view lane budget per cell; `'auto'` picks a sensible default. */
  readonly maxAppointmentsPerCell = input<number | 'auto'>('auto');
  /** Days the agenda view lists from the anchor date. */
  readonly agendaDuration = input(7);
  /** Resource kinds appointments can be assigned to. */
  readonly resources = input<readonly OgeSchedulerResource[]>([]);
  /**
   * Resource fields grouping the views, outermost first (`['roomId',
   * 'ownerId']` nests owners inside rooms): day/week columns or row blocks,
   * timeline rows with group header rows.
   */
  readonly groups = input<readonly string[]>([]);
  /**
   * How grouped resources lay out: `'horizontal'` side by side, or
   * `'vertical'` stacked (day/week row blocks; the timeline default). A
   * view option's own `groupOrientation` wins; unset = horizontal for
   * day/week, vertical for the timelines.
   */
  readonly groupOrientation = input<OgeSchedulerGroupOrientation | undefined>(
    undefined,
  );
  /**
   * Horizontal day/week grouping is date-major (`true`, the default — each
   * day split into its resources) or resource-major (`false` — each
   * resource's days side by side).
   */
  readonly groupByDate = input(true);
  /** Shows week numbers in the month rows and the day/week header corner. */
  readonly showWeekNumbers = input(false);
  /** Week numbering: ISO 8601 or the locale's own (first day + minimal days). */
  readonly weekNumberRule = input<OgeSchedulerWeekNumberRule>('iso');
  /**
   * Non-bookable slots — a predicate `(date, resources) => boolean` or a
   * list of (optionally recurring, per-resource) ranges: rendered hatched,
   * refused by create / move / resize / paste / drop and announced.
   */
  readonly disabledSlots = input<OgeSchedulerDisabledSlots | null>(null);
  /**
   * Clamps timed moves, creates and drops into the target's working hours
   * (a resource item's own `workHours` / `workDays`, else `workHours`).
   */
  readonly snapToWorkHours = input(false);
  /** `false` refuses a create / move / resize that overlaps another appointment. */
  readonly allowOverlap = input(true);
  /**
   * Decides overlapping changes: `(appointment, conflicts) => boolean`,
   * `true` lets it land. Wins over `allowOverlap`.
   */
  readonly conflictCheck = input<OgeSchedulerConflictCheck<T> | undefined>(
    undefined,
  );
  /**
   * The selected items (two-way): Ctrl/⌘-click toggles, Shift-click extends,
   * Ctrl+Space / Shift+Space from the keyboard. Ctrl+C copies the selection.
   */
  readonly selectedAppointments = model<readonly T[]>([]);
  /** Undo steps kept for Ctrl+Z / Ctrl+Y (`0` turns undo off). */
  readonly undoLimit = input(50);
  /** What a month "+N more" does: open the day's list, or drill into the day view. */
  readonly moreMode = input<OgeSchedulerMoreMode>('popup');
  /**
   * Timeline row virtualization: `'auto'` (more than 50 rows), `true` or
   * `false`. Rows render at fixed heights, so the window is exact.
   */
  readonly virtualScrolling = input<boolean | 'auto'>('auto');
  readonly reminderExpr = input<SchedulerFieldExpr<T, unknown>>('reminder');
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
  /**
   * Right-to-left layout: day columns, month cells and the timeline run
   * right-to-left, and Left/Right keys and horizontal drags mirror. Unset
   * follows the page (`ogeResolveDirection`, kept current while mounted); an
   * explicit value is also set as `dir` on the host.
   */
  readonly rtlEnabled = input<boolean | undefined>(undefined);
  private readonly autoRtl = signal(false);
  /** The resolved direction every view receives. */
  protected readonly rtl = computed(() => this.rtlEnabled() ?? this.autoRtl());
  protected readonly hostDir = computed(() => {
    const explicit = this.rtlEnabled();
    return explicit === undefined ? null : explicit ? 'rtl' : 'ltr';
  });
  /** Custom period-title formatter for the toolbar date navigator. */
  readonly dateNavigatorText = input<
    ((start: Date, end: Date, view: OgeSchedulerView) => string) | undefined
  >(undefined);

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
  /** An appointment's reminder lead time was reached (checked ~30s). */
  readonly reminderTriggered = output<OgeSchedulerReminderEvent<T>>();
  /**
   * An `[ogeSchedulerDraggable]` item (or another scheduler's appointment)
   * was dropped in; the built item went through `appointmentAdding`.
   */
  readonly appointmentDropped =
    output<OgeSchedulerAppointmentDroppedEvent<T>>();
  /**
   * An appointment was dragged out of the scheduler and released (over
   * another scheduler or anywhere else) — the app decides whether to remove it.
   */
  readonly dragOut = output<OgeSchedulerDragOutEvent<T>>();

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
  protected readonly resourceHeaderTemplate = contentChild(
    OgeResourceHeaderTemplate,
    { descendants: false },
  );

  private readonly popup = viewChild.required(OgeSchedulerAppointmentPopup<T>);
  private readonly dialog = viewChild.required(OgeSchedulerAppointmentDialog);
  private readonly morePopup = viewChild.required(OgeSchedulerMorePopup<T>);
  private readonly dayWeekViewRef = viewChild(OgeSchedulerDayWeekView<T>);
  private readonly monthViewRef = viewChild(OgeSchedulerMonthView<T>);
  private readonly timelineViewRef = viewChild(OgeSchedulerTimelineView<T>);

  /**
   * The shell machine (`@oge-ui/scheduler-engine`, shared with the React
   * scheduler): the working set, the CRUD pipelines, recurrence scope
   * routing, editor mapping, navigation and the context-menu state. This
   * component is the Angular seam over it — inputs in, outputs and surfaces
   * out.
   */
  protected readonly core = new OgeSchedulerCore<T, OgeFormItemData>({
    rx: SIGNAL_ADAPTER,
    inputs: this,
    config: () => this.config,
    setCurrentDate: (date) => this.currentDate.set(date),
    setCurrentView: (view) => this.currentView.set(view),
    setSelectedAppointments: (items) => this.selectedAppointments.set(items),
    events: {
      appointmentAdding: (event) => this.appointmentAdding.emit(event),
      appointmentAdded: (event) => this.appointmentAdded.emit(event),
      appointmentUpdating: (event) => this.appointmentUpdating.emit(event),
      appointmentUpdated: (event) => this.appointmentUpdated.emit(event),
      appointmentDeleting: (event) => this.appointmentDeleting.emit(event),
      appointmentDeleted: (event) => this.appointmentDeleted.emit(event),
      appointmentClick: (event) => this.appointmentClick.emit(event),
      appointmentDblClick: (event) => this.appointmentDblClick.emit(event),
      cellClick: (event) => this.cellClick.emit(event),
      cellDblClick: (event) => this.cellDblClick.emit(event),
      editorShowing: (event) => this.editorShowing.emit(event),
      rangeSelected: (event) => this.rangeSelected.emit(event),
      appointmentContextMenu: (event) =>
        this.appointmentContextMenu.emit(event),
      cellContextMenu: (event) => this.cellContextMenu.emit(event),
      reminderTriggered: (event) => this.reminderTriggered.emit(event),
      appointmentDropped: (event) => this.appointmentDropped.emit(event),
      dragOut: (event) => this.dragOut.emit(event),
    },
    surfaces: {
      hostElement: () => this.hostEl.nativeElement,
      openPopup: (appointment, rect) => this.popup().open(appointment, rect),
      closePopup: () => this.popup().close(),
      editorItems: (editorModel) => this.dialog().defaultItems(editorModel),
      openEditor: (editorModel, isNew, items) =>
        this.dialog().open(editorModel, isNew, items),
      closeEditor: () => this.dialog().close(),
      hostRect: () => this.hostEl.nativeElement.getBoundingClientRect(),
      focusMenu: () =>
        setTimeout(() => {
          this.hostEl.nativeElement
            .querySelector<HTMLElement>(
              '.oge-scheduler-menu-item:not(:disabled)',
            )
            ?.focus();
        }),
    },
  });

  protected readonly msg = this.core.msg;
  protected readonly canAdd = this.core.canAdd;
  protected readonly canUpdate = this.core.canUpdate;
  protected readonly canDelete = this.core.canDelete;
  protected readonly canDrag = this.core.canDrag;
  protected readonly canResize = this.core.canResize;
  protected readonly gridReadOnly = this.core.gridReadOnly;
  protected readonly minAppointmentMinutes = this.core.minAppointmentMinutes;
  protected readonly effectiveLocale = this.core.effectiveLocale;
  protected readonly resolvedFirstDayOfWeek = this.core.resolvedFirstDayOfWeek;
  protected readonly resolvedWeekendDays = this.core.resolvedWeekendDays;
  protected readonly resolvedViews = this.core.resolvedViews;
  protected readonly activeView = this.core.activeView;
  protected readonly dayWeekView = this.core.dayWeekView;
  protected readonly groupResource = this.core.groupResource;
  protected readonly groupResourceIdOf = this.core.groupResourceIdOf;
  protected readonly visibleAppointments = this.core.visibleAppointments;
  protected readonly periodTitle = this.core.periodTitle;
  protected readonly announcement = this.core.announcement;
  protected readonly scopePending = this.core.scopePending;
  protected readonly contextMenu = this.core.contextMenu;
  protected readonly notice = this.core.notice;
  protected readonly groupLevels = this.core.groupLevels;
  protected readonly groupLeaves = this.core.groupLeaves;
  protected readonly leafOf = this.core.leafOf;
  protected readonly resolvedGroupOrientation = this.core.groupOrientation;
  protected readonly moreDay = this.core.moreDay;
  protected readonly moreAppointments = this.core.moreAppointments;
  protected readonly dropPreview = this.core.dropPreview;
  protected readonly viewDate = this.core.viewDate;
  protected readonly viewTimeZone = this.core.viewTimeZone;
  protected readonly viewDisabledSlots = this.core.viewDisabledSlots;
  protected readonly loadStatus = this.core.loadStatus;

  /** Which view component renders the active view. */
  protected readonly viewKind = computed<
    'agenda' | 'year' | 'timeline' | 'month' | 'dayWeek'
  >(() => {
    const view = this.currentView();
    if (view === 'agenda' || view === 'year' || view === 'month') return view;
    return isTimelineView(view) ? 'timeline' : 'dayWeek';
  });

  protected readonly timelineView = computed<SchedulerTimelineViewType>(() => {
    const view = this.currentView();
    return isTimelineView(view) ? view : 'timelineDay';
  });

  constructor() {
    effect(() => {
      const source = this.dataSource();
      untracked(() => this.core.bindSource(source));
    });
    this.destroyRef.onDestroy(() => this.core.destroy());
    // a range-loading source follows the visible period
    effect(() => {
      this.currentView();
      this.viewDate();
      this.agendaDuration();
      this.core.intervalCount();
      this.core.resolvedFirstDayOfWeek();
      this.core.groupLevels();
      untracked(() => this.core.syncRange());
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
    // reminder ticker: fires reminderTriggered once per occurrence when
    // now >= start - reminderMinutes (looking 24h ahead)
    const reminderTimer = setInterval(
      () => untracked(() => this.core.checkReminders()),
      30_000,
    );
    this.destroyRef.onDestroy(() => clearInterval(reminderTimer));
    // adaptive view: the host's own width drives the agenda switch
    const adaptive = new OgeSchedulerAdaptiveViewController({
      adaptiveView: () => untracked(this.adaptiveView),
      currentView: () => untracked(this.currentView),
      setCurrentView: (view) => this.currentView.set(view),
    });
    afterNextRender(() => {
      const host = this.hostEl.nativeElement;
      // auto direction: read after the first render (SSR-safe) and kept
      // current while mounted
      this.autoRtl.set(ogeIsRtl(host));
      const stopDirection = observeDirection(host, (direction) =>
        this.autoRtl.set(direction === 'rtl'),
      );
      this.destroyRef.onDestroy(stopDirection);
      adaptive.update(host.clientWidth);
      // drag-in target: external draggables and other schedulers drop here
      const unregister = registerOgeSchedulerDropTarget({
        element: host,
        resolve: (clientX, clientY) => this.dropSlotAt(clientX, clientY),
        over: (slot, payload) =>
          untracked(() => this.core.onExternalOver(slot, payload)),
        drop: (payload, slot) =>
          untracked(() => this.core.onExternalDrop(payload, slot)),
      });
      this.destroyRef.onDestroy(unregister);
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() =>
        adaptive.update(host.clientWidth),
      );
      observer.observe(host);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
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
    this.core.onNavigatorPicked(date);
    this.navigatorPanel.close();
  }

  /** Whether today falls inside the visible period (disables "Today"). */
  protected isTodayVisible(): boolean {
    return this.core.isTodayVisible();
  }

  /** Whether stepping one period keeps some of `[min, max]` visible. */
  protected canNavigate(direction: -1 | 1): boolean {
    return this.core.canNavigate(direction);
  }

  /** Moves the visible period to today. */
  goToday(): void {
    this.core.goToday();
  }

  /** Steps the visible period backwards (`-1`) or forwards (`1`). */
  navigate(direction: -1 | 1): void {
    untracked(() => this.core.navigate(direction));
  }

  protected drillIntoDay(date: Date): void {
    this.core.drillIntoDay(date);
  }

  /* ---------- interaction plumbing ---------- */

  protected onCellClicked(event: SchedulerCellEvent): void {
    this.core.onCellClicked(event);
  }

  protected onCellDblClicked(event: SchedulerCellEvent): void {
    this.core.onCellDblClicked(event);
  }

  protected onCellActivated(event: SchedulerCellEvent): void {
    this.core.onCellActivated(event);
  }

  protected onChipClicked(event: SchedulerChipEvent<T>): void {
    this.core.onChipClicked(event);
  }

  protected onChipDblClicked(event: SchedulerChipEvent<T>): void {
    this.core.onChipDblClicked(event);
  }

  protected onChipActivated(event: SchedulerChipEvent<T>): void {
    this.core.onChipActivated(event);
  }

  protected scopeText(pending: { action: SchedulerScopeAction }): string {
    return this.core.scopeText(pending);
  }

  protected resolveScope(scope: 'occurrence' | 'series'): void {
    untracked(() => this.core.resolveScope(scope));
  }

  /** Opens the editor for an existing appointment (occurrences route). */
  protected openEditorFor(appointment: OgeSchedulerAppointment<T>): void {
    this.core.openEditorFor(appointment);
  }

  /** Deletes an appointment, routing recurring occurrences by scope. */
  protected onDeleteRequested(appointment: OgeSchedulerAppointment<T>): void {
    this.core.onDeleteRequested(appointment);
  }

  protected onEditorSaved(result: SchedulerEditorResult): void {
    this.core.onEditorSaved(result);
  }

  protected onMoveCommitted(event: SchedulerProposalEvent<T>): void {
    this.core.onMoveCommitted(event);
  }

  protected onResizeCommitted(event: SchedulerProposalEvent<T>): void {
    this.core.onResizeCommitted(event);
  }

  protected onGestureCancelled(): void {
    this.core.onGestureCancelled();
  }

  /** Time-grid / timeline drag commit (resource-aware). */
  protected onTimelineMoveCommitted(event: SchedulerProposalEvent<T>): void {
    this.core.onGroupedMoveCommitted(event);
  }

  protected onRangeSelected(range: SchedulerRangeEvent): void {
    this.core.onRangeSelected(range);
  }

  protected onChipContextMenu(event: SchedulerChipEvent<T>): void {
    this.core.onChipContextMenu(event);
  }

  protected onCellContextMenu(event: SchedulerCellEvent): void {
    this.core.onCellContextMenu(event);
  }

  protected closeMenu(): void {
    this.core.closeMenu();
  }

  protected menuEdit(): void {
    untracked(() => this.core.menuEdit());
  }

  protected menuDelete(): void {
    untracked(() => this.core.menuDelete());
  }

  protected menuCreate(): void {
    untracked(() => this.core.menuCreate());
  }

  /** Deletes the appointment rendered from `item` (guarded + evented). */
  protected deleteBySource(item: T): void {
    this.core.deleteBySource(item);
  }

  /* ---------- G3 plumbing ---------- */

  /** Whether a switcher entry is the active view (`aria-pressed`). */
  protected isViewActive(entry: ResolvedSchedulerView): boolean {
    return this.core.isViewActive(entry);
  }

  /** A switcher press: entries sharing a type are told apart by index. */
  protected setView(entry: ResolvedSchedulerView): void {
    untracked(() => this.core.setView(entry.type, entry.index));
  }

  /** Host-level Ctrl/⌘+Z undo and Ctrl/⌘+Y / Ctrl/⌘+Shift+Z redo. */
  protected onHostKeydown(event: KeyboardEvent): void {
    const shortcut = schedulerShortcut(
      event,
      isSchedulerEditingTarget(event.target),
    );
    if (shortcut !== 'undo' && shortcut !== 'redo') return;
    event.preventDefault();
    untracked(() => this.core.onShortcut(shortcut));
  }

  protected onMoreClick(request: SchedulerMoreRequest): void {
    untracked(() => this.core.onMoreRequested(request.date));
    if (this.core.moreDay() !== null) this.morePopup().open(request.anchor);
  }

  protected onMorePicked(event: {
    appointment: OgeSchedulerAppointment<T>;
    rect: DOMRect;
    event: MouseEvent;
  }): void {
    this.core.closeMore();
    this.core.onChipActivated({
      appointment: event.appointment,
      event: event.event,
      rect: event.rect,
    });
  }

  protected onSelectRequested(request: SchedulerSelectRequest<T>): void {
    untracked(() =>
      this.core.selectAppointment(
        request.appointment,
        request.gesture,
        request.order,
      ),
    );
  }

  protected onDragOut(request: SchedulerDragOutRequest<T>): void {
    untracked(() =>
      this.core.onDragOut(
        request.appointment,
        request.clientX,
        request.clientY,
      ),
    );
  }

  /** The active view's slot under a viewport point (drag-in hit test). */
  private dropSlotAt(clientX: number, clientY: number) {
    switch (this.viewKind()) {
      case 'month':
        return this.monthViewRef()?.dropSlotAt(clientX, clientY) ?? null;
      case 'timeline':
        return this.timelineViewRef()?.dropSlotAt(clientX, clientY) ?? null;
      case 'dayWeek':
        return this.dayWeekViewRef()?.dropSlotAt(clientX, clientY) ?? null;
      default:
        return null;
    }
  }

  /**
   * Copies the selection — or `appointment` when it is not part of it — to
   * the scheduler clipboard (what Ctrl+C on a chip does). Returns the count.
   */
  copyAppointments(
    appointment: OgeSchedulerAppointment<T> | null = null,
  ): number {
    return untracked(() => this.core.copyAppointments(appointment));
  }

  /**
   * Pastes the clipboard so its earliest appointment starts at
   * `target.date` (what Ctrl+V on a cell does), through the guarded insert
   * pipeline, as one undo step. Returns the count pasted.
   */
  pasteAppointments(target: SchedulerPasteTarget): number {
    return untracked(() => this.core.paste(target));
  }

  /** Empties `selectedAppointments`. */
  clearSelection(): void {
    untracked(() => this.core.clearSelection());
  }

  /** Reverts the last scheduler edit (Ctrl+Z); `false` when there is none. */
  undo(): boolean {
    return untracked(() => this.core.undo());
  }

  /** Re-applies the last undone edit (Ctrl+Y); `false` when there is none. */
  redo(): boolean {
    return untracked(() => this.core.redo());
  }

  /** Whether `undo()` has a step to revert. */
  canUndo(): boolean {
    return this.core.canUndo();
  }

  /** Whether `redo()` has a step to re-apply. */
  canRedo(): boolean {
    return this.core.canRedo();
  }

  /**
   * The export model — every appointment (series unexpanded) plus the
   * expanded rows of `range` (default: the visible period) — what the
   * `/export-ical`, `/export-pdf` and `/export-excel` entries consume.
   */
  getExportData(range?: {
    readonly startDate: Date;
    readonly endDate: Date;
  }): OgeSchedulerExportData<T> {
    return untracked(() => this.core.getExportData(range));
  }

  /** Prints the current view (a hidden frame + the browser's print dialog). */
  print(options: OgeSchedulerPrintOptions = {}): Promise<void> {
    return printOgeScheduler(this.hostEl.nativeElement, {
      title: options.title ?? untracked(() => this.periodTitle()),
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
    const offset = scrollOffsetForTime(
      hours,
      minutes,
      grid.windowStartMinutes,
      grid.windowEndMinutes,
      rows.scrollHeight,
    );
    if (offset !== null) body.scrollTop = offset;
  }

  /**
   * Opens the appointment editor: with `createNew` (or no data) a prefilled
   * create form, otherwise the edit form of the given item (dx parity —
   * `showAppointmentPopup` opens the *form*, not the summary popup).
   */
  showAppointmentPopup(appointmentData?: Partial<T>, createNew = false): void {
    untracked(() => this.core.showAppointmentPopup(appointmentData, createNew));
  }

  /** Closes the appointment editor and the summary popup. */
  hideAppointmentPopup(): void {
    this.core.hideAppointmentPopup();
  }

  /**
   * Inserts an appointment programmatically — runs the same cancelable
   * `appointmentAdding` pipeline as interactive creation.
   */
  addAppointment(appointmentData: T): void {
    untracked(() => this.core.addAppointment(appointmentData));
  }

  /** Applies a patch to an existing item through the guarded pipeline. */
  updateAppointment(appointmentData: T, patch: Partial<T>): void {
    untracked(() => this.core.updateAppointment(appointmentData, patch));
  }

  /** Deletes an item through the guarded pipeline. */
  deleteAppointment(appointmentData: T): void {
    untracked(() => this.core.deleteAppointment(appointmentData));
  }

  /** First moment of the visible period. */
  getStartViewDate(): Date {
    return untracked(() => this.core.getStartViewDate());
  }

  /** Exclusive end of the visible period. */
  getEndViewDate(): Date {
    return untracked(() => this.core.getEndViewDate());
  }

  /** The bound data source, as given. */
  getDataSource(): OgeSchedulerDataSourceInput<T> {
    return this.dataSource();
  }

  /**
   * Reloads the data source: a load-once `DataSource` loads again, a range
   * source drops its cache and reloads the visible range.
   */
  reload(): void {
    untracked(() => this.core.reload());
  }

  /** Navigates to `date` and scrolls the time grid to its time of day. */
  scrollTo(date: Date): void {
    const wall = toSchedulerView(date, untracked(this.viewTimeZone));
    this.core.setDate(wall);
    this.scrollToTime(wall.getHours(), wall.getMinutes());
  }
}
