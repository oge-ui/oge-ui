'use client';
import {
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  type CSSProperties,
  type ReactElement,
} from 'react';
import {
  OgePresentationCore,
  ogeCheckSpreadsheetLicense,
  type OgePresentationLoadErrorEvent,
  type OgePresentationLoadedEvent,
  type OgePresentationMessages,
  type OgePresentationSource,
  type OgeSlideRender,
} from '@oge-ui/spreadsheet-engine/powerpoint';
import { useOgePresentationConfig } from './presentation-config';
import { createSpreadsheetRxAdapter } from './rx-adapter';

/** Props of {@link OgePresentation}. */
export interface OgePresentationProps {
  /** The file: bytes, a `Blob`, or a URL to fetch. */
  source?: OgePresentationSource | null;
  /** 0-based current slide. Controlled when given with `onSlideIndexChange`. */
  slideIndex?: number;
  /** Fires when the slide changes. */
  onSlideIndexChange?: (index: number) => void;
  /** Shows the slide rail. Default `true`. */
  thumbnails?: boolean;
  /** Overrides of the message catalog. */
  messages?: Partial<OgePresentationMessages>;
  /** After a presentation opened, with what could not be shown. */
  onLoaded?: (event: OgePresentationLoadedEvent) => void;
  /** When a presentation did not open. */
  onLoadError?: (event: OgePresentationLoadErrorEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** Draws one slide; the engine's drawing, bound element for element. */
export function OgeSlideCanvas({
  render,
  mediaUrl,
}: {
  render: OgeSlideRender;
  mediaUrl: (key: string) => string | null;
}): ReactElement {
  return (
    <svg
      className="oge-presentation-canvas"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`0 0 ${render.width} ${render.height}`}
    >
      <defs>
        {render.gradients.map((gradient) => (
          <linearGradient
            colorInterpolation="linearRGB"
            key={gradient.id}
            id={gradient.id}
            gradientTransform={gradient.transform}
          >
            {gradient.stops.map((stop, i) => (
              <stop
                key={i}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </linearGradient>
        ))}
        {render.patterns.map((pattern) => (
          <pattern
            key={pattern.id}
            id={pattern.id}
            patternUnits="userSpaceOnUse"
            width={pattern.size}
            height={pattern.size}
          >
            <rect
              width={pattern.size}
              height={pattern.size}
              fill={pattern.background}
              fillOpacity={pattern.backgroundOpacity}
            />
            <path
              d={pattern.d}
              fill={pattern.foreground}
              fillOpacity={pattern.foregroundOpacity}
            />
          </pattern>
        ))}
      </defs>
      {render.nodes.map((node, i) => {
        if (node.kind === 'path') {
          return (
            <path
              key={i}
              d={node.d}
              transform={node.transform || undefined}
              fill={node.fill?.paint ?? 'none'}
              fillOpacity={node.fill?.opacity}
              stroke={node.stroke?.paint ?? 'none'}
              strokeOpacity={node.stroke?.opacity}
              strokeWidth={node.strokeWidth}
              strokeDasharray={node.dash ?? undefined}
              strokeLinecap={node.cap}
              style={node.filter ? { filter: node.filter } : undefined}
            />
          );
        }
        if (node.kind === 'image') {
          return (
            <svg
              key={i}
              preserveAspectRatio="none"
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              viewBox={node.viewBox}
              transform={node.transform || undefined}
            >
              <image
                width={1}
                height={1}
                preserveAspectRatio="none"
                href={mediaUrl(node.media) ?? undefined}
                aria-label={node.label || undefined}
              />
            </svg>
          );
        }
        const text = (
          <text
            key={i}
            textAnchor={node.anchor}
            x={node.x}
            y={node.y}
            transform={node.transform || undefined}
            fontFamily={node.fontFamily}
            fontSize={node.fontSize}
            fontWeight={node.fontWeight}
            fontStyle={node.fontStyle}
            fill={node.fill.paint}
            fillOpacity={node.fill.opacity}
            textDecoration={node.decoration ?? undefined}
          >
            {node.text}
          </text>
        );
        return node.link ? (
          <a key={i} href={node.link} target="_blank" rel="noopener noreferrer">
            {text}
          </a>
        ) : (
          text
        );
      })}
    </svg>
  );
}

/**
 * Shows a `.pptx` presentation the way PowerPoint does, with a slide rail and
 * keyboard navigation. Read-only; macros and embedded objects never run and
 * external targets are never fetched (ADR 0006).
 */
export function OgePresentation(props: OgePresentationProps): ReactElement {
  const {
    source = null,
    slideIndex,
    thumbnails = true,
    messages,
    className,
    style,
  } = props;
  const config = useOgePresentationConfig();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const id = useId();
  const latest = useRef(props);
  latest.current = props;

  const coreRef = useRef<OgePresentationCore | null>(null);
  if (coreRef.current === null) {
    coreRef.current = new OgePresentationCore({
      reactivity: createSpreadsheetRxAdapter(() => rerender()),
      messages: config.messages,
      idPrefix: `oge-presentation-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
      onLoaded: (event) => latest.current.onLoaded?.(event),
      onLoadError: (event) => latest.current.onLoadError?.(event),
      onSlideChange: (index) => latest.current.onSlideIndexChange?.(index),
    });
  }
  const core = coreRef.current;

  useEffect(() => {
    ogeCheckSpreadsheetLicense();
  }, []);

  useEffect(() => {
    void core.load(source);
  }, [core, source]);

  const slideCount = core.slideCount();
  useEffect(() => {
    if (slideIndex !== undefined) core.go(slideIndex);
  }, [core, slideIndex, slideCount]);

  useEffect(() => {
    core.setMessages({ ...config.messages, ...messages });
  }, [core, config, messages]);

  // StrictMode unmounts and remounts: only release what a real unmount leaves
  useEffect(() => () => core.destroy(), [core]);

  const mediaUrl = useMemo(
    () =>
      (key: string): string | null =>
        core.mediaUrl(key),
    [core],
  );
  const text = core.messages();
  const status = core.status();
  const current = core.current();

  return (
    <div
      className={['oge-presentation', className].filter(Boolean).join(' ')}
      style={style}
      role="group"
      tabIndex={0}
      aria-label={text.viewerLabel}
      onKeyDown={(event) => core.keydown(event)}
    >
      {status === 'ready' ? (
        <>
          {thumbnails && (
            <ol className="oge-presentation-rail" aria-label={text.thumbnails}>
              {Array.from({ length: slideCount }, (_, i) => {
                const drawing = core.renderOf(i);
                const isCurrent = i === core.index();
                return (
                  <li key={i}>
                    <button
                      type="button"
                      className={
                        'oge-presentation-thumb' +
                        (isCurrent ? ' oge-presentation-thumb-current' : '')
                      }
                      aria-current={isCurrent ? 'true' : undefined}
                      aria-label={core.labelOf(i)}
                      onClick={() => core.go(i)}
                    >
                      <span
                        className="oge-presentation-thumb-number"
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      {drawing && (
                        <span
                          aria-hidden="true"
                          style={{ display: 'contents' }}
                        >
                          <OgeSlideCanvas
                            render={drawing}
                            mediaUrl={mediaUrl}
                          />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="oge-presentation-main">
            <div
              className="oge-presentation-stage"
              role="group"
              aria-roledescription="slide"
              aria-label={core.currentLabel()}
            >
              {current && (
                <OgeSlideCanvas render={current} mediaUrl={mediaUrl} />
              )}
            </div>
            <div className="oge-presentation-bar">
              <button
                type="button"
                className="oge-presentation-nav"
                disabled={!core.canGoBack()}
                aria-label={text.previousSlide}
                title={text.previousSlide}
                onClick={() => core.previous()}
              >
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path
                    d="M10 3L5 8l5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <span className="oge-presentation-position" aria-live="polite">
                {core.currentLabel()}
              </span>
              <button
                type="button"
                className="oge-presentation-nav"
                disabled={!core.canGoForward()}
                aria-label={text.nextSlide}
                title={text.nextSlide}
                onClick={() => core.next()}
              >
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path
                    d="M6 3l5 5-5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="oge-presentation-status" role="status">
          {status === 'loading'
            ? text.loading
            : status === 'error'
              ? core.errorText()
              : text.empty}
        </div>
      )}
    </div>
  );
}
