'use client';

import {
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ForwardedRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type CSSProperties,
  type ReactElement,
  type Ref,
} from 'react';
import { OgeGridStatePersistenceCore } from '@oge-ui/behavior';
import { ogeDefaultLocale } from '@oge-ui/core';
import type {
  PivotArea,
  PivotFieldConfig,
  PivotGridStateSnapshot,
  PivotResult,
} from '@oge-ui/core';
import {
  OgePivotGridCore,
  focusPivotChip,
  pivotHeaderCellKey,
  pivotIsMenuKey,
  pivotIsRtl,
  pivotKeyboardPointer,
  type OgePivotAxisLine,
  type OgePivotCalculatedField,
  type OgePivotRowHeaderLayout,
  type OgePivotHeaderCell,
  type OgePivotMenuItem,
  type OgePivotFieldDef,
  type OgePivotMessages,
} from '@oge-ui/pivot-engine';
import { useOgeGridStateStorage } from '@oge-ui/react-grid';
import { useOgePivotConfig, useOgePivotMessages } from './pivot-config';
import type { OgePivotGridHandle, OgePivotGridProps } from './pivot-types';
import { createPivotRxAdapter } from './rx-adapter';

const NO_ROWS: readonly never[] = [];
const NO_FIELDS: readonly never[] = [];
const NO_CHOOSER = {};
const NO_CALCS: readonly never[] = [];

/** The label-column count of the outline / tabular row headers. */
const segmentColumns = (count: number): CSSProperties =>
  ({ '--oge-pivot-rh-columns': count }) as CSSProperties;

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

/** `aria-keyshortcuts` of a chip placed in an area. */
const CHIP_SHORTCUTS =
  'Enter Shift+F10 Control+ArrowLeft Control+ArrowRight Control+ArrowUp Control+ArrowDown Delete';
/** `aria-keyshortcuts` of a chip in the chooser's All Fields list. */
const LIST_CHIP_SHORTCUTS = 'Enter Shift+F10';

