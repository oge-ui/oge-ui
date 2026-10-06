'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  OGE_TILE_LAYOUT_DEFAULTS,
  beginPointerGesture,
  getOgeLiveAnnouncer,
  ogeIsRtl,
  ogeTileLayoutAutoRows,
  ogeTileLayoutClampResize,
  ogeTileLayoutDropIndex,
  ogeTileLayoutKeyIntent,
  ogeTileLayoutMoveState,
  ogeTileLayoutMovedText,
  ogeTileLayoutResizeSpan,
  ogeTileLayoutResizeState,
  ogeTileLayoutResizedText,
  ogeTileLayoutResolve,
  ogeTileLayoutShortcuts,
  ogeTileLayoutStep,
  ogeTileLayoutTabStop,
  ogeTileLayoutTemplateColumns,
  ogeTileLayoutTileLabel,
  ogeTileLayoutToState,
  ogeTileLayoutUnchangedText,
  sanitizeOgeTileLayoutState,
  type OgePointerGestureHandle,
  type OgeTileLayoutChangeSource,
  type OgeTileLayoutChangedEvent,
  type OgeTileLayoutItemData,
  type OgeTileLayoutKey,
  type OgeTileLayoutRect,
  type OgeTileLayoutReorderedEvent,
  type OgeTileLayoutReorderingEvent,
  type OgeTileLayoutResizable,
  type OgeTileLayoutResizedEvent,
  type OgeTileLayoutResizingEvent,
  type OgeTileLayoutResolvedTile,
  type OgeTileLayoutSpan,
  type OgeTileLayoutState,
} from '@oge-ui/behavior';
import { useOgeTileLayoutConfig } from './layout-config';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/** Argument of `renderHeader` / `renderContent` — the Angular template context. */
export interface OgeTileLayoutRenderContext {
  /** The tile's data. */
  item: OgeTileLayoutItemData;
  /** Its identity. */
  key: OgeTileLayoutKey;
  /** Its 0-based display position. */
  index: number;
  /** Its current column span (the live preview while resizing). */
  colSpan: number;
  /** Its current row span (the live preview while resizing). */
  rowSpan: number;
}

