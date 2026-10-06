/**
 * `OgeEditorCore` — the rich-text editor machine both render layers run
 * (W8e, ADR 0001). It owns the document model, the selection, the undo
 * history and the contenteditable element's event handling; the Angular
 * component and the React component only draw the chrome around it (label,
 * toolbar, popups, counter) and wire its value into their forms story.
 *
 * Every user edit is intercepted at `beforeinput` / `keydown` / `paste` and
 * turned into a model command; the DOM is then re-rendered from the model
 * and the caret restored. The browser never edits the document itself
 * except during an IME composition, which cannot be cancelled — those edits
 * are read back from the DOM when the composition ends, and an `input` that
 * slipped past every handler triggers a full read-back, so the model and the
 * screen cannot drift apart.
 */
import { getOgeLiveAnnouncer } from '../a11y/live-announcer';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  ogeEditorApply,
  ogeEditorKeyAction,
  ogeEditorMarkdownOnEnter,
  ogeEditorMarkdownOnSpace,
  type OgeEditorCommand,
} from './editor-actions';
import {
  deleteBackward,
  deleteForward,
  deleteRange,
  deleteSelection,
  insertFragment,
  insertText,
  ogeEditorState,
  selectedFragment,
  type OgeEditorDeleteUnit,
  type OgeEditorState,
} from './editor-commands';
import type { OgeEditorConfig } from './editor-config';
import { ogeFormatMessage } from '@oge-ui/core';
import {
  blockElements,
  ogeEditorBlockElement,
  ogeEditorPointFromDom,
  ogeEditorReadSelection,
  ogeEditorWriteSelection,
  renderOgeEditorDom,
} from './editor-dom';
import { OgeEditorHistory, type OgeEditorChangeKind } from './editor-history';
import {
  ogeEditorFromHtml,
  ogeEditorFromText,
  ogeEditorReadDom,
  ogeEditorSafeColor,
  ogeEditorSafeHref,
  ogeEditorSafeImageSrc,
  ogeEditorToHtml,
  type OgeEditorUrlOptions,
} from './editor-html';
import {
  blockLength,
  docIsEmpty,
  docText,
  ensureDoc,
  normalizeInlines,
  ogeEditorCaret,
  replaceBlock,
  selectionIsCollapsed,
  selectionRange,
  type OgeEditorBlock,
  type OgeEditorDoc,
  type OgeEditorInline,
  type OgeEditorSelection,
} from './editor-model';
import {
  ogeEditorActiveState,
  ogeEditorCharacterCount,
  ogeEditorWordCount,
  type OgeEditorActiveState,
} from './editor-queries';
import { ogeEditorBlockFormatLabel, ogeEditorIsMac } from './editor-toolbar';
import { graphemeCount } from '../input/grapheme';

/** Options the core re-reads on every use (inputs / props may change). */
export interface OgeEditorCoreOptions {
  readonly config: OgeEditorConfig;
  readonly readOnly: boolean;
  readonly disabled: boolean;
  /** Most characters (grapheme clusters) the text may hold. */
  readonly maxLength: number | undefined;
}

/** The cancelable pre-paste event. `html` / `text` may be rewritten. */
export interface OgeEditorPastingEvent {
  html: string;
  text: string;
  cancel: boolean;
  /** The originating `paste` or `drop` event. */
  readonly event: Event;
}

/** What the core calls back into its render layer. */
export interface OgeEditorCoreHost {
  options(): OgeEditorCoreOptions;
  /** A user edit (or an `exec`) changed the value. */
  valueChanged(html: string, event: Event | undefined): void;
  /** Mod+K or the link tool: open the link dialog. */
  requestLink?(): void;
  /** A paste or drop is about to be inserted. */
  pasting?(event: OgeEditorPastingEvent): void;
  /** A command ran. */
  commandExecuted?(command: OgeEditorCommand, event: Event | undefined): void;
}

interface TargetRangeLike {
  readonly startContainer: Node;
  readonly startOffset: number;
  readonly endContainer: Node;
  readonly endOffset: number;
}

