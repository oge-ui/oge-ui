/**
 * Every edit the rich-text editor can make, as a pure function of the
 * editor state (W8e). A command returns the next state, or `null` when it
 * does not apply (Backspace at the very start, indenting a paragraph…), so
 * the caller can tell "nothing happened" from "something happened" without
 * diffing. Nothing here touches the DOM or `document.execCommand`.
 */
import {
  OGE_EDITOR_MAX_INDENT,
  blockIsEmpty,
  blockLength,
  blockText,
  clampPoint,
  ensureDoc,
  inlineLength,
  marksAt,
  marksWithoutLink,
  normalizeInlines,
  ogeEditorCaret,
  omitKeys,
  ogeEditorNoMarks,
  ogeEditorParagraph,
  replaceBlock,
  selectionIsCollapsed,
  selectionRange,
  sliceInlines,
  withInlines,
  type OgeEditorAlign,
  type OgeEditorBlock,
  type OgeEditorDirection,
  type OgeEditorDoc,
  type OgeEditorHeadingLevel,
  type OgeEditorImage,
  type OgeEditorInline,
  type OgeEditorLink,
  type OgeEditorListKind,
  type OgeEditorMarkName,
  type OgeEditorMarks,
  type OgeEditorPoint,
  type OgeEditorSelection,
} from './editor-model';

/** The editor's whole state: document, selection and armed caret marks. */
export interface OgeEditorState {
  readonly doc: OgeEditorDoc;
  readonly selection: OgeEditorSelection;
  /**
   * Marks a caret toggle armed for the next typed text (Ctrl+B with nothing
   * selected); `null` follows the text around the caret.
   */
  readonly storedMarks: OgeEditorMarks | null;
}

/** Block formats the block-format command sets. */
export type OgeEditorBlockFormat =
  'paragraph' | 'heading' | 'blockquote' | 'codeBlock';

/** How far a Backspace/Delete reaches. */
export type OgeEditorDeleteUnit = 'character' | 'word' | 'line';

/** A state holding `doc` with the caret at its start. */
export function ogeEditorState(doc: OgeEditorDoc): OgeEditorState {
  return {
    doc,
    selection: ogeEditorCaret({ block: 0, offset: 0 }),
    storedMarks: null,
  };
}

function at(block: number, offset: number): OgeEditorPoint {
  return { block, offset };
}

function caretState(
  state: OgeEditorState,
  doc: OgeEditorDoc,
  point: OgeEditorPoint,
  storedMarks: OgeEditorMarks | null = null,
): OgeEditorState {
  return {
    doc,
    selection: ogeEditorCaret(clampPoint(doc, point)),
    storedMarks,
  };
}

// --- deletion ---------------------------------------------------------------

/**
 * Removes everything between `start` and `end`; the start block keeps its
 * type and swallows the end block's tail. Returns the collapsed point.
 */
export function deleteRange(
  doc: OgeEditorDoc,
  start: OgeEditorPoint,
  end: OgeEditorPoint,
): { readonly doc: OgeEditorDoc; readonly point: OgeEditorPoint } {
  const blocks = doc.blocks;
  if (
    start.block > end.block ||
    (start.block === end.block && start.offset >= end.offset)
  ) {
    return { doc, point: start };
  }
  if (start.block === end.block) {
    const block = blocks[start.block];
    const inlines = [
      ...sliceInlines(block.inlines, 0, start.offset),
      ...sliceInlines(block.inlines, end.offset),
    ];
    return {
      doc: replaceBlock(doc, start.block, withInlines(block, inlines)),
      point: start,
    };
  }
  const first = blocks[start.block];
  const last = blocks[end.block];
  const tail = sliceInlines(last.inlines, end.offset);
  let merged: OgeEditorBlock;
  if (first.type === 'rule') {
    merged =
      last.type === 'rule' ? ogeEditorParagraph() : withInlines(last, tail);
  } else {
    merged = withInlines(first, [
      ...sliceInlines(first.inlines, 0, start.offset),
      ...(last.type === 'rule' ? [] : tail),
    ]);
  }
  const next = ensureDoc([
    ...blocks.slice(0, start.block),
    merged,
    ...blocks.slice(end.block + 1),
  ]);
  return {
    doc: next,
    point: first.type === 'rule' ? at(start.block, 0) : start,
  };
}

/** Deletes the selection; a caret is returned unchanged. */
export function deleteSelection(state: OgeEditorState): OgeEditorState {
  if (selectionIsCollapsed(state.selection)) return state;
  const { start, end } = selectionRange(state.selection);
  const result = deleteRange(state.doc, start, end);
  return caretState(state, result.doc, result.point, state.storedMarks);
}

