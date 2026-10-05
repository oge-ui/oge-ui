'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import {
  KANBAN_CARD_GAP,
  formatKanbanDue,
  formatKanbanMessage,
  isKanbanCardShifted,
  isKanbanOverdue,
  kanbanCardActionLabel,
  kanbanCardLabel,
  kanbanCardShortcuts,
  kanbanCellKey,
  kanbanCellLabel,
  kanbanCellWindow,
  kanbanColumnTitle,
  kanbanColumnWip,
  kanbanDropIndex,
  kanbanGridTemplate,
  kanbanInitials,
  prepareKanbanTouchDrag,
  watchKanbanDirection,
  KANBAN_DEFAULT_UNDO_LIMIT,
  formatKanbanCount,
  isKanbanFilterChipActive,
  isKanbanFilterEmpty,
  kanbanCellWip,
  kanbanChecklistLabel,
  kanbanChecklistProgress,
  kanbanColumnSortSpec,
  kanbanLaneWip,
  type KanbanCard,
  type KanbanChecklistItem,
  type KanbanColumnDef,
  type OgeKanbanSortField,
} from '@oge-ui/kanban-engine';
import { OgeKanbanCardDialog } from './kanban-card-dialog';
import { useOgeKanbanConfig } from './kanban-config';
import { KanbanController, type KanbanView } from './kanban-controller';
import type {
  OgeKanbanCardRenderContext,
  OgeKanbanHandle,
  OgeKanbanProps,
} from './kanban-types';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

