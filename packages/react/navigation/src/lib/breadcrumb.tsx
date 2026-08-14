'use client';

import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  breadcrumbDataDescriptors,
  breadcrumbMenuItems,
  fitBreadcrumbDescriptors,
  type OgeBreadcrumbCollapseMode,
  type OgeBreadcrumbDescriptorCore,
  type OgeBreadcrumbItemClickEvent,
  type OgeBreadcrumbItemData,
  type OgeBreadcrumbMessages,
} from '@oge-ui/behavior';
import {
  OgeMenuList,
  OgePopup,
  useAnchoredPanel,
  useOgeOverlayConfig,
  type OgeMenuListHandle,
} from '@oge-ui/react-overlay';
import { useOgeBreadcrumbConfig } from './navigation-config';

/** Context of the `renderItem` render prop — the Angular item template. */
export interface OgeBreadcrumbItemRenderContext {
  item: OgeBreadcrumbItemData;
  index: number;
  /** `true` on the current page's crumb. */
  last: boolean;
}

/** Context of the `renderSeparator` render prop. */
export interface OgeBreadcrumbSeparatorRenderContext {
  /** Index of the crumb the separator precedes. */
  index: number;
}

/** The public methods of `<OgeBreadcrumb>`, reached through its `ref`. */
export interface OgeBreadcrumbHandle {
  /** Focuses the first interactive crumb (or the ellipsis when collapsed). */
  focus(): void;
}

export interface OgeBreadcrumbProps {
  /** The trail, oldest crumb first; the last one is the current page. */
  items?: readonly OgeBreadcrumbItemData[];
  /**
   * `'auto'` (default) collapses the oldest middle crumbs into an ellipsis
   * menu against the **container** width; `'wrap'` breaks onto multiple rows;
   * `'none'` keeps one scrollable row.
   */
  collapseMode?: OgeBreadcrumbCollapseMode;
  /** Per-instance overrides of the config strings. */
  messages?: Partial<OgeBreadcrumbMessages>;
  /** Replaces the crumb's interior — the link/current/disabled semantics stay. */
  renderItem?: (context: OgeBreadcrumbItemRenderContext) => ReactNode;
  /** Replaces the default chevron separator (rendered `aria-hidden`). */
  renderSeparator?: (context: OgeBreadcrumbSeparatorRenderContext) => ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
  /**
   * A crumb (link, button or collapsed menu row) was activated. Not fired by
   * disabled crumbs or by the last crumb — that is the current page.
   */
  onItemClick?: (event: OgeBreadcrumbItemClickEvent) => void;
}

/**
 * WAI-ARIA APG breadcrumb: a `<nav>` landmark holding an ordered list of
 * links, the current page carrying `aria-current="page"` — the React render of
 * the Angular `<oge-breadcrumb>`, over the same `@oge-ui/behavior` decisions
 * (descriptor normalization, the collapse fit, the menu rows) and the same
 * `.oge-breadcrumb-*` classes.
 *
 * ```tsx
 * <OgeBreadcrumb items={trail} onItemClick={(e) => go(e.item)} />
 * ```
 *
 * The APG defines no keyboard behavior for it — crumbs are plain links in the
 * Tab order, so there is deliberately no roving tabindex here.
 *
 * `collapseMode: 'auto'` (default) collapses the **oldest middle** crumbs into
 * an ellipsis menu when the container runs out of room — the first and last
 * crumb always stay visible, and unlike the references the collapsed crumbs
 * remain reachable: the menu renders them as real links.
 */
export const OgeBreadcrumb = forwardRef<
  OgeBreadcrumbHandle,
  OgeBreadcrumbProps
