/**
 * A workbook: its sheets, the style registry, defined names, the date system
 * and the theme colours that resolve `theme="N"` references.
 */
import { OGE_OFFICE_THEME_COLORS, type OgeThemeColors } from '../color/color';
import type { OgeDateSystem } from '../date/date-serial';
import { OgeStyleRegistry, type OgeCellStyle, type OgeFont } from './style';
import type { OgeTableStyle } from './table';
import { OgeWorksheet } from './worksheet';

/** A defined name (`definedNames/definedName`). */
export interface OgeDefinedName {
  readonly name: string;
  /** What it refers to, in A1 notation without the leading `=` (`Sheet1!$A$1:$B$9`). */
  readonly formula: string;
  /** Index of the sheet a local name belongs to; omitted for a workbook-wide name. */
  readonly sheet?: number;
  readonly hidden?: boolean;
  readonly comment?: string;
}

/** Why a sheet name is refused. */
export type OgeSheetNameProblem =
  | 'empty'
  | 'too-long'
  | 'invalid-character'
  | 'apostrophe-edge'
  | 'reserved'
  | 'duplicate';

/** Why a defined name is refused. */
export type OgeDefinedNameProblem =
  | 'empty'
  | 'too-long'
  | 'invalid-start'
  | 'invalid-character'
  | 'cell-reference';

/** Options of {@link createOgeWorkbook}. */
export interface OgeWorkbookOptions {
  /** Name of the first sheet. Default: `newSheetName` + 1. */
  readonly sheetName?: string;
  /**
   * Base of generated sheet names (`Sheet` → `Sheet1`, `Sheet2`). Render
   * layers pass their message catalog's word; Excel itself localises it.
   */
  readonly newSheetName?: string;
  /** Date system. Default `'1900'`. */
  readonly dateSystem?: OgeDateSystem;
  /** The Normal style's font. Default Calibri 11 (Excel 2007–2022). */
  readonly defaultFont?: OgeFont;
  /** Theme colours. Default: the Office 2013–2022 theme. */
  readonly theme?: OgeThemeColors;
}

/** Longest sheet name Excel accepts. */
export const OGE_SHEET_NAME_MAX_LENGTH = 31;

/** Longest defined name Excel accepts. */
export const OGE_DEFINED_NAME_MAX_LENGTH = 255;

/** The Normal style font of Excel 2007–2022 workbooks. */
export const OGE_DEFAULT_FONT: OgeFont = Object.freeze({
  name: 'Calibri',
  size: 11,
  family: 2,
  scheme: 'minor',
  color: Object.freeze({ theme: 1 }),
});

const SHEET_NAME_FORBIDDEN = /[\\/?*[\]:]/;

/** Upper-cases for Excel's case-insensitive name comparison. */
function fold(name: string): string {
  return name.toUpperCase();
}

/**
 * Checks a sheet name against Excel's rules: 1–31 characters, none of
 * `\ / ? * [ ] :`, no apostrophe at either end, not `History` (reserved by
 * change tracking), unique among `existing` regardless of case.
 */
export function validateOgeSheetName(
  name: string,
  existing: readonly string[] = [],
): OgeSheetNameProblem | null {
  if (name.length === 0) return 'empty';
  if (name.length > OGE_SHEET_NAME_MAX_LENGTH) return 'too-long';
  if (SHEET_NAME_FORBIDDEN.test(name)) return 'invalid-character';
  if (name.startsWith("'") || name.endsWith("'")) return 'apostrophe-edge';
  if (fold(name) === 'HISTORY') return 'reserved';
  const folded = fold(name);
  if (existing.some((other) => fold(other) === folded)) return 'duplicate';
  return null;
}

const NAME_START = /[\p{L}_\\]/u;
const NAME_PART = /[\p{L}\p{N}_.\\?]/u;

