'use client';

import {
  forwardRef,
  useEffect,
  useId,
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
import { createPortal } from 'react-dom';
import {
  OGE_ACTION_SHEET_FOCUS_ATTR,
  OgeActionSheetCore,
  ogeActionSheetDividerIndex,
  ogeActionSheetKeyIntent,
  ogeActionSheetOrder,
  ogeActionSheetTabStop,
  ogeOverlayMessage,
  type OgeActionSheetCloseReason,
  type OgeActionSheetClosedEvent,
  type OgeActionSheetClosingEvent,
  type OgeActionSheetItem,
  type OgeActionSheetItemClickEvent,
  type OgeActionSheetOpeningEvent,
  type OgeActionSheetResult,
  type OgeOverlayMessages,
} from '@oge-ui/behavior';
import { useOgeOverlayConfig } from './overlay-config';

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Context of `renderItem` — the Angular `[ogeActionSheetItemTemplate]` context. */
export interface OgeActionSheetItemRenderContext {
  item: OgeActionSheetItem;
  index: number;
}

export interface OgeActionSheetProps {
  /** Whether the sheet is open (controlled). */
  opened?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpened?: boolean;
  /** The open state a gesture or a method committed — the controlled half of `opened`. */
  onOpenedChange?: (opened: boolean) => void;
  /** The actions, in order; `group: 'bottom'` actions render after a divider. */
  items?: readonly OgeActionSheetItem[];
  /** Heading of the sheet — also its accessible name. */
  title?: string;
  /** Secondary text under the title (the dialog's description). */
  description?: string;
  /** Accessible name when there is no `title`; falls back to the `actionSheetLabel` message. */
  ariaLabel?: string;
  /** Renders the Cancel button (default `true`). */
  showCancel?: boolean;
  /** Text of the Cancel button; falls back to the `actionSheetCancel` message. */
  cancelText?: string;
  /** Closes on a backdrop press (default `true`). */
  closeOnBackdropClick?: boolean;
  /** Closes on Escape (default `true`). */
  closeOnEscape?: boolean;
  /** Closes on a swipe down from the handle / header (default `true`). */
  swipeToClose?: boolean;
  /** Per-instance message overrides. */
  messages?: Partial<OgeOverlayMessages>;
  /** Replaces each action's icon + text — the Angular `[ogeActionSheetItemTemplate]`. */
  renderItem?: (context: OgeActionSheetItemRenderContext) => ReactNode;
  /** Cancelable, before the sheet opens. */
  onOpening?: (event: OgeActionSheetOpeningEvent) => void;
  /** Cancelable, before the sheet closes; carries the reason and the chosen action. */
  onClosing?: (event: OgeActionSheetClosingEvent) => void;
  /** The sheet closed. */
  onClosed?: (event: OgeActionSheetClosedEvent) => void;
  /** An action was chosen; set `keepOpen` to keep the sheet open. */
  onItemClick?: (event: OgeActionSheetItemClickEvent) => void;
  /** Extra content between the header and the actions. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeActionSheet>`. */
export interface OgeActionSheetHandle {
  /** Opens the sheet and resolves with the chosen action, or `null` when dismissed. */
  open(): Promise<OgeActionSheetResult>;
  /** Closes the sheet (reason `'api'`; runs `onClosing`). */
  close(): void;
  /** Opens a closed sheet, closes an open one. */
  toggle(): void;
}

const EMPTY: readonly OgeActionSheetItem[] = [];

/**
 * A bottom sheet of actions — the React render of the Angular
 * `<oge-action-sheet>`: the same markup, stylesheet and
 * `OgeActionSheetCore` (focus trap, scroll lock, inert background, the
 * overlay Escape stack, backdrop and swipe-down dismissal, focus restore),
 * portaled to `document.body` while open. The actions are an APG menu with
 * one tab stop; choosing one closes the sheet unless `onItemClick` sets
 * `keepOpen`.
 *
 * ```tsx
 * const sheet = useRef<OgeActionSheetHandle>(null);
 * <button onClick={async () => run(await sheet.current?.open())}>More</button>
 * <OgeActionSheet ref={sheet} title="Photo" items={actions} />
 * ```
 */
export const OgeActionSheet = forwardRef<
  OgeActionSheetHandle,
  OgeActionSheetProps
>(function OgeActionSheet(props, ref) {
  const config = useOgeOverlayConfig();
  const items = props.items ?? EMPTY;
  const messages = useMemo(
    () => ({ ...config.messages, ...props.messages }),
    [config.messages, props.messages],
  );
  const [uncontrolledOpen, setUncontrolledOpen] = useState(
    props.defaultOpened ?? false,
  );
  const isOpen = props.opened ?? uncontrolledOpen;
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState(-1);

  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = `oge-action-sheet-${uid}-title`;
  const descriptionId = `oge-action-sheet-${uid}-description`;

  const ordered = useMemo(() => ogeActionSheetOrder(items), [items]);
  const divider = ogeActionSheetDividerIndex(ordered);
  const tabStop = ogeActionSheetTabStop(ordered, focused);

  const layerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const openRef = useRef(isOpen);
  openRef.current = isOpen;
  const pending = useRef({
    reason: 'api' as OgeActionSheetCloseReason,
    item: null as OgeActionSheetItem | null,
    resolvers: [] as ((result: OgeActionSheetResult) => void)[],
  });

  const setOpen = (next: boolean) => {
    openRef.current = next;
    if (latest.current.opened === undefined) setUncontrolledOpen(next);
    latest.current.onOpenedChange?.(next);
  };

  const requestClose = (
    reason: OgeActionSheetCloseReason,
    item: OgeActionSheetItem | null,
  ) => {
    if (!openRef.current) return;
    const closing: OgeActionSheetClosingEvent = { reason, item, cancel: false };
    latest.current.onClosing?.(closing);
    if (closing.cancel) return;
    pending.current.reason = reason;
    pending.current.item = item;
    setOpen(false);
  };
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;

  const coreRef = useRef<OgeActionSheetCore | null>(null);
  if (coreRef.current === null) {
    coreRef.current = new OgeActionSheetCore({
      layer: () => layerRef.current,
      sheet: () => sheetRef.current,
      onDismiss: (reason) => {
        const p = latest.current;
        if (reason === 'escape' && p.closeOnEscape === false) return;
        if (reason === 'backdrop' && p.closeOnBackdropClick === false) return;
        if (reason === 'swipe' && p.swipeToClose === false) return;
        closeRef.current(reason, null);
      },
    });
  }
  const core = coreRef.current;

  const settle = (emit: boolean) => {
    const { reason, item, resolvers } = pending.current;
    pending.current = { reason: 'api', item: null, resolvers: [] };
    const result = emit ? item : null;
    if (emit) latest.current.onClosed?.({ reason, item: result });
    for (const resolve of resolvers) resolve(result);
  };
  const settleRef = useRef(settle);
  settleRef.current = settle;

  // activation follows the rendered layer; StrictMode's cleanup / remount
  // releases and re-takes the same modal state
  const wasOpen = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (!isOpen) {
      if (wasOpen.current) {
        wasOpen.current = false;
        setReady(false);
        setFocused(-1);
        settleRef.current(true);
      }
      return;
    }
    wasOpen.current = true;
    core.activate();
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(frame);
      core.deactivate();
    };
  }, [isOpen, core]);

  useEffect(
    () => () => {
      core.destroy();
      settleRef.current(false);
    },
    [core],
  );

  const open = (): Promise<OgeActionSheetResult> =>
    new Promise((resolve) => {
      if (openRef.current) {
        pending.current.resolvers.push(resolve);
        return;
      }
      const opening: OgeActionSheetOpeningEvent = { cancel: false };
      latest.current.onOpening?.(opening);
      if (opening.cancel) {
        resolve(null);
        return;
      }
      pending.current.resolvers.push(resolve);
      setOpen(true);
    });
  const openFnRef = useRef(open);
  openFnRef.current = open;

  useImperativeHandle(
    ref,
    () => ({
      open: () => openFnRef.current(),
      close: () => closeRef.current('api', null),
      toggle: () => {
        if (openRef.current) closeRef.current('api', null);
        else void openFnRef.current();
      },
    }),
    [],
  );

  const activate = (index: number, event: Event) => {
    const item = ordered[index];
    if (!item || item.disabled) return;
    const click: OgeActionSheetItemClickEvent = {
      item,
      index,
      event,
      keepOpen: false,
    };
    latest.current.onItemClick?.(click);
    if (!click.keepOpen) requestClose('action', item);
  };

  const onItemKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const intent = ogeActionSheetKeyIntent(event.key, index, ordered);
    if (!intent) return;
    event.preventDefault();
    if (intent.kind === 'activate') {
      activate(intent.index, event.nativeEvent);
      return;
    }
    setFocused(intent.index);
    sheetRef.current
      ?.querySelector<HTMLElement>(
        `[data-oge-action-sheet-index="${intent.index}"]`,
      )
      ?.focus();
  };

  const label = props.title
    ? undefined
    : (props.ariaLabel ?? ogeOverlayMessage(messages, 'actionSheetLabel'));
  const showCancel = props.showCancel ?? true;

  const sheet = (
    <div
      ref={layerRef}
      className={
        ready
          ? 'oge-action-sheet-layer oge-action-sheet-ready'
          : 'oge-action-sheet-layer'
      }
    >
      <div
        ref={sheetRef}
        className={
          props.className
            ? `oge-action-sheet ${props.className}`
            : 'oge-action-sheet'
        }
        style={props.style}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={props.title ? titleId : undefined}
        aria-label={label}
        aria-describedby={props.description ? descriptionId : undefined}
      >
        <div className="oge-action-sheet-header">
          <span className="oge-action-sheet-handle" aria-hidden="true" />
          {props.title && (
            <h2 className="oge-action-sheet-title" id={titleId}>
              {props.title}
            </h2>
          )}
          {props.description && (
            <p className="oge-action-sheet-description" id={descriptionId}>
              {props.description}
            </p>
          )}
        </div>
        <div className="oge-action-sheet-content">{props.children}</div>
        {ordered.length > 0 && (
          <div
            className="oge-action-sheet-menu"
            role="menu"
            aria-labelledby={props.title ? titleId : undefined}
            aria-label={label}
          >
            {ordered.map((item, i) => (
              <ActionRow
                key={item.key ?? i}
                item={item}
                index={i}
                divider={i === divider}
                tabStop={i === tabStop}
                render={props.renderItem}
                onClick={(event) => activate(i, event.nativeEvent)}
                onKeyDown={(event) => onItemKeyDown(event, i)}
                onFocus={() => setFocused(i)}
              />
            ))}
          </div>
        )}
        {showCancel && (
          <button
            type="button"
            className="oge-action-sheet-cancel"
            onClick={() => requestClose('cancel', null)}
          >
            {props.cancelText ??
              ogeOverlayMessage(messages, 'actionSheetCancel')}
          </button>
        )}
      </div>
    </div>
  );

  return isOpen && typeof document !== 'undefined'
    ? createPortal(sheet, document.body)
    : null;
});

