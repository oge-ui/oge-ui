import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ratioToValue } from '@oge-ui/core';

/** A 2D saturation/brightness change from the gradient surface. */
export interface OgeColorSurfaceChange {
  s: number;
  v: number;
  event: Event;
}

/**
 * Internal 2D saturation/brightness surface of the color panel. The APG has
 * no 2-axis slider pattern, so this is a `role="slider"` composition: the
 * thumb carries `aria-roledescription`, brightness as `aria-valuenow` and a
 * mandatory `aria-valuetext` naming both axes; Left/Right move saturation
 * (RTL-aware), Up/Down and PageUp/PageDown move brightness. Home/End are
 * deliberate no-ops — in two dimensions the "end" is ambiguous.
 */
@Component({
  selector: 'oge-color-surface',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-color-surface',
    '[class.oge-color-surface-dragging]': 'dragging()',
    '(pointerdown)': 'onPointerDown($event)',
  },
  template: `
    <div
      #thumb
      class="oge-color-surface-thumb"
      role="slider"
      tabindex="0"
      data-focus-target
      [attr.aria-label]="label()"
      [attr.aria-roledescription]="roleDescription()"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="100"
      [attr.aria-valuenow]="brightness()"
      [attr.aria-valuetext]="valueText()"
      [style.inset-inline-start.%]="saturation()"
      [style.top.%]="100 - brightness()"
      (keydown)="onKeydown($event)"
    ></div>
  `,
})
export class OgeColorSurface {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Saturation percent (0–100) — the horizontal axis. */
  readonly saturation = input.required<number>();
  /** Brightness (HSV value) percent (0–100) — the vertical axis. */
  readonly brightness = input.required<number>();
  /** Arrow-key increment in percent; PageUp/PageDown move brightness by 5×. */
  readonly keyStep = input.required<number>();
  /** Accessible name of the surface thumb. */
  readonly label = input.required<string>();
  /** `aria-roledescription` — announces the 2-axis nature. */
  readonly roleDescription = input.required<string>();
  /** `aria-valuetext` naming both axes. */
  readonly valueText = input.required<string>();

  readonly changed = output<OgeColorSurfaceChange>();
  /** A pointer gesture completed (not emitted on Escape-cancel). */
  readonly released = output<Event>();

  private readonly thumbEl = viewChild<ElementRef<HTMLElement>>('thumb');

  protected readonly dragging = signal(false);
  private activeGestureCleanup: (() => void) | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.activeGestureCleanup?.());
  }

  private isRtl(): boolean {
    return getComputedStyle(this.hostEl.nativeElement).direction === 'rtl';
  }

  private atPointer(
    event: PointerEvent,
    rect: DOMRect,
  ): { s: number; v: number } {
    let x = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    if (this.isRtl()) x = 1 - x;
    const y = rect.height > 0 ? (rect.bottom - event.clientY) / rect.height : 0;
    return {
      s: ratioToValue(x, 0, 100, 1),
      v: ratioToValue(y, 0, 100, 1),
    };
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.thumbEl()?.nativeElement.focus();
    const rect = this.hostEl.nativeElement.getBoundingClientRect();
    const start = { s: this.saturation(), v: this.brightness() };
    this.dragging.set(true);

    const target = event.target as HTMLElement | null;
    if (target && typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        /* jsdom / detached elements — capture is a progressive enhancement */
      }
    }

    this.changed.emit({ ...this.atPointer(event, rect), event });

    const onMove = (e: PointerEvent): void => {
      this.changed.emit({ ...this.atPointer(e, rect), event: e });
    };
    const finish = (e: Event, cancelled: boolean): void => {
      cleanup();
      this.dragging.set(false);
      if (cancelled) {
        this.changed.emit({ ...start, event: e });
        return;
      }
      this.released.emit(e);
    };
    const onUp = (e: PointerEvent): void => finish(e, false);
    const onCancel = (e: PointerEvent): void => finish(e, true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      finish(e, true);
    };
    const onWindowBlur = (): void => finish(event, true);
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onWindowBlur);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onWindowBlur);
    this.activeGestureCleanup = cleanup;
  }

  protected onKeydown(event: KeyboardEvent): void {
    const step = this.keyStep();
    const rtl = this.isRtl();
    let ds = 0;
    let dv = 0;
    switch (event.key) {
      case 'ArrowRight':
        ds = rtl ? -step : step;
        break;
      case 'ArrowLeft':
        ds = rtl ? step : -step;
        break;
      case 'ArrowUp':
        dv = step;
        break;
      case 'ArrowDown':
        dv = -step;
        break;
      case 'PageUp':
        dv = step * 5;
        break;
      case 'PageDown':
        dv = -step * 5;
        break;
      default:
        return; // Home/End deliberately unhandled — ambiguous in 2D
    }
    event.preventDefault();
    const clamp = (value: number): number =>
      Math.min(Math.max(Math.round(value), 0), 100);
    const s = clamp(this.saturation() + ds);
    const v = clamp(this.brightness() + dv);
    if (s !== this.saturation() || v !== this.brightness()) {
      this.changed.emit({ s, v, event });
    }
  }
}
