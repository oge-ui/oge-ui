/**
 * Reads a docx package into a document model, resolving what Word resolves:
 * the style chain, numbering, table styles and fields. Everything not taken
 * over exactly is listed in `issues` (ADR 0006). Macros and embedded objects
 * are never run, external targets never fetched.
 */
import { OgeImportIssueLog, type OgeImportIssue } from '../codec/import-issues';
import { OgePackageParts } from '../codec/package';
import { readOgeChart } from '../codec/read-chart';
import { OGE_DRAWN_CHART_KINDS } from '../codec/drawn-chart-kinds';
import { readOgeTheme, type OgeTheme } from '../codec/read-theme';
import {
  ogeXmlAttribute,
  ogeXmlChild,
  ogeXmlChildren,
  parseOgeXmlTree,
  type OgeXmlNode,
} from '../codec/xml-tree';
import { OGE_OFFICE_THEME_COLORS } from '../color/color';
import { ogeFindSlideColor } from '../powerpoint/color';
import { ogeIsSlideGeometryDrawn } from '../powerpoint/geometry';
import { OgeXmlError } from '../xml/xml';
import {
  OgeZipError,
  isOgeOleContainer,
  readOgeZip,
  readOgeZipEntry,
  readOgeZipEntrySync,
  type OgeZipLimits,
} from '../zip/zip';
import type {
  OgeWordBlock,
  OgeWordBorder,
  OgeWordCell,
  OgeWordDocument,
  OgeWordEdge,
  OgeWordFloat,
  OgeWordFloatPosition,
  OgeWordHeaderSet,
  OgeWordInline,
  OgeWordLineSpacing,
  OgeWordPageSetup,
  OgeWordParagraph,
  OgeWordPicture,
  OgeWordRow,
  OgeWordRunStyle,
  OgeWordSection,
  OgeWordShape,
  OgeWordTab,
  OgeWordTable,
} from './model';

/** Why a package could not be read at all. */
export type OgeDocxErrorCode =
  'not-docx' | 'encrypted-or-legacy' | 'corrupt' | 'too-large' | 'aborted';

/** A package that could not be read. */
export class OgeDocxError extends Error {
  constructor(
    readonly code: OgeDocxErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OgeDocxError';
  }
}

/** What {@link readOgeDocx} accepts. */
export type OgeDocxSource = ArrayBuffer | Uint8Array | Blob;

/** Options of {@link readOgeDocx}. */
export interface OgeDocxReadOptions {
  readonly limits?: OgeZipLimits;
  readonly signal?: AbortSignal;
}

/** The outcome of a read. */
export interface OgeDocxReadResult {
  readonly document: OgeWordDocument;
  readonly issues: readonly OgeImportIssue[];
}

const NOT_SHOWN = 'drawing-not-shown';
const EMU_PER_POINT = 12700;

function zipFailure(error: unknown): never {
  if (error instanceof OgeZipError) {
    const code: OgeDocxErrorCode =
      error.code === 'ole-container' || error.code === 'encrypted'
        ? 'encrypted-or-legacy'
        : error.code === 'too-large' || error.code === 'too-many-entries'
          ? 'too-large'
          : error.code === 'not-zip'
            ? 'not-docx'
            : 'corrupt';
    throw new OgeDocxError(code, error.message);
  }
  throw error;
}

function refuseOle(bytes: Uint8Array): void {
  if (isOgeOleContainer(bytes))
    throw new OgeDocxError(
      'encrypted-or-legacy',
      'The file is encrypted or a legacy .doc document',
    );
}

/** Reads a document, inflating parts natively where the platform can. */
export async function readOgeDocx(
  source: OgeDocxSource,
  options: OgeDocxReadOptions = {},
): Promise<OgeDocxReadResult> {
  const checkAborted = (): void => {
    if (options.signal?.aborted)
      throw new OgeDocxError('aborted', 'The read was aborted');
  };
  checkAborted();
  const bytes =
    source instanceof Uint8Array
      ? source
      : source instanceof ArrayBuffer
        ? new Uint8Array(source)
        : new Uint8Array(await source.arrayBuffer());
  refuseOle(bytes);
  const parts = new Map<string, Uint8Array>();
  try {
    const archive = readOgeZip(bytes, options.limits);
    for (const entry of archive.entries) {
      checkAborted();
      if (!entry.name.endsWith('/'))
        parts.set(entry.name, await readOgeZipEntry(archive, entry));
    }
  } catch (error) {
    zipFailure(error);
  }
  checkAborted();
  return new DocxReader(new OgePackageParts(parts)).read();
}

/** Reads a document synchronously with the engine's own inflate. */
export function readOgeDocxSync(
  source: ArrayBuffer | Uint8Array,
  options: Omit<OgeDocxReadOptions, 'signal'> = {},
): OgeDocxReadResult {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  refuseOle(bytes);
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
  return new DocxReader(new OgePackageParts(parts)).read();
}

// --- small readers ----------------------------------------------------------

const val = (node: OgeXmlNode | undefined): string | undefined =>
  node ? ogeXmlAttribute(node.attributes, 'val') : undefined;

const attr = (
  node: OgeXmlNode | undefined,
  name: string,
): string | undefined =>
  node ? ogeXmlAttribute(node.attributes, name) : undefined;

/** An `ST_OnOff` element: present and not false. */
function onOff(node: OgeXmlNode | undefined): boolean | undefined {
  if (!node) return undefined;
  const value = val(node);
  return value !== '0' && value !== 'false' && value !== 'off';
}

const twips = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n / 20 : undefined;
};

