/**
 * Reads a pptx package into a presentation model, resolving the inheritance
 * PowerPoint applies: theme and colour map, master, layout, placeholder and
 * table style. Everything not taken over exactly is listed in `issues`
 * (ADR 0006). Macros and embedded objects are never run, external targets
 * never fetched.
 */
import { OgeImportIssueLog, type OgeImportIssue } from '../codec/import-issues';
import { OgePackageParts } from '../codec/package';
import { readOgeChart } from '../codec/read-chart';
import { OGE_DRAWN_CHART_KINDS } from '../codec/read-drawing';
import { readOgeTheme, type OgeTheme } from '../codec/read-theme';
import {
  ogeXmlAttribute,
  ogeXmlBool,
  ogeXmlChild,
  ogeXmlChildren,
  ogeXmlNumber,
  parseOgeXmlTree,
  type OgeXmlNode,
} from '../codec/xml-tree';
import { OgeXmlError } from '../xml/xml';
import {
  OgeZipError,
  isOgeOleContainer,
  readOgeZip,
  readOgeZipEntry,
  readOgeZipEntrySync,
  type OgeZipLimits,
} from '../zip/zip';
import { ogeFindSlideColor, type OgeSlideColorContext } from './color';
import { ogeIsSlideGeometryDrawn } from './geometry';
import type {
  OgePresentation,
  OgeSlide,
  OgeSlideBullet,
  OgeSlideColor,
  OgeSlideElement,
  OgeSlideFill,
  OgeSlideFrame,
  OgeSlideCustomPath,
  OgeSlideLine,
  OgeSlidePathCommand,
  OgeSlideParagraph,
  OgeSlideShadow,
  OgeSlidePictureRef,
  OgeSlideSpacing,
  OgeSlideTable,
  OgeSlideTableCell,
  OgeSlideTextBody,
  OgeSlideTextRun,
} from './model';

/** Why a package could not be read at all. */
export type OgePptxErrorCode =
  /** Not a ZIP package with a presentation part. */
  | 'not-pptx'
  /** An OLE container: a password-protected deck or a legacy `.ppt`. */
  | 'encrypted-or-legacy'
  /** The package is damaged. */
  | 'corrupt'
  /** Past the configured size limits. */
  | 'too-large'
  /** The read was aborted. */
  | 'aborted';

/** A package that could not be read. */
export class OgePptxError extends Error {
  constructor(
    readonly code: OgePptxErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OgePptxError';
  }
}

/** What {@link readOgePptx} accepts. */
export type OgePptxSource = ArrayBuffer | Uint8Array | Blob;

/** Options of {@link readOgePptx}. */
export interface OgePptxReadOptions {
  readonly limits?: OgeZipLimits;
  readonly signal?: AbortSignal;
}

/** The outcome of a read. */
export interface OgePptxReadResult {
  readonly presentation: OgePresentation;
  readonly issues: readonly OgeImportIssue[];
}

const EMU_PER_POINT = 12700;
const NOT_SHOWN = 'drawing-not-shown';

function zipFailure(error: unknown): never {
  if (error instanceof OgeZipError) {
    const code: OgePptxErrorCode =
      error.code === 'ole-container' || error.code === 'encrypted'
        ? 'encrypted-or-legacy'
        : error.code === 'too-large' || error.code === 'too-many-entries'
          ? 'too-large'
          : error.code === 'not-zip'
            ? 'not-pptx'
            : 'corrupt';
    throw new OgePptxError(code, error.message);
  }
  throw error;
}

function refuseOle(bytes: Uint8Array): void {
  if (isOgeOleContainer(bytes))
    throw new OgePptxError(
      'encrypted-or-legacy',
      'The file is encrypted or a legacy .ppt presentation',
    );
}

