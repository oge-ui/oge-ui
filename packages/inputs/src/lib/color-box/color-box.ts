import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  formatColor,
  hsvaToRgba,
  parseColor,
  rgbaToHsva,
  type OgeColorFormat,
  type OgeHsva,
  type OgeRgba,
} from '@oge-ui/core';
import {
  OGE_OVERLAY_CONFIG,
  OgePopup,
  type OgePopupPlacement,
} from '@oge-ui/overlay';
import { OgeFieldChrome } from '../field/field-chrome';
import { OGE_INPUT_HOST, type OgeInputDropDownApi } from '../field/input-host';
import { OgeInputBase } from '../field/input-base';
import { SelectPanelController } from '../select-list/select-panel-controller';
import {
  OGE_DEFAULT_COLOR_PALETTE,
  type OgeColorBoxApplyValueMode,
  type OgeColorBoxView,
} from './color-box-types';
import { OgeColorPalette, type OgeColorPalettePick } from './color-palette';
import { OgeColorSlider, type OgeColorSliderChange } from './color-slider';
import { OgeColorSurface, type OgeColorSurfaceChange } from './color-surface';

/** The empty-field draft — opaque black, the DevExtreme precedent. */
const DEFAULT_HSVA: OgeHsva = { h: 0, s: 0, v: 0, a: 1 };

