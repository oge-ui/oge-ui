'use client';

import {
  createElement,
  forwardRef,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  accordionAriaDisabled,
  accordionNavIntent,
  accordionPageDirection,
  edgeEnabledIndex,
  isAccordionTypeAheadKey,
  matchAccordionTitle,
  resolveAccordionIndex,
  shouldRenderAccordionPanel,
  stepEnabledIndex,
} from '@oge-ui/behavior';
import { useOgeAccordionConfig } from './layout-config';
import {
  useOgeAccordion,
  type OgeAccordionBehaviorProps,
  type OgeAccordionHandle,
  type OgeReactAccordionDescriptor,
} from './use-accordion';

export interface OgeAccordionProps extends OgeAccordionBehaviorProps {
  className?: string;
  style?: CSSProperties;
}

/**
 * Vertically stacked disclosure panels — the React render of the Angular
 * `<oge-accordion>`, following the WAI-ARIA APG accordion pattern: each title
 * is a `<button>` inside a heading, every header stays in the page Tab
 * sequence, and arrow / Home / End / type-ahead navigation is layered on top
 * as an opt-in enhancement.
 *
 * Panels come from the `items` prop; an entry's `content` is its body — the
 * React counterpart of an `<oge-accordion-item>`'s projected content.
 * Expansion, the cancelable pre-events, the async `expandGuard` and the lazy
 * rendering rules all run through the shared `@oge-ui/behavior` decision
 * functions, so the answers match the Angular component exactly.
 *
 * ```tsx
 * <OgeAccordion
 *   multiple
 *   items={[
 *     { key: 'account', title: 'Account', content: <AccountForm /> },
 *     { key: 'billing', title: 'Billing', expandGuard: confirmLeave, content: <Billing /> },
 *   ]}
 *   expandedKeys={open}
 *   onExpandedKeysChange={setOpen}
 * />
 * ```
 */