/** The editor machine. Construct once per editor; `attach` it to the editing element. */
export class OgeEditorCore {
  /** Document, selection and armed marks. */
  readonly state: OgeReactiveCell<OgeEditorState>;
  readonly canUndo: OgeReactiveCell<boolean>;
  readonly canRedo: OgeReactiveCell<boolean>;
  /** What the toolbar shows for the current selection. */
  readonly active: () => OgeEditorActiveState;
  /** The serialized value. */
  readonly html: () => string;
  readonly characterCount: () => number;
  readonly wordCount: () => number;
  /** `true` when the document is one empty paragraph. */
  readonly empty: () => boolean;
  /** Apple platform — ⌘ is the shortcut modifier. */
  readonly mac = ogeEditorIsMac();

  private readonly history: OgeEditorHistory;
  private root: HTMLElement | null = null;
  private listeners: (() => void)[] = [];
  private composing = false;
  private lastEmitted: string | null = null;
  private destroyed = false;
  private writingSelection = false;

  constructor(
    adapter: OgeReactivityAdapter,
    private readonly host: OgeEditorCoreHost,
  ) {
    this.state = adapter.cell(ogeEditorState(ensureDoc([])));
    this.canUndo = adapter.cell(false);
    this.canRedo = adapter.cell(false);
    this.history = new OgeEditorHistory({
      limit: host.options().config.historyLimit,
    });
    this.active = adapter.derived(() => ogeEditorActiveState(this.state()));
    this.html = adapter.derived(() =>
      ogeEditorToHtml(this.state().doc, this.urlOptions()),
    );
    this.characterCount = adapter.derived(() =>
      ogeEditorCharacterCount(this.state().doc),
    );
    this.wordCount = adapter.derived(() =>
      ogeEditorWordCount(this.state().doc, host.options().config.locale),
    );
    this.empty = adapter.derived(() => docIsEmpty(this.state().doc));
  }

  // --- value ------------------------------------------------------------------

  /**
   * Loads an external value (a form write, a bound `value`). A value equal
   * to the last one the editor emitted is its own echo and is ignored, so
   * the caret and the history survive two-way binding.
   *
   * `parser: 'portable'` reads the value with the editor's own parser even
   * where `DOMParser` exists — the React adapter loads its initial value that
   * way so the server render and the hydrating browser hold the same model.
   */
  setValue(
    html: string | null | undefined,
    options: { readonly parser?: 'auto' | 'portable' } = {},
  ): void {
    const value = html ?? '';
    if (value === this.lastEmitted) return;
    const current = this.html();
    this.lastEmitted = value;
    if (value === current) return;
    const doc = ogeEditorFromHtml(value, {
      ...this.urlOptions(),
      parser: options.parser,
    });
    this.state.set(ogeEditorState(doc));
    this.history.clear();
    this.syncHistoryCells();
    this.render(false);
  }

  /** The current value. */
  getHtml(): string {
    return this.html();
  }

  /** The document's plain text, blocks separated by newlines. */
  getText(): string {
    return docText(this.state().doc);
  }

  // --- lifetime -------------------------------------------------------------------

  /** Binds the machine to its contenteditable element and renders into it. */
  attach(root: HTMLElement): void {
    if (this.root === root) return;
    this.detach();
    this.root = root;
    this.destroyed = false;
    this.render(false);
    const on = <K extends keyof HTMLElementEventMap>(
      type: K,
      handler: (event: HTMLElementEventMap[K]) => void,
    ) => {
      const listener = handler.bind(this) as EventListener;
      root.addEventListener(type, listener);
      this.listeners.push(() => root.removeEventListener(type, listener));
    };
    on('beforeinput', this.onBeforeInput);
    on('input', this.onInput);
    on('keydown', this.onKeyDown);
    on('paste', this.onPaste);
    on('copy', (event) => this.onCopy(event, false));
    on('cut', (event) => this.onCopy(event, true));
    on('drop', this.onDrop);
    on('dragstart', this.onDragStart);
    on('compositionstart', this.onCompositionStart);
    on('compositionend', this.onCompositionEnd);
    on('focus', this.onFocus);
    const doc = root.ownerDocument;
    const selection = () => this.onSelectionChange();
    doc.addEventListener('selectionchange', selection);
    this.listeners.push(() =>
      doc.removeEventListener('selectionchange', selection),
    );
  }