>(function OgeBreadcrumb(props, ref) {
  const { items, renderItem, renderSeparator, className, style, id } = props;

  const config = useOgeBreadcrumbConfig();
  const overlayConfig = useOgeOverlayConfig();
  const messages = useMemo<OgeBreadcrumbMessages>(
    () => ({ ...config.messages, ...props.messages }),
    [config.messages, props.messages],
  );
  const collapseMode =
    props.collapseMode ?? config.collapseMode ?? ('auto' as const);

  const hostRef = useRef<HTMLDivElement>(null);
  const ellipsisLiRef = useRef<HTMLLIElement>(null);
  const ellipsisButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<OgeMenuListHandle>(null);
  const crumbEls = useRef(new Map<string, HTMLLIElement>());
  const pendingMenuFocus = useRef<'first' | 'last' | null>(null);

  const latest = useRef(props);
  latest.current = props;

  const descriptors = useMemo<readonly OgeBreadcrumbDescriptorCore[]>(
    () => breadcrumbDataDescriptors(items),
    [items],
  );

  const [containerSize, setContainerSize] = useState(0);
  const [sizes, setSizes] = useState<ReadonlyMap<string, number>>(
    () => new Map(),
  );
  const [ellipsisSize, setEllipsisSize] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const fit = useMemo(
    () =>
      fitBreadcrumbDescriptors({
        descriptors,
        collapseMode,
        containerSize,
        sizes,
        ellipsisSize,
      }),
    [descriptors, collapseMode, containerSize, sizes, ellipsisSize],
  );

  const collapsed = useMemo(() => new Set(fit.inMenu), [fit]);
  const menuVisible = fit.menuVisible;

  const menuItems = useMemo(
    () => breadcrumbMenuItems(descriptors, collapsed),
    [descriptors, collapsed],
  );

  // --- measurement ---------------------------------------------------------

  const measure = useCallback((): void => {
    const host = hostRef.current;
    if (!host) return;
    setContainerSize(host.clientWidth);
    setSizes((current) => {
      // The map is cloned only once a real change is found, so a steady trail
      // re-measures without allocating.
      let next: Map<string, number> | null = null;
      for (const [crumbId, el] of crumbEls.current) {
        const width = el.offsetWidth;
        // Hidden (collapsed) crumbs report 0 — keep their last real size.
        if (width > 0 && current.get(crumbId) !== width) {
          next ??= new Map(current);
          next.set(crumbId, width);
        }
      }
      return next ?? current;
    });
    const measured = ellipsisLiRef.current?.offsetWidth ?? 0;
    if (measured > 0) setEllipsisSize(measured);
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      measure();
      return;
    }
    const observer = new ResizeObserver(() => measure());
    if (hostRef.current) observer.observe(hostRef.current);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  // Re-measure whenever the trail itself changes — the Angular
  // `afterRenderEffect`.
  useLayoutEffect(() => {
    measure();
  }, [descriptors, collapseMode, measure]);

  // Growing back above the threshold while the menu is open: nothing left to
  // show, so the panel closes before its content unmounts.
  useEffect(() => {
    if (!menuVisible && menuOpen) setMenuOpen(false);
  }, [menuVisible, menuOpen]);

  // --- ellipsis menu -------------------------------------------------------

  const panel = useAnchoredPanel({
    anchor: () => ellipsisButtonRef.current,
    panel: () => popupRef.current,
    offset: () => overlayConfig.offset,
    viewportPadding: () => overlayConfig.viewportPadding,
    restoreFocus: () => ellipsisButtonRef.current?.focus(),
    onClosed: () => {
      pendingMenuFocus.current = null;
      setMenuOpen(false);
    },
  });
  const panelRef = useRef(panel);
  panelRef.current = panel;

  useEffect(() => {
    const machine = panelRef.current;
    if (menuOpen && !machine.isOpen) machine.open();
    else if (!menuOpen && machine.isOpen) machine.close('api');
  }, [menuOpen, panel.isOpen]);

  // Focus the menu once it exists (keyboard opens) — drop-down precedent.
  useEffect(() => {
    if (pendingMenuFocus.current && menuRef.current) {
      const pending = pendingMenuFocus.current;
      pendingMenuFocus.current = null;
      menuRef.current.focus(pending);
    }
  });

  useImperativeHandle<OgeBreadcrumbHandle, OgeBreadcrumbHandle>(
    ref,
    () => ({
      focus: () => {
        hostRef.current
          ?.querySelector<HTMLElement>(
            '.oge-breadcrumb-interactive, .oge-breadcrumb-ellipsis[tabindex="0"]',
          )
          ?.focus();
      },
    }),
    [],
  );

  // --- interactions --------------------------------------------------------

  const emit = (
    d: OgeBreadcrumbDescriptorCore,
    index: number,
    event: MouseEvent | KeyboardEvent,
  ): void => {
    latest.current.onItemClick?.({
      item: d.item,
      key: d.item.key,
      index,
      event,
    });
  };

  const onEllipsisClick = (event: ReactMouseEvent): void => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    // Keyboard-synthesized clicks focus the menu; pointer clicks do not.
    if (event.detail === 0) pendingMenuFocus.current = 'first';
    setMenuOpen(true);
  };

  const onEllipsisKeyDown = (event: ReactKeyboardEvent): void => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    event.stopPropagation();
    pendingMenuFocus.current = event.key === 'ArrowDown' ? 'first' : 'last';
    if (!menuOpen) setMenuOpen(true);
  };

  // --- render --------------------------------------------------------------

  const hostClasses = [
    'oge-breadcrumb',
    collapseMode === 'wrap' && 'oge-breadcrumb-wrap',
    collapseMode === 'none' && 'oge-breadcrumb-scroll',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const separator = (index: number): ReactNode => (
    <span className="oge-breadcrumb-separator" aria-hidden="true">
      {renderSeparator ? (
        renderSeparator({ index })
      ) : (
        <svg
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 4 4 4-4 4" />
        </svg>
      )}
    </span>
  );

  const crumbContent = (
    d: OgeBreadcrumbDescriptorCore,
    index: number,
    last: boolean,
  ): ReactNode => {
    if (renderItem) return renderItem({ item: d.item, index, last });
    return (
      <>
        {d.item.icon ? (
          <span className="oge-breadcrumb-item-icon">
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d={d.item.icon} />
            </svg>
          </span>
        ) : d.item.iconClass ? (
          <span className="oge-breadcrumb-item-icon">
            <i className={d.item.iconClass} aria-hidden="true" />
          </span>
        ) : null}
        <span className="oge-breadcrumb-item-text">{d.item.text}</span>
      </>
    );
  };

  const crumb = (
    d: OgeBreadcrumbDescriptorCore,
    index: number,
    last: boolean,
  ): ReactNode => {
    if (last || d.item.disabled) {
      return (
        <span
          className={[
            'oge-breadcrumb-item',
            last && 'oge-breadcrumb-item-current',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-current={last ? 'page' : undefined}
          aria-disabled={!last && d.item.disabled ? true : undefined}
          title={d.item.hint}
        >
          {crumbContent(d, index, last)}
        </span>
      );
    }
    if (d.item.url) {
      return (
        <a
          className="oge-breadcrumb-item oge-breadcrumb-interactive"
          href={d.item.url}
          title={d.item.hint}
          onClick={(event) => emit(d, index, event.nativeEvent)}
        >
          {crumbContent(d, index, last)}
        </a>
      );
    }
    return (
      <button
        type="button"
        className="oge-breadcrumb-item oge-breadcrumb-interactive"
        title={d.item.hint}
        onClick={(event) => emit(d, index, event.nativeEvent)}
      >
        {crumbContent(d, index, last)}
      </button>
    );
  };

  return (
    <div ref={hostRef} id={id} className={hostClasses} style={style}>
      <nav className="oge-breadcrumb-nav" aria-label={messages.breadcrumb}>
        <ol className="oge-breadcrumb-list">
          {descriptors.map((d, index) => {
            const last = index === descriptors.length - 1;
            return (
              <Fragment key={d.id}>
                {index === 1 && (
                  // Always in the DOM so its size is measurable before it is
                  // needed; visually parked while nothing is collapsed.
                  <li
                    ref={ellipsisLiRef}
                    className={[
                      'oge-breadcrumb-li',
                      'oge-breadcrumb-ellipsis-li',
                      !menuVisible && 'oge-breadcrumb-li-parked',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {separator(index)}
                    <button
                      ref={ellipsisButtonRef}
                      type="button"
                      className="oge-breadcrumb-ellipsis"
                      aria-haspopup="menu"
                      aria-expanded={panel.isOpen}
                      aria-label={messages.collapsed}
                      aria-controls={panel.isOpen ? panel.panelId : undefined}
                      tabIndex={menuVisible ? 0 : -1}
                      onClick={onEllipsisClick}
                      onKeyDown={onEllipsisKeyDown}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <circle cx="3" cy="8" r="1.3" />
                        <circle cx="8" cy="8" r="1.3" />
                        <circle cx="13" cy="8" r="1.3" />
                      </svg>
                    </button>
                  </li>
                )}
                <li
                  ref={(el) => {
                    if (el) crumbEls.current.set(d.id, el);
                    else crumbEls.current.delete(d.id);
                  }}
                  className={[
                    'oge-breadcrumb-li',
                    collapsed.has(index) && 'oge-breadcrumb-li-hidden',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {index > 0 && separator(index)}
                  {crumb(d, index, last)}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>
      {menuOpen && menuItems.length > 0 && (
        <OgePopup panel={panel} ref={popupRef}>
          <OgeMenuList
            ref={menuRef}
            items={menuItems}
            ariaLabel={messages.collapsed}
            onItemClick={(event) => {
              const index = event.item.value as number;
              const d = descriptors[index];
              panelRef.current.close('select');
              if (d) emit(d, index, event.event);
            }}
            onCloseRequest={(event) => {
              if (event.reason === 'tab') {
                // Refocus the anchor before unmount so the browser tabs on
                // from there.
                ellipsisButtonRef.current?.focus();
              }
              panelRef.current.close(event.reason);
            }}
          />
        </OgePopup>
      )}
    </div>
  );
});
