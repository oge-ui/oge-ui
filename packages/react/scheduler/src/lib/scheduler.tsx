'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from 'react';
import type { OgeFormItemDefinition } from '@oge-ui/react-forms';
import { OgeCalendar } from '@oge-ui/react-inputs';
import { observeDirection, ogeIsRtl } from '@oge-ui/behavior';
import { OgePopup, useAnchoredPanel } from '@oge-ui/react-overlay';
import {
  OgeSchedulerAdaptiveViewController,
  OgeSchedulerCore,
  buildSchedulerEditorItems,
  isSchedulerEditingTarget,
  isTimelineView,
  printOgeScheduler,
  registerOgeSchedulerDropTarget,
  schedulerShortcut,
  scrollOffsetForTime,
  type OgeSchedulerCoreInputs,
  type OgeSchedulerDropSlot,
  type OgeSchedulerView,
  type OgeSchedulerViewOptions,
  type SchedulerEditorModel,
} from '@oge-ui/scheduler-engine';
import {
  SchedulerAppointmentDialog,
  type SchedulerEditorState,
} from './appointment-dialog';
import {
  SchedulerAppointmentPopup,
  type AppointmentPopupHandle,
} from './appointment-popup';
import {
  SchedulerDayWeekView,
  type DayWeekViewHandle,
  type SchedulerViewG3Props,
} from './day-week-view';
import { SchedulerAgendaView, SchedulerYearView } from './list-views';
import { SchedulerMonthView, type MonthViewHandle } from './month-view';
import { SchedulerMorePopup, type MorePopupHandle } from './more-popup';
import { createSchedulerRxAdapter } from './rx-adapter';
import { useOgeSchedulerConfig } from './scheduler-config';
import type { OgeSchedulerHandle, OgeSchedulerProps } from './scheduler-types';
import {
  SchedulerTimelineView,
  type TimelineViewHandle,
} from './timeline-view';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

const DEFAULT_VIEWS: readonly (OgeSchedulerView | OgeSchedulerViewOptions)[] = [
  'day',
  'week',
  'month',
];
const EMPTY: readonly never[] = [];
const CLOSED_EDITOR: SchedulerEditorState = {
  opened: false,
  isNew: false,
  model: null,
  items: [],
};

