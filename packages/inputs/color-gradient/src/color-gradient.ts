import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  linkedSignal,
  model,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  colorsEqual,
  contrastLevels,
  contrastRatio,
  formatColor,
  hsvaToRgba,
  parseColor,
  rgbaToHsva,
  type OgeColorFormat,
  type OgeHsva,
  type OgeRgba,
} from '@oge-ui/behavior';
import { OgeControlBase } from '@oge-ui/inputs/field';
import {
  OgeColorChannelInputs,
  OgeColorSlider,
  OgeColorSurface,
  type OgeColorChannelChange,
  type OgeColorSliderChange,
  type OgeColorSurfaceChange,
} from '@oge-ui/inputs/color-parts';

/** The empty-value draft — opaque black, the color box precedent. */
const DEFAULT_HSVA: OgeHsva = { h: 0, s: 0, v: 0, a: 1 };
const WHITE: OgeRgba = { r: 255, g: 255, b: 255, a: 1 };

/**
 * Inline color gradient — the color box's picker surfaces as a standalone,
 * always-visible form editor (Kendo's ColorGradient, Syncfusion's inline
 * picker): a saturation/brightness surface, hue and optional alpha sliders,
 * hex + R/G/B(/A) inputs and an optional WCAG contrast readout against a
 * configurable background:
 *
 * ```html
 * <oge-color-gradient label="Brand color" [(value)]="brand" />
 * <oge-color-gradient
 *   [editAlphaChannel]="true"
 *   format="rgba"
 *   [showContrast]="true"
 *   contrastBackground="#ffffff"
 *   [(value)]="overlay"
 * />
 * ```
 *
 * No APG color-picker pattern exists, so the editor is a labelled
 * `role="group"` of APG sliders (the surface is a 2-axis `role="slider"` with
 * mandatory `aria-valuetext`) and native inputs, each its own Tab stop.
 * Dragging commits live (`debounce` throttles it) and flushes on release;
 * Escape during a drag restores the start color. The value is a CSS color
 * string normalized to `format`; works standalone via `[(value)]`, with
 * Signal Forms via `[formField]`, and with reactive/template forms via
 * `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-color-gradient',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeColorSurface, OgeColorSlider, OgeColorChannelInputs],
  host: {
    class: 'oge-color-gradient',
    role: 'group',
    '[class.oge-color-gradient-readonly]': 'readonly()',
    '[class.oge-color-gradient-invalid]': 'showError()',
    '[attr.aria-label]': 'label() || msg().colorGradientLabel',
    '[attr.aria-invalid]': "showError() ? 'true' : null",
    '[attr.aria-disabled]': "effectiveDisabled() ? 'true' : null",
    '[attr.title]': 'tooltip() ?? null',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <oge-color-surface
      [saturation]="draft().s"
      [brightness]="draft().v"
      [keyStep]="keyStep()"
      [disabled]="inert()"
      [label]="msg().colorSurfaceLabel"
      [roleDescription]="msg().colorSurfaceRoleDescription"
      [valueText]="surfaceValueText()"
      [style.--oge-color-surface-hue]="hueCss()"
      [style.--oge-color-thumb]="opaqueCss()"
      (changed)="onSurfaceChanged($event)"
      (released)="flushCommit()"
    />
    <oge-color-slider
      kind="hue"
      [value]="draft().h"
      [keyStep]="keyStep()"
      [disabled]="inert()"
      [label]="msg().hueSliderLabel"
      [valueText]="hueValueText()"
      [style.--oge-color-thumb]="hueCss()"
      (changed)="onHueChanged($event)"
      (released)="flushCommit()"
    />
    @if (editAlphaChannel()) {
      <oge-color-slider
        kind="alpha"
        [value]="alphaPercent()"
        [keyStep]="keyStep()"
        [disabled]="inert()"
        [label]="msg().alphaSliderLabel"
        [valueText]="alphaValueText()"
        [style.--oge-color-slider-rgb]="rgbCss()"
        [style.--oge-color-thumb]="rgbaCss()"
        (changed)="onAlphaChanged($event)"
        (released)="flushCommit()"
      />
    }
    @if (showInputs()) {
      <oge-color-channel-inputs
        [hsva]="draft()"
        [editAlpha]="editAlphaChannel()"
        [messages]="msg()"
        [disabled]="effectiveDisabled()"
        [readonly]="readonly()"
        (changed)="onChannelsChanged($event)"
      />
    }
    @if (contrast(); as c) {
      <div class="oge-color-gradient-contrast">
        <span
          class="oge-color-gradient-contrast-sample"
          aria-hidden="true"
          [style.background]="contrastBackgroundCss()"
          ><span [style.color]="rgbaCss()">Aa</span></span
        >
        <span class="oge-color-gradient-contrast-label">{{
          msg().contrastLabel
        }}</span>
        <span class="oge-color-gradient-contrast-ratio">{{ c.text }}</span>
        @for (level of c.levels; track level.name) {
          <span
            class="oge-color-gradient-contrast-badge"
            [class.oge-color-gradient-contrast-pass]="level.pass"
            [class.oge-color-gradient-contrast-fail]="!level.pass"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              @if (level.pass) {
                <path d="m3 8.5 3.5 3.5L13 4.5" />
              } @else {
                <path d="M4 4l8 8M12 4l-8 8" />
              }
            </svg>
            {{ level.text }}
          </span>
        }
      </div>
    }
  `,
  styleUrl: './color-gradient.scss',
})
export class OgeColorGradient
  extends OgeControlBase<string | null>
  implements FormValueControl<string | null>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The committed color as a CSS string, normalized to `format` on commit. */
  readonly value = model<string | null>(null);
  /** Accessible name of the group; falls back to the messages catalog. */
  readonly label = input('');
  /** Committed string shape; translucent colors widen to carry alpha. */
  readonly format = input<OgeColorFormat>('hex');
  /** Alpha editing: the alpha slider + input, and alpha-carrying output. */
  readonly editAlphaChannel = input(false);
  /** Arrow-key increment of the surface and sliders (degrees / percent). */
  readonly keyStep = input(5);
  /** Renders the hex + channel inputs under the sliders. */
  readonly showInputs = input(true);
  /** Renders the WCAG contrast readout (ratio + AA / AAA pass-fail). */
  readonly showContrast = input(false);
  /** The background the contrast ratio is measured against (any CSS color). */
  readonly contrastBackground = input('#ffffff');

  /**
   * The working color. Follows the value, but keeps its own hue/saturation
   * while the value still describes the same color — a gray has no hue, and
   * dragging through one must not snap the hue slider to 0.
   */
  protected readonly draft = linkedSignal<string | null, OgeHsva>({
    source: this.value,
    computation: (value, previous) => {
      const parsed = value === null ? null : parseColor(value);
      if (parsed === null) return previous?.value ?? DEFAULT_HSVA;
      if (previous && colorsEqual(hsvaToRgba(previous.value), parsed)) {
        return previous.value;
      }
      return rgbaToHsva(parsed);
    },
  });

  protected readonly inert = computed(
    () => this.effectiveDisabled() || this.readonly(),
  );
  protected readonly rgba = computed(() => hsvaToRgba(this.draft()));
  protected readonly alphaPercent = computed(() =>
    Math.round(this.draft().a * 100),
  );
  protected readonly hueCss = computed(
    () => `hsl(${Math.round(this.draft().h)}, 100%, 50%)`,
  );
  protected readonly opaqueCss = computed(() => {
    const { r, g, b } = this.rgba();
    return `rgb(${r}, ${g}, ${b})`;
  });
  protected readonly rgbaCss = computed(() => {
    const { r, g, b, a } = this.rgba();
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
  });
  protected readonly rgbCss = computed(() => {
    const { r, g, b } = this.rgba();
    return `${r}, ${g}, ${b}`;
  });

  protected readonly surfaceValueText = computed(() =>
    this.msg()
      .surfaceValueText.replace(
        '{saturation}',
        String(Math.round(this.draft().s)),
      )
      .replace('{brightness}', String(Math.round(this.draft().v))),
  );
  protected readonly hueValueText = computed(() =>
    this.msg().hueValueText.replace(
      '{value}',
      String(Math.round(this.draft().h)),
    ),
  );
  protected readonly alphaValueText = computed(() =>
    this.msg().alphaValueText.replace('{value}', String(this.alphaPercent())),
  );

  private readonly background = computed<OgeRgba>(
    () => parseColor(this.contrastBackground()) ?? WHITE,
  );
  protected readonly contrastBackgroundCss = computed(() => {
    const { r, g, b } = this.background();
    return `rgb(${r}, ${g}, ${b})`;
  });

  /** The contrast readout model; `null` while `showContrast` is off. */
  protected readonly contrast = computed(() => {
    if (!this.showContrast()) return null;
    const levels = contrastLevels(
      contrastRatio(this.rgba(), this.background()),
    );
    const msg = this.msg();
    const badge = (name: string, pass: boolean) => ({
      name,
      pass,
      text: (pass ? msg.contrastPass : msg.contrastFail).replace(
        '{level}',
        name,
      ),
    });
    return {
      text: msg.contrastRatioText.replace('{ratio}', levels.ratio.toFixed(2)),
      levels: [badge('AA', levels.aa), badge('AAA', levels.aaa)],
    };
  });

  // --- interactions ----------------------------------------------------------

  protected onSurfaceChanged(change: OgeColorSurfaceChange): void {
    this.apply({ ...this.draft(), s: change.s, v: change.v }, change.event);
  }

  protected onHueChanged(change: OgeColorSliderChange): void {
    this.apply({ ...this.draft(), h: change.value }, change.event);
  }

  protected onAlphaChanged(change: OgeColorSliderChange): void {
    this.apply({ ...this.draft(), a: change.value / 100 }, change.event);
  }

  protected onChannelsChanged(change: OgeColorChannelChange): void {
    this.apply(change.hsva, change.event);
    this.flushCommit();
  }

  private apply(hsva: OgeHsva, event: Event): void {
    if (this.inert()) return;
    this.draft.set(hsva);
    const withAlpha = this.editAlphaChannel();
    const rgba = hsvaToRgba(hsva);
    this.queueCommit(
      formatColor(
        withAlpha ? rgba : { ...rgba, a: 1 },
        this.format(),
        withAlpha,
      ),
      event,
    );
  }

  protected onFocusIn(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.handleFocus(event);
  }

  protected onFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.handleBlur(event);
  }

  // --- base contract ---------------------------------------------------------

  protected nativeElement(): HTMLElement | null {
    return this.hostEl.nativeElement.querySelector<HTMLElement>(
      '.oge-color-surface-thumb',
    );
  }

  protected emptyValue(): string | null {
    return null;
  }

  protected valueIsEmpty(value: string | null): boolean {
    return value === null || value === '';
  }

  protected override normalizeWrite(value: unknown): string | null {
    // programmatic values are kept verbatim when parseable (color box rule)
    if (value == null) return null;
    const text = String(value);
    return parseColor(text) === null ? null : text;
  }
}
