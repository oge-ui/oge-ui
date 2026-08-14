'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  accordionItemDescriptor,
  canCollapseAccordionPanel,
  createTypeAheadBuffer,
  expandedIdsAfterCollapse,
  expandedIdsAfterExpand,
  resolveAccordionIndex,
  runAsyncGuard,
  sameAccordionIds,
  sameAccordionKeys,
  type OgeAccordionCollapsedEvent,
  type OgeAccordionCollapsingEvent,
  type OgeAccordionContentFailedEvent,
  type OgeAccordionContentLoadedEvent,
  type OgeAccordionDescriptorCore,
  type OgeAccordionDisplayMode,
  type OgeAccordionExpandedEvent,
  type OgeAccordionExpandingEvent,
  type OgeAccordionItemClickEvent,
  type OgeAccordionItemData,
  type OgeAccordionLoadState,
  type OgeAccordionMessages,
  type OgeAccordionSize,
  type OgeAccordionStylingMode,
  type OgeAccordionTogglePosition,
} from '@oge-ui/behavior';
import { isDevMode } from './dev';
import { useOgeAccordionConfig } from './layout-config';

// --- render-prop contexts --------------------------------------------------

/** Context handed to `renderHeader` — the React face of the Angular slot. */
export interface OgeAccordionHeaderContext {
  /** The source panel definition. */
  item: OgeAccordionItemData | undefined;
  /** Index within the rendered stack. */
  index: number;
  /** Whether the panel is currently expanded. */
  expanded: boolean;
  /** Resolved title text. */
  title: string;
  /** Resolved description text. */
  description?: string;
}

/** Context handed to `renderContent`. */
export interface OgeAccordionContentContext {
  item: OgeAccordionItemData | undefined;
  index: number;
  /** Value resolved by the panel's `contentLoader`, `undefined` without one. */
  data: unknown;
}

/** Context handed to `renderToggleIcon`. */
export interface OgeAccordionToggleIconContext {
  expanded: boolean;
  index: number;
}

/** Context handed to `renderHeaderActions`. */
export interface OgeAccordionHeaderActionsContext {
  item: OgeAccordionItemData | undefined;
  index: number;
  expanded: boolean;
}

/**
 * One panel — the React counterpart of both an `<oge-accordion-item>` child
 * and an `items` entry: the shared data shape plus the React content slots.
 */
export interface OgeAccordionItemDefinition extends OgeAccordionItemData {
  /** Panel body. The React counterpart of an item's projected content. */
  content?: ReactNode;
  /** Custom header rendering for this panel alone. */
  renderHeader?: (context: OgeAccordionHeaderContext) => ReactNode;
  /**
   * Lazy body for this panel alone — the counterpart of an inline
   * `[ogeAccordionContentTemplate]`. Ignored when `content` is set.
   */
  renderContent?: (context: OgeAccordionContentContext) => ReactNode;
  /** Custom chevron for this panel alone. */
  renderToggleIcon?: (context: OgeAccordionToggleIconContext) => ReactNode;
  /** Actions rendered in the header row beside — never inside — the toggle. */
  renderHeaderActions?: (
    context: OgeAccordionHeaderActionsContext,
  ) => ReactNode;
}

/** Normalized panel with the React slots on top of the shared core. */
export interface OgeReactAccordionDescriptor extends OgeAccordionDescriptorCore {
  readonly content?: ReactNode;
  readonly renderHeader?: (context: OgeAccordionHeaderContext) => ReactNode;
  readonly renderContent?: (context: OgeAccordionContentContext) => ReactNode;
  readonly renderToggleIcon?: (
    context: OgeAccordionToggleIconContext,
  ) => ReactNode;
  readonly renderHeaderActions?: (
    context: OgeAccordionHeaderActionsContext,
  ) => ReactNode;
}

// --- props -----------------------------------------------------------------

