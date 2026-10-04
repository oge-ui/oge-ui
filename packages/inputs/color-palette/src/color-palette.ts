import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  OGE_COLOR_PALETTE_PRESETS,
  parseColor,
  type OgeColorPalettePreset,
} from '@oge-ui/behavior';
import { OgeControlBase } from '@oge-ui/inputs/field';
import {
  OgeColorSwatchGrid,
  type OgeColorPalettePick,
} from '@oge-ui/inputs/color-parts';

/**
 * Inline swatch palette as a form editor — Kendo's ColorPalette: a grid of
 * color tiles from a built-in preset (`'default' | 'basic' | 'office' |
 * 'material' | 'monochrome'`) or your own color list, with single selection
 * as the value:
 *
 * ```html
 * <oge-color-palette label="Tag color" palette="office" [(value)]="tag" />
 * <oge-color-palette [palette]="brandColors" [columns]="6" [tileSize]="28" [(value)]="accent" />
 * ```
 *
 * The grid is the APG `role="grid"` with a roving tabindex and real DOM
 * focus on the cells: arrows move by cell / row (RTL-mirrored, no wrap),
 * Home/End to the row edges, Ctrl+Home/Ctrl+End to the corners, Enter/Space
 * or a click picks. The selected tile carries `aria-selected` and a
 * contrast-colored checkmark. The value is the picked swatch string as
 * listed; works standalone via `[(value)]`, with Signal Forms via
 * `[formField]`, and with reactive/template forms via `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-color-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeColorSwatchGrid],
  host: {
    class: 'oge-color-palette-editor',
    '[class.oge-color-palette-editor-invalid]': 'showError()',
    '[class.oge-color-palette-editor-sized]': 'tileSize() !== undefined',
    '[style.--oge-color-palette-tile]': 'tileCss()',
    '[attr.title]': 'tooltip() ?? null',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <oge-color-swatch-grid
      [colors]="colors()"
      [columns]="resolvedColumns()"
      [selected]="selectedRgba()"
      [label]="label() || msg().paletteLabel"
      [disabled]="effectiveDisabled()"
      [readonly]="readonly()"
      [tabIndex]="tabIndex()"
      [attr.aria-invalid]="showError() ? 'true' : null"
      (picked)="onPicked($event)"
    />
  `,
  styleUrl: './color-palette.scss',
})
export class OgeColorPalette
  extends OgeControlBase<string | null>
  implements FormValueControl<string | null>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly grid = viewChild(OgeColorSwatchGrid);

  /** The picked swatch as listed in the palette; `null` = nothing picked. */
  readonly value = model<string | null>(null);
  /** A built-in preset name, or your own CSS color list. */
  readonly palette = input<OgeColorPalettePreset | readonly string[]>(
    'default',
  );
  /** Tiles per row; `undefined` = the preset's own count (10 for a custom list). */
  readonly columns = input<number | undefined>(undefined);
  /** Tile edge in px; `undefined` = tiles share the available width. */
  readonly tileSize = input<number | undefined>(undefined);
  /** Accessible name of the grid; falls back to the messages catalog. */
  readonly label = input('');

  protected readonly colors = computed<readonly string[]>(() => {
    const palette = this.palette();
    return typeof palette === 'string'
      ? (OGE_COLOR_PALETTE_PRESETS[palette]?.colors ??
          OGE_COLOR_PALETTE_PRESETS.default.colors)
      : palette;
  });

  protected readonly resolvedColumns = computed(() => {
    const explicit = this.columns();
    if (explicit !== undefined) return Math.max(1, Math.floor(explicit));
    const palette = this.palette();
    return typeof palette === 'string'
      ? (OGE_COLOR_PALETTE_PRESETS[palette]?.columns ?? 10)
      : 10;
  });

  protected readonly tileCss = computed(() => {
    const size = this.tileSize();
    return size === undefined ? null : `${size}px`;
  });

  protected readonly selectedRgba = computed(() => {
    const value = this.value();
    return value === null ? null : parseColor(value);
  });

  protected onPicked(pick: OgeColorPalettePick): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.commitNow(pick.color, pick.event);
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

  /** Moves keyboard focus to the roving (selected or first) tile. */
  override focus(): void {
    this.grid()?.focus();
  }

  // --- base contract ---------------------------------------------------------

  protected nativeElement(): HTMLElement | null {
    return this.hostEl.nativeElement.querySelector<HTMLElement>(
      '.oge-color-palette-cell[tabindex="0"]',
    );
  }

  protected emptyValue(): string | null {
    return null;
  }

  protected valueIsEmpty(value: string | null): boolean {
    return value === null || value === '';
  }

  protected override normalizeWrite(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value);
    return parseColor(text) === null ? null : text;
  }
}
