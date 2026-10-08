'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  OGE_POPUP_ARROW_SIZE,
  OGE_TOOLTIP_PANEL_OPTIONS,
  OgeTooltipCore,
  modalCssSize,
  popupArrowInset,
  tooltipDescribedByTarget,
  type OgePopupPlacement,
  type OgeTooltipShowMode,
} from '@oge-ui/behavior';
import { useOgeOverlayConfig } from './overlay-config';
import { useAnchoredPanel } from './use-anchored-panel';

/** Imperative handle — mirrors the Angular directive's public methods. */
export interface OgeTooltipHandle {
  /** Shows the tooltip now, whatever the show mode (no dwell). */
  open(): void;
  /** Hides the tooltip now. */
  close(): void;
  /** Shows a hidden tooltip, hides a visible one. */
  toggle(): void;
}

export interface OgeTooltipProps {
  /** Tooltip text. An empty string (with no `content`) disables the tooltip. */
  text?: string;
  /**
   * Rich content — a node or a render function (formatting, icons; never
   * focusable controls: a tooltip is not interactive). Wins over `text`.
   */
  content?: ReactNode | (() => ReactNode);
  /** Preferred side; flips when there is no room. Default `'top'` (centered). */
  placement?: OgePopupPlacement;
  /**
   * What shows the tooltip: `'hover'` (dwell + keyboard focus, the default),
   * `'focus'`, `'click'` (activation toggles) or `'manual'` (only the ref
   * handle's `open()` / `close()` / `toggle()`).
   */
  showMode?: OgeTooltipShowMode;
  /** Hover dwell before showing, in ms; falls back to the overlay config. */
  showDelay?: number;
  /** Grace period before hiding, in ms; falls back to the overlay config. */
  hideDelay?: number;
  /** Draws a callout arrow pointing at the trigger. Default `false`. */
  arrow?: boolean;
  /** Maximum bubble width (px number or any CSS length); CSS default 280px. */
  maxWidth?: number | string;
  /** Disables showing without detaching the tooltip. */
  disabled?: boolean;
  /** The trigger element — exactly one element child. */
  children?: ReactNode;
}

/**
 * Attaches an accessible tooltip to its child element — the React render of
 * the Angular `[ogeTooltip]` directive:
 *
 * ```tsx
 * <OgeTooltip text="Saves your changes" arrow>
 *   <button type="button">Save</button>
 * </OgeTooltip>
 * <OgeTooltip content={() => <><strong>Ada</strong> · Engineer</>}>
 *   <button type="button">Ada</button>
 * </OgeTooltip>
 * ```
 *
 * Shows after a hover dwell (configurable via `<OgeOverlayConfigProvider>`)
 * or immediately on keyboard focus; hides on leave, blur or Escape —
 * `showMode` switches to focus-only, click-to-toggle or manual (drive it
 * through the ref handle). While visible the trigger's `aria-describedby`
 * includes the tooltip id — any existing value is preserved. The bubble
 * renders into `document.body` so transformed/overflow ancestors never clip
 * it, is viewport-aware (flips and clamps), optionally draws a callout arrow,
 * and is hoverable (WCAG 1.4.13): moving the pointer onto it within the hide
 * delay keeps it open, and Escape pressed anywhere hides it. Nothing in the
 * bubble is focusable — it stays a non-interactive `role="tooltip"`.
 *
 * The timing machine and the `aria-describedby` bookkeeping are
 * `@oge-ui/behavior`'s `OgeTooltipCore`, shared verbatim with the Angular
 * directive (ADR 0001). The child is wrapped in a `display: contents` span
 * that carries the listeners, so the child keeps its own ref and props.
 */