/** Where the caret lands when typing into a rule: a paragraph after it. */
function escapeRule(state: OgeEditorState): OgeEditorState {
  const point = state.selection.focus;
  const block = state.doc.blocks[point.block];
  if (block.type !== 'rule') return state;
  const nextBlock = state.doc.blocks[point.block + 1];
  if (nextBlock && nextBlock.type !== 'rule') {
    return caretState(state, state.doc, at(point.block + 1, 0));
  }
  const blocks = state.doc.blocks.slice();
  blocks.splice(point.block + 1, 0, ogeEditorParagraph());
  return caretState(state, { blocks }, at(point.block + 1, 0));
}

let graphemes: Intl.Segmenter | null | undefined;

function graphemeSegmenter(): Intl.Segmenter | null {
  if (graphemes === undefined) {
    graphemes =
      typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;
  }
  return graphemes;
}

/** The previous position Backspace reaches from `offset`. */
export function previousBoundary(
  block: OgeEditorBlock,
  offset: number,
  unit: OgeEditorDeleteUnit = 'character',
): number {
  if (offset <= 0) return 0;
  const text = blockText(block).slice(0, offset);
  if (unit === 'line') {
    const lineStart = text.lastIndexOf('\n');
    return lineStart === offset - 1 ? offset - 1 : lineStart + 1;
  }
  if (unit === 'word') {
    let i = offset;
    while (i > 0 && /\s/.test(text[i - 1]) && text[i - 1] !== '\n') i--;
    if (i > 0 && (text[i - 1] === '\n' || text[i - 1] === '￼')) {
      return i === offset ? i - 1 : i;
    }
    while (i > 0 && !/\s/.test(text[i - 1]) && text[i - 1] !== '￼') i--;
    return i;
  }
  const segmenter = graphemeSegmenter();
  if (segmenter) {
    let last = 0;
    for (const segment of segmenter.segment(text)) last = segment.index;
    return last;
  }
  const code = text.charCodeAt(offset - 1);
  if (code >= 0xdc00 && code <= 0xdfff && offset >= 2) return offset - 2;
  return offset - 1;
}

/** The next position Delete reaches from `offset`. */
export function nextBoundary(
  block: OgeEditorBlock,
  offset: number,
  unit: OgeEditorDeleteUnit = 'character',
): number {
  const length = blockLength(block);
  if (offset >= length) return length;
  const text = blockText(block);
  if (unit === 'line') {
    const lineEnd = text.indexOf('\n', offset);
    return lineEnd === -1 ? length : lineEnd === offset ? offset + 1 : lineEnd;
  }
  if (unit === 'word') {
    let i = offset;
    if (text[i] === '\n' || text[i] === '￼') return i + 1;
    while (i < length && /\s/.test(text[i]) && text[i] !== '\n') i++;
    while (i < length && !/\s/.test(text[i]) && text[i] !== '￼') i++;
    return i;
  }
  const segmenter = graphemeSegmenter();
  if (segmenter) {
    for (const segment of segmenter.segment(text.slice(offset))) {
      return offset + segment.segment.length;
    }
  }
  const code = text.charCodeAt(offset);
  if (code >= 0xd800 && code <= 0xdbff && offset + 1 < length) {
    return offset + 2;
  }
  return offset + 1;
}

/** A block turned back into a plain paragraph, keeping its text and alignment. */
function asParagraph(block: OgeEditorBlock): OgeEditorBlock {
  const rest = omitKeys(block, 'level', 'list');
  return { ...rest, type: 'paragraph', indent: 0 };
}

/** Backspace. */
export function deleteBackward(
  state: OgeEditorState,
  unit: OgeEditorDeleteUnit = 'character',
): OgeEditorState | null {
  if (!selectionIsCollapsed(state.selection)) return deleteSelection(state);
  const doc = state.doc;
  const point = state.selection.focus;
  const block = doc.blocks[point.block];
  if (block.type === 'rule') return removeBlockAt(state, point.block, 'back');
  if (point.offset > 0) {
    const from = previousBoundary(block, point.offset, unit);
    const result = deleteRange(doc, at(point.block, from), point);
    return caretState(state, result.doc, result.point);
  }
  // at the start of a block: unwrap before merging (every reference editor)
  if (block.type === 'listItem') {
    const next: OgeEditorBlock =
      block.indent > 0
        ? { ...block, indent: block.indent - 1 }
        : asParagraph(block);
    return caretState(state, replaceBlock(doc, point.block, next), point);
  }
  if (
    block.type === 'heading' ||
    block.type === 'blockquote' ||
    block.type === 'codeBlock'
  ) {
    return caretState(
      state,
      replaceBlock(doc, point.block, asParagraph(block)),
      point,
    );
  }
  if (point.block === 0) return null;
  const previous = doc.blocks[point.block - 1];
  if (previous.type === 'rule') {
    return removeBlockAt(
      caretState(state, doc, point),
      point.block - 1,
      'stay',
    );
  }
  const merged = withInlines(previous, [...previous.inlines, ...block.inlines]);
  const blocks = doc.blocks.slice();
  blocks.splice(point.block - 1, 2, merged);
  return caretState(
    state,
    { blocks },
    at(point.block - 1, blockLength(previous)),
  );
}

