import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  OGE_DEFAULT_EDITOR_CONFIG,
  type OgeEditorConfig,
} from './editor-config';
import {
  OgeEditorCore,
  truncateDoc,
  truncateGraphemes,
  type OgeEditorCoreOptions,
} from './editor-core';
import { ogeEditorWriteSelection } from './editor-dom';
import { ogeEditorFromHtml, ogeEditorToHtml } from './editor-html';

/** A plain-closure adapter: no memoization, so nothing depends on a framework's caching. */
const PLAIN: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

interface Setup {
  core: OgeEditorCore;
  root: HTMLElement;
  changes: string[];
  options: { current: OgeEditorCoreOptions };
  requestLink: ReturnType<typeof vi.fn>;
}

function setup(
  html = '',
  overrides: Partial<OgeEditorCoreOptions> = {},
  config: Partial<OgeEditorConfig> = {},
): Setup {
  const root = document.createElement('div');
  root.setAttribute('contenteditable', 'true');
  root.tabIndex = 0;
  document.body.appendChild(root);
  const changes: string[] = [];
  const options = {
    current: {
      config: { ...OGE_DEFAULT_EDITOR_CONFIG, ...config },
      readOnly: false,
      disabled: false,
      maxLength: undefined,
      ...overrides,
    } as OgeEditorCoreOptions,
  };
  const requestLink = vi.fn();
  const core = new OgeEditorCore(PLAIN, {
    options: () => options.current,
    valueChanged: (value) => changes.push(value),
    requestLink,
  });
  core.setValue(html);
  core.attach(root);
  root.focus();
  return { core, root, changes, options, requestLink };
}

function caret(
  s: Setup,
  block: number,
  offset: number,
  focusBlock = block,
  focusOffset = offset,
): void {
  const selection = {
    anchor: { block, offset },
    focus: { block: focusBlock, offset: focusOffset },
  };
  ogeEditorWriteSelection(s.root, selection, document.getSelection());
  s.core.syncSelectionFromDom();
}

function beforeInput(
  root: HTMLElement,
  inputType: string,
  data: string | null = null,
): InputEvent {
  const event = new InputEvent('beforeinput', {
    inputType,
    data,
    bubbles: true,
    cancelable: true,
  });
  root.dispatchEvent(event);
  return event;
}

function keydown(
  root: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  root.dispatchEvent(event);
  return event;
}

function clipboard(
  root: HTMLElement,
  type: 'paste' | 'copy' | 'cut',
  data: Record<string, string> = {},
) {
  const store = { ...data };
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData: (t: string) => store[t] ?? '',
      setData: (t: string, v: string) => {
        store[t] = v;
      },
    },
  });
  root.dispatchEvent(event);
  return { event, store };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('OgeEditorCore — typing through beforeinput', () => {
  it('turns insertText into a model edit and re-renders', () => {
    const s = setup('<p>helo</p>');
    caret(s, 0, 3);
    const event = beforeInput(s.root, 'insertText', 'l');
    expect(event.defaultPrevented).toBe(true);
    expect(s.core.getHtml()).toBe('<p>hello</p>');
    expect(s.root.textContent).toBe('hello');
    expect(s.changes).toEqual(['<p>hello</p>']);
  });

  it('Enter splits, Shift+Enter breaks (keydown), Backspace deletes (beforeinput)', () => {
    const s = setup('<p>ab</p>');
    caret(s, 0, 1);
    expect(keydown(s.root, 'Enter').defaultPrevented).toBe(true);
    expect(s.core.getHtml()).toBe('<p>a</p><p>b</p>');
    keydown(s.root, 'Enter', { shiftKey: true });
    expect(s.core.getHtml()).toBe('<p>a</p><p><br>b</p>');
    beforeInput(s.root, 'deleteContentBackward');
    beforeInput(s.root, 'deleteContentBackward');
    expect(s.core.getHtml()).toBe('<p>ab</p>');
  });

  it('formatting shortcuts toggle marks and announce them', () => {
    const s = setup('<p>word</p>');
    caret(s, 0, 0, 0, 4);
    keydown(s.root, 'b', { ctrlKey: true });
    expect(s.core.getHtml()).toBe('<p><strong>word</strong></p>');
    expect(s.core.active().marks.bold).toBe(true);
    keydown(s.root, 'b', { ctrlKey: true });
    expect(s.core.getHtml()).toBe('<p>word</p>');
  });

  it('a caret toggle applies to the next typed text', () => {
    const s = setup('<p>a</p>');
    caret(s, 0, 1);
    keydown(s.root, 'i', { ctrlKey: true });
    beforeInput(s.root, 'insertText', 'b');
    expect(s.core.getHtml()).toBe('<p>a<em>b</em></p>');
  });

  it('Ctrl+K asks the host for the link dialog', () => {
    const s = setup('<p>a</p>');
    keydown(s.root, 'k', { ctrlKey: true });
    expect(s.requestLink).toHaveBeenCalledOnce();
  });

  it('markdown shortcuts transform, and one undo restores the typed marker', () => {
    const s = setup('<p></p>');
    caret(s, 0, 0);
    beforeInput(s.root, 'insertText', '#');
    beforeInput(s.root, 'insertText', ' ');
    expect(s.core.getHtml()).toBe('<h1><br></h1>');
    keydown(s.root, 'z', { ctrlKey: true });
    expect(s.core.getHtml()).toBe('<p>#&nbsp;</p>');
  });

  it('markdown shortcuts can be turned off', () => {
    const s = setup('<p></p>', {}, { markdownShortcuts: false });
    caret(s, 0, 0);
    beforeInput(s.root, 'insertText', '-');
    beforeInput(s.root, 'insertText', ' ');
    expect(s.core.getHtml()).toBe('<p>-&nbsp;</p>');
  });

  it('blocks unknown input types instead of letting the browser edit', () => {
    const s = setup('<p>a</p>');
    expect(beforeInput(s.root, 'formatFontColor').defaultPrevented).toBe(true);
    expect(s.core.getHtml()).toBe('<p>a</p>');
  });
});

