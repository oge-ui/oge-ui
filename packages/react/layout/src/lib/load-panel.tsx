'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import {
  OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
  OgeLoadPanelCore,
  ogeAcquireLoadPanelTarget,
  ogeLoadPanelBusyTarget,
  ogeLoadPanelNeedsPositioning,
  ogeResolveLoadPanelTarget,
  type OgeLoadPanelPosition,
} from '@oge-ui/behavior';
import { useOgeLiveAnnouncer } from '@oge-ui/react-overlay';
import { useOgeLoadIndicatorConfig } from './layout-config';
import { OgeLoadIndicator } from './load-indicator';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/** What `target` accepts: an element, a ref to one, or a CSS selector. */
export type OgeLoadPanelTarget = Element | RefObject<Element | null> | string;

export interface OgeLoadPanelProps {
  /** Shows the panel (controlled). */
  visible?: boolean;
  /**
   * The container to cover: an element, a ref or a CSS selector.
   * `undefined` (the default) covers the panel's own parent element. A
   * target that is not the parent receives the panel through a portal.
   */
  target?: OgeLoadPanelTarget;
  /**
   * Covers the viewport instead of a container (`position: fixed`). Without
   * an explicit `target` nothing is marked `aria-busy` — on `<body>` it would
   * also mute the document's live regions.
   */
  fullScreen?: boolean;
  /** Text under the indicator; the localized `loadPanelMessage` is the fallback. */
  message?: string;
  /** Renders the load indicator. */
  showIndicator?: boolean;
  /** Draws the raised pane behind the indicator and message. */
  showPane?: boolean;
  /** Dims the covered area behind the pane. */
  shading?: boolean;
  /** Where the pane sits inside the covered area. */
  position?: OgeLoadPanelPosition;
  /**
   * Milliseconds `visible` must stay `true` before the panel appears — a load
   * that finishes sooner never flashes a panel.
   */
  showDelay?: number;
  /** Once shown, the panel stays at least this many milliseconds. */
  minDisplayTime?: number;
  /** Accessible name of the indicator; defaults to the message. */
  ariaLabel?: string;
  /** The panel appeared (after `showDelay`). */
  onShown?: () => void;
  /** The panel disappeared (after `minDisplayTime`). */
  onHidden?: () => void;
  className?: string;
  style?: CSSProperties;
}

const SWALLOWED = [
  'click',
  'dblclick',
  'mousedown',
  'pointerdown',
  'contextmenu',
];

function resolveExplicit(
  target: OgeLoadPanelTarget | undefined,
  anchor: Element | null,
): Element | null {
  if (target === undefined) return null;
  if (typeof target === 'string') {
    return ogeResolveLoadPanelTarget(
      target,
      anchor ?? (typeof document === 'undefined' ? null : document.body),
    );
  }
  if (target instanceof Element) return target;
  return target.current ?? null;
}

/**
 * A loading overlay over a container — the React render of the Angular
 * `<oge-load-panel>` (DevExtreme's LoadPanel): a shade that blocks the
 * pointer, the suite's load indicator and a message, shown while `visible`.
 *
 * It covers its own parent by default, any element / ref / selector given as
 * `target`, or the viewport with `fullScreen`. While shown the covered
 * container is `aria-busy="true"` (its previous value is restored after) and
 * the message is announced once through the shared live announcer. It never
 * takes or traps focus and never makes the container `inert`: pointer input
 * is blocked by the shade, keyboard users are told by `aria-busy`.
 *
 * ```tsx
 * <section style={{ position: 'relative' }}>
 *   <OgeLoadPanel visible={loading} showDelay={200} minDisplayTime={400} />
 *   …
 * </section>
 * ```
 */
