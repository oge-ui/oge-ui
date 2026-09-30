'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  type DragEvent as ReactDragEvent,
  type ForwardedRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type Ref,
} from 'react';
import { OgeGridStatePersistenceCore } from '@oge-ui/behavior';
import type { PivotFieldConfig, PivotGridStateSnapshot } from '@oge-ui/core';
import {
  OgePivotGridCore,
  pivotHeaderCellKey,
  type OgePivotAxisLine,
  type OgePivotFieldDef,
  type OgePivotMessages,
} from '@oge-ui/pivot-engine';
import { useOgeGridStateStorage } from '@oge-ui/react-grid';
import { useOgePivotMessages } from './pivot-config';
import type { OgePivotGridHandle, OgePivotGridProps } from './pivot-types';
import { createPivotRxAdapter } from './rx-adapter';

const NO_ROWS: readonly never[] = [];
const NO_FIELDS: readonly never[] = [];
const NO_CHOOSER = {};

const arrow = (
  <svg
    viewBox="0 0 16 16"
    width="10"
    height="10"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 3.5 4.5 4.5L6 12.5" />
  </svg>
);

/** The tabindex of an expandable header; others are not in the Tab order. */
const headerTabIndex = (line: OgePivotAxisLine) =>
  line.hasChildren ? 0 : undefined;

