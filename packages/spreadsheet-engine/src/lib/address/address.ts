/**
 * A1 and R1C1 cell addresses, ranges and their arithmetic.
 *
 * Coordinates are **zero-based** everywhere in the engine: row 0 is Excel's
 * row 1, column 0 is column `A`. Only the text forms (`A1`, `R1C1`) are
 * one-based, because that is what Excel writes. Ranges are inclusive edges
 * (`top`/`left`/`bottom`/`right`), the same shape as the data grid's
 * `OgeGridRangeBounds`, so the two components speak one coordinate language.
 *
 * Every parser here reads untrusted text (formulas, defined names, pasted
 * references, file content): it scans character by character, never throws
 * and returns `null` for anything that is not a reference.
 */

/** Rows in an Excel 2007+ worksheet (1,048,576). */
export const OGE_SHEET_MAX_ROWS = 1_048_576;

/** Columns in an Excel 2007+ worksheet (16,384 — the last one is `XFD`). */
export const OGE_SHEET_MAX_COLUMNS = 16_384;

/** A cell position, zero-based. */
export interface OgeCellRef {
  readonly row: number;
  readonly col: number;
}

/** A cell position plus the `$` anchors it was written with. */
export interface OgeCellAddress extends OgeCellRef {
  /** `$` before the row number (`A$1`). */
  readonly rowAbsolute: boolean;
  /** `$` before the column letters (`$A1`). */
  readonly colAbsolute: boolean;
}

/** A rectangular block of cells as inclusive, zero-based edges. */
export interface OgeSheetRange {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
}

/**
 * What a reference spells: one cell (`B2`), a block (`B2:D9`), whole columns
 * (`B:D`) or whole rows (`2:9`).
 */
export type OgeReferenceKind = 'cell' | 'range' | 'columns' | 'rows';

/**
 * A parsed reference: the block it covers, the anchors of each edge and the
 * optional sheet prefix. Edges are normalised (`D9:B2` reads as `B2:D9`) and
 * every `$` stays with the coordinate it was written on.
 */
export interface OgeRangeAddress extends OgeSheetRange {
  readonly kind: OgeReferenceKind;
  /** Sheet name without quotes (`'Q1 2026'!A1` → `Q1 2026`). */
  readonly sheet?: string;
  /** Last sheet of a 3-D reference (`Jan:Mar!B2` → `Mar`). */
  readonly lastSheet?: string;
  readonly topAbsolute: boolean;
  readonly leftAbsolute: boolean;
  readonly bottomAbsolute: boolean;
  readonly rightAbsolute: boolean;
}

const CODE_A = 65;
const CODE_Z = 90;
const CODE_LOWER_A = 97;
const CODE_LOWER_Z = 122;
const CODE_0 = 48;
const CODE_9 = 57;
const CODE_DOLLAR = 36;

/** Column letters for a zero-based index: 0 → `A`, 26 → `AA`, 16383 → `XFD`. */
export function ogeColumnName(col: number): string {
  if (!Number.isInteger(col) || col < 0) return '';
  let n = col + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(CODE_A + rem) + name;
    n = (n - rem - 1) / 26;
  }
  return name;
}

/**
 * Zero-based index of column letters, case-insensitive (`XFD` → 16383), or
 * `-1` when the text is not 1–3 letters inside the sheet's 16,384 columns.
 */
export function ogeColumnIndex(name: string): number {
  if (name.length === 0 || name.length > 3) return -1;
  let n = 0;
  for (let i = 0; i < name.length; i++) {
    const letter = letterValue(name.charCodeAt(i));
    if (letter < 0) return -1;
    n = n * 26 + letter + 1;
  }
  return n <= OGE_SHEET_MAX_COLUMNS ? n - 1 : -1;
}

/** `A`–`Z` / `a`–`z` → 0–25, anything else → -1. */
function letterValue(code: number): number {
  if (code >= CODE_A && code <= CODE_Z) return code - CODE_A;
  if (code >= CODE_LOWER_A && code <= CODE_LOWER_Z) return code - CODE_LOWER_A;
  return -1;
}

function isDigit(code: number): boolean {
  return code >= CODE_0 && code <= CODE_9;
}

/** Whether `row`/`col` lie inside a worksheet. */
export function isOgeCellInSheet(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    col >= 0 &&
    row < OGE_SHEET_MAX_ROWS &&
    col < OGE_SHEET_MAX_COLUMNS
  );
}