  /**
   * Builds the current document into `root` without binding to it — the
   * server render of the editing surface (`createElement` on the element's
   * own document, never markup). A later {@link attach} on the browser's copy
   * of that element adopts every top-level element that matches the model.
   */
  renderTo(root: HTMLElement): void {
    renderOgeEditorDom(root, this.state().doc, this.urlOptions());
  }

  /** Removes every listener (the element stays as rendered). */
  detach(): void {
    for (const remove of this.listeners) remove();
    this.listeners = [];
    this.root = null;
  }

  /** StrictMode remount: re-attaches to the element it had. */
  revive(root?: HTMLElement): void {
    this.destroyed = false;
    const target = root ?? this.root;
    if (target) {
      this.root = null;
      this.attach(target);
    }
  }

  /** Tears the machine down. */
  destroy(): void {
    this.detach();
    this.destroyed = true;
  }

  // --- commands -------------------------------------------------------------------

  /**
   * Runs a command. Returns `true` when it changed something. `announce`
   * speaks the resulting format state (keyboard shortcuts and toolbar
   * buttons pass it; programmatic calls usually do not).
   */
  exec(command: OgeEditorCommand, event?: Event, announce = false): boolean {
    if (this.inert()) return false;
    switch (command.type) {
      case 'undo':
        return this.undo(event, announce);
      case 'redo':
        return this.redo(event, announce);
      case 'insertHtml':
        return this.insertFragmentChecked(
          ogeEditorFromHtml(command.html, {
            ...this.urlOptions(),
            source: 'paste',
          }),
          event,
          'paste',
        );
      case 'insertText':
        return this.insertTextChecked(command.text, event);
      default:
        break;
    }
    const before = this.state();
    const next = ogeEditorApply(before, command, {
      safeHref: (href) => ogeEditorSafeHref(href, this.urlOptions()),
      safeImageSrc: (src) => ogeEditorSafeImageSrc(src, this.urlOptions()),
      safeColor: (color) => ogeEditorSafeColor(color),
    });
    if (!next) return false;
    this.commit(next, kindOf(command), event);
    this.host.commandExecuted?.(command, event);
    if (announce) this.announceCommand(command);
    return true;
  }

  /** Steps back in the history. */
  undo(event?: Event, announce = false): boolean {
    const current = this.state();
    const entry = this.history.undo({
      doc: current.doc,
      selection: current.selection,
    });
    if (!entry) return false;
    this.restore(entry.doc, entry.selection, event);
    if (announce) this.announce(this.messages().announcements.undone);
    return true;
  }

  /** Steps forward in the history. */
  redo(event?: Event, announce = false): boolean {
    const current = this.state();
    const entry = this.history.redo({
      doc: current.doc,
      selection: current.selection,
    });
    if (!entry) return false;
    this.restore(entry.doc, entry.selection, event);
    if (announce) this.announce(this.messages().announcements.redone);
    return true;
  }

  /** Inserts sanitized HTML at the selection. */
  insertHtml(html: string): void {
    this.exec({ type: 'insertHtml', html });
  }

  /** Inserts plain text at the selection. */
  insertText(text: string): void {
    this.exec({ type: 'insertText', text });
  }

  /** Puts keyboard focus in the editing element and restores the caret. */
  focus(): void {
    const root = this.root;
    if (!root) return;
    if (root.ownerDocument.activeElement !== root) {
      try {
        root.focus({ preventScroll: true });
      } catch {
        root.focus();
      }
    }
    this.writeSelection();
  }

  /** Moves the caret to the end of the document. */
  moveToEnd(): void {
    const doc = this.state().doc;
    const last = doc.blocks.length - 1;
    this.state.set({
      ...this.state(),
      selection: ogeEditorCaret({
        block: last,
        offset: blockLength(doc.blocks[last]),
      }),
      storedMarks: null,
    });
    this.writeSelection();
  }

  /** Re-reads the DOM selection into the model (before a toolbar command). */
  syncSelectionFromDom(): void {
    const root = this.root;
    if (!root || this.writingSelection) return;
    const selection = root.ownerDocument.getSelection?.() ?? null;
    if (!selection || selection.rangeCount === 0) return;
    if (!root.contains(selection.anchorNode)) return;
    const read = ogeEditorReadSelection(root, this.state().doc, selection);
    if (!read) return;
    const current = this.state();
    if (sameSelection(read, current.selection)) return;
    this.history.breakRun();
    this.state.set({ ...current, selection: read, storedMarks: null });
  }

