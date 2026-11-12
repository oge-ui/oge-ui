/**
 * Import fields: what a record needs, how file columns map onto it, and how a
 * cell becomes a typed, validated value.
 */
import { foldText } from '@oge-ui/core';
import type { OgeImportCellValue } from './read-table';

/** How a field converts its cells. */
export type OgeImportFieldType = 'text' | 'number' | 'date' | 'boolean';

/** One field of the records the wizard produces. */
export interface OgeImportField<T = Record<string, unknown>> {
  /** The record key the value is written to. */
  readonly field: keyof T & string;
  /** Shown in the mapping step. */
  readonly label: string;
  /** A row without a value for it is invalid. */
  readonly required?: boolean;
  /** Conversion of the cell. Default `'text'`. */
  readonly type?: OgeImportFieldType;
  /** Other header texts that map to this field automatically. */
  readonly aliases?: readonly string[];
  /** A further check: return a message to reject the value. */
  readonly validate?: (
    value: unknown,
    record: Partial<T>,
  ) => string | null | undefined;
}

/** Parsing choices for text cells. */
export interface OgeImportParseOptions {
  /** `.` or `,`; detected per cell when omitted. */
  readonly decimalSeparator?: '.' | ',';
  /** Order of day, month and year in `1/2/2026`-style dates. Default `'dmy'`. */
  readonly dateOrder?: 'dmy' | 'mdy' | 'ymd';
  /** Extra words for `true` / `false` (folded; `yes`, `no`, `1`, `0`… always work). */
  readonly booleanWords?: {
    readonly true?: readonly string[];
    readonly false?: readonly string[];
  };
}

/** The validation text, `{field}` being the field's label. */
export interface OgeImportValidationMessages {
  readonly required: string;
  readonly invalidNumber: string;
  readonly invalidDate: string;
  readonly invalidBoolean: string;
}

export const OGE_DEFAULT_IMPORT_VALIDATION_MESSAGES: OgeImportValidationMessages =
  {
    required: '{field} is required',
    invalidNumber: '{field} must be a number',
    invalidDate: '{field} must be a date',
    invalidBoolean: '{field} must be yes or no',
  };

/** A rejected value of a row. */
export interface OgeImportCellError {
  readonly field: string;
  /** The file column the value came from, `-1` for a required field left unmapped. */
  readonly column: number;
  readonly message: string;
}

/** A converted row: its record and what is wrong with it. */
export interface OgeImportRowResult<T = Record<string, unknown>> {
  /** 0-based data row (after the header row). */
  readonly index: number;
  readonly record: Partial<T>;
  readonly errors: readonly OgeImportCellError[];
}

const key = (text: string) => foldText(text).replace(/[\s_\-.]+/g, '');

/**
 * Maps each column to a field by header text: the field key, its label or an
 * alias, ignoring case, accents, spaces, `_`, `-` and `.`. A field is used
 * once; unmatched columns map to `null`.
 */
export function ogeAutoMapColumns(
  headers: readonly string[],
  fields: readonly OgeImportField<never>[],
): (string | null)[] {
  const used = new Set<string>();
  return headers.map((header) => {
    const wanted = key(header);
    if (!wanted) return null;
    const match = fields.find(
      (f) =>
        !used.has(f.field) &&
        [f.field, f.label, ...(f.aliases ?? [])].some((t) => key(t) === wanted),
    );
    if (!match) return null;
    used.add(match.field);
    return match.field;
  });
}

const TRUE_WORDS = [
  'true',
  'yes',
  'y',
  '1',
  'x',
  'on',
  'evet',
  'ja',
  'oui',
  'si',
  'sí',
];
const FALSE_WORDS = [
  'false',
  'no',
  'n',
  '0',
  'off',
  'hayir',
  'hayır',
  'nein',
  'non',
];

