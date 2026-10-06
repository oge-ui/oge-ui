/**
 * What the selection currently "is" — the answers toolbar buttons render
 * (`aria-pressed`, the block-format label, the colour swatches) and the
 * counters a form shows. Pure functions of the editor state (W8e).
 */
import { graphemeCount } from '../input/grapheme';
import { ogeEditorFromHtml, type OgeEditorParseOptions } from './editor-html';
import {
  canIndent,
  canOutdent,
  caretMarks,
  hasMark,
  linkExtent,
  type OgeEditorState,
} from './editor-commands';
import {
  blockLength,
  docText,
  selectionIsCollapsed,
  selectionRange,
  sliceInlines,
  type OgeEditorAlign,
  type OgeEditorBlock,
  type OgeEditorDirection,
  type OgeEditorDoc,
  type OgeEditorHeadingLevel,
  type OgeEditorLink,
  type OgeEditorListKind,
  type OgeEditorMarkName,
  type OgeEditorMarks,
} from './editor-model';

/** The block format a toolbar shows: a heading carries its level. */
export type OgeEditorBlockFormatValue =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'blockquote'
  | 'codeBlock'
  | 'listItem'
  | 'mixed';

/** Everything a toolbar or a status line needs to know about the selection. */
export interface OgeEditorActiveState {
  /** Each toggle mark: on when every selected character (or the caret) carries it. */
  readonly marks: Readonly<Record<OgeEditorMarkName, boolean>>;
  /** Block format of the selected blocks; `'mixed'` when they differ. */
  readonly blockFormat: OgeEditorBlockFormatValue;
  /** List kind when every selected block is a list item of one kind. */
  readonly list: OgeEditorListKind | null;
  /** Alignment when every selected block shares it (`'start'` = default). */
  readonly align: OgeEditorAlign | null;
  /** Explicit `dir` of the selected blocks, when they share one. */
  readonly dir: OgeEditorDirection | null;
  /** The link under the caret or covering the whole selection. */
  readonly link: OgeEditorLink | null;
  /** Text colour of the selection when uniform. */
  readonly color: string | null;
  /** Highlight colour of the selection when uniform. */
  readonly background: string | null;
  readonly canIndent: boolean;
  readonly canOutdent: boolean;
  /** `true` when nothing is selected. */
  readonly collapsed: boolean;
}

const MARK_NAMES: readonly OgeEditorMarkName[] = [
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'subscript',
  'superscript',
];

function blockFormatOf(block: OgeEditorBlock): OgeEditorBlockFormatValue {
  if (block.type === 'heading') {
    return `heading${(block.level ?? 1) as OgeEditorHeadingLevel}` as OgeEditorBlockFormatValue;
  }
  if (block.type === 'rule') return 'paragraph';
  return block.type;
}

function uniform<T>(values: readonly T[]): T | null {
  if (values.length === 0) return null;
  const first = values[0];
  return values.every((v) => v === first) ? first : null;
}

/** The marks of every text run inside the selection (the caret's marks when collapsed). */
function selectedMarks(state: OgeEditorState): OgeEditorMarks[] {
  if (selectionIsCollapsed(state.selection)) return [caretMarks(state)];
  const { start, end } = selectionRange(state.selection);
  const out: OgeEditorMarks[] = [];
  for (let b = start.block; b <= end.block; b++) {
    const block = state.doc.blocks[b];
    if (block.type === 'rule' || block.type === 'codeBlock') continue;
    const from = b === start.block ? start.offset : 0;
    const to = b === end.block ? end.offset : blockLength(block);
    for (const inline of sliceInlines(block.inlines, from, to)) {
      if (inline.kind === 'text' && inline.text.trim() !== '')
        out.push(inline.marks);
    }
  }
  return out;
}

/** The active state of the selection. */
export function ogeEditorActiveState(
  state: OgeEditorState,
): OgeEditorActiveState {
  const { start, end } = selectionRange(state.selection);
  const blocks = state.doc.blocks
    .slice(start.block, end.block + 1)
    .filter((block) => block.type !== 'rule');
  const marks = selectedMarks(state);
  const markState = {} as Record<OgeEditorMarkName, boolean>;
  for (const name of MARK_NAMES) {
    markState[name] = marks.length > 0 && marks.every((m) => hasMark(m, name));
  }
  const formats = blocks.map(blockFormatOf);
  const blockFormat =
    uniform(formats) ?? (formats.length ? 'mixed' : 'paragraph');
  const lists = blocks.map((b) =>
    b.type === 'listItem' ? (b.list ?? 'bullet') : null,
  );
  const list =
    lists.length > 0 && lists.every((l) => l !== null) ? uniform(lists) : null;
  const align = uniform(blocks.map((b) => b.align ?? 'start'));
  const dir = uniform(blocks.map((b) => b.dir ?? null));
  let link: OgeEditorLink | null = null;
  if (selectionIsCollapsed(state.selection)) {
    const block = state.doc.blocks[start.block];
    if (block && block.type !== 'rule') {
      link = linkExtent(block, start.offset)?.link ?? null;
    }
  } else {
    const links = marks.map((m) => m.link ?? null);
    const first = links[0] ?? null;
    link = first && links.every((l) => l?.href === first.href) ? first : null;
  }
  return {
    marks: markState,
    blockFormat:
      blockFormat === 'listItem' && list === null ? 'mixed' : blockFormat,
    list,
    align,
    dir,
    link,
    color: uniform(marks.map((m) => m.color ?? null)),
    background: uniform(marks.map((m) => m.background ?? null)),
    canIndent: canIndent(state),
    canOutdent: canOutdent(state),
    collapsed: selectionIsCollapsed(state.selection),
  };
}

/** Characters (grapheme clusters) of the document's text, line breaks excluded. */
export function ogeEditorCharacterCount(doc: OgeEditorDoc): number {
  return graphemeCount(docText(doc).replace(/\n/g, ''));
}

let words: Intl.Segmenter | null | undefined;

/** Words of the document's text (`Intl.Segmenter` where available). */
export function ogeEditorWordCount(doc: OgeEditorDoc, locale?: string): number {
  const text = docText(doc);
  if (text.trim() === '') return 0;
  if (words === undefined || locale !== undefined) {
    const segmenter =
      typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter(locale, { granularity: 'word' })
        : null;
    if (locale !== undefined) {
      if (!segmenter) return text.trim().split(/\s+/).length;
      let count = 0;
      for (const segment of segmenter.segment(text))
        if (segment.isWordLike) count++;
      return count;
    }
    words = segmenter;
  }
  if (!words) return text.trim().split(/\s+/).length;
  let count = 0;
  for (const segment of words.segment(text)) if (segment.isWordLike) count++;
  return count;
}

/**
 * Characters of an HTML value — the measure `maxLength` applies to, for a
 * validator that only has the form value.
 */
export function ogeEditorHtmlLength(
  html: string | null | undefined,
  options: OgeEditorParseOptions = {},
): number {
  return ogeEditorCharacterCount(ogeEditorFromHtml(html, options));
}
