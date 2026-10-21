/**
 * What a cell holds: a value (number, text, boolean, error or rich text), an
 * optional formula and a style id.
 *
 * Excel has no date type — a date is a number whose format is a date format
 * (see `isOgeDateFormat`), so it is stored as its serial here too. Text is
 * kept exactly as written: nothing in the model converts `"00123"` or
 * `"MARCH1"` into a number or a date (the healthcare failure mode the
 * research notes record).
 */
import type { OgeSheetRange } from '../address/address';
import type { OgeFont } from './style';

/** Excel's error values, including the dynamic-array and data-type ones. */
export type OgeCellErrorCode =
  | '#NULL!'
  | '#DIV/0!'
  | '#VALUE!'
  | '#REF!'
  | '#NAME?'
  | '#NUM!'
  | '#N/A'
  | '#GETTING_DATA'
  | '#SPILL!'
  | '#CALC!'
  | '#FIELD!'
  | '#BLOCKED!'
  | '#CONNECT!'
  | '#UNKNOWN!'
  | '#BUSY!'
  | '#PYTHON!';

/** Every error code, in Excel's `ERROR.TYPE` order first. */
export const OGE_CELL_ERROR_CODES: readonly OgeCellErrorCode[] = [
  '#NULL!',
  '#DIV/0!',
  '#VALUE!',
  '#REF!',
  '#NAME?',
  '#NUM!',
  '#N/A',
  '#GETTING_DATA',
  '#SPILL!',
  '#CALC!',
  '#FIELD!',
  '#BLOCKED!',
  '#CONNECT!',
  '#UNKNOWN!',
  '#BUSY!',
  '#PYTHON!',
];

/** An error value. One frozen instance per code, so `===` compares them. */
export interface OgeCellError {
  readonly kind: 'error';
  readonly code: OgeCellErrorCode;
}

/** A run of rich text; `font` overrides the cell's font for this run. */
export interface OgeTextRun {
  readonly text: string;
  readonly font?: OgeFont;
}

/** Text with per-run formatting (a shared-string `<si>` with `<r>` runs). */
export interface OgeRichText {
  readonly kind: 'rich';
  readonly runs: readonly OgeTextRun[];
}

/** A cell value. Dates are numbers (serials). */
export type OgeCellValue =
  number | string | boolean | OgeCellError | OgeRichText;

/**
 * A stored cell. Every field is optional: a style-only cell (a filled but
 * empty cell) has just `style`; a formula cell keeps its last calculated
 * value in `value`, the way a file stores it.
 */
export interface OgeCell {
  readonly value?: OgeCellValue;
  /** Formula text in A1 notation without the leading `=` (`SUM(A1:A3)`). */
  readonly formula?: string;
  /** Style id in the workbook's registry; omitted means 0, the default style. */
  readonly style?: number;
  /**
   * On the anchor of an array formula: the range it fills. Legacy
   * (Ctrl+Shift+Enter) arrays show as `{=…}`; `dynamic` ones spill.
   */
  readonly array?: {
    readonly range: OgeSheetRange;
    readonly dynamic?: boolean;
  };
}

/** The kind of value a cell holds. */
export type OgeCellValueType =
  'blank' | 'number' | 'text' | 'boolean' | 'error' | 'rich';

const ERRORS: ReadonlyMap<OgeCellErrorCode, OgeCellError> = new Map(
  OGE_CELL_ERROR_CODES.map((code) => [
    code,
    Object.freeze({ kind: 'error', code }),
  ]),
);

/** The shared error value for a code. */
export function ogeCellError(code: OgeCellErrorCode): OgeCellError {
  return ERRORS.get(code) ?? (ERRORS.get('#VALUE!') as OgeCellError);
}

/** Whether a value is an error value. */
export function isOgeCellError(value: unknown): value is OgeCellError {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'error' &&
    ERRORS.has((value as { code?: OgeCellErrorCode }).code as OgeCellErrorCode)
  );
}

/** The error code an error literal spells (`#n/a` → `#N/A`), or `null`. */
export function parseOgeCellErrorCode(text: string): OgeCellErrorCode | null {
  const upper = text.trim().toUpperCase();
  return (OGE_CELL_ERROR_CODES as readonly string[]).includes(upper)
    ? (upper as OgeCellErrorCode)
    : null;
}

/** Rich text from runs; adjacent runs with the same font are not merged. */
export function ogeRichText(runs: readonly OgeTextRun[]): OgeRichText {
  return { kind: 'rich', runs };
}

/** Whether a value is rich text. */
export function isOgeRichText(value: unknown): value is OgeRichText {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'rich' &&
    Array.isArray((value as { runs?: unknown }).runs)
  );
}

/** The plain text of rich text. */
export function ogeRichTextToString(value: OgeRichText): string {
  let text = '';
  for (const run of value.runs) text += run.text;
  return text;
}

/** The kind of value a cell holds (`'blank'` for none). */
export function ogeCellValueType(
  value: OgeCellValue | undefined,
): OgeCellValueType {
  if (value === undefined) return 'blank';
  switch (typeof value) {
    case 'number':
      return 'number';
    case 'string':
      return 'text';
    case 'boolean':
      return 'boolean';
    default:
      return value.kind === 'error' ? 'error' : 'rich';
  }
}

/** Whether a cell carries nothing worth storing. */
export function isOgeCellEmpty(cell: OgeCell | undefined): boolean {
  return (
    cell === undefined ||
    (cell.value === undefined && cell.formula === undefined && !cell.style)
  );
}