  // --- internals -------------------------------------------------------------------

  private options(): OgeEditorCoreOptions {
    return this.host.options();
  }

  private messages() {
    return this.options().config.messages;
  }

  private urlOptions(): OgeEditorUrlOptions {
    const config = this.options().config;
    return {
      allowedSchemes: config.allowedSchemes,
      allowDataImages: config.allowDataImages,
    };
  }

  private inert(): boolean {
    const options = this.options();
    return options.readOnly || options.disabled;
  }

  private announce(text: string): void {
    const root = this.root;
    getOgeLiveAnnouncer(root ? root.ownerDocument : undefined).announce(text);
  }

  private announceCommand(command: OgeEditorCommand): void {
    const messages = this.messages();
    const active = this.active();
    const say = (label: string, on: boolean) =>
      this.announce(
        ogeFormatMessage(
          on
            ? messages.announcements.formatOn
            : messages.announcements.formatOff,
          {
            format: label,
          },
        ),
      );
    switch (command.type) {
      case 'toggleMark':
        say(messages.tools[command.mark], active.marks[command.mark]);
        return;
      case 'list':
        say(
          messages.tools[
            command.list === 'bullet' ? 'bulletList' : 'orderedList'
          ],
          active.list === command.list,
        );
        return;
      case 'blockFormat':
        this.announce(
          ogeFormatMessage(messages.announcements.blockFormat, {
            format: ogeEditorBlockFormatLabel(active.blockFormat, messages),
          }),
        );
        return;
      case 'align': {
        const key =
          command.align === 'start'
            ? 'alignStart'
            : command.align === 'center'
              ? 'alignCenter'
              : command.align === 'end'
                ? 'alignEnd'
                : 'alignJustify';
        say(messages.tools[key], true);
        return;
      }
      case 'link':
        this.announce(
          command.href === null
            ? messages.announcements.linkRemoved
            : messages.announcements.linkInserted,
        );
        return;
      case 'image':
        this.announce(messages.announcements.imageInserted);
        return;
      case 'horizontalRule':
        this.announce(messages.announcements.ruleInserted);
        return;
      default:
        return;
    }
  }

  /** Applies a new state: history, render, caret, change notification. */
  private commit(
    next: OgeEditorState,
    kind: OgeEditorChangeKind,
    event: Event | undefined,
    typed = '',
  ): void {
    const previous = this.state();
    const changed = next.doc !== previous.doc;
    if (changed) {
      this.history.record(
        { doc: previous.doc, selection: previous.selection },
        kind,
        typed,
      );
      this.syncHistoryCells();
    }
    this.state.set(next);
    if (changed) {
      this.render(true);
      this.emit(event);
    } else {
      this.writeSelection();
    }
  }

  private restore(
    doc: OgeEditorDoc,
    selection: OgeEditorSelection,
    event?: Event,
  ): void {
    this.state.set({ doc, selection, storedMarks: null });
    this.syncHistoryCells();
    this.render(true);
    this.emit(event);
  }

  private emit(event: Event | undefined): void {
    const html = this.html();
    if (html === this.lastEmitted) return;
    this.lastEmitted = html;
    this.host.valueChanged(html, event);
  }

  private syncHistoryCells(): void {
    if (this.canUndo() !== this.history.canUndo)
      this.canUndo.set(this.history.canUndo);
    if (this.canRedo() !== this.history.canRedo)
      this.canRedo.set(this.history.canRedo);
  }

  private render(writeSelection: boolean): void {
    const root = this.root;
    if (!root || this.destroyed) return;
    renderOgeEditorDom(root, this.state().doc, this.urlOptions());
    if (writeSelection) this.writeSelection();
  }

  private writeSelection(): void {
    const root = this.root;
    if (!root) return;
    const doc = root.ownerDocument;
    const active = doc.activeElement;
    if (active !== root && !root.contains(active)) return;
    this.writingSelection = true;
    try {
      ogeEditorWriteSelection(
        root,
        this.state().selection,
        doc.getSelection?.() ?? null,
      );
    } finally {
      this.writingSelection = false;
    }
    this.scrollCaretIntoView();
  }