/** `A1` text for a cell; `$` anchors from the address when it has them. */
export function formatOgeCellAddress(ref: OgeCellRef | OgeCellAddress): string {
  const address = ref as Partial<OgeCellAddress>;
  return (
    (address.colAbsolute ? '$' : '') +
    ogeColumnName(ref.col) +
    (address.rowAbsolute ? '$' : '') +
    String(ref.row + 1)
  );
}

/** A scanned `[$]letters` or `[$]digits` part of an A1 reference. */
interface Part {
  readonly value: number;
  readonly absolute: boolean;
  readonly end: number;
}

/** Reads `[$]A–XFD` from `start`; `null` when no column is there. */
function scanColumn(text: string, start: number): Part | null {
  let i = start;
  let absolute = false;
  if (text.charCodeAt(i) === CODE_DOLLAR) {
    absolute = true;
    i++;
  }
  const from = i;
  while (
    i < text.length &&
    i - from < 4 &&
    letterValue(text.charCodeAt(i)) >= 0
  ) {
    i++;
  }
  const col = ogeColumnIndex(text.slice(from, i));
  return col < 0 ? null : { value: col, absolute, end: i };
}

/** Reads `[$]1–1048576` from `start`; `null` when no row is there. */
function scanRow(text: string, start: number): Part | null {
  let i = start;
  let absolute = false;
  if (text.charCodeAt(i) === CODE_DOLLAR) {
    absolute = true;
    i++;
  }
  const from = i;
  // a leading zero is not a row number Excel writes (`A01` is a name)
  if (text.charCodeAt(i) === CODE_0) return null;
  while (i < text.length && i - from < 8 && isDigit(text.charCodeAt(i))) i++;
  if (i === from) return null;
  const row = Number(text.slice(from, i));
  return row >= 1 && row <= OGE_SHEET_MAX_ROWS
    ? { value: row - 1, absolute, end: i }
    : null;
}

/**
 * Parses one A1 cell (`B7`, `$B$7`, `b7`), or `null`. The whole text must be
 * the address — use {@link parseOgeRangeAddress} for ranges and sheet prefixes.
 */
export function parseOgeCellAddress(text: string): OgeCellAddress | null {
  const col = scanColumn(text, 0);
  if (!col) return null;
  const row = scanRow(text, col.end);
  if (!row || row.end !== text.length) return null;
  return {
    row: row.value,
    col: col.value,
    rowAbsolute: row.absolute,
    colAbsolute: col.absolute,
  };
}

/** An A1 range body after the sheet prefix: cell, block, columns or rows. */
interface Body {
  readonly kind: OgeReferenceKind;
  readonly start: OgeCellAddress;
  readonly end: OgeCellAddress;
}

function parseBody(text: string): Body | null {
  const colon = text.indexOf(':');
  if (colon < 0) {
    const cell = parseOgeCellAddress(text);
    return cell ? { kind: 'cell', start: cell, end: cell } : null;
  }
  if (text.indexOf(':', colon + 1) >= 0) return null;
  const left = text.slice(0, colon);
  const right = text.slice(colon + 1);
  const a = parseOgeCellAddress(left);
  const b = parseOgeCellAddress(right);
  if (a && b) return { kind: 'range', start: a, end: b };
  if (a || b) return null;
  // whole columns (`B:D`, `$B:$D`)
  const ca = scanColumn(left, 0);
  const cb = scanColumn(right, 0);
  if (ca && cb && ca.end === left.length && cb.end === right.length) {
    return {
      kind: 'columns',
      start: {
        row: 0,
        col: ca.value,
        rowAbsolute: false,
        colAbsolute: ca.absolute,
      },
      end: {
        row: OGE_SHEET_MAX_ROWS - 1,
        col: cb.value,
        rowAbsolute: false,
        colAbsolute: cb.absolute,
      },
    };
  }
  // whole rows (`2:9`, `$2:$9`)
  const ra = scanRow(left, 0);
  const rb = scanRow(right, 0);
  if (ra && rb && ra.end === left.length && rb.end === right.length) {
    return {
      kind: 'rows',
      start: {
        row: ra.value,
        col: 0,
        rowAbsolute: ra.absolute,
        colAbsolute: false,
      },
      end: {
        row: rb.value,
        col: OGE_SHEET_MAX_COLUMNS - 1,
        rowAbsolute: rb.absolute,
        colAbsolute: false,
      },
    };
  }
  return null;
}