export interface OgeTileLayoutProps {
  /** The tiles. `key` identifies a tile in every event and in the state. */
  items?: readonly OgeTileLayoutItemData[];
  /** Number of grid columns; falls back to the config, then 4. */
  columns?: number;
  /** Height of one row in px, or `'auto'` (content height); config, then 160. */
  rowHeight?: number | 'auto';
  /** Gap between tiles in px; config, then 16. */
  gap?: number;
  /** Fixed column width (`240` px or any CSS length); default equal `1fr` columns. */
  columnWidth?: number | string;
  /** Default resizability of every tile (`OgeTileLayoutItemData.resizable` overrides). */
  resizable?: OgeTileLayoutResizable;
  /** Default reorderability of every tile (default `true`). */
  reorderable?: boolean;
  /** Accessible name of the list; falls back to the `layoutLabel` message. */
  ariaLabel?: string;
  /** BCP 47 locale of the announcements' plural rules; config, then the runtime default. */
  locale?: string;
  /**
   * The committed layout (controlled). Passing the prop — even as
   * `undefined`, which means "lay the tiles out from their own order and
   * spans" — makes the component controlled.
   */
  state?: OgeTileLayoutState;
  /** Initial layout when uncontrolled. */
  defaultState?: OgeTileLayoutState;
  /** Every committed layout — the controlled half of `state`. */
  onStateChange?: (state: OgeTileLayoutState) => void;
  /** Replaces the header title of every tile — the Angular `[ogeTileLayoutHeaderTemplate]`. */
  renderHeader?: (context: OgeTileLayoutRenderContext) => ReactNode;
  /** The body of every tile — the Angular `[ogeTileLayoutContentTemplate]`. */
  renderContent?: (context: OgeTileLayoutRenderContext) => ReactNode;
  /** A tile is about to move — set `cancel` to keep it. */
  onReordering?: (event: OgeTileLayoutReorderingEvent) => void;
  /** A tile moved. */
  onReordered?: (event: OgeTileLayoutReorderedEvent) => void;
  /** A tile is about to change its spans — set `cancel` to keep them. */
  onResizing?: (event: OgeTileLayoutResizingEvent) => void;
  /** A tile changed its spans. */
  onResized?: (event: OgeTileLayoutResizedEvent) => void;
  /** The layout changed (move, resize, `applyState`) — persist `state`. */
  onLayoutChanged?: (event: OgeTileLayoutChangedEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeTileLayout>` — the Angular public methods. */
export interface OgeTileLayoutHandle {
  /** Focuses the tile with `key` (default: the current tab stop). */
  focus(key?: OgeTileLayoutKey): void;
  /** The current layout as a serializable state. */
  getState(): OgeTileLayoutState;
  /** Validates and applies a persisted / imported state; `false` when invalid. */
  applyState(state: unknown): boolean;
  /** Moves a tile through the cancelable pipeline. */
  moveTile(key: OgeTileLayoutKey, toIndex: number): boolean;
  /** Gives a tile new spans (clamped) through the cancelable pipeline. */
  resizeTile(key: OgeTileLayoutKey, colSpan: number, rowSpan: number): boolean;
}

const EMPTY: readonly OgeTileLayoutItemData[] = [];
const DRAG_EXCLUDED =
  'button, a[href], input, select, textarea, [contenteditable=""], [contenteditable="true"], [data-oge-no-drag]';

type Tile = OgeTileLayoutResolvedTile<OgeTileLayoutItemData>;

/**
 * A dashboard of tiles on a CSS grid — the React render of the Angular
 * `<oge-tile-layout>`, same markup, stylesheet and decisions: a labelled
 * `role="list"` of focusable `role="group"` tiles with one roving tab stop,
 * drag by the header to reorder, a corner handle to resize, `Ctrl+Arrow` /
 * `Ctrl+Shift+Arrow` keyboard twins running the same commit, announcements
 * through the shared live region and a serializable state.
 *
 * ```tsx
 * <OgeTileLayout
 *   columns={4}
 *   items={tiles}
 *   resizable
 *   state={layout}
 *   onStateChange={setLayout}
 *   renderContent={({ item }) => <Kpi id={item.key} />}
 * />
 * ```
 */
export const OgeTileLayout = forwardRef<
  OgeTileLayoutHandle,
  OgeTileLayoutProps
>(function OgeTileLayout(props, ref) {
  const config = useOgeTileLayoutConfig();
  const messages = config.messages;
  const items = props.items ?? EMPTY;
  const columns =
    props.columns ?? config.columns ?? OGE_TILE_LAYOUT_DEFAULTS.columns;
  const gap = props.gap ?? config.gap ?? OGE_TILE_LAYOUT_DEFAULTS.gap;
  const rowHeight =
    props.rowHeight ?? config.rowHeight ?? OGE_TILE_LAYOUT_DEFAULTS.rowHeight;
  const resizable = props.resizable ?? false;
  const reorderable = props.reorderable ?? true;
  const locale = props.locale ?? config.locale;
  const idPrefix = `oge-tile-layout-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hintId = `${idPrefix}-hint`;

  const [uncontrolled, setUncontrolled] = useState<
    OgeTileLayoutState | undefined
  >(props.defaultState);
  const controlled = 'state' in props;
  const state = controlled ? props.state : uncontrolled;

  const hostRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  // the committed state, ahead of the render — two keys can arrive before one
  const stateRef = useRef(state);
  stateRef.current = state;

  const resolve = (s: OgeTileLayoutState | undefined): Tile[] =>
    ogeTileLayoutResolve(items, {
      columns,
      resizable,
      reorderable,
      state: s ?? null,
    });
  const tiles = useMemo(
    () => resolve(state),
    [items, columns, resizable, reorderable, state],
  );

  const [focusKey, setFocusKey] = useState<OgeTileLayoutKey | null>(null);
  // derived, never effect-seeded: the first paint already has its tab stop
  const tabStop = ogeTileLayoutTabStop(tiles, focusKey);

  const [drag, setDrag] = useState<{
    key: OgeTileLayoutKey;
    x: number;
    y: number;
    over: OgeTileLayoutKey | null;
  } | null>(null);
  const [preview, setPreview] = useState<{
    key: OgeTileLayoutKey;
    span: OgeTileLayoutSpan;
  } | null>(null);
  const gestureRef = useRef<OgePointerGestureHandle | null>(null);
  const pendingFocus = useRef<OgeTileLayoutKey | null>(null);

  useEffect(
    () => () => {
      gestureRef.current?.cancel();
      gestureRef.current = null;
    },
    [],
  );

  const tileElements = () =>
    Array.from(
      hostRef.current?.querySelectorAll<HTMLElement>('.oge-tile-layout-tile') ??
        [],
    );
  const tileElement = (key: OgeTileLayoutKey) =>
    tileElements().find(
      (el) => el.getAttribute('data-oge-tile-key') === String(key),
    ) ?? null;
  const measure = (): OgeTileLayoutRect[] =>
    tileElements().map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
  const isRtl = () => ogeIsRtl(hostRef.current);
  const announce = (message: string) => getOgeLiveAnnouncer().announce(message);
  const labelOf = (tile: Tile) =>
    ogeTileLayoutTileLabel(tile, messages, locale);
  const unchanged = (tile: Tile) =>
    ogeTileLayoutUnchangedText(messages, labelOf(tile), locale);

  useIsomorphicLayoutEffect(() => {
    const key = pendingFocus.current;
    if (key === null) return;
    pendingFocus.current = null;
    tileElement(key)?.focus();
  });

  const writeState = (next: OgeTileLayoutState) => {
    stateRef.current = next;
    if (!('state' in latest.current)) setUncontrolled(next);
    latest.current.onStateChange?.(next);
  };
  const changed = (source: OgeTileLayoutChangeSource) =>
    latest.current.onLayoutChanged?.({
      state: ogeTileLayoutToState(resolve(stateRef.current)),
      source,
    });

  const commitMove = (
    key: OgeTileLayoutKey,
    toIndex: number,
    source: OgeTileLayoutChangeSource,
    event?: Event,
  ): boolean => {
    const current = resolve(stateRef.current);
    const tile = current.find((t) => t.key === key);
    if (!tile) return false;
    const to = Math.max(0, Math.min(Math.round(toIndex), current.length - 1));
    if (to === tile.index || !tile.reorderable) {
      if (source !== 'api') announce(unchanged(tile));
      return false;
    }
    const reordering: OgeTileLayoutReorderingEvent = {
      item: tile.item,
      key,
      fromIndex: tile.index,
      toIndex: to,
      source,
      event,
      cancel: false,
    };
    latest.current.onReordering?.(reordering);
    if (reordering.cancel) {
      if (source !== 'api') announce(unchanged(tile));
      return false;
    }
    writeState(ogeTileLayoutMoveState(current, tile.index, to));
    const done: OgeTileLayoutReorderedEvent = {
      item: reordering.item,
      key,
      fromIndex: reordering.fromIndex,
      toIndex: to,
      source,
      event,
    };
    latest.current.onReordered?.(done);
    changed(source);
    announce(
      ogeTileLayoutMovedText(
        messages,
        labelOf(tile),
        to + 1,
        current.length,
        locale,
      ),
    );
    if (source !== 'api') {
      pendingFocus.current = key;
      setFocusKey(key);
    }
    return true;
  };

  const commitResize = (
    key: OgeTileLayoutKey,
    span: OgeTileLayoutSpan,
    source: OgeTileLayoutChangeSource,
    event?: Event,
  ): boolean => {
    const current = resolve(stateRef.current);
    const tile = current.find((t) => t.key === key);
    if (!tile) return false;
    const next = ogeTileLayoutClampResize(tile, span);
    const previous = { colSpan: tile.colSpan, rowSpan: tile.rowSpan };
    if (
      next.colSpan === previous.colSpan &&
      next.rowSpan === previous.rowSpan
    ) {
      if (source !== 'api') announce(unchanged(tile));
      return false;
    }
    const resizing: OgeTileLayoutResizingEvent = {
      item: tile.item,
      key,
      previous,
      next,
      source,
      event,
      cancel: false,
    };
    latest.current.onResizing?.(resizing);
    if (resizing.cancel) {
      if (source !== 'api') announce(unchanged(tile));
      return false;
    }
    writeState(ogeTileLayoutResizeState(current, tile.index, next));
    const done: OgeTileLayoutResizedEvent = {
      item: resizing.item,
      key,
      previous,
      next,
      source,
      event,
    };
    latest.current.onResized?.(done);
    changed(source);
    announce(ogeTileLayoutResizedText(messages, labelOf(tile), next, locale));
    if (source !== 'api') {
      pendingFocus.current = key;
      setFocusKey(key);
    }
    return true;
  };

  const focus = (key?: OgeTileLayoutKey) => {
    const target =
      key ?? ogeTileLayoutTabStop(resolve(stateRef.current), focusKey);
    if (target !== null && target !== undefined) tileElement(target)?.focus();
  };

  const api = {
    focus,
    getState: () => ogeTileLayoutToState(resolve(stateRef.current)),
    applyState: (input: unknown) => {
      const clean = sanitizeOgeTileLayoutState(
        input,
        items.map((i) => i.key),
      );
      if (!clean) return false;
      writeState(clean);
      changed('api');
      return true;
    },
    moveTile: (key: OgeTileLayoutKey, toIndex: number) =>
      commitMove(key, toIndex, 'api'),
    resizeTile: (key: OgeTileLayoutKey, colSpan: number, rowSpan: number) =>
      commitResize(key, { colSpan, rowSpan }, 'api'),
  };
  const apiRef = useRef(api);
  apiRef.current = api;
  useImperativeHandle(
    ref,
    () => ({
      focus: (k) => apiRef.current.focus(k),
      getState: () => apiRef.current.getState(),
      applyState: (s) => apiRef.current.applyState(s),
      moveTile: (k, i) => apiRef.current.moveTile(k, i),
      resizeTile: (k, c, r) => apiRef.current.resizeTile(k, c, r),
    }),
    [],
  );

  const onTileKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    key: OgeTileLayoutKey,
  ) => {
    // keys only act on the tile itself — a field inside keeps its arrows
    if (event.target !== event.currentTarget) return;
    const intent = ogeTileLayoutKeyIntent(event, isRtl());
    const current = resolve(stateRef.current);
    const tile = current.find((t) => t.key === key);
    if (!intent || !tile) return;
    const native = event.nativeEvent;
    if (intent.type === 'focus') {
      event.preventDefault();
      const to = ogeTileLayoutStep(measure(), tile.index, intent.to, columns);
      const target = to >= 0 ? current[to] : undefined;
      if (target) tileElement(target.key)?.focus();
      return;
    }
    if (intent.type === 'move') {
      if (!tile.reorderable) return;
      event.preventDefault();
      const to =
        intent.to === 'prev'
          ? tile.index - 1
          : intent.to === 'next'
            ? tile.index + 1
            : ogeTileLayoutStep(measure(), tile.index, intent.to, columns);
      if (to < 0 || to >= current.length) {
        announce(unchanged(tile));
        return;
      }
      commitMove(key, to, 'keyboard', native);
      return;
    }
    const axisOk = intent.axis === 'col' ? tile.resizeColumns : tile.resizeRows;
    if (!axisOk) return;
    event.preventDefault();
    commitResize(
      key,
      intent.axis === 'col'
        ? { colSpan: tile.colSpan + intent.delta, rowSpan: tile.rowSpan }
        : { colSpan: tile.colSpan, rowSpan: tile.rowSpan + intent.delta },
      'keyboard',
      native,
    );
  };