/**
 * Checks a defined name against Excel's rules: up to 255 characters, starting
 * with a letter, `_` or `\`, then letters, digits, `.`, `_`, `\` or `?`, and
 * not readable as a cell reference (`A1`, `R1C1`, `R`, `C`). Excel's own
 * `_xlnm.` names (`_xlnm.Print_Area`) pass.
 */
export function validateOgeDefinedName(
  name: string,
): OgeDefinedNameProblem | null {
  if (name.length === 0) return 'empty';
  if (name.length > OGE_DEFINED_NAME_MAX_LENGTH) return 'too-long';
  if (!NAME_START.test(name[0])) return 'invalid-start';
  for (let i = 1; i < name.length; i++) {
    if (!NAME_PART.test(name[i])) return 'invalid-character';
  }
  const upper = name.toUpperCase();
  if (upper === 'R' || upper === 'C') return 'cell-reference';
  if (/^[A-Z]{1,3}[0-9]+$/.test(upper)) {
    // only a reference inside the grid clashes (`ABCD1` is a fine name)
    const letters = upper.replace(/[0-9]+$/, '');
    let col = 0;
    for (const ch of letters) col = col * 26 + (ch.charCodeAt(0) - 64);
    const row = Number(upper.slice(letters.length));
    if (col <= 16384 && row >= 1 && row <= 1048576) return 'cell-reference';
  }
  if (
    /^R[0-9]*C[0-9]*$/.test(upper) ||
    /^R[0-9]+$/.test(upper) ||
    /^C[0-9]+$/.test(upper)
  ) {
    return 'cell-reference';
  }
  return null;
}

/** Document properties (`docProps/core.xml`, `docProps/app.xml`). */
export interface OgeWorkbookProperties {
  readonly title?: string;
  readonly subject?: string;
  readonly creator?: string;
  readonly keywords?: string;
  readonly description?: string;
  readonly lastModifiedBy?: string;
  /** ISO 8601 timestamps as stored. */
  readonly created?: string;
  readonly modified?: string;
  readonly company?: string;
  /** The application that saved the file (`Microsoft Excel`). */
  readonly application?: string;
}

/** Calculation settings (`calcPr`) — stored for the formula engine (P3). */
export interface OgeCalculationSettings {
  readonly mode?: 'auto' | 'manual' | 'autoNoTable';
  readonly fullCalcOnLoad?: boolean;
  readonly iterate?: boolean;
  readonly iterateCount?: number;
  readonly iterateDelta?: number;
}

/**
 * A package part the engine does not model (drawings, charts, images, pivot
 * caches, VBA, custom XML …), kept byte-for-byte so a save (P2) loses nothing.
 */
export interface OgeOpaquePart {
  /** Path inside the package, without a leading `/` (`xl/drawings/drawing1.xml`). */
  readonly path: string;
  readonly contentType?: string;
  readonly data: Uint8Array;
}

/** A workbook. Create one with {@link createOgeWorkbook}. */
export class OgeWorkbook {
  /** The distinct cell styles; cells refer to them by id. */
  readonly styles = new OgeStyleRegistry();
  /** The date system serials count from. */
  dateSystem: OgeDateSystem;
  /** Theme colours behind `theme="N"`. */
  theme: OgeThemeColors;
  /** Theme fonts (`major` = headings, `minor` = body) behind `scheme` fonts. */
  themeFonts: { readonly major?: string; readonly minor?: string } = {};
  /** A custom legacy palette (`styles.xml` → `colors/indexedColors`), `RRGGBB`. */
  indexedColors: readonly string[] | undefined;
  /** Differential formats conditional-format rules and table styles point at (`dxfs`). */
  dxfs: readonly OgeCellStyle[] = [];
  /** The workbook's own table styles (`tableStyles`); Excel's built-in ones are only named. */
  tableStyles: readonly OgeTableStyle[] = [];
  /** The style new tables and PivotTables get (`defaultTableStyle`, `defaultPivotStyle`). */
  defaultTableStyle: string | undefined;
  defaultPivotStyle: string | undefined;
  /** The Normal style's font — what style id 0 paints with. */
  defaultFont: OgeFont;
  /** Index of the sheet shown first. */
  activeSheet = 0;
  /** Show the sheet tab strip (`workbookView/@showSheetTabs`). */
  showSheetTabs = true;
  properties: OgeWorkbookProperties = {};
  calculation: OgeCalculationSettings = {};
  /** Workbook protection attributes as stored (`workbookProtection`). */
  protection: Readonly<Record<string, string>> | undefined;
  /** Parts the engine does not model, with their content types. */
  opaqueParts: OgeOpaquePart[] = [];

