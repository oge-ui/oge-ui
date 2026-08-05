import type { OgeDataType } from './column';

/** Default cell text when no `*ogeCellTemplate` and no custom `format` is given. */
export function formatCellValue(
  value: unknown,
  dataType: OgeDataType,
  format?: (value: unknown) => string
): string {
  if (format) return format(value);
  if (value == null) return '';
  switch (dataType) {
    case 'boolean':
      return value ? '✓' : '✗';
    case 'date':
      return value instanceof Date ? value.toLocaleDateString() : String(value);
    default:
      return String(value);
  }
}