  const onHeaderPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    tile: Tile,
  ) => {
    if (!tile.reorderable || event.button !== 0 || gestureRef.current) return;
    const target = event.target as Element | null;
    if (target?.closest?.(DRAG_EXCLUDED)) return;
    const rects = measure();
    const startX = event.clientX;
    const startY = event.clientY;
    tileElement(tile.key)?.focus({ preventScroll: true });
    let to = tile.index;
    gestureRef.current = beginPointerGesture(event, {
      longPress: 0,
      source: event.currentTarget,
      suppressClick: true,
      onMove: (dx, dy) => {
        to = ogeTileLayoutDropIndex(
          rects,
          startX + dx,
          startY + dy,
          tile.index,
        );
        const over = resolve(stateRef.current)[to];
        setDrag({
          key: tile.key,
          x: dx,
          y: dy,
          over: over && to !== tile.index ? over.key : null,
        });
      },
      onFinish: (commit, cancelled) => {
        gestureRef.current = null;
        setDrag(null);
        if (cancelled) announce(messages.dragCancelled);
        else if (commit && to !== tile.index)
          commitMove(tile.key, to, 'pointer');
      },
    });
  };

  const onResizePointerDown = (
    event: ReactPointerEvent<HTMLSpanElement>,
    tile: Tile,
  ) => {
    if (event.button !== 0 || gestureRef.current) return;
    event.stopPropagation();
    const element = tileElement(tile.key);
    const rect = element?.getBoundingClientRect();
    const rtl = isRtl();
    const start = { colSpan: tile.colSpan, rowSpan: tile.rowSpan };
    element?.focus({ preventScroll: true });
    let last: OgeTileLayoutSpan | null = null;
    gestureRef.current = beginPointerGesture(event, {
      longPress: 0,
      source: event.currentTarget,
      suppressClick: true,
      onMove: (dx, dy) => {
        last = ogeTileLayoutClampResize(
          tile,
          ogeTileLayoutResizeSpan({
            start,
            width: rect?.width ?? 0,
            height: rect?.height ?? 0,
            dx,
            dy,
            gap,
            rtl,
          }),
        );
        setPreview({ key: tile.key, span: last });
      },
      onFinish: (commit, cancelled) => {
        gestureRef.current = null;
        setPreview(null);
        if (cancelled) announce(messages.dragCancelled);
        else if (commit && last) commitResize(tile.key, last, 'pointer');
      },
    });
  };

  const className = [
    'oge-tile-layout',
    drag && 'oge-tile-layout-dragging',
    preview && 'oge-tile-layout-resizing',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  const listStyle = {
    '--oge-tile-layout-columns': ogeTileLayoutTemplateColumns(
      columns,
      props.columnWidth,
    ),
    '--oge-tile-layout-rows': ogeTileLayoutAutoRows(rowHeight),
    '--oge-tile-layout-gap': `${gap}px`,
  } as CSSProperties;

  return (
    <div ref={hostRef} className={className} style={props.style}>
      <div
        className="oge-tile-layout-list"
        role="list"
        aria-label={props.ariaLabel ?? messages.layoutLabel}
        style={listStyle}
      >
        {tiles.map((tile, index) => {
          const span =
            preview && preview.key === tile.key ? preview.span : tile;
          const context: OgeTileLayoutRenderContext = {
            item: tile.item,
            key: tile.key,
            index,
            colSpan: span.colSpan,
            rowSpan: span.rowSpan,
          };
          const id = `${idPrefix}-${index}`;
          const hasTitle = !!tile.item.title?.trim() || !!props.renderHeader;
          const dragged = drag?.key === tile.key;
          const tileClass = [
            'oge-tile-layout-tile',
            dragged && 'oge-tile-layout-tile-dragged',
            drag?.over === tile.key && 'oge-tile-layout-tile-drop-target',
            preview?.key === tile.key && 'oge-tile-layout-tile-resized',
          ]
            .filter(Boolean)
            .join(' ');
          const canResize = tile.resizeColumns || tile.resizeRows;
          return (
            <div
              key={String(tile.key)}
              role="listitem"
              className="oge-tile-layout-cell"
              style={
                {
                  '--oge-tile-col-span': span.colSpan,
                  '--oge-tile-row-span': span.rowSpan,
                } as CSSProperties
              }
            >
              <div
                role="group"
                className={tileClass}
                data-oge-tile-key={String(tile.key)}
                aria-roledescription={messages.tileRoleDescription}
                aria-labelledby={hasTitle ? `${id}-title` : undefined}
                aria-label={hasTitle ? undefined : labelOf(tile)}
                aria-describedby={hintId}
                aria-keyshortcuts={
                  ogeTileLayoutShortcuts(tile.reorderable, canResize) ??
                  undefined
                }
                style={
                  dragged
                    ? { transform: `translate(${drag.x}px, ${drag.y}px)` }
                    : undefined
                }
                tabIndex={tabStop === tile.key ? 0 : -1}
                onKeyDown={(e) => onTileKeyDown(e, tile.key)}
                onFocus={(e) => {
                  if (e.target === e.currentTarget) setFocusKey(tile.key);
                }}
              >
                <div
                  className={
                    tile.reorderable
                      ? 'oge-tile-layout-header oge-tile-layout-header-draggable'
                      : 'oge-tile-layout-header'
                  }
                  title={tile.reorderable ? messages.dragHint : undefined}
                  onPointerDown={(e) => onHeaderPointerDown(e, tile)}
                >
                  {tile.reorderable && (
                    <svg
                      className="oge-tile-layout-grip"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
                    </svg>
                  )}
                  <div className="oge-tile-layout-title" id={`${id}-title`}>
                    {props.renderHeader
                      ? props.renderHeader(context)
                      : tile.item.title}
                  </div>
                </div>
                <div className="oge-tile-layout-body">
                  {props.renderContent?.(context)}
                </div>
                {canResize && (
                  <span
                    className={[
                      'oge-tile-layout-resize',
                      !tile.resizeRows && 'oge-tile-layout-resize-x',
                      !tile.resizeColumns && 'oge-tile-layout-resize-y',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden="true"
                    onPointerDown={(e) => onResizePointerDown(e, tile)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <span className="oge-sr-only" id={hintId}>
        {messages.keyboardHint}
      </span>
    </div>
  );
});
