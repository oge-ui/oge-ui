import type {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import {
  ogeEditorHtmlLength,
  type OgeEditorParseOptions,
} from '@oge-ui/behavior';

/**
 * A reactive-forms validator for an editor's HTML value that counts the
 * *text* — `Validators.maxLength` would count the markup. Reports
 * `{ ogeEditorMaxLength: { max, actual } }`, which the editor turns into its
 * `validation.maxLength` message.
 *
 * ```ts
 * readonly body = new FormControl('', [ogeEditorMaxLength(500)]);
 * ```
 */
export function ogeEditorMaxLength(
  max: number,
  options: OgeEditorParseOptions = {},
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string' || value === '') return null;
    const actual = ogeEditorHtmlLength(value, options);
    return actual > max ? { ogeEditorMaxLength: { max, actual } } : null;
  };
}
