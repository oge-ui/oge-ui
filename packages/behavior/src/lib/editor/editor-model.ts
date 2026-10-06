/**
 * The rich-text editor's document model (W8e).
 *
 * The editor never asks the browser to edit: `document.execCommand` is
 * deprecated, behaves differently in every engine and writes whatever markup
 * it likes. Instead the document is a plain immutable value — a flat list of
 * blocks, each holding a run of inline nodes with their marks — and every
 * edit is a pure function from one value to the next. The contenteditable
 * element is a projection of this model, re-rendered after each command, and
 * the HTML value is a serialization of it. That is what makes the editor
 * testable without a layout engine and what makes its output canonical: two
 * documents that look the same serialize the same.
 *
 * The block list is deliberately flat (the Quill "line" shape): a list item
 * is a block with a `list` kind and an `indent`, and nesting is reconstructed
 * by the serializer. Flat blocks keep every position a simple
 * `{ block, offset }` pair and every command a loop over a block range.
 */

/** A mark that is either on or off. */
export type OgeEditorToggleMark =
  'bold' | 'italic' | 'underline' | 'strike' | 'code';

/** Every inline mark name, including the valued ones. */
export type OgeEditorMarkName =
  OgeEditorToggleMark | 'subscript' | 'superscript';

/** A hyperlink carried as a mark. `href` is already sanitized. */
export interface OgeEditorLink {
  readonly href: string;
  readonly title?: string;
  /** `'_blank'` opens a new tab; the serializer adds `rel="noopener noreferrer"`. */
  readonly target?: '_blank';
}

/** The marks of one inline node. Absent keys are off. */
export interface OgeEditorMarks {
  readonly bold?: true;
  readonly italic?: true;
  readonly underline?: true;
  readonly strike?: true;
  readonly code?: true;
  readonly script?: 'sub' | 'super';
  readonly link?: OgeEditorLink;
  /** Text colour — a validated CSS colour value. */
  readonly color?: string;
  /** Highlight colour — a validated CSS colour value. */
  readonly background?: string;
}

/** A run of text with one set of marks. */
export interface OgeEditorText {
  readonly kind: 'text';
  readonly text: string;
  readonly marks: OgeEditorMarks;
}

/** An inline image — one position wide. `src` is already sanitized. */
export interface OgeEditorImage {
  readonly kind: 'image';
  readonly src: string;
  readonly alt: string;
  readonly width?: number;
  readonly height?: number;
  readonly marks: OgeEditorMarks;
}

/** A line break inside a block (Shift+Enter) — one position wide. */
export interface OgeEditorBreak {
  readonly kind: 'break';
  readonly marks: OgeEditorMarks;
}

/** Anything that can sit inside a block. */
export type OgeEditorInline = OgeEditorText | OgeEditorImage | OgeEditorBreak;

/** What a block is. A list item carries its list kind in `list`. */
export type OgeEditorBlockType =
  'paragraph' | 'heading' | 'blockquote' | 'codeBlock' | 'listItem' | 'rule';

/** Kind of list a `listItem` block belongs to. */
export type OgeEditorListKind = 'bullet' | 'ordered';

/** Heading level of a `heading` block. */
export type OgeEditorHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Horizontal alignment of a block — logical, so it mirrors in RTL. */
export type OgeEditorAlign = 'start' | 'center' | 'end' | 'justify';

/** Writing direction of a block (`dir` attribute). */
export type OgeEditorDirection = 'ltr' | 'rtl';

/** One block of the document. */
export interface OgeEditorBlock {
  readonly type: OgeEditorBlockType;
  /** Heading level; only on `heading`. */
  readonly level?: OgeEditorHeadingLevel;
  /** List kind; only on `listItem`. */
  readonly list?: OgeEditorListKind;
  /** List nesting depth, `0` = top level; only meaningful on `listItem`. */
  readonly indent: number;
  readonly align?: OgeEditorAlign;
  readonly dir?: OgeEditorDirection;
  /** Inline content; always empty on `rule`. */
  readonly inlines: readonly OgeEditorInline[];
}

/** A whole document. Never has zero blocks. */
export interface OgeEditorDoc {
  readonly blocks: readonly OgeEditorBlock[];
}

/** A caret position: a block index and an offset in inline units. */
export interface OgeEditorPoint {
  readonly block: number;
  readonly offset: number;
}

/** A selection; `anchor` is where it started, `focus` where it ends. */
export interface OgeEditorSelection {
  readonly anchor: OgeEditorPoint;
  readonly focus: OgeEditorPoint;
}

