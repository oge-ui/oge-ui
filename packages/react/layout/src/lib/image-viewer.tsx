'use client';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import {
  OgeImageViewerCore,
  resolveOgeImageViewerConfig,
  type OgeImageViewerItem,
  type OgeImageViewerMessages,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
} from '@oge-ui/behavior';
import { useOgeImageViewerConfig } from './layout-config';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/** Cells that re-render on write; derived values memoized per write. */
function memoAdapter(bump: () => void): OgeReactivityAdapter {
  let version = 0;
  return {
    cell<T>(initial: T): OgeReactiveCell<T> {
      let value = initial;
      const cell = (() => value) as OgeReactiveCell<T>;
      cell.set = (next) => {
        if (Object.is(value, next)) return;
        value = next;
        version += 1;
        bump();
      };
      return cell;
    },
    derived<T>(compute: () => T): () => T {
      let seen = -1;
      let cached: T;
      return () => {
        if (seen !== version) {
          cached = compute();
          seen = version;
        }
        return cached;
      };
    },
  };
}

/** What a `ref` on {@link OgeImageViewer} reaches. */
export interface OgeImageViewerHandle {
  next(): void;
  previous(): void;
  /** Back to fit: zoom 1, no pan, no rotation. */
  resetView(): void;
}

/** Props of {@link OgeImageViewer}. */
export interface OgeImageViewerProps {
  /** The gallery. */
  images: readonly OgeImageViewerItem[];
  /** The shown image. Controlled with `onIndexChange`. */
  index?: number;
  onIndexChange?: (index: number) => void;
  /** After the zoom changed (1 = fit). */
  onZoomChange?: (zoom: number) => void;
  /** Go from the last image to the first and back. */
  loop?: boolean;
  /** Largest zoom (default 8 = 800 %). */
  maxZoom?: number;
  /** The thumbnail strip (shown for two images or more). Default `true`. */
  thumbnails?: boolean;
  /** The toolbar. Default `true`. */
  toolbar?: boolean;
  /** Overrides of the message catalog. */
  messages?: Partial<OgeImageViewerMessages>;
  className?: string;
  style?: CSSProperties;
}

