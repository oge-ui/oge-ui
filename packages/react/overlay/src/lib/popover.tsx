'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import {
  OGE_DEFAULT_OVERLAY_MESSAGES,
  OGE_POPUP_ARROW_SIZE,
  OgePopoverCore,
  modalCssSize,
  popoverPanelAria,
  popoverTriggerAria,
  popupArrowInset,
  syncPopoverTriggerAria,
  tooltipDescribedByTarget,
  type OgeOverlayMessages,
  type OgePopoverClosedEvent,
  type OgePopoverClosingEvent,
  type OgePopoverInitialFocus,
  type OgePopoverOpenedEvent,
  type OgePopoverOpeningEvent,
  type OgePopoverShowOn,
  type OgePopupPlacement,
} from '@oge-ui/behavior';
import { useOgeOverlayConfig } from './overlay-config';
import { useAnchoredPanel } from './use-anchored-panel';

/** Context handed to the popover's render props. */
export interface OgePopoverSlotContext {
  /** Closes the popover (reason `'closeButton'`). */
  close: () => void;
}

/** Imperative handle — mirrors the Angular component's public methods. */
export interface OgePopoverHandle {
  /** Opens the popover (reason `'api'`; runs `onOpening`). */
  open(): void;
  /** Closes the popover (reason `'api'`; runs `onClosing`). */
  close(): void;
  /** Opens a closed popover, closes an open one. */
  toggle(): void;
}

