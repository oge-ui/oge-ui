import { describe, expect, it } from 'vitest';
import {
  canIndent,
  clearFormatting,
  deleteBackward,
  deleteForward,
  indentList,
  insertBreak,
  insertFragment,
  insertImage,
  insertPlainText,
  insertRule,
  insertText,
  outdentList,
  previousBoundary,
  selectAll,
  selectedFragment,
  setAlign,
  setBlockFormat,
  setColor,
  setDirection,
  setLink,
  splitBlock,
  toggleList,
  toggleMark,
} from './editor-commands';
import { ogeEditorFromHtml } from './editor-html';
import { caretOf, htmlOf, stateOf } from './editor-test-utils';

describe('editor commands — typing', () => {
  it('inserts text at the caret and moves it', () => {
    const next = insertText(stateOf('<p>helo</p>', [0, 3]), 'l');
    expect(htmlOf(next)).toBe('<p>hello</p>');
    expect(caretOf(next)).toEqual([0, 4]);
  });

  it('replaces a selection spanning blocks; the first block keeps its type', () => {
    const next = insertText(
      stateOf('<h2>Title</h2><p>body text</p>', [0, 2], [1, 5]),
      'X',
    );
    expect(htmlOf(next)).toBe('<h2>TiXtext</h2>');
    expect(caretOf(next)).toEqual([0, 3]);
  });

  it('continues the marks of the character before the caret', () => {
    const next = insertText(
      stateOf('<p><strong>bo</strong>x</p>', [0, 2]),
      'ld',
    );
    expect(htmlOf(next)).toBe('<p><strong>bold</strong>x</p>');
  });

  it('does not extend a link at its trailing edge', () => {
    const next = insertText(
      stateOf('<p><a href="https://a.test">link</a></p>', [0, 4]),
      '!',
    );
    expect(htmlOf(next)).toBe('<p><a href="https://a.test">link</a>!</p>');
  });

  it('extends a link from inside it', () => {
    const next = insertText(
      stateOf('<p><a href="https://a.test">lnk</a></p>', [0, 1]),
      'i',
    );
    expect(htmlOf(next)).toBe('<p><a href="https://a.test">link</a></p>');
  });

  it('a caret toggle arms the mark for the next text', () => {
    const armed = toggleMark(stateOf('<p>ab</p>', [0, 1]), 'bold');
    const next = insertText(armed, 'X');
    expect(htmlOf(next)).toBe('<p>a<strong>X</strong>b</p>');
  });

  it('multi-line plain text becomes paragraphs', () => {
    const next = insertPlainText(
      stateOf('<p>ab</p>', [0, 1]),
      'one\ntwo\nthree',
    );
    expect(htmlOf(next)).toBe('<p>aone</p><p>two</p><p>threeb</p>');
    expect(caretOf(next)).toEqual([2, 5]);
  });

  it('multi-line text stays one code block with breaks', () => {
    const next = insertPlainText(
      stateOf('<pre><code>x</code></pre>', [0, 1]),
      'a\nb',
    );
    expect(htmlOf(next)).toBe('<pre><code>xa\nb</code></pre>');
  });
});