function OgeSchedulerInner<T extends object>(
  props: OgeSchedulerProps<T>,
  ref: ForwardedRef<OgeSchedulerHandle<T>>,
): ReactElement {
  const config = useOgeSchedulerConfig();
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  // The core reads live props through these refs, so inline objects and
  // callbacks stay current without recreating it.
  const latest = useRef(props);
  latest.current = props;
  const configRef = useRef(config);
  configRef.current = config;
  const mountedRef = useRef(false);

  const hostRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLButtonElement>(null);
  const navigatorRef = useRef<HTMLDivElement>(null);
  const dayWeekRef = useRef<DayWeekViewHandle>(null);
  const monthRef = useRef<MonthViewHandle>(null);
  const timelineRef = useRef<TimelineViewHandle>(null);
  const popupRef = useRef<AppointmentPopupHandle<T>>(null);
  const moreRef = useRef<MorePopupHandle>(null);

  // `currentDate` / `currentView`: controlled when the prop is given,
  // otherwise owned here — seeded at mount, like Angular's model default
  const [innerDate, setInnerDate] = useState<Date>(
    () => props.defaultCurrentDate ?? new Date(),
  );
  const [innerView, setInnerView] = useState<OgeSchedulerView>(
    () => props.defaultCurrentView ?? 'week',
  );
  const [innerSelection, setInnerSelection] = useState<readonly T[]>(
    () => props.defaultSelectedAppointments ?? EMPTY,
  );
  const currentDate = props.currentDate ?? innerDate;
  const currentView = props.currentView ?? innerView;
  const selection = props.selectedAppointments ?? innerSelection;
  const modelRef = useRef({ date: currentDate, view: currentView, selection });
  modelRef.current = { date: currentDate, view: currentView, selection };

  const [editor, setEditor] = useState<SchedulerEditorState>(CLOSED_EDITOR);

  const model = useMemo(() => {
    // writes before mount (the first-paint seeding below) need no re-render
    const rx = createSchedulerRxAdapter(() => {
      if (mountedRef.current) rerender();
    });
    const p = () => latest.current;
    const inputs: OgeSchedulerCoreInputs<T> = {
      dataSource: () => p().dataSource ?? null,
      keyExpr: () => p().keyExpr,
      textExpr: () => p().textExpr ?? 'text',
      startDateExpr: () => p().startDateExpr ?? 'startDate',
      endDateExpr: () => p().endDateExpr ?? 'endDate',
      allDayExpr: () => p().allDayExpr ?? 'allDay',
      colorExpr: () => p().colorExpr ?? 'color',
      locationExpr: () => p().locationExpr ?? 'location',
      descriptionExpr: () => p().descriptionExpr ?? 'description',
      recurrenceRuleExpr: () => p().recurrenceRuleExpr ?? 'recurrenceRule',
      recurrenceExceptionExpr: () =>
        p().recurrenceExceptionExpr ?? 'recurrenceException',
      disabledExpr: () => p().disabledExpr ?? 'disabled',
      reminderExpr: () => p().reminderExpr ?? 'reminder',
      currentDate: () => modelRef.current.date,
      currentView: () => modelRef.current.view,
      views: () => p().views ?? DEFAULT_VIEWS,
      firstDayOfWeek: () => p().firstDayOfWeek,
      weekendDays: () => p().weekendDays,
      dayStartHour: () => p().dayStartHour ?? 0,
      dayEndHour: () => p().dayEndHour ?? 24,
      cellDuration: () => p().cellDuration ?? 30,
      agendaDuration: () => p().agendaDuration ?? 7,
      resources: () => p().resources ?? EMPTY,
      groups: () => p().groups ?? EMPTY,
      locale: () => p().locale,
      messages: () => p().messages,
      allowAdding: () => p().allowAdding ?? true,
      allowUpdating: () => p().allowUpdating ?? true,
      allowDeleting: () => p().allowDeleting ?? true,
      allowDragging: () => p().allowDragging ?? true,
      allowResizing: () => p().allowResizing ?? true,
      readOnly: () => p().readOnly ?? false,
      recurrenceEditMode: () => p().recurrenceEditMode ?? 'dialog',
      min: () => p().min,
      max: () => p().max,
      dateNavigatorText: () => p().dateNavigatorText,
      groupOrientation: () => p().groupOrientation,
      groupByDate: () => p().groupByDate ?? true,
      disabledSlots: () => p().disabledSlots ?? null,
      workHours: () => p().workHours ?? null,
      snapToWorkHours: () => p().snapToWorkHours ?? false,
      allowOverlap: () => p().allowOverlap ?? true,
      conflictCheck: () => p().conflictCheck,
      selectedAppointments: () => modelRef.current.selection,
      undoLimit: () => p().undoLimit ?? 50,
      moreMode: () => p().moreMode ?? 'popup',
    };
    /** Writes the two-way `currentView` (core pipelines + adaptive switch). */
    const writeView = (view: OgeSchedulerView): void => {
      modelRef.current = { ...modelRef.current, view };
      rx.invalidate();
      if (p().currentView === undefined) setInnerView(view);
      p().onCurrentViewChange?.(view);
    };
    // adaptive view: the host's own width drives the agenda switch
    const adaptive = new OgeSchedulerAdaptiveViewController({
      adaptiveView: () => p().adaptiveView,
      currentView: () => modelRef.current.view,
      setCurrentView: writeView,
    });
    const core: OgeSchedulerCore<T, OgeFormItemDefinition> =
      new OgeSchedulerCore<T, OgeFormItemDefinition>({
        rx,
        inputs,
        config: () => configRef.current,
        setCurrentDate: (date) => {
          modelRef.current = { ...modelRef.current, date };
          rx.invalidate();
          if (p().currentDate === undefined) setInnerDate(date);
          p().onCurrentDateChange?.(date);
        },
        setCurrentView: (view) => writeView(view),
        setSelectedAppointments: (items) => {
          modelRef.current = { ...modelRef.current, selection: items };
          rx.invalidate();
          if (p().selectedAppointments === undefined) setInnerSelection(items);
          p().onSelectedAppointmentsChange?.(items);
        },
        events: {
          appointmentAdding: (event) => p().onAppointmentAdding?.(event),
          appointmentAdded: (event) => p().onAppointmentAdded?.(event),
          appointmentUpdating: (event) => p().onAppointmentUpdating?.(event),
          appointmentUpdated: (event) => p().onAppointmentUpdated?.(event),
          appointmentDeleting: (event) => p().onAppointmentDeleting?.(event),
          appointmentDeleted: (event) => p().onAppointmentDeleted?.(event),
          appointmentClick: (event) => p().onAppointmentClick?.(event),
          appointmentDblClick: (event) => p().onAppointmentDblClick?.(event),
          cellClick: (event) => p().onCellClick?.(event),
          cellDblClick: (event) => p().onCellDblClick?.(event),
          editorShowing: (event) => p().onEditorShowing?.(event),
          rangeSelected: (event) => p().onRangeSelected?.(event),
          appointmentContextMenu: (event) =>
            p().onAppointmentContextMenu?.(event),
          cellContextMenu: (event) => p().onCellContextMenu?.(event),
          reminderTriggered: (event) => p().onReminderTriggered?.(event),
          appointmentDropped: (event) => p().onAppointmentDropped?.(event),
          dragOut: (event) => p().onDragOut?.(event),
        },
        surfaces: {
          hostElement: () => hostRef.current,
          openPopup: (appointment, rect) =>
            popupRef.current?.open(appointment, rect),
          closePopup: () => popupRef.current?.close(),
          editorItems: (editorModel) =>
            buildSchedulerEditorItems(
              core.msg().editor,
              inputs.resources(),
              editorModel,
              core.effectiveLocale(),
            ),
          openEditor: (editorModel, isNew, items) =>
            setEditor({
              opened: true,
              isNew,
              model: { ...editorModel },
              items,
            }),
          closeEditor: () =>
            setEditor((state) =>
              state.opened ? { ...state, opened: false } : state,
            ),
          hostRect: () => hostRef.current?.getBoundingClientRect() ?? null,
          focusMenu: () =>
            setTimeout(() => {
              hostRef.current
                ?.querySelector<HTMLElement>(
                  '.oge-scheduler-menu-item:not(:disabled)',
                )
                ?.focus();
            }),
        },
      });
    // first-paint parity: Angular binds the data inside change detection, so
    // its first frame already shows the appointments — seed the store now
    // rather than in an effect that runs after the paint
    core.bindSource(inputs.dataSource());
    return { rx, core, adaptive };
  }, []);

  // every render starts a new version: props may have changed
  model.rx.invalidate();
  const { core } = model;

  // StrictMode-safe lifetime: cleanup cancels in-flight loads, and the mount
  // side re-binds, so a cleanup → remount cycle revives the same core
  useIsomorphicLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      core.destroy();
    };
  }, [core]);
  useIsomorphicLayoutEffect(() => {
    core.bindSource(props.dataSource ?? null);
  }, [core, props.dataSource]);

  // adaptive view: observe the scheduler's own width (never the window)
  const adaptiveView = model.adaptive;
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    adaptiveView.update(host.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() =>
      adaptiveView.update(host.clientWidth),
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [adaptiveView]);

  // auto direction: read after mount (SSR-safe) and kept current while
  // mounted; an explicit rtlEnabled wins and is written as the host's dir
  const [autoRtl, setAutoRtl] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setAutoRtl(ogeIsRtl(host));
    return observeDirection(host, (direction) =>
      setAutoRtl(direction === 'rtl'),
    );
  }, []);
  const rtl = props.rtlEnabled ?? autoRtl;
  const hostDir =
    props.rtlEnabled === undefined
      ? undefined
      : props.rtlEnabled
        ? 'rtl'
        : 'ltr';

  // reminder ticker: reminderTriggered once per occurrence (24h look-ahead)
  useEffect(() => {
    const timer = setInterval(() => core.checkReminders(), 30_000);
    return () => clearInterval(timer);
  }, [core]);

  // the active view's slot under a viewport point (the drag-in hit test)
  const viewKindRef = useRef<'dayWeek' | 'month' | 'timeline' | 'other'>(
    'dayWeek',
  );
  const dropSlotAt = (
    clientX: number,
    clientY: number,
  ): OgeSchedulerDropSlot | null => {
    switch (viewKindRef.current) {
      case 'dayWeek':
        return dayWeekRef.current?.dropSlotAt(clientX, clientY) ?? null;
      case 'month':
        return monthRef.current?.dropSlotAt(clientX, clientY) ?? null;
      case 'timeline':
        return timelineRef.current?.dropSlotAt(clientX, clientY) ?? null;
      default:
        return null;
    }
  };
  const dropSlotRef = useRef(dropSlotAt);
  dropSlotRef.current = dropSlotAt;

  // drag-in target: external draggables and other schedulers drop here
  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    return registerOgeSchedulerDropTarget({
      element: host,
      resolve: (clientX, clientY) => dropSlotRef.current(clientX, clientY),
      over: (slot, payload) => core.onExternalOver(slot, payload),
      drop: (payload, slot) => core.onExternalDrop(payload, slot),
    });
  }, [core]);

  const navigatorPanel = useAnchoredPanel({
    anchor: () => titleRef.current,
    panel: () => navigatorRef.current,
    placement: () => 'bottom',
  });

  const scrollToTime = (hours: number, minutes = 0): void => {
    const view = dayWeekRef.current;
    const host = hostRef.current;
    if (view === null || host === null) return;
    const body = host.querySelector<HTMLElement>('.oge-scheduler-body');
    const rows = host.querySelector<HTMLElement>('.oge-scheduler-rows');
    if (body === null || rows === null) return;
    const offset = scrollOffsetForTime(
      hours,
      minutes,
      view.grid.windowStartMinutes,
      view.grid.windowEndMinutes,
      rows.scrollHeight,
    );
    if (offset !== null) body.scrollTop = offset;
  };

  // initial scroll position of the time grid (FC scrollTime parity); like
  // the Angular effect it runs at mount and on view/period changes
  const scrollTime = props.scrollTime;
  useEffect(() => {
    if (scrollTime === undefined) return;
    const timer = setTimeout(() =>
      scrollToTime(Math.floor(scrollTime), (scrollTime % 1) * 60),
    );
    return () => clearTimeout(timer);
  }, [scrollTime, currentView, currentDate]);

  useImperativeHandle(ref, (): OgeSchedulerHandle<T> => ({
    focus: () => {
      dayWeekRef.current?.focusGrid();
      monthRef.current?.focusGrid();
    },
    scrollToTime,
    scrollTo: (date) => {
      core.setDate(date);
      scrollToTime(date.getHours(), date.getMinutes());
    },
    showAppointmentPopup: (appointmentData, createNew) =>
      core.showAppointmentPopup(appointmentData, createNew),
    hideAppointmentPopup: () => core.hideAppointmentPopup(),
    addAppointment: (appointmentData) => core.addAppointment(appointmentData),
    updateAppointment: (appointmentData, patch) =>
      core.updateAppointment(appointmentData, patch),
    deleteAppointment: (appointmentData) =>
      core.deleteAppointment(appointmentData),
    getStartViewDate: () => core.getStartViewDate(),
    getEndViewDate: () => core.getEndViewDate(),
    getDataSource: () => latest.current.dataSource ?? null,
    goToday: () => core.goToday(),
    navigate: (direction) => core.navigate(direction),
    copyAppointments: (appointment = null) =>
      core.copyAppointments(appointment),
    pasteAppointments: (target) => core.paste(target),
    clearSelection: () => core.clearSelection(),
    undo: () => core.undo(),
    redo: () => core.redo(),
    canUndo: () => core.canUndo(),
    canRedo: () => core.canRedo(),
    getExportData: (range) => core.getExportData(range),
    print: (options = {}) => {
      const host = hostRef.current;
      return host === null
        ? Promise.resolve()
        : printOgeScheduler(host, {
            title: options.title ?? core.periodTitle(),
          });
    },
  }));

  const msg = core.msg();
  const locale = core.effectiveLocale();
  const firstDayOfWeek = core.resolvedFirstDayOfWeek();
  const resolvedWeekendDays = core.resolvedWeekendDays();
  // stable identity while the days are equal, so the views' memos hold
  const weekendKey = resolvedWeekendDays.join(',');
  const weekendDays = useMemo(() => resolvedWeekendDays, [weekendKey]);
  const activeView = core.activeView();
  const visible = core.visibleAppointments();
  const periodTitle = core.periodTitle();
  const groupLevels = core.groupLevels();
  const groupLeaves = core.groupLeaves();
  const leafOf = core.leafOf();
  const groupOrientation = core.groupOrientation();
  const canAdd = core.canAdd();
  const canUpdate = core.canUpdate();
  const canDelete = core.canDelete();
  const canDrag = core.canDrag();
  const gridReadOnly = core.gridReadOnly();
  const scopePending = core.scopePending();
  const contextMenu = core.contextMenu();
  const notice = core.notice();
  const dropPreview = core.dropPreview();
  const showAddButton = props.showAddButton ?? true;
  const agendaDuration = props.agendaDuration ?? 7;
  const {
    renderAppointment,
    renderCell,
    renderDateHeader,
    renderResourceHeader,
  } = props;
  viewKindRef.current =
    currentView === 'month'
      ? 'month'
      : isTimelineView(currentView)
        ? 'timeline'
        : currentView === 'agenda' || currentView === 'year'
          ? 'other'
          : 'dayWeek';

  const chipHandlers = {
    onChipClicked: core.onChipClicked.bind(core),
    onChipDblClicked: core.onChipDblClicked.bind(core),
    onChipDeleteRequested: core.onDeleteRequested.bind(core),
  };
  const g3: SchedulerViewG3Props<T> = {
    selection,
    dropPreview,
    onCopyRequested: (appointment) => core.copyAppointments(appointment),
    onSelectRequested: (request) =>
      core.selectAppointment(
        request.appointment,
        request.gesture,
        request.order,
      ),
    onDragOut: (appointment, clientX, clientY) =>
      core.onDragOut(appointment, clientX, clientY),
  };

  const renderView = (): ReactElement => {
    if (isTimelineView(currentView)) {
      return (
        <SchedulerTimelineView<T>
          ref={timelineRef}
          key={currentView}
          rtl={rtl}
          view={currentView}
          anchorDate={currentDate}
          appointments={visible}
          firstDayOfWeek={firstDayOfWeek}
          weekendDays={weekendDays}
          hiddenWeekDays={props.hiddenWeekDays}
          dayStartHour={activeView.dayStartHour}
          dayEndHour={activeView.dayEndHour}
          cellDuration={activeView.cellDuration}
          intervalCount={activeView.intervalCount}
          locale={locale}
          messages={msg.grid}
          groupLevels={groupLevels}
          groupLeaves={groupLeaves}
          groupOrientation={groupOrientation}
          allowDragging={canDrag}
          snapDuration={props.snapDuration}
          workHours={props.workHours ?? null}
          disabledSlots={props.disabledSlots ?? null}
          virtualScrolling={props.virtualScrolling ?? 'auto'}
          renderResourceHeader={renderResourceHeader}
          {...chipHandlers}
          {...g3}
          onMoveCommitted={(event) => core.onGroupedMoveCommitted(event)}
          onGestureCancelled={() => core.onGestureCancelled()}
        />
      );
    }
    switch (currentView) {
      case 'agenda':
        return (
          <SchedulerAgendaView<T>
            anchorDate={currentDate}
            agendaDuration={agendaDuration}
            appointments={visible}
            locale={locale}
            messages={msg.grid}
            {...chipHandlers}
          />
        );
      case 'year':
        return (
          <SchedulerYearView<T>
            anchorDate={currentDate}
            appointments={visible}
            firstDayOfWeek={firstDayOfWeek}
            locale={locale}
            onDayPicked={(date) => core.drillIntoDay(date)}
          />
        );
      case 'month':
        return (
          <SchedulerMonthView<T>
            ref={monthRef}
            rtl={rtl}
            anchorDate={currentDate}
            appointments={visible}
            firstDayOfWeek={firstDayOfWeek}
            weekendDays={weekendDays}
            maxAppointmentsPerCell={props.maxAppointmentsPerCell ?? 'auto'}
            intervalCount={activeView.intervalCount}
            locale={locale}
            messages={msg.grid}
            periodLabel={periodTitle}
            allowDragging={canDrag}
            readOnly={gridReadOnly}
            showWeekNumbers={props.showWeekNumbers ?? false}
            weekNumberRule={props.weekNumberRule ?? 'iso'}
            disabledSlots={props.disabledSlots ?? null}
            renderAppointment={renderAppointment}
            renderCell={renderCell}
            onMoreClick={(date, anchor) => {
              core.onMoreRequested(date);
              if (core.moreDay() !== null) moreRef.current?.open(anchor);
            }}
            onCellClicked={(event) => core.onCellClicked(event)}
            onCellDblClicked={(event) => core.onCellDblClicked(event)}
            onCellActivated={(event) => core.onCellActivated(event)}
            onChipActivated={(event) => core.onChipActivated(event)}
            {...chipHandlers}
            {...g3}
            onMoveCommitted={(event) => core.onMoveCommitted(event)}
            onGestureCancelled={() => core.onGestureCancelled()}
            onChipContextMenu={(event) => core.onChipContextMenu(event)}
            onCellContextMenu={(event) => core.onCellContextMenu(event)}
            onPasteRequested={(target) => core.paste(target)}
          />
        );
      default:
        return (
          <SchedulerDayWeekView<T>
            ref={dayWeekRef}
            rtl={rtl}
            view={core.dayWeekView()}
            anchorDate={currentDate}
            appointments={visible}
            firstDayOfWeek={firstDayOfWeek}
            weekendDays={weekendDays}
            dayStartHour={activeView.dayStartHour}
            dayEndHour={activeView.dayEndHour}
            cellDuration={activeView.cellDuration}
            intervalCount={activeView.intervalCount}
            showAllDayPanel={props.showAllDayPanel ?? true}
            showCurrentTimeIndicator={props.showCurrentTimeIndicator ?? true}
            minAppointmentMinutes={core.minAppointmentMinutes()}
            locale={locale}
            messages={msg.grid}
            periodLabel={periodTitle}
            allowDragging={canDrag}
            allowResizing={core.canResize()}
            allowAdding={canAdd}
            readOnly={gridReadOnly}
            hiddenWeekDays={props.hiddenWeekDays}
            workHours={props.workHours ?? null}
            shadeUntilCurrentTime={props.shadeUntilCurrentTime ?? false}
            snapDuration={props.snapDuration}
            groupLevels={groupLevels}
            groupLeaves={groupLeaves}
            leafOf={leafOf}
            groupOrientation={groupOrientation}
            groupByDate={props.groupByDate ?? true}
            showWeekNumbers={props.showWeekNumbers ?? false}
            weekNumberRule={props.weekNumberRule ?? 'iso'}
            disabledSlots={props.disabledSlots ?? null}
            renderAppointment={renderAppointment}
            renderCell={renderCell}
            renderDateHeader={renderDateHeader}
            renderResourceHeader={renderResourceHeader}
            onCellClicked={(event) => core.onCellClicked(event)}
            onCellDblClicked={(event) => core.onCellDblClicked(event)}
            onCellActivated={(event) => core.onCellActivated(event)}
            onChipActivated={(event) => core.onChipActivated(event)}
            {...chipHandlers}
            {...g3}
            onMoveCommitted={(event) => core.onGroupedMoveCommitted(event)}
            onResizeCommitted={(event) => core.onResizeCommitted(event)}
            onGestureCancelled={() => core.onGestureCancelled()}
            onRangeSelected={(event) => core.onRangeSelected(event)}
            onChipContextMenu={(event) => core.onChipContextMenu(event)}
            onCellContextMenu={(event) => core.onCellContextMenu(event)}
            onPasteRequested={(target) => core.paste(target)}
          />
        );
    }
  };

  return (
    <div
      ref={hostRef}
      className={
        props.className ? `oge-scheduler ${props.className}` : 'oge-scheduler'
      }
      dir={hostDir}
      style={props.style}
      onKeyDown={(event) => {
        const shortcut = schedulerShortcut(
          event,
          isSchedulerEditingTarget(event.target),
        );
        if (shortcut !== 'undo' && shortcut !== 'redo') return;
        event.preventDefault();
        core.onShortcut(shortcut);
      }}
    >
      <div
        className="oge-scheduler-toolbar"
        role="toolbar"
        aria-label={msg.toolbar.label}
      >
        <div className="oge-scheduler-nav">
          <button
            type="button"
            className="oge-scheduler-btn"
            disabled={core.isTodayVisible()}
            onClick={() => core.goToday()}
          >
            {msg.toolbar.today}
          </button>
          <button
            type="button"
            className="oge-scheduler-btn oge-scheduler-btn-icon"
            aria-label={msg.toolbar.previous}
            disabled={!core.canNavigate(-1)}
            onClick={() => core.navigate(-1)}
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m10 3.5-4.5 4.5L10 12.5" />
            </svg>
          </button>
          <button
            type="button"
            className="oge-scheduler-btn oge-scheduler-btn-icon"
            aria-label={msg.toolbar.next}
            disabled={!core.canNavigate(1)}
            onClick={() => core.navigate(1)}
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 3.5 4.5 4.5L6 12.5" />
            </svg>
          </button>
          {showAddButton && canAdd && (
            <button
              type="button"
              className="oge-scheduler-btn oge-scheduler-btn-primary oge-scheduler-btn-add"
              onClick={() => core.showAppointmentPopup(undefined, true)}
            >
              <svg
                viewBox="0 0 16 16"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M8 3.5v9M3.5 8h9" />
              </svg>
              {msg.toolbar.newAppointment}
            </button>
          )}
        </div>
        <button
          ref={titleRef}
          type="button"
          className="oge-scheduler-title"
          aria-label={msg.toolbar.dateNavigatorLabel}
          aria-expanded={navigatorPanel.isOpen}
          aria-controls={navigatorPanel.panelId}
          aria-haspopup="dialog"
          onClick={() => navigatorPanel.toggle()}
        >
          <span aria-live="polite">{periodTitle}</span>
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m4 6.5 4 4 4-4" />
          </svg>
        </button>
        {navigatorPanel.isOpen && (
          <OgePopup panel={navigatorPanel}>
            <div className="oge-scheduler-navigator" ref={navigatorRef}>
              <OgeCalendar
                value={currentDate}
                onValueChange={(date) => {
                  core.onNavigatorPicked(date);
                  navigatorPanel.close();
                }}
                firstDayOfWeek={props.firstDayOfWeek}
                min={props.min}
                max={props.max}
                locale={locale}
              />
            </div>
          </OgePopup>
        )}
        <div
          className="oge-scheduler-views"
          role="group"
          aria-label={msg.toolbar.viewSwitcherLabel}
        >
          {core.resolvedViews().map((entry) => (
            <button
              key={entry.index}
              type="button"
              className={
                core.isViewActive(entry)
                  ? 'oge-scheduler-btn oge-scheduler-view-btn oge-scheduler-view-active'
                  : 'oge-scheduler-btn oge-scheduler-view-btn'
              }
              aria-pressed={core.isViewActive(entry)}
              onClick={() => core.setView(entry.type, entry.index)}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </div>

      {notice !== '' && (
        <div className="oge-scheduler-notice" aria-hidden="true">
          {notice}
        </div>
      )}

      {renderView()}

      <SchedulerMorePopup<T>
        ref={moreRef}
        messages={msg.grid}
        locale={locale}
        day={core.moreDay()}
        appointments={core.moreAppointments()}
        onAppointmentPicked={(appointment, rect, event) => {
          core.closeMore();
          core.onChipActivated({ appointment, event, rect });
        }}
        onDayRequested={(day) => core.drillIntoDay(day)}
        onClosed={() => core.closeMore()}
      />
      <SchedulerAppointmentPopup<T>
        ref={popupRef}
        messages={msg.popup}
        locale={locale}
        allowEditing={canUpdate}
        allowDeleting={canDelete}
        onEditRequested={(appointment) => core.openEditorFor(appointment)}
        onDeleteRequested={(appointment) => core.onDeleteRequested(appointment)}
      />
      <SchedulerAppointmentDialog
        state={editor}
        messages={msg.editor}
        locale={locale}
        onModelChange={(next: SchedulerEditorModel) =>
          setEditor((state) => ({ ...state, model: next }))
        }
        onOpenedChange={(opened) =>
          setEditor((state) =>
            state.opened === opened ? state : { ...state, opened },
          )
        }
        onSaved={(result) => core.onEditorSaved(result)}
      />
      {scopePending !== null && (
        <>
          <div
            className="oge-scheduler-scope-backdrop"
            onClick={() => core.cancelScope()}
            aria-hidden="true"
          />
          <div
            className="oge-scheduler-scope"
            role="dialog"
            aria-modal="true"
            aria-label={msg.recurrenceScope.title}
          >
            <div className="oge-scheduler-scope-title">
              {msg.recurrenceScope.title}
            </div>
            <div className="oge-scheduler-scope-text">
              {core.scopeText(scopePending)}
            </div>
            <div className="oge-scheduler-scope-actions">
              <button
                type="button"
                className="oge-scheduler-btn"
                onClick={() => core.cancelScope()}
              >
                {msg.recurrenceScope.cancel}
              </button>
              <button
                type="button"
                className="oge-scheduler-btn"
                onClick={() => core.resolveScope('occurrence')}
              >
                {msg.recurrenceScope.occurrence}
              </button>
              <button
                type="button"
                className="oge-scheduler-btn oge-scheduler-btn-primary"
                onClick={() => core.resolveScope('series')}
              >
                {msg.recurrenceScope.series}
              </button>
            </div>
          </div>
        </>
      )}
      {contextMenu !== null && (
        <>
          {/* click-away surface only; Escape on the focused menu closes too */}
          <div
            className="oge-scheduler-menu-backdrop"
            onClick={() => core.closeMenu()}
            onContextMenu={(event) => {
              event.preventDefault();
              core.closeMenu();
            }}
          />
          <div
            className="oge-scheduler-menu"
            role="menu"
            tabIndex={-1}
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') core.closeMenu();
            }}
          >
            {contextMenu.appointment !== null ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="oge-scheduler-menu-item"
                  disabled={!canUpdate}
                  onClick={() => core.menuEdit()}
                >
                  {msg.menu.edit}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="oge-scheduler-menu-item oge-scheduler-menu-danger"
                  disabled={!canDelete}
                  onClick={() => core.menuDelete()}
                >
                  {msg.menu.deleteAppointment}
                </button>
              </>
            ) : (
              <button
                type="button"
                role="menuitem"
                className="oge-scheduler-menu-item"
                disabled={!canAdd}
                onClick={() => core.menuCreate()}
              >
                {msg.menu.newAppointment}
              </button>
            )}
          </div>
        </>
      )}
      <div className="oge-scheduler-live" aria-live="polite">
        {core.announcement()}
      </div>
    </div>
  );
}

/**
 * Scheduler / event calendar with day, work-week, week, month, agenda,
 * timeline and year views — the React render of the Angular
 * `<oge-scheduler>`, over the same `@oge-ui/scheduler-engine` core (working
 * set, CRUD pipelines, recurrence scope routing, editor mapping, navigation)
 * and the same stylesheet. Commercial (`@oge-ui/react-scheduler`).
 *
 * ```tsx
 * <OgeScheduler
 *   dataSource={appointments}
 *   currentDate={date}
 *   onCurrentDateChange={setDate}
 *   dayStartHour={8}
 *   dayEndHour={19}
 * />
 * ```
 */
export const OgeScheduler = forwardRef(OgeSchedulerInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeSchedulerProps<T> & { ref?: Ref<OgeSchedulerHandle<T>> },
) => ReactElement;