export const OgeAccordion = forwardRef<OgeAccordionHandle, OgeAccordionProps>(
  function OgeAccordionRender(props, ref) {
    const {
      togglePosition = 'end',
      displayMode = 'default',
      stylingMode = 'outlined',
      size = 'md',
      headingLevel = 3,
      useRegionRole = true,
      keyboardNavigation = true,
      typeAhead = true,
      selectOnFocus = false,
      ariaLabel,
      className,
      style,
    } = props;

    const config = useOgeAccordionConfig();
    const acc = useOgeAccordion(props);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const hideToggle = props.hideToggle ?? config.hideToggle ?? false;
    const collapsedHeaderHeight =
      props.collapsedHeaderHeight ?? config.collapsedHeaderHeight;
    const expandedHeaderHeight =
      props.expandedHeaderHeight ?? config.expandedHeaderHeight;

    const {
      descriptors,
      expandedIds,
      pendingIds,
      renderedIds,
      loadStates,
      fadePhases,
      messages,
      uid,
      isDisabled,
    } = acc;

    // --- focus arithmetic ----------------------------------------------------

    const moveFocus = (index: number | null): void => {
      if (index === null) return;
      acc.toggleElements.current.get(descriptors[index]?.id ?? '')?.focus();
    };

    const step = (start: number, direction: 1 | -1): number | null =>
      stepEnabledIndex(descriptors.length, start, direction, (i) =>
        isDisabled(descriptors[i]),
      );

    const edge = (direction: 1 | -1): number | null =>
      edgeEnabledIndex(descriptors.length, direction, (i) =>
        isDisabled(descriptors[i]),
      );

    /** Index of the header owning focus, or the panel focus currently sits in. */
    const focusedIndex = (): number => {
      const active = containerRef.current?.ownerDocument?.activeElement;
      if (!active) return -1;
      return descriptors.findIndex((d) => {
        const toggle = acc.toggleElements.current.get(d.id);
        const panel = acc.panelElements.current.get(d.id);
        return toggle === active || (!!panel && panel.contains(active));
      });
    };

    useImperativeHandle(
      ref,
      () => ({
        isExpanded: acc.isExpanded,
        expand: acc.expand,
        collapse: acc.collapse,
        toggle: acc.toggle,
        expandAll: acc.expandAll,
        collapseAll: acc.collapseAll,
        expandInvalid: acc.expandInvalid,
        focus: (target?: number | string) => {
          const index =
            target === undefined
              ? (edgeEnabledIndex(descriptors.length, 1, (i) =>
                  isDisabled(descriptors[i]),
                ) ?? -1)
              : resolveAccordionIndex(descriptors, target);
          if (index !== -1) moveFocus(index);
        },
      }),
      // `descriptors` is rebuilt each render; the pipeline callbacks are stable
      [acc, descriptors],
    );

    // --- keyboard ------------------------------------------------------------

    const onToggleKeyDown = (
      index: number,
      event: ReactKeyboardEvent<HTMLButtonElement>,
    ): void => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (keyboardNavigation) {
        const intent = accordionNavIntent(event.key, event);
        if (intent !== null) {
          event.preventDefault();
          moveFocus(
            intent === 'next'
              ? step(index, 1)
              : intent === 'previous'
                ? step(index, -1)
                : edge(intent === 'first' ? 1 : -1),
          );
          return;
        }
      }
      if (typeAhead && isAccordionTypeAheadKey(event.key, event)) {
        const prefix = acc.typeAheadBuffer.current.push(
          event.key.toLowerCase(),
        );
        const match = matchAccordionTitle(descriptors, prefix, index, (i) =>
          isDisabled(descriptors[i]),
        );
        if (match !== null) {
          event.preventDefault();
          moveFocus(match);
        }
      }
    };

    /**
     * Ctrl+PageDown / Ctrl+PageUp are handled on the container so they also
     * work from inside panel content — the APG-optional accordion shortcuts.
     */
    const onContainerKeyDown = (
      event: ReactKeyboardEvent<HTMLDivElement>,
    ): void => {
      if (!keyboardNavigation) return;
      const direction = accordionPageDirection(event.key, event);
      if (direction === null) return;
      event.preventDefault();
      moveFocus(step(focusedIndex(), direction));
    };

    // --- render --------------------------------------------------------------

    const hostClassName = [
      'oge-accordion',
      displayMode === 'flat' && 'oge-accordion-flat',
      props.disabled && 'oge-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const headerHeight = (expanded: boolean): string | undefined =>
      expanded
        ? (expandedHeaderHeight ?? collapsedHeaderHeight)
        : collapsedHeaderHeight;

    const renderToggle = (
      d: OgeReactAccordionDescriptor,
      index: number,
    ): ReactNode => {
      const expanded = expandedIds.has(d.id);
      const panelDisabled = isDisabled(d);
      const ariaDisabled = accordionAriaDisabled({
        disabled: panelDisabled,
        expanded,
        canCollapse: acc.canCollapse(d.id),
      });
      const height = headerHeight(expanded);
      return (
        <button
          type="button"
          className="oge-accordion-toggle"
          ref={(el) => {
            if (el) acc.toggleElements.current.set(d.id, el);
            else acc.toggleElements.current.delete(d.id);
          }}
          data-toggle-position={d.togglePosition ?? togglePosition}
          id={`${uid}-header-${d.id}`}
          data-item-id={d.id}
          aria-expanded={expanded}
          aria-controls={`${uid}-panel-${d.id}`}
          aria-disabled={ariaDisabled ?? undefined}
          tabIndex={panelDisabled ? -1 : 0}
          title={d.hint}
          style={
            height
              ? ({
                  ['--oge-accordion-header-height']: height,
                } as CSSProperties)
              : undefined
          }
          onClick={(event) => {
            props.onItemClick?.({
              index,
              key: d.key,
              item: d.item,
              event: event.nativeEvent,
            });
            if (isDisabled(d)) return;
            if (expandedIds.has(d.id))
              void acc.requestCollapse(index, event.nativeEvent);
            else void acc.requestExpand(index, event.nativeEvent);
          }}
          onFocus={() => {
            if (!selectOnFocus) return;
            if (isDisabled(d) || expandedIds.has(d.id)) return;
            void acc.requestExpand(index);
          }}
          onKeyDown={(event) => onToggleKeyDown(index, event)}
        >
          {!(d.hideToggle ?? hideToggle) && (
            <span className="oge-accordion-toggle-icon" aria-hidden="true">
              {d.renderToggleIcon ? (
                d.renderToggleIcon({ expanded, index })
              ) : (
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
              )}
            </span>
          )}
          {d.renderHeader ? (
            d.renderHeader({
              item: d.item,
              index,
              expanded,
              title: d.title,
              description: d.description,
            })
          ) : (
            <>
              {d.icon && (
                <svg
                  className="oge-accordion-icon"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                >
                  <path
                    d={d.icon}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span className="oge-accordion-titles">
                <span className="oge-accordion-title">{d.title}</span>
                {d.description && (
                  <span className="oge-accordion-description">
                    {d.description}
                  </span>
                )}
              </span>
            </>
          )}
          {d.badge !== undefined && (
            <span className="oge-accordion-badge">{d.badge}</span>
          )}
          {d.invalid && (
            <>
              <span className="oge-accordion-invalid-dot" aria-hidden="true" />
              <span className="oge-accordion-sr">
                {messages.invalidSection}
              </span>
            </>
          )}
          {pendingIds.has(d.id) && (
            <>
              <span className="oge-accordion-spinner" aria-hidden="true" />
              <span className="oge-accordion-sr">{messages.pending}</span>
            </>
          )}
        </button>
      );
    };

    const renderBody = (
      d: OgeReactAccordionDescriptor,
      index: number,
      data: unknown,
    ): ReactNode => {
      if (
        !shouldRenderAccordionPanel({
          deferRendering: acc.deferRendering,
          keepAlive: acc.keepAlive,
          expanded: expandedIds.has(d.id),
          rendered: renderedIds.has(d.id),
        })
      ) {
        return null;
      }
      if (d.renderContent) {
        return d.renderContent({ item: d.item, index, data });
      }
      return d.content ?? d.text ?? null;
    };

    const renderPanelContent = (
      d: OgeReactAccordionDescriptor,
      index: number,
    ): ReactNode => {
      const state = loadStates.get(d.id);
      if (state?.status === 'loading') {
        return (
          <div className="oge-accordion-skeleton" role="status">
            <span className="oge-accordion-sr">{messages.loadingContent}</span>
            <span className="oge-accordion-skeleton-line" />
            <span className="oge-accordion-skeleton-line" />
            <span className="oge-accordion-skeleton-line" />
          </div>
        );
      }
      if (state?.status === 'failed') {
        return (
          <div className="oge-accordion-error" role="alert">
            <span>{messages.contentLoadFailed}</span>
            <button
              type="button"
              className="oge-accordion-retry"
              onClick={() => acc.retryLoad(d, index)}
            >
              {messages.retry}
            </button>
          </div>
        );
      }
      return renderBody(d, index, state?.data);
    };

    const headingTag =
      headingLevel >= 1 && headingLevel <= 6 ? `h${headingLevel}` : null;

    return (
      <div
        ref={containerRef}
        className={hostClassName}
        style={style}
        data-styling-mode={stylingMode}
        data-size={size}
        data-toggle-position={togglePosition}
        aria-label={ariaLabel}
        onKeyDown={onContainerKeyDown}
      >
        {descriptors.length === 0 && (
          <div className="oge-accordion-empty">{messages.noData}</div>
        )}
        {descriptors.map((d, index) => {
          const expanded = expandedIds.has(d.id);
          const fade = fadePhases.get(d.id) ?? 0;
          const toggle = renderToggle(d, index);
          const actions = d.renderHeaderActions?.({
            item: d.item,
            index,
            expanded,
          });
          return (
            <div
              key={d.id}
              className={[
                'oge-accordion-item',
                expanded && 'oge-accordion-item-expanded',
                isDisabled(d) && 'oge-accordion-item-disabled',
                d.invalid && 'oge-accordion-item-invalid',
                pendingIds.has(d.id) && 'oge-accordion-item-pending',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="oge-accordion-header">
                {/*
                  A native heading element wherever the level allows one; the
                  APG only asks for "an element with role heading", but real
                  h1–h6 are better understood by assistive tech.
                */}
                {headingTag ? (
                  createElement(
                    headingTag,
                    { className: 'oge-accordion-heading' },
                    toggle,
                  )
                ) : (
                  <div
                    className="oge-accordion-heading"
                    role="heading"
                    aria-level={headingLevel}
                  >
                    {toggle}
                  </div>
                )}
                {actions && (
                  <div className="oge-accordion-header-actions">{actions}</div>
                )}
              </div>
              <div
                ref={(el) => {
                  if (el) acc.panelElements.current.set(d.id, el);
                  else acc.panelElements.current.delete(d.id);
                }}
                className={[
                  'oge-accordion-panel',
                  expanded && 'oge-accordion-panel-open',
                  acc.animation !== false && 'oge-accordion-panel-animated',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  typeof acc.animation === 'number'
                    ? ({
                        ['--oge-accordion-transition']: `${acc.animation}ms`,
                      } as CSSProperties)
                    : undefined
                }
                role={useRegionRole ? 'region' : undefined}
                id={`${uid}-panel-${d.id}`}
                aria-labelledby={`${uid}-header-${d.id}`}
                inert={!expanded}
                onTransitionEnd={(event) =>
                  acc.onPanelTransitionEnd(d, index, event.nativeEvent)
                }
              >
                <div className="oge-accordion-panel-inner">
                  <div
                    className={[
                      'oge-accordion-panel-body',
                      fade === 1 && 'oge-accordion-fade-a',
                      fade === 2 && 'oge-accordion-fade-b',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {renderPanelContent(d, index)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);
