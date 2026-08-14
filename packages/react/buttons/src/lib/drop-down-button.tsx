'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import type {
  OgeButtonSeverity,
  OgeButtonSize,
  OgeButtonStylingMode,
  OgeButtonIconPosition,
  OgeButtonsMessages,
  OgeClickGuardOptions,
  OgeMenuItem,
  OgePopupPlacement,
} from '@oge-ui/behavior';
import {
  OgeMenuList,
  OgePopup,
  useAnchoredPanel,
  useOgeOverlayConfig,
  type OgeMenuCloseRequestEvent,
  type OgeMenuListHandle,
  type OgeMenuListItemClickEvent,
} from '@oge-ui/react-overlay';
import { OgeButton, type OgeButtonHandle } from './button';
import { useOgeButtonsConfig } from './buttons-config';

/**
 * Lazy items source: invoked on first open (result is cached until the
 * function reference changes); may return the items synchronously or as a
 * promise.
 */
export type OgeDropDownItemsFn = () =>
  readonly OgeMenuItem[] | Promise<readonly OgeMenuItem[]>;

/** Payload of the drop-down button's `onItemClick`. */
export interface OgeDropDownButtonItemClickEvent {
  item: OgeMenuItem;
  /** Index within the resolved items list (separators included). */
  index: number;
  event: MouseEvent | KeyboardEvent;
}

/** Payload of `onSelectionChange` — `rememberLastAction` swapped the remembered item. */
export interface OgeDropDownSelectionChangedEvent {
  item: OgeMenuItem;
  previousItem: OgeMenuItem | null;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeDropDownButtonHandle {
  /** Moves keyboard focus to the trigger (split mode: the chevron toggle). */
  focus(): void;
  open(): void;
  close(): void;
  toggle(): void;
}

type ItemsState =
  | { status: 'static' }
  | { status: 'idle' }
  | { status: 'loading'; runId: number }
  | { status: 'ready'; items: readonly OgeMenuItem[] }
  | { status: 'error' };

export interface OgeDropDownButtonProps {
  /** Label of the (main) trigger button. */
  text?: string;
  hint?: string;
  disabled?: boolean;
  stylingMode?: OgeButtonStylingMode;
  severity?: OgeButtonSeverity;
  size?: OgeButtonSize;
  /** Custom main color (any CSS color) — overrides the severity palette. */
  color?: string;
  /** Leading icon of the (main) trigger — any inline SVG. */
  icon?: ReactNode;
  iconPosition?: OgeButtonIconPosition;
  badge?: string | number | boolean;
  /** Async click handler of the split main button (single-flight, loading). */
  action?: () => unknown;
  /** Click guard of the split main button. */
  clickGuard?: boolean | OgeClickGuardOptions;
  /** Busy state of the (main) button — controlled when provided. */
  loading?: boolean;
  onLoadingChange?: (loading: boolean) => void;

  /** `true` renders a separate chevron toggle next to an action main button. */
  splitButton?: boolean;
  /** Menu items — an array, or a function invoked lazily on first open. */
  items?: readonly OgeMenuItem[] | OgeDropDownItemsFn;
  dropdownPlacement?: OgePopupPlacement;
  /** Panel width: fixed pixels or `'anchor'` to match the button width. */
  dropdownWidth?: number | 'anchor';
  /**
   * Split mode: the last clicked menu item becomes the main button's label
   * and action for the session (IDE "Run" button pattern).
   */
  rememberLastAction?: boolean;
  /** Custom rendering for menu items (icons, badges…) — see `OgeMenuList`. */
  renderItem?: (item: OgeMenuItem, index: number) => ReactNode;
  /**
   * Replaces the menu entirely with arbitrary panel content — the React
   * counterpart of `*ogeDropDownContent`. Receives a `close()` that shuts
   * the panel (reason `select`) and restores focus to the trigger.
   */
  renderContent?: (close: () => void) => ReactNode;
  /** Panel visibility — controlled when provided. */
  opened?: boolean;
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
  /** Per-instance overrides of user-facing strings. */
  messages?: Partial<OgeButtonsMessages>;