  private readonly sheetList: OgeWorksheet[] = [];
  private nameList: OgeDefinedName[] = [];
  private readonly newSheetName: string;

  /** @internal — use {@link createOgeWorkbook}. */
  constructor(options: OgeWorkbookOptions = {}) {
    this.dateSystem = options.dateSystem ?? '1900';
    this.theme = options.theme ?? OGE_OFFICE_THEME_COLORS;
    this.defaultFont = options.defaultFont ?? OGE_DEFAULT_FONT;
    this.newSheetName = options.newSheetName ?? 'Sheet';
  }

  /** The sheets, in tab order. */
  get sheets(): readonly OgeWorksheet[] {
    return this.sheetList;
  }

  /** The sheet at an index or with a name (case-insensitive). */
  sheet(nameOrIndex: string | number): OgeWorksheet | undefined {
    if (typeof nameOrIndex === 'number') return this.sheetList[nameOrIndex];
    const folded = fold(nameOrIndex);
    return this.sheetList.find((sheet) => fold(sheet.name) === folded);
  }

  /** Index of a sheet, or -1. */
  indexOf(sheet: OgeWorksheet): number {
    return this.sheetList.indexOf(sheet);
  }

  /**
   * Adds a sheet at `index` (default: last). Without a name it gets the next
   * free `Sheet<n>`. Throws `RangeError` for a name Excel would refuse — a
   * caller with user input checks it with {@link validateOgeSheetName} first.
   */
  addSheet(name?: string, index = this.sheetList.length): OgeWorksheet {
    const sheetName = name ?? this.nextSheetName();
    const problem = validateOgeSheetName(
      sheetName,
      this.sheetList.map((s) => s.name),
    );
    if (problem)
      throw new RangeError(`Invalid sheet name "${sheetName}": ${problem}`);
    const sheet = new OgeWorksheet(sheetName);
    const at = Math.max(0, Math.min(this.sheetList.length, index));
    this.sheetList.splice(at, 0, sheet);
    // local names and the active tab follow their sheets
    this.nameList = this.nameList.map((n) =>
      n.sheet !== undefined && n.sheet >= at ? { ...n, sheet: n.sheet + 1 } : n,
    );
    if (this.sheetList.length > 1 && this.activeSheet >= at) this.activeSheet++;
    return sheet;
  }

  /**
   * Removes a sheet and its local names. A workbook keeps at least one
   * sheet, so removing the last one is refused (`false`).
   */
  removeSheet(sheet: OgeWorksheet | number): boolean {
    const index =
      typeof sheet === 'number' ? sheet : this.sheetList.indexOf(sheet);
    if (
      index < 0 ||
      index >= this.sheetList.length ||
      this.sheetList.length === 1
    )
      return false;
    this.sheetList.splice(index, 1);
    this.nameList = this.nameList
      .filter((n) => n.sheet !== index)
      .map((n) =>
        n.sheet !== undefined && n.sheet > index
          ? { ...n, sheet: n.sheet - 1 }
          : n,
      );
    if (this.activeSheet > index || this.activeSheet >= this.sheetList.length) {
      this.activeSheet = Math.max(0, this.activeSheet - 1);
    }
    return true;
  }