describe('editor commands — Enter and Shift+Enter', () => {
  it('splits a paragraph', () => {
    const next = splitBlock(stateOf('<p>hello</p>', [0, 2]));
    expect(htmlOf(next)).toBe('<p>he</p><p>llo</p>');
    expect(caretOf(next)).toEqual([1, 0]);
  });

  it('Enter at the end of a heading starts a paragraph', () => {
    const next = splitBlock(stateOf('<h1>Title</h1>', [0, 5]));
    expect(htmlOf(next)).toBe('<h1>Title</h1><p><br></p>');
  });

  it('Enter in an empty list item leaves the list', () => {
    const next = splitBlock(stateOf('<ul><li>a</li><li></li></ul>', [1, 0]));
    expect(htmlOf(next)).toBe('<ul><li>a</li></ul><p><br></p>');
  });

  it('Enter in an empty nested item outdents it', () => {
    const state = stateOf('<ul><li>a<ul><li></li></ul></li></ul>', [1, 0]);
    expect(state.doc.blocks[1].indent).toBe(1);
    const next = splitBlock(state);
    expect(next.doc.blocks[1]).toMatchObject({ type: 'listItem', indent: 0 });
  });

  it('Enter in a list item makes the next item', () => {
    const next = splitBlock(stateOf('<ol><li>ab</li></ol>', [0, 1]));
    expect(htmlOf(next)).toBe('<ol><li>a</li><li>b</li></ol>');
  });

  it('Enter in a code block adds a line, and on an empty last line leaves it', () => {
    const once = splitBlock(stateOf('<pre><code>x</code></pre>', [0, 1]));
    expect(once.doc.blocks).toHaveLength(1);
    const twice = splitBlock(once);
    expect(htmlOf(twice)).toBe('<pre><code>x</code></pre><p><br></p>');
  });

  it('Shift+Enter inserts a line break', () => {
    const next = insertBreak(stateOf('<p>ab</p>', [0, 1]));
    expect(htmlOf(next)).toBe('<p>a<br>b</p>');
    expect(caretOf(next)).toEqual([0, 2]);
  });

  it('a trailing line break survives the round trip', () => {
    const next = insertBreak(stateOf('<p>ab</p>', [0, 2]));
    const html = htmlOf(next);
    expect(html).toBe('<p>ab<br><br></p>');
    expect(htmlOf(ogeEditorFromHtml(html))).toBe(html);
  });
});

describe('editor commands — deleting', () => {
  it('Backspace deletes one grapheme, not half an emoji', () => {
    const state = stateOf('<p>a👍🏽</p>', [0, 5]);
    const next = deleteBackward(state);
    expect(htmlOf(next)).toBe('<p>a</p>');
  });

  it('Backspace at the start of a heading turns it into a paragraph', () => {
    const next = deleteBackward(stateOf('<p>a</p><h2>b</h2>', [1, 0]));
    expect(htmlOf(next)).toBe('<p>a</p><p>b</p>');
  });

  it('Backspace at the start of a paragraph merges it into the previous block', () => {
    const next = deleteBackward(stateOf('<h2>ab</h2><p>cd</p>', [1, 0]));
    expect(htmlOf(next)).toBe('<h2>abcd</h2>');
    expect(caretOf(next)).toEqual([0, 2]);
  });

  it('Backspace at the start of a list item unwraps it first', () => {
    const next = deleteBackward(
      stateOf('<ul><li>a</li><li>b</li></ul>', [1, 0]),
    );
    expect(htmlOf(next)).toBe('<ul><li>a</li></ul><p>b</p>');
  });

  it('Backspace at the very start does nothing', () => {
    expect(deleteBackward(stateOf('<p>a</p>', [0, 0]))).toBeNull();
  });

  it('Backspace after a rule removes the rule', () => {
    const next = deleteBackward(stateOf('<p>a</p><hr><p>b</p>', [2, 0]));
    expect(htmlOf(next)).toBe('<p>a</p><p>b</p>');
  });

  it('Delete at the end merges the next block', () => {
    const next = deleteForward(stateOf('<p>ab</p><p>cd</p>', [0, 2]));
    expect(htmlOf(next)).toBe('<p>abcd</p>');
    expect(deleteForward(stateOf('<p>ab</p>', [0, 2]))).toBeNull();
  });

  it('word deletion stops at the word boundary', () => {
    const state = stateOf('<p>one two</p>', [0, 7]);
    expect(previousBoundary(state.doc.blocks[0], 7, 'word')).toBe(4);
    expect(htmlOf(deleteBackward(state, 'word'))).toBe('<p>one&nbsp;</p>');
  });
});