function OgePivotGridInner<T>(
  props: OgePivotGridProps<T>,
  ref: ForwardedRef<OgePivotGridHandle<T>>,
): ReactElement {
  const contextMessages = useOgePivotMessages();
  const contextStorage = useOgeGridStateStorage();
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  // callbacks and the storage are read through refs, so inline functions
  // stay current without recreating the machines
  const latest = useRef(props);
  latest.current = props;
  const storageRef = useRef(contextStorage);
  storageRef.current = props.stateStorage ?? contextStorage;

  const messages = useMemo<OgePivotMessages>(
    () =>
      props.messages
        ? { ...contextMessages, ...props.messages }
        : contextMessages,
    [contextMessages, props.messages],
  );

  // --- the model: one shared core, built once -------------------------------
  const model = useMemo(() => {
    const rx = createPivotRxAdapter(() => rerender());
    const input = {
      data: rx.input<NonNullable<OgePivotGridProps<T>['data']>>(NO_ROWS),
      fields: rx.input<readonly OgePivotFieldDef<T>[]>(NO_FIELDS),
      virtualScrolling: rx.input(false),
      showRowTotals: rx.input(true),
      showColumnTotals: rx.input(true),
      showRowGrandTotals: rx.input(true),
      showColumnGrandTotals: rx.input(true),
      messages: rx.input(messages),
    };
    const core = new OgePivotGridCore<T>(rx, {
      inputs: {
        data: input.data,
        fields: input.fields,
        virtualScrolling: input.virtualScrolling,
        showRowTotals: input.showRowTotals,
        showColumnTotals: input.showColumnTotals,
        showRowGrandTotals: input.showRowGrandTotals,
        showColumnGrandTotals: input.showColumnGrandTotals,
        messages: input.messages,
        customizeCell: () => latest.current.customizeCell,
        fieldChooser: () => latest.current.fieldChooser ?? NO_CHOOSER,
      },
      fieldLayoutChange: (fields) =>
        latest.current.onFieldLayoutChange?.(fields),
    });
    const persistence = new OgeGridStatePersistenceCore<PivotGridStateSnapshot>(
      {
        prefix: 'oge-pivot',
        get storage() {
          return storageRef.current;
        },
        snapshot: () => core.persistedSnapshot(),
        stateKey: () => latest.current.stateKey,
        apply: (snapshot) => core.applyState(snapshot),
        onChange: (snapshot) => latest.current.onStateChange?.(snapshot),
      },
    );
    return { input, core, persistence };
    // built once: everything it reads arrives through input cells and refs
  }, []);
  const { core, persistence } = model;

  // props enter the machine as input cells — an unchanged prop keeps every
  // value derived from it cached (see rx-adapter.ts)
  model.input.data.set(props.data ?? NO_ROWS);
  model.input.fields.set(props.fields ?? NO_FIELDS);
  model.input.virtualScrolling.set(props.virtualScrolling ?? false);
  model.input.showRowTotals.set(props.showRowTotals ?? true);
  model.input.showColumnTotals.set(props.showColumnTotals ?? true);
  model.input.showRowGrandTotals.set(props.showRowGrandTotals ?? true);
  model.input.showColumnGrandTotals.set(props.showColumnGrandTotals ?? true);
  model.input.messages.set(messages);

  const viewportRef = useRef<HTMLDivElement>(null);

  // --- lifecycle ------------------------------------------------------------
  // StrictMode runs cleanup → remount on the same instance: revive on mount
  useEffect(() => {
    core.revive();
    return () => core.dispose();
  }, [core]);

  // remote load: issued when the serialized request changed
  useEffect(() => {
    core.syncRemote();
  });

  // viewport measurement for the virtual windows
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      core.viewportSize.set({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [core]);

  // outside clicks close the menu / filter popup (Angular's `document:click`)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onClick = (event: MouseEvent) => core.documentClick(event.target);
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [core]);

  // state persistence
  const stateKey = props.stateKey;
  useEffect(() => {
    persistence.restore(stateKey);
  }, [persistence, stateKey]);
  useEffect(() => {
    persistence.noteSnapshot(core.persistedSnapshot(), stateKey);
  });
  useEffect(() => () => persistence.dispose(), [persistence]);

  useImperativeHandle(
    ref,
    (): OgePivotGridHandle<T> => ({
      getResult: () => core.getResult(),
      drillDown: (args) => core.drillDown(args),
      expandAll: (area) => core.expandAll(area),
      collapseAll: (area) => core.collapseAll(area),
      getFieldLayout: () => core.getFieldLayout(),
      showFieldChooser: () => core.showFieldChooser(),
      state: () => core.state(),
      applyState: (snapshot) => core.applyState(snapshot),
      getCsv: (options) => core.getCsv(options),
      exportCsv: (filename) => core.exportCsv(filename),
    }),
    [core],
  );

  // --- handlers -------------------------------------------------------------
  const toggle = (
    axis: 'row' | 'column',
    line: OgePivotAxisLine,
    event: ReactMouseEvent | ReactKeyboardEvent,
  ): void => {
    event.stopPropagation();
    if ('key' in event) event.preventDefault();
    if (axis === 'row') core.toggleRow(line);
    else core.toggleColumn(line);
  };

  const onHeaderKeyDown = (
    axis: 'row' | 'column',
    line: OgePivotAxisLine,
    event: ReactKeyboardEvent,
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') toggle(axis, line, event);
  };

  const onMatrixKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    const outcome = core.matrixKeydown(event.key);
    if (!outcome) return;
    event.preventDefault();
    if (!outcome.moved) return;
    const { row, col } = outcome.cell;
    const target = event.currentTarget;
    // move DOM focus to the newly tabbable cell once it rendered
    setTimeout(() => {
      const host = target.closest('.oge-pivot-matrix');
      host
        ?.querySelector<HTMLElement>(
          `[data-cell="${String(row)}-${String(col)}"]`,
        )
        ?.focus();
    });
  };

  const onCellClick = (
    rowIndex: number,
    columnIndex: number,
    event: ReactMouseEvent,
    dbl: boolean,
  ): void => {
    const payload = core.cellClickPayload(
      rowIndex,
      columnIndex,
      event.nativeEvent,
    );
    if (!payload) return;
    if (dbl) latest.current.onCellDblClick?.(payload);
    else latest.current.onCellClick?.(payload);
  };

  const dragStart = (field: PivotFieldConfig) => (event: ReactDragEvent) =>
    core.fieldDragStart(field, event);
  const dragEnd = () => core.fieldDragEnd();
  const dragOver = (event: ReactDragEvent) => core.areaDragOver(event);
  const drop =
    (area: PivotFieldConfig['area'] | null) => (event: ReactDragEvent) =>
      core.areaDrop(area ?? null, event);

  // --- render ---------------------------------------------------------------
  const msg = messages;
  const result = core.result();
  const depth = core.columnDepth();
  const template = core.matrixTemplate();
  const measures = core.measures();
  const rowLines = core.rowLines();
  const slotFlags = core.columnSlotFlags();
  const collapsed = core.store.fieldPanelCollapsed();
  const menu = core.menu();
  const popup = core.filterPopup();
  const chooserDraft = core.chooserDraft();
  const fieldPanel = props.fieldPanel ?? true;

  return (
    <div
      className={
        props.className ? `oge-pivot-grid ${props.className}` : 'oge-pivot-grid'
      }
      style={props.style}
      onKeyDown={(event) => {
        if (event.key === 'Escape') core.closePopups();
      }}
    >
      {fieldPanel && (
        <div
          className={
            collapsed
              ? 'oge-pivot-field-panel oge-pivot-panel-collapsed'
              : 'oge-pivot-field-panel'
          }
        >
          <button
            type="button"
            className="oge-pivot-panel-toggle"
            aria-label={
              collapsed ? msg.expandFieldPanel : msg.collapseFieldPanel
            }
            aria-expanded={!collapsed}
            onClick={() => core.store.toggleFieldPanel()}
          >
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
              className={collapsed ? 'oge-pivot-toggle-collapsed' : undefined}
            >
              <path d="m3.5 6 4.5 4.5L12.5 6" />
            </svg>
          </button>
          {!collapsed &&
            core.panelAreas().map((zone) => (
              <div
                key={zone.area}
                className="oge-pivot-area"
                data-area={zone.area}
                onDragOver={dragOver}
                onDrop={drop(zone.area)}
              >
                <span className="oge-pivot-area-label">{zone.label}</span>
                {zone.fields.length ? (
                  zone.fields.map((field) => (
                    <span
                      key={field.id}
                      className={
                        field.filterValues
                          ? 'oge-pivot-field-chip oge-pivot-chip-filtered'
                          : 'oge-pivot-field-chip'
                      }
                      draggable="true"
                      onDragStart={dragStart(field)}
                      onDragEnd={dragEnd}
                      onContextMenu={
                        zone.area === 'data'
                          ? (event) => core.openMeasureMenu(field, event)
                          : undefined
                      }
                    >
                      {field.caption}
                    </span>
                  ))
                ) : (
                  <span className="oge-pivot-area-hint">
                    {msg.fieldPanelHint}
                  </span>
                )}
              </div>
            ))}
        </div>
      )}

      <div
        className="oge-pivot-viewport"
        role="grid"
        ref={viewportRef}
        aria-rowcount={depth + result.rowLeafCount}
        aria-colcount={result.columnLeafCount + 1}
        onScroll={(event) => {
          if (!(latest.current.virtualScrolling ?? false)) return;
          const target = event.currentTarget;
          core.scrollPos.set({
            top: target.scrollTop,
            left: target.scrollLeft,
          });
        }}
      >
        {core.loading() && (
          <div className="oge-load-panel" role="status">
            <span className="oge-spinner" aria-hidden="true"></span>
            {msg.loading}
          </div>
        )}
        <div
          className="oge-pivot-matrix"
          style={{
            gridTemplateRows: template.rows ?? undefined,
            gridTemplateColumns: template.columns,
          }}
        >
          {/* column headers, one role="row" per header level */}
          {core.visibleHeaderRows().map((headerRow) => (
            <div
              key={`h${String(headerRow.rowIndex)}`}
              className="oge-pivot-row"
              role="row"
              aria-rowindex={headerRow.rowIndex}
            >
              {headerRow.rowIndex === 1 && (
                <div
                  className="oge-pivot-corner"
                  role="columnheader"
                  style={{
                    gridRow: `1 / ${String(depth + 1)}`,
                    gridColumn: 1,
                  }}
                ></div>
              )}
              {headerRow.cells.map((cell) => (
                <div
                  key={pivotHeaderCellKey(cell)}
                  className={classes(
                    'oge-pivot-col-header',
                    cell.isTotal && 'oge-pivot-total',
                    cell.isGrandTotal && 'oge-pivot-grand',
                    cell.hasChildren && 'oge-pivot-expandable',
                  )}
                  role="columnheader"
                  aria-expanded={cell.hasChildren ? cell.expanded : undefined}
                  aria-rowindex={cell.rowStart}
                  aria-colindex={cell.columnStart + 1}
                  style={{
                    gridRow: `${String(cell.rowStart)} / ${String(cell.rowEnd)}`,
                    gridColumn: `${String(cell.columnStart + 1)} / span ${String(cell.span)}`,
                  }}
                  tabIndex={headerTabIndex(cell)}
                  onClick={(event) => toggle('column', cell, event)}
                  onKeyDown={(event) => onHeaderKeyDown('column', cell, event)}
                  onContextMenu={(event) =>
                    core.openHeaderMenu('column', cell, event)
                  }
                >
                  {cell.hasChildren && (
                    <span
                      className={
                        cell.expanded
                          ? 'oge-pivot-arrow oge-pivot-arrow-open'
                          : 'oge-pivot-arrow'
                      }
                      aria-hidden="true"
                    >
                      {arrow}
                    </span>
                  )}{' '}
                  {cell.text}
                </div>
              ))}
            </div>
          ))}

          {/* row headers + cells */}
          {core.visibleRowIndexes().map((rowIndex) => {
            const line = rowLines[rowIndex];
            if (!line) return null;
            const ariaRow = depth + 1 + rowIndex;
            return (
              <div
                key={`r${String(rowIndex)}`}
                className="oge-pivot-row"
                role="row"
                aria-rowindex={ariaRow}
              >
                <div
                  className={classes(
                    'oge-pivot-row-header',
                    line.isTotal && 'oge-pivot-total',
                    line.isGrandTotal && 'oge-pivot-grand',
                    line.hasChildren && 'oge-pivot-expandable',
                  )}
                  role="rowheader"
                  aria-expanded={line.hasChildren ? line.expanded : undefined}
                  aria-rowindex={ariaRow}
                  aria-colindex={1}
                  style={{
                    gridRow: ariaRow,
                    gridColumn: 1,
                    paddingInlineStart: `${String(12 + line.level * 18)}px`,
                  }}
                  tabIndex={headerTabIndex(line)}
                  onClick={(event) => toggle('row', line, event)}
                  onKeyDown={(event) => onHeaderKeyDown('row', line, event)}
                  onContextMenu={(event) =>
                    core.openHeaderMenu('row', line, event)
                  }
                >
                  {line.hasChildren && (
                    <span
                      className={
                        line.expanded
                          ? 'oge-pivot-arrow oge-pivot-arrow-open'
                          : 'oge-pivot-arrow'
                      }
                      aria-hidden="true"
                    >
                      {arrow}
                    </span>
                  )}{' '}
                  {line.text}
                </div>
                {core.visibleColumnIndexes().map((columnIndex) => (
                  <div
                    key={`c${String(rowIndex)}-${String(columnIndex)}`}
                    className={classes(
                      'oge-pivot-cell',
                      (line.isTotal || slotFlags.total[columnIndex]) &&
                        'oge-pivot-total',
                      (line.isGrandTotal || slotFlags.grand[columnIndex]) &&
                        'oge-pivot-grand',
                    )}
                    role="gridcell"
                    aria-rowindex={ariaRow}
                    aria-colindex={columnIndex + 2}
                    style={{ gridRow: ariaRow, gridColumn: columnIndex + 2 }}
                    data-cell={`${String(rowIndex)}-${String(columnIndex)}`}
                    tabIndex={
                      core.isCellTabbable(rowIndex, columnIndex) ? 0 : -1
                    }
                    onFocus={() => core.focusCell(rowIndex, columnIndex)}
                    onKeyDown={onMatrixKeyDown}
                    onClick={(event) =>
                      onCellClick(rowIndex, columnIndex, event, false)
                    }
                    onDoubleClick={(event) =>
                      onCellClick(rowIndex, columnIndex, event, true)
                    }
                  >
                    {measures.map((measure, measureIndex) => {
                      const prepared = core.preparedCell(
                        rowIndex,
                        columnIndex,
                        measureIndex,
                      );
                      return (
                        <span
                          key={measure.id}
                          className={classes(
                            'oge-pivot-measure',
                            prepared.cssClass,
                          )}
                        >
                          {prepared.text}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {menu && (
        <div
          className="oge-context-menu"
          role="menu"
          style={{ top: `${String(menu.y)}px`, left: `${String(menu.x)}px` }}
        >
          {menu.items.map((item, index) => (
            <button
              key={index}
              type="button"
              role="menuitem"
              className={
                item.active
                  ? 'oge-menu-item oge-menu-item-active'
                  : 'oge-menu-item'
              }
              disabled={item.disabled}
              onClick={() => core.runMenuItem(item)}
            >
              {item.text}
            </button>
          ))}
        </div>
      )}

      {popup && (
        <div
          className="oge-header-filter-popup oge-pivot-filter-popup"
          role="listbox"
          style={{ top: `${String(popup.y)}px`, left: `${String(popup.x)}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="oge-chooser-title">{popup.caption}</div>
          <div className="oge-pivot-filter-type">
            <label>
              <input
                type="radio"
                name="oge-pivot-filter-type"
                checked={popup.type === 'include'}
                onChange={() => core.setFilterType('include')}
              />{' '}
              {msg.includeValues}
            </label>
            <label>
              <input
                type="radio"
                name="oge-pivot-filter-type"
                checked={popup.type === 'exclude'}
                onChange={() => core.setFilterType('exclude')}
              />{' '}
              {msg.excludeValues}
            </label>
          </div>
          <input
            className="oge-hf-search"
            type="search"
            placeholder={msg.search}
            aria-label={msg.search}
            value={core.filterSearch()}
            onChange={(event) => core.filterSearch.set(event.target.value)}
          />
          <label className="oge-hf-item oge-hf-all">
            <input
              type="checkbox"
              checked={popup.selected.size === popup.values.length}
              onChange={() => core.toggleAllFilterValues()}
            />
            <span>{msg.selectAllValues}</span>
          </label>
          {core.visibleFilterValues().map((value, index) => (
            <label key={index} className="oge-hf-item">
              <input
                type="checkbox"
                checked={popup.selected.has(value)}
                onChange={() => core.toggleFilterValue(value)}
              />
              <span>{core.filterValueText(value)}</span>
            </label>
          ))}
          <div className="oge-pivot-popup-actions">
            <button
              type="button"
              className="oge-tool-btn oge-tool-text-btn oge-btn-accent"
              onClick={() => core.applyFilterPopup()}
            >
              {msg.apply}
            </button>
            <button
              type="button"
              className="oge-tool-btn oge-tool-text-btn"
              onClick={() => core.clearFilterPopup()}
            >
              {msg.clearFilter}
            </button>
          </div>
        </div>
      )}

      {core.chooserOpen() && (
        <>
          <div className="oge-popup-backdrop"></div>
          <div
            className="oge-edit-popup oge-pivot-chooser"
            role="dialog"
            aria-modal="true"
            aria-label={msg.fieldChooserTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="oge-popup-title">{msg.fieldChooserTitle}</div>
            <input
              className="oge-hf-search"
              type="search"
              placeholder={msg.search}
              aria-label={msg.search}
              value={core.chooserSearch()}
              onChange={(event) => core.chooserSearch.set(event.target.value)}
            />
            <div className="oge-pivot-chooser-grid">
              <div
                className="oge-pivot-chooser-zone oge-pivot-chooser-all"
                onDragOver={dragOver}
                onDrop={drop(null)}
              >
                <span className="oge-pivot-area-label">{msg.allFields}</span>
                {core.chooserAllFields().map((field) => (
                  <span
                    key={field.id}
                    className={
                      field.area === null || field.area === undefined
                        ? 'oge-pivot-field-chip oge-pivot-chip-unused'
                        : 'oge-pivot-field-chip'
                    }
                    draggable="true"
                    onDragStart={dragStart(field)}
                    onDragEnd={dragEnd}
                  >
                    {field.caption}
                  </span>
                ))}
              </div>
              {core.panelAreas().map((zone) => (
                <div
                  key={zone.area}
                  className="oge-pivot-chooser-zone"
                  data-area={zone.area}
                  onDragOver={dragOver}
                  onDrop={drop(zone.area)}
                >
                  <span className="oge-pivot-area-label">{zone.label}</span>
                  {core.chooserAreaFields(zone.area).map((field) => (
                    <span
                      key={field.id}
                      className="oge-pivot-field-chip"
                      draggable="true"
                      onDragStart={dragStart(field)}
                      onDragEnd={dragEnd}
                    >
                      {field.caption}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <div className="oge-pivot-popup-actions">
              {chooserDraft ? (
                <>
                  <button
                    type="button"
                    className="oge-tool-btn oge-tool-text-btn oge-btn-accent"
                    onClick={() => core.applyFieldChooser()}
                  >
                    {msg.apply}
                  </button>
                  <button
                    type="button"
                    className="oge-tool-btn oge-tool-text-btn"
                    onClick={() => core.closeFieldChooser()}
                  >
                    {msg.cancel}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="oge-tool-btn oge-tool-text-btn"
                  onClick={() => core.closeFieldChooser()}
                >
                  {msg.apply}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function classes(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Pivot grid for React: local rows or a remote `OgePivotStore`, four field
 * areas, multi-level column headers, expand/collapse on both axes, sub and
 * grand totals, a drag & drop field panel, header and measure menus, value
 * filters, a field chooser and two-axis virtualization.
 *
 * It renders the exact `.oge-pivot-*` markup `@oge-ui/pivot` renders, over the
 * same `OgePivotGridCore` from `@oge-ui/pivot-engine` — one engine, one
 * stylesheet, two render layers.
 *
 * ```tsx
 * <OgePivotGrid
 *   data={sales}
 *   fields={[
 *     { dataField: 'region', area: 'row' },
 *     { dataField: 'amount', area: 'data', summaryType: 'sum' },
 *   ]}
 * />
 * ```
 */
export const OgePivotGrid = forwardRef(OgePivotGridInner) as <T = unknown>(
  props: OgePivotGridProps<T> & { ref?: Ref<OgePivotGridHandle<T>> },
) => ReactElement;
