import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  colorsEqual,
  contrastForeground,
  parseColor,
  type OgeRgba,
} from '@oge-ui/core';

/** A palette swatch pick. */
export interface OgeColorPalettePick {
  color: string;
  event: Event;
}

interface PaletteCell {
  index: number;
  text: string;
  rgba: OgeRgba;
  foreground: 'black' | 'white';
}

/**
 * Internal swatch grid of the color panel — an APG `role="grid"` composition
 * with a roving tabindex and real DOM focus on the cells (the calendar
 * precedent): arrows move by cell/row, Home/End jump the row edges,
 * Ctrl+Home/Ctrl+End the grid corners, Enter/Space picks. The selected cell
 * carries `aria-selected` and a checkmark colored by `contrastForeground`.
 */
@Component({
  selector: 'oge-color-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-color-palette',
    role: 'grid',
    '[attr.aria-label]': 'label()',
    '[style.--oge-color-palette-columns]': 'columns()',
  },
  template: `
    @for (row of rows(); track $index) {
      <div class="oge-color-palette-row" role="row">
        @for (cell of row; track cell.index) {
          <div
            class="oge-color-palette-cell"
            role="gridcell"
            [tabindex]="cell.index === active() ? 0 : -1"
            [class.oge-color-palette-selected]="isSelected(cell)"
            [attr.aria-selected]="isSelected(cell)"
            [attr.aria-label]="cell.text"
            [attr.data-index]="cell.index"
            [attr.data-focus-target]="cell.index === active() ? '' : null"
            [style.background]="cell.text"
            (click)="pick(cell, $event)"
            (keydown)="onKeydown(cell, $event)"
          >
            @if (isSelected(cell)) {
              <svg
                class="oge-color-palette-check"
                viewBox="0 0 16 16"
                fill="none"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                [attr.stroke]="cell.foreground"
              >
                <path d="m3 8.5 3.5 3.5L13 4.5" />
              </svg>
            }
          </div>
        }
      </div>
    }
  `,
})
export class OgeColorPalette {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Swatches as CSS color strings; unparseable entries are dropped. */
  readonly colors = input.required<readonly string[]>();
  readonly columns = input.required<number>();
  /** The current committed/draft color — matched by rounded channel equality. */
  readonly selected = input<OgeRgba | null>(null);
  /** Accessible name of the grid. */
  readonly label = input.required<string>();

  readonly picked = output<OgeColorPalettePick>();

  private readonly cells = computed<PaletteCell[]>(() =>
    this.colors()
      .map((text) => ({ text, rgba: parseColor(text) }))
      .filter(
        (entry): entry is { text: string; rgba: OgeRgba } =>
          entry.rgba !== null,
      )
      .map((entry, index) => ({
        index,
        text: entry.text,
        rgba: entry.rgba,
        foreground: contrastForeground(entry.rgba),
      })),
  );

  protected readonly rows = computed<PaletteCell[][]>(() => {
    const columns = Math.max(1, this.columns());
    const cells = this.cells();
    const rows: PaletteCell[][] = [];
    for (let i = 0; i < cells.length; i += columns) {
      rows.push(cells.slice(i, i + columns));
    }
    return rows;
  });

  /** Roving tab stop — the selected cell when there is one, else the first. */
  private readonly activeOverride = signal<number | null>(null);
  protected readonly active = computed(() => {
    const override = this.activeOverride();
    if (override !== null) return override;
    const selected = this.selected();
    if (selected) {
      const match = this.cells().find((cell) =>
        colorsEqual(cell.rgba, selected),
      );
      if (match) return match.index;
    }
    return 0;
  });

  protected isSelected(cell: PaletteCell): boolean {
    const selected = this.selected();
    return selected !== null && colorsEqual(cell.rgba, selected);
  }

  protected pick(cell: PaletteCell, event: Event): void {
    this.activeOverride.set(cell.index);
    this.picked.emit({ color: cell.text, event });
  }

  protected onKeydown(cell: PaletteCell, event: KeyboardEvent): void {
    const columns = Math.max(1, this.columns());
    const count = this.cells().length;
    if (count === 0) return;
    const last = count - 1;
    const rowStart = cell.index - (cell.index % columns);
    const rowEnd = Math.min(rowStart + columns - 1, last);
    const rtl = getComputedStyle(this.hostEl.nativeElement).direction === 'rtl';
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
        next = cell.index + (rtl ? -1 : 1);
        break;
      case 'ArrowLeft':
        next = cell.index + (rtl ? 1 : -1);
        break;
      case 'ArrowDown':
        next = cell.index + columns;
        break;
      case 'ArrowUp':
        next = cell.index - columns;
        break;
      case 'Home':
        next = event.ctrlKey ? 0 : rowStart;
        break;
      case 'End':
        next = event.ctrlKey ? last : rowEnd;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.pick(cell, event);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next === null || next < 0 || next > last) return;
    this.activeOverride.set(next);
    this.hostEl.nativeElement
      .querySelector<HTMLElement>(`[data-index="${next}"]`)
      ?.focus();
  }
}
