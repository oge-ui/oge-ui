/**
 * A worksheet part (`xl/worksheets/sheetN.xml`).
 *
 * `<sheetData>` streams: every cell becomes a stored `OgeCell` as its end tag
 * is read, so memory follows the model, not the document. Every other
 * top-level element is small; it is cut out of the source as text when it
 * closes and read as a tree — or, when the engine does not model it
 * (drawings, tables, `extLst` …), kept verbatim for the writer.
 */
import {
  OGE_SHEET_MAX_COLUMNS,
  OGE_SHEET_MAX_ROWS,
  formatOgeCellAddress,
  parseOgeCellAddress,
  parseOgeRangeAddress,
  type OgeSheetRange,
} from '../address/address';
import { ogeDatePartsToSerial, type OgeDateSystem } from '../date/date-serial';
import {
  ogeCellError,
  parseOgeCellErrorCode,
  type OgeCell,
  type OgeCellValue,
  type OgeRichText,
} from '../model/cell';
import type {
  OgeAutoFilter,
  OgeConditionalRule,
  OgeConditionalRuleType,
  OgeConditionalValue,
  OgeDataValidation,
} from '../model/sheet-features';
import type {
  OgeSparkline,
  OgeSparklineAxisScale,
  OgeSparklineColors,
} from '../model/sparkline';
import type { OgeSheetView, OgeWorksheet } from '../model/worksheet';
import { ogeXmlLocalName, parseOgeXml } from '../xml/xml';
import { ogeConditionalRuleSupported } from '../paint/conditional';
import { ogeShiftFormula } from './formula-text';
import type { OgeImportIssueLog } from './import-issues';
import type { OgeRelationship } from './package';
import { OgeRichTextCollector } from './read-strings';
import { readOgeColor } from './read-styles';
import {
  ogeXmlAttribute,
  ogeXmlBool,
  ogeXmlChild,
  ogeXmlChildren,
  ogeXmlIndex,
  ogeXmlNumber,
  parseOgeXmlTree,
  type OgeXmlNode,
} from './xml-tree';

/** What reading a sheet needs from the rest of the workbook. */
export interface OgeSheetReadContext {
  /** `cellXfs` index → style id in the workbook's registry. */
  readonly styleIds: readonly number[];
  readonly sharedStrings: readonly (string | OgeRichText)[];
  readonly dateSystem: OgeDateSystem;
  readonly relationships: readonly OgeRelationship[];
  readonly issues: OgeImportIssueLog;
  /** The part path, for issues. */
  readonly part: string;
  /** Cells this sheet may still store (shared across sheets); `Infinity` for no limit. */
  readonly budget: { remaining: number };
}

/** Elements read into the model; anything else at the top level is passed through. */
/** A sparkline group's colour elements (`x14:color*`), by part. */
const SPARKLINE_COLORS = [
  ['series', 'colorSeries'],
  ['negative', 'colorNegative'],
  ['axis', 'colorAxis'],
  ['markers', 'colorMarkers'],
  ['first', 'colorFirst'],
  ['last', 'colorLast'],
  ['high', 'colorHigh'],
  ['low', 'colorLow'],
] as const;

const MODELLED = new Set([
  'sheetPr',
  'dimension',
  'sheetViews',
  'sheetFormatPr',
  'cols',
  'sheetData',
  'sheetProtection',
  'autoFilter',
  'mergeCells',
  'conditionalFormatting',
  'dataValidations',
  'hyperlinks',
  'printOptions',
  'pageMargins',
  'pageSetup',
  'headerFooter',
  'rowBreaks',
  'colBreaks',
]);

/**
 * An `autoFilter` element (a sheet's, or a table's) parsed from `source`
 * (whose offsets the node's are):
 * its range and each `filterColumn` kept verbatim, with whether the column
 * hides its button; `undefined` without a readable range.
 */
export function ogeReadAutoFilter(
  node: OgeXmlNode,
  source: string,
): OgeAutoFilter | undefined {
  const range = ogeReadSqref(node.attributes['ref'])[0];
  if (!range) return undefined;
  return {
    range,
    columns: ogeXmlChildren(node, 'filterColumn').map((column) => {
      const a = column.attributes;
      const hidden =
        ogeXmlBool(a['hiddenButton'], false) ||
        !ogeXmlBool(a['showButton'], true);
      return {
        offset: ogeXmlIndex(a['colId']) ?? 0,
        xml: source.slice(column.start, column.end),
        ...(hidden ? { hiddenButton: true } : {}),
      };
    }),
  };
}