/** Everything `<OgeAccordion>` accepts, minus the DOM passthrough. */
export interface OgeAccordionBehaviorProps {
  /** The panels, in render order. */
  items?: readonly OgeAccordionItemDefinition[];
  /** Keys of the expanded panels — controlled when provided. */
  expandedKeys?: readonly string[];
  /** Uncontrolled initial expansion by key. */
  defaultExpandedKeys?: readonly string[];
  onExpandedKeysChange?: (keys: readonly string[]) => void;
  /** Index of the expanded panel in single-expand mode — controlled when provided. */
  selectedIndex?: number;
  /** Uncontrolled initial expansion by index. `-1` expands none. */
  defaultSelectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  /** Allows more than one panel to stay expanded. */
  multiple?: boolean;
  /** Allows collapsing the last expanded panel, leaving none open. */
  collapsible?: boolean;
  /** Instantiate a panel's content only when it first expands. */
  deferRendering?: boolean;
  /** Keep once-rendered panels mounted (hidden) so their state survives a collapse. */
  keepAlive?: boolean;
  /** Height animation: `true`, a duration in milliseconds, or `false`. */
  animation?: boolean | number;
  /** Side of the header the chevron sits on — logical, so RTL mirrors it. */
  togglePosition?: OgeAccordionTogglePosition;
  /** Hides the chevron entirely. Overridable per panel. */
  hideToggle?: boolean;
  /** Minimum height of a collapsed header (any CSS length). */
  collapsedHeaderHeight?: string;
  /** Minimum height of an expanded header; falls back to `collapsedHeaderHeight`. */
  expandedHeaderHeight?: string;
  /** `flat` removes the gutters between panels. */
  displayMode?: OgeAccordionDisplayMode;
  /** Visual variant of the panels. */
  stylingMode?: OgeAccordionStylingMode;
  /** Density of the header rows. */
  size?: OgeAccordionSize;
  /** Disables the whole component. */
  disabled?: boolean;
  /** Enables Up/Down/Home/End and Ctrl+PageUp/PageDown header navigation. */
  keyboardNavigation?: boolean;
  /** Enables printable-character type-ahead over the panel titles. */
  typeAhead?: boolean;
  /** Expands a panel as soon as keyboard navigation moves focus onto it. */
  selectOnFocus?: boolean;
  /** `aria-level` of the heading wrapping each header button. */
  headingLevel?: number;
  /** Gives each panel `role="region"` (APG-optional). */
  useRegionRole?: boolean;
  /** Aria label of the accordion container. */
  ariaLabel?: string;
  /** Per-instance overrides of the config `messages`. */
  messages?: Partial<OgeAccordionMessages>;

  /** Shared header renderer — overridden by a panel's own `renderHeader`. */
  renderHeader?: (context: OgeAccordionHeaderContext) => ReactNode;
  /** Shared lazy-body renderer for panels that carry no `content`. */
  renderContent?: (context: OgeAccordionContentContext) => ReactNode;
  /** Shared chevron renderer. */
  renderToggleIcon?: (context: OgeAccordionToggleIconContext) => ReactNode;
  /** Shared header-actions renderer. */
  renderHeaderActions?: (
    context: OgeAccordionHeaderActionsContext,
  ) => ReactNode;