const color = (value: string | undefined): string | undefined =>
  value && /^[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : undefined;

const HIGHLIGHT: Readonly<Record<string, string>> = {
  yellow: 'FFFF00',
  green: '00FF00',
  cyan: '00FFFF',
  magenta: 'FF00FF',
  blue: '0000FF',
  red: 'FF0000',
  darkBlue: '000080',
  darkCyan: '008080',
  darkGreen: '008000',
  darkMagenta: '800080',
  darkRed: '800000',
  darkYellow: '808000',
  darkGray: '808080',
  lightGray: 'C0C0C0',
  black: '000000',
  white: 'FFFFFF',
};

interface RunBag {
  font?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  caps?: boolean;
  color?: string;
  highlight?: string | null;
  shading?: string | null;
  vertAlign?: OgeWordRunStyle['vertAlign'];
}

interface ParaBag {
  align?: OgeWordParagraph['align'];
  left?: number;
  right?: number;
  first?: number;
  before?: number;
  after?: number;
  lineRule?: OgeWordLineSpacing['rule'];
  lineValue?: number;
  keepNext?: boolean;
  keepLines?: boolean;
  widowControl?: boolean;
  pageBreakBefore?: boolean;
  contextualSpacing?: boolean;
  tabs?: OgeWordTab[];
  shading?: string | null;
  borders?: Partial<Record<OgeWordEdge, OgeWordBorder>>;
  numId?: string;
  level?: number;
}

function assign<T extends object>(target: T, source: T): void {
  for (const key of Object.keys(source) as (keyof T)[]) {
    if (source[key] !== undefined) target[key] = source[key];
  }
}

function shadingOf(node: OgeXmlNode | undefined): string | null | undefined {
  if (!node) return undefined;
  const fill = attr(node, 'fill');
  if (fill === 'auto' || fill === undefined) return null;
  return color(fill) ?? null;
}

function borderOf(node: OgeXmlNode | undefined): OgeWordBorder | undefined {
  const style = val(node);
  if (!node || !style || style === 'nil' || style === 'none') return undefined;
  const size = Number(attr(node, 'sz') ?? 4);
  return {
    width: size / 8,
    color: color(attr(node, 'color')) ?? '000000',
    style,
    space: Number(attr(node, 'space') ?? 0),
  };
}

const EDGES: readonly OgeWordEdge[] = ['top', 'left', 'bottom', 'right'];

function bordersOf(
  node: OgeXmlNode | undefined,
): Partial<Record<OgeWordEdge, OgeWordBorder>> | undefined {
  if (!node) return undefined;
  const out: Partial<Record<OgeWordEdge, OgeWordBorder>> = {};
  for (const edge of EDGES) {
    const source =
      ogeXmlChild(node, edge) ??
      (edge === 'left'
        ? ogeXmlChild(node, 'start')
        : edge === 'right'
          ? ogeXmlChild(node, 'end')
          : undefined);
    const border = borderOf(source);
    if (border) out[edge] = border;
  }
  return out;
}

interface StyleDef {
  readonly type: string;
  readonly basedOn?: string;
  readonly pPr?: OgeXmlNode;
  readonly rPr?: OgeXmlNode;
  readonly tblPr?: OgeXmlNode;
  readonly tcPr?: OgeXmlNode;
  readonly conditional: ReadonlyMap<string, OgeXmlNode>;
}

interface NumberingLevel {
  readonly format: string;
  readonly text: string;
  readonly start: number;
  readonly suffix: 'tab' | 'space' | 'nothing';
  readonly pPr?: OgeXmlNode;
  readonly rPr?: OgeXmlNode;
}

/** Word's symbol-font bullets, which live in the private use area. */
const SYMBOL_BULLETS: Readonly<Record<string, string>> = {
  '': '•',
  '': '▪',
  '': '➢',
  '': '✓',
  '': '❖',
};

/** What runs inherit inside a table cell. */
interface TableContext {
  readonly pPr: readonly OgeXmlNode[];
  readonly rPr: readonly OgeXmlNode[];
}

const NO_TABLE: TableContext = { pPr: [], rPr: [] };

class DocxReader {
  private readonly issues = new OgeImportIssueLog();
  private readonly media = new Map<
    string,
    { bytes: Uint8Array; contentType: string }
  >();
  private readonly styles = new Map<string, StyleDef>();
  private readonly levels = new Map<string, NumberingLevel[]>();
  private readonly counters = new Map<string, number[]>();
  private readonly overrides = new Map<string, Map<number, number>>();
  private readonly seenStart = new Set<string>();
  private readonly footnotes = new Map<string, readonly OgeWordBlock[]>();
  private readonly endnotes = new Map<string, readonly OgeWordBlock[]>();
  private defaultP: OgeXmlNode | undefined;
  private defaultR: OgeXmlNode | undefined;
  private defaultParagraphStyle = 'Normal';
  private theme: OgeTheme = { colors: OGE_OFFICE_THEME_COLORS };
  private main = '';

  constructor(private readonly pkg: OgePackageParts) {}

  read(): OgeDocxReadResult {
    const main = this.pkg.relationshipOfType('', 'officeDocument');
    if (
      !main ||
      !this.pkg.contentType(main.target)?.includes('wordprocessingml')
    ) {
      throw new OgeDocxError('not-docx', 'No document part in the package');
    }
    this.main = main.target;
    const root = this.tree(main.target);
    if (!root)
      throw new OgeDocxError('corrupt', 'The document part is malformed');
    if (this.pkg.paths().some((p) => /vbaProject\.bin$/i.test(p)))
      this.issues.add('macros-kept');

    const themeRel = this.pkg.relationshipOfType(main.target, 'theme');
    const themeTree = themeRel ? this.tree(themeRel.target) : undefined;
    if (themeTree) this.theme = readOgeTheme(themeTree);
    this.readStyles();
    this.readNumbering();

    const settingsRel = this.pkg.relationshipOfType(main.target, 'settings');
    const settings = settingsRel ? this.tree(settingsRel.target) : undefined;
    const defaultTab =
      twips(val(ogeXmlChild(settings, 'defaultTabStop'))) ?? 36;
    const evenAndOddHeaders =
      onOff(ogeXmlChild(settings, 'evenAndOddHeaders')) ?? false;
    this.readNotes(main.target, 'footnotes', 'footnote', this.footnotes);
    this.readNotes(main.target, 'endnotes', 'endnote', this.endnotes);

    const body = ogeXmlChild(root, 'body');
    const sections = this.readSections(body, main.target);
    return {
      document: {
        sections,
        defaultTab,
        evenAndOddHeaders,
        footnotes: this.footnotes,
        endnotes: this.endnotes,
        media: this.media,
      },
      issues: this.issues.list(),
    };
  }

  private tree(path: string): OgeXmlNode | undefined {
    const text = this.pkg.text(path);
    if (text === undefined) {
      this.issues.add('missing-part', { part: path });
      return undefined;
    }
    try {
      return parseOgeXmlTree(text);
    } catch (error) {
      if (error instanceof OgeXmlError) {
        this.issues.add('malformed-part', {
          part: path,
          detail: error.message,
        });
        return undefined;
      }
      throw error;
    }
  }

  private readStyles(): void {
    const rel = this.pkg.relationshipOfType(this.main, 'styles');
    const root = rel ? this.tree(rel.target) : undefined;
    const defaults = ogeXmlChild(root, 'docDefaults');
    this.defaultR = ogeXmlChild(ogeXmlChild(defaults, 'rPrDefault'), 'rPr');
    this.defaultP = ogeXmlChild(ogeXmlChild(defaults, 'pPrDefault'), 'pPr');
    for (const style of ogeXmlChildren(root, 'style')) {
      const id = attr(style, 'styleId');
      if (!id) continue;
      const type = attr(style, 'type') ?? 'paragraph';
      if (type === 'paragraph' && attr(style, 'default') === '1')
        this.defaultParagraphStyle = id;
      const conditional = new Map<string, OgeXmlNode>();
      for (const part of ogeXmlChildren(style, 'tblStylePr')) {
        const kind = attr(part, 'type');
        if (kind) conditional.set(kind, part);
      }
      this.styles.set(id, {
        type,
        basedOn: val(ogeXmlChild(style, 'basedOn')),
        pPr: ogeXmlChild(style, 'pPr'),
        rPr: ogeXmlChild(style, 'rPr'),
        tblPr: ogeXmlChild(style, 'tblPr'),
        tcPr: ogeXmlChild(style, 'tcPr'),
        conditional,
      });
    }
  }

  /** A style and its ancestors, root first. */
  private chain(id: string | undefined): StyleDef[] {
    const out: StyleDef[] = [];
    const seen = new Set<string>();
    let current = id;
    while (current && !seen.has(current)) {
      seen.add(current);
      const style = this.styles.get(current);
      if (!style) break;
      out.unshift(style);
      current = style.basedOn;
    }
    return out;
  }

  private readNumbering(): void {
    const rel = this.pkg.relationshipOfType(this.main, 'numbering');
    const root = rel ? this.tree(rel.target) : undefined;
    if (!root) return;
    const abstracts = new Map<string, OgeXmlNode>();
    for (const node of ogeXmlChildren(root, 'abstractNum')) {
      const id = attr(node, 'abstractNumId');
      if (id) abstracts.set(id, node);
    }
    for (const num of ogeXmlChildren(root, 'num')) {
      const numId = attr(num, 'numId');
      const abstractId = val(ogeXmlChild(num, 'abstractNumId'));
      const abstract = abstractId ? abstracts.get(abstractId) : undefined;
      if (!numId || !abstract) continue;
      const levels: NumberingLevel[] = [];
      for (const level of ogeXmlChildren(abstract, 'lvl')) {
        levels[Number(attr(level, 'ilvl') ?? 0)] = this.levelOf(level);
      }
      const starts = new Map<number, number>();
      for (const override of ogeXmlChildren(num, 'lvlOverride')) {
        const ilvl = Number(attr(override, 'ilvl') ?? 0);
        const inner = ogeXmlChild(override, 'lvl');
        if (inner) levels[ilvl] = this.levelOf(inner);
        const start = val(ogeXmlChild(override, 'startOverride'));
        if (start !== undefined) starts.set(ilvl, Number(start));
      }
      this.levels.set(numId, levels);
      this.overrides.set(numId, starts);
    }
  }

  private levelOf(level: OgeXmlNode): NumberingLevel {
    const suffix = val(ogeXmlChild(level, 'suff'));
    return {
      format: val(ogeXmlChild(level, 'numFmt')) ?? 'decimal',
      text: val(ogeXmlChild(level, 'lvlText')) ?? '',
      start: Number(val(ogeXmlChild(level, 'start')) ?? 1),
      suffix: suffix === 'space' || suffix === 'nothing' ? suffix : 'tab',
      pPr: ogeXmlChild(level, 'pPr'),
      rPr: ogeXmlChild(level, 'rPr'),
    };
  }

  private readNotes(
    main: string,
    relationship: string,
    element: string,
    into: Map<string, readonly OgeWordBlock[]>,
  ): void {
    const rel = this.pkg.relationshipOfType(main, relationship);
    const root = rel ? this.tree(rel.target) : undefined;
    if (!root || !rel) return;
    for (const note of ogeXmlChildren(root, element)) {
      const id = attr(note, 'id');
      const type = attr(note, 'type');
      if (!id || type === 'separator' || type === 'continuationSeparator')
        continue;
      into.set(id, this.blocks(note, rel.target, NO_TABLE));
    }
  }

  // --- property bags --------------------------------------------------------

  private applyP(bag: ParaBag, node: OgeXmlNode | undefined): void {
    if (!node) return;
    const jc = val(ogeXmlChild(node, 'jc'));
    const ind = ogeXmlChild(node, 'ind');
    const spacing = ogeXmlChild(node, 'spacing');
    const hanging = twips(attr(ind, 'hanging'));
    const firstLine = twips(attr(ind, 'firstLine'));
    const line = attr(spacing, 'line');
    const rule = attr(spacing, 'lineRule');
    const numPr = ogeXmlChild(node, 'numPr');
    const tabs = ogeXmlChild(node, 'tabs');
    assign(bag, {
      align:
        jc === 'center'
          ? 'center'
          : jc === 'right' || jc === 'end'
            ? 'right'
            : jc === 'both' || jc === 'distribute'
              ? 'both'
              : jc === 'left' || jc === 'start'
                ? 'left'
                : undefined,
      left: twips(attr(ind, 'left') ?? attr(ind, 'start')),
      right: twips(attr(ind, 'right') ?? attr(ind, 'end')),
      first: hanging !== undefined ? -hanging : firstLine,
      before: twips(attr(spacing, 'before')),
      after: twips(attr(spacing, 'after')),
      lineRule:
        line === undefined
          ? undefined
          : rule === 'exact'
            ? 'exact'
            : rule === 'atLeast'
              ? 'atLeast'
              : 'auto',
      lineValue: line === undefined ? undefined : Number(line),
      keepNext: onOff(ogeXmlChild(node, 'keepNext')),
      keepLines: onOff(ogeXmlChild(node, 'keepLines')),
      widowControl: onOff(ogeXmlChild(node, 'widowControl')),
      pageBreakBefore: onOff(ogeXmlChild(node, 'pageBreakBefore')),
      contextualSpacing: onOff(ogeXmlChild(node, 'contextualSpacing')),
      shading: shadingOf(ogeXmlChild(node, 'shd')),
      borders: bordersOf(ogeXmlChild(node, 'pBdr')),
      numId: val(ogeXmlChild(numPr, 'numId')),
      level:
        val(ogeXmlChild(numPr, 'ilvl')) === undefined
          ? undefined
          : Number(val(ogeXmlChild(numPr, 'ilvl'))),
    });
    if (tabs) {
      const merged = [...(bag.tabs ?? [])];
      for (const tab of ogeXmlChildren(tabs, 'tab')) {
        const position = twips(attr(tab, 'pos')) ?? 0;
        const kind = val(tab);
        const at = merged.findIndex((t) => t.position === position);
        if (at >= 0) merged.splice(at, 1);
        if (kind === 'clear') continue;
        merged.push({
          position,
          align:
            kind === 'center' || kind === 'right' || kind === 'decimal'
              ? kind
              : 'left',
          leader: attr(tab, 'leader') ?? 'none',
        });
      }
      bag.tabs = merged.sort((a, b) => a.position - b.position);
    }
  }

  private fontOf(rFonts: OgeXmlNode | undefined): string | undefined {
    if (!rFonts) return undefined;
    const theme = attr(rFonts, 'asciiTheme') ?? attr(rFonts, 'hAnsiTheme');
    if (theme?.startsWith('major')) return this.theme.majorFont;
    if (theme?.startsWith('minor')) return this.theme.minorFont;
    return attr(rFonts, 'ascii') ?? attr(rFonts, 'hAnsi');
  }

  private applyR(bag: RunBag, node: OgeXmlNode | undefined): void {
    if (!node) return;
    const size = val(ogeXmlChild(node, 'sz'));
    const u = val(ogeXmlChild(node, 'u'));
    const vertical = val(ogeXmlChild(node, 'vertAlign'));
    const hasU = ogeXmlChild(node, 'u') !== undefined;
    const highlight = val(ogeXmlChild(node, 'highlight'));
    assign(bag, {
      font: this.fontOf(ogeXmlChild(node, 'rFonts')),
      size: size === undefined ? undefined : Number(size) / 2,
      bold: onOff(ogeXmlChild(node, 'b')),
      italic: onOff(ogeXmlChild(node, 'i')),
      underline: hasU ? u !== 'none' : undefined,
      strike: onOff(ogeXmlChild(node, 'strike')),
      caps: onOff(ogeXmlChild(node, 'caps')),
      color: this.colorOf(ogeXmlChild(node, 'color')),
      highlight:
        highlight === undefined
          ? undefined
          : highlight === 'none'
            ? null
            : (HIGHLIGHT[highlight] ?? null),
      shading: shadingOf(ogeXmlChild(node, 'shd')),
      vertAlign:
        vertical === 'superscript' ||
        vertical === 'subscript' ||
        vertical === 'baseline'
          ? vertical
          : undefined,
    });
  }

  private colorOf(node: OgeXmlNode | undefined): string | undefined {
    const value = val(node);
    if (value === undefined) return undefined;
    return value === 'auto' ? '000000' : color(value);
  }

  private style(bag: RunBag, link: string | undefined): OgeWordRunStyle {
    return {
      font: bag.font ?? this.theme.minorFont ?? 'Calibri',
      size: bag.size ?? 10,
      bold: bag.bold ?? false,
      italic: bag.italic ?? false,
      underline: bag.underline ?? false,
      strike: bag.strike ?? false,
      caps: bag.caps ?? false,
      color: bag.color ?? '000000',
      background: bag.highlight ?? bag.shading ?? null,
      vertAlign: bag.vertAlign ?? 'baseline',
      ...(link ? { link } : {}),
    };
  }

  // --- structure ------------------------------------------------------------

  private readSections(
    body: OgeXmlNode | undefined,
    part: string,
  ): OgeWordSection[] {
    const sections: OgeWordSection[] = [];
    let blocks: OgeWordBlock[] = [];
    let headers: OgeWordHeaderSet = {};
    let footers: OgeWordHeaderSet = {};
    const finish = (props: OgeXmlNode | undefined): void => {
      headers = this.headerSet(props, 'headerReference', part, headers);
      footers = this.headerSet(props, 'footerReference', part, footers);
      sections.push(this.section(props, blocks, headers, footers));
      blocks = [];
    };
    const walk = (nodes: readonly OgeXmlNode[]): void => {
      for (const node of nodes) {
        if (node.name === 'sdt') {
          walk(ogeXmlChild(node, 'sdtContent')?.children ?? []);
        } else if (node.name === 'p') {
          blocks.push(this.paragraph(node, part, NO_TABLE));
          const props = ogeXmlChild(ogeXmlChild(node, 'pPr'), 'sectPr');
          if (props) finish(props);
        } else if (node.name === 'tbl') {
          blocks.push(this.table(node, part));
        } else if (node.name === 'sectPr') {
          finish(node);
        }
      }
    };
    walk(body?.children ?? []);
    if (blocks.length > 0 || sections.length === 0) finish(undefined);
    return sections;
  }

  private section(
    props: OgeXmlNode | undefined,
    blocks: OgeWordBlock[],
    headers: OgeWordHeaderSet,
    footers: OgeWordHeaderSet,
  ): OgeWordSection {
    const size = ogeXmlChild(props, 'pgSz');
    const margins = ogeXmlChild(props, 'pgMar');
    const cols = ogeXmlChild(props, 'cols');
    const kind = val(ogeXmlChild(props, 'type'));
    const page: OgeWordPageSetup = {
      width: twips(attr(size, 'w')) ?? 612,
      height: twips(attr(size, 'h')) ?? 792,
      top: twips(attr(margins, 'top')) ?? 72,
      bottom: twips(attr(margins, 'bottom')) ?? 72,
      left: twips(attr(margins, 'left')) ?? 72,
      right: twips(attr(margins, 'right')) ?? 72,
      header: twips(attr(margins, 'header')) ?? 36,
      footer: twips(attr(margins, 'footer')) ?? 36,
      columns: Math.max(1, Number(attr(cols, 'num') ?? 1)),
      columnGap: twips(attr(cols, 'space')) ?? 36,
    };
    return {
      page,
      type:
        kind === 'continuous' || kind === 'evenPage' || kind === 'oddPage'
          ? kind
          : 'nextPage',
      titlePage: onOff(ogeXmlChild(props, 'titlePg')) ?? false,
      headers,
      footers,
      blocks,
    };
  }

  private headerSet(
    props: OgeXmlNode | undefined,
    reference: string,
    part: string,
    inherited: OgeWordHeaderSet,
  ): OgeWordHeaderSet {
    const out: {
      default?: readonly OgeWordBlock[];
      first?: readonly OgeWordBlock[];
      even?: readonly OgeWordBlock[];
    } = { ...inherited };
    for (const node of ogeXmlChildren(props, reference)) {
      const id = ogeXmlAttribute(node.attributes, 'id', true);
      const rel = this.pkg.relationships(part).find((r) => r.id === id);
      const tree = rel ? this.tree(rel.target) : undefined;
      if (!rel || !tree) continue;
      const kind = attr(node, 'type') ?? 'default';
      if (kind === 'default' || kind === 'first' || kind === 'even')
        out[kind] = this.blocks(tree, rel.target, NO_TABLE);
    }
    return out;
  }

  private blocks(
    parent: OgeXmlNode,
    part: string,
    table: TableContext,
  ): OgeWordBlock[] {
    const out: OgeWordBlock[] = [];
    for (const node of parent.children) {
      if (node.name === 'p') out.push(this.paragraph(node, part, table));
      else if (node.name === 'tbl') out.push(this.table(node, part));
      else if (node.name === 'sdt')
        out.push(
          ...this.blocks(ogeXmlChild(node, 'sdtContent') ?? node, part, table),
        );
    }
    return out;
  }

  private paragraph(
    node: OgeXmlNode,
    part: string,
    table: TableContext,
  ): OgeWordParagraph {
    const pPr = ogeXmlChild(node, 'pPr');
    const styleId =
      val(ogeXmlChild(pPr, 'pStyle')) ?? this.defaultParagraphStyle;
    const chain = this.chain(styleId);

    const bag: ParaBag = {};
    this.applyP(bag, this.defaultP);
    for (const p of table.pPr) this.applyP(bag, p);
    for (const style of chain) this.applyP(bag, style.pPr);
    // the list level's indents sit between the style and direct formatting
    const direct: ParaBag = {};
    this.applyP(direct, pPr);
    const numId = direct.numId ?? bag.numId;
    const level = direct.level ?? bag.level ?? 0;
    const numbering =
      numId && numId !== '0' ? this.levels.get(numId)?.[level] : undefined;
    if (numbering) this.applyP(bag, numbering.pPr);
    this.applyP(bag, pPr);

    const run: RunBag = {};
    this.applyR(run, this.defaultR);
    for (const r of table.rPr) this.applyR(run, r);
    for (const style of chain) this.applyR(run, style.rPr);

    const markBag: RunBag = { ...run };
    this.applyR(markBag, ogeXmlChild(pPr, 'rPr'));
    const mark = this.style(markBag, undefined);

    let label: OgeWordParagraph['label'] = null;
    if (numbering && numId) {
      const labelBag: RunBag = { ...markBag };
      this.applyR(labelBag, numbering.rPr);
      label = {
        text: this.labelText(numId, level, numbering),
        style: this.style(labelBag, undefined),
        suffix: numbering.suffix,
      };
    }

    if (ogeXmlChild(pPr, 'bidi'))
      this.issues.add(NOT_SHOWN, {
        part,
        detail: 'right-to-left paragraph layout',
      });
    const inlines: OgeWordInline[] = [];
    this.inlines(node.children, run, part, undefined, inlines, {
      stack: [],
    });
    return {
      kind: 'paragraph',
      styleId,
      align: bag.align ?? 'left',
      left: bag.left ?? 0,
      right: bag.right ?? 0,
      first: bag.first ?? 0,
      before: bag.before ?? 0,
      after: bag.after ?? 0,
      line: {
        rule: bag.lineRule ?? 'auto',
        value: bag.lineValue ?? 240,
      },
      keepNext: bag.keepNext ?? false,
      keepLines: bag.keepLines ?? false,
      widowControl: bag.widowControl ?? true,
      pageBreakBefore: bag.pageBreakBefore ?? false,
      contextualSpacing: bag.contextualSpacing ?? false,
      tabs: bag.tabs ?? [],
      shading: bag.shading ?? null,
      borders: bag.borders ?? {},
      label,
      inlines,
      mark,
    };
  }

  private labelText(
    numId: string,
    level: number,
    numbering: NumberingLevel,
  ): string {
    const levels = this.levels.get(numId) ?? [];
    const counters = this.counters.get(numId) ?? [];
    const starts = this.overrides.get(numId);
    const startOf = (at: number): number =>
      starts?.get(at) ?? levels[at]?.start ?? 1;
    const key = `${numId}:${level}`;
    if (counters[level] === undefined || !this.seenStart.has(key)) {
      counters[level] = startOf(level);
      this.seenStart.add(key);
    } else {
      counters[level]++;
    }
    for (let deeper = level + 1; deeper < levels.length; deeper++) {
      this.seenStart.delete(`${numId}:${deeper}`);
    }
    this.counters.set(numId, counters);
    if (numbering.format === 'bullet') {
      return Array.from(numbering.text)
        .map((c) => SYMBOL_BULLETS[c] ?? c)
        .join('');
    }
    return numbering.text.replace(/%(\d+)/g, (_, digit: string) => {
      const at = Number(digit) - 1;
      const value = counters[at] ?? startOf(at);
      return this.formatNumber(value, levels[at]?.format ?? 'decimal');
    });
  }

  private formatNumber(value: number, format: string): string {
    const roman = (n: number): string => {
      const table: [number, string][] = [
        [1000, 'M'],
        [900, 'CM'],
        [500, 'D'],
        [400, 'CD'],
        [100, 'C'],
        [90, 'XC'],
        [50, 'L'],
        [40, 'XL'],
        [10, 'X'],
        [9, 'IX'],
        [5, 'V'],
        [4, 'IV'],
        [1, 'I'],
      ];
      let out = '';
      let rest = n;
      for (const [amount, text] of table) {
        while (rest >= amount) {
          out += text;
          rest -= amount;
        }
      }
      return out;
    };
    const letters = (n: number): string =>
      String.fromCharCode(65 + ((n - 1) % 26)).repeat(
        Math.floor((n - 1) / 26) + 1,
      );
    switch (format) {
      case 'upperRoman':
        return roman(value);
      case 'lowerRoman':
        return roman(value).toLowerCase();
      case 'upperLetter':
        return letters(value);
      case 'lowerLetter':
        return letters(value).toLowerCase();
      case 'decimalZero':
        return String(value).padStart(2, '0');
      default:
        return String(value);
    }
  }

  private inlines(
    nodes: readonly OgeXmlNode[],
    paragraphRun: RunBag,
    part: string,
    link: string | undefined,
    out: OgeWordInline[],
    fields: { stack: FieldState[] },
  ): void {
    for (const node of nodes) {
      switch (node.name) {
        case 'r':
          this.run(node, paragraphRun, part, link, out, fields);
          break;
        case 'hyperlink': {
          const id = ogeXmlAttribute(node.attributes, 'id', true);
          const rel = id
            ? this.pkg.relationships(part).find((r) => r.id === id)
            : undefined;
          this.inlines(
            node.children,
            paragraphRun,
            part,
            rel?.external ? rel.target : link,
            out,
            fields,
          );
          break;
        }
        case 'fldSimple': {
          const instr = (attr(node, 'instr') ?? '').trim().toUpperCase();
          const field = instr.startsWith('NUMPAGES')
            ? 'pages'
            : instr.startsWith('PAGE')
              ? 'page'
              : null;
          if (field) {
            const firstRun = ogeXmlChild(node, 'r');
            const bag: RunBag = { ...paragraphRun };
            this.applyRunStyle(bag, firstRun);
            out.push({ kind: 'field', field, style: this.style(bag, link) });
          } else {
            this.inlines(node.children, paragraphRun, part, link, out, fields);
          }
          break;
        }
        case 'ins':
        case 'smartTag':
        case 'customXml':
          this.inlines(node.children, paragraphRun, part, link, out, fields);
          break;
        case 'sdt':
          this.inlines(
            ogeXmlChild(node, 'sdtContent')?.children ?? [],
            paragraphRun,
            part,
            link,
            out,
            fields,
          );
          break;
        default:
          break;
      }
    }
  }

  private applyRunStyle(bag: RunBag, run: OgeXmlNode | undefined): void {
    const rPr = ogeXmlChild(run, 'rPr');
    const characterStyle = val(ogeXmlChild(rPr, 'rStyle'));
    for (const style of this.chain(characterStyle)) this.applyR(bag, style.rPr);
    this.applyR(bag, rPr);
  }

  private run(
    node: OgeXmlNode,
    paragraphRun: RunBag,
    part: string,
    link: string | undefined,
    out: OgeWordInline[],
    fields: { stack: FieldState[] },
  ): void {
    const bag: RunBag = { ...paragraphRun };
    this.applyRunStyle(bag, node);
    const top = (): FieldState | undefined =>
      fields.stack[fields.stack.length - 1];
    const fieldLink = fields.stack.find((f) => f.link)?.link;
    const style = this.style(bag, link ?? fieldLink);
    const showing = (): boolean =>
      fields.stack.every((f) => f.phase === 'result' && !f.replaced);
    for (const child of node.children) {
      switch (child.name) {
        case 'fldChar': {
          const kind = attr(child, 'fldCharType');
          if (kind === 'begin') {
            fields.stack.push({ phase: 'code', code: '', replaced: false });
          } else if (kind === 'separate') {
            const field = top();
            if (field) this.closeFieldCode(field, style, out);
          } else if (kind === 'end') {
            const field = top();
            if (field?.phase === 'code') this.closeFieldCode(field, style, out);
            fields.stack.pop();
          }
          break;
        }
        case 'instrText': {
          const field = top();
          if (field?.phase === 'code') field.code += child.text;
          break;
        }
        case 't':
          if (showing() && child.text)
            out.push({ kind: 'text', text: child.text, style });
          break;
        case 'tab':
          if (showing()) out.push({ kind: 'tab', style });
          break;
        case 'br': {
          if (!showing()) break;
          const type = attr(child, 'type');
          out.push({
            kind: 'break',
            type: type === 'page' || type === 'column' ? type : 'line',
            style,
          });
          break;
        }
        case 'cr':
          if (showing()) out.push({ kind: 'break', type: 'line', style });
          break;
        case 'noBreakHyphen':
          if (showing()) out.push({ kind: 'text', text: '‑', style });
          break;
        case 'sym': {
          if (!showing()) break;
          const code = String.fromCharCode(
            parseInt(attr(child, 'char') ?? '0', 16),
          );
          out.push({
            kind: 'text',
            text: SYMBOL_BULLETS[code] ?? code,
            style,
          });
          break;
        }
        case 'footnoteReference': {
          const id = attr(child, 'id');
          if (id) out.push({ kind: 'footnote', id, style });
          break;
        }
        case 'footnoteRef':
        case 'endnoteRef':
          out.push({ kind: 'text', text: '\u0001', style });
          break;
        case 'endnoteReference': {
          const id = attr(child, 'id');
          if (id) out.push({ kind: 'endnote', id, style });
          break;
        }
        case 'drawing':
          if (showing()) this.drawing(child, part, out);
          break;
        case 'pict':
        case 'object':
          this.issues.add(NOT_SHOWN, { part, detail: child.name });
          break;
        case 'AlternateContent': {
          const branch =
            ogeXmlChild(child, 'Choice') ?? ogeXmlChild(child, 'Fallback');
          for (const inner of branch?.children ?? []) {
            if (inner.name === 'drawing') this.drawing(inner, part, out);
            else this.issues.add(NOT_SHOWN, { part, detail: inner.name });
          }
          break;
        }
        default:
          break;
      }
    }
  }

  private closeFieldCode(
    field: FieldState,
    style: OgeWordRunStyle,
    out: OgeWordInline[],
  ): void {
    field.phase = 'result';
    const code = field.code.trim();
    const upper = code.toUpperCase();
    if (upper.startsWith('NUMPAGES') || /^PAGE(\s|$)/.test(upper)) {
      field.replaced = true;
      out.push({
        kind: 'field',
        field: upper.startsWith('NUMPAGES') ? 'pages' : 'page',
        style,
      });
    } else if (upper.startsWith('HYPERLINK')) {
      const match = /"([^"]+)"/.exec(code);
      if (match && !/\\l/.test(code)) field.link = match[1];
    }
  }

  // --- drawings -------------------------------------------------------------

  private picture(
    graphic: OgeXmlNode | undefined,
    part: string,
  ): OgeWordPicture | undefined {
    const data = ogeXmlChild(graphic, 'graphicData');
    const pic = ogeXmlChild(data, 'pic');
    const blipFill = ogeXmlChild(pic, 'blipFill');
    const blip = ogeXmlChild(blipFill, 'blip');
    const embed = blip && ogeXmlAttribute(blip.attributes, 'embed', true);
    if (!embed) {
      this.issues.add(NOT_SHOWN, {
        part,
        detail: blip ? 'linked picture' : 'shape',
      });
      return undefined;
    }
    const rel = this.pkg.relationships(part).find((r) => r.id === embed);
    const bytes = rel && !rel.external ? this.pkg.bytes(rel.target) : undefined;
    if (!rel || !bytes) {
      this.issues.add('missing-part', { part, detail: 'picture' });
      return undefined;
    }
    const contentType = this.pkg.contentType(rel.target) ?? '';
    if (/emf|wmf/i.test(contentType) || /\.(emf|wmf)$/i.test(rel.target)) {
      this.issues.add('picture-format-not-shown', { part: rel.target });
      return undefined;
    }
    this.media.set(rel.target, { bytes, contentType });
    const crop = ogeXmlChild(blipFill, 'srcRect')?.attributes ?? {};
    const edge = (name: string): number => Number(crop[name] ?? 0) / 100000;
    return {
      media: rel.target,
      crop: {
        left: edge('l'),
        top: edge('t'),
        right: edge('r'),
        bottom: edge('b'),
      },
    };
  }

  private drawing(
    drawing: OgeXmlNode,
    part: string,
    out: OgeWordInline[],
  ): void {
    const inline = ogeXmlChild(drawing, 'inline');
    const anchor = ogeXmlChild(drawing, 'anchor');
    const box = inline ?? anchor;
    if (!box) return;
    const extent = ogeXmlChild(box, 'extent');
    const width = Number(extent?.attributes['cx'] ?? 0) / EMU_PER_POINT;
    const height = Number(extent?.attributes['cy'] ?? 0) / EMU_PER_POINT;
    const graphic = ogeXmlChild(box, 'graphic');
    const description = ogeXmlChild(box, 'docPr')?.attributes['descr'];
    const data = ogeXmlChild(graphic, 'graphicData');
    const reference = ogeXmlChild(data, 'chart');
    if (reference && inline) {
      const chart = this.chart(reference, part, width, height);
      if (chart) out.push(chart);
      return;
    }
    const wsp = ogeXmlChild(data, 'wsp');
    if (wsp) {
      if (!anchor) {
        this.issues.add(NOT_SHOWN, { part, detail: 'inline shape' });
        return;
      }
      out.push({
        kind: 'float',
        float: this.float(
          anchor,
          { shape: this.shape(wsp, part) },
          width,
          height,
          description,
        ),
      });
      return;
    }
    const picture = this.picture(graphic, part);
    if (!picture) return;
    if (inline) {
      out.push({
        kind: 'picture',
        picture,
        width,
        height,
        ...(description ? { description } : {}),
      });
      return;
    }
    if (anchor) {
      out.push({
        kind: 'float',
        float: this.float(anchor, { picture }, width, height, description),
      });
    }
  }

  private chart(
    reference: OgeXmlNode,
    part: string,
    width: number,
    height: number,
  ): OgeWordInline | undefined {
    const id = ogeXmlAttribute(reference.attributes, 'id', true);
    const rel = id
      ? this.pkg.relationships(part).find((r) => r.id === id)
      : undefined;
    const tree = rel && !rel.external ? this.tree(rel.target) : undefined;
    if (!rel || !tree) {
      this.issues.add(NOT_SHOWN, { part, detail: 'chart' });
      return undefined;
    }
    let chart;
    try {
      chart = readOgeChart(tree, rel.target, {
        theme: this.theme.colors,
        majorFont: this.theme.majorFont,
        minorFont: this.theme.minorFont,
      });
    } catch {
      this.issues.add(NOT_SHOWN, { part, detail: 'chart' });
      return undefined;
    }
    const undrawn = chart.groups.find(
      (group) => !OGE_DRAWN_CHART_KINDS.has(group.kind),
    );
    if (undrawn || !chart.groups.length) {
      this.issues.add('chart-type-not-shown', {
        part: rel.target,
        detail: undrawn?.kind ?? 'empty',
      });
      return undefined;
    }
    if (chart.title && chart.title.text === undefined) {
      const series = chart.groups.flatMap((group) => group.series);
      chart = {
        ...chart,
        title: {
          ...chart.title,
          text: (series.length === 1 && series[0].name) || {
            text: 'Chart Title',
          },
        },
      };
    }
    return {
      kind: 'chart',
      chart,
      theme: this.theme.colors,
      bodyFont: this.theme.minorFont,
      width,
      height,
    };
  }

  private floatPosition(node: OgeXmlNode | undefined): OgeWordFloatPosition {
    const offset = ogeXmlChild(node, 'posOffset')?.text;
    return {
      from: attr(node, 'relativeFrom') ?? 'page',
      offset: offset === undefined ? null : Number(offset) / EMU_PER_POINT,
      align: ogeXmlChild(node, 'align')?.text ?? null,
    };
  }

  /** A drawing-layer shape: outline, fill and its text box. */
  private shape(wsp: OgeXmlNode, part: string): OgeWordShape {
    const context = {
      theme: this.theme.colors,
      map: { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' },
    };
    const spPr = ogeXmlChild(wsp, 'spPr');
    const style = ogeXmlChild(wsp, 'style');
    const preset = ogeXmlChild(spPr, 'prstGeom');
    const geometry = preset?.attributes['prst'] ?? 'rect';
    if (!ogeIsSlideGeometryDrawn(geometry) || ogeXmlChild(spPr, 'custGeom'))
      this.issues.add(NOT_SHOWN, { part, detail: `geometry ${geometry}` });
    const adjust: Record<string, number> = {};
    for (const gd of ogeXmlChildren(ogeXmlChild(preset, 'avLst'), 'gd')) {
      const match = /^val\s+(-?\d+)$/.exec(gd.attributes['fmla'] ?? '');
      if (match && gd.attributes['name'])
        adjust[gd.attributes['name']] = Number(match[1]);
    }
    const reference = (name: string): string | null => {
      const ref = ogeXmlChild(style, name);
      if (Number(ref?.attributes['idx'] ?? 0) === 0) return null;
      return ogeFindSlideColor(ref, context)?.rgb ?? null;
    };
    const fill = ogeXmlChild(spPr, 'noFill')
      ? null
      : (ogeFindSlideColor(ogeXmlChild(spPr, 'solidFill'), context)?.rgb ??
        reference('fillRef'));
    const ln = ogeXmlChild(spPr, 'ln');
    const lineColor = ogeXmlChild(ln, 'noFill')
      ? null
      : (ogeFindSlideColor(ogeXmlChild(ln, 'solidFill'), context)?.rgb ??
        reference('lnRef'));
    const body = ogeXmlChild(wsp, 'bodyPr');
    const inset = (name: string, fallback: number): number =>
      Number(body?.attributes[name] ?? fallback) / EMU_PER_POINT;
    const content = ogeXmlChild(ogeXmlChild(wsp, 'txbx'), 'txbxContent');
    const anchor = body?.attributes['anchor'];
    return {
      geometry,
      adjust,
      fill,
      line: lineColor
        ? {
            width: Number(ln?.attributes['w'] ?? 12700) / EMU_PER_POINT,
            color: lineColor,
            style: 'single',
            space: 0,
          }
        : null,
      blocks: content ? this.blocks(content, part, NO_TABLE) : [],
      insets: {
        left: inset('lIns', 91440),
        top: inset('tIns', 45720),
        right: inset('rIns', 91440),
        bottom: inset('bIns', 45720),
      },
      anchor: anchor === 'ctr' ? 'center' : anchor === 'b' ? 'bottom' : 'top',
    };
  }

  private float(
    anchor: OgeXmlNode,
    content: Pick<OgeWordFloat, 'picture' | 'shape'>,
    width: number,
    height: number,
    description: string | undefined,
  ): OgeWordFloat {
    const emu = (name: string): number =>
      Number(anchor.attributes[name] ?? 0) / EMU_PER_POINT;
    const wrap = ogeXmlChild(anchor, 'wrapSquare')
      ? 'square'
      : ogeXmlChild(anchor, 'wrapTight') || ogeXmlChild(anchor, 'wrapThrough')
        ? 'square'
        : ogeXmlChild(anchor, 'wrapTopAndBottom')
          ? 'topAndBottom'
          : 'none';
    return {
      ...content,
      width,
      height,
      horizontal: this.floatPosition(ogeXmlChild(anchor, 'positionH')),
      vertical: this.floatPosition(ogeXmlChild(anchor, 'positionV')),
      wrap,
      behind: anchor.attributes['behindDoc'] === '1',
      distance: {
        left: emu('distL'),
        top: emu('distT'),
        right: emu('distR'),
        bottom: emu('distB'),
      },
      ...(description ? { description } : {}),
    };
  }

  // --- tables ---------------------------------------------------------------

  private table(node: OgeXmlNode, part: string): OgeWordTable {
    const tblPr = ogeXmlChild(node, 'tblPr');
    const chain = this.chain(val(ogeXmlChild(tblPr, 'tblStyle')));
    const look = ogeXmlChild(tblPr, 'tblLook');
    const lookFlag = (name: string, bit: number): boolean => {
      const named = attr(look, name);
      if (named !== undefined) return named === '1' || named === 'true';
      return (parseInt(val(look) ?? '0', 16) & bit) !== 0;
    };
    const flags = {
      firstRow: lookFlag('firstRow', 0x20),
      lastRow: lookFlag('lastRow', 0x40),
      firstColumn: lookFlag('firstColumn', 0x80),
      lastColumn: lookFlag('lastColumn', 0x100),
      noHBand: lookFlag('noHBand', 0x200),
      noVBand: lookFlag('noVBand', 0x400),
    };
    const columns = ogeXmlChildren(ogeXmlChild(node, 'tblGrid'), 'gridCol').map(
      (c) => twips(attr(c, 'w')) ?? 0,
    );
    const rowNodes = ogeXmlChildren(node, 'tr');

    const tableBorders: Partial<Record<string, OgeWordBorder>> = {};
    const margins = { left: 5.4, top: 0, right: 5.4, bottom: 0 };
    const applyTableProps = (props: OgeXmlNode | undefined): void => {
      const borders = ogeXmlChild(props, 'tblBorders');
      for (const edge of [...EDGES, 'insideH', 'insideV']) {
        const border = ogeXmlChild(borders, edge);
        if (border) {
          const parsed = borderOf(border);
          if (parsed) tableBorders[edge] = parsed;
          else delete tableBorders[edge];
        }
      }
      const cellMar = ogeXmlChild(props, 'tblCellMar');
      for (const edge of EDGES) {
        const value = twips(attr(ogeXmlChild(cellMar, edge), 'w'));
        if (value !== undefined) margins[edge] = value;
      }
    };
    for (const style of chain) applyTableProps(style.tblPr);
    applyTableProps(tblPr);

    const rows: OgeWordRow[] = rowNodes.map((row, r) => {
      const trPr = ogeXmlChild(row, 'trPr');
      const height = ogeXmlChild(trPr, 'trHeight');
      const rowMargins = { ...margins };
      const exception = ogeXmlChild(ogeXmlChild(row, 'tblPrEx'), 'tblCellMar');
      for (const edge of EDGES) {
        const value = twips(attr(ogeXmlChild(exception, edge), 'w'));
        if (value !== undefined) rowMargins[edge] = value;
      }
      const cellNodes = ogeXmlChildren(row, 'tc');
      const skipBefore = Number(val(ogeXmlChild(trPr, 'gridBefore')) ?? 0);
      let column = skipBefore;
      const cells = cellNodes.map((cell, c) => {
        const tcPr = ogeXmlChild(cell, 'tcPr');
        const span = Number(val(ogeXmlChild(tcPr, 'gridSpan')) ?? 1);
        const parts = this.conditionalParts(chain, flags, {
          row: r,
          rowCount: rowNodes.length,
          column,
          columnCount: columns.length,
          span,
        });
        const built = this.cell(
          cell,
          tcPr,
          chain,
          parts,
          {
            tableBorders,
            rowMargins,
            atTop: r === 0,
            atBottom: r === rowNodes.length - 1,
            atLeft: c === 0 && skipBefore === 0,
            atRight: column + span >= columns.length,
          },
          part,
        );
        column += span;
        return built;
      });
      const rule = attr(height, 'hRule');
      return {
        height: twips(val(height)) ?? 0,
        heightRule: !height
          ? 'auto'
          : rule === 'exact'
            ? 'exact'
            : rule === 'auto'
              ? 'auto'
              : 'atLeast',
        header: onOff(ogeXmlChild(trPr, 'tblHeader')) ?? false,
        cantSplit: onOff(ogeXmlChild(trPr, 'cantSplit')) ?? false,
        skipBefore,
        cells,
      };
    });
    const ind = ogeXmlChild(tblPr, 'tblInd');
    const jc = val(ogeXmlChild(tblPr, 'jc'));
    return {
      kind: 'table',
      columns,
      indent: twips(attr(ind, 'w')) ?? 0,
      align:
        jc === 'center'
          ? 'center'
          : jc === 'right' || jc === 'end'
            ? 'right'
            : 'left',
      rows,
    };
  }

  private conditionalParts(
    chain: readonly StyleDef[],
    flags: Record<string, boolean>,
    at: {
      row: number;
      rowCount: number;
      column: number;
      columnCount: number;
      span: number;
    },
  ): OgeXmlNode[] {
    const names: string[] = [];
    const bodyRow = at.row - (flags['firstRow'] ? 1 : 0);
    if (!flags['noVBand'])
      names.push(at.column % 2 === 0 ? 'band1Vert' : 'band2Vert');
    if (!flags['noHBand'] && bodyRow >= 0)
      names.push(bodyRow % 2 === 0 ? 'band1Horz' : 'band2Horz');
    if (flags['firstColumn'] && at.column === 0) names.push('firstCol');
    if (flags['lastColumn'] && at.column + at.span >= at.columnCount)
      names.push('lastCol');
    if (flags['lastRow'] && at.row === at.rowCount - 1) names.push('lastRow');
    if (flags['firstRow'] && at.row === 0) names.push('firstRow');
    return chain.flatMap((style) =>
      names.flatMap((name) => {
        const part = style.conditional.get(name);
        return part ? [part] : [];
      }),
    );
  }

  private cell(
    cell: OgeXmlNode,
    tcPr: OgeXmlNode | undefined,
    chain: readonly StyleDef[],
    parts: readonly OgeXmlNode[],
    at: {
      tableBorders: Partial<Record<string, OgeWordBorder>>;
      rowMargins: { left: number; top: number; right: number; bottom: number };
      atTop: boolean;
      atBottom: boolean;
      atLeft: boolean;
      atRight: boolean;
    },
    part: string,
  ): OgeWordCell {
    const context: TableContext = {
      pPr: [
        ...chain.flatMap((s) => (s.pPr ? [s.pPr] : [])),
        ...parts.flatMap((p) => {
          const node = ogeXmlChild(p, 'pPr');
          return node ? [node] : [];
        }),
      ],
      rPr: [
        ...chain.flatMap((s) => (s.rPr ? [s.rPr] : [])),
        ...parts.flatMap((p) => {
          const node = ogeXmlChild(p, 'rPr');
          return node ? [node] : [];
        }),
      ],
    };
    let shading: string | null = null;
    for (const style of chain) {
      const value = shadingOf(ogeXmlChild(style.tcPr, 'shd'));
      if (value !== undefined) shading = value;
    }
    const borders: Partial<Record<OgeWordEdge, OgeWordBorder>> = {};
    const place = (edge: OgeWordEdge, outer: boolean, inner: string): void => {
      const border = at.tableBorders[outer ? edge : inner];
      if (border) borders[edge] = border;
    };
    place('top', at.atTop, 'insideH');
    place('bottom', at.atBottom, 'insideH');
    place('left', at.atLeft, 'insideV');
    place('right', at.atRight, 'insideV');
    const applyCell = (props: OgeXmlNode | undefined): void => {
      const value = shadingOf(ogeXmlChild(props, 'shd'));
      if (value !== undefined) shading = value;
      const tcBorders = ogeXmlChild(props, 'tcBorders');
      for (const edge of EDGES) {
        const node = ogeXmlChild(tcBorders, edge);
        if (!node) continue;
        const border = borderOf(node);
        if (border) borders[edge] = border;
        else delete borders[edge];
      }
    };
    for (const p of parts) applyCell(ogeXmlChild(p, 'tcPr'));
    applyCell(tcPr);
    const margins = { ...at.rowMargins };
    const tcMar = ogeXmlChild(tcPr, 'tcMar');
    for (const edge of EDGES) {
      const value = twips(attr(ogeXmlChild(tcMar, edge), 'w'));
      if (value !== undefined) margins[edge] = value;
    }
    const vMerge = ogeXmlChild(tcPr, 'vMerge');
    const valign = val(ogeXmlChild(tcPr, 'vAlign'));
    return {
      columnSpan: Number(val(ogeXmlChild(tcPr, 'gridSpan')) ?? 1),
      verticalMerge: !vMerge
        ? 'none'
        : val(vMerge) === 'restart'
          ? 'restart'
          : 'continue',
      shading,
      borders,
      margins,
      verticalAlign:
        valign === 'center' ? 'center' : valign === 'bottom' ? 'bottom' : 'top',
      blocks: this.blocks(cell, part, context),
    };
  }
}

interface FieldState {
  phase: 'code' | 'result';
  code: string;
  /** Replaced by a live value: the cached result is not shown. */
  replaced: boolean;
  link?: string;
}
