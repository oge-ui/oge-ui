import { describe, expect, it } from 'vitest';
import {
  ogeEditorApply,
  ogeEditorCommandFromName,
  ogeEditorKeyAction,
  ogeEditorMarkdownOnEnter,
  ogeEditorMarkdownOnSpace,
  type OgeEditorKeyInput,
} from './editor-actions';
import { insertText } from './editor-commands';
import {
  ogeEditorSafeColor,
  ogeEditorSafeHref,
  ogeEditorSafeImageSrc,
} from './editor-html';
import { htmlOf, stateOf } from './editor-test-utils';

const key = (
  k: string,
  mods: Partial<OgeEditorKeyInput> = {},
): OgeEditorKeyInput => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});
const pc = { mac: false, inList: false };
const options = {
  safeHref: (href: string) => ogeEditorSafeHref(href),
  safeImageSrc: (src: string) => ogeEditorSafeImageSrc(src),
  safeColor: (color: string) => ogeEditorSafeColor(color),
};

describe('ogeEditorKeyAction', () => {
  it('maps the formatting shortcuts', () => {
    expect(ogeEditorKeyAction(key('b', { ctrlKey: true }), pc)).toEqual({
      type: 'command',
      command: { type: 'toggleMark', mark: 'bold' },
    });
    expect(ogeEditorKeyAction(key('I', { ctrlKey: true }), pc)).toMatchObject({
      command: { mark: 'italic' },
    });
    expect(ogeEditorKeyAction(key('u', { ctrlKey: true }), pc)).toMatchObject({
      command: { mark: 'underline' },
    });
    expect(
      ogeEditorKeyAction(key('X', { ctrlKey: true, shiftKey: true }), pc),
    ).toMatchObject({
      command: { mark: 'strike' },
    });
    expect(ogeEditorKeyAction(key('k', { ctrlKey: true }), pc)).toEqual({
      type: 'linkDialog',
    });
  });

  it('undo / redo, including Ctrl+Shift+Z', () => {
    expect(ogeEditorKeyAction(key('z', { ctrlKey: true }), pc)).toMatchObject({
      command: { type: 'undo' },
    });
    expect(ogeEditorKeyAction(key('y', { ctrlKey: true }), pc)).toMatchObject({
      command: { type: 'redo' },
    });
    expect(
      ogeEditorKeyAction(key('Z', { ctrlKey: true, shiftKey: true }), pc),
    ).toMatchObject({
      command: { type: 'redo' },
    });
  });

  it('uses ⌘ on Apple platforms and ignores Ctrl there', () => {
    const mac = { mac: true, inList: false };
    expect(ogeEditorKeyAction(key('b', { metaKey: true }), mac)).toMatchObject({
      command: { mark: 'bold' },
    });
    expect(ogeEditorKeyAction(key('b', { ctrlKey: true }), mac)).toBeNull();
  });

  it('headings by Mod+Alt+digit, read from the physical key', () => {
    expect(
      ogeEditorKeyAction(
        key('²', { ctrlKey: true, altKey: true, code: 'Digit2' }),
        pc,
      ),
    ).toMatchObject({
      command: { type: 'blockFormat', format: 'heading', level: 2 },
    });
    expect(
      ogeEditorKeyAction(key('0', { ctrlKey: true, altKey: true }), pc),
    ).toMatchObject({
      command: { format: 'paragraph' },
    });
  });

  it('lists by Mod+Shift+7/8 on any layout', () => {
    expect(
      ogeEditorKeyAction(
        key('/', { ctrlKey: true, shiftKey: true, code: 'Digit7' }),
        pc,
      ),
    ).toMatchObject({
      command: { type: 'list', list: 'ordered' },
    });
    expect(
      ogeEditorKeyAction(
        key('(', { ctrlKey: true, shiftKey: true, code: 'Digit8' }),
        pc,
      ),
    ).toMatchObject({
      command: { type: 'list', list: 'bullet' },
    });
  });

  it('Tab indents only inside a list — the editor never traps focus', () => {
    expect(ogeEditorKeyAction(key('Tab'), pc)).toBeNull();
    expect(
      ogeEditorKeyAction(key('Tab'), { mac: false, inList: true }),
    ).toMatchObject({
      command: { type: 'indent' },
    });
    expect(
      ogeEditorKeyAction(key('Tab', { shiftKey: true }), {
        mac: false,
        inList: true,
      }),
    ).toMatchObject({
      command: { type: 'outdent' },
    });
  });

  it('Enter and Shift+Enter; nothing while composing', () => {
    expect(ogeEditorKeyAction(key('Enter'), pc)).toMatchObject({
      command: { type: 'splitBlock' },
    });
    expect(
      ogeEditorKeyAction(key('Enter', { shiftKey: true }), pc),
    ).toMatchObject({
      command: { type: 'lineBreak' },
    });
    expect(
      ogeEditorKeyAction(key('Enter', { isComposing: true }), pc),
    ).toBeNull();
  });

  it('plain keys and arrows are the browser’s', () => {
    expect(ogeEditorKeyAction(key('a'), pc)).toBeNull();
    expect(
      ogeEditorKeyAction(key('ArrowLeft', { ctrlKey: true }), pc),
    ).toBeNull();
    expect(ogeEditorKeyAction(key('c', { ctrlKey: true }), pc)).toBeNull();
  });
});

