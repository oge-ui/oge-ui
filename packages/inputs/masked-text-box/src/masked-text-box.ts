import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';
import { OgeFieldChrome, OGE_INPUT_HOST } from '@oge-ui/inputs/field';
import { OgeTextBox } from '@oge-ui/inputs/text-box';

/**
 * The mask-first text box — the Kendo / Syncfusion `MaskedTextBox`: the same
 * field chrome, forms integration and mask engine as `oge-text-box`'s `mask`
 * input, with the mask **required**, spell-checking and autocomplete off by
 * default, and the raw / formatted readers on the instance:
 *
 * ```html
 * <oge-masked-text-box label="Phone" mask="(000) 000-0000" [(value)]="phone" />
 * <oge-masked-text-box label="IBAN" mask="LL00 0000 0000 0000 0000 00" [includeLiterals]="true" [formField]="form.iban" />
 * ```
 *
 * Mask syntax: `0` digit, `9` optional digit, `#` digit/space/sign, `L`/`l`
 * letter (required/optional), `A`/`a` letter or digit, `C`/`c` any
 * character, a backslash escapes a literal, `maskRules` adds custom keys.
 * Typing overwrites slot by slot and skips literals; Backspace/Delete empty a
 * slot without shifting the rest; paste accepts raw or formatted text; IME
 * composition is applied once at `compositionend`.
 */
@Component({
  selector: 'oge-masked-text-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeFieldChrome],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeMaskedTextBox }],
  host: { class: 'oge-input oge-text-box oge-masked-text-box' },
  // Same markup as `oge-text-box` (templates are not inherited across entry
  // points: a partial-compilation template must be a literal in this file).
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <input
        #native
        class="oge-input-native"
        [id]="inputId"
        [type]="effectiveType()"
        [value]="displayText()"
        [placeholder]="placeholderText()"
        [disabled]="effectiveDisabled()"
        [readOnly]="readonly()"
        [attr.name]="name() || null"
        [attr.maxlength]="nativeMaxLength()"
        [attr.minlength]="minLength() ?? null"
        [attr.autocomplete]="autocomplete() ?? null"
        [attr.inputmode]="effectiveInputMode()"
        [attr.enterkeyhint]="enterKeyHint() ?? null"
        [attr.autocapitalize]="autocapitalize() ?? null"
        [attr.spellcheck]="spellcheck() ?? null"
        [attr.title]="tooltip() ?? null"
        [attr.tabindex]="tabIndex()"
        [attr.aria-label]="labelMode() === 'hidden' && label() ? label() : null"
        [attr.aria-labelledby]="
          labelMode() !== 'hidden' && label() ? labelId : null
        "
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        (beforeinput)="onBeforeInput($event)"
        (input)="onNativeInput($event)"
        (click)="onMaskClick($event)"
        (compositionstart)="handleCompositionStart()"
        (compositionend)="handleCompositionEnd($event)"
        (focus)="handleFocus($event)"
        (blur)="handleBlur($event)"
        (keydown.enter)="handleEnterKey($event)"
      />
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
  `,
})
export class OgeMaskedTextBox extends OgeTextBox {
  /** The input mask — required here (see the class docs for the syntax). */
  override readonly mask = input.required<string | undefined>();
  /** Spell-checking is off by default — masked values are codes, not words. */
  override readonly spellcheck = input<boolean | undefined>(false);
  /** `'off'` by default; set e.g. `'tel'` to let the browser offer phone numbers. */
  override readonly autocomplete = input<string | undefined>('off');

  /** The entered characters without literals, whatever `includeLiterals` says. */
  rawValue(): string {
    return this.maskCore()?.rawValue() ?? '';
  }

  /** The formatted text with literals (`''` while empty), whatever `includeLiterals` says. */
  maskedValue(): string {
    return this.maskCore()?.maskedValue() ?? '';
  }
}