/** Delete (forward). */
export function deleteForward(
  state: OgeEditorState,
  unit: OgeEditorDeleteUnit = 'character',
): OgeEditorState | null {
  if (!selectionIsCollapsed(state.selection)) return deleteSelection(state);
  const doc = state.doc;
  const point = state.selection.focus;
  const block = doc.blocks[point.block];
  if (block.type === 'rule') return removeBlockAt(state, point.block, 'stay');
  const length = blockLength(block);
  if (point.offset < length) {
    const to = nextBoundary(block, point.offset, unit);
    const result = deleteRange(doc, point, at(point.block, to));
    return caretState(state, result.doc, result.point);
  }
  if (point.block >= doc.blocks.length - 1) return null;
  const next = doc.blocks[point.block + 1];
  if (next.type === 'rule') {
    const blocks = doc.blocks.slice();
    blocks.splice(point.block + 1, 1);
    return caretState(state, ensureDoc(blocks), point);
  }
  const merged = withInlines(block, [...block.inlines, ...next.inlines]);
  const blocks = doc.blocks.slice();
  blocks.splice(point.block, 2, merged);
  return caretState(state, { blocks }, point);
}

function removeBlockAt(
  state: OgeEditorState,
  index: number,
  caret: 'back' | 'stay',
): OgeEditorState {
  const blocks = state.doc.blocks.slice();
  blocks.splice(index, 1);
  const doc = ensureDoc(blocks);
  if (caret === 'back' && index > 0) {
    return caretState(
      state,
      doc,
      at(index - 1, blockLength(doc.blocks[index - 1])),
    );
  }
  const target = Math.min(
    caret === 'stay' && state.selection.focus.block > index
      ? state.selection.focus.block - 1
      : index,
    doc.blocks.length - 1,
  );
  return caretState(
    state,
    doc,
    at(
      target,
      caret === 'stay' && state.selection.focus.block > index
        ? state.selection.focus.offset
        : 0,
    ),
  );
}

// --- insertion --------------------------------------------------------------

/** Typing: replaces the selection with `text` (no line breaks — see `insertPlainText`). */
export function insertText(
  state: OgeEditorState,
  text: string,
): OgeEditorState {
  if (/[\r\n]/.test(text)) return insertPlainText(state, text);
  if (text === '') return deleteSelection(state);
  let next = escapeRule(deleteSelection(state));
  const point = next.selection.focus;
  const block = next.doc.blocks[point.block];
  const marks =
    block.type === 'codeBlock'
      ? ogeEditorNoMarks()
      : (state.storedMarks ?? marksAt(block, point.offset));
  const inline: OgeEditorInline = { kind: 'text', text, marks };
  const updated = withInlines(block, [
    ...sliceInlines(block.inlines, 0, point.offset),
    inline,
    ...sliceInlines(block.inlines, point.offset),
  ]);
  next = caretState(
    next,
    replaceBlock(next.doc, point.block, updated),
    at(point.block, point.offset + text.length),
    // a stored mark keeps applying while the caret stays put
    state.storedMarks,
  );
  return next;
}

/** Inserts text that may contain line breaks: one paragraph per line (breaks in a code block). */
export function insertPlainText(
  state: OgeEditorState,
  text: string,
): OgeEditorState {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length === 1) return insertText(state, lines[0]);
  const focusBlock =
    state.doc.blocks[selectionRange(state.selection).start.block];
  if (focusBlock?.type === 'codeBlock') {
    const inlines: OgeEditorInline[] = [];
    lines.forEach((line, i) => {
      if (i > 0) inlines.push({ kind: 'break', marks: ogeEditorNoMarks() });
      if (line)
        inlines.push({ kind: 'text', text: line, marks: ogeEditorNoMarks() });
    });
    return insertInlines(state, inlines);
  }
  const marks = state.storedMarks ?? ogeEditorNoMarks();
  return insertFragment(
    state,
    ensureDoc(
      lines.map((line) =>
        ogeEditorParagraph(line ? [{ kind: 'text', text: line, marks }] : []),
      ),
    ),
  );
}

