import type { OgeDataType } from './column';

/**
 * Shared date formatter: constructing Intl.DateTimeFormat is expensive, and
 * `Date.toLocaleDateString()` builds one per call — a real cost when
 * thousands of date cells render. One cached instance formats them all.
 */
let dateFormatter: Intl.DateTimeFormat | undefined;

function formatDate(value: Date): string {
  dateFormatter ??= new Intl.DateTimeFormat();
  return dateFormatter.format(value);
}

/** Default cell text when no `*ogeCellTemplate` and no custom `format` is given. */
export function formatCellValue(
  value: unknown,
  dataType: OgeDataType,
  format?: (value: unknown) => string,
): string {
  if (format) return format(value);
  if (value == null) return '';
  switch (dataType) {
    case 'boolean':
      return value ? '✓' : '✗';
    case 'date':
      return value instanceof Date ? formatDate(value) : String(value);
    default:
      return String(value);
  }
}
