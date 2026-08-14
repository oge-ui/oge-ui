import type { ValidationErrors } from '@angular/forms';
import { formatPattern, messageForFieldError } from '@oge-ui/behavior';
import type { OgeInputsMessages } from '../config';
import type { OgeFieldError } from './input-types';

// The `{token}` interpolation and the Signal-Forms kind→message map are
// shared with the React editors via `@oge-ui/behavior`; only the
// reactive-forms (`ValidationErrors`) branch below is Angular's own.
export { formatPattern } from '@oge-ui/behavior';

function str(value: unknown): string {
  return value == null ? '' : String(value);
}

/** Reactive-forms error keys in display priority order. */
const CVA_KEY_ORDER = [
  'required',
  'email',
  'min',
  'max',
  'minlength',
  'maxlength',
  'pattern',
] as const;

function messageForCvaErrors(
  errors: ValidationErrors,
  messages: OgeInputsMessages,
): string {
  for (const key of CVA_KEY_ORDER) {
    if (!(key in errors)) continue;
    const detail = errors[key] as Record<string, unknown> | boolean;
    switch (key) {
      case 'required':
        return messages.requiredError;
      case 'email':
        return messages.emailError;
      case 'min':
        return formatPattern(messages.minError, {
          min: str((detail as Record<string, unknown>)['min']),
        });
      case 'max':
        return formatPattern(messages.maxError, {
          max: str((detail as Record<string, unknown>)['max']),
        });
      case 'minlength':
        return formatPattern(messages.minLengthError, {
          requiredLength: str(
            (detail as Record<string, unknown>)['requiredLength'],
          ),
        });
      case 'maxlength':
        return formatPattern(messages.maxLengthError, {
          requiredLength: str(
            (detail as Record<string, unknown>)['requiredLength'],
          ),
        });
      case 'pattern':
        return messages.patternError;
    }
  }
  const firstKey = Object.keys(errors)[0];
  if (firstKey === undefined) return messages.invalidError;
  const value = errors[firstKey];
  return typeof value === 'string' ? value : messages.invalidError;
}

/**
 * Resolves the single error message a field displays. Signal Forms errors win
 * over reactive-forms errors; an explicit `message` on a signal-forms error
 * wins over the kind→message map.
 */
export function resolveErrorMessage(
  sfErrors: readonly OgeFieldError[],
  cvaErrors: ValidationErrors | null,
  messages: OgeInputsMessages,
): string | null {
  const first = sfErrors[0];
  if (first) return first.message ?? messageForFieldError(first, messages);
  if (cvaErrors && Object.keys(cvaErrors).length > 0) {
    return messageForCvaErrors(cvaErrors, messages);
  }
  return null;
}