/** Inserts inline nodes at the selection (replacing it). */
export function insertInlines(
  state: OgeEditorState,
  inlines: readonly OgeEditorInline[],
): OgeEditorState {
  const next = escapeRule(deleteSelection(state));
  const point = next.selection.focus;
  const block = next.doc.blocks[point.block];
  let width = 0;
  for (const inline of inlines) width += inlineLength(inline);
  const updated = withInlines(block, [
    ...sliceInlines(block.inlines, 0, point.offset),
    ...inlines,
    ...sliceInlines(block.inlines, point.offset),
  ]);
  return caretState(
    next,
    replaceBlock(next.doc, point.block, updated),
    at(point.block, point.offset + width),
  );
}

/**
 * Pastes a parsed document at the selection. One text block merges into the
 * caret's block; several are spliced in, the first merging with the text
 * before the caret and the last with the text after it.
 */
export function insertFragment(
  state: OgeEditorState,
  fragment: OgeEditorDoc,
): OgeEditorState {
  const frag = fragment.blocks;
  if (frag.length === 0) return deleteSelection(state);
  if (frag.length === 1 && frag[0].type !== 'rule') {
    const base = escapeRule(deleteSelection(state));
    const point = base.selection.focus;
    const block = base.doc.blocks[point.block];
    if (blockIsEmpty(block) && block.type === 'paragraph') {
      // an empty line adopts the pasted block's format (a heading stays one)
      const adopted = { ...frag[0], align: frag[0].align ?? block.align };
      return caretState(
        base,
        replaceBlock(base.doc, point.block, adopted),
        at(point.block, blockLength(adopted)),
      );
    }
    const inlines =
      block.type === 'codeBlock'
        ? plainInlines(frag[0].inlines)
        : frag[0].inlines;
    return insertInlines(base, inlines);
  }
  const base = escapeRule(deleteSelection(state));
  const point = base.selection.focus;
  const block = base.doc.blocks[point.block];
  const prefix = sliceInlines(block.inlines, 0, point.offset);
  const suffix = sliceInlines(block.inlines, point.offset);
  const out: OgeEditorBlock[] = [];
  let index = 0;
  const first = frag[0];
  if (first.type !== 'rule') {
    out.push(
      prefix.length === 0 && block.type === 'paragraph'
        ? first
        : withInlines(block, [...prefix, ...first.inlines]),
    );
    index = 1;
  } else if (prefix.length > 0) {
    out.push(withInlines(block, prefix));
  }
  for (; index < frag.length - 1; index++) out.push(frag[index]);
  const last = frag[frag.length - 1];
  let caret: OgeEditorPoint;
  if (index === frag.length - 1) {
    if (last.type === 'rule') {
      out.push(last);
      out.push(
        withInlines(
          block.type === 'heading' && suffix.length === 0
            ? asParagraph(block)
            : block,
          suffix,
        ),
      );
      caret = at(point.block + out.length - 1, 0);
    } else {
      out.push(withInlines(last, [...last.inlines, ...suffix]));
      caret = at(point.block + out.length - 1, blockLength(last));
    }
  } else {
    // a single block was merged into the first slot — append the suffix
    const merged = out[out.length - 1];
    out[out.length - 1] = withInlines(merged, [...merged.inlines, ...suffix]);
    caret = at(point.block + out.length - 1, blockLength(merged));
  }
  const blocks = base.doc.blocks.slice();
  blocks.splice(point.block, 1, ...out);
  return caretState(base, ensureDoc(blocks), caret);
}

function plainInlines(
  inlines: readonly OgeEditorInline[],
): readonly OgeEditorInline[] {
  return normalizeInlines(
    inlines
      .filter((inline) => inline.kind !== 'image')
      .map((inline) =>
        inline.kind === 'text'
          ? { kind: 'text', text: inline.text, marks: ogeEditorNoMarks() }
          : { kind: 'break', marks: ogeEditorNoMarks() },
      ),
  );
}

/** Shift+Enter: a line break inside the block. */
export function insertBreak(state: OgeEditorState): OgeEditorState {
  const base = escapeRule(deleteSelection(state));
  const point = base.selection.focus;
  const block = base.doc.blocks[point.block];
  const marks = marksWithoutLink(
    state.storedMarks ?? marksAt(block, point.offset),
  );
  return {
    ...insertInlines(base, [{ kind: 'break', marks }]),
    storedMarks: state.storedMarks,
  };
}