  private scrollCaretIntoView(): void {
    const root = this.root;
    if (!root || root.scrollHeight <= root.clientHeight) return;
    const selection = root.ownerDocument.getSelection?.();
    let rect: DOMRect | undefined;
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      rect = range.getClientRects?.()[0] ?? undefined;
    }
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      const block = ogeEditorBlockElement(
        root,
        this.state().selection.focus.block,
      );
      rect = block?.getBoundingClientRect();
    }
    if (!rect) return;
    const box = root.getBoundingClientRect();
    if (rect.bottom > box.bottom)
      root.scrollTop += rect.bottom - box.bottom + 4;
    else if (rect.top < box.top) root.scrollTop -= box.top - rect.top + 4;
  }

  /** How many more characters fit; `Infinity` without a limit. */
  private capacity(replacing: OgeEditorDoc | null): number {
    const max = this.options().maxLength;
    if (max === undefined || max === null || !(max >= 0))
      return Number.POSITIVE_INFINITY;
    const used = ogeEditorCharacterCount(this.state().doc);
    const freed = replacing ? ogeEditorCharacterCount(replacing) : 0;
    return Math.max(0, max - used + freed);
  }

  private insertTextChecked(text: string, event: Event | undefined): boolean {
    const state = this.state();
    const room = this.capacity(selectedFragment(state));
    let value = text;
    if (graphemeCount(value) > room) {
      value = truncateGraphemes(value, room);
      this.announce(this.messages().announcements.limitReached);
      if (value === '') return false;
    }
    let next = insertText(state, value);
    this.commit(next, value.length === 1 ? 'typing' : 'paste', event, value);
    if (value === ' ' && this.options().config.markdownShortcuts) {
      const transformed = ogeEditorMarkdownOnSpace(this.state());
      if (transformed) {
        next = transformed;
        this.commit(next, 'format', event);
      }
    }
    return true;
  }

  private insertFragmentChecked(
    fragment: OgeEditorDoc,
    event: Event | undefined,
    kind: OgeEditorChangeKind,
  ): boolean {
    const state = this.state();
    const room = this.capacity(selectedFragment(state));
    let content = fragment;
    if (ogeEditorCharacterCount(content) > room) {
      content = truncateDoc(content, room);
      this.announce(this.messages().announcements.limitReached);
      if (ogeEditorCharacterCount(content) === 0 && room === 0) return false;
    }
    const block = state.doc.blocks[selectionRange(state.selection).start.block];
    if (block?.type === 'codeBlock') {
      return this.insertTextChecked(docText(content), event);
    }
    this.commit(insertFragment(state, content), kind, event);
    return true;
  }

  // --- DOM events -----------------------------------------------------------------

  private onBeforeInput(event: InputEvent): void {
    const type = event.inputType;
    if (this.inert()) {
      event.preventDefault();
      return;
    }
    if (type === 'insertCompositionText' || this.composing) return;
    this.syncSelectionFromDom();
    const range = this.targetRange(event);
    switch (type) {
      case 'insertText':
      case 'insertReplacementText': {
        event.preventDefault();
        const text =
          event.data ?? event.dataTransfer?.getData('text/plain') ?? '';
        if (range) this.selectRange(range);
        this.insertTextChecked(text, event);
        return;
      }
      case 'insertParagraph':
        event.preventDefault();
        this.enter(event);
        return;
      case 'insertLineBreak':
        event.preventDefault();
        this.exec({ type: 'lineBreak' }, event);
        return;
      case 'deleteContentBackward':
      case 'deleteWordBackward':
      case 'deleteSoftLineBackward':
      case 'deleteHardLineBackward':
      case 'deleteContentForward':
      case 'deleteWordForward':
      case 'deleteSoftLineForward':
      case 'deleteHardLineForward':
      case 'deleteByCut':
      case 'deleteContent':
        event.preventDefault();
        this.delete(type, range, event);
        return;
      case 'historyUndo':
        event.preventDefault();
        this.undo(event, true);
        return;
      case 'historyRedo':
        event.preventDefault();
        this.redo(event, true);
        return;
      case 'formatBold':
        event.preventDefault();
        this.exec({ type: 'toggleMark', mark: 'bold' }, event, true);
        return;
      case 'formatItalic':
        event.preventDefault();
        this.exec({ type: 'toggleMark', mark: 'italic' }, event, true);
        return;
      case 'formatUnderline':
        event.preventDefault();
        this.exec({ type: 'toggleMark', mark: 'underline' }, event, true);
        return;
      default:
        // paste/drop arrive through their own events; anything else
        // (formatFontColor, insertOrderedList…) would bypass the model
        event.preventDefault();
    }
  }

  private enter(event: Event): void {
    const state = this.state();
    if (this.options().config.markdownShortcuts) {
      const rule = ogeEditorMarkdownOnEnter(state);
      if (rule) {
        this.commit(rule, 'structure', event);
        return;
      }
    }
    this.exec({ type: 'splitBlock' }, event);
  }

  private delete(
    type: string,
    range: TargetRangeLike | null,
    event: Event,
  ): void {
    const state = this.state();
    if (range && selectionIsCollapsed(state.selection)) {
      const doc = state.doc;
      const root = this.root;
      if (root) {
        const start = ogeEditorPointFromDom(
          root,
          doc,
          range.startContainer,
          range.startOffset,
        );
        const end = ogeEditorPointFromDom(
          root,
          doc,
          range.endContainer,
          range.endOffset,
        );
        // word / line deletions: the browser knows the boundary — trust it
        // when it stays inside one block (a block join is the model's call)
        if (
          start &&
          end &&
          start.block === end.block &&
          start.offset !== end.offset &&
          type !== 'deleteContentBackward' &&
          type !== 'deleteContentForward'
        ) {
          const result = deleteRange(doc, start, end);
          this.commit(
            {
              doc: result.doc,
              selection: ogeEditorCaret(result.point),
              storedMarks: null,
            },
            'deleting',
            event,
          );
          return;
        }
      }
    }
    const unit: OgeEditorDeleteUnit = type.includes('Word')
      ? 'word'
      : type.includes('Line')
        ? 'line'
        : 'character';
    const forward = type.includes('Forward');
    const next = forward
      ? deleteForward(state, unit)
      : deleteBackward(state, unit);
    if (next) this.commit(next, 'deleting', event);
  }

  private targetRange(event: InputEvent): TargetRangeLike | null {
    const ranges =
      typeof event.getTargetRanges === 'function'
        ? event.getTargetRanges()
        : [];
    return ranges.length > 0 ? ranges[0] : null;
  }

  private selectRange(range: TargetRangeLike): void {
    const root = this.root;
    if (!root) return;
    const doc = this.state().doc;
    const anchor = ogeEditorPointFromDom(
      root,
      doc,
      range.startContainer,
      range.startOffset,
    );
    const focus = ogeEditorPointFromDom(
      root,
      doc,
      range.endContainer,
      range.endOffset,
    );
    if (anchor && focus) {
      this.state.set({ ...this.state(), selection: { anchor, focus } });
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.isComposing || event.keyCode === 229) return;
    const state = this.state();
    const range = selectionRange(state.selection);
    const inList = state.doc.blocks
      .slice(range.start.block, range.end.block + 1)
      .some((block) => block.type === 'listItem');
    const action = ogeEditorKeyAction(event, { mac: this.mac, inList });
    if (!action) return;
    if (this.inert()) {
      // read-only still allows nothing but navigation and copying
      if (action.type === 'command' && action.command.type === 'selectAll')
        return;
      if (action.type === 'command' || action.type === 'linkDialog') {
        if (event.key !== 'Tab') event.preventDefault();
      }
      return;
    }
    event.preventDefault();
    this.syncSelectionFromDom();
    if (action.type === 'linkDialog') {
      this.host.requestLink?.();
      return;
    }
    const command = action.command;
    if (command.type === 'splitBlock') {
      this.enter(event);
      return;
    }
    this.exec(command, event, true);
  }

  private onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    if (this.inert()) return;
    const data = event.clipboardData;
    if (!data) return;
    this.syncSelectionFromDom();
    this.insertTransfer(
      data.getData('text/html'),
      data.getData('text/plain'),
      event,
    );
  }

  private insertTransfer(html: string, text: string, event: Event): void {
    const pasting: OgeEditorPastingEvent = { html, text, cancel: false, event };
    this.host.pasting?.(pasting);
    if (pasting.cancel) return;
    const config = this.options().config;
    const fragment =
      config.pasteMode === 'html' && pasting.html.trim() !== ''
        ? ogeEditorFromHtml(pasting.html, {
            ...this.urlOptions(),
            source: 'paste',
          })
        : ogeEditorFromText(pasting.text);
    if (this.insertFragmentChecked(fragment, event, 'paste')) {
      this.announce(this.messages().announcements.pasted);
    }
  }

  private onCopy(event: ClipboardEvent, cut: boolean): void {
    this.syncSelectionFromDom();
    const fragment = selectedFragment(this.state());
    const data = event.clipboardData;
    if (!fragment || !data) return;
    event.preventDefault();
    data.setData('text/html', ogeEditorToHtml(fragment, this.urlOptions()));
    data.setData('text/plain', docText(fragment));
    if (cut && !this.inert()) {
      this.commit(deleteSelection(this.state()), 'deleting', event);
    }
  }

  private onDrop(event: DragEvent): void {
    event.preventDefault();
    if (this.inert()) return;
    const data = event.dataTransfer;
    const root = this.root;
    if (!data || !root) return;
    const doc = root.ownerDocument as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offsetNode: Node; offset: number } | null;
    };
    let node: Node | null = null;
    let offset = 0;
    const position = doc.caretPositionFromPoint?.(event.clientX, event.clientY);
    if (position) {
      node = position.offsetNode;
      offset = position.offset;
    } else {
      const range = doc.caretRangeFromPoint?.(event.clientX, event.clientY);
      if (range) {
        node = range.startContainer;
        offset = range.startOffset;
      }
    }
    if (node) {
      const point = ogeEditorPointFromDom(root, this.state().doc, node, offset);
      if (point)
        this.state.set({ ...this.state(), selection: ogeEditorCaret(point) });
    }
    this.insertTransfer(
      data.getData('text/html'),
      data.getData('text/plain'),
      event,
    );
  }

  private onDragStart(event: DragEvent): void {
    // moving a selection by dragging would be a browser-side edit the model
    // cannot follow; cut and paste does the same, through the model
    event.preventDefault();
  }

  private onCompositionStart(): void {
    if (this.inert()) return;
    this.syncSelectionFromDom();
    const state = this.state();
    if (!selectionIsCollapsed(state.selection)) {
      // let the IME type into a caret, not over a (multi-block) range
      this.commit(deleteSelection(state), 'deleting', undefined);
    }
    this.composing = true;
  }

  private onCompositionEnd(event: CompositionEvent): void {
    this.composing = false;
    if (this.inert()) return;
    this.readBack(event, true);
  }

  private onInput(event: Event): void {
    if (this.composing || this.inert()) return;
    // an edit no handler intercepted — read the whole document back
    this.readBack(event, false);
  }

  /** Reads browser-made edits back into the model. */
  private readBack(event: Event, caretBlockOnly: boolean): void {
    const root = this.root;
    if (!root) return;
    const state = this.state();
    let doc: OgeEditorDoc;
    const domSelection = root.ownerDocument.getSelection?.() ?? null;
    if (caretBlockOnly) {
      const block = this.caretBlockElement(domSelection);
      if (!block) {
        this.readBack(event, false);
        return;
      }
      const index = Number.parseInt(
        block.getAttribute('data-oge-block') ?? '-1',
        10,
      );
      const model = state.doc.blocks[index];
      if (!model) {
        this.readBack(event, false);
        return;
      }
      // a list item's element also holds its nested sublists — read only
      // the item's own content
      const own = block.cloneNode(true) as HTMLElement;
      own
        .querySelectorAll('ul, ol, [data-oge-block]')
        .forEach((nested) => nested.remove());
      const read = ogeEditorReadDom(own, {
        ...this.urlOptions(),
        source: 'dom',
      });
      const inlines: OgeEditorInline[] = [];
      read.blocks.forEach((b, i) => {
        if (i > 0) inlines.push({ kind: 'break', marks: {} });
        inlines.push(...b.inlines);
      });
      const updated: OgeEditorBlock = {
        ...model,
        inlines: normalizeInlines(inlines),
      };
      doc = replaceBlock(state.doc, index, updated);
    } else {
      doc = ogeEditorReadDom(root, { ...this.urlOptions(), source: 'dom' });
    }
    // the caret as the browser left it, mapped against the DOM as it is now
    renumberAll(root);
    const selection =
      ogeEditorReadSelection(root, doc, domSelection) ?? state.selection;
    const next: OgeEditorState = { doc, selection, storedMarks: null };
    if (sameDoc(doc, state.doc)) {
      this.state.set({ ...state, selection });
      return;
    }
    this.commit(next, 'typing', event);
  }

  private caretBlockElement(selection: Selection | null): HTMLElement | null {
    const root = this.root;
    if (!root || !selection || selection.rangeCount === 0) return null;
    let node: Node | null = selection.focusNode;
    while (node && node !== root) {
      if (
        node.nodeType === 1 &&
        (node as Element).hasAttribute('data-oge-block')
      ) {
        return node as HTMLElement;
      }
      node = node.parentNode;
    }
    return null;
  }

  private onFocus(): void {
    const root = this.root;
    if (!root) return;
    // after toolbar commands re-rendered the DOM the browser has no caret
    // inside the editor any more; put it back where the model has it
    queueMicrotask(() => {
      const selection = root.ownerDocument.getSelection?.();
      if (
        !selection ||
        selection.rangeCount === 0 ||
        !root.contains(selection.anchorNode)
      ) {
        this.writeSelection();
      }
    });
  }

  private onSelectionChange(): void {
    if (this.writingSelection || this.composing) return;
    const root = this.root;
    if (!root) return;
    const selection = root.ownerDocument.getSelection?.();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      !root.contains(selection.anchorNode)
    ) {
      return;
    }
    this.syncSelectionFromDom();
  }
}