describe('OgeEditorCore — history', () => {
  it('undo / redo restore model states and coalesce typing', () => {
    const s = setup('<p></p>');
    caret(s, 0, 0);
    for (const ch of 'abc') beforeInput(s.root, 'insertText', ch);
    expect(s.core.canUndo()).toBe(true);
    keydown(s.root, 'z', { ctrlKey: true });
    expect(s.core.getHtml()).toBe('');
    expect(s.core.canRedo()).toBe(true);
    keydown(s.root, 'y', { ctrlKey: true });
    expect(s.core.getHtml()).toBe('<p>abc</p>');
  });

  it('historyUndo input events go through the model history too', () => {
    const s = setup('<p>a</p>');
    caret(s, 0, 1);
    beforeInput(s.root, 'insertText', 'b');
    const event = beforeInput(s.root, 'historyUndo');
    expect(event.defaultPrevented).toBe(true);
    expect(s.core.getHtml()).toBe('<p>a</p>');
  });

  it('setValue clears the history and ignores its own echo', () => {
    const s = setup('<p>a</p>');
    caret(s, 0, 1);
    beforeInput(s.root, 'insertText', 'b');
    s.core.setValue('<p>ab</p>'); // the two-way binding echo
    expect(s.core.canUndo()).toBe(true);
    s.core.setValue('<p>new</p>');
    expect(s.core.canUndo()).toBe(false);
    expect(s.root.textContent).toBe('new');
  });
});

describe('OgeEditorCore — clipboard', () => {
  it('pastes sanitized HTML', () => {
    const s = setup('<p>ab</p>');
    caret(s, 0, 1);
    const { event } = clipboard(s.root, 'paste', {
      'text/html': '<b onclick="x()">X</b><script>alert(1)</script>',
      'text/plain': 'X',
    });
    expect(event.defaultPrevented).toBe(true);
    expect(s.core.getHtml()).toBe('<p>a<strong>X</strong>b</p>');
  });

  it('pastes plain text when there is no HTML or pasteMode is text', () => {
    const s = setup('<p>ab</p>', {}, { pasteMode: 'text' });
    caret(s, 0, 2);
    clipboard(s.root, 'paste', {
      'text/html': '<b>X</b>',
      'text/plain': 'X\nY',
    });
    expect(s.core.getHtml()).toBe('<p>abX</p><p>Y</p>');
  });

  it('lets the host rewrite or cancel a paste', () => {
    const s = setup('<p>a</p>');
    const pasting = vi.fn((e: { html: string; cancel: boolean }) => {
      e.cancel = e.html.includes('secret');
    });
    (s.core as unknown as { host: { pasting: unknown } }).host.pasting =
      pasting;
    caret(s, 0, 1);
    clipboard(s.root, 'paste', { 'text/html': '<p>secret</p>' });
    expect(s.core.getHtml()).toBe('<p>a</p>');
    expect(pasting).toHaveBeenCalledOnce();
  });

  it('copies and cuts its own clean HTML', () => {
    const s = setup('<p><strong>bold</strong> text</p>');
    caret(s, 0, 0, 0, 4);
    const copy = clipboard(s.root, 'copy');
    expect(copy.store['text/html']).toBe('<p><strong>bold</strong></p>');
    expect(copy.store['text/plain']).toBe('bold');
    clipboard(s.root, 'cut');
    expect(s.core.getHtml()).toBe('<p>&nbsp;text</p>');
  });
});