const PlusIcon = ({ size }: { size: number }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
    <path
      d="M8 3v10M3 8h10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/** CSS custom properties are not in `CSSProperties`; this keeps them typed. */
type CssVars = CSSProperties & Record<`--${string}`, string | undefined>;

function OgeKanbanInner<T extends object = Record<string, unknown>>(
  props: OgeKanbanProps<T>,
  ref: Ref<OgeKanbanHandle<T>>,
) {
  const config = useOgeKanbanConfig();
  const controllerRef = useRef<KanbanController<T> | null>(null);
  controllerRef.current ??= new KanbanController<T>(props, config);
  const ctl = controllerRef.current;
  ctl.sync(props, config);
  ctl.syncUndoLimit();
  useSyncExternalStore(ctl.subscribe, ctl.getVersion, ctl.getVersion);

  const hostRef = useRef<HTMLDivElement>(null);

  // after every commit — Angular's afterRenderEffect: re-measure the cells
  // (they reshape with the board) and land a pending keyboard focus
  useIsomorphicLayoutEffect(() => {
    ctl.host = hostRef.current;
    ctl.afterRender();
  });

  // the lifecycle: a ResizeObserver keeps the virtual windows honest, and
  // teardown stops a running auto-scroll loop. Both sides re-run cleanly
  // under StrictMode's cleanup → remount (nothing is left destroyed).
  useEffect(() => {
    ctl.host = hostRef.current;
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => ctl.measureCells());
    if (hostRef.current !== null) observer?.observe(hostRef.current);
    // the browser decides about panning at touchstart: arm the touch guard
    // before the first long-press card drag
    prepareKanbanTouchDrag(hostRef.current);
    // cross-board drag: the other boards of a dragGroup find this one
    ctl.mount();
    return () => {
      observer?.disconnect();
      ctl.teardown();
    };
  }, [ctl]);

  // the rtlEnabled fallback: the page direction, kept current
  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    return watchKanbanDirection(host, (rtl) => {
      ctl.detectedRtl = rtl;
    });
  }, [ctl]);

  useImperativeHandle(
    ref,
    (): OgeKanbanHandle<T> => ({
      addCard: (item) => ctl.addCard(item),
      updateCard: (original, updated) => ctl.updateCard(original, updated),
      deleteCard: (item) => ctl.deleteCard(item),
      moveCard: (key, toColumn, toIndex, toSwimlane) =>
        ctl.moveCard(key, toColumn, toIndex, toSwimlane),
      editCard: (card) => ctl.editCard(card),
      openNewCard: (column, swimlane) => ctl.openNewCard(column, swimlane),
      closeDialog: () => ctl.closeDialog(),
      collapseAllColumns: () => ctl.collapseAllColumns(),
      expandAllColumns: () => ctl.expandAllColumns(),
      undo: () => ctl.undo(),
      redo: () => ctl.redo(),
      canUndo: () => ctl.canUndo(),
      canRedo: () => ctl.canRedo(),
      selectCards: (keys) => ctl.selectCards(keys),
      clearSelection: () => ctl.clearSelection(),
      moveCards: (keys, toColumn, toIndex, toSwimlane) =>
        ctl.moveCards(keys, toColumn, toIndex, toSwimlane),
      deleteCards: (items) => ctl.deleteCards(items),
      transferCards: (keys, toBoard, toColumn, toIndex, toSwimlane) =>
        ctl.transferCards(keys, toBoard, toColumn, toIndex, toSwimlane),
      toggleChecklistItem: (key, index) => ctl.toggleChecklistItem(key, index),
      startTitleEdit: (key) => ctl.startTitleEdit(key),
      clearFilters: () => ctl.clearFilters(),
      getExportData: (options) => ctl.getExportData(options),
      exportToCsv: (fileName, options) => ctl.exportToCsv(fileName, options),
    }),
    [ctl],
  );

  const view = ctl.view();
  const st = ctl.state;
  const msg = view.msg;
  const virtualScrolling = props.virtualScrolling ?? true;
  const cardColorMode = props.cardColorMode ?? 'stripe';
  const showToolbar = props.showToolbar ?? true;
  const columnWidth = props.columnWidth ?? 300;
  const allowColumnReordering = props.allowColumnReordering ?? false;
  const readOnly = props.readOnly ?? false;
  const slot = view.cardHeight + KANBAN_CARD_GAP;
  const gridTemplate = kanbanGridTemplate(
    view.columns,
    view.collapsedColumns,
    columnWidth,
    view.canAddColumn,
  );
  const totalCount = view.allCards.length;
  const noSearchResults =
    view.filtering && view.visibleCards.length === 0 && totalCount > 0;
  const noResultsText =
    st.searchQuery.trim() !== ''
      ? msg.board.noSearchResults
      : msg.board.noFilterResults;
  const shortcuts = kanbanCardShortcuts(view);
  const undoLimit = props.undoLimit ?? KANBAN_DEFAULT_UNDO_LIMIT;
  const multi = view.selectedKeys.length > 1;
  const carriedSet = new Set(st.dragCarried);
  const incoming = st.incomingTarget;
  const dropIndexFor = (lane: string | null, column: string): number | null =>
    incoming !== null
      ? incoming.lane === lane && incoming.column === column
        ? incoming.index
        : null
      : kanbanDropIndex(drag, lane, column);
  const shiftedFor = (
    lane: string | null,
    column: string,
    index: number,
    card: KanbanCard<T>,
  ): boolean =>
    incoming !== null
      ? incoming.lane === lane &&
        incoming.column === column &&
        index >= incoming.index
      : isKanbanCardShifted(drag, lane, column, index, card);
  const chipGroups = [
    {
      kind: 'tags' as const,
      label: msg.toolbar.tagsFilter,
      values: view.filterChoices.tags,
    },
    {
      kind: 'assignees' as const,
      label: msg.toolbar.assigneesFilter,
      values: view.filterChoices.assignees,
    },
    {
      kind: 'priorities' as const,
      label: msg.toolbar.priorityFilter,
      values: view.filterChoices.priorities,
    },
  ];
  const countText = (
    template: string,
    values: Readonly<Record<string, string | number>>,
  ) => formatKanbanCount(template, values, view.locale);
  const drag = st.drag;
  const menu = st.menu;

  const columnCount = (key: string): number => view.counts.get(key) ?? 0;

  const cardBody = (
    card: KanbanCard<T>,
    column: KanbanColumnDef,
    swimlane: string | null,
  ): ReactNode => {
    if (props.renderCard) {
      const context: OgeKanbanCardRenderContext<T> = { card, column, swimlane };
      return props.renderCard(context);
    }
    return (
      <>
        {card.color && cardColorMode === 'stripe' && (
          <span
            className="oge-kanban-card-stripe"
            style={{ background: card.color }}
            aria-hidden="true"
          ></span>
        )}
        <div className="oge-kanban-card-main">
          <div className="oge-kanban-card-title">{card.title}</div>
          {card.description && (
            <div className="oge-kanban-card-desc">{card.description}</div>
          )}
          {card.tags.length > 0 && (
            <div className="oge-kanban-card-tags">
              {card.tags.map((tag) => (
                <span key={tag} className="oge-kanban-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="oge-kanban-card-meta">
            {card.priority && (
              <span
                className="oge-kanban-priority"
                data-priority={card.priority}
                title={card.priority}
              ></span>
            )}
            {card.dueDate && (
              <DueBadge
                due={card.dueDate}
                locale={view.locale}
                overdueTemplate={msg.board.overdue}
              />
            )}
            {card.checklist.length > 0 && (
              <ChecklistBadge
                checklist={card.checklist}
                label={kanbanChecklistLabel(
                  msg.board,
                  card.checklist,
                  view.locale,
                )}
              />
            )}
            <span className="oge-kanban-meta-spacer"></span>
            {card.assignees.length > 0 && (
              <span className="oge-kanban-avatars">
                {card.assignees.map((assignee) => (
                  <span
                    key={assignee}
                    className="oge-kanban-avatar"
                    title={assignee}
                  >
                    {kanbanInitials(assignee)}
                  </span>
                ))}
              </span>
            )}
            {(view.canUpdate || view.canDelete) && (
              <span className="oge-kanban-card-actions">
                {view.canUpdate && (
                  <button
                    type="button"
                    className="oge-kanban-card-action oge-kanban-card-action-edit"
                    aria-label={kanbanCardActionLabel(msg.board, 'edit', card)}
                    title={kanbanCardActionLabel(msg.board, 'edit', card)}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="13"
                      height="13"
                      aria-hidden="true"
                    >
                      <path
                        d="m11.3 2.7 2 2L6 12l-2.6.6L4 10z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
                {view.canDelete && (
                  <button
                    type="button"
                    className="oge-kanban-card-action oge-kanban-card-action-delete"
                    aria-label={kanbanCardActionLabel(
                      msg.board,
                      'delete',
                      card,
                    )}
                    title={kanbanCardActionLabel(msg.board, 'delete', card)}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="13"
                      height="13"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 5h9M6.5 5V3.8h3V5m-5 0 .5 7.4h6L11.5 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </span>
            )}
          </div>
        </div>
      </>
    );
  };

  const hostClass = [
    'oge-kanban',
    drag !== null ? 'oge-kanban-dragging' : '',
    props.className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const hostStyle: CssVars = {
    ...props.style,
    '--oge-kanban-slot': `${slot}px`,
  };

  return (
    <div
      ref={hostRef}
      className={hostClass}
      role="group"
      aria-label={msg.board.boardLabel}
      style={hostStyle}
      onKeyDown={(event) => ctl.onHostKeydown(event)}
      dir={
        props.rtlEnabled === undefined
          ? undefined
          : props.rtlEnabled
            ? 'rtl'
            : 'ltr'
      }
    >
      {showToolbar && (
        <div
          className="oge-kanban-toolbar"
          role="toolbar"
          aria-label={msg.toolbar.label}
        >
          {view.canAdd && (
            <button
              type="button"
              className="oge-kanban-btn oge-kanban-btn-primary oge-kanban-btn-add"
              onClick={() => ctl.addFromToolbar()}
            >
              <PlusIcon size={14} />
              {msg.toolbar.addCard}
            </button>
          )}
          <div className="oge-kanban-toolbar-group">
            <button
              type="button"
              className="oge-kanban-btn"
              onClick={() => ctl.collapseAllColumns()}
            >
              {msg.toolbar.collapseAll}
            </button>
            <button
              type="button"
              className="oge-kanban-btn"
              onClick={() => ctl.expandAllColumns()}
            >
              {msg.toolbar.expandAll}
            </button>
          </div>
          {undoLimit > 0 && (
            <div className="oge-kanban-toolbar-group">
              <button
                type="button"
                className="oge-kanban-btn oge-kanban-btn-undo"
                disabled={!ctl.canUndo()}
                aria-keyshortcuts="Control+Z"
                onClick={() => ctl.undo()}
              >
                {msg.toolbar.undo}
              </button>
              <button
                type="button"
                className="oge-kanban-btn oge-kanban-btn-redo"
                disabled={!ctl.canRedo()}
                aria-keyshortcuts="Control+Y"
                onClick={() => ctl.redo()}
              >
                {msg.toolbar.redo}
              </button>
            </div>
          )}
          <span className="oge-kanban-toolbar-spacer"></span>
          <div className="oge-kanban-search">
            <svg
              className="oge-kanban-search-icon"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              aria-hidden="true"
            >
              <circle
                cx="7"
                cy="7"
                r="4.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="m10.4 10.4 3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              className="oge-kanban-search-input"
              type="text"
              value={st.searchQuery}
              onChange={(event) => ctl.onSearchInput(event.target.value)}
              aria-label={msg.toolbar.searchLabel}
              placeholder={msg.toolbar.searchPlaceholder}
            />
            {st.searchQuery !== '' && (
              <button
                type="button"
                className="oge-kanban-search-clear"
                onClick={() => ctl.clearSearch()}
                aria-label={msg.toolbar.clearSearch}
              >
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  aria-hidden="true"
                >
                  <path
                    d="m4 4 8 8m0-8-8 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      {(props.showFilterBar ?? false) && (
        <div
          className="oge-kanban-filters"
          role="group"
          aria-label={msg.toolbar.filterLabel}
        >
          {chipGroups.map((group) =>
            group.values.length === 0 ? null : (
              <div
                key={group.kind}
                className="oge-kanban-filter-group"
                role="group"
                aria-label={group.label}
              >
                <span className="oge-kanban-filter-caption" aria-hidden="true">
                  {group.label}
                </span>
                {group.values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="oge-kanban-chip"
                    data-kind={group.kind}
                    aria-pressed={isKanbanFilterChipActive(
                      view.filterValue,
                      group.kind,
                      value,
                    )}
                    onClick={() => ctl.toggleChip(group.kind, value)}
                  >
                    <CheckIcon className="oge-kanban-chip-check" size={11} />
                    {value}
                  </button>
                ))}
              </div>
            ),
          )}
          {!isKanbanFilterEmpty(view.filterValue) && (
            <button
              type="button"
              className="oge-kanban-btn oge-kanban-filters-clear"
              onClick={() => ctl.clearFilters()}
            >
              {msg.toolbar.clearFilters}
            </button>
          )}
        </div>
      )}
      <div className="oge-kanban-body">
        {totalCount === 0 ? (
          <div className="oge-kanban-empty">
            <svg
              className="oge-kanban-empty-icon"
              viewBox="0 0 44 44"
              width="44"
              height="44"
              aria-hidden="true"
            >
              <rect x="4" y="8" width="10" height="24" rx="2" />
              <rect x="17" y="8" width="10" height="16" rx="2" />
              <rect x="30" y="8" width="10" height="28" rx="2" />
            </svg>
            <div className="oge-kanban-empty-title">{msg.board.noCards}</div>
            <div className="oge-kanban-empty-hint">{msg.board.noCardsHint}</div>
            {view.canAdd && (
              <button
                type="button"
                className="oge-kanban-btn oge-kanban-btn-primary oge-kanban-btn-add"
                onClick={() => ctl.addFromToolbar()}
              >
                {msg.toolbar.addCard}
              </button>
            )}
          </div>
        ) : noSearchResults ? (
          <div className="oge-kanban-empty">
            <div className="oge-kanban-empty-title">{noResultsText}</div>
          </div>
        ) : (
          <>
            <div
              className="oge-kanban-header-row"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {view.columns.map((column) =>
                ctl.isColumnCollapsed(column.key) ? (
                  <button
                    key={column.key}
                    type="button"
                    className="oge-kanban-column-collapsed"
                    onClick={() => ctl.toggleColumn(column.key)}
                    aria-label={`${msg.menu.expandColumn}: ${kanbanColumnTitle(column)}`}
                    aria-expanded={false}
                  >
                    <span className="oge-kanban-column-collapsed-title">
                      {kanbanColumnTitle(column)}
                    </span>
                    <span className="oge-kanban-count">
                      {columnCount(column.key)}
                    </span>
                  </button>
                ) : (
                  <ColumnHeader
                    key={column.key}
                    ctl={ctl}
                    view={view}
                    column={column}
                    count={columnCount(column.key)}
                    dragging={st.draggedColumnKey === column.key}
                    reorderable={allowColumnReordering && !readOnly}
                    renderColumnHeader={props.renderColumnHeader}
                  />
                ),
              )}
              {view.canAddColumn &&
                (st.addColumnOpen ? (
                  <div className="oge-kanban-add-column-form">
                    <input
                      className="oge-kanban-add-column-input"
                      type="text"
                      value={st.addColumnName}
                      onChange={(event) =>
                        ctl.onAddColumnInput(event.target.value)
                      }
                      onKeyDown={(event) => ctl.onAddColumnKeydown(event)}
                      onBlur={(event) => ctl.onAddColumnBlur(event)}
                      aria-label={msg.board.addColumn}
                      placeholder={msg.board.addColumnPlaceholder}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="oge-kanban-add-column"
                    onClick={() => ctl.startAddColumn()}
                  >
                    <PlusIcon size={14} />
                    {msg.board.addColumn}
                  </button>
                ))}
            </div>
            {view.lanes.map((lane) => {
              const laneLimit = kanbanLaneWip(
                lane.key,
                props.swimlaneWipLimits,
                view.laneCounts,
              );
              return (
                <section
                  key={lane.key ?? ''}
                  className={
                    view.hasSwimlanes
                      ? 'oge-kanban-lane'
                      : 'oge-kanban-lane oge-kanban-lane-single'
                  }
                >
                  {view.hasSwimlanes && (
                    <button
                      type="button"
                      className={
                        laneLimit?.exceeded
                          ? 'oge-kanban-lane-header oge-kanban-lane-wip-exceeded'
                          : 'oge-kanban-lane-header'
                      }
                      onClick={() => ctl.toggleSwimlane(lane.key)}
                      aria-expanded={!ctl.isSwimlaneCollapsed(lane.key)}
                      title={
                        laneLimit?.exceeded
                          ? formatKanbanMessage(msg.board.laneWipExceeded, {
                              count: String(laneLimit.count),
                              limit: String(laneLimit.limit),
                            })
                          : undefined
                      }
                    >
                      <svg
                        className={
                          ctl.isSwimlaneCollapsed(lane.key)
                            ? 'oge-kanban-lane-chevron oge-kanban-lane-chevron-collapsed'
                            : 'oge-kanban-lane-chevron'
                        }
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 6.5 8 9.5l3-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="oge-kanban-lane-title">
                        {lane.key ?? ''}
                      </span>
                      <span
                        className={
                          laneLimit?.exceeded
                            ? 'oge-kanban-count oge-kanban-count-danger'
                            : 'oge-kanban-count'
                        }
                      >
                        {laneLimit ? laneLimit.count : lane.count}
                        {laneLimit && (
                          <span className="oge-kanban-count-limit">
                            /{laneLimit.limit}
                          </span>
                        )}
                      </span>
                    </button>
                  )}
                  {!ctl.isSwimlaneCollapsed(lane.key) && (
                    <div
                      className="oge-kanban-lane-cells"
                      style={{ gridTemplateColumns: gridTemplate }}
                    >
                      {lane.columns.map((cell) => {
                        if (ctl.isColumnCollapsed(cell.column.key)) {
                          return (
                            <div
                              key={cell.column.key}
                              className="oge-kanban-cell-collapsed"
                              aria-hidden="true"
                            ></div>
                          );
                        }
                        const count = cell.cards.length;
                        const win = kanbanCellWindow(
                          st.cellState.get(
                            kanbanCellKey(lane.key, cell.column.key),
                          ),
                          count,
                          view.cardHeight,
                          virtualScrolling,
                        );
                        const dropIndex = dropIndexFor(
                          lane.key,
                          cell.column.key,
                        );
                        const cellLimit = kanbanCellWip(
                          cell.column,
                          lane.key,
                          view.cellCounts,
                          view.hasSwimlanes,
                        );
                        return (
                          <div
                            key={cell.column.key}
                            className="oge-kanban-cell"
                            onDoubleClick={(event) =>
                              ctl.onCellDblClick(event, cell.column, lane.key)
                            }
                          >
                            {cellLimit && (
                              <span
                                className={
                                  cellLimit.exceeded
                                    ? 'oge-kanban-count oge-kanban-cell-wip oge-kanban-count-danger'
                                    : 'oge-kanban-count oge-kanban-cell-wip'
                                }
                                title={
                                  cellLimit.exceeded
                                    ? formatKanbanMessage(
                                        msg.board.cellWipExceeded,
                                        {
                                          count: String(cellLimit.count),
                                          limit: String(cellLimit.limit),
                                        },
                                      )
                                    : undefined
                                }
                                aria-hidden="true"
                              >
                                {cellLimit.count}
                                <span className="oge-kanban-count-limit">
                                  /{cellLimit.limit}
                                </span>
                              </span>
                            )}
                            <div
                              className="oge-kanban-cards"
                              role="list"
                              aria-label={kanbanCellLabel(
                                msg.board,
                                cell.column,
                                count,
                                cellLimit ??
                                  kanbanColumnWip(cell.column, view.counts),
                              )}
                              data-lane={lane.key ?? ''}
                              data-col={cell.column.key}
                              onScroll={(event) =>
                                ctl.onCellScroll(
                                  event,
                                  lane.key,
                                  cell.column.key,
                                )
                              }
                            >
                              {count === 0 ? (
                                // decorative: the list label already carries the zero count
                                <div
                                  className="oge-kanban-cell-empty"
                                  aria-hidden="true"
                                >
                                  {msg.board.emptyColumn}
                                </div>
                              ) : (
                                <div
                                  className="oge-kanban-cards-inner"
                                  style={
                                    virtualScrolling
                                      ? { height: `${win.totalHeight}px` }
                                      : undefined
                                  }
                                >
                                  {dropIndex !== null && (
                                    <div
                                      className="oge-kanban-placeholder"
                                      style={{
                                        top: `${dropIndex * slot}px`,
                                        height: `${view.cardHeight}px`,
                                      }}
                                      aria-hidden="true"
                                    ></div>
                                  )}
                                  <div
                                    className="oge-kanban-cards-block"
                                    style={
                                      virtualScrolling
                                        ? {
                                            transform: `translateY(${win.offsetY}px)`,
                                          }
                                        : undefined
                                    }
                                  >
                                    {cell.cards
                                      .slice(win.start, win.end)
                                      .map((card, offset) => {
                                        const selected = view.selectedSet.has(
                                          card.key,
                                        );
                                        const editing = Object.is(
                                          st.editingTitleKey,
                                          card.key,
                                        );
                                        const shifted = shiftedFor(
                                          lane.key,
                                          cell.column.key,
                                          win.start + offset,
                                          card,
                                        );
                                        const tinted =
                                          cardColorMode === 'surface' &&
                                          !!card.color;
                                        const className = [
                                          'oge-kanban-card',
                                          selected
                                            ? 'oge-kanban-card-selected'
                                            : '',
                                          selected && multi
                                            ? 'oge-kanban-card-multi'
                                            : '',
                                          drag !== null &&
                                          drag.card.key !== card.key &&
                                          carriedSet.has(card.key)
                                            ? 'oge-kanban-card-carried'
                                            : '',
                                          editing
                                            ? 'oge-kanban-card-editing'
                                            : '',
                                          drag?.card.key === card.key
                                            ? 'oge-kanban-card-hidden'
                                            : '',
                                          shifted
                                            ? 'oge-kanban-card-shifted'
                                            : '',
                                          tinted
                                            ? 'oge-kanban-card-tinted'
                                            : '',
                                        ]
                                          .filter(Boolean)
                                          .join(' ');
                                        const style: CssVars = {
                                          '--oge-kanban-card-tint':
                                            card.color ?? undefined,
                                          height: virtualScrolling
                                            ? `${view.cardHeight}px`
                                            : undefined,
                                        };
                                        return (
                                          <div
                                            key={String(card.key)}
                                            className="oge-kanban-card-item"
                                            role="listitem"
                                          >
                                            <div
                                              className={className}
                                              role="group"
                                              aria-roledescription={
                                                msg.board.cardRoleDescription
                                              }
                                              tabIndex={
                                                view.focusable.has(card.key)
                                                  ? 0
                                                  : -1
                                              }
                                              data-key={String(card.key)}
                                              aria-current={
                                                view.selectedCardKey ===
                                                card.key
                                                  ? 'true'
                                                  : undefined
                                              }
                                              aria-keyshortcuts={
                                                shortcuts ?? undefined
                                              }
                                              style={style}
                                              aria-label={kanbanCardLabel(
                                                msg.board,
                                                card,
                                                view.columns,
                                                selected,
                                              )}
                                              onClick={(event) =>
                                                ctl.onCardClick(card, event)
                                              }
                                              onDoubleClick={(event) =>
                                                ctl.onCardDblClick(card, event)
                                              }
                                              onContextMenu={(event) =>
                                                ctl.onCardContextMenu(
                                                  card,
                                                  event,
                                                )
                                              }
                                              onKeyDown={(event) =>
                                                ctl.onCardKeydown(event, card)
                                              }
                                              onPointerDown={(event) =>
                                                ctl.onCardPointerDown(
                                                  event,
                                                  card,
                                                  cell.column,
                                                  lane.key,
                                                )
                                              }
                                            >
                                              {editing && (
                                                <input
                                                  className="oge-kanban-card-title-input"
                                                  type="text"
                                                  defaultValue={card.title}
                                                  aria-label={formatKanbanMessage(
                                                    msg.board.editTitleLabel,
                                                    { title: card.title },
                                                  )}
                                                  onKeyDown={(event) =>
                                                    ctl.onTitleEditKeydown(
                                                      event,
                                                      card,
                                                    )
                                                  }
                                                  onBlur={(event) =>
                                                    ctl.onTitleEditBlur(
                                                      event,
                                                      card,
                                                    )
                                                  }
                                                />
                                              )}
                                              {cardBody(
                                                card,
                                                cell.column,
                                                lane.key,
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                            {ctl.isQuickAddOpen(lane.key, cell.column.key) ? (
                              <div className="oge-kanban-quick-add">
                                <input
                                  className="oge-kanban-quick-add-input"
                                  type="text"
                                  value={st.quickAddText}
                                  aria-label={formatKanbanMessage(
                                    msg.board.quickAddLabel,
                                    { title: kanbanColumnTitle(cell.column) },
                                  )}
                                  placeholder={msg.board.quickAddPlaceholder}
                                  onChange={(event) =>
                                    ctl.onQuickAddInput(event.target.value)
                                  }
                                  onKeyDown={(event) =>
                                    ctl.onQuickAddKeydown(
                                      event,
                                      cell.column,
                                      lane.key,
                                    )
                                  }
                                  onBlur={() =>
                                    ctl.onQuickAddBlur(cell.column, lane.key)
                                  }
                                />
                              </div>
                            ) : (
                              ctl.canAddTo(cell.column, view) && (
                                <button
                                  type="button"
                                  className="oge-kanban-add-card"
                                  onClick={() =>
                                    ctl.onFooterAdd(cell.column, lane.key)
                                  }
                                >
                                  <PlusIcon size={13} />
                                  {msg.menu.addCard}
                                </button>
                              )
                            )}
                          </div>
                        );
                      })}
                      {view.canAddColumn && (
                        <div
                          className="oge-kanban-cell-ghost"
                          aria-hidden="true"
                        ></div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}
      </div>

      {drag !== null && (
        <div
          className="oge-kanban-drag-preview"
          style={{
            width: `${drag.width}px`,
            height: `${drag.height}px`,
            transform: `translate3d(${drag.x - drag.grabX}px,${drag.y - drag.grabY}px,0)`,
          }}
          aria-hidden="true"
          inert
        >
          {st.dragCarried.length > 1 && (
            <>
              <span className="oge-kanban-drag-stack"></span>
              <span className="oge-kanban-drag-count">
                {countText(msg.board.dragCount, {
                  count: st.dragCarried.length,
                })}
              </span>
            </>
          )}
          <div
            className={
              cardColorMode === 'surface' && !!drag.card.color
                ? 'oge-kanban-card oge-kanban-card-lifted oge-kanban-card-tinted'
                : 'oge-kanban-card oge-kanban-card-lifted'
            }
            style={
              {
                '--oge-kanban-card-tint': drag.card.color ?? undefined,
              } as CssVars
            }
          >
            {cardBody(drag.card, drag.column, drag.fromLane)}
          </div>
        </div>
      )}

      {menu !== null && (
        <>
          {/* click-away surface only; Escape on the focused menu closes too */}
          <div
            className="oge-kanban-menu-backdrop"
            onClick={() => ctl.closeMenu()}
            onContextMenu={(event) => {
              event.preventDefault();
              ctl.closeMenu();
            }}
          ></div>
          <div
            className="oge-kanban-menu"
            role="menu"
            tabIndex={-1}
            style={{ left: `${menu.x}px`, top: `${menu.y}px` }}
            onKeyDown={(event) => ctl.onMenuKeydown(event)}
          >
            {menu.card !== null ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="oge-kanban-menu-item"
                  disabled={!view.canUpdate}
                  onClick={() => ctl.menuEdit()}
                >
                  {msg.menu.editCard}
                </button>
                {ctl.moveTargets(menu).length > 0 && (
                  <>
                    <div className="oge-kanban-menu-sep" role="separator"></div>
                    <div className="oge-kanban-menu-label" aria-hidden="true">
                      {msg.menu.moveTo}
                    </div>
                    {ctl.moveTargets(menu).map((target) => (
                      <button
                        key={target.key}
                        type="button"
                        role="menuitem"
                        className="oge-kanban-menu-item oge-kanban-menu-item-move"
                        onClick={() => ctl.menuMoveTo(target.key)}
                      >
                        {target.color && (
                          <span
                            className="oge-kanban-column-dot"
                            style={{ background: target.color }}
                            aria-hidden="true"
                          ></span>
                        )}
                        {kanbanColumnTitle(target)}
                      </button>
                    ))}
                  </>
                )}
                {view.canDrag && ctl.peerBoards().length > 0 && (
                  <>
                    <div className="oge-kanban-menu-sep" role="separator"></div>
                    {ctl.peerBoards().map((peer) => (
                      <button
                        key={peer.id}
                        type="button"
                        role="menuitem"
                        className="oge-kanban-menu-item oge-kanban-menu-item-board"
                        onClick={() => ctl.menuMoveToBoard(peer)}
                      >
                        {formatKanbanMessage(msg.menu.moveToBoard, {
                          board: peer.id,
                        })}
                      </button>
                    ))}
                  </>
                )}
                <div className="oge-kanban-menu-sep" role="separator"></div>
                <button
                  type="button"
                  role="menuitem"
                  className="oge-kanban-menu-item oge-kanban-menu-danger"
                  disabled={!view.canDelete}
                  onClick={() => ctl.menuDelete()}
                >
                  {msg.menu.deleteCard}
                </button>
              </>
            ) : menu.column !== null ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="oge-kanban-menu-item"
                  disabled={!ctl.canAddTo(menu.column, view)}
                  onClick={() => ctl.menuAddCard()}
                >
                  {msg.menu.addCard}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="oge-kanban-menu-item"
                  onClick={() => ctl.menuToggleColumn()}
                >
                  {ctl.isColumnCollapsed(menu.column.key)
                    ? msg.menu.expandColumn
                    : msg.menu.collapseColumn}
                </button>
                {view.multiSelect && (
                  <button
                    type="button"
                    role="menuitem"
                    className="oge-kanban-menu-item oge-kanban-menu-item-select-all"
                    onClick={() => ctl.menuSelectAll()}
                  >
                    {msg.menu.selectAll}
                  </button>
                )}
                <div className="oge-kanban-menu-sep" role="separator"></div>
                <div className="oge-kanban-menu-label" aria-hidden="true">
                  {msg.menu.sortBy}
                </div>
                {SORT_FIELDS.map((field) => (
                  <button
                    key={field}
                    type="button"
                    role="menuitemradio"
                    className="oge-kanban-menu-item oge-kanban-menu-item-sort"
                    data-field={field}
                    aria-checked={ctl.activeSort(menu.column!).field === field}
                    onClick={() => ctl.menuSort(field)}
                  >
                    <CheckIcon className="oge-kanban-menu-check" size={14} />
                    {ctl.sortFieldLabel(field)}
                  </button>
                ))}
                <div className="oge-kanban-menu-sep" role="separator"></div>
                {SORT_DIRECTIONS.map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    role="menuitemradio"
                    className="oge-kanban-menu-item oge-kanban-menu-item-direction"
                    data-direction={direction}
                    aria-checked={
                      ctl.activeSort(menu.column!).direction === direction
                    }
                    onClick={() => ctl.menuSort(null, direction)}
                  >
                    <CheckIcon className="oge-kanban-menu-check" size={14} />
                    {direction === 'asc'
                      ? msg.menu.sortAscending
                      : msg.menu.sortDescending}
                  </button>
                ))}
              </>
            ) : null}
          </div>
        </>
      )}

      <OgeKanbanCardDialog
        state={st.dialog}
        messages={msg.dialog}
        allowDeleting={view.canDelete}
        onModelChange={(model) => ctl.onDialogModelChange(model)}
        onOpenedChange={(opened) => ctl.onDialogOpenedChange(opened)}
        onSaved={(model, isNew) => ctl.onEditorSaved(model, isNew)}
        onCancelled={() => ctl.onEditorCancelled()}
        onDeleteRequested={() => ctl.onEditorDelete()}
      />

      <div className="oge-kanban-live" aria-live="polite">
        {st.announcement}
      </div>
    </div>
  );
}

function ChecklistBadge({
  checklist,
  label,
}: {
  checklist: readonly KanbanChecklistItem[];
  label: string;
}) {
  const { done, total } = kanbanChecklistProgress(checklist);
  return (
    <span
      className={
        done === total
          ? 'oge-kanban-checklist oge-kanban-checklist-done'
          : 'oge-kanban-checklist'
      }
      title={label}
    >
      <span className="oge-kanban-checklist-bar" aria-hidden="true">
        <span style={{ width: `${(done / total) * 100}%` }}></span>
      </span>
      <span aria-hidden="true">
        {done}/{total}
      </span>
      <span className="oge-kanban-sr-only">{label}</span>
    </span>
  );
}

const CheckIcon = ({
  className,
  size,
}: {
  className: string;
  size: number;
}) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    width={size}
    height={size}
    aria-hidden="true"
  >
    <path
      d="m3.5 8.5 3 3 6-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SORT_FIELDS: readonly OgeKanbanSortField[] = [
  'order',
  'title',
  'priority',
  'dueDate',
];
const SORT_DIRECTIONS: readonly ('asc' | 'desc')[] = ['asc', 'desc'];

function DueBadge({
  due,
  locale,
  overdueTemplate,
}: {
  due: Date;
  locale: string | undefined;
  overdueTemplate: string;
}) {
  const overdue = isKanbanOverdue(due);
  const text = formatKanbanDue(due, locale);
  return (
    <span
      className={
        overdue ? 'oge-kanban-due oge-kanban-due-overdue' : 'oge-kanban-due'
      }
      title={
        overdue
          ? formatKanbanMessage(overdueTemplate, { date: text })
          : undefined
      }
    >
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <circle
          cx="8"
          cy="8"
          r="6.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M8 4.8V8l2.2 1.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      {text}
    </span>
  );
}

function ColumnHeader<T extends object>({
  ctl,
  view,
  column,
  count,
  dragging,
  reorderable,
  renderColumnHeader,
}: {
  ctl: KanbanController<T>;
  view: KanbanView<T>;
  column: KanbanColumnDef;
  count: number;
  dragging: boolean;
  reorderable: boolean;
  renderColumnHeader: OgeKanbanProps<T>['renderColumnHeader'];
}) {
  const msg = view.msg;
  const wip = kanbanColumnWip(column, view.counts);
  const title = kanbanColumnTitle(column);
  const className = [
    'oge-kanban-column-header',
    wip.exceeded ? 'oge-kanban-wip-exceeded' : '',
    dragging ? 'oge-kanban-column-header-dragging' : '',
    reorderable ? 'oge-kanban-column-header-draggable' : '',
    kanbanColumnSortSpec(view.columnSort, column.key) !== undefined
      ? 'oge-kanban-column-sorted'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  const countClass = [
    'oge-kanban-count',
    wip.exceeded ? 'oge-kanban-count-danger' : '',
    wip.underfilled ? 'oge-kanban-count-warn' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={className}
      onContextMenu={(event) => ctl.onColumnContextMenu(event, column)}
      onPointerDown={(event) => ctl.onColumnHeaderPointerDown(event, column)}
    >
      {renderColumnHeader ? (
        renderColumnHeader({ column, count, wip })
      ) : (
        <>
          {column.color && (
            <span
              className="oge-kanban-column-dot"
              style={{ background: column.color }}
              aria-hidden="true"
            ></span>
          )}
          <span className="oge-kanban-column-title">{title}</span>
          <span
            className={countClass}
            title={
              wip.exceeded
                ? formatKanbanMessage(msg.board.wipExceeded, {
                    count: String(wip.count),
                    limit: String(wip.limit),
                  })
                : undefined
            }
          >
            {wip.count}{' '}
            {wip.limit !== null && (
              <span className="oge-kanban-count-limit">/{wip.limit}</span>
            )}
          </span>
        </>
      )}
      {ctl.canAddTo(column, view) && (
        <button
          type="button"
          className="oge-kanban-column-add"
          onClick={() => ctl.openNewCard(column.key, null)}
          aria-label={formatKanbanMessage(msg.board.addCardToColumn, {
            title,
          })}
        >
          <PlusIcon size={14} />
        </button>
      )}
      <button
        type="button"
        className="oge-kanban-column-menu-btn"
        aria-haspopup="menu"
        aria-label={formatKanbanMessage(msg.menu.sortColumn, { title })}
        title={formatKanbanMessage(msg.menu.sortColumn, { title })}
        onClick={(event) => ctl.onColumnMenuButton(event, column)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M5 3v10m0 0-2-2m2 2 2-2M11 13V3m0 0-2 2m2-2 2 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        className="oge-kanban-column-collapse"
        onClick={() => ctl.toggleColumn(column.key)}
        aria-label={`${msg.menu.collapseColumn}: ${title}`}
        aria-expanded={true}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M10 3 5 8l5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

/**
 * A Kanban board: columns, swimlanes and virtualized card lists over the
 * shared `@oge-ui/kanban-engine`, with a built-in edit dialog, context menu
 * and toolbar — the same engine, markup and stylesheet as Angular's
 * `<oge-kanban>`.
 *
 * ```tsx
 * <OgeKanban
 *   dataSource={tasks}
 *   keyExpr="id"
 *   columnExpr="status"
 *   titleExpr="title"
 *   columns={[{ key: 'todo', title: 'To do', wipLimit: 4 }, { key: 'done' }]}
 * />
 * ```
 */
export const OgeKanban = forwardRef(OgeKanbanInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeKanbanProps<T> & { ref?: Ref<OgeKanbanHandle<T>> },
) => ReactNode;
