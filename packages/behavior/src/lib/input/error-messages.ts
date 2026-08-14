import type { OgeInputsMessages } from './input-config';
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

/**
 * The kind→message map for a field error, shared by both render layers. An
 * explicit `message` on the error wins over the map (callers check first).
 * The Angular package layers its reactive-forms (`ValidationErrors`) branch
 * on top; React fields carry only this shape.
 */
export function messageForFieldError(
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
