import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  input,
  model,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { OgeControlBase } from '../field/control-base';

/**
 * On/off toggle — a native `<button role="switch">` with `aria-checked`, a
 * sliding thumb and localized track text (`switchOn`/`switchOff` messages,
 * overridable per instance; empty strings hide the text):
 *
 * ```html
 * <oge-switch label="Notifications" [(value)]="notify" />
 * <oge-switch onText="AÇIK" offText="KAPALI" [(value)]="enabled" />
 * ```
 *
 * Click, Space and Enter toggle. Works standalone via `[(value)]`, with
 * Signal Forms via `[formField]`, and with reactive/template forms via
 * `formControl`/`ngModel`. The DevExtreme swipe gesture is deliberately not
 * replicated.
 */
@Component({
  selector: 'oge-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-switch',
    '[class.oge-switch-on]': 'value()',
    '[class.oge-switch-invalid]': 'showError()',
    '[class.oge-switch-readonly]': 'readonly()',
    '[class.oge-switch-sm]': "size() === 'sm'",
    '[class.oge-switch-lg]': "size() === 'lg'",
  },
  template: `
    <button
      #native
      type="button"
      role="switch"
      class="oge-switch-button"
      [id]="inputId"
      [disabled]="effectiveDisabled()"
      [attr.name]="name() || null"
      [attr.title]="tooltip() ?? null"
      [attr.tabindex]="tabIndex()"
      [attr.aria-checked]="value()"
      [attr.aria-label]="label() || null"
      [attr.aria-invalid]="showError() ? 'true' : null"
      [attr.aria-required]="required() ? 'true' : null"
      (click)="onToggleClick($event)"
      (focus)="handleFocus($event)"
      (blur)="handleBlur($event)"
    >
      <span class="oge-switch-track" aria-hidden="true">
        @if (trackText(); as text) {
          <span class="oge-switch-text">{{ text }}</span>
        }
        <span class="oge-switch-thumb"></span>
      </span>
    </button>
  `,
  styleUrl: './switch.scss',
})
export class OgeSwitch
  extends OgeControlBase<boolean>
  implements FormValueControl<boolean>
{
  /** The on/off state — two-way. */
  readonly value = model(false);
  /** Accessible name of the switch (`aria-label`). */
  readonly label = input('');
  /** Track text while on; `undefined` = messages `switchOn` ('ON'). */
  readonly onText = input<string | undefined>(undefined);
  /** Track text while off; `undefined` = messages `switchOff` ('OFF'). */
  readonly offText = input<string | undefined>(undefined);

  private readonly native = viewChild<ElementRef<HTMLButtonElement>>('native');

  /** The state-matched track text; `null` hides the text element. */
  protected readonly trackText = computed<string | null>(() => {
    const text = this.value()
      ? (this.onText() ?? this.msg().switchOn)
      : (this.offText() ?? this.msg().switchOff);
    return text === '' ? null : text;
  });

  /** Flips the state (no-op while disabled/readonly). */
  toggle(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.commitNow(!this.value());
  }

  protected onToggleClick(event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.commitNow(!this.value(), event);
  }

  protected nativeElement(): HTMLElement | null {
    return this.native()?.nativeElement ?? null;
  }

  protected emptyValue(): boolean {
    return false;
  }

  protected valueIsEmpty(value: boolean): boolean {
    return !value;
  }

  protected override normalizeWrite(value: unknown): boolean {
    return value === true;
  }
}