export interface OgePopoverProps {
  /**
   * The trigger — one element, rendered in place inside a `display:
   * contents` wrapper that carries the listeners. Its focusable control
   * (the inner `<button>` of an `<OgeButton>`, the element itself otherwise)
   * receives the trigger ARIA (`aria-haspopup`, `aria-expanded`,
   * `aria-controls`) and anchors the panel. The React face of Angular's
   * `[ogePopover]` directive.
   */
  trigger?: ReactElement;
  /** Element (or ref) to anchor to when there is no `trigger` (manual popovers). */
  anchor?: HTMLElement | null | RefObject<HTMLElement | null>;
  /** Controlled open state; pair with `onOpenChange`. */
  open?: boolean;
  /** Initial open state when uncontrolled. Default `false`. */
  defaultOpen?: boolean;
  /** The open state changed (user interaction or the ref handle). */
  onOpenChange?: (open: boolean) => void;
  /** Title text; labels the dialog. `renderTitle` replaces it. */
  title?: string;
  /** Rich title (still labels the dialog). */
  renderTitle?: (context: OgePopoverSlotContext) => ReactNode;
  /** Footer (actions) bar. */
  renderFooter?: (context: OgePopoverSlotContext) => ReactNode;
  /** Accessible name when there is no title. */
  ariaLabel?: string;
  /**
   * What opens it from the trigger: `'click'` (default), `'hover'`,
   * `'focus'` or `'manual'` (code only).
   */
  showOn?: OgePopoverShowOn;
  /** Preferred side; flips and clamps against the viewport. Default `'bottom'`. */
  placement?: OgePopupPlacement;
  /** Draws a callout arrow pointing at the trigger. Default `false`. */
  arrow?: boolean;
  /**
   * Modal dialog: `aria-modal`, Tab trapped inside, focus moved in on open
   * and restored on close. Default `false` (non-modal; Tab may leave).
   */
  modal?: boolean;
  /** Renders the header ✕ (label from the overlay messages). Default `true`. */
  showCloseButton?: boolean;
  /** Content width (px number or CSS length). */
  width?: number | string;
  /** Maximum content width (px number or CSS length); CSS default 360px. */
  maxWidth?: number | string;
  /** Hover dwell before opening (hover mode); falls back to the overlay config. */
  showDelay?: number;
  /** Grace period before closing after the pointer left; falls back to the overlay config. */
  hideDelay?: number;
  /**
   * Focus target on click / API opens: `'auto'` (first tabbable when modal,
   * none otherwise), `'none'`, `'first-tabbable'`, `'panel'` or a selector.
   */
  initialFocus?: OgePopoverInitialFocus;
  /** Returns focus to the trigger when a close would lose it. Default `true`. */
  restoreFocus?: boolean;
  /** Escape closes the popover. Default `true`. */
  closeOnEscape?: boolean;
  /** A pointer-down outside trigger and panel closes it. Default `true`. */
  closeOnOutsideClick?: boolean;
  /** Prevents opening; closes an open popover. Default `false`. */
  disabled?: boolean;
  /** Per-instance message overrides (the close button's label). */
  messages?: Partial<OgeOverlayMessages>;
  /** Cancelable, before every open; carries the reason. */
  onOpening?: (event: OgePopoverOpeningEvent) => void;
  /** After the popover opened. */
  onOpened?: (event: OgePopoverOpenedEvent) => void;
  /** Cancelable, before every close; carries the reason. */
  onClosing?: (event: OgePopoverClosingEvent) => void;
  /** After the popover closed. */
  onClosed?: (event: OgePopoverClosedEvent) => void;
  /** Extra class on the panel. */
  className?: string;
  /** Extra inline style on the panel. */
  style?: CSSProperties;
  /** Body content, or a render function receiving the slot context. */
  children?: ReactNode | ((context: OgePopoverSlotContext) => ReactNode);
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

const resolveAnchor = (
  anchor: OgePopoverProps['anchor'],
): HTMLElement | null => {
  if (!anchor) return null;
  if (typeof HTMLElement !== 'undefined' && anchor instanceof HTMLElement) {
    return anchor;
  }
  return (anchor as RefObject<HTMLElement | null>).current ?? null;
};

/**
 * Anchored, interactive panel — title, rich body, footer actions, a close
 * button and an optional callout arrow — the React render of Angular's
 * `oge-popover` + `[ogePopover]`:
 *
 * ```tsx
 * <OgePopover
 *   trigger={<button type="button">Share</button>}
 *   title="Share report"
 *   arrow
 *   renderFooter={({ close }) => <OgeButton text="Copy link" onClick={close} />}
 * >
 *   <p>Anyone with the link can view.</p>
 * </OgePopover>
 * ```
 *
 * `showOn` picks the trigger: `'click'` (the APG disclosure — the trigger
 * gets `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`),
 * `'hover'` (dwell + a grace period that survives moving into the panel;
 * keyboard focus opens it too), `'focus'` or `'manual'`. The panel is a
 * `role="dialog"` rendered into `document.body`: non-modal by default (Tab
 * moves from the trigger into the panel and on past it, as if it followed
 * the trigger inline), or `modal` (`aria-modal`, Tab trapped, initial focus
 * inside, focus restored on close). Escape (the shared overlay stack),
 * outside clicks and the ✕ close it through the cancelable `onClosing`;
 * `open` / `onOpenChange` control it, the ref handle drives it imperatively.
 *
 * It runs `@oge-ui/behavior`'s `OgePopoverCore` and `OgeAnchoredPanelCore`
 * — the exact machines of the Angular popover (ADR 0001).
 */
export const OgePopover = forwardRef<OgePopoverHandle, OgePopoverProps>(
  function OgePopoverRender(props, ref) {
    const {
      trigger,
      open,
      defaultOpen = false,
      title,
      renderTitle,
      renderFooter,
      ariaLabel,
      showOn = 'click',
      arrow = false,
      modal = false,
      showCloseButton = true,
      width,
      maxWidth,
      messages,
      className,
      style,
      children,
    } = props;
    const config = useOgeOverlayConfig();
    const titleId = `oge-popover-title-${sanitizeId(useId())}`;
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const panelElRef = useRef<HTMLDivElement>(null);

    const controlled = open !== undefined;
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const wanted = controlled ? open : internalOpen;

    const latest = useRef(props);
    latest.current = props;
    const configRef = useRef(config);
    configRef.current = config;
    const controlledRef = useRef(controlled);
    controlledRef.current = controlled;

    const anchorElement = (): HTMLElement | null => {
      if (latest.current.trigger) {
        const el = wrapperRef.current?.firstElementChild as HTMLElement | null;
        return el ? tooltipDescribedByTarget(el) : null;
      }
      return resolveAnchor(latest.current.anchor);
    };

    const coreRef = useRef<OgePopoverCore>(undefined);
    const panel = useAnchoredPanel({
      anchor: anchorElement,
      panel: () => panelElRef.current,
      placement: () => latest.current.placement ?? 'bottom',
      offset: () =>
        configRef.current.offset +
        (latest.current.arrow ? OGE_POPUP_ARROW_SIZE : 0),
      viewportPadding: () => configRef.current.viewportPadding,
      arrow: () => latest.current.arrow ?? false,
      beforeClose: (reason) =>
        coreRef.current?.beforePanelClose(reason) ?? true,
    });
    const panelRef = useRef(panel);
    panelRef.current = panel;

    // The machine's own view of the open state: the panel handle's `isOpen`
    // is React state and lags one render behind a commit. Every close runs
    // through `commitClose` (the panel's `beforeClose` routes Escape and
    // outside clicks into the pipeline), so this ref never drifts.
    const openRef = useRef(false);

    const setOpenState = (next: boolean): void => {
      if (!controlledRef.current) setInternalOpen(next);
      latest.current.onOpenChange?.(next);
    };

    coreRef.current ??= new OgePopoverCore({
      showOn: () => latest.current.showOn ?? 'click',
      modal: () => latest.current.modal ?? false,
      disabled: () => latest.current.disabled ?? false,
      showDelay: () =>
        latest.current.showDelay ?? configRef.current.popoverShowDelayMs,
      hideDelay: () =>
        latest.current.hideDelay ?? configRef.current.popoverHideDelayMs,
      initialFocus: () => latest.current.initialFocus ?? 'auto',
      restoreFocus: () => latest.current.restoreFocus ?? true,
      closeOnEscape: () => latest.current.closeOnEscape ?? true,
      closeOnOutsideClick: () => latest.current.closeOnOutsideClick ?? true,
      isOpen: () => openRef.current,
      commitOpen: () => {
        openRef.current = true;
        panelRef.current.open();
        setOpenState(true);
      },
      commitClose: () => {
        openRef.current = false;
        panelRef.current.close('api');
        setOpenState(false);
      },
      trigger: anchorElement,
      panel: () => panelElRef.current,
      onOpening: (event) => latest.current.onOpening?.(event),
      onOpened: (event) => latest.current.onOpened?.(event),
      onClosing: (event) => latest.current.onClosing?.(event),
      onClosed: (event) => latest.current.onClosed?.(event),
    });
    const core = coreRef.current;

    // The open state (controlled prop or uncontrolled state) drives the
    // machine through the same cancelable pipeline; a vetoed change, or a
    // controlled parent that declined an interaction, is reconciled here.
    useEffect(() => {
      const reached = core.syncOpenState(wanted);
      if (reached === wanted) return;
      if (controlledRef.current) latest.current.onOpenChange?.(reached);
      else setInternalOpen(reached);
    }, [core, wanted, panel.isOpen]);

    useEffect(() => core.sync(), [core, props.disabled]);

    // Initial focus once the open panel was first positioned.
    useEffect(() => {
      if (panel.position !== null) core.panelReady();
    }, [core, panel.position]);

    // destroy() only clears timers — StrictMode's cleanup → remount keeps
    // the same, still usable machine.
    useEffect(
      () => () => {
        core.destroy();
        // the panel hook closes its machine on unmount — mirror it
        openRef.current = false;
      },
      [core],
    );

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          core.open('api');
        },
        close: () => {
          core.close('api');
        },
        toggle: () => core.toggle(),
      }),
      [core],
    );

    const slotContext: OgePopoverSlotContext = {
      close: () => {
        core.close('closeButton');
      },
    };

    const triggerAria = popoverTriggerAria(showOn, panel.isOpen, panel.panelId);
    const hasPopup = triggerAria['aria-haspopup'];
    const expanded = triggerAria['aria-expanded'];
    const controls = triggerAria['aria-controls'];
    // Written onto the trigger's focusable control (see `trigger`) — a
    // wrapper component's inner <button> is only reachable after it renders.
    useIsomorphicLayoutEffect(() => {
      const el = trigger ? anchorElement() : null;
      if (el) {
        syncPopoverTriggerAria(el, {
          'aria-haspopup': hasPopup,
          'aria-expanded': expanded,
          'aria-controls': controls,
        });
      }
    }, [trigger, hasPopup, expanded, controls]);

    const position = panel.position;
    const hasTitle = !!title || !!renderTitle;
    const hasHeader = hasTitle || showCloseButton;
    const closeLabel =
      messages?.popoverClose ??
      config.messages.popoverClose ??
      OGE_DEFAULT_OVERLAY_MESSAGES.popoverClose ??
      '';
    const panelAria = popoverPanelAria(modal);
    const arrowGeometry = arrow ? position?.arrow : undefined;
    const arrowInset = arrowGeometry ? popupArrowInset(arrowGeometry) : null;

    const panelNode = (
      <div
        ref={panelElRef}
        id={panel.panelId}
        className={[
          'oge-popover',
          modal && 'oge-popover-modal',
          position && 'oge-popover-ready',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        tabIndex={-1}
        role={panelAria.role}
        aria-modal={panelAria['aria-modal'] ?? undefined}
        aria-labelledby={hasTitle ? titleId : undefined}
        aria-label={hasTitle ? undefined : ariaLabel}
        data-placement={position?.placement ?? undefined}
        style={{
          ...style,
          top: position?.top ?? 0,
          left: position?.left ?? 0,
          opacity: position ? undefined : 0,
        }}
        onPointerEnter={() => core.panelPointerEnter()}
        onPointerLeave={() => core.panelPointerLeave()}
        onBlur={(event: ReactFocusEvent) => core.panelFocusOut(event)}
        onKeyDown={(event: ReactKeyboardEvent) => core.panelKeyDown(event)}
      >
        <div
          className="oge-popover-content"
          style={{
            width: modalCssSize(width) ?? undefined,
            maxWidth: modalCssSize(maxWidth) ?? undefined,
          }}
        >
          {hasHeader && (
            <div className="oge-popover-header">
              {hasTitle && (
                <div className="oge-popover-title" id={titleId}>
                  {renderTitle ? renderTitle(slotContext) : title}
                </div>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  className="oge-popover-close"
                  aria-label={closeLabel}
                  title={closeLabel}
                  onClick={() => core.close('closeButton')}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
          <div className="oge-popover-body">
            {typeof children === 'function' ? children(slotContext) : children}
          </div>
          {renderFooter && (
            <div className="oge-popover-footer">
              {renderFooter(slotContext)}
            </div>
          )}
        </div>
        {arrowGeometry && arrowInset && (
          <span
            className="oge-popover-arrow"
            aria-hidden="true"
            data-side={arrowGeometry.side}
            style={{
              left: arrowInset.left ?? undefined,
              top: arrowInset.top ?? undefined,
            }}
          />
        )}
      </div>
    );

    return (
      <>
        {trigger && (
          <span
            ref={wrapperRef}
            style={{ display: 'contents' }}
            onClick={() => core.triggerClick()}
            onPointerEnter={() => core.triggerPointerEnter()}
            onPointerLeave={() => core.triggerPointerLeave()}
            onFocus={() => core.triggerFocusIn()}
            onBlur={(event: ReactFocusEvent) => core.triggerFocusOut(event)}
            onKeyDown={(event: ReactKeyboardEvent) =>
              core.triggerKeyDown(event)
            }
          >
            {trigger}
          </span>
        )}
        {panel.isOpen &&
          typeof document !== 'undefined' &&
          createPortal(panelNode, document.body)}
      </>
    );
  },
);