/** Reads a presentation, inflating parts natively where the platform can. */
export async function readOgePptx(
  source: OgePptxSource,
  options: OgePptxReadOptions = {},
): Promise<OgePptxReadResult> {
  const checkAborted = (): void => {
    if (options.signal?.aborted)
      throw new OgePptxError('aborted', 'The read was aborted');
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
  return new PptxReader(new OgePackageParts(parts)).read();
}

/** Reads a presentation synchronously with the engine's own inflate. */
export function readOgePptxSync(
  source: ArrayBuffer | Uint8Array,
  options: Omit<OgePptxReadOptions, 'signal'> = {},
): OgePptxReadResult {
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
  return new PptxReader(new OgePackageParts(parts)).read();
}

// --- inherited property bags ------------------------------------------------

interface RunProps {
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  baseline?: number;
  color?: OgeSlideColor;
  font?: string;
}

interface ParaProps {
  align?: string;
  rtl?: boolean;
  marginLeft?: number;
  indent?: number;
  lineSpacing?: OgeSlideSpacing;
  spaceBefore?: OgeSlideSpacing;
  spaceAfter?: OgeSlideSpacing;
  bulletKind?: 'none' | 'char' | 'number';
  bulletChar?: string;
  bulletScheme?: string;
  bulletStart?: number;
  bulletFont?: string;
  bulletColor?: OgeSlideColor;
  bulletSize?: number;
}

interface LevelProps {
  para: ParaProps;
  run: RunProps;
}

function assignDefined<T extends object>(target: T, source: T): void {
  for (const key of Object.keys(source) as (keyof T)[]) {
    if (source[key] !== undefined) target[key] = source[key];
  }
}

function spacingOf(node: OgeXmlNode | undefined): OgeSlideSpacing | undefined {
  const percent = ogeXmlNumber(ogeXmlChild(node, 'spcPct')?.attributes['val']);
  if (percent !== undefined) return { kind: 'percent', value: percent / 1000 };
  const points = ogeXmlNumber(ogeXmlChild(node, 'spcPts')?.attributes['val']);
  return points !== undefined
    ? { kind: 'points', value: points / 100 }
    : undefined;
}

interface PlaceholderKey {
  readonly type: string;
  readonly idx: string | undefined;
}

interface MasterInfo {
  readonly path: string;
  readonly tree: OgeXmlNode;
  readonly theme: OgeTheme;
  readonly formats: OgeXmlNode | undefined;
  readonly map: Readonly<Record<string, string>>;
}

interface LayoutInfo {
  readonly path: string;
  readonly tree: OgeXmlNode;
  readonly name: string;
  readonly master: MasterInfo;
}

/** Group placement applied to its children. */
interface GroupTransform {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  /** Rotation of the enclosing groups, degrees, about `pivot`. */
  readonly rotation: number;
  readonly pivotX: number;
  readonly pivotY: number;
}

const IDENTITY: GroupTransform = {
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  pivotX: 0,
  pivotY: 0,
};

/** Where an element's inherited properties are looked up. */
interface ReadScope {
  readonly part: string;
  readonly context: OgeSlideColorContext;
  readonly master: MasterInfo;
  /** Placeholder trees, nearest first (layout then master for a slide). */
  readonly ancestors: readonly { tree: OgeXmlNode; isMaster: boolean }[];
  /** Whether placeholders are drawn from this tree. */
  readonly placeholders: boolean;
}

const OUTLINE_TYPES = new Set(['', 'obj', 'body', 'subTitle']);

function normalizedType(type: string): string {
  if (type === 'ctrTitle') return 'title';
  return OUTLINE_TYPES.has(type) ? 'body' : type;
}

class PptxReader {
  private readonly issues = new OgeImportIssueLog();
  private readonly media = new Map<
    string,
    { bytes: Uint8Array; contentType: string }
  >();
  private readonly masters = new Map<string, MasterInfo>();
  private readonly layouts = new Map<string, LayoutInfo>();
  private defaultTextStyle: OgeXmlNode | undefined;
  private tableStyles = new Map<string, OgeXmlNode>();

  constructor(private readonly pkg: OgePackageParts) {}

  read(): OgePptxReadResult {
    const main = this.pkg.relationshipOfType('', 'officeDocument');
    if (
      !main ||
      !this.pkg.contentType(main.target)?.includes('presentationml')
    ) {
      throw new OgePptxError('not-pptx', 'No presentation part in the package');
    }
    const root = this.tree(main.target);
    if (!root)
      throw new OgePptxError('corrupt', 'The presentation part is malformed');
    if (this.pkg.paths().some((p) => /vbaProject\.bin$/i.test(p)))
      this.issues.add('macros-kept');
    this.defaultTextStyle = ogeXmlChild(root, 'defaultTextStyle');
    const size = ogeXmlChild(root, 'sldSz');
    const width = ogeXmlNumber(size?.attributes['cx']) ?? 9144000;
    const height = ogeXmlNumber(size?.attributes['cy']) ?? 5143500;
    const styles = this.pkg.relationshipOfType(main.target, 'tableStyles');
    if (styles) this.readTableStyles(styles.target);

    const slides: OgeSlide[] = [];
    const rels = this.pkg.relationships(main.target);
    for (const entry of ogeXmlChildren(
      ogeXmlChild(root, 'sldIdLst'),
      'sldId',
    )) {
      const id = ogeXmlAttribute(entry.attributes, 'id', true);
      const rel = rels.find((r) => r.id === id);
      if (!rel) {
        this.issues.add('missing-part', {
          part: main.target,
          detail: `slide relationship ${id}`,
        });
        continue;
      }
      const slide = this.readSlide(rel.target, slides.length);
      if (slide) slides.push(slide);
    }
    return {
      presentation: { width, height, slides, media: this.media },
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

  private readTableStyles(path: string): void {
    const root = this.tree(path);
    for (const style of ogeXmlChildren(root, 'tblStyle')) {
      const id = style.attributes['styleId'];
      if (id) this.tableStyles.set(id, style);
    }
  }

  private master(path: string): MasterInfo | undefined {
    const known = this.masters.get(path);
    if (known) return known;
    const tree = this.tree(path);
    if (!tree) return undefined;
    const rel = this.pkg.relationshipOfType(path, 'theme');
    const themeTree = rel ? this.tree(rel.target) : undefined;
    if (!themeTree) return undefined;
    const map = { ...ogeXmlChild(tree, 'clrMap')?.attributes };
    const info: MasterInfo = {
      path,
      tree,
      theme: readOgeTheme(themeTree),
      formats: ogeXmlChild(
        ogeXmlChild(themeTree, 'themeElements'),
        'fmtScheme',
      ),
      map,
    };
    this.masters.set(path, info);
    return info;
  }

  private layout(path: string): LayoutInfo | undefined {
    const known = this.layouts.get(path);
    if (known) return known;
    const tree = this.tree(path);
    const rel = this.pkg.relationshipOfType(path, 'slideMaster');
    const master = rel && this.master(rel.target);
    if (!tree || !master) return undefined;
    const info: LayoutInfo = {
      path,
      tree,
      name: ogeXmlChild(tree, 'cSld')?.attributes['name'] ?? '',
      master,
    };
    this.layouts.set(path, info);
    return info;
  }

  private contextOf(
    tree: OgeXmlNode,
    master: MasterInfo,
    inherited?: OgeSlideColorContext,
  ): OgeSlideColorContext {
    const override = ogeXmlChild(
      ogeXmlChild(tree, 'clrMapOvr'),
      'overrideClrMapping',
    );
    return {
      theme: master.theme.colors,
      map: override
        ? { ...override.attributes }
        : (inherited?.map ?? master.map),
    };
  }

  private readSlide(path: string, index: number): OgeSlide | undefined {
    const tree = this.tree(path);
    const rel = this.pkg.relationshipOfType(path, 'slideLayout');
    const layout = rel && this.layout(rel.target);
    if (!tree || !layout) {
      this.issues.add('missing-part', { part: path, detail: 'slide layout' });
      return undefined;
    }
    const master = layout.master;
    const masterContext = this.contextOf(master.tree, master);
    const layoutContext = this.contextOf(layout.tree, master, masterContext);
    const context = this.contextOf(tree, master, layoutContext);

    const backdrop: OgeSlideElement[] = [];
    const showMaster = (node: OgeXmlNode): boolean =>
      ogeXmlBool(node.attributes['showMasterSp'], true);
    if (showMaster(tree) && showMaster(layout.tree)) {
      this.readTree(
        this.spTree(master.tree),
        {
          part: master.path,
          context: masterContext,
          master,
          ancestors: [],
          placeholders: false,
        },
        IDENTITY,
        backdrop,
      );
    }
    if (showMaster(tree)) {
      this.readTree(
        this.spTree(layout.tree),
        {
          part: layout.path,
          context: layoutContext,
          master,
          ancestors: [{ tree: master.tree, isMaster: true }],
          placeholders: false,
        },
        IDENTITY,
        backdrop,
      );
    }
    const elements: OgeSlideElement[] = [];
    this.readTree(
      this.spTree(tree),
      {
        part: path,
        context,
        master,
        ancestors: [
          { tree: layout.tree, isMaster: false },
          { tree: master.tree, isMaster: true },
        ],
        placeholders: true,
      },
      IDENTITY,
      elements,
    );
    return {
      index,
      hidden: !ogeXmlBool(tree.attributes['show'], true),
      layoutName: layout.name,
      background: this.background(tree, context, master, path) ??
        this.background(layout.tree, layoutContext, master, layout.path) ??
        this.background(master.tree, masterContext, master, master.path) ?? {
          kind: 'none',
        },
      backdrop,
      elements,
    };
  }

  private spTree(tree: OgeXmlNode): OgeXmlNode | undefined {
    return ogeXmlChild(ogeXmlChild(tree, 'cSld'), 'spTree');
  }

  private background(
    tree: OgeXmlNode,
    context: OgeSlideColorContext,
    master: MasterInfo,
    part: string,
  ): OgeSlideFill | undefined {
    const bg = ogeXmlChild(ogeXmlChild(tree, 'cSld'), 'bg');
    if (!bg) return undefined;
    const properties = ogeXmlChild(bg, 'bgPr');
    if (properties) return this.fillOf(properties, context, part);
    const ref = ogeXmlChild(bg, 'bgRef');
    return ref ? this.themeFill(ref, context, master, part) : undefined;
  }

  /** A `fillRef` / `bgRef`: an entry of the theme's format lists. */
  private themeFill(
    ref: OgeXmlNode,
    context: OgeSlideColorContext,
    master: MasterInfo,
    part: string,
  ): OgeSlideFill | undefined {
    const idx = ogeXmlNumber(ref.attributes['idx']) ?? 0;
    if (idx === 0) return { kind: 'none' };
    const background = idx >= 1001;
    const list = ogeXmlChild(
      master.formats,
      background ? 'bgFillStyleLst' : 'fillStyleLst',
    );
    const entry = list?.children[idx - (background ? 1001 : 1)];
    if (!entry) return undefined;
    const placeholder = ogeFindSlideColor(ref, context);
    return this.oneFill(entry, { ...context, placeholder }, part);
  }

  /** The fill among a node's children, if it has one. */
  private fillOf(
    parent: OgeXmlNode | undefined,
    context: OgeSlideColorContext,
    part: string,
  ): OgeSlideFill | undefined {
    for (const child of parent?.children ?? []) {
      const fill = this.oneFill(child, context, part);
      if (fill) return fill;
    }
    return undefined;
  }

  private oneFill(
    node: OgeXmlNode,
    context: OgeSlideColorContext,
    part: string,
  ): OgeSlideFill | undefined {
    switch (node.name) {
      case 'noFill':
        return { kind: 'none' };
      case 'solidFill': {
        const color = ogeFindSlideColor(node, context);
        return color ? { kind: 'solid', color } : { kind: 'none' };
      }
      case 'gradFill': {
        const stops = ogeXmlChildren(ogeXmlChild(node, 'gsLst'), 'gs').flatMap(
          (gs) => {
            const color = ogeFindSlideColor(gs, context);
            return color
              ? [
                  {
                    position: Number(gs.attributes['pos'] ?? 0) / 100000,
                    color,
                  },
                ]
              : [];
          },
        );
        const linear = ogeXmlChild(node, 'lin');
        return {
          kind: 'gradient',
          stops,
          angle: linear ? Number(linear.attributes['ang'] ?? 0) / 60000 : null,
        };
      }
      case 'blipFill': {
        const picture = this.pictureOf(node, part);
        return picture ? { kind: 'picture', picture } : { kind: 'none' };
      }
      case 'pattFill': {
        const foreground = ogeFindSlideColor(
          ogeXmlChild(node, 'fgClr'),
          context,
        );
        const background = ogeFindSlideColor(
          ogeXmlChild(node, 'bgClr'),
          context,
        );
        return foreground && background
          ? {
              kind: 'pattern',
              preset: node.attributes['prst'] ?? 'pct50',
              foreground,
              background,
            }
          : { kind: 'none' };
      }
      case 'grpFill':
        this.issues.add(NOT_SHOWN, { part, detail: 'group fill' });
        return { kind: 'none' };
      default:
        return undefined;
    }
  }

  private pictureOf(
    blipFill: OgeXmlNode,
    part: string,
  ): OgeSlidePictureRef | undefined {
    const blip = ogeXmlChild(blipFill, 'blip');
    const embed = blip && ogeXmlAttribute(blip.attributes, 'embed', true);
    const rel = embed
      ? this.pkg.relationships(part).find((r) => r.id === embed)
      : undefined;
    if (!rel) {
      if (blip && ogeXmlAttribute(blip.attributes, 'link', true))
        this.issues.add('external-link', { part, detail: 'linked picture' });
      else this.issues.add('missing-part', { part, detail: 'picture' });
      return undefined;
    }
    if (rel.external) {
      this.issues.add('external-link', { part, detail: 'linked picture' });
      return undefined;
    }
    const bytes = this.pkg.bytes(rel.target);
    if (!bytes) {
      this.issues.add('missing-part', { part: rel.target });
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

  // --- element tree ---------------------------------------------------------

  private readTree(
    tree: OgeXmlNode | undefined,
    scope: ReadScope,
    transform: GroupTransform,
    out: OgeSlideElement[],
  ): void {
    for (const child of tree?.children ?? [])
      this.readNode(child, scope, transform, out);
  }

  private readNode(
    node: OgeXmlNode,
    scope: ReadScope,
    transform: GroupTransform,
    out: OgeSlideElement[],
  ): void {
    switch (node.name) {
      case 'sp':
      case 'cxnSp':
        this.readShape(node, scope, transform, out);
        break;
      case 'pic':
        this.readPicture(node, scope, transform, out);
        break;
      case 'grpSp':
        this.readGroup(node, scope, transform, out);
        break;
      case 'graphicFrame':
        this.readGraphicFrame(node, scope, transform, out);
        break;
      case 'AlternateContent': {
        // Fallback is what a consumer without the extension is meant to show.
        const branch =
          ogeXmlChild(node, 'Fallback') ?? ogeXmlChild(node, 'Choice');
        for (const child of branch?.children ?? [])
          this.readNode(child, scope, transform, out);
        break;
      }
      default:
        break;
    }
  }

  private placeholderOf(node: OgeXmlNode): PlaceholderKey | undefined {
    const properties = node.children.find((c) => c.name.startsWith('nv'));
    const ph = ogeXmlChild(ogeXmlChild(properties, 'nvPr'), 'ph');
    return ph
      ? { type: ph.attributes['type'] ?? '', idx: ph.attributes['idx'] }
      : undefined;
  }

  private findPlaceholder(
    tree: OgeXmlNode,
    key: PlaceholderKey,
    isMaster: boolean,
  ): OgeXmlNode | undefined {
    const candidates = (this.spTree(tree)?.children ?? []).filter(
      (c) => c.name === 'sp' || c.name === 'pic',
    );
    const placed = candidates.flatMap((node) => {
      const ph = this.placeholderOf(node);
      return ph ? [{ node, ph }] : [];
    });
    if (!isMaster && key.idx !== undefined) {
      const byIdx = placed.find((p) => p.ph.idx === key.idx);
      if (byIdx) return byIdx.node;
    }
    const type = normalizedType(key.type);
    return placed.find((p) => normalizedType(p.ph.type) === type)?.node;
  }

  /** The node with its layout and master placeholders, nearest first. */
  private chainOf(node: OgeXmlNode, scope: ReadScope): OgeXmlNode[] {
    const chain = [node];
    const key = this.placeholderOf(node);
    if (!key) return chain;
    for (const ancestor of scope.ancestors) {
      const found = this.findPlaceholder(ancestor.tree, key, ancestor.isMaster);
      if (found) chain.push(found);
    }
    return chain;
  }

  private cNvPr(node: OgeXmlNode): OgeXmlNode | undefined {
    const properties = node.children.find((c) => c.name.startsWith('nv'));
    return ogeXmlChild(properties, 'cNvPr');
  }

  private frameOf(
    xfrm: OgeXmlNode | undefined,
    transform: GroupTransform,
  ): OgeSlideFrame | undefined {
    const off = ogeXmlChild(xfrm, 'off');
    const ext = ogeXmlChild(xfrm, 'ext');
    if (!off || !ext || !xfrm) return undefined;
    const rawX = Number(off.attributes['x'] ?? 0);
    const rawY = Number(off.attributes['y'] ?? 0);
    const rawWidth = Number(ext.attributes['cx'] ?? 0);
    const rawHeight = Number(ext.attributes['cy'] ?? 0);
    const width = rawWidth * transform.scaleX;
    const height = rawHeight * transform.scaleY;
    let centerX = transform.offsetX + rawX * transform.scaleX + width / 2;
    let centerY = transform.offsetY + rawY * transform.scaleY + height / 2;
    if (transform.rotation !== 0) {
      const radians = (transform.rotation * Math.PI) / 180;
      const dx = centerX - transform.pivotX;
      const dy = centerY - transform.pivotY;
      centerX =
        transform.pivotX + dx * Math.cos(radians) - dy * Math.sin(radians);
      centerY =
        transform.pivotY + dx * Math.sin(radians) + dy * Math.cos(radians);
    }
    const own = Number(xfrm.attributes['rot'] ?? 0) / 60000;
    return {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      rotation: (((own + transform.rotation) % 360) + 360) % 360,
      flipH: ogeXmlBool(xfrm.attributes['flipH'], false),
      flipV: ogeXmlBool(xfrm.attributes['flipV'], false),
    };
  }

  private readGroup(
    node: OgeXmlNode,
    scope: ReadScope,
    parent: GroupTransform,
    out: OgeSlideElement[],
  ): void {
    const xfrm = ogeXmlChild(ogeXmlChild(node, 'grpSpPr'), 'xfrm');
    const frame = this.frameOf(xfrm, parent);
    if (!frame || !xfrm) {
      this.issues.add(NOT_SHOWN, { part: scope.part, detail: 'group' });
      return;
    }
    if (frame.flipH || frame.flipV)
      this.issues.add(NOT_SHOWN, { part: scope.part, detail: 'flipped group' });
    const chOff = ogeXmlChild(xfrm, 'chOff')?.attributes ?? {};
    const chExt = ogeXmlChild(xfrm, 'chExt')?.attributes ?? {};
    const childWidth = Number(chExt['cx'] ?? 0);
    const childHeight = Number(chExt['cy'] ?? 0);
    const scaleX = childWidth > 0 ? frame.width / childWidth : 1;
    const scaleY = childHeight > 0 ? frame.height / childHeight : 1;
    const transform: GroupTransform = {
      scaleX,
      scaleY,
      offsetX: frame.x - Number(chOff['x'] ?? 0) * scaleX,
      offsetY: frame.y - Number(chOff['y'] ?? 0) * scaleY,
      rotation: frame.rotation,
      pivotX: frame.x + frame.width / 2,
      pivotY: frame.y + frame.height / 2,
    };
    for (const child of node.children) {
      this.readNode(child, scope, transform, out);
    }
  }

  private readShape(
    node: OgeXmlNode,
    scope: ReadScope,
    transform: GroupTransform,
    out: OgeSlideElement[],
  ): void {
    const key = this.placeholderOf(node);
    if (key && !scope.placeholders) return;
    const chain = this.chainOf(node, scope);
    const properties = chain.map((n) => ogeXmlChild(n, 'spPr'));
    const xfrm = properties
      .map((p) => ogeXmlChild(p, 'xfrm'))
      .find((x) => x !== undefined);
    const frame = this.frameOf(xfrm, transform);
    if (!frame) {
      this.issues.add(NOT_SHOWN, {
        part: scope.part,
        detail: 'shape without a position',
      });
      return;
    }
    const preset = properties
      .map((p) => ogeXmlChild(p, 'prstGeom'))
      .find((x) => x !== undefined);
    const adjust: Record<string, number> = {};
    for (const gd of ogeXmlChildren(ogeXmlChild(preset, 'avLst'), 'gd')) {
      const match = /^val\s+(-?\d+)$/.exec(gd.attributes['fmla'] ?? '');
      if (match && gd.attributes['name'])
        adjust[gd.attributes['name']] = Number(match[1]);
    }
    const customNode = properties
      .map((p) => ogeXmlChild(p, 'custGeom'))
      .find((x) => x !== undefined);
    const custom = customNode !== undefined;
    const presetName = preset?.attributes['prst'] ?? 'rect';
    if (!custom && !ogeIsSlideGeometryDrawn(presetName))
      this.issues.add(NOT_SHOWN, {
        part: scope.part,
        detail: `preset geometry ${presetName}`,
      });

    const style = chain.map((n) => ogeXmlChild(n, 'style')).find(Boolean);
    const cNvPr = this.cNvPr(node);
    out.push({
      kind: 'shape',
      name: cNvPr?.attributes['name'] ?? '',
      description: cNvPr?.attributes['descr'] || undefined,
      frame,
      geometry: custom ? 'custom' : presetName,
      adjust,
      fill: this.shapeFill(properties, style, scope),
      line: this.lineOf(properties, style, scope),
      text: this.shapeText(chain, style, key, scope),
      placeholder: key ? key.type || 'body' : undefined,
      customPaths: customNode
        ? this.customPaths(customNode, scope.part)
        : undefined,
      textFrame: this.frameOf(ogeXmlChild(node, 'txXfrm'), transform),
      shadow: this.shadowOf(properties, style, scope),
    });
  }

  private shapeFill(
    properties: readonly (OgeXmlNode | undefined)[],
    style: OgeXmlNode | undefined,
    scope: ReadScope,
  ): OgeSlideFill {
    for (const spPr of properties) {
      const fill = this.fillOf(
        spPr && {
          ...spPr,
          children: spPr.children.filter((c) => c.name !== 'ln'),
        },
        scope.context,
        scope.part,
      );
      if (fill) return fill;
    }
    const ref = ogeXmlChild(style, 'fillRef');
    return (
      (ref && this.themeFill(ref, scope.context, scope.master, scope.part)) ?? {
        kind: 'none',
      }
    );
  }

  private lineOf(
    properties: readonly (OgeXmlNode | undefined)[],
    style: OgeXmlNode | undefined,
    scope: ReadScope,
  ): OgeSlideLine | null {
    let width: number | undefined;
    let dash: string | undefined;
    let cap: string | undefined;
    let fill: OgeSlideFill | undefined;
    const apply = (ln: OgeXmlNode, context: OgeSlideColorContext): void => {
      width = ogeXmlNumber(ln.attributes['w']) ?? width;
      cap = ln.attributes['cap'] ?? cap;
      dash = ogeXmlChild(ln, 'prstDash')?.attributes['val'] ?? dash;
      fill = this.fillOf(ln, context, scope.part) ?? fill;
    };
    const ref = ogeXmlChild(style, 'lnRef');
    const idx = ogeXmlNumber(ref?.attributes['idx']) ?? 0;
    if (ref && idx > 0) {
      const entry = ogeXmlChild(scope.master.formats, 'lnStyleLst')?.children[
        idx - 1
      ];
      if (entry) {
        apply(entry, {
          ...scope.context,
          placeholder: ogeFindSlideColor(ref, scope.context),
        });
      }
    }
    for (const spPr of [...properties].reverse()) {
      const ln = ogeXmlChild(spPr, 'ln');
      if (ln) apply(ln, scope.context);
    }
    if (!fill || fill.kind === 'none') return null;
    return {
      fill,
      width: width ?? 9525,
      dash: dash ?? 'solid',
      cap: cap ?? 'flat',
    };
  }

  private customPaths(
    geometry: OgeXmlNode,
    part: string,
  ): OgeSlideCustomPath[] {
    const point = (node: OgeXmlNode | undefined): [number, number] => {
      const x = Number(node?.attributes['x']);
      const y = Number(node?.attributes['y']);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        this.issues.add(NOT_SHOWN, { part, detail: 'custom geometry guide' });
        return [0, 0];
      }
      return [x, y];
    };
    return ogeXmlChildren(ogeXmlChild(geometry, 'pathLst'), 'path').map(
      (path) => {
        const commands: OgeSlidePathCommand[] = [];
        for (const step of path.children) {
          const points = ogeXmlChildren(step, 'pt').flatMap(point);
          if (step.name === 'moveTo' || step.name === 'lnTo') {
            commands.push({
              op: step.name === 'moveTo' ? 'M' : 'L',
              x: points[0],
              y: points[1],
            });
          } else if (step.name === 'cubicBezTo') {
            commands.push({ op: 'C', points });
          } else if (step.name === 'quadBezTo') {
            commands.push({ op: 'Q', points });
          } else if (step.name === 'arcTo') {
            commands.push({
              op: 'A',
              rx: Number(step.attributes['wR'] ?? 0),
              ry: Number(step.attributes['hR'] ?? 0),
              start: Number(step.attributes['stAng'] ?? 0) / 60000,
              sweep: Number(step.attributes['swAng'] ?? 0) / 60000,
            });
          } else if (step.name === 'close') {
            commands.push({ op: 'Z' });
          }
        }
        return {
          width: Number(path.attributes['w'] ?? 0),
          height: Number(path.attributes['h'] ?? 0),
          filled: path.attributes['fill'] !== 'none',
          stroked: ogeXmlBool(path.attributes['stroke'], true),
          commands,
        };
      },
    );
  }

  /** The shape's own effects, else its style's theme entry. */
  private shadowOf(
    properties: readonly (OgeXmlNode | undefined)[],
    style: OgeXmlNode | undefined,
    scope: ReadScope,
  ): OgeSlideShadow | null {
    let list = properties
      .map((p) => ogeXmlChild(p, 'effectLst'))
      .find((x) => x !== undefined);
    let context = scope.context;
    if (!list) {
      const ref = ogeXmlChild(style, 'effectRef');
      const idx = ogeXmlNumber(ref?.attributes['idx']) ?? 0;
      if (idx > 0) {
        const entry = ogeXmlChild(scope.master.formats, 'effectStyleLst')
          ?.children[idx - 1];
        list = ogeXmlChild(entry, 'effectLst');
        context = {
          ...context,
          placeholder: ogeFindSlideColor(ref, context),
        };
      }
    }
    for (const effect of list?.children ?? []) {
      if (effect.name !== 'outerShdw') {
        this.issues.add(NOT_SHOWN, {
          part: scope.part,
          detail: `effect ${effect.name}`,
        });
      }
    }
    const shadow = ogeXmlChild(list, 'outerShdw');
    const color = ogeFindSlideColor(shadow, context);
    if (!shadow || !color) return null;
    return {
      blur: Number(shadow.attributes['blurRad'] ?? 0),
      distance: Number(shadow.attributes['dist'] ?? 0),
      direction: Number(shadow.attributes['dir'] ?? 0) / 60000,
      color,
    };
  }

  // --- text -----------------------------------------------------------------

  private font(
    typeface: string | undefined,
    master: MasterInfo,
  ): string | undefined {
    if (!typeface) return undefined;
    if (typeface.startsWith('+mj')) return master.theme.majorFont;
    if (typeface.startsWith('+mn')) return master.theme.minorFont;
    return typeface;
  }

  private runProps(node: OgeXmlNode | undefined, scope: ReadScope): RunProps {
    if (!node) return {};
    const a = node.attributes;
    const size = ogeXmlNumber(a['sz']);
    const flag = (value: string | undefined): boolean | undefined =>
      value === undefined ? undefined : ogeXmlBool(value, false);
    const baseline = ogeXmlNumber(a['baseline']);
    return {
      size: size === undefined ? undefined : size / 100,
      bold: flag(a['b']),
      italic: flag(a['i']),
      underline: a['u'] === undefined ? undefined : a['u'] !== 'none',
      strike:
        a['strike'] === undefined ? undefined : a['strike'] !== 'noStrike',
      baseline: baseline === undefined ? undefined : baseline / 1000,
      color: ogeFindSlideColor(ogeXmlChild(node, 'solidFill'), scope.context),
      font: this.font(
        ogeXmlChild(node, 'latin')?.attributes['typeface'],
        scope.master,
      ),
    };
  }

  private paraProps(node: OgeXmlNode | undefined, scope: ReadScope): ParaProps {
    if (!node) return {};
    const a = node.attributes;
    const out: ParaProps = {
      align: a['algn'],
      rtl: a['rtl'] === undefined ? undefined : ogeXmlBool(a['rtl'], false),
      marginLeft: ogeXmlNumber(a['marL']),
      indent: ogeXmlNumber(a['indent']),
      lineSpacing: spacingOf(ogeXmlChild(node, 'lnSpc')),
      spaceBefore: spacingOf(ogeXmlChild(node, 'spcBef')),
      spaceAfter: spacingOf(ogeXmlChild(node, 'spcAft')),
      bulletFont: this.font(
        ogeXmlChild(node, 'buFont')?.attributes['typeface'],
        scope.master,
      ),
      bulletColor: ogeFindSlideColor(ogeXmlChild(node, 'buClr'), scope.context),
      bulletSize:
        ogeXmlNumber(ogeXmlChild(node, 'buSzPct')?.attributes['val']) !==
        undefined
          ? Number(ogeXmlChild(node, 'buSzPct')?.attributes['val']) / 1000
          : undefined,
    };
    const char = ogeXmlChild(node, 'buChar');
    const auto = ogeXmlChild(node, 'buAutoNum');
    if (ogeXmlChild(node, 'buNone')) out.bulletKind = 'none';
    else if (char) {
      out.bulletKind = 'char';
      out.bulletChar = char.attributes['char'] ?? '';
    } else if (auto) {
      out.bulletKind = 'number';
      out.bulletScheme = auto.attributes['type'] ?? 'arabicPeriod';
      out.bulletStart = ogeXmlNumber(auto.attributes['startAt']);
    }
    return out;
  }

  private levelOf(
    list: OgeXmlNode | undefined,
    level: number,
    scope: ReadScope,
  ): LevelProps {
    const node = ogeXmlChild(list, `lvl${level + 1}pPr`);
    return {
      para: this.paraProps(node, scope),
      run: this.runProps(ogeXmlChild(node, 'defRPr'), scope),
    };
  }

  private styleLists(
    chain: readonly OgeXmlNode[],
    key: PlaceholderKey | undefined,
    scope: ReadScope,
  ): (OgeXmlNode | undefined)[] {
    const lists: (OgeXmlNode | undefined)[] = [];
    if (key) {
      const styles = ogeXmlChild(scope.master.tree, 'txStyles');
      const type = normalizedType(key.type);
      lists.push(
        ogeXmlChild(
          styles,
          type === 'title'
            ? 'titleStyle'
            : type === 'body'
              ? 'bodyStyle'
              : 'otherStyle',
        ),
      );
    } else {
      lists.push(this.defaultTextStyle);
    }
    for (const node of [...chain].reverse()) {
      lists.push(ogeXmlChild(ogeXmlChild(node, 'txBody'), 'lstStyle'));
    }
    return lists;
  }

  private shapeText(
    chain: readonly OgeXmlNode[],
    style: OgeXmlNode | undefined,
    key: PlaceholderKey | undefined,
    scope: ReadScope,
  ): OgeSlideTextBody | null {
    const body = ogeXmlChild(chain[0], 'txBody');
    if (!body) return null;
    const fontRef = ogeXmlChild(style, 'fontRef');
    const base: RunProps = fontRef
      ? {
          color: ogeFindSlideColor(fontRef, scope.context),
          font:
            fontRef.attributes['idx'] === 'major'
              ? scope.master.theme.majorFont
              : scope.master.theme.minorFont,
        }
      : {};
    const bodyProps = [...chain]
      .reverse()
      .map((n) => ogeXmlChild(ogeXmlChild(n, 'txBody'), 'bodyPr'));
    return this.textBody(
      body,
      bodyProps,
      this.styleLists(chain, key, scope),
      base,
      scope,
    );
  }

  private textBody(
    body: OgeXmlNode,
    bodyProps: readonly (OgeXmlNode | undefined)[],
    lists: readonly (OgeXmlNode | undefined)[],
    base: RunProps,
    scope: ReadScope,
  ): OgeSlideTextBody | null {
    const paragraphs = ogeXmlChildren(body, 'p').map((p) =>
      this.paragraph(p, lists, base, scope),
    );
    if (!paragraphs.some((p) => p.runs.length > 0)) return null;
    const merged: Record<string, string> = {};
    if (paragraphs.some((p) => p.rtl))
      this.issues.add(NOT_SHOWN, {
        part: scope.part,
        detail: 'right-to-left paragraph layout',
      });
    let fontScale = 1;
    let lineSpacingReduction = 0;
    for (const props of bodyProps) {
      if (!props) continue;
      Object.assign(merged, props.attributes);
      const fit = ogeXmlChild(props, 'normAutofit');
      if (fit) {
        fontScale = Number(fit.attributes['fontScale'] ?? 100000) / 100000;
        lineSpacingReduction =
          Number(fit.attributes['lnSpcReduction'] ?? 0) / 100000;
      } else if (
        ogeXmlChild(props, 'noAutofit') ||
        ogeXmlChild(props, 'spAutoFit')
      ) {
        fontScale = 1;
        lineSpacingReduction = 0;
      }
    }
    const inset = (name: string, fallback: number): number =>
      ogeXmlNumber(merged[name]) ?? fallback;
    return {
      insets: {
        left: inset('lIns', 91440),
        top: inset('tIns', 45720),
        right: inset('rIns', 91440),
        bottom: inset('bIns', 45720),
      },
      anchor: merged['anchor'] ?? 't',
      wrap: merged['wrap'] !== 'none',
      vertical: this.verticalOf(merged['vert'], scope.part),
      fontScale,
      lineSpacingReduction,
      paragraphs,
    };
  }

  private verticalOf(value: string | undefined, part: string): string {
    const vertical = value ?? 'horz';
    if (!['horz', 'vert', 'vert270'].includes(vertical)) {
      this.issues.add(NOT_SHOWN, {
        part,
        detail: `text direction ${vertical}`,
      });
      return 'horz';
    }
    return vertical;
  }

  private paragraph(
    node: OgeXmlNode,
    lists: readonly (OgeXmlNode | undefined)[],
    base: RunProps,
    scope: ReadScope,
  ): OgeSlideParagraph {
    const pPr = ogeXmlChild(node, 'pPr');
    const level = ogeXmlNumber(pPr?.attributes['lvl']) ?? 0;
    const para: ParaProps = {};
    const inherited: RunProps = {};
    let baseApplied = false;
    for (const list of lists) {
      const props = this.levelOf(list, level, scope);
      assignDefined(para, props.para);
      assignDefined(inherited, props.run);
      if (!baseApplied) {
        // a shape style's font reference sits above the deck's defaults and
        // below the shape's own list styles
        assignDefined(inherited, base);
        baseApplied = true;
      }
    }
    assignDefined(para, this.paraProps(pPr, scope));
    assignDefined(inherited, this.runProps(ogeXmlChild(pPr, 'defRPr'), scope));

    const runs: OgeSlideTextRun[] = [];
    for (const child of node.children) {
      if (child.name === 'r' || child.name === 'fld' || child.name === 'br') {
        const rPr = ogeXmlChild(child, 'rPr');
        const props: RunProps = { ...inherited };
        assignDefined(props, this.runProps(rPr, scope));
        const text =
          child.name === 'br' ? '\n' : (ogeXmlChild(child, 't')?.text ?? '');
        runs.push(this.run(text, props, rPr, scope));
      }
    }
    const endProps: RunProps = { ...inherited };
    assignDefined(
      endProps,
      this.runProps(ogeXmlChild(node, 'endParaRPr'), scope),
    );
    return {
      level,
      align: para.align ?? 'l',
      rtl: para.rtl ?? false,
      marginLeft: para.marginLeft ?? 0,
      indent: para.indent ?? 0,
      lineSpacing: para.lineSpacing ?? { kind: 'percent', value: 100 },
      spaceBefore: para.spaceBefore ?? { kind: 'points', value: 0 },
      spaceAfter: para.spaceAfter ?? { kind: 'points', value: 0 },
      bullet: this.bullet(para),
      runs,
      endSize: endProps.size ?? runs[0]?.size ?? 18,
    };
  }

  private bullet(para: ParaProps): OgeSlideBullet {
    const size = para.bulletSize ?? 100;
    if (para.bulletKind === 'char') {
      return {
        kind: 'char',
        char: para.bulletChar ?? '',
        font: para.bulletFont,
        color: para.bulletColor,
        size,
      };
    }
    if (para.bulletKind === 'number') {
      return {
        kind: 'number',
        scheme: para.bulletScheme ?? 'arabicPeriod',
        startAt: para.bulletStart ?? 1,
        color: para.bulletColor,
        size,
      };
    }
    return { kind: 'none' };
  }

  private run(
    text: string,
    props: RunProps,
    rPr: OgeXmlNode | undefined,
    scope: ReadScope,
  ): OgeSlideTextRun {
    const click = ogeXmlChild(rPr, 'hlinkClick');
    const id = click && ogeXmlAttribute(click.attributes, 'id', true);
    const rel = id
      ? this.pkg.relationships(scope.part).find((r) => r.id === id)
      : undefined;
    const link = rel?.external ? rel.target : undefined;
    const hlink = scope.context.theme.hlink;
    return {
      text,
      font: props.font ?? scope.master.theme.minorFont ?? 'Calibri',
      size: props.size ?? 18,
      bold: props.bold ?? false,
      italic: props.italic ?? false,
      underline: (props.underline ?? false) || link !== undefined,
      strike: props.strike ?? false,
      color: link
        ? { rgb: hlink, alpha: 1 }
        : (props.color ?? { rgb: '000000', alpha: 1 }),
      baseline: props.baseline ?? 0,
      link,
    };
  }

  // --- pictures and tables --------------------------------------------------

  private readPicture(
    node: OgeXmlNode,
    scope: ReadScope,
    transform: GroupTransform,
    out: OgeSlideElement[],
  ): void {
    const chain = this.chainOf(node, scope);
    const properties = chain.map((n) => ogeXmlChild(n, 'spPr'));
    const xfrm = properties
      .map((p) => ogeXmlChild(p, 'xfrm'))
      .find((x) => x !== undefined);
    const frame = this.frameOf(xfrm, transform);
    const blipFill = ogeXmlChild(node, 'blipFill');
    const picture = blipFill && this.pictureOf(blipFill, scope.part);
    if (!frame || !picture) return;
    const cNvPr = this.cNvPr(node);
    out.push({
      kind: 'picture',
      name: cNvPr?.attributes['name'] ?? '',
      description: cNvPr?.attributes['descr'] || undefined,
      frame,
      picture,
      line: this.lineOf(properties, ogeXmlChild(node, 'style'), scope),
    });
  }

  private readGraphicFrame(
    node: OgeXmlNode,
    scope: ReadScope,
    transform: GroupTransform,
    out: OgeSlideElement[],
  ): void {
    const data = ogeXmlChild(ogeXmlChild(node, 'graphic'), 'graphicData');
    const table = ogeXmlChild(data, 'tbl');
    if (!table) {
      const kind = (data?.attributes['uri'] ?? '').split('/').pop() ?? '';
      if (kind === 'chart' && this.readChart(node, data, scope, transform, out))
        return;
      if (
        kind === 'diagram' &&
        this.readDiagram(node, data, scope, transform, out)
      )
        return;
      this.issues.add(NOT_SHOWN, { part: scope.part, detail: kind });
      return;
    }
    const frame = this.frameOf(ogeXmlChild(node, 'xfrm'), transform);
    if (!frame) return;
    const cNvPr = this.cNvPr(node);
    const element: OgeSlideTable = {
      kind: 'table',
      name: cNvPr?.attributes['name'] ?? '',
      description: cNvPr?.attributes['descr'] || undefined,
      frame,
      columns: ogeXmlChildren(ogeXmlChild(table, 'tblGrid'), 'gridCol').map(
        (c) => Number(c.attributes['w'] ?? 0) * transform.scaleX,
      ),
      rows: this.tableRows(table, scope, transform),
    };
    out.push(element);
  }

  private readChart(
    node: OgeXmlNode,
    data: OgeXmlNode | undefined,
    scope: ReadScope,
    transform: GroupTransform,
    out: OgeSlideElement[],
  ): boolean {
    const reference = ogeXmlChild(data, 'chart');
    const id = reference && ogeXmlAttribute(reference.attributes, 'id', true);
    const rel = id
      ? this.pkg.relationships(scope.part).find((r) => r.id === id)
      : undefined;
    const frame = this.frameOf(ogeXmlChild(node, 'xfrm'), transform);
    const tree = rel && !rel.external ? this.tree(rel.target) : undefined;
    if (!rel || !frame || !tree) return false;
    const { theme } = scope.master;
    let chart;
    try {
      chart = readOgeChart(tree, rel.target, {
        theme: theme.colors,
        majorFont: theme.majorFont,
        minorFont: theme.minorFont,
      });
    } catch {
      return false;
    }
    const undrawn = chart.groups.find(
      (group) => !OGE_DRAWN_CHART_KINDS.has(group.kind),
    );
    if (undrawn || !chart.groups.length) {
      this.issues.add('chart-type-not-shown', {
        part: rel.target,
        detail: undrawn?.kind ?? 'empty',
      });
      return true;
    }
    // a title with no text of its own shows Office's automatic one
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
    const cNvPr = this.cNvPr(node);
    out.push({
      kind: 'chart',
      name: cNvPr?.attributes['name'] ?? '',
      description: cNvPr?.attributes['descr'] || undefined,
      frame,
      chart,
      theme: theme.colors,
      bodyFont: theme.minorFont,
    });
    return true;
  }

  /** SmartArt: the shapes PowerPoint cached for it, placed in its frame. */
  private readDiagram(
    node: OgeXmlNode,
    data: OgeXmlNode | undefined,
    scope: ReadScope,
    transform: GroupTransform,
    out: OgeSlideElement[],
  ): boolean {
    const ids = ogeXmlChild(data, 'relIds');
    const model = ids && ogeXmlAttribute(ids.attributes, 'dm', true);
    const rels = this.pkg.relationships(scope.part);
    const dataRel = rels.find((r) => r.id === model);
    const dataTree = dataRel ? this.tree(dataRel.target) : undefined;
    const ext = this.descendant(dataTree, 'dataModelExt');
    const drawingRel =
      rels.find((r) => r.id === ext?.attributes['relId']) ??
      rels.find((r) => r.type === 'diagramDrawing');
    const frame = this.frameOf(ogeXmlChild(node, 'xfrm'), transform);
    const drawing = drawingRel ? this.tree(drawingRel.target) : undefined;
    const tree = ogeXmlChild(drawing, 'spTree');
    if (!frame || !tree || !drawingRel) return false;
    this.readTree(
      tree,
      { ...scope, part: drawingRel.target, ancestors: [], placeholders: false },
      {
        ...IDENTITY,
        offsetX: frame.x,
        offsetY: frame.y,
      },
      out,
    );
    return true;
  }

  private descendant(
    node: OgeXmlNode | undefined,
    name: string,
  ): OgeXmlNode | undefined {
    for (const child of node?.children ?? []) {
      if (child.name === name) return child;
      const found = this.descendant(child, name);
      if (found) return found;
    }
    return undefined;
  }

  private tableRows(
    table: OgeXmlNode,
    scope: ReadScope,
    transform: GroupTransform,
  ): OgeSlideTable['rows'] {
    const properties = ogeXmlChild(table, 'tblPr');
    const flags = properties?.attributes ?? {};
    const on = (name: string): boolean => ogeXmlBool(flags[name], false);
    const styleId = ogeXmlChild(properties, 'tableStyleId')?.text;
    const style = styleId ? this.tableStyles.get(styleId) : undefined;
    if (styleId && !style)
      this.issues.add('table-style-not-shown', {
        part: scope.part,
        detail: styleId,
      });
    const rows = ogeXmlChildren(table, 'tr');
    const columnCount = Math.max(
      ...rows.map((r) => ogeXmlChildren(r, 'tc').length),
      0,
    );
    return rows.map((row, r) => ({
      height: Number(row.attributes['h'] ?? 0) * transform.scaleY,
      cells: ogeXmlChildren(row, 'tc').map((cell, c) => {
        const position = {
          atTop: r === 0,
          atBottom: r === rows.length - 1,
          atLeft: c === 0,
          atRight: c === columnCount - 1,
        };
        const parts = this.cellStyleParts(style, {
          firstRow: on('firstRow') && r === 0,
          lastRow: on('lastRow') && r === rows.length - 1,
          firstCol: on('firstCol') && c === 0,
          lastCol: on('lastCol') && c === columnCount - 1,
          bandRow: on('bandRow'),
          bandCol: on('bandCol'),
          row: r - (on('firstRow') ? 1 : 0),
          column: c - (on('firstCol') ? 1 : 0),
        });
        return this.tableCell(cell, parts, position, scope);
      }),
    }));
  }

  /** The conditional parts that apply to a cell, weakest first. */
  private cellStyleParts(
    style: OgeXmlNode | undefined,
    where: {
      firstRow: boolean;
      lastRow: boolean;
      firstCol: boolean;
      lastCol: boolean;
      bandRow: boolean;
      bandCol: boolean;
      row: number;
      column: number;
    },
  ): OgeXmlNode[] {
    const names = ['wholeTbl'];
    const inBody = !where.firstRow && !where.lastRow;
    if (where.bandCol && !where.firstCol && !where.lastCol) {
      names.push(where.column % 2 === 0 ? 'band1V' : 'band2V');
    }
    if (where.bandRow && inBody) {
      names.push(where.row % 2 === 0 ? 'band1H' : 'band2H');
    }
    if (where.firstCol) names.push('firstCol');
    if (where.lastCol) names.push('lastCol');
    if (where.lastRow) names.push('lastRow');
    if (where.firstRow) names.push('firstRow');
    return names.flatMap((name) => {
      const part = ogeXmlChild(style, name);
      return part ? [part] : [];
    });
  }

  /** A cell edge: its own line, else the strongest table style part's. */
  private cellBorder(
    tcPr: OgeXmlNode | undefined,
    own: string,
    parts: readonly OgeXmlNode[],
    edge: string,
    scope: ReadScope,
  ): OgeSlideLine | null {
    const lines: (OgeXmlNode | undefined)[] = [];
    for (const part of parts) {
      const borders = ogeXmlChild(ogeXmlChild(part, 'tcStyle'), 'tcBdr');
      const line = ogeXmlChild(ogeXmlChild(borders, edge), 'ln');
      if (line) lines.push(line);
    }
    lines.push(ogeXmlChild(tcPr, own));
    const strongest = lines.filter(Boolean).pop();
    if (!strongest) return null;
    const fill = this.fillOf(strongest, scope.context, scope.part);
    if (!fill || fill.kind === 'none') return null;
    return {
      fill,
      width: ogeXmlNumber(strongest.attributes['w']) ?? 12700,
      dash: ogeXmlChild(strongest, 'prstDash')?.attributes['val'] ?? 'solid',
      cap: strongest.attributes['cap'] ?? 'flat',
    };
  }

  private tableCell(
    cell: OgeXmlNode,
    parts: readonly OgeXmlNode[],
    position: {
      atTop: boolean;
      atBottom: boolean;
      atLeft: boolean;
      atRight: boolean;
    },
    scope: ReadScope,
  ): OgeSlideTableCell {
    const tcPr = ogeXmlChild(cell, 'tcPr');
    let fill: OgeSlideFill | undefined = this.fillOf(
      tcPr && {
        ...tcPr,
        children: tcPr.children.filter((c) => !c.name.startsWith('ln')),
      },
      scope.context,
      scope.part,
    );
    const base: RunProps = {};
    let styledFill: OgeSlideFill | undefined;
    for (const part of parts) {
      styledFill =
        this.fillOf(
          ogeXmlChild(ogeXmlChild(part, 'tcStyle'), 'fill'),
          scope.context,
          scope.part,
        ) ?? styledFill;
      const text = ogeXmlChild(part, 'tcTxStyle');
      if (text) {
        const color = ogeFindSlideColor(text, scope.context);
        const fontRef = ogeXmlChild(text, 'fontRef');
        assignDefined(base, {
          bold:
            text.attributes['b'] === undefined
              ? undefined
              : text.attributes['b'] === 'on',
          italic:
            text.attributes['i'] === undefined
              ? undefined
              : text.attributes['i'] === 'on',
          color,
          font:
            fontRef?.attributes['idx'] === 'major'
              ? scope.master.theme.majorFont
              : fontRef
                ? scope.master.theme.minorFont
                : undefined,
        });
      }
    }
    fill = fill ?? styledFill;
    const txBody = ogeXmlChild(cell, 'txBody');
    const body = txBody
      ? this.textBody(
          txBody,
          [ogeXmlChild(txBody, 'bodyPr')],
          [this.defaultTextStyle, ogeXmlChild(txBody, 'lstStyle')],
          base,
          scope,
        )
      : null;
    const margin = (name: string, fallback: number): number =>
      ogeXmlNumber(tcPr?.attributes[name]) ?? fallback;
    const insets = {
      left: margin('marL', 91440),
      top: margin('marT', 45720),
      right: margin('marR', 91440),
      bottom: margin('marB', 45720),
    };
    const text: OgeSlideTextBody = {
      insets,
      anchor: tcPr?.attributes['anchor'] ?? 't',
      wrap: true,
      vertical: tcPr?.attributes['vert'] ?? 'horz',
      fontScale: 1,
      lineSpacingReduction: 0,
      paragraphs: body?.paragraphs ?? [],
    };
    return {
      fill: fill ?? { kind: 'none' },
      text,
      borders: {
        left: this.cellBorder(
          tcPr,
          'lnL',
          parts,
          position.atLeft ? 'left' : 'insideV',
          scope,
        ),
        top: this.cellBorder(
          tcPr,
          'lnT',
          parts,
          position.atTop ? 'top' : 'insideH',
          scope,
        ),
        right: this.cellBorder(
          tcPr,
          'lnR',
          parts,
          position.atRight ? 'right' : 'insideV',
          scope,
        ),
        bottom: this.cellBorder(
          tcPr,
          'lnB',
          parts,
          position.atBottom ? 'bottom' : 'insideH',
          scope,
        ),
      },
      columnSpan: ogeXmlNumber(cell.attributes['gridSpan']) ?? 1,
      rowSpan: ogeXmlNumber(cell.attributes['rowSpan']) ?? 1,
      merged:
        ogeXmlBool(cell.attributes['hMerge'], false) ||
        ogeXmlBool(cell.attributes['vMerge'], false),
    };
  }
}

/** Emu per point, for callers converting the model's lengths. */
export const OGE_EMU_PER_POINT = EMU_PER_POINT;
