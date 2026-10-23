/**
 * Reads an xlsx / xlsm / xltx file into an `OgeWorkbook` — in the browser,
 * a Web Worker or Node, with no dependency.
 *
 * Two entry points share one reader: `readOgeXlsx` inflates parts with the
 * platform's `DecompressionStream` (falling back to the engine's own
 * decoder), `readOgeXlsxSync` uses the engine's decoder only. Everything the
 * workbook model does not hold — drawings, charts, images, pivot caches, VBA,
 * custom XML — is kept as opaque parts so a later save (P2) loses nothing,
 * and everything not taken over exactly is listed in `issues` (ADR 0005).
 */
import { OGE_OFFICE_THEME_COLORS } from '../color/color';
import {
  OGE_DEFAULT_FONT,
  OgeWorkbook,
  type OgeOpaquePart,
} from '../model/workbook';
import { OgeWorksheet } from '../model/worksheet';
import type { OgeFont } from '../model/style';
import {
  OgeZipError,
  isOgeOleContainer,
  readOgeZip,
  readOgeZipEntry,
  readOgeZipEntrySync,
  type OgeZipLimits,
} from '../zip/zip';
import { OgeXmlError } from '../xml/xml';
import { OgeImportIssueLog, type OgeImportIssue } from './import-issues';
import { OgePackageParts, type OgeRelationship } from './package';
import { readOgeRichTextNode, readOgeSharedStrings } from './read-strings';
import { readOgeStyleSheet } from './read-styles';
import { readOgeTheme } from './read-theme';
import { readOgeWorksheet } from './read-worksheet';
import { readOgeDrawing } from './read-drawing';
import { readOgeTable } from './read-table';
import { ogeTableStyleFormats } from '../model/table-styles';
import type { OgeChartReadContext } from './read-chart';
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
import { parseOgeCellAddress } from '../address/address';
import { validateOgeSheetName } from '../model/workbook';
import { ogeFontMetrics } from '../metrics/font-metrics';

/** What a reader accepts: bytes, a buffer, or a `Blob`/`File`. */
export type OgeXlsxSource = ArrayBuffer | Uint8Array | Blob;

/** Reader options. */
export interface OgeXlsxReadOptions {
  /** Limits on the ZIP container (entry count, inflated sizes). */
  readonly limits?: OgeZipLimits;
  /** Most cells read across all sheets (default 5,000,000); the rest is reported as `truncated`. */
  readonly maxCells?: number;
  /** Base of generated sheet names when a file's name must be replaced. Default `Sheet`. */
  readonly newSheetName?: string;
  /** Cancels the read: the promise rejects with an `OgeXlsxError` of code `aborted`. */
  readonly signal?: AbortSignal;
}

/** A read workbook and what could not be taken over exactly. */
export interface OgeXlsxReadResult {
  readonly workbook: OgeWorkbook;
  readonly issues: readonly OgeImportIssue[];
}

/** Why a file could not be read at all. */
export type OgeXlsxErrorCode =
  /** Not a ZIP package with a workbook part. */
  | 'not-xlsx'
  /** An OLE container: a password-protected workbook or a legacy `.xls`. */
  | 'encrypted-or-legacy'
  /** A binary workbook (`.xlsb`). */
  | 'xlsb'
  /** The package is damaged (bad ZIP structure, CRC mismatch, malformed workbook part). */
  | 'corrupt'
  /** Past the configured size limits. */
  | 'too-large'
  /** `signal` was aborted. */
  | 'aborted'
  /** A URL source could not be fetched (the viewer's own download). */
  | 'fetch-failed';

/** A file the reader refuses. */
export class OgeXlsxError extends Error {
  constructor(
    readonly code: OgeXlsxErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OgeXlsxError';
  }
}

const DEFAULT_MAX_CELLS = 5_000_000;

async function bytesOf(source: OgeXlsxSource): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  return new Uint8Array(await source.arrayBuffer());
}

