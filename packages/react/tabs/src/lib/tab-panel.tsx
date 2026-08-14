'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  resolveTabIndex,
  type OgeTabItem,
  type OgeTabPanelAnimation,
  type OgeTabsOrientation,
  type OgeTabsPosition,
} from '@oge-ui/behavior';
import { OgeTabStrip, type OgeTabStripApi } from './tab-strip';
import { useOgeTabs } from './use-tabs';
import type {
  OgeReactTabDescriptor,
  OgeTabsHandle,
  OgeTabsSharedProps,
} from './tabs-types';

export interface OgeTabPanelProps extends OgeTabsSharedProps {
  /** Side the tab strip sits on — logical values, so RTL flips start/end. */
  tabsPosition?: OgeTabsPosition;
  /** Instantiate a panel's content only when its tab first activates. */
  deferRendering?: boolean;
  /**
   * Keep once-rendered panels mounted (hidden) so their state survives tab
   * switches. `false` unmounts lazy content on deactivation. Ignored while
   * `deferRendering` is `false` (everything stays rendered).
   */
  keepAlive?: boolean;
  /**
   * Transition played by the newly displayed panel. Duration comes from the
   * `--oge-tab-panel-transition` CSS variable (180ms) and is suppressed under
   * `prefers-reduced-motion`.
   */
  panelAnimation?: OgeTabPanelAnimation;
  /**
   * Animates the content area between the heights of the outgoing and
   * incoming panel instead of jumping. Tracks async content through a
   * `ResizeObserver`.
   */
  dynamicHeight?: boolean;
  /** Content renderer for `items`-driven tabs (declarative tabs carry theirs). */
  renderTabContent?: (context: {
    item: OgeTabItem;
    index: number;
  }) => ReactNode;
}

/**
 * Tab strip with content panels — the React render of the Angular
 * `<oge-tab-panel>`. Declarative `tabs` entries carry their own `content`;
 * data-driven `items` render through `renderTabContent`.
 *
 * `deferRendering` (default) mounts a panel on first activation; `keepAlive`
 * (default) keeps it mounted — hidden — afterwards so its state survives tab
 * switches. Turn `keepAlive` off to unmount lazy content on deactivation.
 *
 * ```tsx
 * <OgeTabPanel
 *   tabs={[
 *     { text: 'Overview', content: <Overview /> },
 *     { text: 'Settings', closable: true, content: <Settings /> },
 *   ]}
 * />
 * ```
 */