export function OgeLoadPanel(props: OgeLoadPanelProps) {
  const {
    visible = false,
    target,
    fullScreen = false,
    showIndicator = true,
    showPane = true,
    shading = true,
    position = 'center',
    showDelay = 0,
    minDisplayTime = 0,
  } = props;
  const config = useOgeLoadIndicatorConfig();
  const announcer = useOgeLiveAnnouncer();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [painted, setPainted] = useState(false);
  const [portal, setPortal] = useState<Element | null>(null);

  const message =
    props.message ??
    config.messages.loadPanelMessage ??
    OGE_DEFAULT_LOAD_INDICATOR_MESSAGES.loadPanelMessage ??
    '';
  const indicatorLabel = props.ariaLabel || message || config.messages.loading;

  const latest = useRef({ props, message, announcer, loading: '' });
  latest.current = {
    props,
    message,
    announcer,
    loading: config.messages.loading,
  };

  const coreRef = useRef<OgeLoadPanelCore | null>(null);
  if (coreRef.current === null) {
    coreRef.current = new OgeLoadPanelCore({
      show: () => {
        setPainted(true);
        const { announcer: live, message: text, loading } = latest.current;
        if (text || loading) live.announce(text || loading);
        latest.current.props.onShown?.();
      },
      hide: () => {
        setPainted(false);
        latest.current.props.onHidden?.();
      },
    });
  }
  const core = coreRef.current;

  // StrictMode-safe lifetime: cleanup destroys, the mount side revives.
  useEffect(() => {
    core.revive();
    return () => core.destroy();
  }, [core]);

  useEffect(() => {
    core.update(visible, { showDelay, minDisplayTime });
  }, [core, visible, showDelay, minDisplayTime]);

  // An explicit target that is not the parent receives the panel by portal.
  useIsomorphicLayoutEffect(() => {
    if (target === undefined || fullScreen) {
      setPortal(null);
      return;
    }
    const resolved = resolveExplicit(target, overlayRef.current);
    setPortal((current) => (current === resolved ? current : resolved));
  }, [target, fullScreen, painted]);

  // aria-busy (and position) bookkeeping while painted.
  useIsomorphicLayoutEffect(() => {
    if (!painted) return;
    const hostEl = overlayRef.current;
    const explicit = resolveExplicit(target, hostEl);
    const resolved = explicit ?? hostEl?.parentElement ?? null;
    const busy = ogeLoadPanelBusyTarget({
      fullScreen,
      explicitTarget: target !== undefined,
      resolved,
    });
    if (!busy) return;
    return ogeAcquireLoadPanelTarget(busy, {
      positioned: !fullScreen && ogeLoadPanelNeedsPositioning(busy),
    });
  }, [painted, portal, target, fullScreen]);

  // Native listeners: the shade must swallow pointer input before it reaches
  // the container's own (native or React) handlers.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const swallow = (event: Event) => {
      if (!el.classList.contains('oge-load-panel-shown')) return;
      event.stopPropagation();
      if (event.type === 'mousedown' || event.type === 'contextmenu') {
        event.preventDefault();
      }
    };
    for (const type of SWALLOWED) el.addEventListener(type, swallow);
    return () => {
      for (const type of SWALLOWED) el.removeEventListener(type, swallow);
    };
  }, [portal]);

  const className = [
    'oge-load-panel',
    painted && 'oge-load-panel-shown',
    fullScreen && 'oge-load-panel-full-screen',
    shading && 'oge-load-panel-shading',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  const overlay = (
    <div
      ref={overlayRef}
      className={className}
      style={props.style}
      data-position={position}
    >
      {painted && (
        <div
          className={[
            'oge-load-panel-pane',
            !showPane && 'oge-load-panel-pane-plain',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {showIndicator && (
            <OgeLoadIndicator size="lg" ariaLabel={indicatorLabel} />
          )}
          {message && (
            // the indicator's name already carries the message
            <span
              className="oge-load-panel-message"
              aria-hidden={showIndicator ? 'true' : undefined}
            >
              {message}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return portal ? createPortal(overlay, portal) : overlay;
}
