'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type Ref,
} from 'react';
import type { RowKey } from '@oge-ui/core';
import {
  OgeGanttCore,
  type GanttEditorModel,
  type GanttTask,
  type OgeGanttColumn,
  type OgeGanttMessages,
  type OgeGanttResource,
  type OgeGanttScaleType,
  type OgeGanttStripLine,
  type OgeGanttViewMode,
} from '@oge-ui/gantt-engine';
import type { OgeFormItemDefinition } from '@oge-ui/react-forms';
import { useOgeLiveAnnouncer } from '@oge-ui/react-overlay';
import { useOgeGanttConfig } from './gantt-config';
import { GanttTaskDialog, type GanttDialogState } from './gantt-task-dialog';
import type {
  OgeGanttDialogShowingEvent,
  OgeGanttHandle,
  OgeGanttProps,
} from './gantt-types';
import { createGanttRxAdapter } from './rx-adapter';
import { useClientClock } from './use-client-clock';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

// Stable defaults: the core resets its working set when the `tasks` /
// `dependencies` reference changes, so a fresh `[]` per render would wipe
// the undo history on every render.
const NO_ITEMS: readonly never[] = [];
const NO_DATES: readonly Date[] = [];
const NO_RESOURCES: readonly OgeGanttResource[] = [];
const NO_STRIPS: readonly OgeGanttStripLine[] = [];
const NO_MESSAGES: Partial<OgeGanttMessages> = {};
const NO_KEYS: readonly RowKey[] = [];
const DEFAULT_COLUMNS: readonly OgeGanttColumn[] = [
  { field: 'title' },
  { field: 'start' },
  { field: 'end' },
  { field: 'duration' },
];

function OgeGanttInner<
  T extends object = Record<string, unknown>,
  D extends object = Record<string, unknown>,
