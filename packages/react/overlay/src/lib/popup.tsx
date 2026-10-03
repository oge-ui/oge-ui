'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  OgeAdaptiveSheetCore,
  type OgeAdaptivePresentation,
} from '@oge-ui/behavior';
import type { OgeAnchoredPanelHandle } from './use-anchored-panel';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface OgePopupProps {
  /** The anchored-panel handle driving id, position and visibility. */
  panel: OgeAnchoredPanelHandle;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /**
   * Presentation: anchored (`'popup'`, the default), a modal bottom sheet
   * (`'sheet'`) or a full-screen dialog (`'fullscreen'`). Popup editors
   * resolve it from their `adaptiveMode` / `adaptiveBreakpoint`.
   */
  adaptive?: OgeAdaptivePresentation;
  /** Dialog title while adaptive — editors pass their field label. */
  adaptiveTitle?: string;
  /** Aria label of the adaptive close (✕) button — from the owner's messages. */
  closeLabel?: string;
  /** Rendered under the adaptive title (a search field); ignored anchored. */
  sheetHeader?: ReactNode;
  /** Pinned at the bottom of the adaptive surface (a Done action); ignored anchored. */
  sheetFooter?: ReactNode;
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
 *
 * With `adaptive` set to `'sheet'` or `'fullscreen'` the same content is
 * presented as a modal bottom sheet / full-screen dialog: a titled
 * `role="dialog"` surface with a close button, scroll lock, inert background,
 * a Tab trap and focus restore — `@oge-ui/behavior`'s
 * `OgeAdaptiveSheetCore`, the machine the Angular popup runs.
 */
export const OgePopup = forwardRef<HTMLDivElement, OgePopupProps>(
  function OgePopup(
    {
      panel,
      className,
      style,
      children,
      adaptive = 'popup',
      adaptiveTitle = '',
      closeLabel = '',
      sheetHeader,
      sheetFooter,
    },
    ref,
  ) {
    const position = panel.position;
    const isAdaptive = adaptive !== 'popup';
    const titleId = `oge-popup-sheet-title-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

    const elementRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef(panel);
    panelRef.current = panel;
    const sheetRef = useRef<OgeAdaptiveSheetCore | null>(null);
    sheetRef.current ??= new OgeAdaptiveSheetCore({
      element: () => elementRef.current,
      onDismiss: () => panelRef.current.close('escape'),
    });

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        elementRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    // Activated on the mount side, released in the cleanup — StrictMode's
    // cleanup → remount simply releases and re-takes the same machine.
    useIsomorphicLayoutEffect(() => {
      const sheet = sheetRef.current;
      if (!sheet || !isAdaptive) return;
      sheet.activate();
      return () => sheet.deactivate();
    }, [isAdaptive]);

    const classes = [
      'oge-popup',
      (isAdaptive || position) && 'oge-popup-ready',
      isAdaptive && 'oge-popup-adaptive',
      adaptive === 'sheet' && 'oge-popup-adaptive-sheet',
      adaptive === 'fullscreen' && 'oge-popup-adaptive-fullscreen',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    if (!isAdaptive) {
      return (
        <div
          ref={setRefs}
          id={panel.panelId}
          className={classes}
          data-placement={position?.placement ?? undefined}
          style={{
            ...style,
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            width: position?.width,
            // Transparent until the first measure so the panel never flashes
            // at (0,0) — opacity (not visibility) keeps the subtree
            // focusable. The ready class then plays the fade/scale entrance.
            opacity: position ? undefined : 0,
          }}
        >
          {children}
        </div>
      );
    }

    return (
      <div ref={setRefs} id={panel.panelId} className={classes} style={style}>
        <div
          className="oge-popup-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="oge-popup-sheet-header">
            {adaptive === 'sheet' && (
              <div className="oge-popup-sheet-handle" aria-hidden="true" />
            )}
            <h2 className="oge-popup-sheet-title" id={titleId}>
              {adaptiveTitle}
            </h2>
            <button
              type="button"
              className="oge-popup-sheet-close"
              aria-label={closeLabel || undefined}
              title={closeLabel || undefined}
              onClick={() => panel.close('escape')}
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
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
          </div>
          {sheetHeader}
          <div className="oge-popup-sheet-body">{children}</div>
          {sheetFooter}
        </div>
      </div>
    );
  },
);