  /** Fires when a menu item is activated; the panel closes afterwards. */
  onItemClick?: (event: OgeDropDownButtonItemClickEvent) => void;
  /** `rememberLastAction` mode: the remembered item changed. */
  onSelectionChange?: (event: OgeDropDownSelectionChangedEvent) => void;
  /** Split mode only: the main action button was clicked. */
  onClick?: (event: MouseEvent | KeyboardEvent) => void;
  onActionDone?: (result: unknown) => void;
  onActionFailed?: (error: unknown) => void;

  className?: string;
  style?: CSSProperties;
}

const chevron = (
  <svg
    className="oge-drop-down-chevron"
    viewBox="0 0 16 16"
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m4 6 4 4 4-4" />
  </svg>
);

/**
 * Button with an anchored menu panel — the React render of the Angular
 * `<oge-drop-down-button>`: the WAI-ARIA menu-button pattern with full
 * keyboard support, async/lazy items and an optional split mode, over the
 * same `@oge-ui/behavior` machines, the same `.oge-*` classes and the same
 * stylesheet (this package's plus `@oge-ui/react-overlay/styles.css` for the
 * panel).
 *
 * ```tsx
 * <OgeDropDownButton text="Export" items={exportItems} onItemClick={run} />
 *
 * <OgeDropDownButton text="Run" splitButton rememberLastAction items={runTargets} />
 * ```
 *
 * `holdToConfirm`/`autoRepeat`/`useSubmitBehavior` are intentionally not
 * available on drop-down buttons. In non-split mode the trigger click only
 * toggles the panel — bind `onItemClick` for selection; `onClick` fires
 * solely from the split main button.
 */
export const OgeDropDownButton = forwardRef<
  OgeDropDownButtonHandle,
  OgeDropDownButtonProps
>(function OgeDropDownButtonRender(props, ref) {
  const {
    text = '',
    hint,
    disabled = false,
    stylingMode,
    severity,
    size,
    color,
    icon,
    iconPosition = 'before',
    badge,
    action,
    clickGuard = false,
    loading,
    onLoadingChange,
    splitButton = false,
    items,
    dropdownPlacement = 'bottom-start',
    dropdownWidth,
    rememberLastAction = false,
    renderItem,
    renderContent,
    opened: openedProp,
    defaultOpened = false,
    messages,
    className,
    style,
  } = props;

  const config = useOgeButtonsConfig();
  const overlayConfig = useOgeOverlayConfig();
  const msg: OgeButtonsMessages = { ...config.messages, ...messages };

  const hostRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<OgeButtonHandle>(null);
  const toggleRef = useRef<OgeButtonHandle>(null);
  const menuRef = useRef<OgeMenuListHandle>(null);

  const [uncontrolledOpened, setUncontrolledOpened] = useState(defaultOpened);
  const opened = openedProp ?? uncontrolledOpened;

  const [lastAction, setLastAction] = useState<OgeMenuItem | null>(null);
  const rememberActive = splitButton && rememberLastAction;

  const [itemsState, setItemsState] = useState<ItemsState>(
    typeof items === 'function' ? { status: 'idle' } : { status: 'static' },
  );
  const itemsStateRef = useRef(itemsState);
  itemsStateRef.current = itemsState;
  /** Which function reference the current cache belongs to. */
  const cacheSourceRef = useRef<OgeDropDownItemsFn | null>(null);
  const loadSeq = useRef(0);
  const pendingMenuFocus = useRef<'first' | 'last' | null>(null);

  const latest = useRef(props);
  latest.current = props;

  const setOpened = useCallback((next: boolean) => {
    if (latest.current.opened === undefined) setUncontrolledOpened(next);
    latest.current.onOpenedChange?.(next);
  }, []);

  const focusTrigger = useCallback(() => {
    (toggleRef.current ?? triggerRef.current)?.focus();
  }, []);

  const openedRef = useRef(opened);
  openedRef.current = opened;

  const panel = useAnchoredPanel({
    anchor: () => hostRef.current,
    panel: () => popupRef.current,
    placement: () => latest.current.dropdownPlacement ?? 'bottom-start',
    width: () => latest.current.dropdownWidth,
    offset: () => overlayConfig.offset,
    viewportPadding: () => overlayConfig.viewportPadding,
    restoreFocus: focusTrigger,
    onClosed: () => {
      pendingMenuFocus.current = null;
      if (openedRef.current) setOpened(false);
    },
  });
  const panelRef = useRef(panel);
  panelRef.current = panel;

  const ensureItemsLoaded = useCallback(() => {
    const source = latest.current.items;
    if (typeof source !== 'function') return;
    // "Cached until the function reference changes" — a fresh reference
    // discards the cache. Consumers should memoize the source; an inline
    // arrow simply reloads on every open.
    const fresh = cacheSourceRef.current !== source;
    cacheSourceRef.current = source;
    const state = itemsStateRef.current;
    if (!fresh && (state.status === 'ready' || state.status === 'loading')) {
      return;
    }
    const result = source();
    if (!(result instanceof Promise)) {
      setItemsState({ status: 'ready', items: result });
      return;
    }
    const runId = ++loadSeq.current;
    setItemsState({ status: 'loading', runId });
    result.then(
      (loaded) =>
        setItemsState((current) =>
          current.status === 'loading' && current.runId === runId
            ? { status: 'ready', items: loaded }
            : current,
        ),
      () =>
        setItemsState((current) =>
          current.status === 'loading' && current.runId === runId
            ? { status: 'error' }
            : current,
        ),
    );
  }, []);

  // `opened` ↔ panel machine, loop-guarded by comparing states first.
  useEffect(() => {
    const machine = panelRef.current;
    if (opened && !machine.isOpen) {
      machine.open();
      ensureItemsLoaded();
    } else if (!opened && machine.isOpen) {
      machine.close('api');
    }
  }, [opened, panel.isOpen, ensureItemsLoaded]);

  /**
   * Items input changes: array ↔ function, or a new reference. Guarded by an
   * identity ref (never a render-phase reset — a self-triggered re-render
   * re-evaluates inline props and would loop). While the panel is open, a
   * *function* source swap only invalidates the cache: reloading immediately
   * would loop for inline arrows, so the fresh source loads on the next open.
   * Array swaps render instantly regardless — the static path reads props.
   */
  const armedItemsRef = useRef(items);
  useEffect(() => {
    if (armedItemsRef.current === items) return;
    const previous = armedItemsRef.current;
    armedItemsRef.current = items;
    if (
      openedRef.current &&
      typeof items === 'function' &&
      typeof previous === 'function'
    ) {
      cacheSourceRef.current = null;
      return;
    }
    const nextState: ItemsState =
      typeof items === 'function' ? { status: 'idle' } : { status: 'static' };
    setItemsState((state) =>
      state.status === nextState.status ? state : nextState,
    );
    if (openedRef.current) ensureItemsLoaded();
  });

  // Placement/width changes while open take effect immediately (content
  // growth is handled by the panel's own ResizeObserver).
  useEffect(() => {
    if (panelRef.current.isOpen) panelRef.current.updatePosition();
  }, [dropdownPlacement, dropdownWidth]);

  useEffect(() => {
    if (!rememberActive) setLastAction(null);
  }, [rememberActive]);

  const itemsStatus = itemsState.status;
  const resolvedItems: readonly OgeMenuItem[] =
    itemsState.status === 'ready'
      ? itemsState.items
      : itemsState.status === 'static' && Array.isArray(items)
        ? items
        : [];

  // Focus the menu once it exists (keyboard opens). The popup is
  // transparent-but-focusable until measured, so this is safe immediately.
  useEffect(() => {
    if (pendingMenuFocus.current && menuRef.current) {
      const pending = pendingMenuFocus.current;
      pendingMenuFocus.current = null;
      menuRef.current.focus(pending);
    }
  });

  useImperativeHandle(
    ref,
    () => ({
      focus: focusTrigger,
      open: () => setOpened(true),
      close: () => setOpened(false),
      toggle: () => setOpened(!openedRef.current),
    }),
    [focusTrigger, setOpened],
  );

  const last = rememberActive ? lastAction : null;
  const mainText = last ? last.text : text;
  const lastItemAction = last?.action;
  const effectiveMainAction = lastItemAction ? () => lastItemAction() : action;

  const onMainClicked = (event: MouseEvent | KeyboardEvent) => {
    if (!splitButton) {
      const willOpen = !openedRef.current;
      setOpened(willOpen);
      // APG: Enter/Space open focuses the first item. Keyboard-synthesized
      // clicks carry detail === 0.
      if (willOpen && event instanceof MouseEvent && event.detail === 0) {
        pendingMenuFocus.current = 'first';
      }
      return;
    }
    latest.current.onClick?.(event);
    if (last) {
      latest.current.onItemClick?.({
        item: last,
        index: resolvedItems.indexOf(last),
        event,
      });
    }
  };

  const onTriggerKeydown = (event: ReactKeyboardEvent<HTMLElement>) => {
    // Keys arriving from inside the panel belong to the menu, not the trigger.
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('.oge-popup')
    ) {
      return;
    }
    // APG menu-button: tabbing off the trigger closes the open panel.
    if (event.key === 'Tab') {
      if (openedRef.current) panelRef.current.close('tab');
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    event.stopPropagation();
    if (!openedRef.current) setOpened(true);
    pendingMenuFocus.current = event.key === 'ArrowDown' ? 'first' : 'last';
  };

  const onMenuItemClick = (event: OgeMenuListItemClickEvent) => {
    latest.current.onItemClick?.({
      item: event.item,
      index: event.index,
      event: event.event,
    });
    if (rememberActive && !event.item.disabled && !event.item.separator) {
      setLastAction((previousItem) => {
        if (previousItem !== event.item) {
          latest.current.onSelectionChange?.({
            item: event.item,
            previousItem,
          });
          return event.item;
        }
        return previousItem;
      });
    }
  };

  const onMenuCloseRequest = (event: OgeMenuCloseRequestEvent) => {
    if (event.reason === 'tab') {
      // Focus the trigger before the panel unmounts so the browser's default
      // Tab continues from there instead of a removed element.
      focusTrigger();
      panelRef.current.close('tab');
      return;
    }
    panelRef.current.close(event.reason);
  };

  const statusRow = (content: ReactNode) => (
    <div className="oge-menu-status-row" role="presentation">
      {content}
    </div>
  );

  return (
    <span
      ref={hostRef}
      className={[
        'oge-drop-down-button',
        splitButton && 'oge-drop-down-split',
        opened && 'oge-drop-down-open',
        disabled && 'oge-disabled',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onKeyDown={onTriggerKeydown}
    >
      <OgeButton
        ref={triggerRef}
        text={mainText}
        hint={hint}
        disabled={disabled}
        stylingMode={stylingMode}
        severity={severity}
        size={size}
        color={color}
        icon={icon}
        iconPosition={iconPosition}
        badge={badge}
        loading={loading}
        onLoadingChange={onLoadingChange}
        action={splitButton ? effectiveMainAction : undefined}
        clickGuard={splitButton ? clickGuard : false}
        ariaHasPopup={splitButton ? undefined : 'menu'}
        ariaExpanded={splitButton ? undefined : opened}
        ariaControls={splitButton ? undefined : panel.panelId}
        onClick={onMainClicked}
      >
        {!splitButton && chevron}
      </OgeButton>
      {splitButton && (
        <OgeButton
          ref={toggleRef}
          className="oge-drop-down-toggle"
          hint={msg.dropDownToggle}
          disabled={disabled}
          stylingMode={stylingMode}
          severity={severity}
          size={size}
          color={color}
          ariaHasPopup="menu"
          ariaExpanded={opened}
          ariaControls={panel.panelId}
          onClick={() => setOpened(!openedRef.current)}
        >
          {chevron}
        </OgeButton>
      )}
      {opened && (
        <OgePopup panel={panel} ref={popupRef}>
          {renderContent ? (
            renderContent(() => panelRef.current.close('select'))
          ) : itemsStatus === 'loading' ? (
            statusRow(
              <>
                <svg
                  className="oge-menu-status-spinner"
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M8 1.5 A 6.5 6.5 0 1 1 1.5 8" />
                </svg>
                {msg.dropDownLoading}
              </>,
            )
          ) : itemsStatus === 'error' ? (
            statusRow(msg.dropDownLoadError)
          ) : resolvedItems.length === 0 ? (
            statusRow(msg.dropDownNoItems)
          ) : (
            <OgeMenuList
              ref={menuRef}
              items={resolvedItems}
              ariaLabel={mainText || hint}
              renderItem={renderItem}
              onItemClick={onMenuItemClick}
              onCloseRequest={onMenuCloseRequest}
            />
          )}
        </OgePopup>
      )}
    </span>
  );
});
