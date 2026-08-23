/**
 * The declarative rule evaluator — one implementation, both render layers
 * (ADR 0001). It produces `OgeFieldError`s rather than strings, so the message
 * table stays the inputs package's single one: whatever renders the error runs
 * it through `messageForFieldError`, and an Angular field and a React field
 * therefore cannot word the same failure differently.
 *
 * Only the **synchronous** rules live here. An `async` rule is a promise the
 * application owns; each layer schedules it with its own primitive (Angular a
 * `resource`, React an effect) and surfaces the resolved string as-is, so
 * there is no semantic to share beyond "the returned message wins".
 */
import type { OgeFieldError } from '../input/input-types';
import type { OgeValidationContext, OgeValidationRule } from './form-types';

/** An error carrying the bound the message pattern interpolates. */
type RuleError = OgeFieldError & Record<string, unknown>;

/**
 * Whether a value counts as "not filled in". Only `required` looks at this —
 * every other rule passes an empty field, so a form does not shout about
 * format before anything has been typed.
 */
export function isEmptyFormValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) {
    return value.length === 0 || value.every((entry) => entry == null);
  }
  return false;
}

// Deliberately the same shape the inputs package validates an email with.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function evaluateRule(
  rule: OgeValidationRule,
  value: unknown,
  data: Record<string, unknown>,
): RuleError | null {
  if (rule.type === 'custom') {
    const context: OgeValidationContext = { value, data };
    const message = rule.validate(context);
    return message ? { kind: 'custom', message } : null;
  }
  // an async rule is scheduled by the render layer, never evaluated here
  if (rule.type === 'async') return null;

  if (rule.type === 'required') {
    return isEmptyFormValue(value)
      ? { kind: 'required', message: rule.message }
      : null;
  }
  // every other rule passes an empty field — `required` is what demands one
  if (isEmptyFormValue(value)) return null;

  switch (rule.type) {
    case 'email':
      return EMAIL.test(String(value))
        ? null
        : { kind: 'email', message: rule.message };
    case 'numeric': {
      const numeric = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(numeric)) {
        return { kind: 'invalidNumber', message: rule.message };
      }
      if (rule.min !== undefined && numeric < rule.min) {
        return { kind: 'min', min: rule.min, message: rule.message };
      }
      if (rule.max !== undefined && numeric > rule.max) {
        return { kind: 'max', max: rule.max, message: rule.message };
      }
      return null;
    }
    case 'stringLength': {
      const length = Array.isArray(value) ? value.length : String(value).length;
      if (rule.min !== undefined && length < rule.min) {
        return {
          kind: 'minLength',
          minLength: rule.min,
          message: rule.message,
        };
      }
      if (rule.max !== undefined && length > rule.max) {
        return {
          kind: 'maxLength',
          maxLength: rule.max,
          message: rule.message,
        };
      }
      return null;
    }
    case 'pattern':
      // a fresh matcher per call: a `g`-flagged RegExp carries `lastIndex`
      // between tests, which would make the same value pass and fail in turn
      return new RegExp(
        rule.pattern.source,
        rule.pattern.flags.replace('g', ''),
      ).test(String(value))
        ? null
        : { kind: 'pattern', message: rule.message };
    case 'range': {
      const date = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(date.getTime())) {
        return { kind: 'invalidDate', message: rule.message };
      }
      if (rule.min !== undefined && date.getTime() < rule.min.getTime()) {
        return { kind: 'min', min: rule.min, message: rule.message };
      }
      if (rule.max !== undefined && date.getTime() > rule.max.getTime()) {
        return { kind: 'max', max: rule.max, message: rule.message };
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Every synchronous rule that fails for `value`, in declaration order. `data`
 * is the whole model, which is how a `custom` rule reaches another field.
 */
export function evaluateOgeValidationRules(
  value: unknown,
  data: Record<string, unknown>,
  rules: readonly OgeValidationRule[],
  isRequired = false,
): readonly OgeFieldError[] {
  const errors: OgeFieldError[] = [];
  if (isRequired && !rules.some((rule) => rule.type === 'required')) {
    const missing = evaluateRule({ type: 'required' }, value, data);
    if (missing) errors.push(missing);
  }
  for (const rule of rules) {
    const error = evaluateRule(rule, value, data);
    if (error) errors.push(error);
  }
  return errors;
}

/** The async rules of an item, in declaration order. */
export function asyncValidationRules(
  rules: readonly OgeValidationRule[],
): readonly Extract<OgeValidationRule, { type: 'async' }>[] {
  return rules.filter(
    (rule): rule is Extract<OgeValidationRule, { type: 'async' }> =>
      rule.type === 'async',
  );
}