/** Enter: splits the block (or leaves an empty list item / quote). */
export function splitBlock(state: OgeEditorState): OgeEditorState {
  const base = deleteSelection(state);
  const point = base.selection.focus;
  const doc = base.doc;
  const block = doc.blocks[point.block];
  if (block.type === 'rule') return escapeRule(base);
  if (blockIsEmpty(block)) {
    if (block.type === 'listItem') {
      const next: OgeEditorBlock =
        block.indent > 0
          ? { ...block, indent: block.indent - 1 }
          : asParagraph(block);
      return caretState(base, replaceBlock(doc, point.block, next), point);
    }
    if (block.type === 'blockquote' || block.type === 'codeBlock') {
      return caretState(
        base,
        replaceBlock(doc, point.block, asParagraph(block)),
        point,
      );
    }
  }
  const length = blockLength(block);
  if (block.type === 'codeBlock') {
    const last = block.inlines[block.inlines.length - 1];
    if (point.offset === length && last?.kind === 'break') {
      // Enter on the empty last line of a code block leaves it
      const trimmed = withInlines(block, block.inlines.slice(0, -1));
      const blocks = doc.blocks.slice();
      blocks.splice(point.block, 1, trimmed, ogeEditorParagraph());
      return caretState(base, { blocks }, at(point.block + 1, 0));
    }
    return insertInlines(base, [{ kind: 'break', marks: ogeEditorNoMarks() }]);
  }
  const before = sliceInlines(block.inlines, 0, point.offset);
  const after = sliceInlines(block.inlines, point.offset);
  const first = withInlines(block, before);
  const secondBase =
    block.type === 'heading' && after.length === 0 ? asParagraph(block) : block;
  const second = withInlines(secondBase, after);
  const blocks = doc.blocks.slice();
  blocks.splice(point.block, 1, first, second);
  const carried =
    after.length === 0
      ? marksWithoutLink(state.storedMarks ?? marksAt(block, point.offset))
      : null;
  return caretState(
    base,
    { blocks },
    at(point.block + 1, 0),
    carried && Object.keys(carried).length > 0 ? carried : null,
  );
}

/** Inserts an image at the selection. */
export function insertImage(
  state: OgeEditorState,
  image: Pick<OgeEditorImage, 'src' | 'alt' | 'width' | 'height'>,
): OgeEditorState {
  const inline: OgeEditorImage = {
    kind: 'image',
    src: image.src,
    alt: image.alt,
    ...(image.width !== undefined ? { width: image.width } : {}),
    ...(image.height !== undefined ? { height: image.height } : {}),
    marks: ogeEditorNoMarks(),
  };
  return insertInlines(state, [inline]);
}

/** Inserts a horizontal rule, splitting the block at the caret. */
export function insertRule(state: OgeEditorState): OgeEditorState {
  const base = escapeRule(deleteSelection(state));
  const point = base.selection.focus;
  const block = base.doc.blocks[point.block];
  const before = sliceInlines(block.inlines, 0, point.offset);
  const after = sliceInlines(block.inlines, point.offset);
  const out: OgeEditorBlock[] = [];
  if (before.length > 0) out.push(withInlines(block, before));
  out.push({ type: 'rule', indent: 0, inlines: [] });
  out.push(
    after.length > 0
      ? withInlines(block, after)
      : block.type === 'listItem' || block.type === 'paragraph'
        ? withInlines(block, [])
        : ogeEditorParagraph(),
  );
  const blocks = base.doc.blocks.slice();
  blocks.splice(point.block, 1, ...out);
  return caretState(base, { blocks }, at(point.block + out.length - 1, 0));
}

// --- marks ------------------------------------------------------------------

function toggleMarkValue(
  marks: OgeEditorMarks,
  mark: OgeEditorMarkName,
  on: boolean,
): OgeEditorMarks {
  if (mark === 'subscript' || mark === 'superscript') {
    const script = mark === 'subscript' ? 'sub' : 'super';
    if (on) return { ...marks, script };
    if (marks.script !== script) return marks;
    const rest = omitKeys(marks, 'script');
    return rest;
  }
  if (on) return marks[mark] ? marks : { ...marks, [mark]: true };
  if (!marks[mark]) return marks;
  const copy: Record<string, unknown> = { ...marks };
  delete copy[mark];
  return copy as OgeEditorMarks;
}

/** `true` when `marks` carries `mark`. */
export function hasMark(
  marks: OgeEditorMarks,
  mark: OgeEditorMarkName,
): boolean {
  if (mark === 'subscript') return marks.script === 'sub';
  if (mark === 'superscript') return marks.script === 'super';
  return marks[mark] === true;
}

