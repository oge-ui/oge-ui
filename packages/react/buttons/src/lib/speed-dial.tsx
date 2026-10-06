'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  OGE_FAB_PLUS_PATH,
  ogeIsRtl,
  ogeSpeedDialDirection,
  ogeSpeedDialItemKey,
  ogeSpeedDialNavIndex,
  ogeSpeedDialToggleKey,
  ogeSpeedDialVertical,
  type OgeFabPosition,
  type OgeFabPositionMode,
  type OgeFabSeverity,
  type OgeFabSize,
  type OgeSpeedDialDirection,
  type OgeSpeedDialItem,
  type OgeSpeedDialItemClickEvent,
  type OgeSpeedDialLabelMode,
  type OgeSpeedDialOpenMode,
} from '@oge-ui/behavior';
import { useOgeFabConfig } from './buttons-config';
import { ogeFabLayerClasses } from './fab';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

export interface OgeSpeedDialProps {
  /** The actions, nearest the FAB first. */
  items?: readonly OgeSpeedDialItem[];
  /** Accessible name of the FAB and the menu; fallback `messages.speedDial`. */
  label?: string;
  /** SVG path data of the FAB glyph; default a plus that turns to ✕ open. */
  icon?: string;
  /** Unfold direction; default away from the pinned edge (up from a bottom FAB). */
  direction?: OgeSpeedDialDirection;
  /** Corner or edge the FAB is pinned to (logical: RTL mirrors). */
  position?: OgeFabPosition;
  /** `fixed` (viewport), `absolute` (positioned ancestor) or `static` (flow). */
  positionMode?: OgeFabPositionMode;
  /** 40 / 56 / 72 px. */
  size?: OgeFabSize;
  /** FAB colour — the button severity vocabulary (default `accent`). */
  severity?: OgeFabSeverity;
  /** Gap to the pinned edges (any CSS length); default `16px`. */
  offset?: string;
  /** `click` toggles on press; `hover` also opens while a mouse hovers it. */
  openMode?: OgeSpeedDialOpenMode;
  /** Action labels: beside the hovered/focused action, every action, or never. */
  labelMode?: OgeSpeedDialLabelMode;
  /** Disables the FAB (and so the dial). */
  disabled?: boolean;
  /** Whether the actions are shown (controlled). */
  opened?: boolean;
  /** Initial `opened` when uncontrolled. */
  defaultOpened?: boolean;
  /** `opened` changed — the controlled half of `opened`. */
  onOpenedChange?: (opened: boolean) => void;
  /** An action was activated (click, Enter or Space); the dial then closes. */
  onItemClick?: (event: OgeSpeedDialItemClickEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of {@link OgeSpeedDial}. */
export interface OgeSpeedDialHandle {
  /** Opens the dial (focus stays where it is). */
  open(): void;
  /** Closes the dial. */
  close(): void;
  /** Toggles the dial. */
  toggle(): void;
  /** Moves focus to the FAB. */
  focus(): void;
}

/**
 * A floating action button that unfolds related actions — the React render
 * of the Angular `<oge-speed-dial>`, on the same WAI-ARIA APG **menu
 * button** keyboard map from `@oge-ui/behavior`: opening moves focus to the
 * nearest action, the arrows along the dial's axis move and wrap, Escape
 * closes and returns focus to the FAB, Tab closes, a press outside closes.
 *
 * ```tsx
 * <OgeSpeedDial
 *   label="Create"
 *   items={[{ key: 'doc', label: 'Document', icon: docPath }]}
 *   onItemClick={({ item }) => create(item.key)}
 * />
 * ```
 */
export const OgeSpeedDial = forwardRef<OgeSpeedDialHandle, OgeSpeedDialProps>(
  function OgeSpeedDialRender(props, ref) {
    const config = useOgeFabConfig();
    const {
      items = [],
      label,
      icon,
      openMode = 'click',
      labelMode = 'hover',
      disabled = false,
      opened: openedProp,
      defaultOpened = false,
    } = props;
    const [uncontrolled, setUncontrolled] = useState(defaultOpened);
    const opened = openedProp ?? uncontrolled;

    const menuId = `oge-speed-dial-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-menu`;
    const hostRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const actionRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const pendingFocus = useRef(-1);
    const hoverOpened = useRef(false);
    const latest = useRef(props);
    latest.current = props;

    const position = props.position ?? config.position ?? 'bottom-end';
    const direction = ogeSpeedDialDirection(position, props.direction);
    const vertical = ogeSpeedDialVertical(direction);
    const name = label || config.messages.speedDial;

    const openedRef = useRef(opened);
    openedRef.current = opened;
    const setOpened = useCallback((next: boolean) => {
      if (next && latest.current.disabled) return;
      if (!next) hoverOpened.current = false;
      if (openedRef.current === next) return;
      if (latest.current.opened === undefined) setUncontrolled(next);
      openedRef.current = next;
      latest.current.onOpenedChange?.(next);
    }, []);

    const isDisabled = (index: number): boolean => !!items[index]?.disabled;
    const focusAction = (index: number): void => {
      if (index >= 0) actionRefs.current[index]?.focus();
    };
    const focusToggle = (): void => toggleRef.current?.focus();
    const rtl = (): boolean =>
      hostRef.current !== null && ogeIsRtl(hostRef.current);

    // focus the requested action once the menu has rendered
    useIsomorphicLayoutEffect(() => {
      if (!opened || pendingFocus.current < 0) return;
      focusAction(pendingFocus.current);
      pendingFocus.current = -1;
    });

    // a press outside closes the dial — listener only while open
    useEffect(() => {
      if (!opened) return;
      const onDown = (event: PointerEvent): void => {
        if (!hostRef.current?.contains(event.target as Node)) setOpened(false);
      };
      document.addEventListener('pointerdown', onDown, true);
      return () => document.removeEventListener('pointerdown', onDown, true);
    }, [opened, setOpened]);

    useImperativeHandle(ref, () => ({
      open: () => setOpened(true),
      close: () => setOpened(false),
      toggle: () => setOpened(!openedRef.current),
      focus: focusToggle,
    }));

    const openAndFocus = (which: 'first' | 'last'): void => {
      if (disabled) return;
      pendingFocus.current = ogeSpeedDialNavIndex(
        items.length,
        -1,
        which,
        isDisabled,
      );
      if (openedRef.current) {
        focusAction(pendingFocus.current);
        pendingFocus.current = -1;
      } else setOpened(true);
    };

    const onToggleClick = (): void => {
      if (openedRef.current && !hoverOpened.current) {
        setOpened(false);
        return;
      }
      hoverOpened.current = false;
      openAndFocus('first');
    };

    const onToggleKeyDown = (event: ReactKeyboardEvent): void => {
      const intent = ogeSpeedDialToggleKey(
        event.key,
        direction,
        openedRef.current,
        rtl(),
      );
      if (!intent) return;
      event.preventDefault();
      if (intent.type === 'open') openAndFocus(intent.focus);
      else if (intent.type === 'close') setOpened(false);
    };

    const onItemKeyDown = (event: ReactKeyboardEvent, index: number): void => {
      const intent = ogeSpeedDialItemKey(event.key, direction, rtl());
      if (!intent) return;
      if (intent.type === 'move') {
        event.preventDefault();
        focusAction(
          ogeSpeedDialNavIndex(items.length, index, intent.to, isDisabled),
        );
      } else if (intent.type === 'close') {
        if (intent.restoreFocus) event.preventDefault();
        // Tab: park focus on the FAB first so the browser's Tab continues
        // from there once the menu is gone
        focusToggle();
        setOpened(false);
      }
    };

    const onItemClick = (
      item: OgeSpeedDialItem,
      index: number,
      event: ReactMouseEvent,
    ): void => {
      if (item.disabled) return;
      latest.current.onItemClick?.({ item, index, event: event.nativeEvent });
      focusToggle();
      setOpened(false);
    };

    const onPointerEnter = (event: ReactPointerEvent): void => {
      if (openMode !== 'hover' || event.pointerType === 'touch') return;
      if (openedRef.current) return;
      setOpened(true);
      hoverOpened.current = !disabled;
    };

    const onPointerLeave = (event: ReactPointerEvent): void => {
      if (openMode !== 'hover' || event.pointerType === 'touch') return;
      if (!hoverOpened.current) return;
      if (hostRef.current?.contains(document.activeElement)) return;
      setOpened(false);
    };

    const className = [
      'oge-speed-dial oge-fab-layer',
      ogeFabLayerClasses({
        position,
        positionMode: props.positionMode ?? config.positionMode ?? 'fixed',
        size: props.size ?? config.size ?? 'md',
        severity: props.severity ?? config.severity ?? 'accent',
      }),
      `oge-speed-dial-${direction}`,
      `oge-speed-dial-labels-${labelMode}`,
      position.endsWith('start')
        ? 'oge-speed-dial-labels-after'
        : 'oge-speed-dial-labels-before',
      position.startsWith('top')
        ? 'oge-speed-dial-labels-below'
        : 'oge-speed-dial-labels-above',
      opened && 'oge-speed-dial-open',
      props.className,
    ]
      .filter(Boolean)
      .join(' ');
    const style = props.offset
      ? ({ ...props.style, '--oge-fab-offset': props.offset } as CSSProperties)
      : props.style;

    return (
      <div
        ref={hostRef}
        className={className}
        style={style}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <button
          ref={toggleRef}
          type="button"
          className="oge-fab-button oge-speed-dial-toggle"
          aria-haspopup="menu"
          aria-expanded={opened}
          aria-controls={opened ? menuId : undefined}
          aria-label={name}
          disabled={disabled}
          onClick={onToggleClick}
          onKeyDown={onToggleKeyDown}
        >
          <svg
            className="oge-fab-icon oge-speed-dial-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d={icon ?? OGE_FAB_PLUS_PATH} />
          </svg>
        </button>
        {opened && (
          <div
            className="oge-speed-dial-menu"
            role="menu"
            id={menuId}
            aria-label={name}
            aria-orientation={vertical ? 'vertical' : 'horizontal'}
          >
            {items.map((item, i) => (
              <button
                key={item.key}
                ref={(el) => {
                  actionRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={[
                  'oge-speed-dial-action',
                  item.disabled && 'oge-speed-dial-action-disabled',
                  item.severity && `oge-speed-dial-action-${item.severity}`,
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-disabled={item.disabled ? true : undefined}
                style={{ '--oge-speed-dial-index': i } as CSSProperties}
                onClick={(event) => onItemClick(item, i, event)}
                onKeyDown={(event) => onItemKeyDown(event, i)}
              >
                {item.icon && (
                  <svg
                    className="oge-speed-dial-action-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d={item.icon} />
                  </svg>
                )}
                <span className="oge-speed-dial-label">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);