describe('ogeEditorMarkdownOnSpace', () => {
  const typed = (html: string, offset: number) =>
    insertText(stateOf(html, [0, offset]), ' ');

  it.each([
    ['#', '<h1><br></h1>'],
    ['###', '<h3><br></h3>'],
    ['-', '<ul><li><br></li></ul>'],
    ['*', '<ul><li><br></li></ul>'],
    ['1.', '<ol><li><br></li></ol>'],
    ['3)', '<ol><li><br></li></ol>'],
    ['>', '<blockquote><p><br></p></blockquote>'],
    ['```', '<pre><code></code></pre>'],
  ])('%s + space', (marker, expected) => {
    const next = ogeEditorMarkdownOnSpace(
      typed(`<p>${marker}</p>`, marker.length),
    );
    expect(htmlOf(next)).toBe(expected);
  });

  it('keeps the text after the marker', () => {
    const next = ogeEditorMarkdownOnSpace(typed('<p>#Title</p>', 1));
    expect(htmlOf(next)).toBe('<h1>Title</h1>');
  });

  it('only at the start of a paragraph', () => {
    expect(ogeEditorMarkdownOnSpace(typed('<p>a #</p>', 3))).toBeNull();
    expect(ogeEditorMarkdownOnSpace(typed('<h2>#</h2>', 1))).toBeNull();
    expect(ogeEditorMarkdownOnSpace(typed('<p>#######</p>', 7))).toBeNull();
  });

  it('--- + Enter becomes a rule', () => {
    expect(
      htmlOf(ogeEditorMarkdownOnEnter(stateOf('<p>---</p>', [0, 3]))),
    ).toBe('<hr><p><br></p>');
    expect(ogeEditorMarkdownOnEnter(stateOf('<p>--</p>', [0, 2]))).toBeNull();
  });
});

describe('ogeEditorApply', () => {
  it('runs a named command', () => {
    const state = stateOf('<p>ab</p>', [0, 0], [0, 2]);
    expect(
      htmlOf(ogeEditorApply(state, ogeEditorCommandFromName('bold'), options)),
    ).toBe('<p><strong>ab</strong></p>');
    expect(
      htmlOf(
        ogeEditorApply(state, ogeEditorCommandFromName('heading3'), options),
      ),
    ).toBe('<h3>ab</h3>');
    expect(
      htmlOf(
        ogeEditorApply(
          state,
          ogeEditorCommandFromName('alignJustify'),
          options,
        ),
      ),
    ).toBe('<p style="text-align: justify">ab</p>');
  });

  it('refuses unsafe links, images and colours', () => {
    const state = stateOf('<p>ab</p>', [0, 0], [0, 2]);
    expect(
      ogeEditorApply(
        state,
        { type: 'link', href: 'javascript:alert(1)' },
        options,
      ),
    ).toBeNull();
    expect(
      ogeEditorApply(
        state,
        { type: 'image', src: 'javascript:alert(1)' },
        options,
      ),
    ).toBeNull();
    expect(
      ogeEditorApply(state, { type: 'color', color: 'url(x)' }, options),
    ).toBeNull();
  });

  it('links open in a new tab on request', () => {
    const state = stateOf('<p>ab</p>', [0, 0], [0, 2]);
    expect(
      htmlOf(
        ogeEditorApply(
          state,
          { type: 'link', href: 'https://a.test', newTab: true },
          options,
        ),
      ),
    ).toBe(
      '<p><a href="https://a.test" target="_blank" rel="noopener noreferrer">ab</a></p>',
    );
  });

  it('leaves host-only commands to the host', () => {
    const state = stateOf('<p>ab</p>');
    expect(ogeEditorApply(state, { type: 'undo' }, options)).toBeNull();
    expect(
      ogeEditorApply(state, { type: 'insertHtml', html: '<b>x</b>' }, options),
    ).toBeNull();
  });
});