describe('editor commands — marks', () => {
  it('toggles a mark on and off over a range', () => {
    const on = toggleMark(stateOf('<p>hello</p>', [0, 1], [0, 4]), 'bold');
    expect(htmlOf(on)).toBe('<p>h<strong>ell</strong>o</p>');
    const off = toggleMark(on, 'bold');
    expect(htmlOf(off)).toBe('<p>hello</p>');
  });

  it('a partly bold range becomes fully bold', () => {
    const next = toggleMark(
      stateOf('<p><strong>ab</strong>cd</p>', [0, 0], [0, 4]),
      'bold',
    );
    expect(htmlOf(next)).toBe('<p><strong>abcd</strong></p>');
  });

  it('marks nest in a fixed order and share elements', () => {
    let state = toggleMark(stateOf('<p>abcd</p>', [0, 0], [0, 4]), 'bold');
    state = toggleMark(
      {
        ...state,
        selection: {
          anchor: { block: 0, offset: 1 },
          focus: { block: 0, offset: 3 },
        },
      },
      'italic',
    );
    expect(htmlOf(state)).toBe('<p><strong>a<em>bc</em>d</strong></p>');
  });

  it('subscript and superscript are exclusive', () => {
    let state = toggleMark(stateOf('<p>x2</p>', [0, 1], [0, 2]), 'superscript');
    state = toggleMark(state, 'subscript');
    expect(htmlOf(state)).toBe('<p>x<sub>2</sub></p>');
  });

  it('colours are spans with validated colour styles', () => {
    const next = setColor(
      stateOf('<p>red</p>', [0, 0], [0, 3]),
      'color',
      '#c00',
    );
    expect(htmlOf(next)).toBe('<p><span style="color: #c00">red</span></p>');
    const removed = setColor(next, 'color', null);
    expect(htmlOf(removed)).toBe('<p>red</p>');
  });

  it('clear formatting keeps links and drops everything else', () => {
    const state = stateOf(
      '<p style="text-align: center"><a href="https://a.test"><strong><em>x</em></strong></a>y</p>',
      [0, 0],
      [0, 2],
    );
    expect(htmlOf(clearFormatting(state))).toBe(
      '<p><a href="https://a.test">x</a>y</p>',
    );
  });
});

describe('editor commands — links', () => {
  it('links a selection', () => {
    const next = setLink(stateOf('<p>see docs</p>', [0, 4], [0, 8]), {
      href: 'https://ogeui.com',
    });
    expect(htmlOf(next)).toBe(
      '<p>see <a href="https://ogeui.com">docs</a></p>',
    );
  });

  it('a bare caret inserts the address as the link text', () => {
    const next = setLink(stateOf('<p>ab</p>', [0, 1]), {
      href: 'https://x.test',
    });
    expect(htmlOf(next)).toBe(
      '<p>a<a href="https://x.test">https://x.test</a>b</p>',
    );
  });

  it('a caret inside a link edits or removes the whole link', () => {
    const state = stateOf(
      '<p><a href="https://a.test">alpha</a> beta</p>',
      [0, 2],
    );
    expect(htmlOf(setLink(state, { href: 'https://b.test' }))).toBe(
      '<p><a href="https://b.test">alpha</a> beta</p>',
    );
    expect(htmlOf(setLink(state, null))).toBe('<p>alpha beta</p>');
    expect(setLink(stateOf('<p>plain</p>', [0, 2]), null)).toBeNull();
  });

  it('new-tab links carry rel="noopener noreferrer"', () => {
    const next = setLink(stateOf('<p>x</p>', [0, 0], [0, 1]), {
      href: 'https://a.test',
      target: '_blank',
    });
    expect(htmlOf(next)).toBe(
      '<p><a href="https://a.test" target="_blank" rel="noopener noreferrer">x</a></p>',
    );
  });
});

