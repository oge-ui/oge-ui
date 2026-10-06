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
  type ReactNode,
} from 'react';
import {
  flattenOgePanelBarItems,
  ogePanelBarExpansionAfter,
  ogePanelBarIndex,
  ogePanelBarInitialExpanded,
  ogePanelBarKeyAction,
  ogePanelBarKeyIntent,
  ogeResolveDirection,
  runOgeExpansionToggle,
  type OgePanelBarExpandMode,
  type OgePanelBarItem,
  type OgePanelBarItemClickEvent,
  type OgePanelBarItemCollapsingEvent,
  type OgePanelBarItemExpandingEvent,
  type OgePanelBarItemToggleEvent,
  type OgePanelBarNode,
  type OgePanelBarSelectionChangedEvent,
} from '@oge-ui/behavior';
import { isDevMode } from './dev';
import { useOgeAccordionConfig } from './layout-config';

/**
 * One entry of `<OgePanelBar>`'s `items` — the shared `OgePanelBarItem` with
 * a `ReactNode` body and nested definitions.
 */
export interface OgePanelBarItemDefinition extends Omit<
  OgePanelBarItem,
  'content' | 'children'
> {
  /**
   * Body of a content item — a group that expands into free content instead
   * of child items. Rendered on first expand; `renderContent` replaces it.
   */
  readonly content?: ReactNode;
  /** Child items — makes this entry an expandable group. */
  readonly children?: readonly OgePanelBarItemDefinition[];
}

/** Context of `renderHeader`. */
export interface OgePanelBarHeaderContext {
  readonly item: OgePanelBarItemDefinition;
  /** 1-based nesting depth of the item. */
  readonly level: number;
  /** Whether the item's group is expanded. */
  readonly expanded: boolean;
  /** Whether the item is the selected one. */
  readonly selected: boolean;
}

/** Context of `renderContent`. */
export interface OgePanelBarContentContext {
  readonly item: OgePanelBarItemDefinition;
  /** 1-based nesting depth of the item. */
  readonly level: number;
}

type Def = OgePanelBarItemDefinition;
type Node = OgePanelBarNode<Def>;

export interface OgePanelBarProps {
  /** The item tree; an entry with `children` (or `content`) is an expandable group. */
  items?: readonly OgePanelBarItemDefinition[];
  /**
   * `multiple` (default) lets groups open independently; `single` collapses
   * a group's open siblings; `full` is `single` with the open root group
   * filling the host's height.
   */
  expandMode?: OgePanelBarExpandMode;
  /**
   * The selected item (controlled) — its `key`, or its position id (`p0-1`)
   * when it has none.
   */
  selectedKey?: string;
  /** Initial selection when uncontrolled. */
  defaultSelectedKey?: string;
  /** The selection a click committed — the controlled half of `selectedKey`. */
  onSelectedKeyChange?: (key: string) => void;
  /**
   * Ids (`key` or position id) of the expanded groups (controlled). When
   * uncontrolled, the items' own `expanded` flags seed the state once.
   */
  expandedKeys?: readonly string[];
  /** Initial expanded ids when uncontrolled (overrides the items' flags). */
  defaultExpandedKeys?: readonly string[];
  /** The expanded ids after a toggle — the controlled half of `expandedKeys`. */
  onExpandedKeysChange?: (keys: string[]) => void;
  /** Disables the whole panel bar. */
  disabled?: boolean;
  /**
   * Render a group's children or content only from its first expand on
   * (kept afterwards). `false` renders every level up front.
   */
  deferRendering?: boolean;
  /**
   * Height animation: `true` uses the default duration, a number overrides it
   * in milliseconds, `false` disables it. Suppressed under reduced motion.
   */
  animation?: boolean | number;
  /** Enables Up/Down/Home/End and Right/Left header navigation. */
  keyboardNavigation?: boolean;
  /** Accessible name of the root list. */
  ariaLabel?: string;
  /**
   * Replaces the icon / title / description / badge layout inside each
   * header button — no focusable controls, it renders inside the `<button>`.
   */
  renderHeader?: (context: OgePanelBarHeaderContext) => ReactNode;
  /** Renders the body of every content item (replaces its `content`). */
  renderContent?: (context: OgePanelBarContentContext) => ReactNode;
  /** A header was activated — before it toggles or selects. */
  onItemClick?: (event: OgePanelBarItemClickEvent<Def>) => void;
  /** Cancelable pre-event of a group expanding. */
  onItemExpanding?: (event: OgePanelBarItemExpandingEvent<Def>) => void;
  /** Cancelable pre-event of a group collapsing. */
  onItemCollapsing?: (event: OgePanelBarItemCollapsingEvent<Def>) => void;
  /** A group expanded. */
  onItemExpanded?: (event: OgePanelBarItemToggleEvent<Def>) => void;
  /** A group collapsed — also each sibling a `single` / `full` expand closed. */
  onItemCollapsed?: (event: OgePanelBarItemToggleEvent<Def>) => void;
  /** The selected item changed through a user click. */
  onSelectionChanged?: (event: OgePanelBarSelectionChangedEvent<Def>) => void;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgePanelBar>`. */
export interface OgePanelBarHandle {
  /** Whether the group with this id (`key` or position id) is expanded. */
  isExpanded(id: string): boolean;
  /** Runs the expand pipeline; resolves whether the group ended up expanded. */
  expand(id: string): Promise<boolean>;
  /** Runs the collapse pipeline; resolves whether the group ended up collapsed. */
  collapse(id: string): Promise<boolean>;
  /** Expands a collapsed group, collapses an expanded one. */
  toggle(id: string): Promise<boolean>;
  /** Expands every enabled group (`multiple` mode only). */
  expandAll(): void;
  /** Collapses every expanded group. */
  collapseAll(): void;
  /** Focuses a header by id, or the first enabled one. */
  focus(id?: string): void;
}

/**
 * A vertical navigation stack whose headers expand into nested groups or
 * free content — the React render of the Angular `<oge-panel-bar>` (Kendo's
 * PanelBar). Leaves are selectable (`selectedKey`, announced as
 * `aria-current`), groups follow `expandMode`.
 *
 * Built on the APG **disclosure** pattern, not treeview: groups may hold
 * free content, which a `role="tree"` cannot own. Every header is a real
 * `<button>` in the Tab sequence; collapsed groups are `inert`. Up / Down /
 * Home / End and Right / Left (mirrored in RTL) are layered on top. The rules
 * are `@oge-ui/behavior`'s `panel-bar-core`, shared with Angular.
 *
 * ```tsx
 * <OgePanelBar items={nav} expandMode="single" selectedKey={page} onSelectedKeyChange={setPage} />
 * ```
 */
export const OgePanelBar = forwardRef<OgePanelBarHandle, OgePanelBarProps>(
  function OgePanelBarRender(props, ref) {
    const {
      items,
      expandMode = 'multiple',
      disabled = false,
      deferRendering = true,
      animation = true,
      keyboardNavigation = true,
    } = props;
    const config = useOgeAccordionConfig();
    const uid = `oge-panel-bar-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const containerRef = useRef<HTMLDivElement | null>(null);

