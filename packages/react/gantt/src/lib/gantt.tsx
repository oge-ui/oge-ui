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
  type ReactElement,
  type Ref,
} from 'react';
import type { RowKey } from '@oge-ui/core';
import {
  OgeGanttCore,
  type GanttEditorModel,
  type OgeGanttColumn,
  type OgeGanttMessages,
  type OgeGanttResource,
  type OgeGanttScaleType,
  type OgeGanttStripLine,
} from '@oge-ui/gantt-engine';
import type { OgeFormItemDefinition } from '@oge-ui/react-forms';
import { useOgeGanttConfig } from './gantt-config';
import { GanttTaskDialog, type GanttDialogState } from './gantt-task-dialog';
import type {
  OgeGanttDialogShowingEvent,
  OgeGanttHandle,
  OgeGanttProps,
} from './gantt-types';
import { createGanttRxAdapter } from './rx-adapter';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

// Stable defaults: the core resets its working set when the `tasks` /
// `dependencies` reference changes, so a fresh `[]` per render would wipe
// the undo history on every render.
const NO_ITEMS: readonly never[] = [];
const NO_DATES: readonly Date[] = [];
const NO_RESOURCES: readonly OgeGanttResource[] = [];
const NO_STRIPS: readonly OgeGanttStripLine[] = [];
const NO_MESSAGES: Partial<OgeGanttMessages> = {};
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
          config: () => configRef.current,
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

  // StrictMode-safe lifetime: cleanup tears gestures/timers down, the mount
  // side revives the same instance (docs/ARCHITECTURE.md)
  useEffect(() => {
    core.revive();
    return () => core.destroy();
  }, [core]);

  useImperativeHandle(
    ref,
    (): OgeGanttHandle<T, D> => ({
      insertTask: (taskData) => core.insertTask(taskData),
      updateTask: (taskData, patch) => core.updateTask(taskData, patch),
      deleteTask: (taskData) => core.deleteTask(taskData),
      insertDependency: (predecessorKey, successorKey, type) =>
        core.insertDependency(predecessorKey, successorKey, type),
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
  const showRowLines = props.showRowLines ?? true;
  const titlePosition = props.taskTitlePosition ?? 'inside';
  const rowHeight = core.rowHeight();
  const selectedTaskKey =
    props.selectedTaskKey !== undefined
      ? (props.selectedTaskKey ?? null)
      : selectedState.current;
  const scale = core.scale();
  const visible = core.visibleTasks();
  const windowTasks = core.windowTasks();
  const columns = core.resolvedColumns();
  const rovingKey = core.rovingKey();
  const hoverKey = core.hoverKey();
  const totalHeight = (props.tasks ?? NO_ITEMS).length * rowHeight;
  const todayPx = core.todayPx();
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
      className={['oge-gantt', props.className].filter(Boolean).join(' ')}
      style={props.style}
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
            aria-rowcount={(props.tasks ?? NO_ITEMS).length}
            onKeyDown={(event) => core.onPaneKeydown(event)}
          >
            <div className="oge-gantt-pane-header" role="row">
              {columns.map((column) => (
                <div
                  key={column.field}
                  className="oge-gantt-pane-headcell"
                  role="columnheader"
                  style={{ width: column.widthPx }}
                >
                  {column.header}
                </div>
              ))}
            </div>
            <div style={{ height: core.windowTopPx() }} aria-hidden="true" />
            {windowTasks.map((task) => {
              const selected = task.key === selectedTaskKey;
              const roving = task.key === rovingKey;
              return (
                <div
                  key={String(task.key)}
                  className={[
                    'oge-gantt-row',
                    selected ? 'oge-gantt-row-selected' : '',
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
                      className="oge-gantt-pane-cell"
                      role="gridcell"
                      style={{ width: column.widthPx }}
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
                      <span className="oge-gantt-cell-text">
                        {core.cellText(task, column)}
                      </span>
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
                      task.key === selectedTaskKey
                        ? 'oge-gantt-row-selected'
                        : '',
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
                    />
                  ))}
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
                </svg>
                {core.windowBars().map((bar) => {
                  const task = bar.task;
                  const resource = core.resourceText(task);
                  return (
                    <div
                      key={String(task.key)}
                      className="oge-gantt-bar-box"
                      style={{ top: bar.index * rowHeight, height: rowHeight }}
                    >
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
                        <div
                          className={
                            bar.critical
                              ? 'oge-gantt-summary oge-gantt-target oge-gantt-critical'
                              : 'oge-gantt-summary oge-gantt-target'
                          }
                          style={{
                            insetInlineStart: bar.leftPx,
                            width: bar.widthPx,
                            backgroundColor: task.color,
                          }}
                          data-task-key={String(task.key)}
                          onMouseEnter={() => core.tooltipKey.set(task.key)}
                          onMouseLeave={() => core.tooltipKey.set(null)}
                        />
                      ) : (
                        <>
                          <div
                            className={[
                              'oge-gantt-bar oge-gantt-target',
                              bar.critical ? 'oge-gantt-critical' : '',
                              core.dragKey() === task.key
                                ? 'oge-gantt-dragging'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            style={{
                              insetInlineStart: bar.leftPx,
                              width: bar.widthPx,
                              backgroundColor: task.color,
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
                            <div
                              className="oge-gantt-progress"
                              style={{ width: `${task.progress}%` }}
                              aria-hidden="true"
                            />
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
            </div>
          </div>
        </div>
      </div>

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
            style={{ left: menu.x, top: menu.y }}
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
      <div className="oge-gantt-live" aria-live="polite">
        {core.announcement()}
      </div>
    </div>
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