/** The deepest a list may nest. */
export const OGE_EDITOR_MAX_INDENT = 8;

const NO_MARKS: OgeEditorMarks = Object.freeze({});

/** The shared empty mark set. */
export function ogeEditorNoMarks(): OgeEditorMarks {
  return NO_MARKS;
}

/** A plain paragraph. */
export function ogeEditorParagraph(
  inlines: readonly OgeEditorInline[] = [],
): OgeEditorBlock {
  return { type: 'paragraph', indent: 0, inlines };
}

/** A text inline. */
export function ogeEditorText(
  text: string,
  marks: OgeEditorMarks = NO_MARKS,
): OgeEditorText {
  return { kind: 'text', text, marks };
}

/** A document holding one empty paragraph. */
export function ogeEditorEmptyDoc(): OgeEditorDoc {
  return { blocks: [ogeEditorParagraph()] };
}

/** A collapsed selection at `point`. */
export function ogeEditorCaret(point: OgeEditorPoint): OgeEditorSelection {
  return { anchor: point, focus: point };
}

/** Width of one inline in positions. */
export function inlineLength(inline: OgeEditorInline): number {
  return inline.kind === 'text' ? inline.text.length : 1;
}

/** Width of a block in positions. */
export function blockLength(block: OgeEditorBlock): number {
  let length = 0;
  for (const inline of block.inlines) length += inlineLength(inline);
  return length;
}

/** `true` when the block holds no content (a rule is never "empty" text). */
export function blockIsEmpty(block: OgeEditorBlock): boolean {
  return block.type !== 'rule' && blockLength(block) === 0;
}

/** `true` when the document is a single empty paragraph-like block. */
export function docIsEmpty(doc: OgeEditorDoc): boolean {
  return (
    doc.blocks.length === 1 &&
    doc.blocks[0].type !== 'rule' &&
    blockLength(doc.blocks[0]) === 0
  );
}

function linkEqual(a?: OgeEditorLink, b?: OgeEditorLink): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.href === b.href && a.title === b.title && a.target === b.target;
}

/** Structural equality of two mark sets. */
export function marksEqual(a: OgeEditorMarks, b: OgeEditorMarks): boolean {
  if (a === b) return true;
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strike === b.strike &&
    a.code === b.code &&
    a.script === b.script &&
    a.color === b.color &&
    a.background === b.background &&
    linkEqual(a.link, b.link)
  );
}

/** A shallow copy of `value` without `keys`. */
export function omitKeys<T extends object, K extends keyof T>(
  value: T,
  ...keys: K[]
): Omit<T, K> {
  const copy = { ...value };
  for (const key of keys) delete copy[key];
  return copy;
}

/** Same marks, ignoring the link — used to decide whether typing extends a link. */
export function marksWithoutLink(marks: OgeEditorMarks): OgeEditorMarks {
  if (!marks.link) return marks;
  const rest = omitKeys(marks, 'link');
  return rest;
}

/**
 * Merges adjacent text runs with equal marks and drops empty ones — the
 * canonical form every command returns, so equal documents compare equal.
 */
export function normalizeInlines(
  inlines: readonly OgeEditorInline[],
): readonly OgeEditorInline[] {
  const out: OgeEditorInline[] = [];
  for (const inline of inlines) {
    if (inline.kind === 'text') {
      if (inline.text === '') continue;
      const last = out[out.length - 1];
      if (last?.kind === 'text' && marksEqual(last.marks, inline.marks)) {
        out[out.length - 1] = {
          kind: 'text',
          text: last.text + inline.text,
          marks: last.marks,
        };
        continue;
      }
    }
    out.push(inline);
  }
  // keep the original array when nothing changed (identity = cheap re-render)
  if (
    out.length === inlines.length &&
    out.every((inline, i) => inline === inlines[i])
  ) {
    return inlines;
  }
  return out;
}

/** The inlines between `from` and `to` (positions), text split at the edges. */
export function sliceInlines(
  inlines: readonly OgeEditorInline[],
  from: number,
  to: number = Number.POSITIVE_INFINITY,
): OgeEditorInline[] {
  const out: OgeEditorInline[] = [];
  if (to <= from) return out;
  let pos = 0;
  for (const inline of inlines) {
    const length = inlineLength(inline);
    const start = pos;
    const end = pos + length;
    pos = end;
    if (end <= from || start >= to) continue;
    if (inline.kind !== 'text') {
      out.push(inline);
      continue;
    }
    const a = Math.max(from, start) - start;
    const b = Math.min(to, end) - start;
    out.push(
      a === 0 && b === length
        ? inline
        : { kind: 'text', text: inline.text.slice(a, b), marks: inline.marks },
    );
  }
  return out;
}