function ActionRow(props: {
  item: OgeActionSheetItem;
  index: number;
  divider: boolean;
  tabStop: boolean;
  render?: (context: OgeActionSheetItemRenderContext) => ReactNode;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  onFocus: () => void;
}) {
  const { item, index } = props;
  const focusAttr = props.tabStop ? { [OGE_ACTION_SHEET_FOCUS_ATTR]: '' } : {};
  return (
    <>
      {props.divider && (
        <div className="oge-action-sheet-divider" role="separator" />
      )}
      <button
        type="button"
        role="menuitem"
        className={
          item.destructive
            ? 'oge-action-sheet-item oge-action-sheet-item-destructive'
            : 'oge-action-sheet-item'
        }
        aria-disabled={item.disabled ? true : undefined}
        data-oge-action-sheet-index={index}
        {...focusAttr}
        tabIndex={props.tabStop ? 0 : -1}
        onClick={props.onClick}
        onKeyDown={props.onKeyDown}
        onFocus={props.onFocus}
      >
        {props.render ? (
          props.render({ item, index })
        ) : (
          <>
            {item.icon && (
              <svg
                className="oge-action-sheet-icon"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                focusable="false"
              >
                <path d={item.icon} />
              </svg>
            )}
            <span className="oge-action-sheet-text">
              <span className="oge-action-sheet-label">{item.text}</span>
              {item.description && (
                <span className="oge-action-sheet-item-description">
                  {item.description}
                </span>
              )}
            </span>
          </>
        )}
      </button>
    </>
  );
}