export const OgeTooltip = forwardRef<OgeTooltipHandle, OgeTooltipProps>(
  function OgeTooltipRender(
    {
      text = '',
      content,
      placement = 'top',
      showMode = 'hover',
      showDelay,
      hideDelay,
      arrow = false,
      maxWidth,
      disabled = false,
      children,
    },
    ref,
  ) {
    const config = useOgeOverlayConfig();
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);

    const hasContent = content !== undefined && content !== null;
    const latest = useRef({
      text,
      hasContent,
      placement,
      showMode,
      showDelay,
      hideDelay,
      arrow,
      disabled,
    });
    latest.current = {
      text,
      hasContent,
      placement,
      showMode,
      showDelay,
      hideDelay,
      arrow,
      disabled,
    };
    const configRef = useRef(config);
    configRef.current = config;

    const trigger = (): HTMLElement | null =>
      (wrapperRef.current?.firstElementChild as HTMLElement | null) ??
      wrapperRef.current;

    const panel = useAnchoredPanel({
      anchor: trigger,
      panel: () => bubbleRef.current,
      placement: () => latest.current.placement,
      offset: () =>
        configRef.current.offset +
        (latest.current.arrow ? OGE_POPUP_ARROW_SIZE : 0),
      arrow: () => latest.current.arrow,
      ...OGE_TOOLTIP_PANEL_OPTIONS,
      onClosed: () => coreRef.current?.onPanelClosed(),
    });
    const panelRef = useRef(panel);
    panelRef.current = panel;

    const coreRef = useRef<OgeTooltipCore>(undefined);
    coreRef.current ??= new OgeTooltipCore({
      text: () => latest.current.text,
      hasContent: () => latest.current.hasContent,
      showMode: () => latest.current.showMode,
      disabled: () => latest.current.disabled,
      showDelay: () =>
        latest.current.showDelay ?? configRef.current.tooltipShowDelayMs,
      hideDelay: () =>
        latest.current.hideDelay ?? configRef.current.tooltipHideDelayMs,
      isOpen: () => panelRef.current.isOpen,
      open: () => panelRef.current.open(),
      close: () => panelRef.current.close(),
      describedByTarget: () => {
        const el = trigger();
        return el ? tooltipDescribedByTarget(el) : null;
      },
      panelId: panel.panelId,
    });
    const core = coreRef.current;

    useImperativeHandle(
      ref,
      () => ({
        open: () => core.show(),
        close: () => core.hide(),
        toggle: () => core.toggle(),
      }),
      [core],
    );

    // Live updates: an open tooltip whose content emptied or that was
    // disabled hides (the bubble content itself re-renders with the props).
    useEffect(() => core.sync(), [core, text, hasContent, disabled]);
    useEffect(() => () => core.destroy(), [core]);

    const onKeyDown = (event: ReactKeyboardEvent): void => {
      core.keyDown(event.key);
    };

    const position = panel.position;
    const arrowGeometry = arrow ? position?.arrow : undefined;
    const arrowInset = arrowGeometry ? popupArrowInset(arrowGeometry) : null;
    const body =
      typeof content === 'function'
        ? (content as () => ReactNode)()
        : hasContent
          ? content
          : text;
    return (
      <>
        <span
          ref={wrapperRef}
          style={{ display: 'contents' }}
          onPointerEnter={() => core.pointerEnter()}
          onPointerLeave={() => core.pointerLeave()}
          onFocus={() => core.focusIn()}
          onBlur={() => core.focusOut()}
          onClick={() => core.click()}
          onKeyDown={onKeyDown}
        >
          {children}
        </span>
        {panel.isOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={bubbleRef}
              id={panel.panelId}
              role="tooltip"
              className={['oge-tooltip', position && 'oge-tooltip-ready']
                .filter(Boolean)
                .join(' ')}
              data-placement={position?.placement ?? undefined}
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                opacity: position ? undefined : 0,
                maxWidth: modalCssSize(maxWidth) ?? undefined,
              }}
              onPointerEnter={() => core.bubblePointerEnter()}
              onPointerLeave={() => core.bubblePointerLeave()}
            >
              {body}
              {arrowGeometry && arrowInset && (
                <span
                  className="oge-tooltip-arrow"
                  aria-hidden="true"
                  data-side={arrowGeometry.side}
                  style={{
                    left: arrowInset.left ?? undefined,
                    top: arrowInset.top ?? undefined,
                  }}
                />
              )}
            </div>,
            document.body,
          )}
      </>
    );
  },
);