/** The sheet prefix of a reference, if any, and where the body starts. */
interface Prefix {
  readonly sheet?: string;
  readonly lastSheet?: string;
  readonly bodyStart: number;
}

/**
 * Splits `'My sheet'!`, `Sheet1!` or `Jan:Mar!` off the front. Returns `null`
 * for a malformed prefix (unterminated quote, empty name).
 */
function scanPrefix(text: string): Prefix | null {
  if (text.charCodeAt(0) === 39 /* ' */) {
    let name = '';
    let i = 1;
    for (;;) {
      if (i >= text.length) return null;
      const ch = text[i];
      if (ch === "'") {
        if (text[i + 1] === "'") {
          name += "'";
          i += 2;
          continue;
        }
        break;
      }
      name += ch;
      i++;
    }
    // i is on the closing quote
    if (text[i + 1] !== '!' || name.length === 0) return null;
    const colon = name.indexOf(':');
    // a quoted 3-D prefix spells both names inside one pair of quotes
    if (colon > 0 && colon < name.length - 1) {
      return {
        sheet: name.slice(0, colon),
        lastSheet: name.slice(colon + 1),
        bodyStart: i + 2,
      };
    }
    return { sheet: name, bodyStart: i + 2 };
  }
  const bang = text.lastIndexOf('!');
  if (bang < 0) return { bodyStart: 0 };
  const prefix = text.slice(0, bang);
  if (prefix.length === 0 || !isPlainSheetPrefix(prefix)) return null;
  const colon = prefix.indexOf(':');
  if (colon >= 0) {
    const first = prefix.slice(0, colon);
    const last = prefix.slice(colon + 1);
    if (!first || !last || last.includes(':')) return null;
    return { sheet: first, lastSheet: last, bodyStart: bang + 1 };
  }
  return { sheet: prefix, bodyStart: bang + 1 };
}

/** An unquoted prefix may hold only name characters and one `:`. */
function isPlainSheetPrefix(prefix: string): boolean {
  for (let i = 0; i < prefix.length; i++) {
    const ch = prefix[i];
    if (ch === ':' || ch === '_' || ch === '.') continue;
    if (!NAME_CHAR.test(ch)) return false;
  }
  return true;
}

const NAME_CHAR = /[\p{L}\p{N}]/u;

/**
 * Parses an A1 reference with an optional sheet prefix: `B7`, `B2:D9`, `B:D`,
 * `2:9`, `Sheet1!B2`, `'Q1 2026'!B2:D9`, `Jan:Mar!B2`. Edges are normalised,
 * `$` anchors are kept per edge, and anything else — including a block that
 * leaves the sheet — gives `null`.
 */
export function parseOgeRangeAddress(text: string): OgeRangeAddress | null {
  const prefix = scanPrefix(text);
  if (!prefix) return null;
  const body = parseBody(text.slice(prefix.bodyStart));
  if (!body) return null;
  const { start, end } = body;
  const topFirst = start.row <= end.row;
  const leftFirst = start.col <= end.col;
  const range: OgeRangeAddress = {
    kind: body.kind,
    top: topFirst ? start.row : end.row,
    bottom: topFirst ? end.row : start.row,
    left: leftFirst ? start.col : end.col,
    right: leftFirst ? end.col : start.col,
    topAbsolute: topFirst ? start.rowAbsolute : end.rowAbsolute,
    bottomAbsolute: topFirst ? end.rowAbsolute : start.rowAbsolute,
    leftAbsolute: leftFirst ? start.colAbsolute : end.colAbsolute,
    rightAbsolute: leftFirst ? end.colAbsolute : start.colAbsolute,
  };
  if (prefix.sheet === undefined) return range;
  return prefix.lastSheet === undefined
    ? { ...range, sheet: prefix.sheet }
    : { ...range, sheet: prefix.sheet, lastSheet: prefix.lastSheet };
}

/**
 * Whether a sheet name must be quoted in a reference. Quoting is always legal
 * and a missing quote breaks the formula, so the test errs on the side of
 * quotes: anything but letters, digits and `_`, a leading digit, or a name
 * that reads as a cell (`A1`, `R1C1`, `R`, `C`) or a boolean.
 */
