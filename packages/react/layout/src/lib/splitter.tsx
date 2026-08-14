'use client';

import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ForwardRefExoticComponent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefAttributes,
} from 'react';
import {
  OGE_SPLITTER_GRIP_SIDES,
  canResizeSplitterAt,
  isSplitterPaneCollapsible,
  loadSplitterPanes,
  resizeSplitAt,
  resolveSplitterIndex,
  sameSplitterSizes,
  splitterBounds,
  splitterDragDelta,
  splitterFlexiblePx,
  splitterGridTemplate,
  splitterGripPath,
  splitterGripTitle,
  splitterKeyAction,
  splitterKeyShortcuts,
  splitterPaneDescriptor,
  splitterPaneOf,
  splitterSeparatorLabel,
  splitterSeparatorRanges,
  splitterSizesWithRestored,
  splitterTracks,
  splitterTracksToSizes,
  startSplitterDrag,
  type OgeSplitTrack,
  type OgeSplitterDataSourceLike,
  type OgeSplitterDescriptorCore,
  type OgeSplitterGripSide,
  type OgeSplitterMessages,
  type OgeSplitterOrientation,
  type OgeSplitterPaneClickEvent,
  type OgeSplitterPaneCollapsedEvent,
  type OgeSplitterPaneCollapsingEvent,
  type OgeSplitterPaneData,
  type OgeSplitterPaneHoldEvent,
  type OgeSplitterResizeEvent,
  type OgeSplitterResizeStartEvent,
  type OgeSplitterSize,
  type OgeSplitterView,
} from '@oge-ui/behavior';
import { isDevMode } from './dev';
import { useOgeSplitterConfig } from './layout-config';

/**
 * One pane of `<OgeSplitter>`. Everything the Angular `panes` entry carries,
 * plus `content` — the React counterpart of the body projected into an
 * `<oge-splitter-pane>`.
 */
export interface OgeSplitterPaneItem extends OgeSplitterPaneData {
  /** Pane body. Takes precedence over `renderPane` and `text`. */
  content?: ReactNode;
  /**
   * Nested splitter inside this pane — the React entries, so a nested pane
   * keeps its `content` slot. Defaults to the opposite axis of the parent.
   */
  panes?: readonly OgeSplitterPaneItem[];
}

/** Normalized pane, with the React content slot attached. */
interface OgeReactSplitterDescriptor extends OgeSplitterDescriptorCore {
  readonly content?: ReactNode;
}

/** Imperative handle — the React face of the Angular public methods. */
export interface OgeSplitterHandle {
  /**
   * Collapses a pane by index or key. Returns `false` when the pane is not
   * collapsible or `onPaneCollapsing` vetoed it.
   */
  collapse(target: number | string): boolean;
  /** Expands a collapsed pane by index or key, restoring its previous size. */
  expand(target: number | string): boolean;
  /** Collapses the pane if expanded, expands it otherwise. */
  toggle(target: number | string): boolean;
  /** Whether a pane is currently collapsed. */
  isCollapsed(target: number | string): boolean;
  /**
   * Moves a separator by `delta` share points — the programmatic equivalent
   * of an arrow key. Returns `false` when the separator cannot move.
   */
  resize(separatorIndex: number, delta: number): boolean;
  /** Focuses a separator, the first one by default. */
  focus(separatorIndex?: number): void;
}

