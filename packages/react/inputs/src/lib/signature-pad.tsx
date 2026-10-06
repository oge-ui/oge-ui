'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  OgeSignatureCore,
  beginPointerGesture,
  buildOgeSignatureSvg,
  drawOgeSignatureStroke,
  formatPattern,
  ogeSignaturePointFrom,
  ogeSvgDataUrl,
  parseOgeSignatureSvg,
  renderOgeSignature,
  sanitizeResourceUrl,
  type OgePointerGestureHandle,
  type OgeSignatureCanvasContext,
  type OgeSignatureFormat,
  type OgeSignatureMode,
  type OgeSignatureRenderOptions,
  type OgeSignatureSize,
  type OgeSignatureStrokeEvent,
} from '@oge-ui/behavior';
import { createBumpAdapter } from './rx-adapter';
import { useOgeField, type OgeControlProps } from './use-field';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Surface size used before the first layout measure. */
const FALLBACK_SIZE: OgeSignatureSize = { width: 400, height: 160 };

const DEFAULT_FONT =
  "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', 'Apple Chancery', cursive";

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

const pixelRatio = (): number =>
  typeof devicePixelRatio === 'number' && devicePixelRatio > 0
    ? devicePixelRatio
    : 1;

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeSignaturePadHandle {
  focus(): void;
  blur(): void;
  /** Empties the pad (strokes, typed text, external image) and the value. */
  clear(): void;
  /** Removes the last stroke and re-exports the value. */
  undo(): void;
  /** The signature as a `data:` URL in `format` (default: the `format` prop); `null` when empty. */
  toDataUrl(format?: OgeSignatureFormat): string | null;
  /** The signature as an SVG document string; `null` when empty. */
  toSvg(): string | null;
  /** No signature (`value === null`). */
  isEmpty(): boolean;
  /** Switches between drawing and typing, re-exporting the value. */
  setMode(mode: OgeSignatureMode): void;
}

export interface OgeSignaturePadProps extends OgeControlProps<string | null> {
  /** Accessible name of the pad; falls back to the `signatureLabel` message. */
  label?: string;
  /** Placeholder on the empty pad; `undefined` = the `signaturePlaceholder` message. */
  placeholder?: string;
  /** Export format of `value` and of `toDataUrl()` without an argument. */
  format?: OgeSignatureFormat;
  /** Draw with a pointer or type a name — controlled when provided. */
  mode?: OgeSignatureMode;
  /** Uncontrolled initial mode. */
  defaultMode?: OgeSignatureMode;
  /** The controlled half of `mode`. */
  onModeChange?: (mode: OgeSignatureMode) => void;
  /** Shows the Draw / Type switch (the keyboard-accessible alternative). */
  allowTyping?: boolean;
  /** Surface height in px (the width follows the host). */
  height?: number;
  /** Ink colour; `undefined` = the `--oge-signature-ink` token. */
  strokeColor?: string;
  /** Background baked into the export; `undefined` = transparent. */
  backgroundColor?: string;
  /** Thinnest stroke width in px (fast pen movement). */
  minWidth?: number;
  /** Thickest stroke width in px (slow pen movement). */
  maxWidth?: number;
  /** Font family of a typed signature (on screen and in the export). */
  fontFamily?: string;
  /** A stroke was completed (pen up). */
  onStrokeEnded?: (event: OgeSignatureStrokeEvent) => void;
  className?: string;
  style?: CSSProperties;
}

function context2d(
  canvas: HTMLCanvasElement,
): OgeSignatureCanvasContext | null {
  try {
    return canvas.getContext('2d') as OgeSignatureCanvasContext | null;
  } catch {
    return null;
  }
}

function scale(ctx: OgeSignatureCanvasContext, ratio: number): void {
  (ctx as unknown as CanvasRenderingContext2D).setTransform?.(
    ratio,
    0,
    0,
    ratio,
    0,
    0,
  );
}

/**
 * Signature capture as a form editor — the React render of the Angular
 * `<oge-signature-pad>`. Draw with a mouse, pen or finger (smoothed,
 * speed-weighted strokes) or switch to **Type** — the keyboard alternative —
 * and type a name rendered in a script font. The value is a `data:` URL
 * (`format`: PNG, or SVG that also carries the strokes so a stored value
 * restores an editable pad). Undo (also Ctrl+Z), Clear, Escape mid-stroke
 * cancels it; strokes are surface-relative, so a resized pad redraws.
 *
 * ```tsx
 * <OgeSignaturePad label="Customer signature" value={sig} onValueChange={setSig} />
 * ```
 */
export const OgeSignaturePad = forwardRef<
  OgeSignaturePadHandle,
  OgeSignaturePadProps