    const nodes = useMemo(() => flattenOgePanelBarItems<Def>(items), [items]);
    const byId = useMemo(() => ogePanelBarIndex(nodes), [nodes]);

    // --- expanded state (controlled or seeded once per id) ------------------
    const seeded = useRef<Set<string> | null>(null);
    const [internalExpanded, setInternalExpanded] = useState<
      ReadonlySet<string>
    >(() => {
      seeded.current = new Set(nodes.map((n) => n.id));
      return props.defaultExpandedKeys
        ? new Set(props.defaultExpandedKeys)
        : ogePanelBarInitialExpanded(nodes, expandMode);
    });
    const expandedControlled = props.expandedKeys !== undefined;
    const expandedIds: ReadonlySet<string> = useMemo(
      () =>
        expandedControlled ? new Set(props.expandedKeys) : internalExpanded,
      [expandedControlled, props.expandedKeys, internalExpanded],
    );

    // items that arrive later seed their own `expanded` flag (uncontrolled)
    useEffect(() => {
      if (expandedControlled) return;
      const known = seeded.current ?? new Set<string>();
      const fresh = nodes.filter((n) => !known.has(n.id));
      fresh.forEach((n) => known.add(n.id));
      seeded.current = known;
      const initial = ogePanelBarInitialExpanded(nodes, expandMode);
      const toOpen = fresh.filter((n) => initial.has(n.id));
      if (toOpen.length === 0) return;
      setInternalExpanded((current) => {
        let next = current;
        for (const n of toOpen) {
          next = ogePanelBarExpansionAfter(
            nodes,
            next,
            n.id,
            true,
            expandMode,
          ).next;
        }
        return next;
      });
    }, [nodes, expandMode, expandedControlled]);

    // --- selection ------------------------------------------------------------
    const [internalSelected, setInternalSelected] = useState(
      props.defaultSelectedKey,
    );
    const selectedKey =
      props.selectedKey !== undefined ? props.selectedKey : internalSelected;

    // lazily rendered groups stay rendered once opened
    const rendered = useRef(new Set<string>());
    expandedIds.forEach((id) => rendered.current.add(id));

    // async-safe reads for the pipeline and the handle
    const live = useRef({ props, expandedIds, nodes, byId, selectedKey });
    live.current = { props, expandedIds, nodes, byId, selectedKey };

