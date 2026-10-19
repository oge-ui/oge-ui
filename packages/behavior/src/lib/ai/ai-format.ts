import { ogeDateTimeFormat, ogeNumberFormat } from '@oge-ui/core';
import type { OgeAiChoice } from './ai-coerce';

/** How {@link formatOgeAiValue} renders a value. */
export interface OgeAiFormatOptions {
  readonly dataType?: string;
  readonly values?: readonly OgeAiChoice[];
  readonly locale?: string;
  /** Words for booleans. */
  readonly yes: string;
  readonly no: string;
  /** Text for an empty value. */
  readonly empty: string;
}

/**
 * Display text of a value an AI feature produced or will write: a choice's
 * text, dates and numbers in the locale (core's Intl cache), booleans as
 * words, lists joined — the one rule smart paste's table and AI cells share.
 */
export function formatOgeAiValue(
  value: unknown,
  options: OgeAiFormatOptions,
): string {
  const one = (item: unknown): string => {
    const choice = options.values?.find((v) => v.value === item);
    if (choice) return choice.text ?? String(choice.value);
    if (item instanceof Date) {
      return ogeDateTimeFormat(
        options.locale,
        options.dataType === 'datetime'
          ? { dateStyle: 'medium', timeStyle: 'short' }
          : { dateStyle: 'medium' },
      ).format(item);
    }
    if (typeof item === 'number') {
      return ogeNumberFormat(options.locale).format(item);
    }
    if (typeof item === 'boolean') return item ? options.yes : options.no;
    return item == null ? '' : String(item);
  };
  const text = Array.isArray(value) ? value.map(one).join(', ') : one(value);
  return text === '' ? options.empty : text;
}