  /** Moves a sheet to another tab position; local names move with it. */
  moveSheet(from: number, to: number): boolean {
    const count = this.sheetList.length;
    if (from < 0 || from >= count || to < 0 || to >= count) return false;
    if (from === to) return true;
    const [sheet] = this.sheetList.splice(from, 1);
    this.sheetList.splice(to, 0, sheet);
    const remap = (index: number) => {
      if (index === from) return to;
      if (from < to && index > from && index <= to) return index - 1;
      if (from > to && index >= to && index < from) return index + 1;
      return index;
    };
    this.nameList = this.nameList.map((n) =>
      n.sheet === undefined ? n : { ...n, sheet: remap(n.sheet) },
    );
    this.activeSheet = remap(this.activeSheet);
    return true;
  }

  /**
   * Renames a sheet. Throws `RangeError` for a name Excel would refuse.
   * (Rewriting formulas that mention the old name is the command layer's job.)
   */
  renameSheet(sheet: OgeWorksheet | number, name: string): void {
    const target = typeof sheet === 'number' ? this.sheetList[sheet] : sheet;
    if (!target || !this.sheetList.includes(target))
      throw new RangeError('No such sheet');
    const others = this.sheetList
      .filter((s) => s !== target)
      .map((s) => s.name);
    const problem = validateOgeSheetName(name, others);
    if (problem)
      throw new RangeError(`Invalid sheet name "${name}": ${problem}`);
    target.name = name;
  }

  private nextSheetName(): string {
    const taken = new Set(this.sheetList.map((s) => fold(s.name)));
    for (let n = this.sheetList.length + 1; ; n++) {
      const candidate = `${this.newSheetName}${n}`;
      if (!taken.has(fold(candidate))) return candidate;
    }
  }

  // ── defined names ──────────────────────────────────────────────────────

  /** Every defined name, workbook-wide and sheet-local. */
  get names(): readonly OgeDefinedName[] {
    return this.nameList;
  }

  /**
   * Adds a defined name, replacing one with the same name and scope. Throws
   * `RangeError` for a name Excel would refuse or a scope with no sheet.
   */
  defineName(definition: OgeDefinedName): void {
    const problem = validateOgeDefinedName(definition.name);
    if (problem)
      throw new RangeError(`Invalid name "${definition.name}": ${problem}`);
    if (
      definition.sheet !== undefined &&
      (definition.sheet < 0 || definition.sheet >= this.sheetList.length)
    ) {
      throw new RangeError(
        `No sheet ${definition.sheet} for name "${definition.name}"`,
      );
    }
    const folded = fold(definition.name);
    this.nameList = this.nameList.filter(
      (n) => !(fold(n.name) === folded && n.sheet === definition.sheet),
    );
    this.nameList.push(definition);
  }

  /** Removes a defined name from a scope; `false` when it does not exist. */
  removeName(name: string, sheet?: number): boolean {
    const folded = fold(name);
    const before = this.nameList.length;
    this.nameList = this.nameList.filter(
      (n) => !(fold(n.name) === folded && n.sheet === sheet),
    );
    return this.nameList.length !== before;
  }

  /**
   * Resolves a name as a formula on sheet `sheet` would: the sheet's local
   * name wins over the workbook-wide one.
   */
  findName(name: string, sheet?: number): OgeDefinedName | undefined {
    const folded = fold(name);
    const matches = this.nameList.filter((n) => fold(n.name) === folded);
    return (
      (sheet === undefined
        ? undefined
        : matches.find((n) => n.sheet === sheet)) ??
      matches.find((n) => n.sheet === undefined)
    );
  }
}

/** A new workbook with one empty sheet. */
export function createOgeWorkbook(
  options: OgeWorkbookOptions = {},
): OgeWorkbook {
  const workbook = new OgeWorkbook(options);
  workbook.addSheet(options.sheetName);
  return workbook;
}