/** Applies `fn` to the marks of every inline inside the range. */
export function mapMarksInRange(
  doc: OgeEditorDoc,
  start: OgeEditorPoint,
  end: OgeEditorPoint,
  fn: (marks: OgeEditorMarks) => OgeEditorMarks,
): OgeEditorDoc {
  let next = doc;
  for (let b = start.block; b <= end.block; b++) {
    const block = doc.blocks[b];
    if (block.type === 'rule' || block.type === 'codeBlock') continue;
    const from = b === start.block ? start.offset : 0;
    const to = b === end.block ? end.offset : blockLength(block);
    if (to <= from) continue;
    const middle = sliceInlines(block.inlines, from, to).map(
      (inline): OgeEditorInline => {
        const marks = fn(inline.marks);
        if (inline.kind === 'image') {
          return marks.link
            ? { ...inline, marks: { link: marks.link } }
            : { ...inline, marks: ogeEditorNoMarks() };
        }
        return marks === inline.marks ? inline : { ...inline, marks };
      },
    );
    next = replaceBlock(
      next,
      b,
      withInlines(block, [
        ...sliceInlines(block.inlines, 0, from),
        ...middle,
        ...sliceInlines(block.inlines, to),
      ]),
    );
  }
  return next;
}

/** The text inlines inside the range (split at its edges). */
function textInRange(
  doc: OgeEditorDoc,
  start: OgeEditorPoint,
  end: OgeEditorPoint,
): OgeEditorInline[] {
  const out: OgeEditorInline[] = [];
  for (let b = start.block; b <= end.block; b++) {
    const block = doc.blocks[b];
    if (block.type === 'rule') continue;
    const from = b === start.block ? start.offset : 0;
    const to = b === end.block ? end.offset : blockLength(block);
    for (const inline of sliceInlines(block.inlines, from, to)) {
      if (inline.kind === 'text') out.push(inline);
    }
  }
  return out;
}

/** `true` when every text character in the range carries `mark`. */
export function rangeHasMark(
  doc: OgeEditorDoc,
  start: OgeEditorPoint,
  end: OgeEditorPoint,
  mark: OgeEditorMarkName,
): boolean {
  const texts = textInRange(doc, start, end);
  return texts.length > 0 && texts.every((t) => hasMark(t.marks, mark));
}

/** The marks typing at the caret would get. */
export function caretMarks(state: OgeEditorState): OgeEditorMarks {
  if (state.storedMarks) return state.storedMarks;
  const point = state.selection.focus;
  return marksAt(state.doc.blocks[point.block], point.offset);
}

/** Ctrl+B and friends: toggles a mark on the selection, or arms it at the caret. */
export function toggleMark(
  state: OgeEditorState,
  mark: OgeEditorMarkName,
): OgeEditorState {
  if (selectionIsCollapsed(state.selection)) {
    const marks = caretMarks(state);
    return {
      ...state,
      storedMarks: toggleMarkValue(marks, mark, !hasMark(marks, mark)),
    };
  }
  const { start, end } = selectionRange(state.selection);
  const on = !rangeHasMark(state.doc, start, end, mark);
  return {
    ...state,
    doc: mapMarksInRange(state.doc, start, end, (marks) =>
      toggleMarkValue(marks, mark, on),
    ),
    storedMarks: null,
  };
}

function setValuedMark(
  marks: OgeEditorMarks,
  key: 'color' | 'background',
  value: string | null,
): OgeEditorMarks {
  if (value === null) {
    if (marks[key] === undefined) return marks;
    const copy: Record<string, unknown> = { ...marks };
    delete copy[key];
    return copy as OgeEditorMarks;
  }
  return marks[key] === value ? marks : { ...marks, [key]: value };
}

/** Sets (or with `null` removes) the text or highlight colour. */
export function setColor(
  state: OgeEditorState,
  key: 'color' | 'background',
  value: string | null,
): OgeEditorState {
  if (selectionIsCollapsed(state.selection)) {
    return {
      ...state,
      storedMarks: setValuedMark(caretMarks(state), key, value),
    };
  }
  const { start, end } = selectionRange(state.selection);
  return {
    ...state,
    doc: mapMarksInRange(state.doc, start, end, (marks) =>
      setValuedMark(marks, key, value),
    ),
    storedMarks: null,
  };
}

/** The extent of the link around `offset` in `block`, if any. */
export function linkExtent(
  block: OgeEditorBlock,
  offset: number,
): {
  readonly from: number;
  readonly to: number;
  readonly link: OgeEditorLink;
} | null {
  const spans: { from: number; to: number; inline: OgeEditorInline }[] = [];
  let pos = 0;
  for (const inline of block.inlines) {
    const length = inlineLength(inline);
    spans.push({ from: pos, to: pos + length, inline });
    pos += length;
  }
  let index = spans.findIndex(
    (s) => s.inline.marks.link && s.from < offset && offset <= s.to,
  );
  if (index === -1) {
    index = spans.findIndex(
      (s) => s.inline.marks.link && s.from <= offset && offset < s.to,
    );
  }
  if (index === -1) return null;
  const link = spans[index].inline.marks.link as OgeEditorLink;
  const same = (i: number) => {
    const l = spans[i]?.inline.marks.link;
    return (
      !!l &&
      l.href === link.href &&
      l.title === link.title &&
      l.target === link.target
    );
  };
  let first = index;
  let last = index;
  while (first > 0 && same(first - 1)) first--;
  while (last < spans.length - 1 && same(last + 1)) last++;
  return { from: spans[first].from, to: spans[last].to, link };
}