/** Inserts `insert` at position `offset`. */
export function insertInlinesAt(
  inlines: readonly OgeEditorInline[],
  offset: number,
  insert: readonly OgeEditorInline[],
): readonly OgeEditorInline[] {
  return normalizeInlines([
    ...sliceInlines(inlines, 0, offset),
    ...insert,
    ...sliceInlines(inlines, offset),
  ]);
}

/** The text of a block — breaks as `\n`, images as U+FFFC. */
export function blockText(block: OgeEditorBlock): string {
  let text = '';
  for (const inline of block.inlines) {
    text +=
      inline.kind === 'text'
        ? inline.text
        : inline.kind === 'break'
          ? '\n'
          : '￼';
  }
  return text;
}

/** The marks in effect for typing at `offset`: the character before it, else after. */
export function marksAt(block: OgeEditorBlock, offset: number): OgeEditorMarks {
  if (block.inlines.length === 0) return NO_MARKS;
  let pos = 0;
  let before: OgeEditorInline | undefined;
  let after: OgeEditorInline | undefined;
  for (const inline of block.inlines) {
    const length = inlineLength(inline);
    if (pos < offset && offset <= pos + length) before = inline;
    if (after === undefined && pos <= offset && offset < pos + length) {
      after = inline;
    }
    pos += length;
  }
  const source = before ?? after;
  if (!source || source.kind === 'image') return NO_MARKS;
  let marks = source.marks;
  // Typing at either edge of a link must not extend it — the behaviour of
  // every reference editor — so the link only carries over when the caret
  // sits strictly inside it (the same link on both sides).
  if (marks.link) {
    const inside =
      before !== undefined &&
      after !== undefined &&
      linkEqual(before.marks.link, after.marks.link);
    if (!inside) marks = marksWithoutLink(marks);
  }
  return marks;
}

/** Clamps a point into the document. */
export function clampPoint(
  doc: OgeEditorDoc,
  point: OgeEditorPoint,
): OgeEditorPoint {
  const block = Math.min(Math.max(point.block, 0), doc.blocks.length - 1);
  const max = blockLength(doc.blocks[block]);
  const offset = Math.min(Math.max(point.offset, 0), max);
  return block === point.block && offset === point.offset
    ? point
    : { block, offset };
}

/** Negative when `a` is before `b`, `0` when equal. */
export function comparePoints(a: OgeEditorPoint, b: OgeEditorPoint): number {
  return a.block === b.block ? a.offset - b.offset : a.block - b.block;
}

/** Equality of two points. */
export function pointsEqual(a: OgeEditorPoint, b: OgeEditorPoint): boolean {
  return a.block === b.block && a.offset === b.offset;
}

/** A selection's start and end in document order. */
export function selectionRange(selection: OgeEditorSelection): {
  readonly start: OgeEditorPoint;
  readonly end: OgeEditorPoint;
} {
  return comparePoints(selection.anchor, selection.focus) <= 0
    ? { start: selection.anchor, end: selection.focus }
    : { start: selection.focus, end: selection.anchor };
}

/** `true` when the selection is a caret. */
export function selectionIsCollapsed(selection: OgeEditorSelection): boolean {
  return pointsEqual(selection.anchor, selection.focus);
}

/** Replaces the block at `index`. */
export function replaceBlock(
  doc: OgeEditorDoc,
  index: number,
  block: OgeEditorBlock,
): OgeEditorDoc {
  if (doc.blocks[index] === block) return doc;
  const blocks = doc.blocks.slice();
  blocks[index] = block;
  return { blocks };
}

/** A copy of `block` with new inlines (normalized). */
export function withInlines(
  block: OgeEditorBlock,
  inlines: readonly OgeEditorInline[],
): OgeEditorBlock {
  const normalized = normalizeInlines(inlines);
  return normalized === block.inlines
    ? block
    : { ...block, inlines: normalized };
}

/** The plain text of the whole document, blocks joined by `\n`. */
export function docText(doc: OgeEditorDoc): string {
  return doc.blocks
    .filter((block) => block.type !== 'rule')
    .map(blockText)
    .join('\n')
    .replace(/￼/g, '');
}

/** A document with at least one block — the invariant every command keeps. */
export function ensureDoc(blocks: readonly OgeEditorBlock[]): OgeEditorDoc {
  return { blocks: blocks.length > 0 ? blocks : [ogeEditorParagraph()] };
}
