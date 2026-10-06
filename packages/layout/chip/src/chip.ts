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
  viewChild,
} from '@angular/core';
import {
  OGE_CHIP_REMOVE_SHORTCUTS,
  ogeChipKeyIntent,
  ogeChipRemoveLabel,
} from '@oge-ui/behavior';
import { OgeChipLead } from './chip-lead';
import { OGE_CHIP_CONFIG, type OgeChipMessages } from './config';
import type {
  OgeChipAvatar,
  OgeChipRemovedEvent,
  OgeChipSeverity,
  OgeChipSize,
  OgeChipStylingMode,
} from './chip-types';

/**
 * A compact element for a tag, a filter, an attribute or a person — the
 * stand-alone chip. It is not a composite widget: a `selectable` chip is a
 * toggle `<button aria-pressed>`, a `removable` chip adds a separate, real
 * remove `<button>` beside it, and a plain chip is static text.
 *
 * ```html
 * <oge-chip label="Angular" />
 * <oge-chip label="Remote" [selectable]="true" [(selected)]="remote" />
 * <oge-chip label="Design" [removable]="true" (removed)="drop('design')" />
 * ```
 *
 * Delete / Backspace on a selectable chip's button also removes it. The chip
 * moves no data: hide it in `removed`. For a set of chips with one tab stop,
 * arrow keys and selection, use `oge-chip-list`.
 */
@Component({
  selector: 'oge-chip',
  imports: [OgeChipLead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chip',
    '[class.oge-chip-sm]': "resolvedSize() === 'sm'",
    '[class.oge-chip-lg]': "resolvedSize() === 'lg'",
    '[class.oge-chip-outlined]': "resolvedStylingMode() === 'outlined'",
    '[class.oge-chip-accent]': "severity() === 'accent'",
    '[class.oge-chip-success]': "severity() === 'success'",
    '[class.oge-chip-warning]': "severity() === 'warning'",
    '[class.oge-chip-danger]': "severity() === 'danger'",
    '[class.oge-chip-selectable]': 'selectable()',
    '[class.oge-chip-selected]': 'selectable() && selected()',
    '[class.oge-chip-removable]': 'removable()',
    '[class.oge-chip-disabled]': 'disabled()',
  },
  styleUrl: './chip.scss',
  template: `
    @if (selectable()) {
      <button
        #main
        type="button"
        class="oge-chip-main"
        [attr.aria-pressed]="selected()"
        [attr.aria-label]="ariaLabel() ?? null"
        [attr.aria-keyshortcuts]="removable() ? shortcuts : null"
        [disabled]="disabled()"
        (click)="toggle()"
        (keydown)="onKeydown($event)"
      >
        <svg
          class="oge-chip-check"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        @if (avatar() || icon()) {
          <span ogeChipLead [avatar]="avatar()" [icon]="icon()"></span>
        }
        <span class="oge-chip-label">{{ label() }}</span>
      </button>
    } @else {
      <span class="oge-chip-main">
        @if (avatar() || icon()) {
          <span ogeChipLead [avatar]="avatar()" [icon]="icon()"></span>
        }
        <span class="oge-chip-label">{{ label() }}</span>
      </span>
    }
    @if (removable()) {
      <button
        #remove
        type="button"
        class="oge-chip-remove"
        [attr.aria-label]="removeLabel()"
        [disabled]="disabled()"
        (click)="onRemove($event)"
      >
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    }
  `,
})
export class OgeChip {
  private readonly config = inject(OGE_CHIP_CONFIG);

  /** Visible text and accessible name. */
  readonly label = input('');
  /** SVG path data (`d`) of a leading `aria-hidden` icon. */
  readonly icon = input<string | undefined>(undefined);
  /** A small leading avatar (image, else initials); wins over `icon`. */
  readonly avatar = input<OgeChipAvatar | undefined>(undefined);
  /** Renders the chip as a toggle button with `aria-pressed`. */
  readonly selectable = input(false);
  /** Pressed state of a `selectable` chip (two-way). */
  readonly selected = model(false);
  /** Adds a remove button (and Delete/Backspace on the toggle). */
  readonly removable = input(false);
  /** Disables the toggle and the remove button. */
  readonly disabled = input(false);
  /** Density preset; falls back to the config, then `md`. */
  readonly size = input<OgeChipSize | undefined>(undefined);
  /** `filled` (tinted, default) or `outlined`; falls back to the config. */
  readonly stylingMode = input<OgeChipStylingMode | undefined>(undefined);
  /** Colour; `undefined` is the neutral chip. */
  readonly severity = input<OgeChipSeverity | undefined>(undefined);
  /**
   * Accessible name of the toggle when the visible label is not enough; also
   * names the remove button ("Remove {label}"). A static chip is plain text,
   * so its name is always the label.
   */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** The remove button (or Delete/Backspace) was pressed — hide the chip. */
  readonly removed = output<OgeChipRemovedEvent>();

  protected readonly shortcuts = OGE_CHIP_REMOVE_SHORTCUTS;
  protected readonly msg = computed<OgeChipMessages>(
    () => this.config.messages,
  );
  protected readonly resolvedSize = computed(
    () => this.size() ?? this.config.size ?? 'md',
  );
  protected readonly resolvedStylingMode = computed(
    () => this.stylingMode() ?? this.config.stylingMode ?? 'filled',
  );
  protected readonly removeLabel = computed(() =>
    ogeChipRemoveLabel(this.ariaLabel() ?? this.label(), this.msg()),
  );

  private readonly main = viewChild<ElementRef<HTMLButtonElement>>('main');
  private readonly removeButton =
    viewChild<ElementRef<HTMLButtonElement>>('remove');

  /** Focuses the toggle button, else the remove button. */
  focus(): void {
    (this.main() ?? this.removeButton())?.nativeElement.focus();
  }

  protected toggle(): void {
    if (this.disabled()) return;
    this.selected.set(!this.selected());
  }

  protected onKeydown(event: KeyboardEvent): void {
    const intent = ogeChipKeyIntent(event.key);
    if (intent?.type !== 'remove' || !this.removable() || this.disabled())
      return;
    event.preventDefault();
    this.removed.emit({ event });
  }

  protected onRemove(event: Event): void {
    if (this.disabled()) return;
    this.removed.emit({ event });
  }
}