    const isDisabled = (n: Node): boolean =>
      n.disabled || (live.current.props.disabled ?? false);

    const headerFor = (id: string): HTMLButtonElement | undefined => {
      const headers =
        containerRef.current?.querySelectorAll<HTMLButtonElement>(
          '.oge-panel-bar-header',
        ) ?? [];
      return Array.from(headers).find((el) => el.dataset['nodeId'] === id);
    };

    const commitExpanded = (next: ReadonlySet<string>): void => {
      const now = live.current;
      if (now.props.expandedKeys === undefined) setInternalExpanded(next);
      live.current = { ...now, expandedIds: next };
      now.props.onExpandedKeysChange?.(
        now.nodes.filter((n) => next.has(n.id)).map((n) => n.id),
      );
    };

    const requestToggle = (
      n: Node,
      expand: boolean,
      event?: Event,
    ): Promise<boolean> => {
      const now = live.current;
      return runOgeExpansionToggle<
        OgePanelBarItemExpandingEvent<Def> | OgePanelBarItemCollapsingEvent<Def>
      >({
        next: expand,
        current: now.expandedIds.has(n.id),
        disabled: !n.expandable || isDisabled(n),
        pending: false,
        preEvent: () => ({
          item: n.item,
          key: n.key,
          level: n.level,
          event,
          cancel: false,
        }),
        emitPre: (pre) =>
          expand
            ? live.current.props.onItemExpanding?.(pre)
            : live.current.props.onItemCollapsing?.(pre),
        commit: () => {
          const latest = live.current;
          if (!expand) {
            // the group turns inert — hand focus to its header first
            const panel = containerRef.current?.ownerDocument?.getElementById(
              `${uid}-g-${n.id}`,
            );
            const active = containerRef.current?.ownerDocument?.activeElement;
            if (panel && active && panel.contains(active)) {
              headerFor(n.id)?.focus();
            }
          }
          const change = ogePanelBarExpansionAfter(
            latest.nodes,
            latest.expandedIds,
            n.id,
            expand,
            latest.props.expandMode ?? 'multiple',
          );
          commitExpanded(change.next);
          for (const id of change.collapsed) {
            const sibling = latest.byId.get(id);
            if (!sibling) continue;
            latest.props.onItemCollapsed?.({
              item: sibling.item,
              key: sibling.key,
              level: sibling.level,
              event,
            });
          }
          const payload = { item: n.item, key: n.key, level: n.level, event };
          if (expand) latest.props.onItemExpanded?.(payload);
          else latest.props.onItemCollapsed?.(payload);
        },
      });
    };

    const select = (n: Node, event?: Event): void => {
      const now = live.current;
      const previous = now.selectedKey;
      if (previous === n.id) return;
      if (now.props.selectedKey === undefined) setInternalSelected(n.id);
      live.current = { ...now, selectedKey: n.id };
      now.props.onSelectedKeyChange?.(n.id);
      now.props.onSelectionChanged?.({
        item: n.item,
        key: n.key,
        previousKey: previous,
        event,
      });
    };

    useImperativeHandle(ref, () => ({
      isExpanded: (id) => live.current.expandedIds.has(id),
      expand: (id) => {
        const n = live.current.byId.get(id);
        return n ? requestToggle(n, true) : Promise.resolve(false);
      },
      collapse: (id) => {
        const n = live.current.byId.get(id);
        return n ? requestToggle(n, false) : Promise.resolve(false);
      },
      toggle: (id) => {
        const n = live.current.byId.get(id);
        if (!n) return Promise.resolve(false);
        return requestToggle(n, !live.current.expandedIds.has(n.id));
      },
      expandAll: () => {
        if ((live.current.props.expandMode ?? 'multiple') !== 'multiple') {
          if (isDevMode()) {
            console.warn(
              '[OgePanelBar] expandAll() requires expandMode="multiple" — ignored.',
            );
          }
          return;
        }
        for (const n of live.current.nodes) {
          if (n.expandable && !live.current.expandedIds.has(n.id)) {
            void requestToggle(n, true);
          }
        }
      },
      collapseAll: () => {
        for (const n of [...live.current.nodes].reverse()) {
          if (live.current.expandedIds.has(n.id)) void requestToggle(n, false);
        }
      },
      focus: (id) => {
        const target =
          id ??
          live.current.nodes.find((n) => n.parentId === null && !isDisabled(n))
            ?.id;
        if (target !== undefined) headerFor(target)?.focus();
      },
    }));