function zipFailure(error: unknown): never {
  if (error instanceof OgeZipError) {
    const code: OgeXlsxErrorCode =
      error.code === 'ole-container' || error.code === 'encrypted'
        ? 'encrypted-or-legacy'
        : error.code === 'too-large' || error.code === 'too-many-entries'
          ? 'too-large'
          : error.code === 'not-zip'
            ? 'not-xlsx'
            : 'corrupt';
    throw new OgeXlsxError(code, error.message);
  }
  throw error;
}

function checkAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted)
    throw new OgeXlsxError('aborted', 'The read was aborted');
}

/** Reads a workbook, inflating parts natively where the platform can. */
export async function readOgeXlsx(
  source: OgeXlsxSource,
  options: OgeXlsxReadOptions = {},
): Promise<OgeXlsxReadResult> {
  checkAborted(options.signal);
  const bytes = await bytesOf(source);
  if (isOgeOleContainer(bytes))
    throw new OgeXlsxError(
      'encrypted-or-legacy',
      'The file is encrypted or a legacy .xls workbook',
    );
  let archive;
  try {
    archive = readOgeZip(bytes, options.limits);
  } catch (error) {
    zipFailure(error);
  }
  const parts = new Map<string, Uint8Array>();
  for (const entry of archive.entries) {
    checkAborted(options.signal);
    if (entry.name.endsWith('/')) continue;
    try {
      parts.set(entry.name, await readOgeZipEntry(archive, entry));
    } catch (error) {
      zipFailure(error);
    }
  }
  checkAborted(options.signal);
  return readParts(parts, options);
}

/** Reads a workbook synchronously with the engine's own inflate. */
export function readOgeXlsxSync(
  source: ArrayBuffer | Uint8Array,
  options: Omit<OgeXlsxReadOptions, 'signal'> = {},
): OgeXlsxReadResult {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  if (isOgeOleContainer(bytes))
    throw new OgeXlsxError(
      'encrypted-or-legacy',
      'The file is encrypted or a legacy .xls workbook',
    );
  const parts = new Map<string, Uint8Array>();
  try {
    const archive = readOgeZip(bytes, options.limits);
    for (const entry of archive.entries) {
      if (!entry.name.endsWith('/'))
        parts.set(entry.name, readOgeZipEntrySync(archive, entry));
    }
  } catch (error) {
    zipFailure(error);
  }
  return readParts(parts, options);
}

/** A part as a tree; `undefined` (and an issue) when it is missing or malformed. */
function treeOf(
  pkg: OgePackageParts,
  path: string,
  issues: OgeImportIssueLog,
): OgeXmlNode | undefined {
  const text = pkg.text(path);
  if (text === undefined) {
    issues.add('missing-part', { part: path });
    return undefined;
  }
  try {
    return parseOgeXmlTree(text);
  } catch (error) {
    if (error instanceof OgeXmlError) {
      issues.add('malformed-part', { part: path, detail: error.message });
      return undefined;
    }
    throw error;
  }
}

/** The relationship types the reader consumes (their parts are regenerated on write). */
const CONSUMED_WORKBOOK_RELS = new Set([
  'worksheet',
  'styles',
  'sharedStrings',
  'theme',
  'calcChain',
]);