/**
 * Sets the link on the selection. At a caret inside a link it rewrites that
 * link; at a bare caret it inserts `text` (default: the URL) as a new link.
 * `null` removes the link under the selection or around the caret.
 */
export function setLink(
  state: OgeEditorState,
  link: OgeEditorLink | null,
  text?: string,
): OgeEditorState | null {
  const apply = (marks: OgeEditorMarks): OgeEditorMarks => {
    if (link) return { ...marks, link };
    return marksWithoutLink(marks);
  };
  if (!selectionIsCollapsed(state.selection)) {
    const { start, end } = selectionRange(state.selection);
    return {
      ...state,
      doc: mapMarksInRange(state.doc, start, end, apply),
      storedMarks: null,
    };
  }
  const point = state.selection.focus;
  const block = state.doc.blocks[point.block];
  const extent = block.type === 'rule' ? null : linkExtent(block, point.offset);
  if (extent) {
    const doc = mapMarksInRange(
      state.doc,
      at(point.block, extent.from),
      at(point.block, extent.to),
      apply,
    );
    if (
      link &&
      text &&
      text !== blockText(block).slice(extent.from, extent.to)
    ) {
      const replaced = deleteRange(
        doc,
        at(point.block, extent.from),
        at(point.block, extent.to),
      );
      const marks = {
        ...marksWithoutLink(marksAt(doc.blocks[point.block], extent.from + 1)),
        link,
      };
      return insertInlines(caretState(state, replaced.doc, replaced.point), [
        { kind: 'text', text, marks },
      ]);
    }
    return { ...state, doc, storedMarks: null };
  }
  if (!link) return null;
  const marks = { ...marksWithoutLink(caretMarks(state)), link };
  return insertInlines(state, [
    { kind: 'text', text: text || link.href, marks },
  ]);
}

/** Removes every inline mark (links stay) and the block alignment. */
export function clearFormatting(state: OgeEditorState): OgeEditorState {
  const clear = (marks: OgeEditorMarks): OgeEditorMarks =>
    marks.link ? { link: marks.link } : ogeEditorNoMarks();
  const { start, end } = selectionRange(state.selection);
  let doc = selectionIsCollapsed(state.selection)
    ? state.doc
    : mapMarksInRange(state.doc, start, end, clear);
  for (let b = start.block; b <= end.block; b++) {
    const block = doc.blocks[b];
    if (block.align) {
      const rest = omitKeys(block, 'align');
      doc = replaceBlock(doc, b, rest);
    }
  }
  return {
    ...state,
    doc,
    storedMarks: selectionIsCollapsed(state.selection)
      ? clear(caretMarks(state))
      : null,
  };
}

// --- blocks -----------------------------------------------------------------

function mapBlocksInSelection(
  state: OgeEditorState,
  fn: (block: OgeEditorBlock) => OgeEditorBlock,
): OgeEditorState {
  const { start, end } = selectionRange(state.selection);
  let doc = state.doc;
  for (let b = start.block; b <= end.block; b++) {
    const block = doc.blocks[b];
    if (block.type === 'rule') continue;
    doc = replaceBlock(doc, b, fn(block));
  }
  if (doc === state.doc) return state;
  // a format change can shorten a block (code blocks drop images)
  return {
    ...state,
    doc,
    selection: {
      anchor: clampPoint(doc, state.selection.anchor),
      focus: clampPoint(doc, state.selection.focus),
    },
  };
}

function textBlocksInSelection(state: OgeEditorState): OgeEditorBlock[] {
  const { start, end } = selectionRange(state.selection);
  return state.doc.blocks
    .slice(start.block, end.block + 1)
    .filter((block) => block.type !== 'rule');
}

/**
 * Sets the block format of every block in the selection. With `toggle`, a
 * selection already in that format returns to paragraphs (the quote and
 * code-block buttons).
 */
