'use client';

import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import type { OgeAnchoredPanelHandle } from './use-anchored-panel';

export interface OgePopupProps {
  /** The anchored-panel handle driving id, position and visibility. */
  panel: OgeAnchoredPanelHandle;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Presentational chrome for an anchored panel: fixed positioning, popup
 * surface tokens and the panel's generated id — the same `.oge-popup`
 * markup and classes the Angular `<oge-popup>` renders. The owner renders it
 * while `panel.isOpen` and hands the ref to `useAnchoredPanel`'s `panel`
 * getter:
 *
 * ```tsx
 * {panel.isOpen && (
 *   <OgePopup panel={panel} ref={popupRef}>…content…</OgePopup>
 * )}
 * ```
 */
export const OgePopup = forwardRef<HTMLDivElement, OgePopupProps>(
  function OgePopup({ panel, className, style, children }, ref) {
    const position = panel.position;
    return (
      <div
        ref={ref}
        id={panel.panelId}
        className={['oge-popup', position && 'oge-popup-ready', className]
          .filter(Boolean)
          .join(' ')}
        data-placement={position?.placement ?? undefined}
        style={{
          ...style,
          top: position?.top ?? 0,
          left: position?.left ?? 0,
          width: position?.width,
          // Transparent until the first measure so the panel never flashes at
          // (0,0) — opacity (not visibility) keeps the subtree focusable. The
          // ready class then plays the fade/scale entrance from that state.
          opacity: position ? undefined : 0,
        }}
      >
        {children}
      </div>
    );
  },
);
