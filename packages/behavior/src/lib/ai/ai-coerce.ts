import { toLocalDate } from '@oge-ui/core';

/** A value a field may take: a primitive, or a choice with its display text. */
export interface OgeAiChoice {
  readonly value: string | number | boolean;
  readonly text?: string;
}

/** Upper bound on a string a model may write into a field. */
const MAX_TEXT = 10_000;

/**
 * Coerces one value a model wrote to the type a field holds — the one rule
 * every AI feature applies before anything reaches a component.
 *
 * Choices win first: the model may answer with a choice's value or its text
 * (case-insensitive), and the stored value comes back. Then numbers parse
 * (`"1500"` → 1500), booleans accept `true` / `false` and their strings, dates
 * parse as **local** days through core's `toLocalDate` (never `Date.parse`,
 * which reads `YYYY-MM-DD` as UTC), and strings are bounded. `undefined` means
 * the value does not fit — the caller drops it and reports why.
 */
export function coerceOgeAiValue(
  dataType: string,
  raw: unknown,
  choices?: readonly OgeAiChoice[],
): unknown {
  if (choices?.length) {
    const match = choices.find(
      (c) =>
        c.value === raw ||
        (typeof raw === 'string' &&
          (String(c.value).toLowerCase() === raw.toLowerCase() ||
            c.text?.toLowerCase() === raw.toLowerCase())),
    );
    if (match) return match.value;
  }
  switch (dataType) {
    case 'number': {
      const n =
        typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
      return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
    }
    case 'boolean':
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return undefined;
    case 'date':
    case 'datetime':
      return toLocalDate(raw) ?? undefined;
    case 'string':
      return typeof raw === 'string' || typeof raw === 'number'
        ? String(raw).slice(0, MAX_TEXT)
        : undefined;
    default:
      return undefined;
  }
}
