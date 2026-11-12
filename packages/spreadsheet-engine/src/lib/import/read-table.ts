/**
 * The import wizard's reader: CSV / TSV text or an xlsx workbook, turned into
 * plain rows of values. Dates in a workbook arrive as `Date` (a number cell
 * with a date format); CSV cells stay text until a field's type converts them.
 */
import {
  isOgeCellError,
  isOgeRichText,
  ogeRichTextToString,
} from '../model/cell';
import { ogeSerialToDate } from '../date/date-serial';
import {
  isOgeDateFormat,
  ogeBuiltinNumberFormat,
} from '../format/number-format';
import { readOgeXlsx } from '../codec/read-xlsx';
import type { OgeWorkbook } from '../model/workbook';
import type { OgeWorksheet } from '../model/worksheet';

/** One cell as the wizard sees it. */
export type OgeImportCellValue = string | number | boolean | Date | null;

/** A sheet (or the whole CSV file) as rows of values. */
export interface OgeImportSheet {
  readonly name: string;
  readonly rows: readonly (readonly OgeImportCellValue[])[];
}

/** What {@link ogeReadImportFile} read. */
export interface OgeImportBook {
  readonly format: 'csv' | 'xlsx';
  readonly sheets: readonly OgeImportSheet[];
}

export interface OgeReadImportOptions {
  /** The file name; `.csv` / `.tsv` / `.txt` force text, `.xlsx` a workbook. */
  readonly name?: string;
  /** The CSV delimiter; detected from the first lines when omitted. */
  readonly delimiter?: string;
  /** Rows read per sheet at most (default 100 000). */
  readonly maxRows?: number;
}

const DEFAULT_MAX_ROWS = 100_000;
const DELIMITERS = [',', ';', '\t', '|'];

/**
 * The delimiter that splits the first lines most consistently: the candidate
 * with the same, highest count of separators outside quotes on each line.
 */
export function ogeDetectCsvDelimiter(text: string): string {
  const lines = text
    .split(/\r\n|\n|\r/)
    .filter(Boolean)
    .slice(0, 10);
  let best = ',';
  let bestScore = 0;
  for (const delimiter of DELIMITERS) {
    const counts = lines.map((line) => {
      let n = 0;
      let quoted = false;
      for (const char of line) {
        if (char === '"') quoted = !quoted;
        else if (char === delimiter && !quoted) n++;
      }
      return n;
    });
    const first = counts[0] ?? 0;
    if (first === 0) continue;
    const consistent = counts.filter((n) => n === first).length;
    const score = consistent * 1000 + first;
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }
  return best;
}

/**
 * RFC 4180 CSV: quoted fields with doubled quotes and line breaks, CRLF / LF /
 * CR line ends, a leading byte-order mark dropped. Blank lines are skipped.
 */
export function ogeParseCsv(
  text: string,
  options: { readonly delimiter?: string; readonly maxRows?: number } = {},
): string[][] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const delimiter = options.delimiter ?? ogeDetectCsvDelimiter(source);
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let fieldStarted = false;
  const endRow = () => {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
    field = '';
    fieldStarted = false;
  };
  for (let i = 0; i < source.length && rows.length < maxRows; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"' && !fieldStarted) {
      quoted = true;
      fieldStarted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
      fieldStarted = false;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      endRow();
    } else {
      field += char;
      fieldStarted = true;
    }
  }
  if ((field !== '' || row.length) && rows.length < maxRows) endRow();
  return rows;
}

/** UTF-8 when the bytes are valid UTF-8, otherwise Windows-1252 (Excel's "CSV"). */
function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

const isZip = (bytes: Uint8Array) =>
  bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b;

async function bytesOf(
  source: Blob | ArrayBuffer | Uint8Array,
): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (typeof source.arrayBuffer === 'function') {
    return new Uint8Array(await source.arrayBuffer());
  }
  // older DOM shims (jsdom) have Blob without arrayBuffer()
  return new Uint8Array(
    await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(source);
    }),
  );
}

/** The rows of one worksheet, dates as `Date`, formulas as their last value. */
export function ogeImportSheetRows(
  workbook: OgeWorkbook,
  sheet: OgeWorksheet,
  maxRows = DEFAULT_MAX_ROWS,
): OgeImportCellValue[][] {
  const range = sheet.usedRange();
  if (!range) return [];
  const rows: OgeImportCellValue[][] = [];
  const bottom = Math.min(range.bottom, range.top + maxRows - 1);
  for (let r = range.top; r <= bottom; r++) {
    const row: OgeImportCellValue[] = [];
    for (let c = range.left; c <= range.right; c++) {
      const cell = sheet.getCell(r, c);
      const value = cell?.value;
      if (value === undefined || isOgeCellError(value)) row.push(null);
      else if (isOgeRichText(value)) row.push(ogeRichTextToString(value));
      else if (typeof value === 'number') {
        const style = workbook.styles.get(cell?.style);
        const code =
          style.numberFormat ??
          (style.numberFormatId !== undefined
            ? ogeBuiltinNumberFormat(style.numberFormatId)
            : undefined);
        const date =
          code && isOgeDateFormat(code)
            ? ogeSerialToDate(value, workbook.dateSystem)
            : null;
        row.push(date ?? value);
      } else row.push(value);
    }
    // trailing blank rows inside the used range carry no data
    rows.push(row);
  }
  while (
    rows.length &&
    rows[rows.length - 1].every((v) => v === null || v === '')
  ) {
    rows.pop();
  }
  return rows;
}

/**
 * Reads a CSV / TSV file or an xlsx workbook into sheets of rows. The format
 * follows the name's extension, else the bytes (a ZIP is a workbook).
 */
export async function ogeReadImportFile(
  source: Blob | ArrayBuffer | Uint8Array,
  options: OgeReadImportOptions = {},
): Promise<OgeImportBook> {
  const bytes = await bytesOf(source);
  const own = (source as { name?: unknown }).name;
  const name = options.name ?? (typeof own === 'string' ? own : '');
  const extension = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const text =
    extension === 'csv' || extension === 'tsv' || extension === 'txt';
  if (!text && (extension === 'xlsx' || extension === 'xlsm' || isZip(bytes))) {
    const { workbook } = await readOgeXlsx(bytes);
    return {
      format: 'xlsx',
      sheets: workbook.sheets
        .filter((sheet) => sheet.state === 'visible')
        .map((sheet) => ({
          name: sheet.name,
          rows: ogeImportSheetRows(workbook, sheet, maxRows),
        })),
    };
  }
  const content = decodeText(bytes);
  return {
    format: 'csv',
    sheets: [
      {
        name: name.replace(/\.[^.]*$/, '') || 'CSV',
        rows: ogeParseCsv(content, {
          delimiter:
            options.delimiter ?? (extension === 'tsv' ? '\t' : undefined),
          maxRows,
        }),
      },
    ],
  };
}