export function setBlockFormat(
  state: OgeEditorState,
  format: OgeEditorBlockFormat,
  level: OgeEditorHeadingLevel = 1,
  toggle = false,
): OgeEditorState {
  const blocks = textBlocksInSelection(state);
  const already =
    blocks.length > 0 &&
    blocks.every(
      (block) =>
        block.type === format &&
        (format !== 'heading' || block.level === level),
    );
  const target: OgeEditorBlockFormat =
    toggle && already && format !== 'paragraph' ? 'paragraph' : format;
  return mapBlocksInSelection(state, (block) => {
    const rest = omitKeys(block, 'level', 'list');
    const base: OgeEditorBlock = { ...rest, type: target, indent: 0 };
    if (target === 'heading') return { ...base, level };
    if (target === 'codeBlock') {
      return {
        ...base,
        align: undefined,
        inlines: plainInlines(block.inlines),
      };
    }
    return base;
  });
}

/** Toggles a bulleted or numbered list on the selected blocks. */
export function toggleList(
  state: OgeEditorState,
  kind: OgeEditorListKind,
): OgeEditorState {
  const blocks = textBlocksInSelection(state);
  const already =
    blocks.length > 0 &&
    blocks.every((block) => block.type === 'listItem' && block.list === kind);
  return mapBlocksInSelection(state, (block) => {
    if (already) return asParagraph(block);
    const rest = omitKeys(block, 'level');
    return {
      ...rest,
      type: 'listItem',
      list: kind,
      indent: block.type === 'listItem' ? block.indent : 0,
      inlines:
        block.type === 'codeBlock'
          ? plainInlines(block.inlines)
          : block.inlines,
    };
  });
}

/** `true` when Tab / the indent button would change something. */
export function canIndent(state: OgeEditorState): boolean {
  return textBlocksInSelection(state).some(
    (block) =>
      block.type === 'listItem' && block.indent < OGE_EDITOR_MAX_INDENT,
  );
}

/** `true` when Shift+Tab / the outdent button would change something. */
export function canOutdent(state: OgeEditorState): boolean {
  return textBlocksInSelection(state).some(
    (block) => block.type === 'listItem',
  );
}

/** Nests the selected list items one level deeper. */
export function indentList(state: OgeEditorState): OgeEditorState | null {
  if (!canIndent(state)) return null;
  return mapBlocksInSelection(state, (block) =>
    block.type === 'listItem' && block.indent < OGE_EDITOR_MAX_INDENT
      ? { ...block, indent: block.indent + 1 }
      : block,
  );
}

/** Lifts the selected list items one level; top-level items become paragraphs. */
export function outdentList(state: OgeEditorState): OgeEditorState | null {
  if (!canOutdent(state)) return null;
  return mapBlocksInSelection(state, (block) => {
    if (block.type !== 'listItem') return block;
    return block.indent > 0
      ? { ...block, indent: block.indent - 1 }
      : asParagraph(block);
  });
}

/** Aligns the selected blocks; `'start'` is the default and is stored as nothing. */
export function setAlign(
  state: OgeEditorState,
  align: OgeEditorAlign,
): OgeEditorState {
  return mapBlocksInSelection(state, (block) => {
    if (block.type === 'codeBlock') return block;
    if (align === 'start') {
      if (!block.align) return block;
      const rest = omitKeys(block, 'align');
      return rest;
    }
    return block.align === align ? block : { ...block, align };
  });
}

/** Sets (or with `null` removes) the `dir` of the selected blocks. */
export function setDirection(
  state: OgeEditorState,
  dir: OgeEditorDirection | null,
): OgeEditorState {
  return mapBlocksInSelection(state, (block) => {
    if (dir === null) {
      if (!block.dir) return block;
      const rest = omitKeys(block, 'dir');
      return rest;
    }
    return block.dir === dir ? block : { ...block, dir };
  });
}

/** Selects the whole document. */
export function selectAll(state: OgeEditorState): OgeEditorState {
  const last = state.doc.blocks.length - 1;
  return {
    ...state,
    selection: {
      anchor: at(0, 0),
      focus: at(last, blockLength(state.doc.blocks[last])),
    },
    storedMarks: null,
  };
}

/** The selected content as its own document (copy / cut). */
export function selectedFragment(state: OgeEditorState): OgeEditorDoc | null {
  if (selectionIsCollapsed(state.selection)) return null;
  const { start, end } = selectionRange(state.selection);
  const blocks: OgeEditorBlock[] = [];
  for (let b = start.block; b <= end.block; b++) {
    const block = state.doc.blocks[b];
    if (block.type === 'rule') {
      blocks.push(block);
      continue;
    }
    const from = b === start.block ? start.offset : 0;
    const to = b === end.block ? end.offset : blockLength(block);
    blocks.push({
      ...block,
      inlines: normalizeInlines(sliceInlines(block.inlines, from, to)),
    });
  }
  return ensureDoc(blocks);
}
