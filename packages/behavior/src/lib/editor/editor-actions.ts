/**
 * The rich-text editor's public command vocabulary, the keyboard map and
 * the markdown input rules (W8e) — all pure, so both render layers and the
 * specs agree on what every key and every toolbar button does.
 */
import {
  insertBreak,
  insertImage,
  insertRule,
  insertText,
  setAlign,
  setBlockFormat,
  setColor,
  setDirection,
  setLink,
  splitBlock,
  toggleList,
  toggleMark,
  clearFormatting,
  indentList,
  outdentList,
  selectAll,
  type OgeEditorBlockFormat,
  type OgeEditorState,
} from './editor-commands';
import {
  blockText,
  ogeEditorCaret,
  ogeEditorParagraph,
  replaceBlock,
  selectionIsCollapsed,
  type OgeEditorAlign,
  type OgeEditorDirection,
  type OgeEditorHeadingLevel,
  type OgeEditorInline,
  type OgeEditorListKind,
  type OgeEditorMarkName,
} from './editor-model';

/** One editor command — what `exec()` takes and the toolbar issues. */
export type OgeEditorCommand =
  | { readonly type: 'toggleMark'; readonly mark: OgeEditorMarkName }
  | {
      readonly type: 'blockFormat';
      readonly format: OgeEditorBlockFormat;
      readonly level?: OgeEditorHeadingLevel;
      /** Return to a paragraph when the selection already has this format. */
      readonly toggle?: boolean;
    }
  | { readonly type: 'list'; readonly list: OgeEditorListKind }
  | { readonly type: 'indent' }
  | { readonly type: 'outdent' }
  | { readonly type: 'align'; readonly align: OgeEditorAlign }
  | { readonly type: 'direction'; readonly dir: OgeEditorDirection | null }
  | { readonly type: 'color'; readonly color: string | null }
  | { readonly type: 'background'; readonly color: string | null }
  | {
      readonly type: 'link';
      /** `null` removes the link under the selection. */
      readonly href: string | null;
      readonly title?: string;
      readonly newTab?: boolean;
      /** Text inserted when the selection is empty (default: the address). */
      readonly text?: string;
    }
  | {
      readonly type: 'image';
      readonly src: string;
      readonly alt?: string;
      readonly width?: number;
      readonly height?: number;
    }
  | { readonly type: 'horizontalRule' }
  | { readonly type: 'clearFormatting' }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  | { readonly type: 'selectAll' }
  | { readonly type: 'insertText'; readonly text: string }
  | { readonly type: 'insertHtml'; readonly html: string }
  | { readonly type: 'splitBlock' }
  | { readonly type: 'lineBreak' };

/** Parameterless commands by name — `exec('bold')`. */
export type OgeEditorCommandName =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'subscript'
  | 'superscript'
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'blockquote'
  | 'codeBlock'
  | 'bulletList'
  | 'orderedList'
  | 'indent'
  | 'outdent'
  | 'alignStart'
  | 'alignCenter'
  | 'alignEnd'
  | 'alignJustify'
  | 'horizontalRule'
  | 'clearFormatting'
  | 'unlink'
  | 'undo'
  | 'redo'
  | 'selectAll';

/** Expands a command name into its command object. */
export function ogeEditorCommandFromName(
  name: OgeEditorCommandName,
): OgeEditorCommand {
  switch (name) {
    case 'bold':
    case 'italic':
    case 'underline':
    case 'strike':
    case 'code':
    case 'subscript':
    case 'superscript':
      return { type: 'toggleMark', mark: name };
    case 'paragraph':
      return { type: 'blockFormat', format: 'paragraph' };
    case 'heading1':
    case 'heading2':
    case 'heading3':
    case 'heading4':
    case 'heading5':
    case 'heading6':
      return {
        type: 'blockFormat',
        format: 'heading',
        level: Number(name.slice(-1)) as OgeEditorHeadingLevel,
      };
    case 'blockquote':
    case 'codeBlock':
      return { type: 'blockFormat', format: name, toggle: true };
    case 'bulletList':
      return { type: 'list', list: 'bullet' };
    case 'orderedList':
      return { type: 'list', list: 'ordered' };
    case 'alignStart':
      return { type: 'align', align: 'start' };
    case 'alignCenter':
      return { type: 'align', align: 'center' };
    case 'alignEnd':
      return { type: 'align', align: 'end' };
    case 'alignJustify':
      return { type: 'align', align: 'justify' };
    case 'unlink':
      return { type: 'link', href: null };
    default:
      return { type: name };
  }
}

/** Options the pure dispatcher needs from the host. */
export interface OgeEditorApplyOptions {
  /** Turns an untrusted `href` into a safe one, or `null` to refuse it. */
  readonly safeHref: (href: string) => string | null;
  /** Turns an untrusted image `src` into a safe one, or `null` to refuse it. */
  readonly safeImageSrc: (src: string) => string | null;
  /** Validates a colour value; `null` refuses it. */
  readonly safeColor: (color: string) => string | null;
}