function OgePivotGridInner<T>(
  props: OgePivotGridProps<T>,
  ref: ForwardedRef<OgePivotGridHandle<T>>,
): ReactElement {
  const contextMessages = useOgePivotMessages();
  const pivotConfig = useOgePivotConfig();
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
      calculatedFields: rx.input<readonly OgePivotCalculatedField[]>(NO_CALCS),
      rowHeaderLayout: rx.input<OgePivotRowHeaderLayout>('compact'),
      locale: rx.input<string | undefined>(undefined),
      rtlEnabled: rx.input<boolean | undefined>(undefined),
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
        calculatedFields: input.calculatedFields,
        rowHeaderLayout: input.rowHeaderLayout,
        locale: input.locale,
        rtlEnabled: input.rtlEnabled,
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
  model.input.calculatedFields.set(props.calculatedFields ?? NO_CALCS);
  model.input.rowHeaderLayout.set(props.rowHeaderLayout ?? 'compact');
  // the prop, the provider, then the browser language
  model.input.locale.set(
    props.locale ?? pivotConfig.locale ?? ogeDefaultLocale(),
  );
  model.input.rtlEnabled.set(props.rtlEnabled);

  const viewportRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  // the element that opened the context menu, for focus return (DOM-only)
  const menuOpener = useRef<{ el: HTMLElement; inChooser: boolean } | null>(
    null,
  );

  // --- lifecycle ------------------------------------------------------------
  // StrictMode runs cleanup → remount on the same instance: revive on mount
  useEffect(() => {
    core.revive();
    return () => core.dispose();
  }, [core]);

  // the rtlEnabled fallback: the page direction, kept current
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    return core.watchDirection(host);
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

  // a linked chart follows the materialized view (identity changes only)
  const viewResult = core.result();
  const lastResult = useRef<PivotResult | null>(null);
  useEffect(() => {
    if (lastResult.current === viewResult) return;
    lastResult.current = viewResult;
    latest.current.onResultChange?.(viewResult);
  });

  useImperativeHandle(
    ref,
    (): OgePivotGridHandle<T> => ({
      getResult: () => core.getResult(),
      getChartData: (options) => core.getChartData(options) as never,
      getPreparedCell: (rowIndex, columnIndex, measureIndex) =>
        core.preparedCell(rowIndex, columnIndex, measureIndex),
      getRowFieldCaptions: () => core.rowFieldCaptions(),
      getRowHeaderLayout: () => core.rowHeaderLayout(),
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

  // --- keyboard: one APG grid over headers + values ------------------------
  const onGridKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    const target = event.currentTarget;
    const outcome = core.gridKeydown(
      event,
      pivotIsRtl(target, props.rtlEnabled),
    );
    if (!outcome) return;
    event.preventDefault();
    if (!outcome.moved) return;
    const matrix = target.closest('.oge-pivot-matrix');
    // move DOM focus to the newly tabbable element once it rendered
    setTimeout(() =>
      matrix?.querySelector<HTMLElement>(outcome.selector)?.focus(),
    );
  };

  const focusMenuItem = (): void => {
    setTimeout(() => {
      hostRef.current
        ?.querySelector<HTMLButtonElement>(
          '.oge-context-menu .oge-menu-item:not(:disabled)',
        )
        ?.focus();
    });
  };

  /** After the menu closed: back to its opener, or to the chip it moved. */
  const restoreMenuFocus = (): void => {
    const opener = menuOpener.current;
    menuOpener.current = null;
    if (!opener) return;
    setTimeout(() => {
      if (opener.el.isConnected) {
        opener.el.focus();
        return;
      }
      const id = opener.el.dataset['fieldId'];
      const host = hostRef.current;
      if (id === undefined || !host) return;
      const area =
        core.chooserFields().find((field) => field.id === id)?.area ?? null;
      focusPivotChip(host, id, area, opener.inChooser, null);
    });
  };

  const onHeaderKeyDown = (
    axis: 'row' | 'column',
    line: OgePivotAxisLine,
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    const target = event.currentTarget;
    if (event.key === 'Enter' || event.key === ' ') {
      toggle(axis, line, event);
      return;
    }
    if (pivotIsMenuKey(event)) {
      menuOpener.current = { el: target, inChooser: false };
      core.openHeaderMenu(
        axis,
        line,
        pivotKeyboardPointer(
          event,
          target.getBoundingClientRect(),
          pivotIsRtl(target, props.rtlEnabled),
        ),
      );
      focusMenuItem();
      return;
    }
    onGridKeyDown(event);
  };

  // --- keyboard: field chips -------------------------------------------------
  const onChipKeyDown =
    (field: PivotFieldConfig, zone: PivotArea | null) =>
    (event: ReactKeyboardEvent<HTMLElement>): void => {
      const chip = event.currentTarget;
      const rect = chip.getBoundingClientRect();
      const rtl = pivotIsRtl(chip, props.rtlEnabled);
      const outcome = core.fieldChipKeydown(
        field,
        zone,
        event,
        { x: rtl ? rect.right : rect.left, y: rect.bottom },
        rtl,
      );
      if (!outcome) return;
      const inChooser = !!chip.closest('.oge-pivot-chooser');
      if (outcome.kind === 'menu') {
        menuOpener.current = { el: chip, inChooser };
        focusMenuItem();
        return;
      }
      setTimeout(() => {
        const host = hostRef.current;
        if (host)
          focusPivotChip(host, outcome.fieldId, outcome.area, inChooser, zone);
      });
    };

  const onChipContextMenu =
    (field: PivotFieldConfig, zone: PivotArea | null) =>
    (event: ReactMouseEvent<HTMLElement>): void => {
      const chip = event.currentTarget;
      menuOpener.current = {
        el: chip,
        inChooser: !!chip.closest('.oge-pivot-chooser'),
      };
      core.openFieldContextMenu(field, zone, event);
    };

  const onHeaderContextMenu = (
    axis: 'row' | 'column',
    line: OgePivotAxisLine,
    event: ReactMouseEvent<HTMLElement>,
  ): void => {
    menuOpener.current = { el: event.currentTarget, inChooser: false };
    core.openHeaderMenu(axis, line, event);
  };

  const runMenuItem = (item: OgePivotMenuItem): void => {
    const opener = menuOpener.current;
    if (core.runMenuItem(item, opener?.inChooser ?? false)) restoreMenuFocus();
    else menuOpener.current = null;
  };

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('.oge-menu-item'),
    );
    const index = items.indexOf(event.target as HTMLButtonElement);
    const outcome = core.menuKeydown(event.key, index);
    if (!outcome) return;
    event.preventDefault();
    event.stopPropagation();
    if (outcome.kind === 'close') restoreMenuFocus();
    else items[outcome.index]?.focus();
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

  const focusColumnHeader = (cell: OgePivotHeaderCell): void =>
    core.focusColumnHeader(cell);

  // field chips move with a pointer drag (long press under touch); the core
  // owns the hit-testing, the indicator state and the drop (`moveFieldTo`)
  const fieldPointerDown =
    (field: PivotFieldConfig) => (event: ReactPointerEvent<HTMLElement>) =>
      core.fieldPointerDown(field, event, event.currentTarget);
  const dropTarget = core.fieldDropTarget();
  const zoneClass = (base: string, area: PivotFieldConfig['area'] | null) =>
    dropTarget !== null && dropTarget.area === (area ?? null)
      ? `${base} oge-pivot-area-drop-active`
      : base;
  const chipClass = (
    base: string,
    area: PivotFieldConfig['area'] | null,
    id: string,
  ) =>
    dropTarget !== null &&
    dropTarget.area === (area ?? null) &&
    dropTarget.beforeId === id
      ? `${base} oge-pivot-chip-drop-target`
      : base;

  // --- render ---------------------------------------------------------------
  const msg = messages;
  const result = core.result();
  const depth = core.columnDepth();
  const template = core.matrixTemplate();
  const measures = core.measures();
  const rowLines = core.rowLines();
  const segments = core.rowHeaderSegments();
  const fieldCaptions = core.rowFieldCaptions();
  const slotFlags = core.columnSlotFlags();
  const collapsed = core.store.fieldPanelCollapsed();
  const menu = core.menu();
  const popup = core.filterPopup();
  const chooserDraft = core.chooserDraft();
  const fieldPanel = props.fieldPanel ?? true;

  return (
    <div
      ref={hostRef}
      className={
        props.className ? `oge-pivot-grid ${props.className}` : 'oge-pivot-grid'
      }
      style={props.style}
      dir={
        props.rtlEnabled === undefined
          ? undefined
          : props.rtlEnabled
            ? 'rtl'
            : 'ltr'
      }
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        const hadMenu = !!core.menu();
        core.closePopups();
        if (hadMenu) restoreMenuFocus();
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
                className={zoneClass('oge-pivot-area', zone.area)}
                role="group"
                aria-label={zone.label}
                data-area={zone.area}
              >
                <span className="oge-pivot-area-label">{zone.label}</span>
                {zone.fields.length ? (
                  zone.fields.map((field) => (
                    <span
                      key={field.id}
                      className={chipClass(
                        field.filterValues
                          ? 'oge-pivot-field-chip oge-pivot-chip-filtered'
                          : 'oge-pivot-field-chip',
                        zone.area,
                        field.id,
                      )}
                      role="button"
                      tabIndex={0}
                      aria-haspopup="menu"
                      aria-keyshortcuts={CHIP_SHORTCUTS}
                      data-field-id={field.id}
                      onPointerDown={fieldPointerDown(field)}
                      onContextMenu={onChipContextMenu(field, zone.area)}
                      onKeyDown={onChipKeyDown(field, zone.area)}
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
                >
                  {segments ? (
                    <span
                      className="oge-pivot-rh-segments"
                      style={segmentColumns(fieldCaptions.length || 1)}
                    >
                      {fieldCaptions.map((caption, index) => (
                        <Fragment key={index}>
                          <span className="oge-pivot-rh-segment">
                            {caption}
                          </span>{' '}
                        </Fragment>
                      ))}
                    </span>
                  ) : null}
                </div>
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
                  data-hpos={core.columnHeaderPos(cell)}
                  tabIndex={core.isColumnHeaderTabbable(cell) ? 0 : -1}
                  onFocus={() => focusColumnHeader(cell)}
                  onClick={(event) => toggle('column', cell, event)}
                  onKeyDown={(event) => onHeaderKeyDown('column', cell, event)}
                  onContextMenu={(event) =>
                    onHeaderContextMenu('column', cell, event)
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
                  {props.renderColumnHeader
                    ? props.renderColumnHeader(cell)
                    : cell.text}
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
                    paddingInlineStart: `${String(segments ? 12 : 12 + line.level * 18)}px`,
                  }}
                  data-hpos={core.rowHeaderPos(rowIndex)}
                  tabIndex={core.isRowHeaderTabbable(rowIndex) ? 0 : -1}
                  onFocus={() => core.focusRowHeader(rowIndex)}
                  onClick={(event) => toggle('row', line, event)}
                  onKeyDown={(event) => onHeaderKeyDown('row', line, event)}
                  onContextMenu={(event) =>
                    onHeaderContextMenu('row', line, event)
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
                  {props.renderRowHeader ? (
                    props.renderRowHeader(line, {
                      rowIndex,
                      segments: segments?.[rowIndex] ?? null,
                    })
                  ) : segments?.[rowIndex] ? (
                    <span
                      className="oge-pivot-rh-segments"
                      style={segmentColumns(segments[rowIndex].length)}
                    >
                      {segments[rowIndex].map((segment, index) => (
                        <Fragment key={index}>
                          <span className="oge-pivot-rh-segment">
                            {segment}
                          </span>{' '}
                        </Fragment>
                      ))}
                    </span>
                  ) : (
                    line.text
                  )}
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
                    onKeyDown={onGridKeyDown}
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
                          {props.renderCell
                            ? props.renderCell({
                                ...prepared,
                                rowIndex,
                                columnIndex,
                                measureIndex,
                              })
                            : prepared.text}
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

      <div className="oge-pivot-live" aria-live="polite" aria-atomic="true">
        {core.announcement()}
      </div>

      {menu && (
        <div
          className="oge-context-menu"
          role="menu"
          tabIndex={-1}
          aria-label={menu.label}
          style={{ top: `${String(menu.y)}px`, left: `${String(menu.x)}px` }}
          onKeyDown={onMenuKeyDown}
        >
          {menu.items.map((item, index) => (
            <button
              key={index}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={
                item.active
                  ? 'oge-menu-item oge-menu-item-active'
                  : 'oge-menu-item'
              }
              disabled={item.disabled}
              onClick={() => runMenuItem(item)}
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
                className={zoneClass(
                  'oge-pivot-chooser-zone oge-pivot-chooser-all',
                  null,
                )}
                role="group"
                aria-label={msg.allFields}
              >
                <span className="oge-pivot-area-label">{msg.allFields}</span>
                {core.chooserAllFields().map((field) => (
                  <span
                    key={field.id}
                    className={chipClass(
                      field.area === null || field.area === undefined
                        ? 'oge-pivot-field-chip oge-pivot-chip-unused'
                        : 'oge-pivot-field-chip',
                      null,
                      field.id,
                    )}
                    role="button"
                    tabIndex={0}
                    aria-haspopup="menu"
                    aria-keyshortcuts={LIST_CHIP_SHORTCUTS}
                    data-field-id={field.id}
                    onPointerDown={fieldPointerDown(field)}
                    onContextMenu={onChipContextMenu(field, null)}
                    onKeyDown={onChipKeyDown(field, null)}
                  >
                    {field.caption}
                  </span>
                ))}
              </div>
              {core.panelAreas().map((zone) => (
                <div
                  key={zone.area}
                  className={zoneClass('oge-pivot-chooser-zone', zone.area)}
                  role="group"
                  aria-label={zone.label}
                  data-area={zone.area}
                >
                  <span className="oge-pivot-area-label">{zone.label}</span>
                  {core.chooserAreaFields(zone.area).map((field) => (
                    <span
                      key={field.id}
                      className={chipClass(
                        'oge-pivot-field-chip',
                        zone.area,
                        field.id,
                      )}
                      role="button"
                      tabIndex={0}
                      aria-haspopup="menu"
                      aria-keyshortcuts={CHIP_SHORTCUTS}
                      data-field-id={field.id}
                      onPointerDown={fieldPointerDown(field)}
                      onContextMenu={onChipContextMenu(field, zone.area)}
                      onKeyDown={onChipKeyDown(field, zone.area)}
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