/**
 * Color editor on the shared oge field chrome: the field shows a swatch and
 * the committed color text, the popup is a saturation/brightness surface with
 * hue/alpha sliders, hex + channel inputs and an optional swatch palette.
 * The value is always a CSS color string, normalized to `format` on commit:
 *
 * ```html
 * <oge-color-box label="Brand" [(value)]="brand" />
 * <oge-color-box label="Overlay" [editAlphaChannel]="true" format="rgba" [(value)]="overlay" />
 * <oge-color-box label="Tag" view="palette" [palette]="swatches" [(value)]="tag" />
 * ```
 *
 * No WAI-ARIA APG color-picker pattern exists, so the popup is composed from
 * primitives: a `role="dialog"` that takes real DOM focus (the date-box
 * precedent), APG sliders for hue and alpha, a 2-axis `role="slider"` surface
 * with mandatory `aria-valuetext`, and a `role="grid"` palette. Typed text
 * parses any CSS color (hex, `rgb()`/`rgba()`, `hsl()`, named colors);
 * unparseable text shows the invalid state while typing and reverts on blur —
 * a wrong color is never committed. Works standalone via `[(value)]`, with
 * Signal Forms via `[formField]`, and with reactive/template forms via
 * `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-color-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    OgeFieldChrome,
    OgePopup,
    OgeColorSurface,
    OgeColorSlider,
    OgeColorPalette,
  ],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeColorBox }],
  host: {
    class: 'oge-input oge-color-box',
    '[class.oge-select-box-open]': 'opened()',
  },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <span
        ngProjectAs="[ogeInputPrefix]"
        class="oge-color-box-swatch"
        aria-hidden="true"
        ><span
          class="oge-color-box-swatch-fill"
          [style.background]="swatchCss()"
        ></span
      ></span>
      <input
        #native
        class="oge-input-native"
        type="text"
        role="combobox"
        aria-haspopup="dialog"
        aria-autocomplete="none"
        autocomplete="off"
        spellcheck="false"
        [id]="inputId"
        [value]="inputText()"
        [placeholder]="placeholderText()"
        [disabled]="effectiveDisabled()"
        [readOnly]="readonly() || !acceptCustomValue()"
        [attr.name]="name() || null"
        [attr.title]="tooltip() ?? null"
        [attr.tabindex]="tabIndex()"
        [attr.aria-expanded]="opened()"
        [attr.aria-controls]="opened() ? panel.panelId : null"
        [attr.aria-label]="labelMode() === 'hidden' && label() ? label() : null"
        [attr.aria-labelledby]="
          labelMode() !== 'hidden' && label() ? labelId : null
        "
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        (input)="onNativeInput($event)"
        (click)="onFieldClick()"
        (keydown)="onKeydown($event)"
        (focus)="handleFocus($event)"
        (blur)="handleBlur($event)"
      />
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
    @if (opened()) {
      <oge-popup [panel]="panel">
        <div
          class="oge-color-box-panel"
          role="dialog"
          [attr.aria-label]="label() || msg().colorPickerLabel"
        >
          @if (view() !== 'palette') {
            <oge-color-surface
              [saturation]="displayHsva().s"
              [brightness]="displayHsva().v"
              [keyStep]="keyStep()"
              [label]="msg().colorSurfaceLabel"
              [roleDescription]="msg().colorSurfaceRoleDescription"
              [valueText]="surfaceValueText()"
              [style.--oge-color-surface-hue]="hueCss()"
              [style.--oge-color-thumb]="draftCss()"
              (changed)="onSurfaceChanged($event)"
              (released)="onPartReleased()"
            />
            <oge-color-slider
              kind="hue"
              [value]="displayHsva().h"
              [keyStep]="keyStep()"
              [label]="msg().hueSliderLabel"
              [valueText]="hueValueText()"
              [style.--oge-color-thumb]="hueCss()"
              (changed)="onHueChanged($event)"
              (released)="onPartReleased()"
            />
            @if (editAlphaChannel()) {
              <oge-color-slider
                kind="alpha"
                [value]="alphaPercent()"
                [keyStep]="keyStep()"
                [label]="msg().alphaSliderLabel"
                [valueText]="alphaValueText()"
                [style.--oge-color-slider-rgb]="rgbCss()"
                [style.--oge-color-thumb]="draftRgbaCss()"
                (changed)="onAlphaChanged($event)"
                (released)="onPartReleased()"
              />
            }
            <div class="oge-color-box-fields">
              @if (showEyedropper() && eyedropperSupported) {
                <button
                  type="button"
                  class="oge-color-box-eyedropper"
                  [attr.aria-label]="msg().eyedropperButton"
                  [attr.title]="msg().eyedropperButton"
                  (click)="pickFromScreen($event)"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path
                      d="m9.5 3.5 3 3M11 2l3 3-1.5 1.5-3-3zM10.25 4.75 3.5 11.5 3 13.5l2-.5 6.75-6.75"
                    />
                  </svg>
                </button>
              }
              <label class="oge-color-box-field oge-color-box-field-hex">
                <input
                  class="oge-color-box-channel"
                  type="text"
                  spellcheck="false"
                  autocomplete="off"
                  [value]="hexText()"
                  [attr.aria-label]="msg().hexInputLabel"
                  (change)="onHexChange($event)"
                  (keydown)="$event.stopPropagation()"
                />
                <span class="oge-color-box-field-tag" aria-hidden="true"
                  >HEX</span
                >
              </label>
              <label class="oge-color-box-field">
                <input
                  class="oge-color-box-channel"
                  type="number"
                  min="0"
                  max="255"
                  [value]="displayRgba().r"
                  [attr.aria-label]="msg().redInputLabel"
                  (change)="onChannelChange('r', $event)"
                  (keydown)="$event.stopPropagation()"
                />
                <span class="oge-color-box-field-tag" aria-hidden="true"
                  >R</span
                >
              </label>
              <label class="oge-color-box-field">
                <input
                  class="oge-color-box-channel"
                  type="number"
                  min="0"
                  max="255"
                  [value]="displayRgba().g"
                  [attr.aria-label]="msg().greenInputLabel"
                  (change)="onChannelChange('g', $event)"
                  (keydown)="$event.stopPropagation()"
                />
                <span class="oge-color-box-field-tag" aria-hidden="true"
                  >G</span
                >
              </label>
              <label class="oge-color-box-field">
                <input
                  class="oge-color-box-channel"
                  type="number"
                  min="0"
                  max="255"
                  [value]="displayRgba().b"
                  [attr.aria-label]="msg().blueInputLabel"
                  (change)="onChannelChange('b', $event)"
                  (keydown)="$event.stopPropagation()"
                />
                <span class="oge-color-box-field-tag" aria-hidden="true"
                  >B</span
                >
              </label>
              @if (editAlphaChannel()) {
                <label class="oge-color-box-field">
                  <input
                    class="oge-color-box-channel"
                    type="number"
                    min="0"
                    max="100"
                    [value]="alphaPercent()"
                    [attr.aria-label]="msg().alphaInputLabel"
                    (change)="onAlphaInputChange($event)"
                    (keydown)="$event.stopPropagation()"
                  />
                  <span class="oge-color-box-field-tag" aria-hidden="true"
                    >A</span
                  >
                </label>
              }
            </div>
          }
          @if (view() !== 'gradient') {
            <oge-color-palette
              [colors]="paletteColors()"
              [columns]="paletteColumns()"
              [selected]="displayRgba()"
              [label]="msg().paletteLabel"
              (picked)="onPalettePick($event)"
            />
          }
          @if (applyValueMode() === 'useButtons') {
            <div class="oge-color-box-actions">
              <span class="oge-color-box-preview" aria-hidden="true">
                <span
                  class="oge-color-box-preview-pane"
                  [style.background]="swatchCss()"
                ></span>
                <span
                  class="oge-color-box-preview-pane"
                  [style.background]="draftRgbaCss()"
                ></span>
              </span>
              <button
                type="button"
                class="oge-color-box-action oge-color-box-ok"
                (click)="applyDraft($event)"
              >
                {{ msg().okButton }}
              </button>
              <button
                type="button"
                class="oge-color-box-action"
                (click)="close()"
              >
                {{ msg().cancelButton }}
              </button>
            </div>
          }
        </div>
      </oge-popup>
    }
  `,
  styleUrl: './color-box.scss',
})
export class OgeColorBox
  extends OgeInputBase<string | null>
  implements FormValueControl<string | null>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);

  /** The committed color as a CSS string, normalized to `format` on commit. */
  readonly value = model<string | null>(null);
  /** Committed string shape; translucent colors widen to carry alpha. */
  readonly format = input<OgeColorFormat>('hex');
  /** Which picker surfaces the popup renders. */
  readonly view = input<OgeColorBoxView>('gradient');
  /** Alpha editing: the alpha slider + input, and alpha-carrying output. */
  readonly editAlphaChannel = input(false);
  /** Popup commit policy: on interaction (default) or via the OK/Cancel footer. */
  readonly applyValueMode = input<OgeColorBoxApplyValueMode>('instantly');
  /** `false` makes the text read-only — picker input only. */
  readonly acceptCustomValue = input(true);
  /** Arrow-key increment of the panel parts, in value units (degrees / percent). */
  readonly keyStep = input(5);
  /** Palette swatches as CSS color strings; `undefined` = the built-in set. */
  readonly palette = input<readonly string[] | undefined>(undefined);
  /** Swatch columns of the palette grid. */
  readonly paletteColumns = input(10);
  /** Clicking the field opens the picker. */
  readonly openOnFieldClick = input(true);
  /** Hides the rail chevron when `false` — field click / keyboard still open. */
  readonly showDropDownButton = input(true);
  /**
   * Renders the eyedropper button (pick a color from anywhere on screen) in
   * browsers that ship the `EyeDropper` API; elsewhere the button never
   * renders — progressive enhancement, no polyfill.
   */
  readonly showEyedropper = input(true);
  readonly dropdownPlacement = input<OgePopupPlacement>('bottom-start');
  /** Picker visibility — two-way. */
  readonly opened = model(false);

  readonly dropDownOpened = output<void>();
  readonly dropDownClosed = output<void>();

  private readonly native = viewChild<ElementRef<HTMLInputElement>>('native');
  private readonly chromeRef = viewChild(OgeFieldChrome, { read: ElementRef });
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });

  private readonly panelController = new SelectPanelController({
    anchor: () =>
      this.chromeRef()?.nativeElement.querySelector('.oge-input-container') ??
      this.hostEl.nativeElement,
    panel: () => this.popupRef()?.nativeElement ?? null,
    placement: () => this.dropdownPlacement(),
    width: () => undefined as unknown as number | 'anchor',
    offset: () => this.overlayConfig.offset,
    viewportPadding: () => this.overlayConfig.viewportPadding,
    opened: this.opened,
    blocked: () => this.effectiveDisabled() || this.readonly(),
    restoreFocus: () => this.focus(),
    onOpened: () => {
      this.draft.set(this.currentHsva());
      // the composed color dialog takes real DOM focus (date-box precedent)
      setTimeout(() => {
        const popup = this.popupRef()?.nativeElement as HTMLElement | undefined;
        popup?.querySelector<HTMLElement>('[data-focus-target]')?.focus();
      });
      this.dropDownOpened.emit();
    },
    onClosed: () => {
      this.draft.set(null);
      this.dropDownClosed.emit();
    },
  });

  /** Anchored-panel model — public so templates/tests can read `panelId`. */
  readonly panel = this.panelController.panel;

  override readonly dropdown: OgeInputDropDownApi =
    this.panelController.dropDownApi(
      () => this.showDropDownButton() && !this.effectiveDisabled(),
      () => this.toggle(),
    );

  /** The `EyeDropper` API is Chromium-only today — detect, never polyfill. */
  protected readonly eyedropperSupported =
    typeof window !== 'undefined' && 'EyeDropper' in window;

  /** Uncommitted typed text; `null` = show the committed value. */
  private readonly text = signal<string | null>(null);
  /** Panel working color (useButtons collects interactions here before OK). */
  protected readonly draft = signal<OgeHsva | null>(null);

  protected readonly inputText = computed(
    () => this.text() ?? this.value() ?? '',
  );

  /** The field swatch paint — the committed string itself (CSS parses it too). */
  protected readonly swatchCss = computed(() => {
    const value = this.value();
    return value !== null && parseColor(value) !== null ? value : 'transparent';
  });

  /** The panel's working HSVA — the draft while open, else the value. */
  protected readonly displayHsva = computed(
    () => this.draft() ?? this.currentHsva(),
  );

  protected readonly displayRgba = computed<OgeRgba>(() =>
    hsvaToRgba(this.displayHsva()),
  );

  protected readonly alphaPercent = computed(() =>
    Math.round(this.displayHsva().a * 100),
  );

  protected readonly hueCss = computed(
    () => `hsl(${Math.round(this.displayHsva().h)}, 100%, 50%)`,
  );

  /** Opaque working color — fills the surface thumb (the surface has no alpha). */
  protected readonly draftCss = computed(() => {
    const { r, g, b } = this.displayRgba();
    return `rgb(${r}, ${g}, ${b})`;
  });

  /** Working color with alpha — the alpha thumb and the preview pane. */
  protected readonly draftRgbaCss = computed(() => {
    const { r, g, b, a } = this.displayRgba();
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
  });

  protected readonly rgbCss = computed(() => {
    const { r, g, b } = this.displayRgba();
    return `${r}, ${g}, ${b}`;
  });

  protected readonly hexText = computed(() =>
    formatColor(this.displayRgba(), 'hex', this.editAlphaChannel()),
  );

  protected readonly paletteColors = computed(
    () => this.palette() ?? OGE_DEFAULT_COLOR_PALETTE,
  );

  protected readonly surfaceValueText = computed(() =>
    this.msg()
      .surfaceValueText.replace(
        '{saturation}',
        String(Math.round(this.displayHsva().s)),
      )
      .replace('{brightness}', String(Math.round(this.displayHsva().v))),
  );

  protected readonly hueValueText = computed(() =>
    this.msg().hueValueText.replace(
      '{value}',
      String(Math.round(this.displayHsva().h)),
    ),
  );

  protected readonly alphaValueText = computed(() =>
    this.msg().alphaValueText.replace('{value}', String(this.alphaPercent())),
  );

  constructor() {
    super();
    this.destroyRef.onDestroy(() => this.panelController.destroy());
  }

  // --- public API ------------------------------------------------------------

  open(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.opened.set(true);
  }

  close(): void {
    this.opened.set(false);
  }

  toggle(): void {
    if (this.opened()) this.close();
    else this.open();
  }

  // --- typing ----------------------------------------------------------------

  protected onNativeInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.text.set(raw);
    this.inputChange.emit({ text: raw, event });
    this.parseInvalid.set(raw.trim() !== '' && parseColor(raw) === null);
  }

  /** Commits the typed text; unparseable text reverts to the value. */
  private commitTypedText(event?: Event): void {
    const raw = this.text();
    if (raw === null) return;
    this.text.set(null);
    this.parseInvalid.set(false);
    if (raw.trim() === '') {
      this.commitNow(null, event);
      return;
    }
    const parsed = parseColor(raw);
    if (parsed !== null) this.commitRgba(parsed, event);
    // parsed === null → revert: inputText falls back to the committed value
  }

  protected onFieldClick(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (!this.opened() && this.openOnFieldClick()) this.open();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        if (!this.opened()) this.open();
        return;
      }
      case 'Enter': {
        this.commitTypedText(event);
        if (this.opened()) this.close();
        this.handleEnterKey(event);
        return;
      }
      case 'Escape': {
        // the panel's document listener closes the popup; second Escape
        // reverts uncommitted text
        if (!this.opened() && this.text() !== null) {
          event.preventDefault();
          this.text.set(null);
          this.parseInvalid.set(false);
        }
        return;
      }
    }
  }

  // --- panel interactions ----------------------------------------------------

  protected onSurfaceChanged(change: OgeColorSurfaceChange): void {
    this.applyDraftChange(
      { ...this.displayHsva(), s: change.s, v: change.v },
      change.event,
    );
  }

  protected onHueChanged(change: OgeColorSliderChange): void {
    this.applyDraftChange(
      { ...this.displayHsva(), h: change.value },
      change.event,
    );
  }

  protected onAlphaChanged(change: OgeColorSliderChange): void {
    this.applyDraftChange(
      { ...this.displayHsva(), a: change.value / 100 },
      change.event,
    );
  }

  /** Pointer gestures flush their live-queued commits on release. */
  protected onPartReleased(): void {
    if (this.applyValueMode() === 'instantly') this.flushCommit();
  }

  protected onHexChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    const parsed = parseColor(element.value);
    if (parsed === null) {
      element.value = this.hexText(); // revert — a wrong color is never applied
      return;
    }
    this.applyDraftChange(rgbaToHsva(parsed), event);
  }

  protected onChannelChange(channel: 'r' | 'g' | 'b', event: Event): void {
    const element = event.target as HTMLInputElement;
    const numeric = Number.parseFloat(element.value);
    const rgba = { ...this.displayRgba() };
    if (!Number.isFinite(numeric)) {
      element.value = String(rgba[channel]);
      return;
    }
    rgba[channel] = Math.min(Math.max(Math.round(numeric), 0), 255);
    // keep the working hue: only re-derive the changed channel's effect
    const next = { ...rgbaToHsva(rgba), a: this.displayHsva().a };
    this.applyDraftChange(next, event);
  }

  protected onAlphaInputChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    const numeric = Number.parseFloat(element.value);
    if (!Number.isFinite(numeric)) {
      element.value = String(this.alphaPercent());
      return;
    }
    const alpha = Math.min(Math.max(Math.round(numeric), 0), 100) / 100;
    this.applyDraftChange({ ...this.displayHsva(), a: alpha }, event);
  }

  /** Opens the platform eyedropper; a cancelled pick is not an error. */
  protected async pickFromScreen(event: Event): Promise<void> {
    const ctor = (
      window as unknown as {
        EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
      }
    ).EyeDropper;
    if (!ctor) return;
    try {
      const result = await new ctor().open();
      const parsed = parseColor(result.sRGBHex);
      if (parsed === null) return;
      // sRGBHex is always opaque — keep the working alpha
      const hsva = { ...rgbaToHsva(parsed), a: this.displayHsva().a };
      this.applyDraftChange(hsva, event);
    } catch {
      /* AbortError — the user pressed Escape */
    }
  }

  protected onPalettePick(pick: OgeColorPalettePick): void {
    const parsed = parseColor(pick.color);
    if (parsed === null) return;
    const hsva = rgbaToHsva(parsed);
    if (this.applyValueMode() === 'useButtons') {
      this.draft.set(hsva);
      return;
    }
    this.draft.set(hsva);
    this.commitRgba(parsed, pick.event);
    // a palette pick is a final choice — close (the date-pick precedent)
    this.close();
    this.focus();
  }

  protected applyDraft(event: Event): void {
    const draft = this.draft();
    if (draft !== null) this.commitHsva(draft, event);
    this.close();
    this.focus();
  }

  /** Every panel interaction lands here: draft always, commit per the mode. */
  private applyDraftChange(hsva: OgeHsva, event: Event): void {
    this.draft.set(hsva);
    if (this.applyValueMode() === 'useButtons') return;
    this.queueCommit(this.formatted(hsvaToRgba(hsva)), event);
    this.text.set(null);
    this.parseInvalid.set(false);
  }

  // --- commit ----------------------------------------------------------------

  /** Normalized commit string; alpha coerced opaque without `editAlphaChannel`. */
  private formatted(rgba: OgeRgba): string {
    const withAlpha = this.editAlphaChannel();
    return formatColor(
      withAlpha ? rgba : { ...rgba, a: 1 },
      this.format(),
      withAlpha,
    );
  }

  private commitRgba(rgba: OgeRgba, event?: Event): void {
    this.commitNow(this.formatted(rgba), event);
    this.text.set(null);
    this.parseInvalid.set(false);
  }

  private commitHsva(hsva: OgeHsva, event?: Event): void {
    this.commitRgba(hsvaToRgba(hsva), event);
  }

  /** The committed value's HSVA; opaque black for an empty field (dx). */
  private currentHsva(): OgeHsva {
    const value = this.value();
    const parsed = value === null ? null : parseColor(value);
    return parsed === null ? DEFAULT_HSVA : rgbaToHsva(parsed);
  }

  // --- base contract ---------------------------------------------------------

  protected override handleBlur(event: FocusEvent): void {
    // focus moving into the picker dialog is not a real blur
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    super.handleBlur(event);
  }

  protected override onFocusChanged(focused: boolean): void {
    if (focused) return;
    this.commitTypedText();
    if (this.opened()) this.close();
  }

  protected override parseErrorMessage(): string {
    return this.msg().invalidColorError;
  }

  protected override onValueWritten(): void {
    this.text.set(null);
    this.parseInvalid.set(false);
  }

  protected nativeElement(): HTMLInputElement | null {
    return this.native()?.nativeElement ?? null;
  }

  protected emptyValue(): string | null {
    return null;
  }

  protected valueIsEmpty(value: string | null): boolean {
    return value === null || value === '';
  }

  protected override normalizeWrite(value: unknown): string | null {
    // lenient writes: any parseable CSS color string is kept verbatim —
    // programmatic values are never reformatted, only user commits are
    if (value == null) return null;
    const text = String(value);
    return parseColor(text) === null ? null : text;
  }
}