function kindOf(command: OgeEditorCommand): OgeEditorChangeKind {
  switch (command.type) {
    case 'toggleMark':
    case 'color':
    case 'background':
    case 'link':
    case 'clearFormatting':
    case 'align':
    case 'direction':
      return 'format';
    case 'insertText':
      return 'typing';
    case 'insertHtml':
      return 'paste';
    default:
      return 'structure';
  }
}

function sameSelection(a: OgeEditorSelection, b: OgeEditorSelection): boolean {
  return (
    a.anchor.block === b.anchor.block &&
    a.anchor.offset === b.anchor.offset &&
    a.focus.block === b.focus.block &&
    a.focus.offset === b.focus.offset
  );
}

function sameDoc(a: OgeEditorDoc, b: OgeEditorDoc): boolean {
  return (
    ogeEditorToHtml(a) === ogeEditorToHtml(b) &&
    a.blocks.length === b.blocks.length
  );
}

function renumberAll(root: HTMLElement): void {
  blockElements(root).forEach((element, i) => {
    element.setAttribute('data-oge-block', String(i));
  });
}

let graphemes: Intl.Segmenter | null | undefined;

/** The first `count` grapheme clusters of `text`. */
export function truncateGraphemes(text: string, count: number): string {
  if (count <= 0) return '';
  if (graphemes === undefined) {
    graphemes =
      typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;
  }
  if (!graphemes) return [...text].slice(0, count).join('');
  let out = '';
  let n = 0;
  for (const segment of graphemes.segment(text)) {
    if (n >= count) break;
    out += segment.segment;
    n++;
  }
  return out;
}

/** A document cut down to `count` characters. */
export function truncateDoc(doc: OgeEditorDoc, count: number): OgeEditorDoc {
  let room = count;
  const blocks: OgeEditorBlock[] = [];
  for (const block of doc.blocks) {
    if (room <= 0) break;
    const inlines: OgeEditorInline[] = [];
    for (const inline of block.inlines) {
      if (inline.kind !== 'text') {
        inlines.push(inline);
        continue;
      }
      if (room <= 0) break;
      const size = graphemeCount(inline.text);
      if (size <= room) {
        inlines.push(inline);
        room -= size;
      } else {
        inlines.push({ ...inline, text: truncateGraphemes(inline.text, room) });
        room = 0;
      }
    }
    blocks.push({ ...block, inlines: normalizeInlines(inlines) });
  }
  return ensureDoc(blocks);
}