/** `A1` → zero-based row/col without allocating; `null` when it is not a cell. */
function cellPosition(ref: string): { row: number; col: number } | null {
  let i = 0;
  let col = 0;
  const n = ref.length;
  while (i < n) {
    const c = ref.charCodeAt(i);
    if (c >= 65 && c <= 90) col = col * 26 + (c - 64);
    else if (c >= 97 && c <= 122) col = col * 26 + (c - 96);
    else break;
    i++;
  }
  if (i === 0 || i > 3 || i === n) return null;
  let row = 0;
  for (; i < n; i++) {
    const c = ref.charCodeAt(i);
    if (c < 48 || c > 57) return null;
    row = row * 10 + (c - 48);
  }
  if (row < 1 || row > OGE_SHEET_MAX_ROWS || col > OGE_SHEET_MAX_COLUMNS)
    return null;
  return { row: row - 1, col: col - 1 };
}

/** Space-separated ranges (`sqref`). Unreadable parts are reported and skipped. */
export function ogeReadSqref(
  text: string | undefined,
  onInvalid?: (part: string) => void,
): OgeSheetRange[] {
  const ranges: OgeSheetRange[] = [];
  for (const part of (text ?? '').split(/\s+/)) {
    if (!part) continue;
    const range = parseOgeRangeAddress(part);
    if (range && range.kind !== 'columns' && range.kind !== 'rows') {
      ranges.push({
        top: range.top,
        left: range.left,
        bottom: range.bottom,
        right: range.right,
      });
    } else if (range) {
      // whole columns / rows: expand to the sheet's edges
      ranges.push({
        top: range.kind === 'columns' ? 0 : range.top,
        bottom:
          range.kind === 'columns' ? OGE_SHEET_MAX_ROWS - 1 : range.bottom,
        left: range.kind === 'rows' ? 0 : range.left,
        right: range.kind === 'rows' ? OGE_SHEET_MAX_COLUMNS - 1 : range.right,
      });
    } else onInvalid?.(part);
  }
  return ranges;
}

const ISO_DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

/** A `t="d"` value (ISO 8601) as a serial, or `null`. */
function isoToSerial(text: string, system: OgeDateSystem): number | null {
  const match = ISO_DATE.exec(text.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi, s, frac] = match;
  const serial = ogeDatePartsToSerial(
    {
      year: Number(y),
      month: Number(mo),
      day: Number(d),
      hour: h ? Number(h) : 0,
      minute: mi ? Number(mi) : 0,
      second: s ? Number(s) : 0,
      millisecond: frac ? Math.round(Number(`0.${frac}`) * 1000) : 0,
    },
    system,
  );
  return serial;
}

/** A formula that waits for its shared master. */
interface Follower {
  readonly row: number;
  readonly col: number;
  readonly si: string;
}