describe('OgeEditorCore — limits and modes', () => {
  it('maxLength truncates typing and pastes and announces the limit', () => {
    const s = setup('<p>abc</p>', { maxLength: 5 });
    caret(s, 0, 3);
    clipboard(s.root, 'paste', { 'text/plain': 'defgh' });
    expect(s.core.getHtml()).toBe('<p>abcde</p>');
    beforeInput(s.root, 'insertText', 'x');
    expect(s.core.getHtml()).toBe('<p>abcde</p>');
    expect(s.core.characterCount()).toBe(5);
  });

  it('read-only blocks every edit but keeps the content', () => {
    const s = setup('<p>a</p>', { readOnly: true });
    caret(s, 0, 1);
    expect(beforeInput(s.root, 'insertText', 'b').defaultPrevented).toBe(true);
    keydown(s.root, 'b', { ctrlKey: true });
    clipboard(s.root, 'paste', { 'text/plain': 'x' });
    expect(s.core.exec({ type: 'toggleMark', mark: 'bold' })).toBe(false);
    expect(s.core.getHtml()).toBe('<p>a</p>');
    expect(s.changes).toEqual([]);
  });

  it('exec refuses unsafe links and inserts safe ones', () => {
    const s = setup('<p>ab</p>');
    caret(s, 0, 0, 0, 2);
    expect(s.core.exec({ type: 'link', href: 'javascript:alert(1)' })).toBe(
      false,
    );
    expect(s.core.exec({ type: 'link', href: 'https://ogeui.com' })).toBe(true);
    expect(s.core.getHtml()).toBe('<p><a href="https://ogeui.com">ab</a></p>');
  });

  it('insertHtml sanitizes', () => {
    const s = setup('<p></p>');
    s.core.insertHtml(
      '<img src=x onerror=alert(1)><img src="javascript:x()"><em>ok</em>',
    );
    // the relative image is a legitimate URL; the handler and the script URL are gone
    expect(s.core.getHtml()).toBe('<p><img src="x" alt=""><em>ok</em></p>');
  });
});

describe('OgeEditorCore — browser-made edits', () => {
  it('reads an IME composition back from the DOM when it ends', () => {
    const s = setup('<p>ab</p>');
    caret(s, 0, 2);
    s.root.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
    // the browser writes the composed text into the DOM itself
    const text = s.root.querySelector('p')!.firstChild as Text;
    text.data = 'abか';
    document.getSelection()!.setBaseAndExtent(text, 3, text, 3);
    // input events during the composition are ignored
    s.root.dispatchEvent(
      new InputEvent('input', {
        inputType: 'insertCompositionText',
        bubbles: true,
      }),
    );
    expect(s.changes).toEqual([]);
    s.root.dispatchEvent(
      new CompositionEvent('compositionend', { data: 'か', bubbles: true }),
    );
    expect(s.core.getHtml()).toBe('<p>abか</p>');
    expect(s.core.state().selection.focus).toEqual({ block: 0, offset: 3 });
  });

  it('an input no handler intercepted triggers a full read-back', () => {
    const s = setup('<p>a</p>');
    const p = s.root.querySelector('p')!;
    p.appendChild(document.createTextNode('z'));
    s.root.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(s.core.getHtml()).toBe('<p>az</p>');
  });
});

describe('OgeEditorCore — lifetime', () => {
  it('detaches its listeners on destroy and revives (StrictMode)', () => {
    const s = setup('<p>a</p>');
    s.core.destroy();
    caret(s, 0, 1);
    beforeInput(s.root, 'insertText', 'b');
    expect(s.core.getHtml()).toBe('<p>a</p>');
    s.core.revive(s.root);
    caret(s, 0, 1);
    beforeInput(s.root, 'insertText', 'b');
    expect(s.core.getHtml()).toBe('<p>ab</p>');
  });

  it('works without a document element (SSR): value in, value out', () => {
    const core = new OgeEditorCore(PLAIN, {
      options: () => ({
        config: OGE_DEFAULT_EDITOR_CONFIG,
        readOnly: false,
        disabled: false,
        maxLength: undefined,
      }),
      valueChanged: () => undefined,
    });
    core.setValue('<p>a <b>b</b></p>');
    expect(core.getHtml()).toBe('<p>a <strong>b</strong></p>');
    expect(core.wordCount()).toBe(2);
    core.insertText('!');
    expect(core.getText()).toBe('!a b');
  });
});

describe('truncation helpers', () => {
  it('truncates by grapheme clusters', () => {
    expect(truncateGraphemes('a👍🏽b', 2)).toBe('a👍🏽');
    const doc = truncateDoc(ogeEditorFromHtml('<p>abc</p><p>def</p>'), 4);
    expect(ogeEditorToHtml(doc)).toBe('<p>abc</p><p>d</p>');
  });
});