function readParts(
  parts: ReadonlyMap<string, Uint8Array>,
  options: OgeXlsxReadOptions,
): OgeXlsxReadResult {
  const pkg = new OgePackageParts(parts);
  const issues = new OgeImportIssueLog();
  const consumed = new Set<string>(['[content_types].xml']);
  const consume = (path: string) => consumed.add(path.toLowerCase());

  // ── the workbook part ──
  const office = pkg.relationshipOfType('', 'officeDocument');
  const workbookPath =
    office?.target ??
    (pkg.has('xl/workbook.xml') ? 'xl/workbook.xml' : undefined);
  if (!workbookPath || !pkg.has(workbookPath)) {
    throw new OgeXlsxError('not-xlsx', 'The package has no workbook part');
  }
  const mainType = pkg.contentType(workbookPath) ?? '';
  if (/binary/i.test(mainType) || workbookPath.toLowerCase().endsWith('.bin')) {
    throw new OgeXlsxError(
      'xlsb',
      'Binary workbooks (.xlsb) are not supported',
    );
  }
  if (office?.typeUri.includes('purl.oclc.org'))
    issues.add('strict-conformance', { part: workbookPath });
  consume(workbookPath);
  consume('_rels/.rels');
  const workbookText = pkg.text(workbookPath) ?? '';
  let workbookRoot: OgeXmlNode;
  try {
    workbookRoot = parseOgeXmlTree(workbookText);
  } catch (error) {
    throw new OgeXlsxError(
      'corrupt',
      `The workbook part is not well-formed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const workbookRels = pkg.relationships(workbookPath);
  consume(relsPathOf(workbookPath));
  const relById = new Map(workbookRels.map((rel) => [rel.id, rel]));

  // ── theme, styles, strings ──
  const themeRel = workbookRels.find((rel) => rel.type === 'theme');
  const theme = themeRel ? treeOf(pkg, themeRel.target, issues) : undefined;
  const themeData = theme ? readOgeTheme(theme) : undefined;

  const stylesRel = workbookRels.find((rel) => rel.type === 'styles');
  const stylesRoot = stylesRel
    ? treeOf(pkg, stylesRel.target, issues)
    : undefined;
  if (stylesRel) consume(stylesRel.target);
  const styleSheet = stylesRoot ? readOgeStyleSheet(stylesRoot) : undefined;

  let sharedStrings: ReturnType<typeof readOgeSharedStrings> = [];
  const stringsRel = workbookRels.find((rel) => rel.type === 'sharedStrings');
  if (stringsRel) {
    consume(stringsRel.target);
    const text = pkg.text(stringsRel.target);
    if (text === undefined)
      issues.add('missing-part', { part: stringsRel.target });
    else {
      try {
        sharedStrings = readOgeSharedStrings(text);
      } catch (error) {
        if (!(error instanceof OgeXmlError)) throw error;
        issues.add('malformed-part', {
          part: stringsRel.target,
          detail: error.message,
        });
      }
    }
  }
  const calcChain = workbookRels.find((rel) => rel.type === 'calcChain');
  if (calcChain) consume(calcChain.target);

  // ── the workbook ──
  const workbookPr = ogeXmlChild(workbookRoot, 'workbookPr');
  const date1904 = ogeXmlBool(workbookPr?.attributes['date1904'], false);
  const normalFont: OgeFont = styleSheet?.normalFont ?? OGE_DEFAULT_FONT;
  const workbook = new OgeWorkbook({
    dateSystem: date1904 ? '1904' : '1900',
    theme: themeData?.colors ?? OGE_OFFICE_THEME_COLORS,
    defaultFont: normalFont,
    newSheetName: options.newSheetName,
  });
  workbook.themeFonts = {
    ...(themeData?.majorFont ? { major: themeData.majorFont } : {}),
    ...(themeData?.minorFont ? { minor: themeData.minorFont } : {}),
  };
  workbook.indexedColors = styleSheet?.indexedColors;
  workbook.dxfs = styleSheet?.differential ?? [];
  workbook.tableStyles = styleSheet?.tableStyles ?? [];
  workbook.defaultTableStyle = styleSheet?.defaultTableStyle;
  workbook.defaultPivotStyle = styleSheet?.defaultPivotStyle;
  const styleIds = (styleSheet?.cellFormats ?? []).map((style) =>
    workbook.styles.intern(style),
  );
  const normalName =
    (normalFont.scheme === 'minor'
      ? themeData?.minorFont
      : normalFont.scheme === 'major'
        ? themeData?.majorFont
        : undefined) ?? normalFont.name;
  const normalRowPoints =
    (ogeFontMetrics(normalName, normalFont.size ?? 11).lineHeight * 3) / 4;

  const calcPr = ogeXmlChild(workbookRoot, 'calcPr');
  if (calcPr) {
    const mode = calcPr.attributes['calcMode'];
    workbook.calculation = {
      ...(mode === 'auto' || mode === 'manual' || mode === 'autoNoTable'
        ? { mode }
        : {}),
      ...(ogeXmlBool(calcPr.attributes['fullCalcOnLoad'], false)
        ? { fullCalcOnLoad: true }
        : {}),
      ...(ogeXmlBool(calcPr.attributes['iterate'], false)
        ? { iterate: true }
        : {}),
      ...(ogeXmlIndex(calcPr.attributes['iterateCount']) !== undefined
        ? { iterateCount: ogeXmlIndex(calcPr.attributes['iterateCount']) }
        : {}),
      ...(ogeXmlNumber(calcPr.attributes['iterateDelta']) !== undefined
        ? { iterateDelta: ogeXmlNumber(calcPr.attributes['iterateDelta']) }
        : {}),
    };
  }
  const protection = ogeXmlChild(workbookRoot, 'workbookProtection');
  if (protection) workbook.protection = { ...protection.attributes };

  // ── sheets ──
  const budget = { remaining: options.maxCells ?? DEFAULT_MAX_CELLS };
  const sheetEntries = ogeXmlChildren(
    ogeXmlChild(workbookRoot, 'sheets'),
    'sheet',
  );
  const sheetIndexByLocal: number[] = [];
  sheetEntries.forEach((entry, position) => {
    const a = entry.attributes;
    const rel = relById.get(ogeXmlAttribute(a, 'id', true) ?? '');
    if (!rel || rel.type !== 'worksheet') {
      // chart sheets, dialog sheets, macro sheets: kept opaque, not shown
      if (rel)
        issues.add('drawing-not-shown', {
          part: rel.target,
          detail: `${rel.type} "${a['name'] ?? ''}"`,
        });
      else issues.add('missing-part', { detail: `sheet "${a['name'] ?? ''}"` });
      sheetIndexByLocal[position] = -1;
      return;
    }
    let name = a['name'] ?? '';
    if (
      validateOgeSheetName(
        name,
        workbook.sheets.map((s) => s.name),
      )
    ) {
      issues.add('invalid-sheet-name', { detail: name });
      name = uniqueSheetName(workbook, options.newSheetName ?? 'Sheet');
    }
    const sheet = workbook.addSheet(name);
    // until the sheet says otherwise, rows are as tall as the Normal font's line
    sheet.format = { ...sheet.format, defaultRowHeight: normalRowPoints };
    sheetIndexByLocal[position] = workbook.sheets.length - 1;
    const state = a['state'];
    if (state === 'hidden' || state === 'veryHidden') sheet.state = state;
    readSheetPart(pkg, rel.target, sheet, {
      styleIds,
      sharedStrings,
      workbook,
      issues,
      budget,
      consume,
      charts: {
        theme: themeData?.colors ?? OGE_OFFICE_THEME_COLORS,
        ...(themeData?.majorFont ? { majorFont: themeData.majorFont } : {}),
        ...(themeData?.minorFont ? { minorFont: themeData.minorFont } : {}),
      },
    });
  });
  if (workbook.sheets.length === 0) {
    issues.add('missing-part', { detail: 'the workbook has no worksheet' });
    workbook.addSheet();
  }

  // ── view ──
  const view = ogeXmlChild(
    ogeXmlChild(workbookRoot, 'bookViews'),
    'workbookView',
  );
  const activeTab =
    sheetIndexByLocal[ogeXmlIndex(view?.attributes['activeTab']) ?? 0] ?? 0;
  const visible = (index: number) =>
    workbook.sheets[index]?.state === 'visible';
  workbook.activeSheet = visible(activeTab)
    ? activeTab
    : Math.max(
        0,
        workbook.sheets.findIndex((s) => s.state === 'visible'),
      );
  workbook.showSheetTabs = ogeXmlBool(view?.attributes['showSheetTabs'], true);

  // ── defined names ──
  for (const definedName of ogeXmlChildren(
    ogeXmlChild(workbookRoot, 'definedNames'),
    'definedName',
  )) {
    const a = definedName.attributes;
    const local = ogeXmlIndex(a['localSheetId']);
    const sheet = local === undefined ? undefined : sheetIndexByLocal[local];
    if (local !== undefined && (sheet === undefined || sheet < 0)) {
      issues.add('invalid-defined-name', {
        detail: `${a['name']} (sheet ${local})`,
      });
      continue;
    }
    try {
      workbook.defineName({
        name: a['name'] ?? '',
        formula: definedName.text,
        ...(sheet !== undefined ? { sheet } : {}),
        ...(ogeXmlBool(a['hidden'], false) ? { hidden: true } : {}),
        ...(a['comment'] ? { comment: a['comment'] } : {}),
      });
    } catch {
      issues.add('invalid-defined-name', { detail: a['name'] ?? '' });
    }
  }

  // ── workbook-level relationships the reader does not model ──
  for (const rel of workbookRels) {
    if (rel.type === 'externalLink')
      issues.add('external-link', { part: rel.target });
    else if (rel.type === 'vbaProject')
      issues.add('macros-kept', { part: rel.target });
    else if (rel.type === 'pivotCacheDefinition')
      issues.add('pivot-style-not-shown', { part: rel.target });
    if (CONSUMED_WORKBOOK_RELS.has(rel.type) && !rel.external)
      consume(rel.target);
  }

  // ── document properties ──
  readProperties(pkg, workbook, consume);

  // ── everything else stays opaque ──
  const opaque: OgeOpaquePart[] = [];
  for (const path of pkg.paths()) {
    const key = path.toLowerCase();
    if (consumed.has(key) || path.endsWith('/')) continue;
    if (themeRel && key === themeRel.target.toLowerCase()) {
      // the theme is read *and* kept, so a save keeps its fonts and effects
    } else if (key.endsWith('.rels')) {
      const source = sourceOfRels(path);
      if (source !== undefined && consumed.has(source.toLowerCase())) continue;
    }
    const data = pkg.bytes(path);
    if (data) opaque.push({ path, contentType: pkg.contentType(path), data });
  }
  workbook.opaqueParts = opaque;

  return { workbook, issues: issues.list() };
}

interface SheetPartContext {
  readonly styleIds: readonly number[];
  readonly sharedStrings: ReturnType<typeof readOgeSharedStrings>;
  readonly workbook: OgeWorkbook;
  readonly issues: OgeImportIssueLog;
  readonly budget: { remaining: number };
  readonly consume: (path: string) => void;
  /** The theme's colours and fonts, for the charts' parts. */
  readonly charts: OgeChartReadContext;
}

/** Relationship types of a sheet the reader turns into model content. */
const CONSUMED_SHEET_RELS = new Set(['hyperlink', 'comments']);

function readSheetPart(
  pkg: OgePackageParts,
  path: string,
  sheet: OgeWorksheet,
  context: SheetPartContext,
): void {
  const { issues } = context;
  context.consume(path);
  const rels = pkg.relationships(path);
  context.consume(relsPathOf(path));
  const xml = pkg.text(path);
  if (xml === undefined) {
    issues.add('missing-part', { sheet: sheet.name, part: path });
    return;
  }
  try {
    readOgeWorksheet(xml, sheet, {
      styleIds: context.styleIds,
      sharedStrings: context.sharedStrings,
      dateSystem: context.workbook.dateSystem,
      relationships: rels,
      issues,
      part: path,
      budget: context.budget,
    });
  } catch (error) {
    if (!(error instanceof OgeXmlError)) throw error;
    issues.add('malformed-part', {
      sheet: sheet.name,
      part: path,
      detail: error.message,
    });
  }
  const comments = rels.find((rel) => rel.type === 'comments');
  if (comments) {
    context.consume(comments.target);
    const vml = rels.find((rel) => rel.type === 'vmlDrawing');
    readNotes(pkg, comments.target, vml, sheet, issues);
  }
  for (const drawing of rels.filter(
    (rel) => rel.type === 'drawing' && !rel.external,
  )) {
    const root = treeOf(pkg, drawing.target, issues);
    if (!root) continue;
    const content = readOgeDrawing(root, drawing.target, pkg, context.charts);
    sheet.pictures.push(...content.pictures);
    sheet.charts.push(...content.charts);
    if (content.others > 0)
      issues.add('drawing-not-shown', {
        sheet: sheet.name,
        part: drawing.target,
        detail: `${content.others} shapes or linked pictures`,
      });
    if (content.undrawnCharts.length > 0)
      issues.add('chart-type-not-shown', {
        sheet: sheet.name,
        part: drawing.target,
        detail: content.undrawnCharts.join(', '),
      });
    if (content.unshowable > 0)
      issues.add('picture-format-not-shown', {
        sheet: sheet.name,
        part: drawing.target,
        detail: `${content.unshowable} EMF/WMF pictures`,
      });
  }
  for (const rel of rels.filter(
    (rel) => rel.type === 'table' && !rel.external,
  )) {
    readSheetTable(pkg, rel.target, sheet, context);
  }
  if (rels.some((rel) => rel.type === 'threadedComment')) {
    issues.add('threaded-comments-as-notes', { sheet: sheet.name, part: path });
  }
  if (rels.some((rel) => rel.type === 'pivotTable')) {
    issues.add('pivot-style-not-shown', { sheet: sheet.name, part: path });
  }
  sheet.opaqueRelationships = rels
    .filter((rel) => !CONSUMED_SHEET_RELS.has(rel.type))
    .map((rel) => ({
      id: rel.id,
      type: rel.typeUri,
      target: rel.target,
      external: rel.external,
    }));
}

/** A table part → `sheet.tables`; a style neither the workbook nor Excel knows is reported. */
function readSheetTable(
  pkg: OgePackageParts,
  part: string,
  sheet: OgeWorksheet,
  context: SheetPartContext,
): void {
  const { issues, workbook } = context;
  const xml = pkg.text(part);
  if (xml === undefined) {
    issues.add('missing-part', { sheet: sheet.name, part });
    return;
  }
  let table: ReturnType<typeof readOgeTable>;
  try {
    table = readOgeTable(xml, part);
  } catch (error) {
    if (!(error instanceof OgeXmlError)) throw error;
    issues.add('malformed-part', {
      sheet: sheet.name,
      part,
      detail: error.message,
    });
    return;
  }
  if (!table) {
    issues.add('invalid-reference', { sheet: sheet.name, part });
    return;
  }
  sheet.tables.push(table);
  const name = table.style?.name;
  if (name && !ogeTableStyleFormats(workbook, name))
    issues.add('table-style-not-shown', {
      sheet: sheet.name,
      part,
      detail: name,
    });
}

/** Legacy comments → notes; their VML shapes say which ones are pinned open. */
function readNotes(
  pkg: OgePackageParts,
  path: string,
  vml: OgeRelationship | undefined,
  sheet: OgeWorksheet,
  issues: OgeImportIssueLog,
): void {
  const root = treeOf(pkg, path, issues);
  if (!root) return;
  const authors = ogeXmlChildren(ogeXmlChild(root, 'authors'), 'author').map(
    (a) => a.text,
  );
  const pinned = vml
    ? visibleNoteCells(pkg.text(vml.target) ?? '')
    : new Set<string>();
  for (const comment of ogeXmlChildren(
    ogeXmlChild(root, 'commentList'),
    'comment',
  )) {
    const ref = comment.attributes['ref'];
    const cell = ref ? parseOgeCellAddress(ref) : null;
    if (!cell) {
      issues.add('invalid-reference', { sheet: sheet.name, part: path, ref });
      continue;
    }
    const textNode = ogeXmlChild(comment, 'text');
    const text = textNode ? readOgeRichTextNode(textNode) : '';
    const plain =
      typeof text === 'string' ? text : text.runs.map((r) => r.text).join('');
    const author = authors[ogeXmlIndex(comment.attributes['authorId']) ?? -1];
    sheet.setNote(cell.row, cell.col, {
      text,
      ...(author ? { author } : {}),
      ...(pinned.has(`${cell.row},${cell.col}`) ? { visible: true } : {}),
      ...(plain.startsWith('[Threaded comment]') ? { threaded: true } : {}),
    });
  }
}

/**
 * Cells whose note shape is pinned open. Excel's VML is not always
 * well-formed XML, so the shapes are scanned rather than parsed.
 */
function visibleNoteCells(vml: string): Set<string> {
  const cells = new Set<string>();
  const shapes = vml.split(/<x:ClientData\b/).slice(1);
  for (const shape of shapes) {
    const body = shape.slice(0, shape.indexOf('</x:ClientData>') >>> 0);
    if (
      !/ObjectType="Note"/.test(body.slice(0, 40)) ||
      !/<x:Visible\s*\/?>/.test(body)
    )
      continue;
    const row = /<x:Row>\s*(\d+)\s*<\/x:Row>/.exec(body);
    const col = /<x:Column>\s*(\d+)\s*<\/x:Column>/.exec(body);
    if (row && col) cells.add(`${Number(row[1])},${Number(col[1])}`);
  }
  return cells;
}

function readProperties(
  pkg: OgePackageParts,
  workbook: OgeWorkbook,
  consume: (path: string) => void,
): void {
  const rels = pkg.relationships('');
  const core = rels.find((rel) => rel.type === 'core-properties');
  const app = rels.find((rel) => rel.type === 'extended-properties');
  const text = (node: OgeXmlNode | undefined, name: string) => {
    const value = ogeXmlChild(node, name)?.text.trim();
    return value ? value : undefined;
  };
  let properties = {};
  const ignore = new OgeImportIssueLog();
  if (core) {
    const root = treeOf(pkg, core.target, ignore);
    if (root) {
      consume(core.target);
      properties = {
        ...properties,
        ...pick({
          title: text(root, 'title'),
          subject: text(root, 'subject'),
          creator: text(root, 'creator'),
          keywords: text(root, 'keywords'),
          description: text(root, 'description'),
          lastModifiedBy: text(root, 'lastModifiedBy'),
          created: text(root, 'created'),
          modified: text(root, 'modified'),
        }),
      };
    }
  }
  if (app) {
    const root = treeOf(pkg, app.target, ignore);
    if (root) {
      consume(app.target);
      properties = {
        ...properties,
        ...pick({
          application: text(root, 'Application'),
          company: text(root, 'Company'),
        }),
      };
    }
  }
  workbook.properties = properties;
}

function pick<T extends Record<string, string | undefined>>(
  record: T,
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(record) as (keyof T)[]) {
    if (record[key] !== undefined) out[key] = record[key];
  }
  return out;
}

function relsPathOf(path: string): string {
  const slash = path.lastIndexOf('/');
  return `${path.slice(0, slash + 1)}_rels/${path.slice(slash + 1)}.rels`;
}

/** The part a `.rels` file belongs to (`xl/_rels/workbook.xml.rels` → `xl/workbook.xml`). */
function sourceOfRels(path: string): string | undefined {
  const match = /^(.*?)_rels\/([^/]+)\.rels$/i.exec(path);
  return match ? `${match[1]}${match[2]}` : undefined;
}

function uniqueSheetName(workbook: OgeWorkbook, base: string): string {
  const taken = new Set(workbook.sheets.map((s) => s.name.toUpperCase()));
  for (let n = workbook.sheets.length + 1; ; n++) {
    const candidate = `${base}${n}`;
    if (!taken.has(candidate.toUpperCase())) return candidate;
  }
}