    const onHeaderKeyDown = (
      n: Node,
      event: ReactKeyboardEvent<HTMLButtonElement>,
    ): void => {
      if (!keyboardNavigation) return;
      const rtl = ogeResolveDirection(containerRef.current) === 'rtl';
      const intent = ogePanelBarKeyIntent(event.key, event, rtl);
      if (intent === null) return;
      const action = ogePanelBarKeyAction(nodes, expandedIds, n.id, intent);
      if (!action) return;
      event.preventDefault();
      if (action.kind === 'focus') {
        headerFor(action.id)?.focus();
        return;
      }
      const target = byId.get(action.id);
      if (target) {
        void requestToggle(target, action.kind === 'expand', event.nativeEvent);
      }
    };

    const renderLevel = (ids: readonly string[]): ReactNode =>
      ids.map((id) => {
        const n = byId.get(id);
        if (!n) return null;
        const expanded = expandedIds.has(n.id);
        const selected = selectedKey === n.id;
        const off = isDisabled(n);
        const showBody = !deferRendering || rendered.current.has(n.id);
        return (
          <li
            key={n.id}
            className={[
              'oge-panel-bar-item',
              n.expandable && 'oge-panel-bar-item-group',
              expanded && 'oge-panel-bar-item-expanded',
              selected && 'oge-panel-bar-item-selected',
              off && 'oge-panel-bar-item-disabled',
            ]
              .filter(Boolean)
              .join(' ')}
            data-level={n.level}
          >
            <button
              type="button"
              className="oge-panel-bar-header"
              style={{ ['--oge-panel-bar-level']: n.level } as CSSProperties}
              id={`${uid}-h-${n.id}`}
              data-node-id={n.id}
              aria-expanded={n.expandable ? expanded : undefined}
              aria-controls={n.expandable ? `${uid}-g-${n.id}` : undefined}
              aria-current={selected ? 'true' : undefined}
              aria-disabled={off ? true : undefined}
              tabIndex={off ? -1 : 0}
              title={n.item.hint}
              onClick={(event) => {
                live.current.props.onItemClick?.({
                  item: n.item,
                  key: n.key,
                  level: n.level,
                  event: event.nativeEvent,
                });
                if (isDisabled(n)) return;
                if (n.selectable) select(n, event.nativeEvent);
                if (n.expandable) {
                  void requestToggle(
                    n,
                    !live.current.expandedIds.has(n.id),
                    event.nativeEvent,
                  );
                }
              }}
              onKeyDown={(event) => onHeaderKeyDown(n, event)}
            >
              {props.renderHeader ? (
                props.renderHeader({
                  item: n.item,
                  level: n.level,
                  expanded,
                  selected,
                })
              ) : (
                <>
                  {n.item.icon && (
                    <svg
                      className="oge-panel-bar-icon"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      aria-hidden="true"
                    >
                      <path
                        d={n.item.icon}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  <span className="oge-panel-bar-titles">
                    <span className="oge-panel-bar-title">{n.item.title}</span>
                    {n.item.description && (
                      <span className="oge-panel-bar-description">
                        {n.item.description}
                      </span>
                    )}
                  </span>
                  {n.item.badge !== undefined && (
                    <span className="oge-panel-bar-badge">{n.item.badge}</span>
                  )}
                </>
              )}
              {n.expandable && (
                <span className="oge-panel-bar-chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path
                      d="M6 9l6 6 6-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </button>
            {n.expandable && (
              <div
                className={[
                  'oge-panel-bar-panel',
                  expanded && 'oge-panel-bar-panel-open',
                  animation !== false && 'oge-panel-bar-panel-animated',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  typeof animation === 'number'
                    ? ({
                        ['--oge-panel-bar-transition']: `${animation}ms`,
                      } as CSSProperties)
                    : undefined
                }
                id={`${uid}-g-${n.id}`}
                inert={!expanded}
              >
                <div className="oge-panel-bar-panel-inner">
                  {showBody &&
                    (n.hasChildren ? (
                      <ul className="oge-panel-bar-group" role="list">
                        {renderLevel(n.childIds)}
                      </ul>
                    ) : (
                      <div className="oge-panel-bar-content">
                        {props.renderContent
                          ? props.renderContent({
                              item: n.item,
                              level: n.level,
                            })
                          : n.item.content}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </li>
        );
      });

    const rootIds = nodes.filter((n) => n.parentId === null).map((n) => n.id);

    return (
      <div
        ref={containerRef}
        className={[
          'oge-panel-bar',
          expandMode === 'full' && 'oge-panel-bar-full',
          disabled && 'oge-disabled',
          props.className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={props.style}
        data-expand-mode={expandMode}
      >
        {nodes.length === 0 ? (
          <div className="oge-panel-bar-empty">{config.messages.noData}</div>
        ) : (
          <ul
            className="oge-panel-bar-group oge-panel-bar-root"
            role="list"
            aria-label={props.ariaLabel}
          >
            {renderLevel(rootIds)}
          </ul>
        )}
      </div>
    );
  },
);
