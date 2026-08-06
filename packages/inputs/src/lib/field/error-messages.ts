import type { ValidationErrors } from '@angular/forms';
import type { OgeInputsMessages } from '../config';
import type { OgeFieldError } from './input-types';

/** `{token}` interpolation — same contract as the grid's message patterns. */
export function formatPattern(
  pattern: string,
  values: Record<string, string>,
): string {
  return pattern.replace(
    /\{(\w+)\}/g,
    (match, key: string) => values[key] ?? match,
  );
}

function str(value: unknown): string {
  return value == null ? '' : String(value);
}

function messageForKind(
  error: OgeFieldError,
  messages: OgeInputsMessages,
): string {
  const detail = error as unknown as Record<string, unknown>;
  switch (error.kind) {
    case 'required':
      return messages.requiredError;
    case 'email':
      return messages.emailError;
    case 'min':
      return formatPattern(messages.minError, { min: str(detail['min']) });
    case 'max':
      return formatPattern(messages.maxError, { max: str(detail['max']) });
    case 'minLength':
      return formatPattern(messages.minLengthError, {
        requiredLength: str(detail['minLength']),
      });
    case 'maxLength':
      return formatPattern(messages.maxLengthError, {
        requiredLength: str(detail['maxLength']),
      });
    case 'pattern':
      return messages.patternError;
    default:
      return error.message ?? messages.invalidError;
  }
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
  if (first) return first.message ?? messageForKind(first, messages);
  if (cvaErrors && Object.keys(cvaErrors).length > 0) {
    return messageForCvaErrors(cvaErrors, messages);
  }
  return null;
}