function parseNumber(text: string, decimal?: '.' | ','): number | null {
  let s = text.replace(/[\s\u00a0\u202f']/g, '');
  const percent = s.endsWith('%');
  if (percent) s = s.slice(0, -1);
  if (!s) return null;
  let separator = decimal;
  if (!separator) {
    const dot = s.lastIndexOf('.');
    const comma = s.lastIndexOf(',');
    if (dot >= 0 && comma >= 0) separator = dot > comma ? '.' : ',';
    else if (comma >= 0) {
      // one comma not followed by exactly three digits is a decimal comma
      separator = s.indexOf(',') === comma && !/,\d{3}$/.test(s) ? ',' : '.';
    } else separator = '.';
  }
  const group = separator === '.' ? ',' : '.';
  s = s.split(group).join('');
  if (separator === ',') s = s.replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null;
  const value = Number(s);
  return percent ? value / 100 : value;
}

function validDate(y: number, m: number, d: number, h = 0, min = 0, sec = 0) {
  const date = new Date(y, m - 1, d, h, min, sec);
  return date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
    ? date
    : null;
}

function parseDate(text: string, order: 'dmy' | 'mdy' | 'ymd'): Date | null {
  const s = text.trim();
  const iso =
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(
      s,
    );
  if (iso) {
    if (iso[7]) {
      const date = new Date(s.replace(' ', 'T'));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return validDate(
      +iso[1],
      +iso[2],
      +iso[3],
      +(iso[4] ?? 0),
      +(iso[5] ?? 0),
      +(iso[6] ?? 0),
    );
  }
  const parts =
    /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(
      s,
    );
  if (!parts) return null;
  const [a, b, c] = [+parts[1], +parts[2], +parts[3]];
  const time = [+(parts[4] ?? 0), +(parts[5] ?? 0), +(parts[6] ?? 0)] as const;
  const year = (n: number) => (n < 100 ? 2000 + n : n);
  if (parts[1].length === 4 || order === 'ymd') {
    return validDate(year(a), b, c, ...time);
  }
  return order === 'mdy'
    ? validDate(year(c), a, b, ...time)
    : validDate(year(c), b, a, ...time);
}

/**
 * Converts a cell for a field type: `{ value }` when it converts, `{ error }`
 * (a message key) when it does not, `{ value: null }` for an empty cell.
 */
export function ogeConvertImportValue(
  raw: OgeImportCellValue | undefined,
  type: OgeImportFieldType = 'text',
  options: OgeImportParseOptions = {},
): { value: unknown; error?: keyof OgeImportValidationMessages } {
  if (raw === null || raw === undefined) return { value: null };
  if (typeof raw === 'string' && raw.trim() === '') return { value: null };
  switch (type) {
    case 'number': {
      if (typeof raw === 'number') return { value: raw };
      if (typeof raw === 'boolean' || raw instanceof Date) {
        return { value: null, error: 'invalidNumber' };
      }
      const value = parseNumber(raw, options.decimalSeparator);
      return value === null
        ? { value: null, error: 'invalidNumber' }
        : { value };
    }
    case 'date': {
      if (raw instanceof Date) return { value: raw };
      if (typeof raw !== 'string') return { value: null, error: 'invalidDate' };
      const value = parseDate(raw, options.dateOrder ?? 'dmy');
      return value ? { value } : { value: null, error: 'invalidDate' };
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return { value: raw };
      const word = foldText(String(raw).trim());
      const yes = [...TRUE_WORDS, ...(options.booleanWords?.true ?? [])].map(
        foldText,
      );
      const no = [...FALSE_WORDS, ...(options.booleanWords?.false ?? [])].map(
        foldText,
      );
      if (yes.includes(word)) return { value: true };
      if (no.includes(word)) return { value: false };
      return { value: null, error: 'invalidBoolean' };
    }
    default:
      if (raw instanceof Date) return { value: raw.toISOString() };
      return { value: typeof raw === 'string' ? raw.trim() : String(raw) };
  }
}

/**
 * Converts and checks data rows under a column → field mapping: types first,
 * then `required`, then each field's own `validate`.
 */
export function ogeValidateImportRows<T = Record<string, unknown>>(
  rows: readonly (readonly OgeImportCellValue[])[],
  mapping: readonly (string | null)[],
  fields: readonly OgeImportField<T>[],
  options: OgeImportParseOptions & {
    readonly messages?: OgeImportValidationMessages;
  } = {},
): OgeImportRowResult<T>[] {
  const messages = options.messages ?? OGE_DEFAULT_IMPORT_VALIDATION_MESSAGES;
  const columnOf = new Map<string, number>();
  mapping.forEach((field, column) => {
    if (field !== null) columnOf.set(field, column);
  });
  const say = (template: string, label: string) =>
    template.replace('{field}', label);
  return rows.map((row, index) => {
    const record: Record<string, unknown> = {};
    const errors: OgeImportCellError[] = [];
    for (const field of fields) {
      const column = columnOf.get(field.field) ?? -1;
      if (column < 0) continue;
      const { value, error } = ogeConvertImportValue(
        row[column],
        field.type,
        options,
      );
      if (error) {
        errors.push({
          field: field.field,
          column,
          message: say(messages[error], field.label),
        });
      } else record[field.field] = value;
    }
    for (const field of fields) {
      if (errors.some((e) => e.field === field.field)) continue;
      const column = columnOf.get(field.field) ?? -1;
      const value = record[field.field];
      if (field.required && (value === null || value === undefined)) {
        errors.push({
          field: field.field,
          column,
          message: say(messages.required, field.label),
        });
        continue;
      }
      if (field.validate && value !== null && value !== undefined) {
        const message = field.validate(value, record as Partial<T>);
        if (message) errors.push({ field: field.field, column, message });
      }
    }
    return { index, record: record as Partial<T>, errors };
  });
}
