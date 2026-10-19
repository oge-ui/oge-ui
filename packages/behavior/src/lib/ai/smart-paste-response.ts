import { isUnsafeStateKey } from '@oge-ui/core';
import { coerceOgeAiValue } from './ai-coerce';
import {
  isOgeSmartPasteFillable,
  type OgeAiFormField,
} from './smart-paste-context';

/** Why a value of a smart-paste reply was dropped. */
export type OgeSmartPasteWarningKind =
  'unknown-field' | 'not-allowed' | 'invalid-value';

/** One dropped value. */
export interface OgeSmartPasteWarning {
  readonly kind: OgeSmartPasteWarningKind;
  readonly field: string;
}

/** One field a smart paste would change. */
export interface OgeSmartPasteChange {
  readonly field: string;
  readonly label: string;
  /** What the form holds now. */
  readonly previous: unknown;
  /** The validated value from the text. */
  readonly next: unknown;
}

/**
 * The validated outcome of one smart-paste reply.
 *
 * - `change` — `values` holds only fields whose value differs from the form's
 *   (`changes` lists them in field order); may be empty (`unchanged`).
 * - `unsupported` — nothing in the text fits the form.
 * - `invalid` — the reply was not a usable object.
 */
export type OgeSmartPasteResult =
  | {
      readonly kind: 'change';
      readonly summary: string;
      readonly values: Readonly<Record<string, unknown>>;
      readonly changes: readonly OgeSmartPasteChange[];
      readonly warnings: readonly OgeSmartPasteWarning[];
    }
  | { readonly kind: 'unsupported'; readonly summary: string }
  | { readonly kind: 'invalid' };

const MAX_LIST = 200;
const MAX_SUMMARY = 400;

type Plain = Record<string, unknown>;

function isPlain(value: unknown): value is Plain {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function same(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    return (
      a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
    );
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, i) => same(item, b[i]))
    );
  }
  return Object.is(a, b) || (a == null && b == null);
}

/** One value: coerced to the type, and — for a choice field — one of its choices. */
function coerceOne(field: OgeAiFormField, type: string, raw: unknown): unknown {
  const value = coerceOgeAiValue(type, raw, field.values);
  if (value === undefined || !field.values?.length) return value;
  return field.values.some((choice) => choice.value === value)
    ? value
    : undefined;
}

function coerce(field: OgeAiFormField, raw: unknown): unknown {
  const list = field.multiple || field.dataType === 'array';
  if (!list) return coerceOne(field, field.dataType, raw);
  const itemType = field.dataType === 'array' ? 'string' : field.dataType;
  const items = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  if (items.length > MAX_LIST) return undefined;
  const out = items.map((item) => coerceOne(field, itemType, item));
  return out.some((item) => item === undefined) ? undefined : out;
}

/**
 * Validates a parsed smart-paste reply against the form's fields.
 *
 * `fields` carry the current value (`value`) so the result can say what
 * changes; it is never sent to the model. A value only reaches the form when
 * its field exists, is writable and the value coerces to the field's type
 * (`coerceOgeAiValue`); everything else becomes a warning.
 */
export function resolveOgeSmartPasteReply(
  reply: unknown,
  fields: readonly (OgeAiFormField & { readonly value?: unknown })[],
): OgeSmartPasteResult {
  if (!isPlain(reply)) return { kind: 'invalid' };
  const summary =
    typeof reply['summary'] === 'string'
      ? reply['summary'].trim().slice(0, MAX_SUMMARY)
      : '';
  if (reply['status'] === 'unsupported')
    return { kind: 'unsupported', summary };
  const raw = reply['values'];
  if (!isPlain(raw)) return { kind: 'invalid' };

  const byField = new Map(fields.map((f) => [f.field, f]));
  const warnings: OgeSmartPasteWarning[] = [];
  const values: Record<string, unknown> = {};
  const changes: OgeSmartPasteChange[] = [];
  for (const key of Object.keys(raw)) {
    const field = isUnsafeStateKey(key) ? undefined : byField.get(key);
    if (!field) {
      warnings.push({ kind: 'unknown-field', field: key });
      continue;
    }
    if (!isOgeSmartPasteFillable(field)) {
      warnings.push({ kind: 'not-allowed', field: key });
      continue;
    }
    const input = raw[key];
    if (input === null || input === undefined || input === '') continue;
    const next = coerce(field, input);
    if (next === undefined) {
      warnings.push({ kind: 'invalid-value', field: key });
      continue;
    }
    if (same(next, field.value)) continue;
    values[field.field] = next;
  }
  // changes in the form's own field order, not the model's key order
  for (const field of fields) {
    if (field.field in values) {
      changes.push({
        field: field.field,
        label: field.label,
        previous: field.value,
        next: values[field.field],
      });
    }
  }
  return { kind: 'change', summary, values, changes, warnings };
}
