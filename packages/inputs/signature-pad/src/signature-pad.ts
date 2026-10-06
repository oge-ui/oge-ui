import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
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
  type OgeReactiveCell,
  type OgeReactivityAdapter,
  type OgeSignatureCanvasContext,
  type OgeSignatureFormat,
  type OgeSignatureMode,
  type OgeSignatureRenderOptions,
  type OgeSignatureSize,
  type OgeSignatureStrokeEvent,
} from '@oge-ui/behavior';
import { OgeControlBase } from '@oge-ui/inputs/field';

/** Angular's reactivity, in the shape the shared machine consumes. */
const SIGNAL_ADAPTER: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

/** Surface size used before the first layout measure (and in SSR exports). */
const FALLBACK_SIZE: OgeSignatureSize = { width: 400, height: 160 };

const DEFAULT_FONT =
  "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', 'Apple Chancery', cursive";

/**
 * Signature capture as a form editor. Draw with a mouse, pen or finger —
 * strokes are smoothed into quadratic curves whose width follows the pen
 * speed — or switch to **Type** (the keyboard alternative) and type a name
 * that is rendered in a script font. The value is a `data:` URL of the
 * signature (`format`: PNG, or SVG that also carries the strokes so a
 * stored value restores an editable pad):
 *
 * ```html
 * <oge-signature-pad label="Customer signature" [(value)]="signature" />
 * <oge-signature-pad format="svg" [height]="120" [formControl]="sign" />
 * ```
 *
 * Undo removes the last stroke (also Ctrl+Z while focus is in the pad),
 * Clear empties it, Escape mid-stroke cancels that stroke. Strokes are
 * stored in surface-relative coordinates, so a resized pad redraws the same
 * signature. Works standalone via `[(value)]`, with Signal Forms via
 * `[formField]`, and with reactive/template forms via
 * `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-signature-pad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-signature-pad',
    '[class.oge-signature-pad-signed]': 'value() !== null',
    '[class.oge-signature-pad-typing]': "mode() === 'type'",
    '[class.oge-signature-pad-readonly]': 'readonly()',
    '[class.oge-signature-pad-invalid]': 'showError()',
    '[style.--oge-signature-pad-height]': 'height() + "px"',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    <div
      #surface
      class="oge-signature-pad-surface"
      role="img"
      [id]="inputId"
      [attr.aria-label]="surfaceLabel()"
      [attr.aria-invalid]="showError() ? 'true' : null"
      [attr.aria-disabled]="effectiveDisabled() ? 'true' : null"
      [attr.title]="tooltip() ?? null"
      (pointerdown)="onPointerDown($event)"
    >
      <canvas
        #canvas
        class="oge-signature-pad-canvas"
        aria-hidden="true"
        [hidden]="mode() === 'type' || imageSrc() !== null"
      ></canvas>
      @if (imageSrc(); as src) {
        <img class="oge-signature-pad-image" alt="" [src]="src" />
      }
      @if (mode() === 'type' && typedText()) {
        <span
          class="oge-signature-pad-typed"
          aria-hidden="true"
          [style.font-family]="fontFamily()"
          >{{ typedText() }}</span
        >
      }
      @if (showPlaceholder()) {
        <span class="oge-signature-pad-placeholder" aria-hidden="true">{{
          placeholderText()
        }}</span>
      }
      <span class="oge-signature-pad-baseline" aria-hidden="true"></span>
    </div>
    @if (mode() === 'type') {
      <label class="oge-signature-pad-type">
        <span class="oge-signature-pad-type-label">{{
          msg().signatureTypeInputLabel
        }}</span>
        <input
          #typeInput
          class="oge-signature-pad-type-input"
          type="text"
          autocomplete="name"
          [value]="typedText()"
          [disabled]="effectiveDisabled()"
          [readOnly]="readonly()"
          [attr.name]="name() || null"
          [attr.aria-invalid]="showError() ? 'true' : null"
          [attr.aria-required]="required() ? 'true' : null"
          [style.font-family]="fontFamily()"
          (input)="onTypedInput($event)"
          (keydown.enter)="handleEnterKey($event)"
        />
      </label>
    }
    <div class="oge-signature-pad-toolbar">
      @if (allowTyping()) {
        <div
          class="oge-signature-pad-modes"
          role="group"
          [attr.aria-label]="msg().signatureModeLabel"
        >
          <button
            type="button"
            class="oge-signature-pad-mode"
            [class.oge-signature-pad-mode-active]="mode() === 'draw'"
            [attr.aria-pressed]="mode() === 'draw'"
            [disabled]="effectiveDisabled()"
            [attr.tabindex]="tabIndex()"
            (click)="setMode('draw', $event)"
          >
            {{ msg().signatureDrawMode }}
          </button>
          <button
            type="button"
            class="oge-signature-pad-mode"
            [class.oge-signature-pad-mode-active]="mode() === 'type'"
            [attr.aria-pressed]="mode() === 'type'"
            [disabled]="effectiveDisabled()"
            [attr.tabindex]="tabIndex()"
            (click)="setMode('type', $event)"
          >
            {{ msg().signatureTypeMode }}
          </button>
        </div>
      }
      <span class="oge-signature-pad-spacer"></span>
      @if (mode() === 'draw') {
        <button
          type="button"
          class="oge-signature-pad-action oge-signature-pad-undo"
          [disabled]="!canUndo()"
          [attr.tabindex]="tabIndex()"
          [attr.aria-label]="msg().signatureUndo"
          [attr.title]="msg().signatureUndo"
          aria-keyshortcuts="Control+Z"
          (click)="undo($event)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
      }
      <button
        type="button"
        class="oge-signature-pad-action oge-signature-pad-clear"
        [disabled]="!canClear()"
        [attr.tabindex]="tabIndex()"
        [attr.aria-label]="msg().signatureClear"
        [attr.title]="msg().signatureClear"
        (click)="clear()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M6 6l1 14h10l1-14" />
        </svg>
      </button>
    </div>
  `,
  styleUrl: './signature-pad.scss',
})
export class OgeSignaturePad
  extends OgeControlBase<string | null>
  implements FormValueControl<string | null>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The signature as a `data:` URL (`null` = not signed) — two-way. */
  readonly value = model<string | null>(null);
  /** Accessible name of the pad; falls back to the `signatureLabel` message. */
  readonly label = input('');
  /** Placeholder on the empty pad; `undefined` = the `signaturePlaceholder` message. */
  readonly placeholder = input<string | undefined>(undefined);
  /** Export format of `value` and of `toDataUrl()` without an argument. */
  readonly format = input<OgeSignatureFormat>('png');
  /** Draw with a pointer or type a name — two-way. */
  readonly mode = model<OgeSignatureMode>('draw');
  /** Shows the Draw / Type switch (the keyboard-accessible alternative). */
  readonly allowTyping = input(true);
  /** Surface height in px (the width follows the host). */
  readonly height = input(160);
  /** Ink colour; `undefined` = the `--oge-signature-ink` token. */
  readonly strokeColor = input<string | undefined>(undefined);
  /** Background baked into the export; `undefined` = transparent. */
  readonly backgroundColor = input<string | undefined>(undefined);
  /** Thinnest stroke width in px (fast pen movement). */
  readonly minWidth = input(1);
  /** Thickest stroke width in px (slow pen movement). */
  readonly maxWidth = input(3);
  /** Font family of a typed signature (on screen and in the export). */
  readonly fontFamily = input(DEFAULT_FONT);

  /** A stroke was completed (pen up). */
  readonly strokeEnded = output<OgeSignatureStrokeEvent>();

  private readonly surface = viewChild<ElementRef<HTMLElement>>('surface');
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly typeInput =
    viewChild<ElementRef<HTMLInputElement>>('typeInput');

  private readonly core = new OgeSignatureCore(SIGNAL_ADAPTER);
  /** An external value that is not the pad's own SVG — shown as an image. */
  private readonly externalImage = signal<string | null>(null);
  private readonly drawing = signal(false);
  private surfaceSize: OgeSignatureSize = FALLBACK_SIZE;
  private lastExported: string | null | undefined = undefined;
  private gesture: OgePointerGestureHandle | null = null;
  private resizeObserver: ResizeObserver | null = null;

  protected readonly typedText = this.core.typedText;
  /** The external image, sanitized (`null` when unsafe or absent). */
  protected readonly imageSrc = computed(() => {
    const src = sanitizeResourceUrl(this.externalImage());
    return src && src !== 'about:blank' ? src : null;
  });
  protected readonly canUndo = computed(
    () =>
      !this.effectiveDisabled() && !this.readonly() && this.core.hasStrokes(),
  );
  protected readonly canClear = computed(
    () =>
      !this.effectiveDisabled() &&
      !this.readonly() &&
      (this.value() !== null ||
        this.core.hasStrokes() ||
        this.core.typedText() !== ''),
  );
  protected readonly placeholderText = computed(
    () => this.placeholder() ?? this.msg().signaturePlaceholder,
  );
  protected readonly showPlaceholder = computed(
    () =>
      this.mode() === 'draw' &&
      !this.drawing() &&
      !this.core.hasStrokes() &&
      this.imageSrc() === null &&
      this.placeholderText() !== '',
  );
  protected readonly surfaceLabel = computed(() => {
    const msg = this.msg();
    return formatPattern(msg.signatureImageLabel, {
      label: this.label() || msg.signatureLabel,
      status:
        this.value() !== null
          ? msg.signatureSignedStatus
          : msg.signatureEmptyStatus,
    });
  });

  constructor() {
    super();
    // An external write (form reset, a stored value) replaces the model:
    // the pad's own SVG restores its strokes, anything else shows as an image.
    effect(() => {
      const value = this.value();
      untracked(() => {
        if (value === this.lastExported) return;
        this.lastExported = value;
        const data = parseOgeSignatureSvg(value);
        if (data) {
          this.core.restore(data);
          this.externalImage.set(null);
          if (data.typedText && this.mode() !== 'type') this.mode.set('type');
        } else {
          this.core.clear();
          this.externalImage.set(value);
        }
        this.redraw();
      });
    });
    // Ink and pen changes repaint.
    effect(() => {
      this.strokeColor();
      this.minWidth();
      this.maxWidth();
      this.core.strokes();
      untracked(() => this.redraw());
    });
    afterNextRender(() => {
      this.measure();
      const surface = this.surface()?.nativeElement;
      if (surface && typeof ResizeObserver === 'function') {
        this.resizeObserver = new ResizeObserver(() => this.measure());
        this.resizeObserver.observe(surface);
      }
    });
    this.destroyRef.onDestroy(() => {
      this.gesture?.cancel();
      this.resizeObserver?.disconnect();
    });
  }

  // --- public API ------------------------------------------------------------

  /** Removes the last stroke and re-exports the value. */
  undo(event?: Event): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (!this.core.undo()) return;
    this.commitExport(event);
  }

  /** Empties the pad (strokes, typed text, external image) and the value. */
  override clear(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.core.clear();
    this.externalImage.set(null);
    this.lastExported = null;
    this.redraw();
    super.clear();
  }

  /** The signature as a `data:` URL in `format` (default: the `format` input); `null` when empty. */
  toDataUrl(format: OgeSignatureFormat = this.format()): string | null {
    if (this.core.isEmpty(this.mode())) return null;
    if (format === 'svg') return ogeSvgDataUrl(this.toSvg() ?? '');
    return this.toPng() ?? ogeSvgDataUrl(this.toSvg() ?? '');
  }

  /** The signature as an SVG document string; `null` when empty. */
  toSvg(): string | null {
    if (this.core.isEmpty(this.mode())) return null;
    return buildOgeSignatureSvg(this.core.strokes(), this.renderOptions());
  }

  /** Switches between drawing and typing, re-exporting the value. */
  setMode(mode: OgeSignatureMode, event?: Event): void {
    if (this.effectiveDisabled() || this.mode() === mode) return;
    this.mode.set(mode);
    if (!this.readonly()) this.commitExport(event);
    if (mode === 'draw') queueMicrotask(() => this.redraw());
    // keyboard users land in the field they just asked for
    else if (event) setTimeout(() => this.typeInput()?.nativeElement.focus());
  }

  // --- handlers --------------------------------------------------------------

  protected onPointerDown(event: PointerEvent): void {
    if (
      this.effectiveDisabled() ||
      this.readonly() ||
      this.mode() !== 'draw' ||
      event.button !== 0
    ) {
      return;
    }
    const surface = this.surface()?.nativeElement;
    if (!surface) return;
    if (this.externalImage() !== null) {
      // drawing replaces a stored image signature
      this.externalImage.set(null);
    }
    const rect = surface.getBoundingClientRect();
    const now = () =>
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.core.beginStroke(
      ogeSignaturePointFrom(event.clientX, event.clientY, rect, now()),
    );
    this.drawing.set(true);
    this.redraw();
    this.gesture = beginPointerGesture(event, {
      threshold: 0,
      longPress: 0,
      source: surface,
      onMove: (_dx, _dy, move) => {
        const box = surface.getBoundingClientRect();
        if (
          this.core.addPoint(
            ogeSignaturePointFrom(move.clientX, move.clientY, box, now()),
          )
        ) {
          this.redraw();
        }
      },
      onFinish: (_commit, cancelled) => {
        this.gesture = null;
        this.drawing.set(false);
        if (cancelled) {
          this.core.cancelStroke();
          this.redraw();
          return;
        }
        const stroke = this.core.endStroke();
        if (!stroke) return;
        this.selfTouched.set(true);
        this.commitExport(event);
        this.strokeEnded.emit({
          stroke,
          strokeCount: this.core.strokes().length,
          event,
        });
      },
    });
  }

  protected onTypedInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.core.typedText.set(text);
    const value = this.exportValue();
    this.lastExported = value;
    this.queueCommit(value, event);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (
      this.mode() === 'draw' &&
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      event.key.toLowerCase() === 'z'
    ) {
      event.preventDefault();
      this.undo(event);
    }
  }

  protected onFocusIn(event: FocusEvent): void {
    if (!this.focusedSig()) this.handleFocus(event);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.hostEl.nativeElement.contains(next)) return;
    this.handleBlur(event);
  }

  // --- rendering -------------------------------------------------------------

  private renderOptions(): OgeSignatureRenderOptions {
    return {
      size: this.surfaceSize,
      minWidth: this.minWidth(),
      maxWidth: this.maxWidth(),
      color: this.inkColor(),
      background: this.backgroundColor() ?? null,
      typedText: this.mode() === 'type' ? this.core.typedText() : '',
      fontFamily: this.fontFamily(),
    };
  }

  private inkColor(): string {
    const explicit = this.strokeColor();
    if (explicit) return explicit;
    const surface = this.surface()?.nativeElement;
    if (surface && typeof getComputedStyle === 'function') {
      const color = getComputedStyle(surface).color;
      if (color) return color;
    }
    return 'currentColor';
  }

  private measure(): void {
    const surface = this.surface()?.nativeElement;
    const canvas = this.canvas()?.nativeElement;
    if (!surface || !canvas) return;
    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.surfaceSize = { width: rect.width, height: rect.height };
    const ratio =
      typeof devicePixelRatio === 'number' && devicePixelRatio > 0
        ? devicePixelRatio
        : 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    this.redraw();
  }

  private context(canvas: HTMLCanvasElement): OgeSignatureCanvasContext | null {
    try {
      return canvas.getContext('2d') as OgeSignatureCanvasContext | null;
    } catch {
      return null;
    }
  }

  private redraw(): void {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) return;
    const ctx = this.context(canvas);
    if (!ctx) return;
    const ratio =
      this.surfaceSize.width > 0 ? canvas.width / this.surfaceSize.width : 1;
    (ctx as unknown as CanvasRenderingContext2D).setTransform?.(
      ratio,
      0,
      0,
      ratio,
      0,
      0,
    );
    const options = {
      ...this.renderOptions(),
      background: null,
      typedText: '',
    };
    renderOgeSignature(ctx, this.core.strokes(), options);
    const active = this.core.activePoints();
    if (active.length > 0) {
      drawOgeSignatureStroke(
        ctx,
        { points: active },
        this.surfaceSize,
        options,
        options.color,
      );
    }
  }

  private toPng(): string | null {
    if (typeof document === 'undefined') return null;
    try {
      const ratio =
        typeof devicePixelRatio === 'number' && devicePixelRatio > 0
          ? devicePixelRatio
          : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(this.surfaceSize.width * ratio);
      canvas.height = Math.round(this.surfaceSize.height * ratio);
      const ctx = this.context(canvas);
      if (!ctx) return null;
      (ctx as unknown as CanvasRenderingContext2D).setTransform?.(
        ratio,
        0,
        0,
        ratio,
        0,
        0,
      );
      renderOgeSignature(ctx, this.core.strokes(), this.renderOptions());
      const url = canvas.toDataURL('image/png');
      return url.startsWith('data:image/png') ? url : null;
    } catch {
      return null;
    }
  }

  private exportValue(): string | null {
    return this.toDataUrl(this.format());
  }

  private commitExport(event?: Event): void {
    const value = this.exportValue();
    this.lastExported = value;
    this.commitNow(value, event);
  }

  // --- base contract ---------------------------------------------------------

  protected nativeElement(): HTMLElement | null {
    if (this.mode() === 'type') {
      const input = this.typeInput()?.nativeElement;
      if (input) return input;
    }
    return this.hostEl.nativeElement.querySelector<HTMLElement>(
      'button:not(:disabled)',
    );
  }

  protected emptyValue(): string | null {
    return null;
  }

  protected valueIsEmpty(value: string | null): boolean {
    return value === null;
  }

  protected override normalizeWrite(value: unknown): string | null {
    return typeof value === 'string' && value !== '' ? value : null;
  }
}