>(props: OgeGanttProps<T, D>, ref: ForwardedRef<OgeGanttHandle<T, D>>) {
  const config = useOgeGanttConfig();
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  // The core reads live props through these refs, so inline objects and
  // callbacks stay current without recreating it.
  const latest = useRef(props);
  latest.current = props;
  const configRef = useRef(config);
  configRef.current = config;
  const hostRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  // uncontrolled halves of the two models
  const scaleState = useRef<OgeGanttScaleType>(
    props.defaultScaleType ?? 'days',
  );
  const selectedState = useRef<RowKey | null>(
    props.defaultSelectedTaskKey ?? null,
  );
  const selectedKeysState = useRef<readonly RowKey[]>(
    props.defaultSelectedTaskKeys ?? NO_KEYS,
  );
  const baselineState = useRef<number>(props.defaultBaselineIndex ?? 0);
  const viewModeState = useRef<OgeGanttViewMode>(
    props.defaultViewMode ?? 'tasks',
  );

  const [dialog, setDialog] = useState<GanttDialogState | null>(null);
  const [dialogOpened, setDialogOpened] = useState(false);

  const model = useMemo(() => {
    const rx = createGanttRxAdapter(() => rerender());
    const p = () => latest.current;
    const core = new OgeGanttCore<T, D>(
      {
        inputs: {
          tasks: () => (p().tasks ?? NO_ITEMS) as readonly T[],
          dependencies: () => (p().dependencies ?? NO_ITEMS) as readonly D[],
          keyExpr: () => p().keyExpr ?? 'id',
          parentKeyExpr: () => p().parentKeyExpr ?? 'parentId',
          titleExpr: () => p().titleExpr ?? 'title',
          startExpr: () => p().startExpr ?? 'start',
          endExpr: () => p().endExpr ?? 'end',
          progressExpr: () => p().progressExpr ?? 'progress',
          colorExpr: () => p().colorExpr ?? 'color',
          baselineStartExpr: () => p().baselineStartExpr ?? 'baselineStart',
          baselineEndExpr: () => p().baselineEndExpr ?? 'baselineEnd',
          dependencyKeyExpr: () => p().dependencyKeyExpr ?? 'id',
          predecessorKeyExpr: () => p().predecessorKeyExpr ?? 'predecessorId',
          successorKeyExpr: () => p().successorKeyExpr ?? 'successorId',
          dependencyTypeExpr: () => p().dependencyTypeExpr ?? 'type',
          resources: () => p().resources ?? NO_RESOURCES,
          resourceIdExpr: () => p().resourceIdExpr ?? 'resourceId',
          scaleType: () => p().scaleType ?? scaleState.current,
          firstDayOfWeek: () => p().firstDayOfWeek,
          taskListWidth: () => p().taskListWidth ?? 360,
          columns: () => p().columns ?? DEFAULT_COLUMNS,
          taskTitlePosition: () => p().taskTitlePosition ?? 'inside',
          showDependencies: () => p().showDependencies ?? true,
          showCriticalPath: () => p().showCriticalPath ?? false,
          weekendsHighlighted: () => p().weekendsHighlighted ?? true,
          weekendDays: () => p().weekendDays,
          holidays: () => p().holidays ?? NO_DATES,
          workCalendar: () => p().workCalendar ?? null,
          showResourceWorkload: () => p().showResourceWorkload ?? false,
          stripLines: () => p().stripLines ?? NO_STRIPS,
          autoScheduling: () => p().autoScheduling ?? false,
          locale: () => p().locale,
          messages: () => p().messages ?? NO_MESSAGES,
          editingEnabled: () => p().editingEnabled ?? true,
          allowTaskAdding: () => p().allowTaskAdding ?? true,
          allowTaskUpdating: () => p().allowTaskUpdating ?? true,
          allowTaskDeleting: () => p().allowTaskDeleting ?? true,
          allowDependencyAdding: () => p().allowDependencyAdding ?? true,
          allowDependencyDeleting: () => p().allowDependencyDeleting ?? true,
          readOnly: () => p().readOnly ?? false,
          selectedTaskKey: () =>
            p().selectedTaskKey !== undefined
              ? (p().selectedTaskKey ?? null)
              : selectedState.current,
          rtlEnabled: () => p().rtlEnabled,
          config: () => configRef.current,
          manuallyScheduledExpr: () =>
            p().manuallyScheduledExpr ?? 'manuallyScheduled',
          constraintTypeExpr: () => p().constraintTypeExpr ?? 'constraintType',
          constraintDateExpr: () => p().constraintDateExpr ?? 'constraintDate',
          deadlineExpr: () => p().deadlineExpr ?? 'deadline',
          segmentsExpr: () => p().segmentsExpr ?? 'segments',
          baselinesExpr: () => p().baselinesExpr ?? 'baselines',
          unitsExpr: () => p().unitsExpr ?? 'units',
          effortExpr: () => p().effortExpr ?? 'effort',
          dependencyLagExpr: () => p().dependencyLagExpr ?? 'lag',
          dependencyLagUnitExpr: () => p().dependencyLagUnitExpr ?? 'lagUnit',
          projectStart: () => p().projectStart ?? null,
          statusDate: () => p().statusDate ?? null,
          timeZone: () => p().timeZone,
          showProgressLine: () => p().showProgressLine ?? false,
          showRollups: () => p().showRollups ?? false,
          baselineIndex: () => p().baselineIndex ?? baselineState.current,
          zoomPresets: () => p().zoomPresets ?? null,
          effortDriven: () => p().effortDriven ?? false,
          hoursPerDay: () => p().hoursPerDay ?? 8,
          showResourceHistogram: () => p().showResourceHistogram ?? false,
          viewMode: () => p().viewMode ?? viewModeState.current,
          selectionMode: () => p().selectionMode ?? 'single',
          selectedTaskKeys: () =>
            p().selectedTaskKeys ?? selectedKeysState.current,
          inlineEditing: () => p().inlineEditing ?? false,
          allowSorting: () => p().allowSorting ?? false,
          allowColumnResizing: () => p().allowColumnResizing ?? false,
          allowColumnReordering: () => p().allowColumnReordering ?? false,
          filterRow: () => p().filterRow ?? false,
          searchPanel: () => p().searchPanel ?? false,
        },
        events: {
          taskInserting: (event) => p().onTaskInserting?.(event),
          taskInserted: (event) => p().onTaskInserted?.(event),
          taskUpdating: (event) => p().onTaskUpdating?.(event),
          taskUpdated: (event) => p().onTaskUpdated?.(event),
          taskDeleting: (event) => p().onTaskDeleting?.(event),
          taskDeleted: (event) => p().onTaskDeleted?.(event),
          dependencyInserting: (event) => p().onDependencyInserting?.(event),
          dependencyInserted: (event) => p().onDependencyInserted?.(event),
          dependencyDeleting: (event) => p().onDependencyDeleting?.(event),
          dependencyDeleted: (event) => p().onDependencyDeleted?.(event),
          taskClick: (event) => p().onTaskClick?.(event),
          taskDblClick: (event) => p().onTaskDblClick?.(event),
          taskContextMenu: (event) => p().onTaskContextMenu?.(event),
          selectionChanged: (event) => p().onSelectionChanged?.(event),
          // the same object travels on, so a listener's `cancel` / replaced
          // `formItems` reach the core; React items may carry render props
          taskEditDialogShowing: (event) =>
            p().onTaskEditDialogShowing?.(
              event as OgeGanttDialogShowingEvent<T, OgeFormItemDefinition>,
            ),
          scaleTypeChange: (type) => {
            scaleState.current = type;
            rx.invalidate();
            rerender();
            p().onScaleTypeChange?.(type);
          },
          selectedTaskKeyChange: (key) => {
            selectedState.current = key;
            rx.invalidate();
            rerender();
            p().onSelectedTaskKeyChange?.(key);
          },
          selectedTaskKeysChange: (keys) => {
            selectedKeysState.current = keys;
            rx.invalidate();
            rerender();
            p().onSelectedTaskKeysChange?.(keys);
          },
          baselineIndexChange: (index) => {
            baselineState.current = index;
            rx.invalidate();
            rerender();
            p().onBaselineIndexChange?.(index);
          },
          viewModeChange: (mode) => {
            viewModeState.current = mode;
            rx.invalidate();
            rerender();
            p().onViewModeChange?.(mode);
          },
          schedulingConflict: (event) => p().onSchedulingConflict?.(event),
          dependencyUpdating: (event) => p().onDependencyUpdating?.(event),
          dependencyUpdated: (event) => p().onDependencyUpdated?.(event),
          sortChanged: (event) => p().onSortChanged?.(event),
          columnResized: (event) => p().onColumnResized?.(event),
          columnReordered: (event) => p().onColumnReordered?.(event),
        },
        openDialog: (editorModel, isNew, items) => {
          setDialog({
            model: { ...editorModel },
            isNew,
            items: items as readonly OgeFormItemDefinition[],
          });
          setDialogOpened(true);
        },
        hostElement: () => hostRef.current,
        bodyElement: () => bodyRef.current,
        chartScrollElement: () => chartScrollRef.current,
        canvasElement: () => canvasRef.current,
      },
      rx,
    );
    return { rx, core };
  }, []);

  // every render starts a new version: props may have changed
  model.rx.invalidate();
  const { core } = model;

  // --- input sync: the core seeded itself at construction (first paint);
  // these keep it current when the inputs change -------------------------
  const tasks = props.tasks ?? NO_ITEMS;
  const dependencies = props.dependencies ?? NO_ITEMS;
  const taskListWidth = props.taskListWidth ?? 360;
  useIsomorphicLayoutEffect(() => {
    core.resetTasks(tasks as readonly T[]);
  }, [core, tasks]);
  useIsomorphicLayoutEffect(() => {
    core.resetDependencies(dependencies as readonly D[]);
  }, [core, dependencies]);
  useIsomorphicLayoutEffect(() => {
    core.resetListWidth(taskListWidth);
  }, [core, taskListWidth]);
  // the rendered range only widens; a no-op when the data did not move it
  useIsomorphicLayoutEffect(() => {
    core.syncRenderedRange();
  });
  // `onSchedulingConflict` fires when the conflict set changes
  useEffect(() => {
    core.syncConflicts();
  });

  // the core's announcements go through the document's shared live region
  const liveAnnouncer = useOgeLiveAnnouncer();
  const announcement = core.announcement();
  useEffect(() => {
    liveAnnouncer.announce(announcement);
  }, [liveAnnouncer, announcement]);

  // StrictMode-safe lifetime: cleanup tears gestures/timers down, the mount
  // side revives the same instance (docs/ARCHITECTURE.md)
  // direction is read in the browser after mount and observed while `dir`
  // changes; destroy() disconnects the observer
  useEffect(() => {
    core.revive();
    core.connectDirection();
    return () => core.destroy();
  }, [core]);

  useImperativeHandle(
    ref,
    (): OgeGanttHandle<T, D> => ({
      insertTask: (taskData) => core.insertTask(taskData),
      updateTask: (taskData, patch) => core.updateTask(taskData, patch),
      deleteTask: (taskData) => core.deleteTask(taskData),
      insertDependency: (predecessorKey, successorKey, type, options) =>
        core.insertDependency(predecessorKey, successorKey, type, options),
      updateDependency: (dependencyData, patch) =>
        core.updateDependency(dependencyData, patch),
      scheduleProject: () => core.scheduleProject(),
      getTaskSlack: (key) => core.getTaskSlack(key),
      setBaseline: (index) => core.setBaseline(index),
      applyZoomPreset: (index) => core.applyZoomPreset(index),
      sortBy: (field, direction) => core.sortBy(field, direction),
      setFilter: (field, text) => core.setFilter(field, text),
      setSearchText: (text) => core.setSearchText(text),
      clearFilters: () => core.clearFilters(),
      setColumnWidth: (field, width) => core.setColumnWidth(field, width),
      moveColumn: (field, toIndex) => core.moveColumn(field, toIndex),
      editCell: (task, field) =>
        core.beginCellEdit(task as GanttTask<T>, field),
      getSelectedTasks: () => core.getSelectedTasks(),
      selectAll: () => core.selectAll(),
      clearSelection: () => core.clearSelection(),
      deleteTasks: (items) => core.deleteTasks(items),
      indentTasks: (tasks) => core.indentTasks(tasks),
      outdentTasks: (tasks) => core.outdentTasks(tasks),
      deleteDependency: (dependencyData) =>
        core.deleteDependency(dependencyData),
      undo: () => core.undo(),
      redo: () => core.redo(),
      zoomIn: () => core.zoomIn(),
      zoomOut: () => core.zoomOut(),
      zoomToFit: () => core.zoomToFit(),
      scrollToDate: (date) => core.scrollToDate(date),
      expandAll: () => core.expandAll(),
      collapseAll: () => core.collapseAll(),
      expandAllToLevel: (level) => core.expandAllToLevel(level),
      expandToTask: (key) => core.expandToTask(key),
      showTaskDetailsDialog: (taskData) => core.showTaskDetailsDialog(taskData),
      indentTask: (task) => core.indentTask(task),
      outdentTask: (task) => core.outdentTask(task),
      focus: () => core.focus(),
      getExportData: () => core.getExportData(),
    }),
    [core],
  );

  const msg = core.msg();
  const editing = core.effectiveEditing();
  const allowTaskAdding = props.allowTaskAdding ?? true;
  const allowTaskUpdating = props.allowTaskUpdating ?? true;
  const allowTaskDeleting = props.allowTaskDeleting ?? true;
  const allowDependencyAdding = props.allowDependencyAdding ?? true;
  const allowDependencyDeleting = props.allowDependencyDeleting ?? true;
  const showRowLines = props.showRowLines ?? true;
  const titlePosition = props.taskTitlePosition ?? 'inside';
  const filterRow = props.filterRow ?? false;
  const allowColumnResizing = props.allowColumnResizing ?? false;
  const rowHeight = core.rowHeight();
  const scale = core.scale();
  const headerInteractive = core.headerInteractive();
  const editingCell = core.editingCell();
  const depEditor = core.dependencyEditor();
  const progressLine = core.progressLine();
  const histogramRows = core.histogramRows();
  const zoomOptions = core.zoomOptions();
  const activeZoom = core.activeZoomIndex();
  const baselineCount = core.baselineCount();
  const activeBaseline = core.activeBaseline();
  const frozenStyle = (column: {
    frozen: boolean;
    frozenOffsetPx: number;
    widthPx: number;
  }): CSSProperties => ({
    width: column.widthPx,
    insetInlineStart: column.frozen ? column.frozenOffsetPx : undefined,
  });
  const visible = core.visibleTasks();
  const windowTasks = core.windowTasks();
  const columns = core.resolvedColumns();
  const rovingKey = core.rovingKey();
  const hoverKey = core.hoverKey();
  const totalHeight = core.rowCount() * rowHeight;
  // clock-dependent: kept out of the hydration render (use-client-clock.ts)
  const clientClock = useClientClock();
  const todayPx = clientClock ? core.todayPx() : null;
  const linkPreview = core.linkPreview();
  const drawPreview = core.drawPreview();
  const dragTip = core.dragTip();
  const tooltipBar = core.tooltipBar();
  const workloadRows = core.workloadRows();
  const menu = core.contextMenu();
  const menuState = core.menuState();

  const layoutStyle = {
    '--oge-gantt-list-width': `${core.listWidth()}px`,
    '--oge-gantt-row-height': `${rowHeight}px`,
  } as CSSProperties;

  const addIcon = (
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
  );

  return (
    <div
      ref={hostRef}
      className={[
        'oge-gantt',
        core.rtl() ? 'oge-gantt-rtl' : '',
        props.className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={props.style}
      dir={
        props.rtlEnabled === undefined
          ? undefined
          : props.rtlEnabled
            ? 'rtl'
            : 'ltr'
      }
    >
      <div
        className="oge-gantt-toolbar"
        role="toolbar"
        aria-label={msg.toolbar.label}
      >
        {editing && allowTaskAdding ? (
          <button
            type="button"
            className="oge-gantt-btn oge-gantt-btn-primary oge-gantt-btn-add"
            onClick={() => core.showTaskDetailsDialog()}
          >
            {addIcon}
            {msg.toolbar.addTask}
          </button>
        ) : null}
        <div className="oge-gantt-toolbar-group">
          <button
            type="button"
            className="oge-gantt-btn oge-gantt-btn-icon"
            aria-label={msg.toolbar.zoomOut}
            disabled={!core.canZoom(1)}
            onClick={() => core.zoomOut()}
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3M5 7h4" />
            </svg>
          </button>
          <button
            type="button"
            className="oge-gantt-btn oge-gantt-btn-icon"
            aria-label={msg.toolbar.zoomIn}
            disabled={!core.canZoom(-1)}
            onClick={() => core.zoomIn()}
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3M5 7h4M7 5v4" />
            </svg>
          </button>
          <button
            type="button"
            className="oge-gantt-btn"
            onClick={() => core.zoomToFit()}
          >
            {msg.toolbar.zoomToFit}
          </button>
          <button
            type="button"
            className="oge-gantt-btn"
            onClick={() => core.goToday()}
          >
            {msg.toolbar.today}
          </button>
        </div>
        <select
          className="oge-gantt-select"
          aria-label={msg.toolbar.scale}
          value={activeZoom}
          onChange={(event) => core.applyZoomPreset(Number(event.target.value))}
        >
          {activeZoom < 0 ? (
            <option value={-1} disabled>
              —
            </option>
          ) : null}
          {zoomOptions.map((option) => (
            <option key={option.index} value={option.index}>
              {option.label}
            </option>
          ))}
        </select>
        {baselineCount > 1 ? (
          <select
            className="oge-gantt-select"
            aria-label={msg.toolbar.baseline}
            value={activeBaseline < 0 ? -1 : activeBaseline}
            onChange={(event) =>
              core.setBaselineIndex(Number(event.target.value))
            }
          >
            <option value={-1}>{msg.grid.baselineNone}</option>
            {Array.from({ length: baselineCount }, (_, index) => (
              <option key={index} value={index}>
                {msg.grid.baselineOption.replace('{index}', String(index + 1))}
              </option>
            ))}
          </select>
        ) : null}
        {(props.resources ?? NO_RESOURCES).length > 0 ? (
          <button
            type="button"
            className="oge-gantt-btn oge-gantt-btn-toggle"
            aria-pressed={core.viewMode() === 'resources'}
            onClick={() => core.toggleViewMode()}
          >
            {msg.toolbar.resourceView}
          </button>
        ) : null}
        {props.searchPanel ? (
          <input
            type="search"
            className="oge-gantt-search"
            aria-label={msg.toolbar.search}
            placeholder={msg.toolbar.search}
            value={core.searchText()}
            onChange={(event) => core.setSearchText(event.target.value)}
          />
        ) : null}
        <div className="oge-gantt-toolbar-group">
          <button
            type="button"
            className="oge-gantt-btn"
            onClick={() => core.expandAll()}
          >
            {msg.toolbar.expandAll}
          </button>
          <button
            type="button"
            className="oge-gantt-btn"
            onClick={() => core.collapseAll()}
          >
            {msg.toolbar.collapseAll}
          </button>
        </div>
        {editing ? (
          <div className="oge-gantt-toolbar-group">
            <button
              type="button"
              className="oge-gantt-btn oge-gantt-btn-icon"
              aria-label={msg.toolbar.undo}
              disabled={!core.canUndo()}
              onClick={() => core.undo()}
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
                <path d="M6.5 3.5 3 7l3.5 3.5M3 7h7a3 3 0 0 1 0 6H8" />
              </svg>
            </button>
            <button
              type="button"
              className="oge-gantt-btn oge-gantt-btn-icon"
              aria-label={msg.toolbar.redo}
              disabled={!core.canRedo()}
              onClick={() => core.redo()}
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
                <path d="M9.5 3.5 13 7l-3.5 3.5M13 7H6a3 3 0 0 0 0 6h2" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      <div
        className="oge-gantt-body"
        ref={bodyRef}
        onScroll={() => core.onBodyScroll()}
      >
        {visible.length === 0 ? (
          <div className="oge-gantt-empty">
            <svg
              viewBox="0 0 48 48"
              width="44"
              height="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="6" y="10" width="24" height="7" rx="3.5" />
              <rect x="14" y="21" width="28" height="7" rx="3.5" />
              <rect x="10" y="32" width="18" height="7" rx="3.5" />
            </svg>
            <div className="oge-gantt-empty-title">{msg.grid.noTasks}</div>
            <div className="oge-gantt-empty-hint">{msg.grid.noTasksHint}</div>
            {editing && allowTaskAdding ? (
              <button
                type="button"
                className="oge-gantt-btn oge-gantt-btn-primary"
                onClick={() => core.showTaskDetailsDialog()}
              >
                {msg.toolbar.addTask}
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="oge-gantt-layout" style={layoutStyle}>
          {/* ======== task list pane ======== */}
          {/* delegated keydown; focus lives on the roving row */}
          <div
            className="oge-gantt-pane"
            role="treegrid"
            aria-label={core.paneAriaLabel()}
            aria-rowcount={core.rowCount()}
            aria-multiselectable={
              core.selectionMode() === 'multiple' ? true : undefined
            }
            onKeyDown={(event) => core.onPaneKeydown(event)}
          >
            <div
              className={
                filterRow
                  ? 'oge-gantt-pane-head oge-gantt-pane-head-filter'
                  : 'oge-gantt-pane-head'
              }
            >
              <div className="oge-gantt-pane-header" role="row">
                {columns.map((column, colIndex) =>
                  headerInteractive ? (
                    <div
                      key={column.field}
                      className={[
                        'oge-gantt-pane-headcell oge-gantt-headcell-interactive',
                        column.frozen ? 'oge-gantt-frozen' : '',
                        column.sortable ? 'oge-gantt-sortable' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      role="columnheader"
                      style={frozenStyle(column)}
                      aria-sort={column.sortDirection ?? undefined}
                      aria-keyshortcuts={core.headerShortcuts() ?? undefined}
                      data-col-index={colIndex}
                      tabIndex={colIndex === core.headerFocusIndex() ? 0 : -1}
                      onClick={() => core.onHeaderClick(column, colIndex)}
                      onKeyDown={(event) =>
                        core.onHeaderKeydown(colIndex, event)
                      }
                      onPointerDown={(event) =>
                        core.onHeaderPointerDown(column, event)
                      }
                    >
                      <span className="oge-gantt-headcell-text">
                        {column.header}
                      </span>
                      {column.sortDirection ? (
                        <svg
                          className={
                            column.sortDirection === 'descending'
                              ? 'oge-gantt-sort-icon oge-gantt-sort-desc'
                              : 'oge-gantt-sort-icon'
                          }
                          viewBox="0 0 16 16"
                          width="11"
                          height="11"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M8 12.5v-9M4.5 7 8 3.5 11.5 7" />
                        </svg>
                      ) : null}
                      {allowColumnResizing ? (
                        <span
                          className="oge-gantt-col-resize"
                          aria-hidden="true"
                          onPointerDown={(event) =>
                            core.onColumnResizePointerDown(column, event)
                          }
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div
                      key={column.field}
                      className={
                        column.frozen
                          ? 'oge-gantt-pane-headcell oge-gantt-frozen'
                          : 'oge-gantt-pane-headcell'
                      }
                      role="columnheader"
                      style={frozenStyle(column)}
                    >
                      {column.header}
                    </div>
                  ),
                )}
              </div>
              {filterRow ? (
                <div className="oge-gantt-filter-row" role="row">
                  {columns.map((column) => (
                    <div
                      key={column.field}
                      className={
                        column.frozen
                          ? 'oge-gantt-filter-cell oge-gantt-frozen'
                          : 'oge-gantt-filter-cell'
                      }
                      role="gridcell"
                      style={frozenStyle(column)}
                    >
                      <input
                        type="text"
                        className="oge-gantt-filter-input"
                        aria-label={core.filterLabel(column)}
                        value={core.filters()[column.field] ?? ''}
                        onChange={(event) =>
                          core.setFilter(column.field, event.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div style={{ height: core.windowTopPx() }} aria-hidden="true" />
            {windowTasks.map((task) => {
              const selected = core.isSelected(task);
              const roving = task.key === rovingKey;
              return (
                <div
                  key={String(task.key)}
                  className={[
                    'oge-gantt-row',
                    selected ? 'oge-gantt-row-selected' : '',
                    core.isGroupRow(task) ? 'oge-gantt-row-group' : '',
                    task.key === hoverKey ? 'oge-gantt-row-hover' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="row"
                  aria-level={task.level + 1}
                  aria-expanded={task.hasChildren ? task.expanded : undefined}
                  aria-selected={selected}
                  aria-rowindex={core.rowIndexOf(task) + 1}
                  aria-label={core.taskAriaLabel(task)}
                  tabIndex={roving ? 0 : -1}
                  data-focus-target={roving ? '' : undefined}
                  onClick={(event) => core.onRowClick(task, event.nativeEvent)}
                  onDoubleClick={(event) =>
                    core.onRowDblClick(task, event.nativeEvent)
                  }
                  onContextMenu={(event) =>
                    core.onRowContextMenu(task, event.nativeEvent)
                  }
                  onMouseEnter={() => core.hoverKey.set(task.key)}
                  onMouseLeave={() => core.hoverKey.set(null)}
                  onKeyDown={(event) => core.onRowKeydown(task, event)}
                >
                  {columns.map((column, colIndex) => (
                    <div
                      key={column.field}
                      className={[
                        'oge-gantt-pane-cell',
                        column.frozen ? 'oge-gantt-frozen' : '',
                        editingCell !== null &&
                        editingCell.key === task.key &&
                        editingCell.field === column.field
                          ? 'oge-gantt-cell-editing'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      role="gridcell"
                      style={frozenStyle(column)}
                      onDoubleClick={(event) =>
                        core.onCellDblClick(task, column.field, event)
                      }
                    >
                      {colIndex === 0 ? (
                        <>
                          <span
                            className="oge-gantt-indent"
                            style={{ width: task.level * 18 }}
                            aria-hidden="true"
                          />
                          {task.hasChildren ? (
                            <span
                              className={
                                task.expanded
                                  ? 'oge-gantt-toggle oge-gantt-toggle-open'
                                  : 'oge-gantt-toggle'
                              }
                              aria-hidden="true"
                              onClick={(event) =>
                                core.toggleExpanded(task, event)
                              }
                            >
                              <svg
                                viewBox="0 0 16 16"
                                width="11"
                                height="11"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m6 3.5 4.5 4.5L6 12.5" />
                              </svg>
                            </span>
                          ) : (
                            <span
                              className="oge-gantt-toggle-spacer"
                              aria-hidden="true"
                            />
                          )}
                        </>
                      ) : null}
                      {editingCell !== null &&
                      editingCell.key === task.key &&
                      editingCell.field === column.field ? (
                        <NativeCellEditor
                          type={core.editorInputType(editingCell.editor)}
                          value={editingCell.value}
                          label={core.cellEditorLabel(task, column)}
                          onInput={(value) => core.cellEditInput(value)}
                          onKeyDown={(event) => core.onCellEditorKeydown(event)}
                          onBlur={() =>
                            core.onCellEditorBlur(task.key, column.field)
                          }
                        />
                      ) : (
                        <span className="oge-gantt-cell-text">
                          {core.cellText(task, column)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
            <div style={{ height: core.windowBottomPx() }} aria-hidden="true" />
          </div>

          {/* ======== splitter ======== */}
          <div
            className="oge-gantt-splitter"
            role="separator"
            aria-orientation="vertical"
            aria-valuemin={160}
            aria-valuemax={720}
            aria-valuenow={core.listWidth()}
            tabIndex={-1}
            onPointerDown={(event) => core.onSplitterPointerDown(event)}
          />

          {/* ======== chart ======== */}
          <div
            className="oge-gantt-chart-scroll"
            ref={chartScrollRef}
            role="group"
            aria-label={msg.grid.chartLabel}
            tabIndex={0}
          >
            <div className="oge-gantt-chart" style={{ width: scale.totalPx }}>
              <div className="oge-gantt-scale" role="presentation">
                <div className="oge-gantt-scale-major">
                  {scale.majorTicks.map((tick) => (
                    <span
                      key={tick.px}
                      className="oge-gantt-scale-cell"
                      style={{ insetInlineStart: tick.px, width: tick.widthPx }}
                    >
                      {core.majorLabel(tick.date)}
                    </span>
                  ))}
                </div>
                <div className="oge-gantt-scale-minor">
                  {scale.ticks.map((tick) => (
                    <span
                      key={tick.px}
                      className="oge-gantt-scale-cell"
                      style={{ insetInlineStart: tick.px, width: tick.widthPx }}
                    >
                      {core.minorLabel(tick.date)}
                    </span>
                  ))}
                </div>
              </div>
              <div
                className="oge-gantt-canvas"
                ref={canvasRef}
                style={{ height: totalHeight }}
                onDoubleClick={(event) => core.onCanvasDblClick(event)}
                onPointerDown={(event) => core.onCanvasPointerDown(event)}
                onContextMenu={(event) =>
                  core.onCanvasContextMenu(event.nativeEvent)
                }
              >
                {core.shadedTicks().map((shade) => (
                  <div
                    key={shade.px}
                    className="oge-gantt-offday"
                    style={{ insetInlineStart: shade.px, width: shade.widthPx }}
                    aria-hidden="true"
                  />
                ))}
                {core.stripRects().map((strip) => (
                  <div
                    key={strip.px}
                    className={
                      strip.widthPx === 0
                        ? 'oge-gantt-strip oge-gantt-strip-line'
                        : 'oge-gantt-strip'
                    }
                    style={{
                      insetInlineStart: strip.px,
                      width: strip.widthPx || 2,
                      backgroundColor: strip.color,
                    }}
                    aria-hidden="true"
                  >
                    {strip.label ? (
                      <span className="oge-gantt-strip-label">
                        {strip.label}
                      </span>
                    ) : null}
                  </div>
                ))}
                {todayPx !== null ? (
                  <div
                    className="oge-gantt-today"
                    style={{ insetInlineStart: todayPx }}
                    title={msg.grid.todayLabel}
                    aria-hidden="true"
                  />
                ) : null}
                {showRowLines
                  ? windowTasks.map((task) => (
                      <div
                        key={String(task.key)}
                        className="oge-gantt-rowline"
                        style={{ top: (core.rowIndexOf(task) + 1) * rowHeight }}
                        aria-hidden="true"
                      />
                    ))
                  : null}
                {windowTasks.map((task) => (
                  <div
                    key={String(task.key)}
                    className={[
                      'oge-gantt-lane',
                      core.isSelected(task) ? 'oge-gantt-row-selected' : '',
                      task.key === hoverKey ? 'oge-gantt-row-hover' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      top: core.rowIndexOf(task) * rowHeight,
                      height: rowHeight,
                    }}
                    onMouseEnter={() => core.hoverKey.set(task.key)}
                    onMouseLeave={() => core.hoverKey.set(null)}
                  />
                ))}
                <svg
                  className="oge-gantt-arrows"
                  height={totalHeight}
                  width={scale.totalPx}
                  aria-hidden="true"
                >
                  {/* logical x; RTL mirrors the whole group (x' = width - x) */}
                  <g transform={core.arrowsTransform() ?? undefined}>
                    {core.windowArrows().map((arrow) => (
                      <path
                        key={String(arrow.dependency.key)}
                        className={[
                          'oge-gantt-arrow',
                          arrow.critical ? 'oge-gantt-arrow-critical' : '',
                          arrow.dependency.key === core.selectedDependencyKey()
                            ? 'oge-gantt-arrow-selected'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        d={arrow.path}
                        onClick={(event) =>
                          core.onArrowClick(arrow.dependency, event)
                        }
                        onDoubleClick={(event) =>
                          core.onArrowDblClick(arrow.dependency, event)
                        }
                      />
                    ))}
                    {progressLine !== null ? (
                      <path
                        className="oge-gantt-progress-line"
                        d={progressLine.path}
                      />
                    ) : null}
                    {linkPreview !== null ? (
                      <path
                        className={
                          linkPreview.valid
                            ? 'oge-gantt-arrow oge-gantt-arrow-preview'
                            : 'oge-gantt-arrow oge-gantt-arrow-preview oge-gantt-arrow-invalid'
                        }
                        d={linkPreview.path}
                      />
                    ) : null}
                  </g>
                </svg>
                {core.windowArrows().map((arrow) =>
                  arrow.label !== null ? (
                    <span
                      key={String(arrow.dependency.key)}
                      className="oge-gantt-arrow-label"
                      style={{
                        insetInlineStart: arrow.labelX,
                        top: arrow.labelY,
                      }}
                      aria-hidden="true"
                    >
                      {arrow.label}
                    </span>
                  ) : null,
                )}
                {progressLine !== null ? (
                  <div
                    className="oge-gantt-status-date"
                    style={{ insetInlineStart: progressLine.statusPx }}
                    title={msg.scheduling.statusDate}
                    aria-hidden="true"
                  />
                ) : null}
                {core.windowBars().map((bar) => {
                  const task = bar.task;
                  const resource = core.resourceText(task);
                  return (
                    <div
                      key={String(task.key)}
                      className={[
                        'oge-gantt-bar-box',
                        core.isSelected(task)
                          ? 'oge-gantt-bar-box-selected'
                          : '',
                        bar.conflict ? 'oge-gantt-bar-box-conflict' : '',
                        bar.overdue ? 'oge-gantt-bar-box-overdue' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ top: bar.index * rowHeight, height: rowHeight }}
                    >
                      {bar.deadlinePx !== null ? (
                        <div
                          className={
                            bar.overdue
                              ? 'oge-gantt-deadline oge-gantt-deadline-missed'
                              : 'oge-gantt-deadline'
                          }
                          style={{ insetInlineStart: bar.deadlinePx }}
                          title={core.deadlineTitle(task)}
                          aria-hidden="true"
                        />
                      ) : null}
                      {bar.constraintPx !== null ? (
                        <div
                          className="oge-gantt-constraint"
                          style={{ insetInlineStart: bar.constraintPx }}
                          aria-hidden="true"
                        />
                      ) : null}
                      {bar.conflict ? (
                        <span
                          className="oge-gantt-conflict-mark"
                          style={{ insetInlineStart: bar.leftPx - 18 }}
                          aria-hidden="true"
                        >
                          !
                        </span>
                      ) : null}
                      {bar.baselineLeftPx !== null ? (
                        <div
                          className="oge-gantt-baseline"
                          style={{
                            insetInlineStart: bar.baselineLeftPx,
                            width: bar.baselineWidthPx ?? undefined,
                          }}
                          aria-hidden="true"
                        />
                      ) : null}
                      {task.isMilestone ? (
                        <div
                          className={
                            bar.critical
                              ? 'oge-gantt-milestone oge-gantt-target oge-gantt-critical'
                              : 'oge-gantt-milestone oge-gantt-target'
                          }
                          style={{
                            insetInlineStart: bar.leftPx - 7,
                            backgroundColor: task.color,
                          }}
                          data-task-key={String(task.key)}
                          onPointerDown={(event) =>
                            core.onBarPointerDown(bar, 'move', event)
                          }
                          onDoubleClick={(event) =>
                            core.onRowDblClick(task, event.nativeEvent)
                          }
                          onMouseEnter={() => core.tooltipKey.set(task.key)}
                          onMouseLeave={() => core.tooltipKey.set(null)}
                        />
                      ) : task.isSummary ? (
                        <>
                          <div
                            className={[
                              'oge-gantt-summary oge-gantt-target',
                              bar.critical ? 'oge-gantt-critical' : '',
                              core.isGroupRow(task)
                                ? 'oge-gantt-summary-group'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            style={{
                              insetInlineStart: bar.leftPx,
                              width: bar.widthPx,
                              backgroundColor: task.color,
                            }}
                            data-task-key={String(task.key)}
                            onMouseEnter={() => core.tooltipKey.set(task.key)}
                            onMouseLeave={() => core.tooltipKey.set(null)}
                          />
                          {bar.rollups.map((rollup) => (
                            <div
                              key={String(rollup.key)}
                              className="oge-gantt-rollup"
                              style={{ insetInlineStart: rollup.px - 5 }}
                              title={rollup.title}
                              aria-hidden="true"
                            />
                          ))}
                        </>
                      ) : (
                        <>
                          <div
                            className={[
                              'oge-gantt-bar oge-gantt-target',
                              bar.critical ? 'oge-gantt-critical' : '',
                              bar.segments.length > 1
                                ? 'oge-gantt-bar-split'
                                : '',
                              bar.manual ? 'oge-gantt-bar-manual' : '',
                              core.dragKey() === task.key
                                ? 'oge-gantt-dragging'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            style={{
                              insetInlineStart: bar.leftPx,
                              width: bar.widthPx,
                              backgroundColor:
                                bar.segments.length > 1
                                  ? undefined
                                  : task.color,
                              color: core.barForeground(task) ?? undefined,
                            }}
                            data-task-key={String(task.key)}
                            onPointerDown={(event) =>
                              core.onBarPointerDown(bar, 'move', event)
                            }
                            onDoubleClick={(event) =>
                              core.onRowDblClick(task, event.nativeEvent)
                            }
                            onMouseEnter={() => core.tooltipKey.set(task.key)}
                            onMouseLeave={() => core.tooltipKey.set(null)}
                          >
                            {bar.segments.length > 1 ? (
                              <>
                                <div
                                  className="oge-gantt-split-link"
                                  aria-hidden="true"
                                />
                                {bar.segments.map((segment) => (
                                  <div
                                    key={segment.offsetPx}
                                    className="oge-gantt-segment"
                                    style={{
                                      insetInlineStart: segment.offsetPx,
                                      width: segment.widthPx,
                                      backgroundColor: task.color,
                                    }}
                                    aria-hidden="true"
                                  >
                                    <div
                                      className="oge-gantt-segment-fill"
                                      style={{ width: segment.fillPx }}
                                    />
                                  </div>
                                ))}
                              </>
                            ) : (
                              <div
                                className="oge-gantt-progress"
                                style={{ width: `${task.progress}%` }}
                                aria-hidden="true"
                              />
                            )}
                            {editing && allowTaskUpdating ? (
                              <>
                                <div
                                  className="oge-gantt-handle oge-gantt-handle-start"
                                  aria-hidden="true"
                                  onPointerDown={(event) =>
                                    core.onBarPointerDown(
                                      bar,
                                      'resize-start',
                                      event,
                                    )
                                  }
                                />
                                <div
                                  className="oge-gantt-handle oge-gantt-handle-end"
                                  aria-hidden="true"
                                  onPointerDown={(event) =>
                                    core.onBarPointerDown(
                                      bar,
                                      'resize-end',
                                      event,
                                    )
                                  }
                                />
                                <div
                                  className="oge-gantt-progress-knob"
                                  style={{
                                    insetInlineStart: `${task.progress}%`,
                                  }}
                                  aria-hidden="true"
                                  onPointerDown={(event) =>
                                    core.onBarPointerDown(
                                      bar,
                                      'progress',
                                      event,
                                    )
                                  }
                                />
                              </>
                            ) : null}
                            {editing && allowDependencyAdding ? (
                              <>
                                <div
                                  className="oge-gantt-link-dot oge-gantt-link-dot-start"
                                  aria-hidden="true"
                                  onPointerDown={(event) =>
                                    core.onLinkPointerDown(bar, false, event)
                                  }
                                />
                                <div
                                  className="oge-gantt-link-dot oge-gantt-link-dot-end"
                                  aria-hidden="true"
                                  onPointerDown={(event) =>
                                    core.onLinkPointerDown(bar, true, event)
                                  }
                                />
                              </>
                            ) : null}
                            {titlePosition === 'inside' ? (
                              <span className="oge-gantt-bar-title">
                                {props.renderTask
                                  ? props.renderTask({ task })
                                  : task.title}
                              </span>
                            ) : null}
                          </div>
                          {titlePosition === 'outside' ? (
                            <span
                              className="oge-gantt-bar-title-outside"
                              style={{
                                insetInlineStart: bar.leftPx + bar.widthPx + 8,
                              }}
                            >
                              {task.title}
                            </span>
                          ) : null}
                        </>
                      )}
                      {resource !== null ? (
                        <span
                          className="oge-gantt-resource"
                          style={{
                            insetInlineStart: core.resourceLabelLeft(bar),
                          }}
                        >
                          {resource}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
                {drawPreview !== null ? (
                  <div
                    className="oge-gantt-draw-preview"
                    style={{
                      insetInlineStart: drawPreview.leftPx,
                      width: drawPreview.widthPx,
                      top: drawPreview.top,
                      height: rowHeight - 12,
                    }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              {dragTip !== null ? (
                <div
                  className="oge-gantt-drag-tip"
                  style={{
                    insetInlineStart: dragTip.x,
                    top: core.dragTipTop(dragTip),
                  }}
                  aria-hidden="true"
                >
                  {dragTip.text}
                </div>
              ) : null}
              {tooltipBar !== null ? (
                <div
                  className={
                    tooltipBar.index < 2
                      ? 'oge-gantt-tooltip oge-gantt-tooltip-below'
                      : 'oge-gantt-tooltip'
                  }
                  style={{
                    insetInlineStart: tooltipBar.leftPx,
                    top: core.tooltipTop(tooltipBar),
                  }}
                  aria-hidden="true"
                >
                  {props.renderTooltip ? (
                    props.renderTooltip({ task: tooltipBar.task })
                  ) : (
                    <>
                      <strong className="oge-gantt-tooltip-title">
                        {tooltipBar.task.title}
                      </strong>
                      <span className="oge-gantt-tooltip-line">
                        {core.tooltipDates(tooltipBar.task)}
                      </span>
                      {!tooltipBar.task.isMilestone ? (
                        <span className="oge-gantt-tooltip-line">
                          {tooltipBar.task.progress}%
                        </span>
                      ) : null}
                      {core.resourceText(tooltipBar.task) !== null ? (
                        <span className="oge-gantt-tooltip-line">
                          {core.resourceText(tooltipBar.task)}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
              {workloadRows.length > 0 ? (
                <div className="oge-gantt-workload" aria-hidden="true">
                  {workloadRows.map((row) => (
                    <div
                      key={String(row.id)}
                      className="oge-gantt-workload-row"
                    >
                      <span className="oge-gantt-workload-label">
                        {row.text}
                      </span>
                      {row.segments.map((segment) => (
                        <div
                          key={segment.px}
                          className={
                            segment.over
                              ? 'oge-gantt-workload-seg oge-gantt-workload-over'
                              : 'oge-gantt-workload-seg'
                          }
                          style={{
                            insetInlineStart: segment.px,
                            width: segment.widthPx,
                            backgroundColor: segment.over
                              ? undefined
                              : row.color,
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
              {histogramRows.length > 0 ? (
                <div
                  className="oge-gantt-histogram"
                  role="group"
                  aria-label={msg.grid.histogramLabel}
                >
                  {histogramRows.map((row) => (
                    <div
                      key={String(row.id)}
                      className="oge-gantt-histogram-row"
                      role="img"
                      aria-label={row.label}
                    >
                      <span
                        className="oge-gantt-histogram-label"
                        aria-hidden="true"
                      >
                        {row.text}
                      </span>
                      <div
                        className="oge-gantt-histogram-capacity"
                        style={{ bottom: `${row.capacityPct}%` }}
                        aria-hidden="true"
                      />
                      {row.cells.map((cell) => (
                        <div
                          key={cell.px}
                          className={
                            cell.over
                              ? 'oge-gantt-histogram-bar oge-gantt-histogram-over'
                              : 'oge-gantt-histogram-bar'
                          }
                          style={{
                            insetInlineStart: cell.px + 2,
                            width: cell.widthPx - 4,
                            height: `${cell.heightPct}%`,
                          }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {depEditor !== null ? (
        <div
          className="oge-gantt-dep-editor"
          role="dialog"
          aria-label={msg.dependencyEditor.title}
          style={{ left: depEditor.x, top: depEditor.y }}
          onKeyDown={(event) => core.onDependencyEditorKeydown(event)}
        >
          <div className="oge-gantt-dep-editor-title" aria-hidden="true">
            {msg.dependencyEditor.title}
          </div>
          <label className="oge-gantt-dep-editor-field">
            <span>{msg.dependencyEditor.typeLabel}</span>
            <select
              className="oge-gantt-select"
              value={depEditor.type}
              onChange={(event) =>
                core.dependencyEditorChange({
                  type: event.target.value as typeof depEditor.type,
                })
              }
            >
              {core.dependencyTypes.map((type) => (
                <option key={type} value={type}>
                  {msg.scheduling.dependencyTypes[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="oge-gantt-dep-editor-field">
            <span>{msg.dependencyEditor.lagLabel}</span>
            <input
              type="number"
              className="oge-gantt-dep-editor-input"
              step="0.5"
              value={depEditor.lag}
              onChange={(event) =>
                core.dependencyEditorChange({ lag: Number(event.target.value) })
              }
            />
          </label>
          <label className="oge-gantt-dep-editor-field">
            <span>{msg.dependencyEditor.unitLabel}</span>
            <select
              className="oge-gantt-select"
              value={depEditor.lagUnit}
              onChange={(event) =>
                core.dependencyEditorChange({
                  lagUnit: event.target.value === 'hours' ? 'hours' : 'days',
                })
              }
            >
              <option value="days">{msg.dependencyEditor.days}</option>
              <option value="hours">{msg.dependencyEditor.hours}</option>
            </select>
          </label>
          <div className="oge-gantt-dep-editor-actions">
            {allowDependencyDeleting ? (
              <button
                type="button"
                className="oge-gantt-btn oge-gantt-btn-danger"
                onClick={() => core.deleteFromDependencyEditor()}
              >
                {msg.dependencyEditor.delete}
              </button>
            ) : null}
            <span className="oge-gantt-dialog-spacer" />
            <button
              type="button"
              className="oge-gantt-btn"
              onClick={() => core.closeDependencyEditor()}
            >
              {msg.dependencyEditor.cancel}
            </button>
            <button
              type="button"
              className="oge-gantt-btn oge-gantt-btn-primary"
              onClick={() => core.saveDependencyEditor()}
            >
              {msg.dependencyEditor.save}
            </button>
          </div>
        </div>
      ) : null}

      <GanttTaskDialog
        state={dialog}
        opened={dialogOpened}
        messages={msg.dialog}
        allowDeleting={editing && allowTaskDeleting}
        onModelChange={(next: GanttEditorModel) =>
          setDialog((current) =>
            current === null ? null : { ...current, model: next },
          )
        }
        onSave={() => {
          const current = dialog;
          setDialogOpened(false);
          if (current !== null) {
            core.onDialogSaved({ model: current.model, isNew: current.isNew });
          }
        }}
        onDelete={() => {
          setDialogOpened(false);
          core.onDialogDelete();
        }}
        onClose={() => setDialogOpened(false)}
      />
      {menu !== null ? (
        <>
          {/* click-away surface only; Escape on the focused menu closes too */}
          <div
            className="oge-gantt-menu-backdrop"
            onClick={() => core.closeMenu()}
            onContextMenu={(event) => {
              event.preventDefault();
              core.closeMenu();
            }}
          />
          <div
            className="oge-gantt-menu"
            role="menu"
            tabIndex={-1}
            style={{ insetInlineStart: menu.x, top: menu.y }}
            onKeyDown={(event) => core.onMenuKeydown(event)}
          >
            {menu.task !== null ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="oge-gantt-menu-item"
                  disabled={!menuState.edit}
                  onClick={() => core.menuEdit()}
                >
                  {msg.menu.editTask}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="oge-gantt-menu-item"
                  disabled={!menuState.newSubtask}
                  onClick={() => core.menuNewSubtask()}
                >
                  {msg.menu.newSubtask}
                </button>
              </>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="oge-gantt-menu-item"
              disabled={!menuState.newTask}
              onClick={() => core.menuNewTask()}
            >
              {msg.menu.newTask}
            </button>
            {menu.task !== null ? (
              <>
                <div className="oge-gantt-menu-sep" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className="oge-gantt-menu-item"
                  disabled={!menuState.indent}
                  onClick={() => core.menuIndent()}
                >
                  {msg.menu.indent}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="oge-gantt-menu-item"
                  disabled={!menuState.outdent}
                  onClick={() => core.menuOutdent()}
                >
                  {msg.menu.outdent}
                </button>
                <div className="oge-gantt-menu-sep" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className="oge-gantt-menu-item oge-gantt-menu-danger"
                  disabled={!menuState.delete}
                  onClick={() => core.menuDelete()}
                >
                  {msg.menu.deleteTask}
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * The inline cell editor: uncontrolled, synced from the model in a layout
 * effect, with native `input` listening through React's `onChange` (live
 * text) — Enter / Tab / Escape / blur decide the commit, so one edit is one
 * undoable update (ARCHITECTURE, "Native `change` commits stay native").
 */
function NativeCellEditor(props: {
  type: 'text' | 'number' | 'date';
  value: string;
  label: string;
  onInput: (value: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}): ReactElement {
  const ref = useRef<HTMLInputElement>(null);
  useIsomorphicLayoutEffect(() => {
    const input = ref.current;
    if (input !== null && input.value !== props.value) {
      input.value = props.value;
    }
  }, [props.value]);
  return (
    <input
      ref={ref}
      className="oge-gantt-cell-editor"
      type={props.type}
      defaultValue={props.value}
      aria-label={props.label}
      onChange={(event) => props.onInput(event.target.value)}
      onKeyDown={props.onKeyDown}
      onBlur={props.onBlur}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    />
  );
}

/**
 * React Gantt chart — commercial (`@oge-ui/react-gantt`). A task tree pane
 * and a timeline chart with synced, virtualized rows; summary / milestone /
 * baseline bars with progress fill, FS/SS/FF/SF dependency arrows, critical
 * path, drag editing with Escape-cancel and snapshot undo/redo — the same
 * `OgeGanttCore` from `@oge-ui/gantt-engine` the Angular `<oge-gantt>` runs,
 * and the same stylesheet.
 *
 * ```tsx
 * <OgeGantt tasks={tasks} dependencies={links} style={{ height: 480 }} />
 * ```
 */
export const OgeGantt = forwardRef(OgeGanttInner) as <
  T extends object = Record<string, unknown>,
  D extends object = Record<string, unknown>,
>(
  props: OgeGanttProps<T, D> & { ref?: Ref<OgeGanttHandle<T, D>> },
) => ReactElement;
