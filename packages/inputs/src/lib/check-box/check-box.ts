import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { OgeControlBase } from '../field/control-base';

/**
 * Checkbox control on a real (visually hidden) native `<input
 * type="checkbox">` — native label/click/Space semantics and
 * `aria-checked="mixed"` come for free. The value is `boolean | null`; `null`
 * renders the indeterminate (dash) state regardless of `threeState`, which
 * only controls whether *users* can cycle into it
 * (`null → true → false → null`):
 *
 * ```html
 * <oge-check-box [(value)]="agreed">I agree to the terms</oge-check-box>
 * <oge-check-box [threeState]="true" text="Select all" [(value)]="all" />
 * ```
 *
 * Works standalone via `[(value)]`, with Signal Forms via `[formField]`, and
 * with reactive/template forms via `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-check-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [],
  host: {
    class: 'oge-check-box',
    '[class.oge-check-box-checked]': 'value() === true',
    '[class.oge-check-box-indeterminate]': 'value() === null',
    '[class.oge-check-box-invalid]': 'showError()',
    '[class.oge-check-box-readonly]': 'readonly()',
    '[class.oge-check-box-sm]': "size() === 'sm'",
    '[class.oge-check-box-lg]': "size() === 'lg'",
  },
  template: `
    <label class="oge-check-box-field" [attr.title]="tooltip() ?? null">
      <input
        #native
        type="checkbox"
        class="oge-check-box-input"
        [id]="inputId"
        [disabled]="effectiveDisabled()"
        [attr.name]="name() || null"
        [attr.tabindex]="tabIndex()"
        [attr.aria-label]="label() || null"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        (click)="onNativeClick($event)"
        (change)="onNativeChange($event)"
        (keydown.enter)="handleEnterKey($event)"
        (focus)="handleFocus($event)"
        (blur)="handleBlur($event)"
      />
      <span class="oge-check-box-icon" aria-hidden="true">
        @if (value() === true) {
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m3 8.5 3.5 3.5L13 4.5" />
          </svg>
        } @else if (value() === null) {
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <path d="M4 8h8" />
          </svg>
        }
      </span>
      @if (text()) {
        <span class="oge-check-box-text">{{ text() }}</span>
      } @else {
        <span class="oge-check-box-text"><ng-content /></span>
      }
    </label>
  `,
  styleUrl: './check-box.scss',
})
export class OgeCheckBox
  extends OgeControlBase<boolean | null>
  implements FormValueControl<boolean | null>
{
  /** `true`/`false`, or `null` for the indeterminate state — two-way. */
  readonly value = model<boolean | null>(false);
  /** Lets users cycle into the indeterminate state: `null → true → false → null`. */
  readonly threeState = input(false);
  /** Label text; the default `<ng-content>` slot renders when unset. */
  readonly text = input('');
  /** Accessible name (`aria-label`) when there is no visible label text. */
  readonly label = input('');

  private readonly native = viewChild<ElementRef<HTMLInputElement>>('native');

  constructor() {
    super();
    // The model drives the DOM, not the other way around — the native
    // `indeterminate` property has no attribute and must be set imperatively.
    effect(() => {
      const value = this.value();
      const el = this.native()?.nativeElement;
      if (!el) return;
      el.checked = value === true;
      el.indeterminate = value === null;
    });
  }

  /** Advances the state exactly like a user click (respects `threeState`). */
  toggle(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.commitNow(this.nextValue());
  }

  protected onNativeClick(event: Event): void {
    if (this.readonly()) event.preventDefault();
  }

  protected onNativeChange(event: Event): void {
    // the native toggle already flipped `checked` — the value-sync effect
    // re-asserts the model-driven state right after the commit
    this.commitNow(this.nextValue(), event);
    const el = this.native()?.nativeElement;
    if (el) {
      el.checked = this.value() === true;
      el.indeterminate = this.value() === null;
    }
  }

  private nextValue(): boolean | null {
    const current = this.value();
    if (this.threeState()) {
      // reference cycle: indeterminate → checked → unchecked → indeterminate
      if (current === null) return true;
      return current === true ? false : null;
    }
    return current !== true;
  }

  protected nativeElement(): HTMLInputElement | null {
    return this.native()?.nativeElement ?? null;
  }

  protected emptyValue(): boolean | null {
    return false;
  }

  protected valueIsEmpty(value: boolean | null): boolean {
    return value !== true;
  }

  protected override normalizeWrite(value: unknown): boolean | null {
    if (value === null) return null;
    return value === true;
  }
}