/** Reads a worksheet part into `sheet`. Throws `OgeXmlError` for a malformed part. */
export function readOgeWorksheet(
  xml: string,
  sheet: OgeWorksheet,
  context: OgeSheetReadContext,
): void {
  const { issues, part } = context;
  const where = (ref?: string, detail?: string) => ({
    sheet: sheet.name,
    part,
    ...(ref !== undefined ? { ref } : {}),
    ...(detail !== undefined ? { detail } : {}),
  });

  let depth = 0;
  // a top-level element being cut out of the source: its start and name
  let captureStart = -1;
  let inSheetData = false;
  let rootAttributes: Readonly<Record<string, string>> | undefined;

  // row and cell state
  let rowIndex = -1;
  let rowValid = true;
  let colIndex = -1;
  let cellRow = -1;
  let cellCol = -1;
  let cellType = '';
  let cellStyle = 0;
  let cellMeta = false;
  let inCell = false;
  let valueText: string | null = null;
  let inValue = false;
  let formulaText: string | null = null;
  let inFormula = false;
  let formulaAttributes: Readonly<Record<string, string>> | null = null;
  let inline: OgeRichTextCollector | null = null;
  let inInline = false;
  let inlineDepth = 0;
  let truncated = false;
  let uncalculated = 0;

  const masters = new Map<
    string,
    { row: number; col: number; formula: string }
  >();
  const followers: Follower[] = [];

  const styleOf = (index: number, ref: string): number => {
    if (index === 0) return 0;
    const id = context.styleIds[index];
    if (id === undefined) {
      issues.add('invalid-style', where(ref, `s="${index}"`));
      return 0;
    }
    return id;
  };

  const finishCell = () => {
    const ref = () => formatOgeCellAddress({ row: cellRow, col: cellCol });
    let value: OgeCellValue | undefined;
    if (inline) {
      value = inline.result();
    } else if (valueText !== null) {
      switch (cellType) {
        case 's': {
          const index = ogeXmlIndex(valueText);
          const item =
            index === undefined ? undefined : context.sharedStrings[index];
          if (item === undefined)
            issues.add('invalid-shared-string', where(ref(), valueText));
          else value = item;
          break;
        }
        case 'str':
        case 'inlineStr':
          value = valueText;
          break;
        case 'b':
          value = valueText === '1' || valueText === 'true';
          break;
        case 'e': {
          const code = parseOgeCellErrorCode(valueText);
          if (!code) issues.add('invalid-value', where(ref(), valueText));
          value = ogeCellError(code ?? '#VALUE!');
          break;
        }
        case 'd': {
          const serial = isoToSerial(valueText, context.dateSystem);
          if (serial === null)
            issues.add('invalid-value', where(ref(), valueText));
          else value = serial;
          break;
        }
        default: {
          const number = valueText.trim() === '' ? NaN : Number(valueText);
          if (Number.isFinite(number)) value = number;
          else issues.add('invalid-value', where(ref(), valueText));
        }
      }
    }
    let formula: string | undefined;
    let array: OgeCell['array'];
    if (formulaAttributes) {
      const kind = formulaAttributes['t'];
      const text = formulaText ?? '';
      if (kind === 'shared') {
        const si = formulaAttributes['si'] ?? '';
        if (text && formulaAttributes['ref'] !== undefined) {
          masters.set(si, { row: cellRow, col: cellCol, formula: text });
          formula = text;
        } else if (text) {
          formula = text;
        } else {
          const master = masters.get(si);
          if (master)
            formula = ogeShiftFormula(
              master.formula,
              cellRow - master.row,
              cellCol - master.col,
            );
          else followers.push({ row: cellRow, col: cellCol, si });
        }
      } else if (kind === 'dataTable') {
        // what the formula bar shows for a what-if data table
        const r1 = formulaAttributes['r1'] ?? '';
        const r2 = formulaAttributes['r2'] ?? '';
        formula =
          formulaAttributes['dt2D'] === '1'
            ? `TABLE(${r1},${r2})`
            : formulaAttributes['dtr'] === '1'
              ? `TABLE(${r1},)`
              : `TABLE(,${r1})`;
        const range = ogeReadSqref(formulaAttributes['ref'])[0];
        if (range) array = { range };
      } else if (text) {
        formula = text;
        if (kind === 'array') {
          const range = ogeReadSqref(formulaAttributes['ref'])[0] ?? {
            top: cellRow,
            left: cellCol,
            bottom: cellRow,
            right: cellCol,
          };
          array = cellMeta ? { range, dynamic: true } : { range };
        }
      }
      if (formula !== undefined && value === undefined) uncalculated++;
    }
    if (value === undefined && formula === undefined && cellStyle === 0) return;
    if (context.budget.remaining <= 0) {
      truncated = true;
      return;
    }
    context.budget.remaining--;
    const cell: {
      value?: OgeCellValue;
      formula?: string;
      style?: number;
      array?: OgeCell['array'];
    } = {};
    if (value !== undefined) cell.value = value;
    if (formula !== undefined) cell.formula = formula;
    if (cellStyle) cell.style = cellStyle;
    if (array) cell.array = array;
    sheet.setCell(cellRow, cellCol, cell);
  };

  parseOgeXml(xml, {
    open(name, attributes, _selfClosing, start) {
      depth++;
      if (depth === 1) {
        rootAttributes = attributes;
        return;
      }
      if (depth === 2) {
        const local = ogeXmlLocalName(name);
        if (local === 'sheetData') inSheetData = true;
        else captureStart = start;
        return;
      }
      if (!inSheetData) return;
      // ── inside sheetData ──
      if (inInline) {
        inlineDepth++;
        inline?.open(name, attributes);
        return;
      }
      const colon = name.indexOf(':');
      const local = colon < 0 ? name : name.slice(colon + 1);
      if (depth === 3 && local === 'row') {
        const r = ogeXmlIndex(attributes['r']);
        rowIndex = r !== undefined && r >= 1 ? r - 1 : rowIndex + 1;
        colIndex = -1;
        rowValid = rowIndex < OGE_SHEET_MAX_ROWS;
        if (!rowValid) {
          issues.add(
            'invalid-reference',
            where(undefined, `row ${rowIndex + 1}`),
          );
          return;
        }
        const height = ogeXmlNumber(attributes['ht']);
        const hidden = ogeXmlBool(attributes['hidden'], false);
        const outline = ogeXmlIndex(attributes['outlineLevel']);
        const collapsed = ogeXmlBool(attributes['collapsed'], false);
        const customFormat = ogeXmlBool(attributes['customFormat'], false);
        const style = customFormat
          ? styleOf(
              ogeXmlIndex(attributes['s']) ?? 0,
              `${rowIndex + 1}:${rowIndex + 1}`,
            )
          : 0;
        const customHeight = ogeXmlBool(attributes['customHeight'], false);
        const recorded =
          height !== undefined ||
          hidden ||
          !!outline ||
          collapsed ||
          customFormat ||
          customHeight;
        // Excel fits every row the file lists without a custom height, a
        // bare one too — which shows where unlisted rows are hidden or keep
        // a custom default
        const bare =
          !recorded &&
          (sheet.format.zeroHeight === true ||
            sheet.format.customHeight === true);
        if (recorded || bare) {
          sheet.setRow(rowIndex, {
            ...(height !== undefined && height >= 0 ? { height } : {}),
            ...(customHeight
              ? { customHeight: true }
              : bare
                ? { customHeight: false }
                : {}),
            ...(hidden ? { hidden: true } : {}),
            ...(outline ? { outlineLevel: Math.min(outline, 7) } : {}),
            ...(collapsed ? { collapsed: true } : {}),
            ...(customFormat ? { style } : {}),
          });
        }
        return;
      }
      if (depth === 4 && local === 'c') {
        const ref = attributes['r'];
        const position = ref === undefined ? null : cellPosition(ref);
        // a cell with an unreadable reference, or in a row past the sheet, is
        // skipped: placing it by guesswork would move data
        if ((ref !== undefined && !position) || !rowValid) {
          if (ref !== undefined && rowValid)
            issues.add('invalid-reference', where(ref));
          inCell = false;
          return;
        }
        inCell = true;
        // a cell outside its row element trusts its own reference
        cellRow = position ? position.row : Math.max(rowIndex, 0);
        cellCol = position ? position.col : colIndex + 1;
        colIndex = cellCol;
        cellType = attributes['t'] ?? 'n';
        cellStyle = styleOf(ogeXmlIndex(attributes['s']) ?? 0, ref ?? '');
        cellMeta = attributes['cm'] !== undefined;
        valueText = null;
        formulaText = null;
        formulaAttributes = null;
        inline = null;
        if (cellCol >= OGE_SHEET_MAX_COLUMNS) {
          issues.add('invalid-reference', where(ref));
          inCell = false;
        }
        return;
      }
      if (!inCell || depth !== 5) return;
      if (local === 'v') {
        inValue = true;
        valueText = '';
      } else if (local === 'f') {
        inFormula = true;
        formulaText = '';
        formulaAttributes = attributes;
      } else if (local === 'is') {
        inline = new OgeRichTextCollector();
        inInline = true;
        inlineDepth = 0;
      }
    },
    close(name, end) {
      if (depth === 2) {
        const local = ogeXmlLocalName(name);
        if (local === 'sheetData') inSheetData = false;
        else if (captureStart >= 0) {
          readTopLevel(local, xml.slice(captureStart, end));
          captureStart = -1;
        }
      } else if (inSheetData) {
        if (inInline) {
          // the collector stays until the cell closes; </is> only stops routing
          if (inlineDepth > 0) {
            inlineDepth--;
            inline?.close(name);
          } else inInline = false;
          depth--;
          return;
        }
        if (depth === 5) {
          inValue = false;
          inFormula = false;
        } else if (depth === 4 && inCell) {
          finishCell();
          inCell = false;
          inline = null;
        }
      }
      depth--;
    },
    text(text) {
      if (inInline) inline?.text(text);
      else if (inValue) valueText += text;
      else if (inFormula) formulaText += text;
    },
  });

  // followers whose master came later in the file (or never)
  for (const follower of followers) {
    const master = masters.get(follower.si);
    const cell = sheet.getCell(follower.row, follower.col);
    if (!master) {
      issues.add(
        'orphan-shared-formula',
        where(formatOgeCellAddress({ row: follower.row, col: follower.col })),
      );
      continue;
    }
    sheet.setCell(follower.row, follower.col, {
      ...cell,
      formula: ogeShiftFormula(
        master.formula,
        follower.row - master.row,
        follower.col - master.col,
      ),
    });
  }
  if (truncated) issues.add('truncated', where());
  if (uncalculated > 0)
    issues.add('uncalculated-formulas', {
      ...where(),
      detail: `${uncalculated} formulas without a cached value`,
    });
  if (rootAttributes) {
    // namespace declarations the passed-through elements may rely on
    const declarations = Object.entries(rootAttributes)
      .filter(
        ([key]) =>
          key === 'xmlns' || key.startsWith('xmlns:') || key === 'mc:Ignorable',
      )
      .map(([key, value]) => `${key}="${value.replace(/"/g, '&quot;')}"`)
      .join(' ');
    if (sheet.passthrough.length && declarations)
      sheet.passthrough.unshift({ name: '#namespaces', xml: declarations });
  }

  function readTopLevel(local: string, source: string): void {
    if (!MODELLED.has(local)) {
      sheet.passthrough.push({ name: local, xml: source });
      // the extensions stay as written; the sparklines among them are also read
      if (local === 'extLst') readSparklines(parseOgeXmlTree(source));
      noteUnshown(local);
      return;
    }
    const node = parseOgeXmlTree(source);
    switch (local) {
      case 'sheetPr':
        readSheetProperties(node);
        break;
      case 'sheetViews':
        readViews(node);
        break;
      case 'sheetFormatPr':
        readFormat(node);
        break;
      case 'cols':
        readColumns(node);
        break;
      case 'mergeCells':
        for (const merge of ogeXmlChildren(node, 'mergeCell')) {
          const ref = merge.attributes['ref'];
          const range = ogeReadSqref(ref)[0];
          if (!range) issues.add('invalid-reference', where(ref));
          else if (!sheet.addMerge(range))
            issues.add('overlapping-merge', where(ref));
        }
        break;
      case 'hyperlinks':
        readHyperlinks(node);
        break;
      case 'conditionalFormatting':
        readConditionalFormat(node);
        break;
      case 'dataValidations':
        for (const rule of ogeXmlChildren(node, 'dataValidation'))
          readValidation(rule);
        break;
      case 'autoFilter':
        sheet.autoFilter = ogeReadAutoFilter(node, source);
        break;
      case 'sheetProtection':
        sheet.protection = { attributes: { ...node.attributes } };
        break;
      case 'printOptions':
        sheet.pageSetup = {
          ...sheet.pageSetup,
          printGridLines: ogeXmlBool(node.attributes['gridLines'], false),
          printHeadings: ogeXmlBool(node.attributes['headings'], false),
          centerHorizontally: ogeXmlBool(
            node.attributes['horizontalCentered'],
            false,
          ),
          centerVertically: ogeXmlBool(
            node.attributes['verticalCentered'],
            false,
          ),
        };
        break;
      case 'pageMargins': {
        const m = (key: string, fallback: number) =>
          ogeXmlNumber(node.attributes[key]) ?? fallback;
        sheet.pageSetup = {
          ...sheet.pageSetup,
          margins: {
            left: m('left', 0.7),
            right: m('right', 0.7),
            top: m('top', 0.75),
            bottom: m('bottom', 0.75),
            header: m('header', 0.3),
            footer: m('footer', 0.3),
          },
        };
        break;
      }
      case 'pageSetup': {
        const a = node.attributes;
        const orientation = a['orientation'];
        sheet.pageSetup = {
          ...sheet.pageSetup,
          ...(orientation === 'portrait' || orientation === 'landscape'
            ? { orientation }
            : {}),
          ...(ogeXmlIndex(a['paperSize']) !== undefined
            ? { paperSize: ogeXmlIndex(a['paperSize']) }
            : {}),
          ...(ogeXmlIndex(a['scale']) !== undefined
            ? { scale: ogeXmlIndex(a['scale']) }
            : {}),
          ...(ogeXmlIndex(a['fitToWidth']) !== undefined
            ? { fitToWidth: ogeXmlIndex(a['fitToWidth']) }
            : {}),
          ...(ogeXmlIndex(a['fitToHeight']) !== undefined
            ? { fitToHeight: ogeXmlIndex(a['fitToHeight']) }
            : {}),
        };
        // a printer-settings part (r:id) stays with the opaque parts
        break;
      }
      case 'headerFooter': {
        const header = ogeXmlChild(node, 'oddHeader')?.text;
        const footer = ogeXmlChild(node, 'oddFooter')?.text;
        sheet.pageSetup = {
          ...sheet.pageSetup,
          ...(header ? { oddHeader: header } : {}),
          ...(footer ? { oddFooter: footer } : {}),
        };
        break;
      }
      case 'rowBreaks':
      case 'colBreaks': {
        const breaks = ogeXmlChildren(node, 'brk')
          .map((brk) => ogeXmlIndex(brk.attributes['id']))
          .filter((id): id is number => id !== undefined && id > 0)
          .map((id) => id - 1);
        sheet.pageSetup = {
          ...sheet.pageSetup,
          ...(local === 'rowBreaks'
            ? { rowBreaks: breaks }
            : { columnBreaks: breaks }),
        };
        break;
      }
      // `dimension` is recomputed from the cells
    }
  }

  function noteUnshown(local: string): void {
    // drawings and tables are read by the workbook reader, which knows the
    // parts. Excel 2010's extensions (extLst) refine rules the model already
    // shows — data bar gradients, list validations on other sheets — or are
    // sparklines, which readSparklines reads
    if (local === 'picture') issues.add('drawing-not-shown', where());
    else if (
      local === 'oleObjects' ||
      local === 'controls' ||
      local === 'AlternateContent'
    ) {
      issues.add('drawing-not-shown', where());
    }
  }

  function readSheetProperties(node: OgeXmlNode): void {
    const tab = readOgeColor(ogeXmlChild(node, 'tabColor'));
    if (tab) sheet.tabColor = tab;
    const outline = ogeXmlChild(node, 'outlinePr');
    if (outline) {
      sheet.outline = {
        summaryBelow: ogeXmlBool(outline.attributes['summaryBelow'], true),
        summaryRight: ogeXmlBool(outline.attributes['summaryRight'], true),
      };
    }
    const fit = ogeXmlChild(node, 'pageSetUpPr');
    if (fit && ogeXmlBool(fit.attributes['fitToPage'], false))
      sheet.pageSetup = { ...sheet.pageSetup, fitToPage: true };
  }

  function readViews(node: OgeXmlNode): void {
    const view = ogeXmlChild(node, 'sheetView');
    if (!view) return;
    const a = view.attributes;
    const pane = ogeXmlChild(view, 'pane');
    const state = pane?.attributes['state'];
    const frozen = state === 'frozen' || state === 'frozenSplit';
    const split = !!pane && !frozen;
    if (split) issues.add('split-pane-ignored', where());
    const frozenColumns = frozen
      ? Math.trunc(ogeXmlNumber(pane?.attributes['xSplit']) ?? 0)
      : 0;
    const frozenRows = frozen
      ? Math.trunc(ogeXmlNumber(pane?.attributes['ySplit']) ?? 0)
      : 0;
    const activePane =
      pane?.attributes['activePane'] ?? (pane ? 'bottomRight' : undefined);
    const selections = ogeXmlChildren(view, 'selection');
    const selection =
      selections.find(
        (s) =>
          (s.attributes['pane'] ?? (pane ? 'topLeft' : undefined)) ===
          activePane,
      ) ?? selections[selections.length - 1];
    const active = parseOgeCellAddress(
      selection?.attributes['activeCell'] ?? '',
    );
    const ranges = ogeReadSqref(selection?.attributes['sqref']);
    const topLeftText =
      (frozen ? pane?.attributes['topLeftCell'] : undefined) ??
      a['topLeftCell'];
    const topLeft = topLeftText ? parseOgeCellAddress(topLeftText) : null;
    const zoom = ogeXmlIndex(a['zoomScale']);
    const mode = a['view'];
    const next: OgeSheetView = {
      frozenRows: Math.max(0, Math.min(frozenRows, OGE_SHEET_MAX_ROWS - 1)),
      frozenColumns: Math.max(
        0,
        Math.min(frozenColumns, OGE_SHEET_MAX_COLUMNS - 1),
      ),
      ...(topLeft ? { topLeft: { row: topLeft.row, col: topLeft.col } } : {}),
      zoom: zoom && zoom >= 10 && zoom <= 400 ? zoom : 100,
      showGridLines: ogeXmlBool(a['showGridLines'], true),
      showHeaders: ogeXmlBool(a['showRowColHeaders'], true),
      showZeros: ogeXmlBool(a['showZeros'], true),
      rightToLeft: ogeXmlBool(a['rightToLeft'], false),
      activeCell: active
        ? { row: active.row, col: active.col }
        : { row: 0, col: 0 },
      selection: ranges.length
        ? ranges
        : [
            active
              ? {
                  top: active.row,
                  left: active.col,
                  bottom: active.row,
                  right: active.col,
                }
              : { top: 0, left: 0, bottom: 0, right: 0 },
          ],
      ...(ogeXmlBool(a['showOutlineSymbols'], true)
        ? {}
        : { showOutlineSymbols: false }),
      ...(split ? { split: true } : {}),
      ...(mode === 'pageLayout' || mode === 'pageBreakPreview'
        ? { viewMode: mode }
        : {}),
    };
    sheet.view = next;
  }

  function readFormat(node: OgeXmlNode): void {
    const a = node.attributes;
    const defaultRowHeight = ogeXmlNumber(a['defaultRowHeight']);
    const baseColumnWidth = ogeXmlIndex(a['baseColWidth']);
    const defaultColumnWidth = ogeXmlNumber(a['defaultColWidth']);
    sheet.format = {
      defaultRowHeight:
        defaultRowHeight !== undefined && defaultRowHeight > 0
          ? defaultRowHeight
          : sheet.format.defaultRowHeight,
      baseColumnWidth:
        baseColumnWidth !== undefined
          ? baseColumnWidth
          : sheet.format.baseColumnWidth,
      ...(defaultColumnWidth !== undefined && defaultColumnWidth >= 0
        ? { defaultColumnWidth }
        : {}),
      ...(ogeXmlBool(a['customHeight'], false) ? { customHeight: true } : {}),
      ...(ogeXmlBool(a['zeroHeight'], false) ? { zeroHeight: true } : {}),
      ...(ogeXmlIndex(a['outlineLevelRow'])
        ? { outlineLevelRow: ogeXmlIndex(a['outlineLevelRow']) }
        : {}),
      ...(ogeXmlIndex(a['outlineLevelCol'])
        ? { outlineLevelCol: ogeXmlIndex(a['outlineLevelCol']) }
        : {}),
    };
  }

  function readColumns(node: OgeXmlNode): void {
    for (const col of ogeXmlChildren(node, 'col')) {
      const a = col.attributes;
      const min = ogeXmlIndex(a['min']);
      const max = ogeXmlIndex(a['max']);
      if (min === undefined || max === undefined || min < 1) {
        issues.add(
          'invalid-reference',
          where(undefined, `col ${a['min']}-${a['max']}`),
        );
        continue;
      }
      const first = min - 1;
      const last = Math.min(Math.max(max, min), OGE_SHEET_MAX_COLUMNS) - 1;
      const width = ogeXmlNumber(a['width']);
      const hidden = ogeXmlBool(a['hidden'], false);
      const outline = ogeXmlIndex(a['outlineLevel']);
      const collapsed = ogeXmlBool(a['collapsed'], false);
      const style = styleOf(ogeXmlIndex(a['style']) ?? 0, '');
      sheet.setColumns(first, last, {
        ...(width !== undefined && width >= 0 ? { width } : {}),
        ...(hidden ? { hidden: true } : {}),
        ...(outline ? { outlineLevel: Math.min(outline, 7) } : {}),
        ...(collapsed ? { collapsed: true } : {}),
        ...(style ? { style } : {}),
      });
    }
  }

  /** Excel 2010's sparkline groups (`extLst` → `ext` → `x14:sparklineGroups`). */
  function readSparklines(node: OgeXmlNode): void {
    for (const ext of ogeXmlChildren(node, 'ext'))
      for (const groups of ogeXmlChildren(ext, 'sparklineGroups'))
        for (const group of ogeXmlChildren(groups, 'sparklineGroup')) {
          const sparklines: OgeSparkline[] = [];
          const list = ogeXmlChild(group, 'sparklines');
          for (const item of ogeXmlChildren(list, 'sparkline')) {
            const at = parseOgeRangeAddress(
              ogeXmlChild(item, 'sqref')?.text.trim() ?? '',
            );
            if (!at) continue;
            const ref = ogeXmlChild(item, 'f')?.text.trim();
            sparklines.push({
              cell: { row: at.top, col: at.left },
              ...(ref ? { ref } : {}),
            });
          }
          if (!sparklines.length) continue;
          const a = group.attributes;
          const colors: {
            -readonly [P in keyof OgeSparklineColors]: OgeSparklineColors[P];
          } = {};
          for (const [part, name] of SPARKLINE_COLORS) {
            const color = readOgeColor(ogeXmlChild(group, name));
            if (color) colors[part] = color;
          }
          const scale = (value: string | undefined): OgeSparklineAxisScale =>
            value === 'group' || value === 'custom' ? value : 'individual';
          const empty = a['displayEmptyCellsAs'];
          const manualMin = ogeXmlNumber(a['manualMin']);
          const manualMax = ogeXmlNumber(a['manualMax']);
          // the group's own `xm:f` is the date range of a date axis
          const dateRef = ogeXmlBool(a['dateAxis'], false)
            ? ogeXmlChild(group, 'f')?.text.trim()
            : undefined;
          sheet.sparklineGroups.push({
            type:
              a['type'] === 'column' || a['type'] === 'stacked'
                ? a['type']
                : 'line',
            sparklines,
            colors,
            lineWeight: ogeXmlNumber(a['lineWeight']) ?? 0.75,
            markers: ogeXmlBool(a['markers'], false),
            high: ogeXmlBool(a['high'], false),
            low: ogeXmlBool(a['low'], false),
            first: ogeXmlBool(a['first'], false),
            last: ogeXmlBool(a['last'], false),
            negative: ogeXmlBool(a['negative'], false),
            displayXAxis: ogeXmlBool(a['displayXAxis'], false),
            displayHidden: ogeXmlBool(a['displayHidden'], false),
            displayEmptyCellsAs:
              empty === 'gap' || empty === 'span' ? empty : 'zero',
            minAxisType: scale(a['minAxisType']),
            maxAxisType: scale(a['maxAxisType']),
            ...(manualMin !== undefined ? { manualMin } : {}),
            ...(manualMax !== undefined ? { manualMax } : {}),
            rightToLeft: ogeXmlBool(a['rightToLeft'], false),
            ...(dateRef ? { dateRef } : {}),
          });
        }
  }

  function readHyperlinks(node: OgeXmlNode): void {
    for (const link of ogeXmlChildren(node, 'hyperlink')) {
      const a = link.attributes;
      const ref = a['ref'];
      const range = ogeReadSqref(ref)[0];
      if (!range) {
        issues.add('invalid-reference', where(ref));
        continue;
      }
      const id = ogeXmlAttribute(a, 'id', true);
      const rel = id
        ? context.relationships.find((r) => r.id === id)
        : undefined;
      if (id && !rel) issues.add('missing-part', where(ref, `hyperlink ${id}`));
      sheet.addHyperlink({
        range,
        ...(rel ? { target: rel.target } : {}),
        ...(a['location'] ? { location: a['location'] } : {}),
        ...(a['tooltip'] ? { tooltip: a['tooltip'] } : {}),
        ...(a['display'] ? { display: a['display'] } : {}),
      });
    }
  }

  function readConditionalValue(node: OgeXmlNode): OgeConditionalValue {
    const type = (node.attributes['type'] ??
      'num') as OgeConditionalValue['type'];
    const value = node.attributes['val'];
    return {
      type,
      ...(value !== undefined ? { value } : {}),
      ...(node.attributes['gte'] === '0' ? { greaterThan: true } : {}),
    };
  }

  function readConditionalFormat(node: OgeXmlNode): void {
    const ranges = ogeReadSqref(node.attributes['sqref'], (bad) =>
      issues.add('invalid-reference', where(bad)),
    );
    if (ranges.length === 0) return;
    const rules: OgeConditionalRule[] = [];
    for (const rule of ogeXmlChildren(node, 'cfRule')) {
      const a = rule.attributes;
      const type = a['type'] as OgeConditionalRuleType | undefined;
      if (!type) continue;
      const scale = ogeXmlChild(rule, 'colorScale');
      const bar = ogeXmlChild(rule, 'dataBar');
      const icons = ogeXmlChild(rule, 'iconSet');
      const formulas = ogeXmlChildren(rule, 'formula').map((f) => f.text);
      const dxf = ogeXmlIndex(a['dxfId']);
      const rank = ogeXmlIndex(a['rank']);
      const stdDev = ogeXmlIndex(a['stdDev']);
      rules.push({
        type,
        priority: ogeXmlIndex(a['priority']) ?? rules.length + 1,
        formulas,
        ...(dxf !== undefined ? { dxf } : {}),
        ...(ogeXmlBool(a['stopIfTrue'], false) ? { stopIfTrue: true } : {}),
        ...(a['operator'] ? { operator: a['operator'] } : {}),
        ...(a['text'] !== undefined ? { text: a['text'] } : {}),
        ...(a['timePeriod'] ? { timePeriod: a['timePeriod'] } : {}),
        ...(rank !== undefined ? { rank } : {}),
        ...(ogeXmlBool(a['percent'], false) ? { percent: true } : {}),
        ...(ogeXmlBool(a['bottom'], false) ? { bottom: true } : {}),
        ...(a['aboveAverage'] !== undefined
          ? { aboveAverage: ogeXmlBool(a['aboveAverage'], true) }
          : {}),
        ...(ogeXmlBool(a['equalAverage'], false) ? { equalAverage: true } : {}),
        ...(stdDev ? { stdDev } : {}),
        ...(scale
          ? {
              colorScale: {
                values: ogeXmlChildren(scale, 'cfvo').map(readConditionalValue),
                colors: ogeXmlChildren(scale, 'color')
                  .map((c) => readOgeColor(c))
                  .filter((c): c is NonNullable<typeof c> => !!c),
              },
            }
          : {}),
        ...(bar
          ? {
              dataBar: {
                min: readConditionalValue(
                  ogeXmlChildren(bar, 'cfvo')[0] ?? bar,
                ),
                max: readConditionalValue(
                  ogeXmlChildren(bar, 'cfvo')[1] ?? bar,
                ),
                color: readOgeColor(ogeXmlChild(bar, 'color')) ?? {
                  rgb: 'FF638EC6',
                },
                showValue: ogeXmlBool(bar.attributes['showValue'], true),
                minLength: ogeXmlIndex(bar.attributes['minLength']) ?? 10,
                maxLength: ogeXmlIndex(bar.attributes['maxLength']) ?? 90,
              },
            }
          : {}),
        ...(icons
          ? {
              iconSet: {
                iconSet: icons.attributes['iconSet'] ?? '3TrafficLights1',
                values: ogeXmlChildren(icons, 'cfvo').map(readConditionalValue),
                reverse: ogeXmlBool(icons.attributes['reverse'], false),
                showValue: ogeXmlBool(icons.attributes['showValue'], true),
              },
            }
          : {}),
      });
    }
    if (rules.some((rule) => !ogeConditionalRuleSupported(rule))) {
      issues.add(
        'conditional-format-needs-formulas',
        where(node.attributes['sqref']),
      );
    }
    if (rules.length) sheet.conditionalFormats.push({ ranges, rules });
  }

  function readValidation(node: OgeXmlNode): void {
    const a = node.attributes;
    const ranges = ogeReadSqref(a['sqref']);
    if (ranges.length === 0) return;
    const type = (a['type'] ?? 'none') as OgeDataValidation['type'];
    const errorStyle = a['errorStyle'];
    const formula1 = ogeXmlChild(node, 'formula1')?.text;
    const formula2 = ogeXmlChild(node, 'formula2')?.text;
    sheet.dataValidations.push({
      ranges,
      type,
      ...(a['operator'] ? { operator: a['operator'] } : {}),
      ...(formula1 !== undefined ? { formula1 } : {}),
      ...(formula2 !== undefined ? { formula2 } : {}),
      ...(ogeXmlBool(a['allowBlank'], false) ? { allowBlank: true } : {}),
      ...(ogeXmlBool(a['showDropDown'], false) ? { hideDropDown: true } : {}),
      ...(ogeXmlBool(a['showInputMessage'], false)
        ? { showInputMessage: true }
        : {}),
      ...(ogeXmlBool(a['showErrorMessage'], false)
        ? { showErrorMessage: true }
        : {}),
      ...(errorStyle === 'warning' ||
      errorStyle === 'information' ||
      errorStyle === 'stop'
        ? { errorStyle }
        : {}),
      ...(a['promptTitle'] ? { promptTitle: a['promptTitle'] } : {}),
      ...(a['prompt'] ? { prompt: a['prompt'] } : {}),
      ...(a['errorTitle'] ? { errorTitle: a['errorTitle'] } : {}),
      ...(a['error'] ? { error: a['error'] } : {}),
    });
  }
}