export function ogeSheetNameNeedsQuotes(name: string): boolean {
  if (name.length === 0) return true;
  const first = name[0];
  if (!/[\p{L}_]/u.test(first)) return true;
  for (let i = 1; i < name.length; i++) {
    const ch = name[i];
    if (ch === '_') continue;
    if (!NAME_CHAR.test(ch)) return true;
  }
  return looksLikeReference(name);
}

/** `A1`-, `R1C1`-shaped names and booleans clash with formula syntax. */
function looksLikeReference(name: string): boolean {
  const upper = name.toUpperCase();
  if (upper === 'TRUE' || upper === 'FALSE') return true;
  if (/^[A-Z]{1,3}[0-9]+$/.test(upper)) return true;
  // R1C1 forms: R, C, R12, C3, RC, R2C3
  return /^R[0-9]*(C[0-9]*)?$/.test(upper) || /^C[0-9]*$/.test(upper);
}

/** A sheet name as it appears before `!` — quoted and escaped when needed. */
export function ogeQuoteSheetName(name: string): string {
  return ogeSheetNameNeedsQuotes(name) ? `'${name.replace(/'/g, "''")}'` : name;
}

/**
 * The A1 text of a range address: `B2`, `B2:D9`, `B:D`, `2:9`, with the
 * sheet prefix quoted when needed.
 */
export function formatOgeRangeAddress(address: OgeRangeAddress): string {
  let body: string;
  const start = (row: number, col: number, rowAbs: boolean, colAbs: boolean) =>
    formatOgeCellAddress({
      row,
      col,
      rowAbsolute: rowAbs,
      colAbsolute: colAbs,
    });
  switch (address.kind) {
    case 'columns':
      body =
        (address.leftAbsolute ? '$' : '') +
        ogeColumnName(address.left) +
        ':' +
        (address.rightAbsolute ? '$' : '') +
        ogeColumnName(address.right);
      break;
    case 'rows':
      body =
        (address.topAbsolute ? '$' : '') +
        String(address.top + 1) +
        ':' +
        (address.bottomAbsolute ? '$' : '') +
        String(address.bottom + 1);
      break;
    case 'cell':
      body = start(
        address.top,
        address.left,
        address.topAbsolute,
        address.leftAbsolute,
      );
      break;
    default:
      body =
        start(
          address.top,
          address.left,
          address.topAbsolute,
          address.leftAbsolute,
        ) +
        ':' +
        start(
          address.bottom,
          address.right,
          address.bottomAbsolute,
          address.rightAbsolute,
        );
  }
  if (address.sheet === undefined) return body;
  const sheets =
    address.lastSheet === undefined
      ? address.sheet
      : `${address.sheet}:${address.lastSheet}`;
  // a 3-D prefix is quoted as one unit when either name needs it
  const quoted =
    address.lastSheet === undefined
      ? ogeQuoteSheetName(address.sheet)
      : ogeSheetNameNeedsQuotes(address.sheet) ||
          ogeSheetNameNeedsQuotes(address.lastSheet)
        ? `'${sheets.replace(/'/g, "''")}'`
        : sheets;
  return `${quoted}!${body}`;
}

/** A range covering exactly one cell. */
export function ogeCellRange(row: number, col: number): OgeSheetRange {
  return { top: row, left: col, bottom: row, right: col };
}

/** Normalised bounds of two corners in any order. */
export function ogeRangeFromCorners(
  a: OgeCellRef,
  b: OgeCellRef,
): OgeSheetRange {
  return {
    top: Math.min(a.row, b.row),
    left: Math.min(a.col, b.col),
    bottom: Math.max(a.row, b.row),
    right: Math.max(a.col, b.col),
  };
}

/** Whether the range holds the cell. */
export function ogeRangeContains(
  range: OgeSheetRange,
  row: number,
  col: number,
): boolean {
  return (
    row >= range.top &&
    row <= range.bottom &&
    col >= range.left &&
    col <= range.right
  );
}

/** Whether `outer` holds every cell of `inner`. */
export function ogeRangeContainsRange(
  outer: OgeSheetRange,
  inner: OgeSheetRange,
): boolean {
  return (
    inner.top >= outer.top &&
    inner.bottom <= outer.bottom &&
    inner.left >= outer.left &&
    inner.right <= outer.right
  );
}

/** Whether two ranges share at least one cell. */
export function ogeRangesIntersect(
  a: OgeSheetRange,
  b: OgeSheetRange,
): boolean {
  return (
    a.top <= b.bottom &&
    b.top <= a.bottom &&
    a.left <= b.right &&
    b.left <= a.right
  );
}

