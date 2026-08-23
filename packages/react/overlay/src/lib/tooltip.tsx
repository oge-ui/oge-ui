'use client';

import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  OGE_TOOLTIP_PANEL_OPTIONS,
  OgeTooltipCore,
  tooltipDescribedByTarget,
  type OgePopupPlacement,
} from '@oge-ui/behavior';
import { useOgeOverlayConfig } from './overlay-config';
import { useAnchoredPanel } from './use-anchored-panel';

export interface OgeTooltipProps {
  /** Tooltip text. An empty string disables the tooltip. */
  text: string;
  /** Preferred side; flips when there is no room. Default `'top'` (centered). */
  placement?: OgePopupPlacement;
  /** Hover dwell before showing, in ms; falls back to the overlay config. */
  showDelay?: number;
  /** Grace period before hiding, in ms; falls back to the overlay config. */
  hideDelay?: number;
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
 * <OgeTooltip text="Saves your changes">
 *   <button type="button">Save</button>
 * </OgeTooltip>
 * ```
 *
 * Shows after a hover dwell (configurable via `<OgeOverlayConfigProvider>`)
 * or immediately on keyboard focus; hides on leave, blur or Escape. While
 * visible the trigger's `aria-describedby` includes the tooltip id — any
 * existing value is preserved. The bubble renders into `document.body` so
 * transformed/overflow ancestors never clip it, is viewport-aware (flips and
 * clamps) and never receives pointer events.
 *
 * The timing machine and the `aria-describedby` bookkeeping are
 * `@oge-ui/behavior`'s `OgeTooltipCore`, shared verbatim with the Angular
 * directive (ADR 0001). The child is wrapped in a `display: contents` span
 * that carries the listeners, so the child keeps its own ref and props.
 */
export function OgeTooltip({
  text,
  placement = 'top',
  showDelay,
  hideDelay,
  disabled = false,
  children,
}: OgeTooltipProps) {
  const config = useOgeOverlayConfig();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const latest = useRef({ text, placement, showDelay, hideDelay, disabled });
  latest.current = { text, placement, showDelay, hideDelay, disabled };
  const configRef = useRef(config);
  configRef.current = config;

  const trigger = (): HTMLElement | null =>
    (wrapperRef.current?.firstElementChild as HTMLElement | null) ??
    wrapperRef.current;

  const panel = useAnchoredPanel({
    anchor: trigger,
    panel: () => bubbleRef.current,
    placement: () => latest.current.placement,
    ...OGE_TOOLTIP_PANEL_OPTIONS,
    onClosed: () => coreRef.current?.onPanelClosed(),
  });
  const panelRef = useRef(panel);
  panelRef.current = panel;

  const coreRef = useRef<OgeTooltipCore>(undefined);
  coreRef.current ??= new OgeTooltipCore({
    text: () => latest.current.text,
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

  // Live updates: an open tooltip whose text emptied or that was disabled
  // hides (the bubble text itself re-renders with the prop).
  useEffect(() => core.sync(), [core, text, disabled]);
  useEffect(() => () => core.destroy(), [core]);

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (event.key === 'Escape') core.hide();
  };

  const position = panel.position;
  return (
    <>
      <span
        ref={wrapperRef}
        style={{ display: 'contents' }}
        onPointerEnter={() => core.scheduleShow()}
        onPointerLeave={() => core.scheduleHide()}
        onFocus={() => core.show()}
        onBlur={() => core.hide()}
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
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