const Icon = ({ d, fill }: { d: string; fill?: boolean }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path
      d={d}
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const FULL = 'M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10';

/**
 * An image viewer: a gallery with zoom (buttons, wheel, double click,
 * pinch), pan (drag, or the arrow keys while zoomed), quarter-turn rotation,
 * thumbnails and full screen.
 */
export const OgeImageViewer = forwardRef<
  OgeImageViewerHandle,
  OgeImageViewerProps
>(function OgeImageViewerRender(props, ref): ReactElement {
  const {
    images,
    index,
    loop,
    maxZoom,
    thumbnails = true,
    toolbar = true,
    messages,
    className,
    style,
  } = props;
  const config = useOgeImageViewerConfig();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const latest = useRef(props);
  latest.current = props;
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef(0);

  const coreRef = useRef<OgeImageViewerCore | null>(null);
  if (coreRef.current === null) {
    coreRef.current = new OgeImageViewerCore({
      reactivity: memoAdapter(() => rerender()),
      messages: config.messages,
      onIndexChange: (i) => latest.current.onIndexChange?.(i),
      onZoomChange: (z) => latest.current.onZoomChange?.(z),
      requestFullscreen: (on) => {
        const element = root.current;
        const doc = element?.ownerDocument;
        if (on)
          void element
            ?.requestFullscreen?.()
            .catch(() => coreRef.current?.setFullscreen(true));
        else if (doc?.fullscreenElement) void doc.exitFullscreen?.();
        else coreRef.current?.setFullscreen(false);
      },
    });
  }
  const core = coreRef.current;

  useImperativeHandle(
    ref,
    () => ({
      next: () => core.next(),
      previous: () => core.previous(),
      resetView: () => core.resetView(),
    }),
    [core],
  );

  useEffect(() => core.setItems(images), [core, images]);
  useEffect(() => {
    if (index !== undefined && index !== core.index()) core.go(index);
  }, [core, index]);
  useEffect(() => {
    core.setConfig(
      resolveOgeImageViewerConfig(
        {
          ...(messages ? { messages } : {}),
          ...(loop !== undefined ? { loop } : {}),
          ...(maxZoom !== undefined ? { maxZoom } : {}),
        },
        config,
      ),
    );
  }, [core, config, messages, loop, maxZoom]);

  useIsomorphicLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () =>
      core.setStage(element.clientWidth, element.clientHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [core]);

  useEffect(() => {
    const doc = root.current?.ownerDocument;
    if (!doc) return;
    const onChange = () =>
      core.setFullscreen(doc.fullscreenElement === root.current);
    doc.addEventListener('fullscreenchange', onChange);
    return () => doc.removeEventListener('fullscreenchange', onChange);
  }, [core]);

  const point = (event: { clientX: number; clientY: number }) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: event.clientX - box.left - box.width / 2,
      y: event.clientY - box.top - box.height / 2,
    };
  };

  // wheel needs a non-passive listener to stop the page from scrolling
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      core.wheel(event.deltaY, point(event));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [core]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
      core.pointerUp();
      return;
    }
    if (core.pointerDown(event.clientX, event.clientY)) {
      (event.target as Element).setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }
    if (pointers.current.size === 2 && pinchDistance.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      core.pinch(
        distance / pinchDistance.current,
        point({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }),
      );
      pinchDistance.current = distance;
      return;
    }
    core.pointerMove(event.clientX, event.clientY);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = 0;
    core.pointerUp();
  };

  const text = core.messages();
  const current = core.current();
  const button = (
    cls: string,
    label: string,
    onClick: () => void,
    d: string,
    extra: { disabled?: boolean; pressed?: boolean } = {},
  ) => (
    <button
      type="button"
      className={`oge-image-viewer-button ${cls}`}
      disabled={extra.disabled}
      aria-pressed={extra.pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon d={d} />
    </button>
  );

  return (
    <div
      ref={root}
      className={[
        'oge-image-viewer',
        core.fullscreen() && 'oge-image-viewer-fullscreen',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      role="group"
      aria-roledescription="image viewer"
      tabIndex={0}
      aria-label={text.label}
      onKeyDown={(event) => core.keydown(event)}
    >
      {toolbar && (
        <div
          className="oge-image-viewer-toolbar"
          role="toolbar"
          aria-label={text.label}
        >
          <span className="oge-image-viewer-group">
            {button(
              'oge-image-viewer-prev',
              text.previous,
              () => core.previous(),
              'M10 3 5 8l5 5',
              { disabled: !core.canGoBack() },
            )}
            <span className="oge-image-viewer-readout">
              {core.counterText()}
            </span>
            {button(
              'oge-image-viewer-next',
              text.next,
              () => core.next(),
              'm6 3 5 5-5 5',
              { disabled: !core.canGoForward() },
            )}
          </span>
          <span className="oge-image-viewer-group">
            {button(
              'oge-image-viewer-zoom-out',
              text.zoomOut,
              () => core.zoomOut(),
              'M3.5 8h9',
              { disabled: !core.canZoomOut() },
            )}
            <span className="oge-image-viewer-readout oge-image-viewer-zoom">
              {core.zoomText()}
            </span>
            {button(
              'oge-image-viewer-zoom-in',
              text.zoomIn,
              () => core.zoomIn(),
              'M3.5 8h9M8 3.5v9',
              { disabled: !core.canZoomIn() },
            )}
            {button(
              'oge-image-viewer-reset',
              text.resetZoom,
              () => core.resetView(),
              FULL,
              { disabled: !core.zoomed() && !core.rotation() },
            )}
          </span>
          <span className="oge-image-viewer-group">
            {button(
              'oge-image-viewer-rotate-left',
              text.rotateLeft,
              () => core.rotate(-1),
              'M3 7a5 5 0 1 1 1.5 4M3 3v4h4',
            )}
            {button(
              'oge-image-viewer-rotate-right',
              text.rotateRight,
              () => core.rotate(1),
              'M13 7a5 5 0 1 0-1.5 4M13 3v4H9',
            )}
          </span>
          <span className="oge-image-viewer-spacer" />
          {button(
            'oge-image-viewer-fullscreen-toggle',
            core.fullscreen() ? text.exitFullscreen : text.fullscreen,
            () => core.toggleFullscreen(),
            FULL,
            { pressed: core.fullscreen() },
          )}
        </div>
      )}
      <div
        ref={stage}
        className={
          core.zoomed()
            ? 'oge-image-viewer-stage oge-image-viewer-zoomed'
            : 'oge-image-viewer-stage'
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(event) => core.toggleZoom(point(event))}
      >
        {current ? (
          <img
            className="oge-image-viewer-image"
            draggable={false}
            src={current.src}
            alt={current.alt}
            style={{ transform: core.transform() }}
          />
        ) : (
          <p className="oge-image-viewer-empty">{text.empty}</p>
        )}
      </div>
      {current?.caption && (
        <p className="oge-image-viewer-caption">{current.caption}</p>
      )}
      {thumbnails && core.items().length > 1 && (
        <div
          className="oge-image-viewer-thumbnails"
          role="group"
          aria-label={text.thumbnails}
        >
          {core.items().map((image, i) => (
            <button
              key={i}
              type="button"
              className="oge-image-viewer-thumbnail"
              aria-current={i === core.index() ? 'true' : undefined}
              aria-label={image.alt}
              onClick={() => core.go(i)}
            >
              <img
                src={image.thumbnail ?? image.src}
                alt=""
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
      <span
        className="oge-image-viewer-sr-only"
        role="status"
        aria-live="polite"
      >
        {core.announcement()}
      </span>
    </div>
  );
});