/**
 * Applies a document command to a state. Returns `null` when the command
 * does not apply; `undo`, `redo` and `insertHtml` need the host (history,
 * parser) and also return `null` here.
 */
export function ogeEditorApply(
  state: OgeEditorState,
  command: OgeEditorCommand,
  options: OgeEditorApplyOptions,
): OgeEditorState | null {
  switch (command.type) {
    case 'toggleMark':
      return toggleMark(state, command.mark);
    case 'blockFormat':
      return setBlockFormat(
        state,
        command.format,
        command.level ?? 1,
        command.toggle ?? false,
      );
    case 'list':
      return toggleList(state, command.list);
    case 'indent':
      return indentList(state);
    case 'outdent':
      return outdentList(state);
    case 'align':
      return setAlign(state, command.align);
    case 'direction':
      return setDirection(state, command.dir);
    case 'color':
    case 'background': {
      const value =
        command.color === null ? null : options.safeColor(command.color);
      if (command.color !== null && value === null) return null;
      return setColor(
        state,
        command.type === 'color' ? 'color' : 'background',
        value,
      );
    }
    case 'link': {
      if (command.href === null) return setLink(state, null);
      const href = options.safeHref(command.href);
      if (href === null) return null;
      return setLink(
        state,
        {
          href,
          ...(command.title ? { title: command.title } : {}),
          ...(command.newTab ? { target: '_blank' as const } : {}),
        },
        command.text,
      );
    }
    case 'image': {
      const src = options.safeImageSrc(command.src);
      if (src === null) return null;
      return insertImage(state, {
        src,
        alt: command.alt ?? '',
        width: command.width,
        height: command.height,
      });
    }
    case 'horizontalRule':
      return insertRule(state);
    case 'clearFormatting':
      return clearFormatting(state);
    case 'selectAll':
      return selectAll(state);
    case 'insertText':
      return insertText(state, command.text);
    case 'splitBlock':
      return splitBlock(state);
    case 'lineBreak':
      return insertBreak(state);
    default:
      return null;
  }
}

// --- keyboard ------------------------------------------------------------------

/** The fields of a keydown the map reads — React's synthetic event fits. */
export interface OgeEditorKeyInput {
  readonly key: string;
  readonly code?: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly isComposing?: boolean;
}

/** What a key does, beyond the document commands. */
export type OgeEditorKeyAction =
  | { readonly type: 'command'; readonly command: OgeEditorCommand }
  | { readonly type: 'linkDialog' };

/** Context for the key map. */
export interface OgeEditorKeyContext {
  /** Apple platform: ⌘ is the modifier. */
  readonly mac: boolean;
  /** The selection is inside a list (Tab indents instead of leaving). */
  readonly inList: boolean;
}

const command = (c: OgeEditorCommand): OgeEditorKeyAction => ({
  type: 'command',
  command: c,
});

/**
 * The editor's keyboard shortcuts. Returns `null` for keys the browser should
 * handle (caret movement, Tab outside a list — the editor never traps focus).
 *
 * | Keys | Action |
 * | --- | --- |
 * | Mod+B / I / U | bold / italic / underline |
 * | Mod+Shift+X | strikethrough |
 * | Mod+E | inline code |
 * | Mod+, / Mod+. | subscript / superscript |
 * | Mod+K | link dialog |
 * | Mod+Z, Mod+Y / Mod+Shift+Z | undo, redo |
 * | Mod+Alt+0…6 | paragraph, heading 1–6 |
 * | Mod+Shift+7 / 8 | numbered / bulleted list |
 * | Mod+Shift+9 | quote |
 * | Mod+Shift+L / E / R / J | align start / center / end / justify |
 * | Mod+\ | clear formatting |
 * | Tab / Shift+Tab (in a list), Mod+] / Mod+[ | indent / outdent |
 * | Enter, Shift+Enter | new block, line break |
 */