>(function OgeSignaturePadRender(props, ref) {
  const {
    label = '',
    placeholder,
    allowTyping = true,
    height = 160,
    strokeColor,
    minWidth = 1,
    maxWidth = 3,
    fontFamily = DEFAULT_FONT,
    className,
    style,
  } = props;

  const hostRef = useRef<HTMLSpanElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);

  const field = useOgeField<string | null>({
    props,
    emptyValue: null,
    isEmpty: (value) => value === null,
    focusNative: () => focusTarget()?.focus(),
  });
  const readonly = props.readonly ?? false;
  const disabled = field.effectiveDisabled;

  const [, bump] = useReducer((n: number) => n + 1, 0);
  const coreRef = useRef<OgeSignatureCore>(undefined);
  coreRef.current ??= new OgeSignatureCore(createBumpAdapter(bump));
  const core = coreRef.current;

  const [uncontrolledMode, setUncontrolledMode] = useState<OgeSignatureMode>(
    props.defaultMode ?? 'draw',
  );
  const mode = props.mode ?? uncontrolledMode;
  const [externalImage, setExternalImage] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [touched, setTouched] = useState(false);

  const sizeRef = useRef<OgeSignatureSize>(FALLBACK_SIZE);
  const lastExported = useRef<string | null | undefined>(undefined);
  const gestureRef = useRef<OgePointerGestureHandle | null>(null);

  const latest = useRef({ props, mode, field });
  latest.current = { props, mode, field };

  // --- rendering -------------------------------------------------------------

  const inkColor = (): string => {
    const explicit = latest.current.props.strokeColor;
    if (explicit) return explicit;
    const surface = surfaceRef.current;
    if (surface && typeof getComputedStyle === 'function') {
      const color = getComputedStyle(surface).color;
      if (color) return color;
    }
    return 'currentColor';
  };

  const renderOptions = (
    forMode: OgeSignatureMode = latest.current.mode,
  ): OgeSignatureRenderOptions => {
    const p = latest.current.props;
    return {
      size: sizeRef.current,
      minWidth: p.minWidth ?? 1,
      maxWidth: p.maxWidth ?? 3,
      color: inkColor(),
      background: p.backgroundColor ?? null,
      typedText: forMode === 'type' ? core.typedText() : '',
      fontFamily: p.fontFamily ?? DEFAULT_FONT,
    };
  };

  const redraw = (): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = context2d(canvas);
    if (!ctx) return;
    const size = sizeRef.current;
    scale(ctx, size.width > 0 ? canvas.width / size.width : 1);
    const options = { ...renderOptions(), background: null, typedText: '' };
    renderOgeSignature(ctx, core.strokes(), options);
    const active = core.activePoints();
    if (active.length > 0) {
      drawOgeSignatureStroke(
        ctx,
        { points: active },
        size,
        options,
        options.color,
      );
    }
  };

  const toSvg = (forMode: OgeSignatureMode = latest.current.mode) =>
    core.isEmpty(forMode)
      ? null
      : buildOgeSignatureSvg(core.strokes(), renderOptions(forMode));

  const toPng = (forMode: OgeSignatureMode): string | null => {
    if (typeof document === 'undefined') return null;
    try {
      const ratio = pixelRatio();
      const size = sizeRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(size.width * ratio);
      canvas.height = Math.round(size.height * ratio);
      const ctx = context2d(canvas);
      if (!ctx) return null;
      scale(ctx, ratio);
      renderOgeSignature(ctx, core.strokes(), renderOptions(forMode));
      const url = canvas.toDataURL('image/png');
      return url.startsWith('data:image/png') ? url : null;
    } catch {
      return null;
    }
  };

  const toDataUrl = (
    fmt: OgeSignatureFormat = latest.current.props.format ?? 'png',
    forMode: OgeSignatureMode = latest.current.mode,
  ): string | null => {
    if (core.isEmpty(forMode)) return null;
    if (fmt === 'svg') return ogeSvgDataUrl(toSvg(forMode) ?? '');
    return toPng(forMode) ?? ogeSvgDataUrl(toSvg(forMode) ?? '');
  };

  const commitExport = (
    event?: Event,
    forMode: OgeSignatureMode = latest.current.mode,
  ): void => {
    const value = toDataUrl(undefined, forMode);
    lastExported.current = value;
    latest.current.field.commit.commitNow(value, event);
  };

  // An external write (form reset, a stored value) replaces the model: the
  // pad's own SVG restores its strokes, anything else shows as an image.
  useIsomorphicLayoutEffect(() => {
    const value = field.value;
    if (value === lastExported.current) return;
    lastExported.current = value;
    const data = parseOgeSignatureSvg(value);
    if (data) {
      core.restore(data);
      setExternalImage(null);
      if (data.typedText && latest.current.mode !== 'type') setMode('type');
    } else {
      core.clear();
      setExternalImage(value);
    }
  }, [field.value]);

  // Repaint whenever what is drawn can have changed.
  const strokes = core.strokes();
  useIsomorphicLayoutEffect(() => {
    redraw();
  }, [strokes, strokeColor, minWidth, maxWidth, mode, externalImage]);

  // Measure + resize-safe redraw.
  useIsomorphicLayoutEffect(() => {
    const surface = surfaceRef.current;
    const canvas = canvasRef.current;
    if (!surface || !canvas) return;
    const measure = (): void => {
      const rect = surface.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      sizeRef.current = { width: rect.width, height: rect.height };
      const ratio = pixelRatio();
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      redraw();
    };
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => gestureRef.current?.cancel(), []);

  // --- commands --------------------------------------------------------------

  const setMode = (next: OgeSignatureMode, event?: Event): void => {
    const { props: p, mode: current, field: f } = latest.current;
    if (f.effectiveDisabled || current === next) return;
    if (p.mode === undefined) setUncontrolledMode(next);
    p.onModeChange?.(next);
    latest.current = { ...latest.current, mode: next };
    if (!(p.readonly ?? false)) commitExport(event, next);
    // keyboard users land in the field they just asked for
    if (next === 'type' && event) {
      setTimeout(() => typeInputRef.current?.focus());
    }
  };

  const undo = (event?: Event): void => {
    const { props: p, field: f } = latest.current;
    if (f.effectiveDisabled || (p.readonly ?? false)) return;
    if (!core.undo()) return;
    commitExport(event);
  };

  const clear = (): void => {
    const { props: p, field: f } = latest.current;
    if (f.effectiveDisabled || (p.readonly ?? false)) return;
    core.clear();
    setExternalImage(null);
    lastExported.current = null;
    f.clear();
  };

  function focusTarget(): HTMLElement | null {
    if (latest.current.mode === 'type' && typeInputRef.current) {
      return typeInputRef.current;
    }
    return (
      hostRef.current?.querySelector<HTMLElement>('button:not(:disabled)') ??
      null
    );
  }

  useImperativeHandle(ref, () => ({
    focus: () => focusTarget()?.focus(),
    blur: () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && hostRef.current?.contains(active)) active.blur();
    },
    clear,
    undo: () => undo(),
    toDataUrl: (fmt) => toDataUrl(fmt),
    toSvg: () => toSvg(),
    isEmpty: () => latest.current.field.value === null,
    setMode: (next) => setMode(next),
  }));

  // --- handlers --------------------------------------------------------------

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (disabled || readonly || mode !== 'draw' || event.button !== 0) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    if (externalImage !== null) setExternalImage(null);
    const native = event.nativeEvent;
    core.beginStroke(
      ogeSignaturePointFrom(
        event.clientX,
        event.clientY,
        surface.getBoundingClientRect(),
        now(),
      ),
    );
    setDrawing(true);
    redraw();
    gestureRef.current = beginPointerGesture(event, {
      threshold: 0,
      longPress: 0,
      source: surface,
      onMove: (_dx, _dy, move) => {
        if (
          core.addPoint(
            ogeSignaturePointFrom(
              move.clientX,
              move.clientY,
              surface.getBoundingClientRect(),
              now(),
            ),
          )
        ) {
          redraw();
        }
      },
      onFinish: (_commit, cancelled) => {
        gestureRef.current = null;
        setDrawing(false);
        if (cancelled) {
          core.cancelStroke();
          redraw();
          return;
        }
        const stroke = core.endStroke();
        if (!stroke) return;
        setTouched(true);
        commitExport(native);
        latest.current.props.onStrokeEnded?.({
          stroke,
          strokeCount: core.strokes().length,
          event: native,
        });
      },
    });
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (
      mode === 'draw' &&
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      event.key.toLowerCase() === 'z'
    ) {
      event.preventDefault();
      undo(event.nativeEvent);
    }
  };

  const focusedRef = useRef(false);
  const onFocus = (event: ReactFocusEvent): void => {
    if (focusedRef.current) return;
    focusedRef.current = true;
    field.handleFocus(event);
  };
  const onBlur = (event: ReactFocusEvent): void => {
    const next = event.relatedTarget as Node | null;
    if (next && hostRef.current?.contains(next)) return;
    focusedRef.current = false;
    field.handleBlur(event);
  };

  // --- derived view state ----------------------------------------------------

  const msg = field.msg;
  const typedText = core.typedText();
  const hasStrokes = core.hasStrokes();
  const imageSrc = (() => {
    const src = sanitizeResourceUrl(externalImage);
    return src && src !== 'about:blank' ? src : null;
  })();
  const placeholderText = placeholder ?? msg.signaturePlaceholder;
  const showPlaceholder =
    mode === 'draw' &&
    !drawing &&
    !hasStrokes &&
    imageSrc === null &&
    placeholderText !== '';
  const canUndo = !disabled && !readonly && hasStrokes;
  const canClear =
    !disabled &&
    !readonly &&
    (field.value !== null || hasStrokes || typedText !== '');
  const surfaceLabel = formatPattern(msg.signatureImageLabel, {
    label: label || msg.signatureLabel,
    status:
      field.value !== null
        ? msg.signatureSignedStatus
        : msg.signatureEmptyStatus,
  });
  // a stroke marks the pad touched, like a blur does
  const showError =
    field.showError ||
    (touched &&
      field.effectiveInvalid &&
      (props.errorDisplay ?? 'touched') === 'touched');

  const hostClasses = [
    'oge-signature-pad',
    field.value !== null && 'oge-signature-pad-signed',
    mode === 'type' && 'oge-signature-pad-typing',
    readonly && 'oge-signature-pad-readonly',
    showError && 'oge-signature-pad-invalid',
    disabled && 'oge-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const tabIndex = props.tabIndex ?? 0;

  return (
    <span
      ref={hostRef}
      className={hostClasses}
      style={
        {
          ...style,
          '--oge-signature-pad-height': `${height}px`,
        } as CSSProperties
      }
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      <div
        ref={surfaceRef}
        className="oge-signature-pad-surface"
        role="img"
        id={field.ids.inputId}
        aria-label={surfaceLabel}
        aria-invalid={showError ? true : undefined}
        aria-disabled={disabled ? true : undefined}
        title={props.tooltip}
        onPointerDown={onPointerDown}
      >
        <canvas
          ref={canvasRef}
          className="oge-signature-pad-canvas"
          aria-hidden="true"
          hidden={mode === 'type' || imageSrc !== null}
        />
        {imageSrc !== null && (
          <img className="oge-signature-pad-image" alt="" src={imageSrc} />
        )}
        {mode === 'type' && typedText && (
          <span
            className="oge-signature-pad-typed"
            aria-hidden="true"
            style={{ fontFamily }}
          >
            {typedText}
          </span>
        )}
        {showPlaceholder && (
          <span className="oge-signature-pad-placeholder" aria-hidden="true">
            {placeholderText}
          </span>
        )}
        <span className="oge-signature-pad-baseline" aria-hidden="true" />
      </div>
      {mode === 'type' && (
        <label className="oge-signature-pad-type">
          <span className="oge-signature-pad-type-label">
            {msg.signatureTypeInputLabel}
          </span>
          <input
            ref={typeInputRef}
            className="oge-signature-pad-type-input"
            type="text"
            autoComplete="name"
            value={typedText}
            disabled={disabled}
            readOnly={readonly}
            name={props.name || undefined}
            aria-invalid={showError ? true : undefined}
            aria-required={props.required ? true : undefined}
            style={{ fontFamily }}
            onChange={(event) => {
              core.typedText.set(event.target.value);
              const value = toDataUrl();
              lastExported.current = value;
              field.commit.queue(value, event.nativeEvent);
            }}
            onKeyDown={field.handleEnterKey}
          />
        </label>
      )}
      <div className="oge-signature-pad-toolbar">
        {allowTyping && (
          <div
            className="oge-signature-pad-modes"
            role="group"
            aria-label={msg.signatureModeLabel}
          >
            {(['draw', 'type'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={[
                  'oge-signature-pad-mode',
                  mode === option && 'oge-signature-pad-mode-active',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={mode === option}
                disabled={disabled}
                tabIndex={tabIndex}
                onClick={(event) => setMode(option, event.nativeEvent)}
              >
                {option === 'draw'
                  ? msg.signatureDrawMode
                  : msg.signatureTypeMode}
              </button>
            ))}
          </div>
        )}
        <span className="oge-signature-pad-spacer" />
        {mode === 'draw' && (
          <button
            type="button"
            className="oge-signature-pad-action oge-signature-pad-undo"
            disabled={!canUndo}
            tabIndex={tabIndex}
            aria-label={msg.signatureUndo}
            title={msg.signatureUndo}
            aria-keyshortcuts="Control+Z"
            onClick={(event) => undo(event.nativeEvent)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="oge-signature-pad-action oge-signature-pad-clear"
          disabled={!canClear}
          tabIndex={tabIndex}
          aria-label={msg.signatureClear}
          title={msg.signatureClear}
          onClick={clear}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M6 6l1 14h10l1-14" />
          </svg>
        </button>
      </div>
    </span>
  );
});