  /** Cancelable pre-event of a panel expanding. */
  onItemExpanding?: (event: OgeAccordionExpandingEvent) => void;
  /** Fires after a panel expanded. */
  onItemExpanded?: (event: OgeAccordionExpandedEvent) => void;
  /** Cancelable pre-event of a panel collapsing. */
  onItemCollapsing?: (event: OgeAccordionCollapsingEvent) => void;
  /** Fires after a panel collapsed. */
  onItemCollapsed?: (event: OgeAccordionCollapsedEvent) => void;
  /** Fires once the expand animation finished. */
  onAfterExpand?: (event: OgeAccordionExpandedEvent) => void;
  /** Fires once the collapse animation finished. */
  onAfterCollapse?: (event: OgeAccordionCollapsedEvent) => void;
  /** Fires when a header button is activated, before the expand pipeline. */
  onItemClick?: (event: OgeAccordionItemClickEvent) => void;
  /** Fires after a panel's `contentLoader` resolved. */
  onItemContentLoaded?: (event: OgeAccordionContentLoadedEvent) => void;
  /** Fires after a panel's `contentLoader` rejected. */
  onItemContentFailed?: (event: OgeAccordionContentFailedEvent) => void;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeAccordionHandle {
  /** Whether the panel at an index or with a key is currently expanded. */
  isExpanded(target: number | string): boolean;
  /** Runs the expand pipeline; resolves whether the panel actually expanded. */
  expand(target: number | string): Promise<boolean>;
  /** Runs the collapse pipeline; resolves whether the panel actually collapsed. */
  collapse(target: number | string): Promise<boolean>;
  /** Expands the panel if collapsed, collapses it otherwise. */
  toggle(target: number | string): Promise<boolean>;
  /** Expands every enabled panel — requires `multiple`. */
  expandAll(): void;
  /** Collapses every panel, subject to `collapsible`. */
  collapseAll(): void;
  /** Expands every panel flagged `invalid`. */
  expandInvalid(): void;
  /** Focuses a panel's header button, or the first enabled one. */
  focus(target?: number | string): void;
}

let nextComponentId = 0;

/**
 * The React face of the Angular `OgeAccordion`'s state: it normalizes the
 * `items` prop into descriptors, reconciles the `expandedKeys` /
 * `selectedIndex` controlled pairs, and runs the expand / collapse / content
 * pipelines over `@oge-ui/behavior`'s decision functions — the same answers
 * the Angular component gets.
 *
 * DOM work (focus moves, the `transitionend` handshake behind
 * `afterExpand`/`afterCollapse`) is handed back to the component through the
 * element registries below; the hook itself touches no markup.
 */
export function useOgeAccordion(props: OgeAccordionBehaviorProps) {
  const config = useOgeAccordionConfig();
  const messages: OgeAccordionMessages = {
    ...config.messages,
    ...props.messages,
  };

  const uid = useRef<string>(undefined);
  uid.current ??= `oge-accordion-${nextComponentId++}`;

  const multiple = props.multiple ?? false;
  const collapsible = props.collapsible ?? false;
  const deferRendering = props.deferRendering ?? true;
  const keepAlive = props.keepAlive ?? true;
  const disabled = props.disabled ?? false;
  const animation = props.animation ?? true;

  // --- descriptors ---------------------------------------------------------

  const descriptors: readonly OgeReactAccordionDescriptor[] = (
    props.items ?? []
  )
    .filter((item) => item.visible !== false)
    .map((item, index) => {
      const hasOwnContent = item.content !== undefined;
      return {
        ...accordionItemDescriptor(item, index),
        content: item.content,
        renderHeader: item.renderHeader ?? props.renderHeader,
        renderContent: hasOwnContent
          ? undefined
          : (item.renderContent ?? props.renderContent),
        renderToggleIcon: item.renderToggleIcon ?? props.renderToggleIcon,
        renderHeaderActions:
          item.renderHeaderActions ?? props.renderHeaderActions,
      };
    });

  /** Stable identity of the rendered stack — the effects' dependency. */
  const signature = descriptors.map((d) => d.id).join(' ');

  // --- expanded state ------------------------------------------------------

  const [expandedIds, setExpandedIdsState] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  /**
   * Synchronous mirror of `expandedIds`. React batches state, but the Angular
   * pipeline reads the set back inside the same tick (`expandAll`, a guard
   * resolving during a click) — every write goes through `setExpanded`, so the
   * ref is always the truth the pipeline sees.
   */
  const expandedRef = useRef<ReadonlySet<string>>(expandedIds);
  const setExpanded = (next: ReadonlySet<string>): void => {
    expandedRef.current = next;
    setExpandedIdsState(next);
  };

  const [pendingIds, setPendingIdsState] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const pendingRef = useRef<ReadonlySet<string>>(pendingIds);
  const setPending = (id: string, pending: boolean): void => {
    const next = new Set(pendingRef.current);
    if (pending) next.add(id);
    else next.delete(id);
    pendingRef.current = next;
    setPendingIdsState(next);
  };

  const [renderedIds, setRenderedIdsState] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const renderedRef = useRef<ReadonlySet<string>>(renderedIds);
  const setRendered = (next: ReadonlySet<string>): void => {
    renderedRef.current = next;
    setRenderedIdsState(next);
  };

  const [loadStates, setLoadStatesState] = useState<
    ReadonlyMap<string, OgeAccordionLoadState>
  >(() => new Map());
  const loadRef =
    useRef<ReadonlyMap<string, OgeAccordionLoadState>>(loadStates);
  const setLoadStates = (
    next: ReadonlyMap<string, OgeAccordionLoadState>,
  ): void => {
    loadRef.current = next;
    setLoadStatesState(next);
  };

  const [fadePhases, setFadePhases] = useState<ReadonlyMap<string, number>>(
    () => new Map(),
  );

  /** Panel ids whose expand/collapse animation has not reported back yet. */
  const awaitingAfterEvent = useRef(new Map<string, boolean>());
  /** Ids already considered for their `expanded: true` seed. */
  const seededIds = useRef(new Set<string>());
  const typeAheadBuffer = useRef(createTypeAheadBuffer());

  /**
   * DOM registries filled by the component: the header buttons and panels, so
   * the pipeline can move focus and read the panel's transition duration.
   */
  const toggleElements = useRef(new Map<string, HTMLButtonElement>());
  const panelElements = useRef(new Map<string, HTMLElement>());

  const latest = useRef({ props, descriptors, multiple, collapsible });
  latest.current = { props, descriptors, multiple, collapsible };

  const isDisabled = (d: OgeReactAccordionDescriptor | undefined): boolean =>
    !d || d.disabled || (latest.current.props.disabled ?? false);

  const canCollapse = (id: string): boolean =>
    canCollapseAccordionPanel(
      expandedRef.current,
      id,
      latest.current.collapsible,
    );

  // --- content loader ------------------------------------------------------

  const startLoad = (d: OgeReactAccordionDescriptor, index: number): void => {
    const loader = d.contentLoader;
    if (!loader) return;
    const write = (state: OgeAccordionLoadState): void =>
      setLoadStates(new Map(loadRef.current).set(d.id, state));
    write({ status: 'loading' });
    let promise: Promise<unknown>;
    try {
      promise = loader();
    } catch (error) {
      write({ status: 'failed', error });
      latest.current.props.onItemContentFailed?.({
        index,
        key: d.key,
        item: d.item,
        error,
      });
      return;
    }
    promise.then(
      (data) => {
        write({ status: 'loaded', data });
        // replay the fade so late-arriving content is not stamped in silently
        setFadePhases((phases) => {
          const copy = new Map(phases);
          copy.set(d.id, copy.get(d.id) === 1 ? 2 : 1);
          return copy;
        });
        latest.current.props.onItemContentLoaded?.({
          index,
          key: d.key,
          item: d.item,
          data,
        });
      },
      (error: unknown) => {
        write({ status: 'failed', error });
        latest.current.props.onItemContentFailed?.({
          index,
          key: d.key,
          item: d.item,
          error,
        });
      },
    );
  };

  const retryLoad = (d: OgeReactAccordionDescriptor, index: number): void =>
    startLoad(d, index);

  // --- after-animation events ---------------------------------------------

  const animationEnabled = (): boolean => (props.animation ?? true) !== false;

  /** Whether the panel element currently has a non-zero transition duration. */
  const panelAnimates = (id: string): boolean => {
    const panel = panelElements.current.get(id);
    const view = panel?.ownerDocument?.defaultView;
    if (!panel || !view?.getComputedStyle) return false;
    return view
      .getComputedStyle(panel)
      .transitionDuration.split(',')
      .some((value) => parseFloat(value) > 0);
  };

  const scheduleAfterEvent = (
    d: OgeReactAccordionDescriptor,
    index: number,
    expanded: boolean,
  ): void => {
    const payload = { index, key: d.key, item: d.item };
    if (!animationEnabled() || !panelAnimates(d.id)) {
      awaitingAfterEvent.current.delete(d.id);
      if (expanded) latest.current.props.onAfterExpand?.(payload);
      else latest.current.props.onAfterCollapse?.(payload);
      return;
    }
    awaitingAfterEvent.current.set(d.id, expanded);
  };

  const onPanelTransitionEnd = (
    d: OgeReactAccordionDescriptor,
    index: number,
    event: { propertyName: string; target: EventTarget | null },
  ): void => {
    if (event.propertyName !== 'grid-template-rows') return;
    if (event.target !== panelElements.current.get(d.id)) return;
    const expanded = awaitingAfterEvent.current.get(d.id);
    if (expanded === undefined) return;
    awaitingAfterEvent.current.delete(d.id);
    const payload = { index, key: d.key, item: d.item };
    if (expanded) latest.current.props.onAfterExpand?.(payload);
    else latest.current.props.onAfterCollapse?.(payload);
  };

  // --- expand / collapse pipelines -----------------------------------------

  const commitExpand = (
    d: OgeReactAccordionDescriptor,
    index: number,
    event?: Event,
  ): void => {
    const { descriptors: ds, props: p, multiple: many } = latest.current;
    const current = expandedRef.current;
    setExpanded(expandedIdsAfterExpand(current, d.id, many));
    setRendered(new Set(renderedRef.current).add(d.id));
    if (d.contentLoader && !loadRef.current.has(d.id)) startLoad(d, index);
    // panels that lost their expansion in single mode
    if (!many) {
      for (const id of current) {
        if (id === d.id) continue;
        const previous = ds.findIndex((x) => x.id === id);
        if (previous === -1) continue;
        const prev = ds[previous];
        p.onItemCollapsed?.({
          index: previous,
          key: prev.key,
          item: prev.item,
          event,
        });
      }
    }
    p.onItemExpanded?.({ index, key: d.key, item: d.item, event });
    scheduleAfterEvent(d, index, true);
  };

  const commitCollapse = (
    d: OgeReactAccordionDescriptor,
    index: number,
    event?: Event,
  ): void => {
    // A collapsed panel becomes `inert`, which would drop focus to <body> if
    // it still held it — hand focus back to the header first.
    const panel = panelElements.current.get(d.id);
    const active = panel?.ownerDocument?.activeElement;
    if (panel && active && panel.contains(active)) {
      toggleElements.current.get(d.id)?.focus();
    }
    setExpanded(expandedIdsAfterCollapse(expandedRef.current, d.id));
    if (
      (latest.current.props.deferRendering ?? true) &&
      !(latest.current.props.keepAlive ?? true)
    ) {
      const rendered = new Set(renderedRef.current);
      rendered.delete(d.id);
      setRendered(rendered);
      const loads = new Map(loadRef.current);
      loads.delete(d.id);
      setLoadStates(loads);
    }
    latest.current.props.onItemCollapsed?.({
      index,
      key: d.key,
      item: d.item,
      event,
    });
    scheduleAfterEvent(d, index, false);
  };

  const requestExpand = (index: number, event?: Event): Promise<boolean> => {
    const d = latest.current.descriptors[index];
    if (!d || isDisabled(d) || pendingRef.current.has(d.id)) {
      return Promise.resolve(false);
    }
    if (expandedRef.current.has(d.id)) return Promise.resolve(true);
    const expanding: OgeAccordionExpandingEvent = {
      index,
      key: d.key,
      item: d.item,
      event,
      cancel: false,
    };
    latest.current.props.onItemExpanding?.(expanding);
    if (expanding.cancel) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      runAsyncGuard(d.expandGuard, {
        allow: () => {
          commitExpand(d, index, event);
          resolve(true);
        },
        deny: () => resolve(false),
        pending: (active) => setPending(d.id, active),
        label: 'oge-accordion expandGuard',
      });
    });
  };

  const requestCollapse = (index: number, event?: Event): Promise<boolean> => {
    const d = latest.current.descriptors[index];
    if (!d || isDisabled(d) || pendingRef.current.has(d.id)) {
      return Promise.resolve(false);
    }
    if (!expandedRef.current.has(d.id)) return Promise.resolve(true);
    if (!canCollapse(d.id)) return Promise.resolve(false);
    const collapsing: OgeAccordionCollapsingEvent = {
      index,
      key: d.key,
      item: d.item,
      event,
      cancel: false,
    };
    latest.current.props.onItemCollapsing?.(collapsing);
    if (collapsing.cancel) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      runAsyncGuard(d.expandGuard, {
        allow: () => {
          commitCollapse(d, index, event);
          resolve(true);
        },
        deny: () => resolve(false),
        pending: (active) => setPending(d.id, active),
        label: 'oge-accordion expandGuard',
      });
    });
  };

  // --- controlled pairs ----------------------------------------------------

  /** Last key list this component pushed out — tells an echo from a real write. */
  const lastEmittedKeys = useRef<readonly string[]>([]);
  const lastEmittedIndex = useRef(-1);

  const controlledKeys = props.expandedKeys;
  const keysSignature = controlledKeys?.join(' ');
  const controlledIndex = props.selectedIndex;

  // Seed the initial expansion once per panel — `expanded: true` on an item,
  // plus the uncontrolled `defaultExpandedKeys` / `defaultSelectedIndex`.
  const seededDefaults = useRef(false);
  useEffect(() => {
    const ds = latest.current.descriptors;
    const many = latest.current.multiple;
    let next = expandedRef.current;
    if (!seededDefaults.current) {
      seededDefaults.current = true;
      const p = latest.current.props;
      const fromKeys = ds.filter(
        (d) => d.key !== undefined && p.defaultExpandedKeys?.includes(d.key),
      );
      for (const d of fromKeys) {
        next = expandedIdsAfterExpand(next, d.id, many);
        if (!many) break;
      }
      const fromIndex = ds[p.defaultSelectedIndex ?? -1];
      if (fromIndex) next = expandedIdsAfterExpand(next, fromIndex.id, many);
    }
    const fresh = ds.filter(
      (d) => d.initiallyExpanded && !seededIds.current.has(d.id),
    );
    ds.forEach((d) => seededIds.current.add(d.id));
    for (const d of fresh) {
      next = expandedIdsAfterExpand(next, d.id, many);
      if (!many) break;
    }
    if (!sameAccordionIds(next, expandedRef.current)) setExpanded(next);
    // `signature` stands in for the descriptor list, which is rebuilt each render
  }, [signature]);

  // expandedKeys → expanded ids (controlled).
  useEffect(() => {
    if (controlledKeys === undefined) return;
    if (sameAccordionKeys(controlledKeys, lastEmittedKeys.current)) return;
    lastEmittedKeys.current = controlledKeys;
    const ds = latest.current.descriptors;
    const keyed = new Set(
      ds.filter((d) => d.key !== undefined).map((d) => d.id),
    );
    // panels without a key are not addressable by expandedKeys — keep them
    const next = new Set(
      [...expandedRef.current].filter((id) => !keyed.has(id)),
    );
    ds.filter((d) => d.key !== undefined && controlledKeys.includes(d.key))
      .map((d) => d.id)
      .forEach((id) => next.add(id));
    if (!sameAccordionIds(next, expandedRef.current)) setExpanded(next);
  }, [keysSignature, signature]);

  // selectedIndex → expanded ids (controlled single-expand pair).
  useEffect(() => {
    if (controlledIndex === undefined) return;
    if (controlledIndex === lastEmittedIndex.current) return;
    lastEmittedIndex.current = controlledIndex;
    const target = latest.current.descriptors[controlledIndex];
    if (!target || expandedRef.current.has(target.id)) return;
    setExpanded(
      expandedIdsAfterExpand(
        expandedRef.current,
        target.id,
        latest.current.multiple,
      ),
    );
  }, [controlledIndex, signature]);

  // Drop state for panels that disappeared.
  useEffect(() => {
    const alive = new Set(latest.current.descriptors.map((d) => d.id));
    const pruned = new Set(
      [...expandedRef.current].filter((id) => alive.has(id)),
    );
    if (pruned.size !== expandedRef.current.size) setExpanded(pruned);
  }, [signature]);

  // expanded ids → expandedKeys + selectedIndex.
  useEffect(() => {
    const ds = latest.current.descriptors;
    const keys = ds
      .filter((d) => d.key !== undefined && expandedIds.has(d.id))
      .map((d) => d.key as string);
    if (!sameAccordionKeys(keys, lastEmittedKeys.current)) {
      lastEmittedKeys.current = keys;
      latest.current.props.onExpandedKeysChange?.(keys);
    }
    const index = ds.findIndex((d) => expandedIds.has(d.id));
    if (index !== lastEmittedIndex.current) {
      lastEmittedIndex.current = index;
      latest.current.props.onSelectedIndexChange?.(index);
    }
  }, [expandedIds, signature]);

  // --- public helpers ------------------------------------------------------

  const expand = useCallback((target: number | string): Promise<boolean> => {
    const index = resolveAccordionIndex(latest.current.descriptors, target);
    return index === -1 ? Promise.resolve(false) : requestExpand(index);
    // every dependency is read through `latest`
  }, []);

  const collapse = useCallback((target: number | string): Promise<boolean> => {
    const index = resolveAccordionIndex(latest.current.descriptors, target);
    return index === -1 ? Promise.resolve(false) : requestCollapse(index);
  }, []);

  const toggle = useCallback((target: number | string): Promise<boolean> => {
    const index = resolveAccordionIndex(latest.current.descriptors, target);
    if (index === -1) return Promise.resolve(false);
    const d = latest.current.descriptors[index];
    return expandedRef.current.has(d.id)
      ? requestCollapse(index)
      : requestExpand(index);
  }, []);

  const expandAll = useCallback((): void => {
    if (!latest.current.multiple) {
      if (isDevMode()) {
        console.warn(
          '[oge-accordion] expandAll() requires multiple — ignored.',
        );
      }
      return;
    }
    latest.current.descriptors.forEach((d, index) => {
      if (!expandedRef.current.has(d.id)) void requestExpand(index);
    });
  }, []);

  const collapseAll = useCallback((): void => {
    latest.current.descriptors.forEach((_d, index) => requestCollapse(index));
  }, []);

  const expandInvalid = useCallback((): void => {
    const ds = latest.current.descriptors;
    const invalid = ds
      .map((d, index) => ({ d, index }))
      .filter(({ d }) => d.invalid && !expandedRef.current.has(d.id));
    if (invalid.length === 0) return;
    if (!latest.current.multiple) {
      void requestExpand(invalid[0].index);
      return;
    }
    invalid.forEach(({ index }) => void requestExpand(index));
  }, []);

  const isExpanded = useCallback((target: number | string): boolean => {
    const index = resolveAccordionIndex(latest.current.descriptors, target);
    const d = latest.current.descriptors[index];
    return d ? expandedRef.current.has(d.id) : false;
  }, []);

  return {
    uid: uid.current,
    messages,
    descriptors,
    expandedIds,
    pendingIds,
    renderedIds,
    loadStates,
    fadePhases,
    multiple,
    collapsible,
    deferRendering,
    keepAlive,
    disabled,
    animation,
    toggleElements,
    panelElements,
    typeAheadBuffer,
    isDisabled,
    canCollapse,
    requestExpand,
    requestCollapse,
    retryLoad,
    onPanelTransitionEnd,
    expand,
    collapse,
    toggle,
    expandAll,
    collapseAll,
    expandInvalid,
    isExpanded,
  };
}