describe('editor commands — blocks', () => {
  it('sets headings, quotes and code blocks; quote and code toggle back', () => {
    const state = stateOf('<p>a</p><p>b</p>', [0, 0], [1, 1]);
    expect(htmlOf(setBlockFormat(state, 'heading', 2))).toBe(
      '<h2>a</h2><h2>b</h2>',
    );
    const quoted = setBlockFormat(state, 'blockquote', 1, true);
    expect(htmlOf(quoted)).toBe('<blockquote><p>a</p><p>b</p></blockquote>');
    expect(htmlOf(setBlockFormat(quoted, 'blockquote', 1, true))).toBe(
      '<p>a</p><p>b</p>',
    );
  });

  it('a code block drops marks and images', () => {
    const next = setBlockFormat(
      stateOf(
        '<p><strong>a</strong><img src="https://i.test/x.png" alt=""></p>',
      ),
      'codeBlock',
    );
    expect(htmlOf(next)).toBe('<pre><code>a</code></pre>');
  });

  it('toggles lists and switches their kind', () => {
    const state = stateOf('<p>a</p><p>b</p>', [0, 0], [1, 0]);
    const bullets = toggleList(state, 'bullet');
    expect(htmlOf(bullets)).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(htmlOf(toggleList(bullets, 'ordered'))).toBe(
      '<ol><li>a</li><li>b</li></ol>',
    );
    expect(htmlOf(toggleList(bullets, 'bullet'))).toBe('<p>a</p><p>b</p>');
  });

  it('indents and outdents list items into nested lists', () => {
    const state = stateOf('<ul><li>a</li><li>b</li></ul>', [1, 0]);
    expect(canIndent(state)).toBe(true);
    const nested = indentList(state);
    expect(htmlOf(nested)).toBe('<ul><li>a<ul><li>b</li></ul></li></ul>');
    expect(htmlOf(outdentList(nested!))).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(indentList(stateOf('<p>a</p>'))).toBeNull();
  });

  it('a list of another kind inside a list nests as its own list', () => {
    const html = '<ul><li>a<ol><li>b</li></ol></li><li>c</li></ul>';
    expect(htmlOf(stateOf(html))).toBe(html);
  });

  it('aligns blocks with logical values; start is the default', () => {
    const centered = setAlign(stateOf('<p>a</p>'), 'center');
    expect(htmlOf(centered)).toBe('<p style="text-align: center">a</p>');
    expect(htmlOf(setAlign(centered, 'start'))).toBe('<p>a</p>');
  });

  it('sets a block direction', () => {
    expect(htmlOf(setDirection(stateOf('<p>שלום</p>'), 'rtl'))).toBe(
      '<p dir="rtl">שלום</p>',
    );
  });

  it('inserts a rule and puts the caret after it', () => {
    const next = insertRule(stateOf('<p>ab</p>', [0, 1]));
    expect(htmlOf(next)).toBe('<p>a</p><hr><p>b</p>');
    expect(caretOf(next)).toEqual([2, 0]);
  });

  it('typing on a rule goes into a new paragraph after it', () => {
    const next = insertText(stateOf('<hr>', [0, 0]), 'x');
    expect(htmlOf(next)).toBe('<hr><p>x</p>');
  });

  it('inserts an image as one position', () => {
    const next = insertImage(stateOf('<p>ab</p>', [0, 1]), {
      src: 'https://i.test/a.png',
      alt: 'A',
    });
    expect(htmlOf(next)).toBe(
      '<p>a<img src="https://i.test/a.png" alt="A">b</p>',
    );
    expect(caretOf(next)).toEqual([0, 2]);
  });
});

describe('editor commands — fragments', () => {
  it('a single pasted block merges into the caret block', () => {
    const next = insertFragment(
      stateOf('<p>ab</p>', [0, 1]),
      ogeEditorFromHtml('<p><em>X</em></p>'),
    );
    expect(htmlOf(next)).toBe('<p>a<em>X</em>b</p>');
  });

  it('a pasted heading into an empty line stays a heading', () => {
    const next = insertFragment(
      stateOf('<p></p>'),
      ogeEditorFromHtml('<h3>H</h3>'),
    );
    expect(htmlOf(next)).toBe('<h3>H</h3>');
  });

  it('several blocks are spliced in around the caret', () => {
    const next = insertFragment(
      stateOf('<p>ab</p>', [0, 1]),
      ogeEditorFromHtml('<p>1</p><ul><li>2</li></ul><p>3</p>'),
    );
    expect(htmlOf(next)).toBe('<p>a1</p><ul><li>2</li></ul><p>3b</p>');
    expect(caretOf(next)).toEqual([2, 1]);
  });

  it('a pasted rule splits the block', () => {
    const next = insertFragment(
      stateOf('<p>ab</p>', [0, 1]),
      ogeEditorFromHtml('<hr>'),
    );
    expect(htmlOf(next)).toBe('<p>a</p><hr><p>b</p>');
  });

  it('copies the selection as its own document', () => {
    const fragment = selectedFragment(
      stateOf('<p>abc</p><p>def</p>', [0, 1], [1, 2]),
    );
    expect(htmlOf(fragment)).toBe('<p>bc</p><p>de</p>');
  });

  it('selects everything', () => {
    const all = selectAll(stateOf('<p>a</p><p>bc</p>'));
    expect(all.selection).toEqual({
      anchor: { block: 0, offset: 0 },
      focus: { block: 1, offset: 2 },
    });
  });
});