/** The cells two ranges share, or `null`. */
export function ogeRangeIntersection(
  a: OgeSheetRange,
  b: OgeSheetRange,
): OgeSheetRange | null {
  if (!ogeRangesIntersect(a, b)) return null;
  return {
    top: Math.max(a.top, b.top),
    left: Math.max(a.left, b.left),
    bottom: Math.min(a.bottom, b.bottom),
    right: Math.min(a.right, b.right),
  };
}

/** The smallest range holding both. */
export function ogeRangeBoundingBox(
  a: OgeSheetRange,
  b: OgeSheetRange,
): OgeSheetRange {
  return {
    top: Math.min(a.top, b.top),
    left: Math.min(a.left, b.left),
    bottom: Math.max(a.bottom, b.bottom),
    right: Math.max(a.right, b.right),
  };
}

/** Rows × columns of a range. */
export function ogeRangeSize(range: OgeSheetRange): {
  readonly rows: number;
  readonly cols: number;
} {
  return {
    rows: range.bottom - range.top + 1,
    cols: range.right - range.left + 1,
  };
}

/**
 * Moves the relative parts of an address by `rows`/`cols` — what Excel does
 * when it copies a formula or expands a shared one. Anchored (`$`) parts stay
 * put. `null` when the result leaves the sheet (Excel's `#REF!`).
 */
export function ogeOffsetCellAddress(
  address: OgeCellAddress,
  rows: number,
  cols: number,
): OgeCellAddress | null {
  const row = address.rowAbsolute ? address.row : address.row + rows;
  const col = address.colAbsolute ? address.col : address.col + cols;
  if (!isOgeCellInSheet(row, col)) return null;
  return { ...address, row, col };
}

/**
 * The R1C1 text of a cell seen from `origin`: anchored parts are absolute
 * (`R3C2`, one-based), relative parts are offsets (`R[1]C[-1]`, `RC` for the
 * origin itself).
 */
export function formatOgeR1C1Address(
  address: OgeCellAddress,
  origin: OgeCellRef,
): string {
  const part = (
    letter: string,
    absolute: boolean,
    value: number,
    base: number,
  ) => {
    if (absolute) return `${letter}${value + 1}`;
    const offset = value - base;
    return offset === 0 ? letter : `${letter}[${offset}]`;
  };
  return (
    part('R', address.rowAbsolute, address.row, origin.row) +
    part('C', address.colAbsolute, address.col, origin.col)
  );
}

/** One `R…` or `C…` part of an R1C1 cell, scanned from `start`. */
function scanR1C1Part(
  text: string,
  start: number,
  letter: 'R' | 'C',
  base: number,
  limit: number,
): Part | null {
  const ch = text[start];
  if (ch !== letter && ch !== letter.toLowerCase()) return null;
  let i = start + 1;
  if (text[i] === '[') {
    const close = text.indexOf(']', i);
    if (close < 0) return null;
    const inner = text.slice(i + 1, close);
    if (!/^-?[0-9]{1,8}$/.test(inner)) return null;
    const value = base + Number(inner);
    return value >= 0 && value < limit
      ? { value, absolute: false, end: close + 1 }
      : null;
  }
  const from = i;
  while (i < text.length && i - from < 8 && isDigit(text.charCodeAt(i))) i++;
  if (i === from) return { value: base, absolute: false, end: i };
  const value = Number(text.slice(from, i)) - 1;
  return value >= 0 && value < limit ? { value, absolute: true, end: i } : null;
}

/**
 * Parses one R1C1 cell relative to `origin` (`R2C3`, `R[-1]C`, `RC[2]`,
 * case-insensitive), or `null`.
 */
export function parseOgeR1C1Address(
  text: string,
  origin: OgeCellRef,
): OgeCellAddress | null {
  const row = scanR1C1Part(text, 0, 'R', origin.row, OGE_SHEET_MAX_ROWS);
  if (!row) return null;
  const col = scanR1C1Part(
    text,
    row.end,
    'C',
    origin.col,
    OGE_SHEET_MAX_COLUMNS,
  );
  if (!col || col.end !== text.length) return null;
  return {
    row: row.value,
    col: col.value,
    rowAbsolute: row.absolute,
    colAbsolute: col.absolute,
  };
}