export interface OgeSplitterProps {
  /** The panes, in layout order. */
  panes?: readonly OgeSplitterPaneItem[];
  /**
   * Remote pane list, loaded through the `@oge-ui/core` `DataSource` contract
   * and merged after `panes`; a source that publishes `changes` re-loads.
   */
  dataSource?: OgeSplitterDataSourceLike;
  /** Axis the panes are laid out along. */
  orientation?: OgeSplitterOrientation;
  /**
   * Pane sizes — the controlled half of the pair, and the channel to persist.
   * Numbers are shares, `'240px'` pins a pane. Setting it overrides the
   * per-pane `size` entries.
   */
  sizes?: readonly OgeSplitterSize[];
  /** Initial sizes of the uncontrolled pair. */
  defaultSizes?: readonly OgeSplitterSize[];
  /** Fires whenever the splitter publishes new sizes — persist them here. */
  onSizesChange?: (sizes: readonly OgeSplitterSize[]) => void;
  /** Thickness of each separator in pixels. */
  separatorSize?: number;
  /** Share points one arrow-key press moves a separator. */
  step?: number;
  /** Enables arrow / Home / End / Enter on the separators. */
  keyboardNavigation?: boolean;
  /** Renders a collapse chevron on the separators of collapsible panes. */
  showCollapseGrips?: boolean;
  /** `false` pins every separator. */
  resizable?: boolean;
  /** Disables the whole splitter — no dragging, no keyboard, no collapsing. */
  disabled?: boolean;
  /** Milliseconds a pointer must rest on a pane before `onPaneHold` fires. */
  itemHoldTimeout?: number;
  /** Accessible name of the splitter container. */
  ariaLabel?: string;
  /** Per-instance overrides of the config `messages`. */
  messages?: Partial<OgeSplitterMessages>;
  /**
   * Body of a pane that carries no `content` — the React counterpart of
   * `[ogeSplitterPaneTemplate]`.
   */
  renderPane?: (
    pane: OgeSplitterPaneItem,
    index: number,
    collapsed: boolean,
  ) => ReactNode;
  /** Fires once when a drag or keyboard resize begins. */
  onResizeStarted?: (event: OgeSplitterResizeStartEvent) => void;
  /** Fires every time the sizes change during a resize. */
  onResized?: (event: OgeSplitterResizeEvent) => void;
  /** Fires once when the resize gesture finishes. */
  onResizeEnded?: (event: OgeSplitterResizeEvent) => void;
  /** Cancelable pre-event of a pane collapsing — set `cancel = true` to block it. */
  onPaneCollapsing?: (event: OgeSplitterPaneCollapsingEvent) => void;
  /** Cancelable pre-event of a pane expanding. */
  onPaneExpanding?: (event: OgeSplitterPaneCollapsingEvent) => void;
  /** Fires after a pane collapsed. */
  onPaneCollapsed?: (event: OgeSplitterPaneCollapsedEvent) => void;
  /** Fires after a pane expanded. */
  onPaneExpanded?: (event: OgeSplitterPaneCollapsedEvent) => void;
  /** Fires when a pane is clicked. */
  onPaneClick?: (event: OgeSplitterPaneClickEvent) => void;
  /** A pane was held for `itemHoldTimeout` (touch long-press or mouse hold). */
  onPaneHold?: (event: OgeSplitterPaneHoldEvent) => void;
  /** A pane was right-clicked / long-pressed for a context menu. */
  onPaneContextMenu?: (event: OgeSplitterPaneHoldEvent) => void;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

/** Resolves the collapse grip a pointer event landed on, if any. */
function gripSideOf(target: EventTarget | null): OgeSplitterGripSide | null {
  const grip = (target as HTMLElement | null)?.closest?.('.oge-splitter-grip');
  const side = grip?.getAttribute('data-grip');
  return side === 'start' || side === 'end' ? side : null;
}

/**
 * Resizable pane container following the WAI-ARIA APG **window splitter**
 * pattern — the React render of the Angular `<oge-splitter>`, over the same
 * `@oge-ui/behavior` decisions (track building, bounds, separator ranges, the
 * keyboard map, the collapse pipeline, the drag harness) and the same
 * `.oge-splitter-*` classes.
 *
 * ```tsx
 * <OgeSplitter
 *   sizes={sizes}
 *   onSizesChange={setSizes}
 *   panes={[
 *     { key: 'nav', size: '240px', minSize: '160px', collapsible: true,
 *       content: <Nav /> },
 *     { key: 'editor', minSize: 20, content: <Editor /> },
 *   ]}
 * />
 * ```
 *
 * Sizes are **ratios**, not percentages: `[30, 30]` lays out exactly like
 * `[50, 50]`, so a configuration that does not add up to 100 is not an error.
 * A `'240px'` size pins a pane instead. Layout is one CSS grid — the
 * separators are real tracks, so panes mirror automatically in RTL. A pane
 * carrying its own `panes` array renders a nested splitter on the opposite
 * axis.
 */
export const OgeSplitter: ForwardRefExoticComponent<
  OgeSplitterProps & RefAttributes<OgeSplitterHandle>
  // The explicit annotation is what lets a pane render a nested `<OgeSplitter>`
  // — without it the component's type would refer to itself.
> = forwardRef<OgeSplitterHandle, OgeSplitterProps>(
  function OgeSplitterRender(props, ref) {
    const {
      panes,
      dataSource,
      orientation = 'horizontal',
      keyboardNavigation = true,
      resizable = true,
      disabled = false,
      itemHoldTimeout = 750,
      ariaLabel,
      renderPane,
      className,
      style,
      id,
    } = props;

    const config = useOgeSplitterConfig();
    const separatorSize = props.separatorSize ?? config.separatorSize ?? 6;
    const step = props.step ?? config.step ?? 5;
    const showCollapseGrips =
      props.showCollapseGrips ?? config.showCollapseGrips ?? true;
    const messages = useMemo<OgeSplitterMessages>(
      () => ({ ...config.messages, ...props.messages }),
      [config.messages, props.messages],
    );

    const uid = `oge-splitter-${useId()}`;
    const hostRef = useRef<HTMLDivElement>(null);
    const paneRefs = useRef<(HTMLDivElement | null)[]>([]);
    const separatorRefs = useRef<(HTMLDivElement | null)[]>([]);

    const horizontal = orientation === 'horizontal';
    const flippedOrientation: OgeSplitterOrientation = horizontal
      ? 'vertical'
      : 'horizontal';

    // --- descriptors -------------------------------------------------------

    const [loadedPanes, setLoadedPanes] = useState<
      readonly OgeSplitterPaneData[]
    >([]);

    useEffect(() => {
      if (!dataSource) {
        setLoadedPanes([]);
        return;
      }
      return loadSplitterPanes(dataSource, setLoadedPanes);
    }, [dataSource]);

    const descriptors = useMemo<readonly OgeReactSplitterDescriptor[]>(
      () =>
        [...(panes ?? []), ...loadedPanes]
          .filter((item) => item.visible !== false)
          .map((item, index) => ({
            ...splitterPaneDescriptor(item, index),
            content: (item as OgeSplitterPaneItem).content,
          })),
      [panes, loadedPanes],
    );

    // --- collapsed set -----------------------------------------------------

    const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
      () =>
        new Set(
          descriptors.filter((d) => d.initiallyCollapsed).map((d) => d.id),
        ),
    );
    /** Last `collapsed` value seen per pane — the external-write watchdog. */
    const knownCollapsed = useRef(new Map<string, boolean>());
    /** Size a pane had before it collapsed, restored when it expands. */
    const restoreSizes = useRef(new Map<string, OgeSplitterSize>());

    // --- sizes -------------------------------------------------------------

    /** JSON of the sizes last published through `onSizesChange`. */
    const lastCommitted = useRef<string | null>(null);
    /** The gesture's working sizes, ahead of the next render. */
    const pendingSizes = useRef<
      readonly (OgeSplitterSize | undefined)[] | null
    >(null);

    const controlled = props.sizes;
    const controlledJson = controlled ? JSON.stringify(controlled) : null;
    // A `sizes` value we published ourselves is this component's own state,
    // not an override — echoing it back as one would pin the splitter to its
    // last commit and make a later `size` change a no-op.
    const echo =
      controlledJson !== null && controlledJson === lastCommitted.current;

    /**
     * Identity of the *declared* sizing. The working sizes below reset when
     * the pane set, a declared `size` or a genuinely external `sizes` array
     * changes — not when a parent re-renders with an equal-but-new `panes`
     * array, which would throw away the size the user just dragged to.
     */
    const declaredPairs = descriptors.map((d) => [d.id, d.size ?? null]);
    /** The key the working sizes carry once a commit has been echoed back. */
    const echoKey = JSON.stringify([declaredPairs, null]);
    const sizingKey =
      echo || controlledJson === null
        ? echoKey
        : JSON.stringify([declaredPairs, controlledJson]);

    const resetSizes = (): readonly (OgeSplitterSize | undefined)[] =>
      controlled && !echo && controlled.length === descriptors.length
        ? [...controlled]
        : descriptors.map((d) => d.size);

    const [sizeState, setSizeState] = useState<{
      key: string;
      sizes: readonly (OgeSplitterSize | undefined)[];
    }>(() => ({
      key: sizingKey,
      sizes:
        props.defaultSizes && props.defaultSizes.length === descriptors.length
          ? [...props.defaultSizes]
          : resetSizes(),
    }));

    const currentSizes: readonly (OgeSplitterSize | undefined)[] =
      sizeState.key === sizingKey ? sizeState.sizes : resetSizes();
    // A render means React state has caught up with the gesture's writes.
    pendingSizes.current = null;

    const tracks = useMemo<OgeSplitTrack[]>(
      () => splitterTracks(descriptors, currentSizes, collapsedIds, warn),
      [descriptors, currentSizes, collapsedIds],
    );

    const gridTemplate = splitterGridTemplate(
      tracks,
      descriptors,
      separatorSize,
    );

    const view = useMemo<OgeSplitterView>(
      () => ({
        descriptors,
        collapsed: collapsedIds,
        disabled,
        resizable,
        horizontal,
      }),
      [descriptors, collapsedIds, disabled, resizable, horizontal],
    );

    // --- measurement -------------------------------------------------------

    const [measuredFlexible, setMeasuredFlexible] = useState(0);
    const [resizingIndex, setResizingIndex] = useState<number | null>(null);

    const latest = useRef({
      props,
      descriptors,
      currentSizes,
      collapsedIds,
      tracks,
      view,
      separatorSize,
      controlled,
      sizingKey,
      echoKey,
    });
    latest.current = {
      props,
      descriptors,
      currentSizes,
      collapsedIds,
      tracks,
      view,
      separatorSize,
      controlled,
      sizingKey,
      echoKey,
    };

    /**
     * Pixels the share panes divide between them. Measured at the gesture
     * boundary only — reading layout per pointermove is exactly the thrash
     * this indirection exists to avoid.
     */
    const measureFlexible = useCallback((): number => {
      const host = hostRef.current;
      const rect = host?.getBoundingClientRect();
      const total = rect ? (horizontal ? rect.width : rect.height) : 0;
      return splitterFlexiblePx(
        total,
        latest.current.tracks,
        latest.current.separatorSize,
      );
    }, [horizontal]);

    const syncMeasurement = useCallback((): void => {
      const next = measureFlexible();
      setMeasuredFlexible((current) =>
        Math.abs(next - current) > 0.5 ? next : current,
      );
    }, [measureFlexible]);

    // A ResizeObserver keeps the separators' ARIA values honest when the
    // container resizes without any prop changing — a window resize, a parent
    // splitter being dragged, a drawer opening.
    useEffect(() => {
      const host = hostRef.current;
      if (!host || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => syncMeasurement());
      observer.observe(host);
      return () => observer.disconnect();
    }, [syncMeasurement]);

    // Covers what the observer cannot: a track change that moves the
    // fixed/flexible split without resizing the host, and environments with
    // no ResizeObserver. Deliberately skipped mid-gesture.
    useLayoutEffect(() => {
      if (resizingIndex !== null) return;
      syncMeasurement();
      // `tracks` and `separatorSize` are the layout inputs; `orientation`
      // decides which axis is measured.
    }, [tracks, separatorSize, orientation, resizingIndex, syncMeasurement]);

    const separatorRanges = useMemo(() => {
      // Before the first measurement lands the host size is unknown. A
      // splitter of share panes is unit-free, so the same fallback the
      // gestures use gives the correct values on the very first paint.
      const flexiblePx =
        measuredFlexible || splitterFlexiblePx(0, tracks, separatorSize);
      return splitterSeparatorRanges(
        tracks,
        flexiblePx,
        splitterBounds(descriptors, tracks, flexiblePx, collapsedIds),
      );
    }, [measuredFlexible, tracks, separatorSize, descriptors, collapsedIds]);

    // --- size plumbing -----------------------------------------------------

    const readSizes = (): readonly (OgeSplitterSize | undefined)[] =>
      pendingSizes.current ?? latest.current.currentSizes;

    const snapshotSizes = (): OgeSplitterSize[] =>
      splitterTracksToSizes(
        splitterTracks(
          latest.current.descriptors,
          readSizes(),
          latest.current.collapsedIds,
        ),
      );

    const writeSizes = (
      next: readonly (OgeSplitterSize | undefined)[],
    ): void => {
      pendingSizes.current = next;
      setSizeState({ key: latest.current.sizingKey, sizes: next });
    };

    /** Writes the working sizes; `false` when the layout did not actually move. */
    const applyTracks = (nextTracks: readonly OgeSplitTrack[]): boolean => {
      const next = splitterTracksToSizes(nextTracks);
      // Dragging past a stop keeps producing the same clamped result: writing
      // it again would re-render for every pointermove that follows, and
      // reporting it would fire an `onResized` that resized nothing.
      if (sameSplitterSizes(next, readSizes())) return false;
      writeSizes(next);
      return true;
    };

    /** Publishes the working sizes, once per change. */
    const commitSizes = (): void => {
      const next = snapshotSizes();
      const json = JSON.stringify(next);
      if (json === lastCommitted.current) return;
      // Recorded before the write, so the parent echoing the value back as
      // the `sizes` prop is recognised as this component's own state rather
      // than as an external override.
      lastCommitted.current = json;
      setSizeState({ key: latest.current.echoKey, sizes: readSizes() });
      latest.current.props.onSizesChange?.(next);
    };

    const boundsAt = (flexiblePx: number) =>
      splitterBounds(
        latest.current.descriptors,
        latest.current.tracks,
        flexiblePx,
        latest.current.collapsedIds,
      );

    // --- collapse pipeline -------------------------------------------------

    /**
     * `onPaneCollapsing` / `onPaneExpanding` → commit → `onPaneCollapsed` /
     * `onPaneExpanded`. Returns `false` when the change was vetoed or
     * impossible.
     */
    const requestCollapse = (
      index: number,
      collapse: boolean,
      event?: Event,
    ): boolean => {
      const p = latest.current.props;
      const d = latest.current.descriptors[index];
      if (!d || !d.collapsible || d.disabled || (p.disabled ?? false)) {
        return false;
      }
      if (latest.current.collapsedIds.has(d.id) === collapse) return true;

      const pre: OgeSplitterPaneCollapsingEvent = {
        index,
        key: d.key,
        item: d.item,
        event,
        cancel: false,
      };
      (collapse ? p.onPaneCollapsing : p.onPaneExpanding)?.(pre);
      if (pre.cancel) {
        knownCollapsed.current.set(d.id, !collapse);
        return false;
      }

      if (collapse) {
        restoreSizes.current.set(d.id, snapshotSizes()[index]);
        blurInside(index);
      }
      const next = new Set(latest.current.collapsedIds);
      if (collapse) next.add(d.id);
      else next.delete(d.id);
      // The rest of this pipeline reads the post-change collapsed set.
      latest.current.collapsedIds = next;
      setCollapsedIds(next);
      knownCollapsed.current.set(d.id, collapse);

      if (!collapse) {
        const remembered = restoreSizes.current.get(d.id);
        restoreSizes.current.delete(d.id);
        if (remembered !== undefined) {
          writeSizes(
            splitterSizesWithRestored(snapshotSizes(), index, remembered),
          );
        }
      }
      commitSizes();

      (collapse ? p.onPaneCollapsed : p.onPaneExpanded)?.({
        index,
        key: d.key,
        item: d.item,
        event,
      });
      return true;
    };

    /**
     * A collapsed pane becomes `inert`, which would drop focus to `<body>` if
     * it still held it — hand focus to the separator that controls it first.
     */
    const blurInside = (index: number): void => {
      const pane = paneRefs.current[index];
      const active = document.activeElement;
      if (!pane || !active || !pane.contains(active)) return;
      focusSeparator(Math.max(0, index - 1));
    };

    const focusSeparator = (separatorIndex = 0): void => {
      separatorRefs.current[separatorIndex]?.focus();
    };

    const toggleAt = (
      separatorIndex: number,
      side: OgeSplitterGripSide,
      event?: Event,
    ): void => {
      const index = splitterPaneOf(separatorIndex, side);
      const d = latest.current.descriptors[index];
      if (!d) return;
      requestCollapse(index, !latest.current.collapsedIds.has(d.id), event);
    };

    // Seeds newly added panes and follows external writes to a pane's
    // `collapsed` field — the React counterpart of the Angular two-way model.
    useEffect(() => {
      const known = knownCollapsed.current;
      let seeded: Set<string> | null = null;
      descriptors.forEach((d, index) => {
        const desired = d.initiallyCollapsed;
        const previous = known.get(d.id);
        if (previous === undefined) {
          known.set(d.id, desired);
          if (desired && !latest.current.collapsedIds.has(d.id)) {
            seeded ??= new Set(latest.current.collapsedIds);
            seeded.add(d.id);
          }
        } else if (previous !== desired) {
          known.set(d.id, desired);
          requestCollapse(index, desired);
        }
      });
      if (seeded) {
        latest.current.collapsedIds = seeded;
        setCollapsedIds(seeded);
      }
      // Runs on every descriptor identity change — the pipeline itself is
      // guarded against no-op transitions.
    }, [descriptors]);

    // --- resize ------------------------------------------------------------

    const activeGesture = useRef<(() => void) | null>(null);
    useEffect(() => () => activeGesture.current?.(), []);

    /** One discrete resize: start, apply, end — the keyboard's drag. */
    const nudge = (
      separatorIndex: number,
      deltaPx: number,
      event?: Event,
    ): boolean => {
      const p = latest.current.props;
      const flexiblePx = measureFlexible();
      if (flexiblePx <= 0) return false;
      const startTracks = latest.current.tracks;
      const startSizes = snapshotSizes();
      const next = resizeSplitAt(
        startTracks,
        separatorIndex,
        deltaPx,
        flexiblePx,
        boundsAt(flexiblePx),
      );
      // Already against the stop — report nothing rather than a resize that
      // did not happen (holding End down must not spray events).
      if (sameSplitterSizes(splitterTracksToSizes(next), startSizes)) {
        return false;
      }

      p.onResizeStarted?.({ separatorIndex, sizes: startSizes, event });
      applyTracks(next);
      commitSizes();
      const sizes = snapshotSizes();
      p.onResized?.({
        separatorIndex,
        sizes,
        previousSizes: startSizes,
        event,
      });
      p.onResizeEnded?.({
        separatorIndex,
        sizes,
        previousSizes: startSizes,
        event,
      });
      return true;
    };

    const isRtl = (): boolean =>
      !!hostRef.current &&
      getComputedStyle(hostRef.current).direction === 'rtl';

    const onSeparatorPointerDown = (
      separatorIndex: number,
      reactEvent: ReactPointerEvent<HTMLDivElement>,
    ): void => {
      const event = reactEvent.nativeEvent;
      if (event.button !== 0) return;
      if (gripSideOf(event.target)) return;
      if (!canResizeSplitterAt(latest.current.view, separatorIndex)) return;
      const flexiblePx = measureFlexible();
      if (flexiblePx <= 0) return;

      event.preventDefault();
      const startTracks = latest.current.tracks;
      const startSizes = snapshotSizes();
      const bounds = boundsAt(flexiblePx);
      const vertical = !horizontal;
      const axis = { vertical, rtl: !vertical && isRtl() };
      const startPos = vertical ? event.clientY : event.clientX;

      setResizingIndex(separatorIndex);
      latest.current.props.onResizeStarted?.({
        separatorIndex,
        sizes: startSizes,
        event,
      });

      // One gesture at a time — a second pointerdown detaches the first.
      activeGesture.current?.();
      activeGesture.current = startSplitterDrag(event, {
        move: (e) => {
          const delta = splitterDragDelta(e, startPos, axis);
          const moved = applyTracks(
            resizeSplitAt(
              startTracks,
              separatorIndex,
              delta,
              flexiblePx,
              bounds,
            ),
          );
          if (!moved) return;
          latest.current.props.onResized?.({
            separatorIndex,
            sizes: snapshotSizes(),
            previousSizes: startSizes,
            event: e,
          });
        },
        finish: (e, cancelled) => {
          activeGesture.current = null;
          if (cancelled) applyTracks(startTracks);
          setResizingIndex(null);
          commitSizes();
          latest.current.props.onResizeEnded?.({
            separatorIndex,
            sizes: snapshotSizes(),
            previousSizes: startSizes,
            event: e,
          });
        },
      });
    };

    const onSeparatorKeyDown = (
      separatorIndex: number,
      reactEvent: ReactKeyboardEvent<HTMLDivElement>,
    ): void => {
      if (!keyboardNavigation || disabled) return;
      const event = reactEvent.nativeEvent;
      const action = splitterKeyAction(
        latest.current.view,
        separatorIndex,
        event,
        step,
        isRtl(),
      );
      if (!action) return;
      event.preventDefault();
      if (action.kind === 'toggle') {
        toggleAt(separatorIndex, action.side, event);
        return;
      }
      nudge(
        separatorIndex,
        (action.deltaShare / 100) * measureFlexible(),
        event,
      );
    };

    const onSeparatorClick = (
      separatorIndex: number,
      reactEvent: ReactMouseEvent<HTMLDivElement>,
    ): void => {
      const side = gripSideOf(reactEvent.target);
      if (!side) return;
      reactEvent.preventDefault();
      reactEvent.stopPropagation();
      toggleAt(separatorIndex, side, reactEvent.nativeEvent);
    };

    const onSeparatorDoubleClick = (
      separatorIndex: number,
      reactEvent: ReactMouseEvent<HTMLDivElement>,
    ): void => {
      // The reference convention: a double click on the bar toggles the
      // primary pane, falling back to the following one when only that is
      // collapsible.
      const side: OgeSplitterGripSide = isSplitterPaneCollapsible(
        latest.current.view,
        separatorIndex,
        'start',
      )
        ? 'start'
        : 'end';
      if (
        !isSplitterPaneCollapsible(latest.current.view, separatorIndex, side)
      ) {
        return;
      }
      reactEvent.preventDefault();
      toggleAt(separatorIndex, side, reactEvent.nativeEvent);
    };

    // --- pane pointer events ----------------------------------------------

    /** Resolves the own (not nested) pane a pointer event landed in. */
    const ownPaneAt = (target: EventTarget | null): number => {
      const pane = (target as HTMLElement | null)?.closest?.(
        '.oge-splitter-pane',
      );
      if (!pane || pane.parentElement !== hostRef.current) return -1;
      return paneRefs.current.findIndex((el) => el === pane);
    };

    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelHold = useCallback((): void => {
      if (holdTimer.current === null) return;
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }, []);
    useEffect(() => cancelHold, [cancelHold]);

    const onHostClick = (event: ReactMouseEvent<HTMLDivElement>): void => {
      const index = ownPaneAt(event.target);
      if (index === -1) return;
      const d = latest.current.descriptors[index];
      if (!d) return;
      latest.current.props.onPaneClick?.({
        index,
        key: d.key,
        item: d.item,
        event: event.nativeEvent,
      });
    };

    const onHostPointerDown = (
      event: ReactPointerEvent<HTMLDivElement>,
    ): void => {
      cancelHold();
      if (disabled || gripSideOf(event.target)) return;
      const index = ownPaneAt(event.target);
      if (index === -1) return;
      const native = event.nativeEvent;
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null;
        const d = latest.current.descriptors[index];
        if (d) {
          latest.current.props.onPaneHold?.({
            index,
            key: d.key,
            item: d.item,
            event: native,
          });
        }
      }, itemHoldTimeout);
    };

    const onHostContextMenu = (
      event: ReactMouseEvent<HTMLDivElement>,
    ): void => {
      cancelHold();
      if (disabled) return;
      const index = ownPaneAt(event.target);
      if (index === -1) return;
      const d = latest.current.descriptors[index];
      if (!d) return;
      latest.current.props.onPaneContextMenu?.({
        index,
        key: d.key,
        item: d.item,
        event: event.nativeEvent,
      });
    };

    // --- imperative handle -------------------------------------------------

    useImperativeHandle(
      ref,
      () => ({
        collapse: (target) => {
          const index = resolveSplitterIndex(
            latest.current.descriptors,
            target,
          );
          return index === -1 ? false : requestCollapse(index, true);
        },
        expand: (target) => {
          const index = resolveSplitterIndex(
            latest.current.descriptors,
            target,
          );
          return index === -1 ? false : requestCollapse(index, false);
        },
        toggle: (target) => {
          const index = resolveSplitterIndex(
            latest.current.descriptors,
            target,
          );
          if (index === -1) return false;
          const d = latest.current.descriptors[index];
          return requestCollapse(index, !latest.current.collapsedIds.has(d.id));
        },
        isCollapsed: (target) => {
          const index = resolveSplitterIndex(
            latest.current.descriptors,
            target,
          );
          return index === -1
            ? false
            : latest.current.collapsedIds.has(
                latest.current.descriptors[index].id,
              );
        },
        resize: (separatorIndex, delta) => {
          if (!canResizeSplitterAt(latest.current.view, separatorIndex)) {
            return false;
          }
          return nudge(separatorIndex, (delta / 100) * measureFlexible());
        },
        focus: (separatorIndex = 0) => focusSeparator(separatorIndex),
      }),
      // Every method reads through `latest`, so the handle never goes stale.
      [],
    );

    // --- render ------------------------------------------------------------

    paneRefs.current.length = descriptors.length;
    separatorRefs.current.length = Math.max(0, descriptors.length - 1);

    const hostClass = [
      'oge-splitter',
      disabled ? 'oge-disabled' : '',
      resizingIndex !== null ? 'oge-splitter-resizing' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={hostRef}
        id={id}
        className={hostClass}
        data-orientation={orientation}
        aria-label={ariaLabel}
        style={{
          ...style,
          gridTemplateColumns: horizontal
            ? (gridTemplate ?? undefined)
            : undefined,
          gridTemplateRows: horizontal
            ? undefined
            : (gridTemplate ?? undefined),
        }}
        onClick={onHostClick}
        onPointerDown={onHostPointerDown}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={onHostContextMenu}
      >
        {descriptors.length === 0 ? (
          <p className="oge-splitter-empty">{messages.noData}</p>
        ) : (
          descriptors.map((d, index) => {
            const collapsed = collapsedIds.has(d.id);
            const separatorIndex = index - 1;
            const canDrag =
              index > 0 && canResizeSplitterAt(view, separatorIndex);
            return (
              <Fragment key={d.id}>
                {index > 0 && (
                  <div
                    ref={(el) => {
                      separatorRefs.current[separatorIndex] = el;
                    }}
                    id={`${uid}-sep-${d.id}`}
                    className={[
                      'oge-splitter-separator',
                      resizingIndex === separatorIndex
                        ? 'oge-splitter-separator-active'
                        : '',
                      canDrag ? '' : 'oge-splitter-separator-locked',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="separator"
                    tabIndex={keyboardNavigation && !disabled ? 0 : -1}
                    aria-orientation={orientation}
                    aria-controls={`${uid}-pane-${descriptors[separatorIndex].id}`}
                    aria-label={splitterSeparatorLabel(
                      view,
                      separatorIndex,
                      messages,
                    )}
                    aria-valuenow={separatorRanges[separatorIndex]?.now}
                    aria-valuemin={separatorRanges[separatorIndex]?.min}
                    aria-valuemax={separatorRanges[separatorIndex]?.max}
                    aria-disabled={canDrag ? undefined : true}
                    aria-keyshortcuts={
                      splitterKeyShortcuts(view, separatorIndex) ?? undefined
                    }
                    onPointerDown={(e) =>
                      onSeparatorPointerDown(separatorIndex, e)
                    }
                    onDoubleClick={(e) =>
                      onSeparatorDoubleClick(separatorIndex, e)
                    }
                    onClick={(e) => onSeparatorClick(separatorIndex, e)}
                    onKeyDown={(e) => onSeparatorKeyDown(separatorIndex, e)}
                  >
                    <span
                      className="oge-splitter-separator-line"
                      aria-hidden="true"
                    />
                    {showCollapseGrips &&
                      OGE_SPLITTER_GRIP_SIDES.filter((side) =>
                        isSplitterPaneCollapsible(view, separatorIndex, side),
                      ).map((side) => (
                        <span
                          key={side}
                          className={[
                            'oge-splitter-grip',
                            side === 'start'
                              ? 'oge-splitter-grip-start'
                              : 'oge-splitter-grip-end',
                          ].join(' ')}
                          aria-hidden="true"
                          data-grip={side}
                          title={splitterGripTitle(
                            view,
                            separatorIndex,
                            side,
                            messages,
                          )}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            width="10"
                            height="10"
                          >
                            <path
                              d={splitterGripPath(view, separatorIndex, side)}
                            />
                          </svg>
                        </span>
                      ))}
                  </div>
                )}
                <div
                  ref={(el) => {
                    paneRefs.current[index] = el;
                  }}
                  id={`${uid}-pane-${d.id}`}
                  className={[
                    'oge-splitter-pane',
                    d.cssClass ?? '',
                    collapsed ? 'oge-splitter-pane-collapsed' : '',
                    d.scrollable ? 'oge-splitter-pane-scroll' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  inert={collapsed}
                  {...d.htmlAttributes}
                >
                  {d.panes?.length ? (
                    <OgeSplitter
                      panes={d.panes}
                      orientation={d.orientation ?? flippedOrientation}
                      separatorSize={separatorSize}
                      step={step}
                      keyboardNavigation={keyboardNavigation}
                      showCollapseGrips={showCollapseGrips}
                      resizable={resizable}
                      disabled={disabled}
                      messages={props.messages}
                    />
                  ) : d.content !== undefined && d.content !== null ? (
                    d.content
                  ) : renderPane ? (
                    renderPane(d.item ?? {}, index, collapsed)
                  ) : (
                    (d.text ?? null)
                  )}
                </div>
              </Fragment>
            );
          })
        )}
      </div>
    );
  },
);

function warn(message: string): void {
  if (isDevMode()) {
    console.warn(`[oge-splitter] ${message}`);
  }
}