export const OgeTabPanel = forwardRef<OgeTabsHandle, OgeTabPanelProps>(
  function OgeTabPanelRender(props, ref) {
    const {
      tabsPosition = 'top',
      deferRendering = true,
      keepAlive = true,
      panelAnimation = 'none',
      dynamicHeight = false,
      renderTabContent,
      className,
      style,
    } = props;

    const tabs = useOgeTabs(props);
    const stripApi = useRef<OgeTabStripApi | null>(null);
    const bodies = useRef(new Map<string, HTMLDivElement>());

    const stripOrientation: OgeTabsOrientation =
      tabsPosition === 'start' || tabsPosition === 'end'
        ? 'vertical'
        : 'horizontal';

    // --- lazy rendering ------------------------------------------------------

    /** Ids of tabs whose content has been rendered at least once. */
    const [renderedIds, setRenderedIds] = useState<ReadonlySet<string>>(
      () => new Set(),
    );
    const activeId = tabs.descriptors[tabs.selectedIndex]?.id;
    useEffect(() => {
      if (activeId === undefined) return;
      setRenderedIds((current) => {
        if (current.has(activeId)) return current;
        const next = new Set(current);
        next.add(activeId);
        return next;
      });
    }, [activeId]);

    const shouldRender = (d: OgeReactTabDescriptor, index: number): boolean => {
      if (!deferRendering) return true;
      if (index === tabs.selectedIndex) return true;
      return keepAlive && renderedIds.has(d.id);
    };

    // --- animation -----------------------------------------------------------

    /**
     * Alternates 1 ↔ 2 on every selection change. The two phases map to two
     * identical keyframes, which is what restarts the CSS animation — a plain
     * class toggle would not replay it. `0` means "never animated yet".
     */
    const [animPhase, setAnimPhase] = useState(0);
    const [animDirection, setAnimDirection] = useState<'forward' | 'backward'>(
      'forward',
    );
    const lastIndex = useRef(-1);
    useEffect(() => {
      const previous = lastIndex.current;
      lastIndex.current = tabs.selectedIndex;
      if (previous === -1 || panelAnimation === 'none') return;
      setAnimDirection(tabs.selectedIndex >= previous ? 'forward' : 'backward');
      setAnimPhase((phase) => (phase === 1 ? 2 : 1));
    }, [tabs.selectedIndex, panelAnimation]);

    // --- dynamic height ------------------------------------------------------

    /** Measured height of the active panel; `null` disables the lock. */
    const [contentHeight, setContentHeight] = useState<number | null>(null);
    const observed = useRef<HTMLElement | null>(null);
    const resizeRef = useRef<ResizeObserver | null>(null);

    const measureHeight = (): void => {
      if (!dynamicHeight) {
        setContentHeight(null);
        return;
      }
      const d = tabs.descriptors[tabs.selectedIndex];
      const active = d ? (bodies.current.get(d.id) ?? null) : null;
      const resize = resizeRef.current;
      if (resize && active !== observed.current) {
        if (observed.current) resize.unobserve(observed.current);
        if (active) resize.observe(active);
        observed.current = active;
      }
      setContentHeight(active ? active.offsetHeight : null);
    };
    const measureRef = useRef(measureHeight);
    measureRef.current = measureHeight;

    useEffect(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => measureRef.current());
      resizeRef.current = observer;
      return () => {
        observer.disconnect();
        resizeRef.current = null;
        observed.current = null;
      };
    }, []);

    useLayoutEffect(() => {
      measureRef.current();
    }, [tabs.selectedIndex, tabs.descriptors, dynamicHeight]);

    // --- imperative handle ---------------------------------------------------

    useImperativeHandle(
      ref,
      () => ({
        focus: () => stripApi.current?.focusActiveTab(),
        closeTab: (target) => tabs.closeTab(target),
        scrollToTab: (target) => {
          const index = resolveTabIndex(tabs.descriptors, target);
          if (index !== -1) stripApi.current?.scrollToIndex(index);
        },
      }),
      [tabs],
    );

    tabs.closedFocusRef.current = (index) =>
      stripApi.current?.handleClosedFocus(index);

    // --- render --------------------------------------------------------------

    const hostClasses = [
      'oge-tab-panel',
      tabsPosition === 'bottom' && 'oge-tab-panel-bottom',
      tabsPosition === 'start' && 'oge-tab-panel-start',
      tabsPosition === 'end' && 'oge-tab-panel-end',
      props.disabled && 'oge-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const contentClasses = [
      'oge-tab-panel-content',
      panelAnimation !== 'none' && 'oge-tab-panel-animated',
      panelAnimation === 'slide' && 'oge-tab-panel-anim-slide',
      animPhase === 1 && 'oge-tab-anim-a',
      animPhase === 2 && 'oge-tab-anim-b',
      dynamicHeight && 'oge-tab-panel-dynamic-height',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={hostClasses} style={style}>
        <OgeTabStrip
          descriptors={tabs.descriptors}
          selectedIndex={tabs.selectedIndex}
          activation={props.activation}
          orientation={stripOrientation}
          disabled={props.disabled}
          alignment={props.tabAlignment}
          indicatorFit={props.indicatorFit}
          showNavButtons={props.showNavButtons}
          showTabListButton={props.showTabListButton}
          allowReorder={props.allowTabReordering}
          stylingMode={props.stylingMode}
          size={props.size}
          messages={tabs.messages}
          closePendingIds={tabs.closePendingIds}
          idPrefix={tabs.id}
          hasPanels
          ariaLabel={props.ariaLabel}
          onActivate={tabs.onTabClick}
          onFocusSelect={(index, event) => tabs.requestSelect(index, event)}
          onCloseRequest={(index, event) => tabs.requestClose(index, event)}
          onReorderRequest={tabs.requestReorder}
          onReady={(api) => (stripApi.current = api)}
        />
        <div
          className={contentClasses}
          data-anim-dir={animDirection}
          style={
            contentHeight !== null ? { blockSize: contentHeight } : undefined
          }
        >
          {tabs.descriptors.map((d, i) => (
            <div
              key={d.id}
              ref={(el) => {
                if (el) bodies.current.set(d.id, el);
                else bodies.current.delete(d.id);
              }}
              className="oge-tab-panel-body"
              role="tabpanel"
              tabIndex={0}
              id={`${tabs.id}-panel-${d.id}`}
              aria-labelledby={`${tabs.id}-tab-${d.id}`}
              hidden={i !== tabs.selectedIndex}
            >
              {shouldRender(d, i) &&
                (d.content ??
                  (d.item && renderTabContent
                    ? renderTabContent({
                        item: d.item,
                        index: i,
                      })
                    : null))}
            </div>
          ))}
        </div>
      </div>
    );
  },
);
