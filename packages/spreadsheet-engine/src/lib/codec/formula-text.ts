/**
 * Formula text without a formula engine: moving relative references (what a
 * shared formula's followers and a paste need) and the display form the
 * formula bar shows.
 *
 * The scanner knows just enough of the grammar to find references — string
 * literals, quoted sheet names, structured references (`Table1[Col]`),
 * error literals and function calls are stepped over — and never evaluates.
 * The full tokenizer arrives with the formula engine (P3).
 */
import {
  OGE_SHEET_MAX_COLUMNS,
  OGE_SHEET_MAX_ROWS,
  ogeColumnIndex,
  ogeColumnName,
} from '../address/address';

function isNameChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code === 95 || // _
    code === 46 || // .
    code === 92 || // \
    code === 36 || // $
    code > 127
  );
}

/** One `[$]col[$]row`, `[$]col` or `[$]row` part of a reference, as found. */
interface Part {
  readonly col?: number;
  readonly colAbsolute: boolean;
  readonly row?: number;
  readonly rowAbsolute: boolean;
  readonly end: number;
}

const CELL = /^(\$?)([A-Za-z]{1,3})(\$?)([0-9]{1,7})/;
const COLUMN = /^(\$?)([A-Za-z]{1,3})(?![A-Za-z0-9_.(])/;
const ROW = /^(\$?)([0-9]{1,7})(?![0-9A-Za-z_.(])/;

function scanCell(text: string, at: number): Part | null {
  const match = CELL.exec(text.slice(at, at + 14));
  if (!match) return null;
  const col = ogeColumnIndex(match[2]);
  const row = Number(match[4]) - 1;
  if (col < 0 || row < 0 || row >= OGE_SHEET_MAX_ROWS) return null;
  const end = at + match[0].length;
  // `LOG10(` is a function, `A1B` a name
  if (
    end < text.length &&
    (isNameChar(text.charCodeAt(end)) || text[end] === '(')
  )
    return null;
  return {
    col,
    colAbsolute: match[1] === '$',
    row,
    rowAbsolute: match[3] === '$',
    end,
  };
}

function scanColumn(text: string, at: number): Part | null {
  const match = COLUMN.exec(text.slice(at, at + 8));
  if (!match) return null;
  const col = ogeColumnIndex(match[2]);
  return col < 0
    ? null
    : {
        col,
        colAbsolute: match[1] === '$',
        rowAbsolute: false,
        end: at + match[0].length,
      };
}

function scanRow(text: string, at: number): Part | null {
  const match = ROW.exec(text.slice(at, at + 10));
  if (!match) return null;
  const row = Number(match[2]) - 1;
  return row < 0 || row >= OGE_SHEET_MAX_ROWS
    ? null
    : {
        row,
        rowAbsolute: match[1] === '$',
        colAbsolute: false,
        end: at + match[0].length,
      };
}

/** A reference found at `at`: its parts and where it ends; `null` if none. */
function scanReference(
  text: string,
  at: number,
): { parts: Part[]; end: number } | null {
  const cell = scanCell(text, at);
  if (cell) {
    if (text[cell.end] === ':') {
      const second = scanCell(text, cell.end + 1);
      if (second) return { parts: [cell, second], end: second.end };
    }
    return { parts: [cell], end: cell.end };
  }
  // whole columns `A:C` and whole rows `2:9` need both halves
  const firstCol = scanColumn(text, at);
  if (firstCol && text[firstCol.end] === ':') {
    const second = scanColumn(text, firstCol.end + 1);
    if (second) return { parts: [firstCol, second], end: second.end };
  }
  const firstRow = scanRow(text, at);
  if (firstRow && text[firstRow.end] === ':') {
    const second = scanRow(text, firstRow.end + 1);
    if (second) return { parts: [firstRow, second], end: second.end };
  }
  return null;
}

function formatPart(
  part: Part,
  rowDelta: number,
  colDelta: number,
): string | null {
  let out = '';
  if (part.col !== undefined) {
    const col = part.colAbsolute ? part.col : part.col + colDelta;
    if (col < 0 || col >= OGE_SHEET_MAX_COLUMNS) return null;
    out += (part.colAbsolute ? '$' : '') + ogeColumnName(col);
  }
  if (part.row !== undefined) {
    const row = part.rowAbsolute ? part.row : part.row + rowDelta;
    if (row < 0 || row >= OGE_SHEET_MAX_ROWS) return null;
    out += (part.rowAbsolute ? '$' : '') + String(row + 1);
  }
  return out;
}

/**
 * Moves every relative reference of a formula by `rowDelta`/`colDelta`, the
 * way Excel fills a shared formula or pastes one: `$` parts stay, a part
 * pushed off the sheet turns the reference into `#REF!`. Sheet prefixes,
 * names, strings and structured references are left alone.
 */
export function ogeShiftFormula(
  formula: string,
  rowDelta: number,
  colDelta: number,
): string {
  if (rowDelta === 0 && colDelta === 0) return formula;
  let out = '';
  let i = 0;
  const n = formula.length;
  while (i < n) {
    const ch = formula[i];
    if (ch === '"') {
      // string literal, `""` escapes a quote
      let j = i + 1;
      while (j < n) {
        if (formula[j] === '"') {
          if (formula[j + 1] === '"') j += 2;
          else break;
        } else j++;
      }
      out += formula.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === "'") {
      // quoted sheet name, `''` escapes an apostrophe; the reference follows `!`
      let j = i + 1;
      while (j < n) {
        if (formula[j] === "'") {
          if (formula[j + 1] === "'") j += 2;
          else break;
        } else j++;
      }
      out += formula.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === '[') {
      // structured reference or external-book index: copied verbatim
      let depth = 0;
      let j = i;
      for (; j < n; j++) {
        if (formula[j] === '[') depth++;
        else if (formula[j] === ']') {
          depth--;
          if (depth === 0) break;
        }
      }
      out += formula.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === '#') {
      // error literals (`#REF!`, `#N/A`) contain letters
      const match = /^#[A-Za-z0-9/_]+[!?]?/.exec(formula.slice(i, i + 16));
      const length = match ? match[0].length : 1;
      out += formula.slice(i, i + length);
      i += length;
      continue;
    }
    const code = formula.charCodeAt(i);
    const startsToken = i === 0 || !isNameChar(formula.charCodeAt(i - 1));
    if (
      startsToken &&
      (code === 36 || (code >= 48 && code <= 57) || /[A-Za-z]/.test(ch))
    ) {
      const reference = scanReference(formula, i);
      if (reference) {
        const parts = reference.parts.map((part) =>
          formatPart(part, rowDelta, colDelta),
        );
        out += parts.includes(null) ? '#REF!' : parts.join(':');
        i = reference.end;
        continue;
      }
      // a name, function or number: copy the whole token
      let j = i + 1;
      while (j < n && isNameChar(formula.charCodeAt(j))) j++;
      out += formula.slice(i, j);
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * The formula as Excel's formula bar shows it: the file's future-function
 * prefixes (`_xlfn.`, `_xlws.`, `_xlpm.`) removed. Text inside string
 * literals is left alone.
 */
export function ogeDisplayFormula(formula: string): string {
  if (!formula.includes('_xl')) return formula;
  let out = '';
  let inString = false;
  for (let i = 0; i < formula.length; i++) {
    const ch = formula[i];
    if (ch === '"') inString = !inString;
    if (
      !inString &&
      ch === '_' &&
      /^_xl(fn|ws|pm)\./.test(formula.slice(i, i + 6))
    ) {
      i += 5;
      continue;
    }
    out += ch;
  }
  return out;
}
