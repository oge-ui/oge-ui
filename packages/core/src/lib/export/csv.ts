export interface CsvColumn<T = unknown> {
  caption: string;
  accessor: (row: T) => unknown;
  /** Optional text formatter (falls back to `String(value)`). */
  format?: (value: unknown) => string;
}

export interface CsvOptions {
  /** Field separator. Default `,`. */
  separator?: string;
  /** Prefix with a UTF-8 BOM so Excel detects the encoding. Default true. */
  bom?: boolean;
  /** Include the caption header row. Default true. */
  header?: boolean;
}

function escapeCell(text: string, separator: string): string {
  if (
    text.includes(separator) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Builds RFC 4180-style CSV output from rows + column definitions. */
export function buildCsv<T>(
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
  options: CsvOptions = {},
): string {
  const separator = options.separator ?? ',';
  const lines: string[] = [];
  if (options.header !== false) {
    lines.push(
      columns
        .map((column) => escapeCell(column.caption, separator))
        .join(separator),
    );
  }
  for (const row of rows) {
    lines.push(
      columns
        .map((column) => {
          const value = column.accessor(row);
          const text =
            value == null
              ? ''
              : column.format
                ? column.format(value)
                : String(value);
          return escapeCell(text, separator);
        })
        .join(separator),
    );
  }
  const body = lines.join('\r\n');
  return options.bom === false ? body : `\uFEFF${body}`;
}
