'use client';

import { useEffect, useRef, useState } from 'react';
import {
  OgeAnchoredPanelCore,
  type OgeAnchoredPanelCoreOptions,
  type OgePopupCloseReason,
  type OgeResolvedPopupPosition,
} from '@oge-ui/behavior';

/** Everything the machine takes except the state sinks, which the hook owns. */
export type UseAnchoredPanelOptions = Omit<
  OgeAnchoredPanelCoreOptions,
  'onOpenChange' | 'onPositionChange'
>;

/** What `useAnchoredPanel` returns — the React face of the panel machine. */
export interface OgeAnchoredPanelHandle {
  /** Unique id applied to the panel element — wire to `aria-controls`. */
  readonly panelId: string;
  /** Current open state (re-renders the owner when it changes). */
  readonly isOpen: boolean;
  /** `null` until the first measure after open; hide the panel while `null`. */
  readonly position: OgeResolvedPopupPosition | null;
  open(): void;
  close(reason?: OgePopupCloseReason): void;
  toggle(): void;
  /** Re-measures anchor/panel and recomputes the position (rAF-coalesced). */
  updatePosition(): void;
}

/**
 * React seam over `@oge-ui/behavior`'s `OgeAnchoredPanelCore` — the same
 * machine the Angular `OgeAnchoredPanel` wraps with signals, so popup
 * positioning, Escape-stack behavior and focus restore are shared code
 * across the render layers rather than a re-implementation.
 *
 * ```tsx
 * const popupRef = useRef<HTMLDivElement>(null);
 * const anchorRef = useRef<HTMLButtonElement>(null);
 * const panel = useAnchoredPanel({
 *   anchor: () => anchorRef.current,
 *   panel: () => popupRef.current,
 *   restoreFocus: () => anchorRef.current?.focus(),
 * });
 * // {panel.isOpen && <OgePopup panel={panel} ref={popupRef}>…</OgePopup>}
 * ```
 */
export function useAnchoredPanel(
  options: UseAnchoredPanelOptions,
): OgeAnchoredPanelHandle {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<OgeResolvedPopupPosition | null>(
    null,
  );

  // The machine reads live options through this ref, so inline getters and
  // callbacks stay current without recreating the machine.
  const latest = useRef(options);
  latest.current = options;

  const coreRef = useRef<OgeAnchoredPanelCore>(undefined);
  if (!coreRef.current) {
    coreRef.current = new OgeAnchoredPanelCore({
      anchor: () => latest.current.anchor(),
      panel: () => latest.current.panel(),
      placement: () => latest.current.placement?.() ?? 'bottom-start',
      width: () => latest.current.width?.(),
      offset: () => latest.current.offset?.(),
      viewportPadding: () => latest.current.viewportPadding?.(),
      get closeOnOutsidePointerDown() {
        return latest.current.closeOnOutsidePointerDown;
      },
      get closeOnEscape() {
        return latest.current.closeOnEscape;
      },
      restoreFocus: () => latest.current.restoreFocus?.(),
      onClosed: (reason) => latest.current.onClosed?.(reason),
      anchorRect: () => latest.current.anchorRect?.() ?? null,
      get transient() {
        return latest.current.transient;
      },
      onOpenChange: setIsOpen,
      onPositionChange: setPosition,
    });
  }
  const core = coreRef.current;

  // destroy() only tears listeners down and closes — the machine stays
  // reusable, so StrictMode's destroy → remount cycle needs no revive.
  useEffect(() => () => core.destroy(), [core]);

  const handleRef = useRef<OgeAnchoredPanelHandle>(undefined);
  if (!handleRef.current) {
    handleRef.current = {
      panelId: core.panelId,
      isOpen: false,
      position: null,
      open: () => core.open(),
      close: (reason) => core.close(reason),
      toggle: () => core.toggle(),
      updatePosition: () => core.updatePosition(),
    };
  }
  // A fresh object per render would defeat memoized consumers; mutate the
  // stable handle instead — the state values themselves came from useState,
  // so the owner has already re-rendered when they change.
  const handle = handleRef.current as {
    isOpen: boolean;
    position: OgeResolvedPopupPosition | null;
  } & OgeAnchoredPanelHandle;
  handle.isOpen = isOpen;
  handle.position = position;
  return handle;
}