export function ogeEditorKeyAction(
  event: OgeEditorKeyInput,
  context: OgeEditorKeyContext,
): OgeEditorKeyAction | null {
  if (event.isComposing) return null;
  const mod = context.mac ? event.metaKey : event.ctrlKey;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const code = event.code ?? '';
  if (key === 'Enter' && !mod && !event.altKey) {
    return command(
      event.shiftKey ? { type: 'lineBreak' } : { type: 'splitBlock' },
    );
  }
  if (key === 'Tab' && !mod && !event.altKey && context.inList) {
    return command(event.shiftKey ? { type: 'outdent' } : { type: 'indent' });
  }
  if (!mod) return null;
  // the digit row by physical key, so Shift+7 works on every layout
  const digit =
    /^Digit([0-9])$/.exec(code)?.[1] ?? (/^[0-9]$/.test(key) ? key : null);
  if (event.altKey && !event.shiftKey && digit !== null) {
    const level = Number(digit);
    if (level === 0)
      return command({ type: 'blockFormat', format: 'paragraph' });
    if (level <= 6) {
      return command({
        type: 'blockFormat',
        format: 'heading',
        level: level as OgeEditorHeadingLevel,
      });
    }
    return null;
  }
  if (event.altKey) return null;
  if (event.shiftKey) {
    if (digit === '7') return command({ type: 'list', list: 'ordered' });
    if (digit === '8') return command({ type: 'list', list: 'bullet' });
    if (digit === '9') {
      return command({
        type: 'blockFormat',
        format: 'blockquote',
        toggle: true,
      });
    }
    switch (key) {
      case 'x':
        return command({ type: 'toggleMark', mark: 'strike' });
      case 'z':
        return command({ type: 'redo' });
      case 'l':
        return command({ type: 'align', align: 'start' });
      case 'e':
        return command({ type: 'align', align: 'center' });
      case 'r':
        return command({ type: 'align', align: 'end' });
      case 'j':
        return command({ type: 'align', align: 'justify' });
      default:
        return null;
    }
  }
  switch (key) {
    case 'b':
      return command({ type: 'toggleMark', mark: 'bold' });
    case 'i':
      return command({ type: 'toggleMark', mark: 'italic' });
    case 'u':
      return command({ type: 'toggleMark', mark: 'underline' });
    case 'e':
      return command({ type: 'toggleMark', mark: 'code' });
    case ',':
      return command({ type: 'toggleMark', mark: 'subscript' });
    case '.':
      return command({ type: 'toggleMark', mark: 'superscript' });
    case 'k':
      return { type: 'linkDialog' };
    case 'z':
      return command({ type: 'undo' });
    case 'y':
      return command({ type: 'redo' });
    case ']':
      return command({ type: 'indent' });
    case '[':
      return command({ type: 'outdent' });
    case '\\':
      return command({ type: 'clearFormatting' });
    default:
      return null;
  }
}

// --- markdown input rules ------------------------------------------------------

/**
 * After a space is typed: a paragraph that so far reads `#`…`######`, `-`,
 * `*`, `+`, `1.`, `1)`, `>` or ```` ``` ```` becomes a heading, a list, a
 * quote or a code block, and the marker is removed. Returns `null` when no
 * rule matches. The caller records the state *with* the typed space first,
 * so one undo brings the literal characters back (every reference editor).
 */
export function ogeEditorMarkdownOnSpace(
  state: OgeEditorState,
): OgeEditorState | null {
  if (!selectionIsCollapsed(state.selection)) return null;
  const point = state.selection.focus;
  const block = state.doc.blocks[point.block];
  if (block.type !== 'paragraph') return null;
  const before = blockText(block).slice(0, point.offset);
  if (!before.endsWith(' ')) return null;
  const marker = before.slice(0, -1);
  if (/[\n￼]/.test(marker)) return null;
  let next: OgeEditorState | null = null;
  const stripped = (): OgeEditorState => {
    const inlines = block.inlines;
    // remove the marker + space from the start of the block
    let remaining = point.offset;
    const kept: OgeEditorInline[] = [];
    for (const inline of inlines) {
      if (remaining > 0 && inline.kind === 'text') {
        const cut = Math.min(remaining, inline.text.length);
        remaining -= cut;
        if (cut < inline.text.length)
          kept.push({ ...inline, text: inline.text.slice(cut) });
        continue;
      }
      kept.push(inline);
    }
    const doc = replaceBlock(state.doc, point.block, {
      ...block,
      inlines: kept,
    });
    return {
      doc,
      selection: ogeEditorCaret({ block: point.block, offset: 0 }),
      storedMarks: null,
    };
  };
  const heading = /^(#{1,6})$/.exec(marker);
  if (heading) {
    next = setBlockFormat(
      stripped(),
      'heading',
      heading[1].length as OgeEditorHeadingLevel,
    );
  } else if (/^[-*+]$/.test(marker)) {
    next = toggleList(stripped(), 'bullet');
  } else if (/^\d{1,3}[.)]$/.test(marker)) {
    next = toggleList(stripped(), 'ordered');
  } else if (marker === '>') {
    next = setBlockFormat(stripped(), 'blockquote');
  } else if (marker === '```') {
    next = setBlockFormat(stripped(), 'codeBlock');
  }
  return next;
}

/** On Enter: a paragraph reading exactly `---` (or `***`) becomes a horizontal rule. */
export function ogeEditorMarkdownOnEnter(
  state: OgeEditorState,
): OgeEditorState | null {
  if (!selectionIsCollapsed(state.selection)) return null;
  const point = state.selection.focus;
  const block = state.doc.blocks[point.block];
  if (block.type !== 'paragraph') return null;
  const text = blockText(block);
  if ((text !== '---' && text !== '***') || point.offset !== text.length)
    return null;
  const blocks = state.doc.blocks.slice();
  blocks.splice(
    point.block,
    1,
    { type: 'rule', indent: 0, inlines: [] },
    ogeEditorParagraph(),
  );
  return {
    doc: { blocks },
    selection: ogeEditorCaret({ block: point.block + 1, offset: 0 }),
    storedMarks: null,
  };
}
