import { describe, expect, it } from 'vitest';
import {
  ogeEditorPointFromDom,
  ogeEditorPointToDom,
  ogeEditorReadSelection,
  ogeEditorWriteSelection,
  renderOgeEditorDom,
} from './editor-dom';
import {
  ogeEditorFromHtml,
  ogeEditorReadDom,
  ogeEditorToHtml,
} from './editor-html';
import { blockLength, replaceBlock, withInlines } from './editor-model';

function mount(html: string) {
  const root = document.createElement('div');
  root.setAttribute('contenteditable', 'true');
  document.body.appendChild(root);
  const doc = ogeEditorFromHtml(html);
  renderOgeEditorDom(root, doc);
  return { root, doc };
}

describe('renderOgeEditorDom', () => {
  it('renders block elements with indices and placeholders, never innerHTML', () => {
    const { root } = mount(
      '<h2>T</h2><p></p><ul><li>a<ul><li>b</li></ul></li></ul><hr>',
    );
    expect(root.querySelector('h2')?.getAttribute('data-oge-block')).toBe('0');
    expect(root.querySelector('p br[data-oge-placeholder]')).not.toBeNull();
    const items = root.querySelectorAll('li');
    expect(
      Array.from(items).map((li) => li.getAttribute('data-oge-block')),
    ).toEqual(['2', '3']);
    expect(root.querySelector('hr')?.getAttribute('contenteditable')).toBe(
      'false',
    );
    root.remove();
  });

  it('applies styles through the CSSOM', () => {
    const { root } = mount(
      '<p style="text-align: center"><span style="color: #c00">x</span></p>',
    );
    const p = root.querySelector('p') as HTMLElement;
    expect(p.style.getPropertyValue('text-align')).toBe('center');
    expect(
      (root.querySelector('span') as HTMLElement).style.getPropertyValue(
        'color',
      ),
    ).toBe('rgb(204, 0, 0)');
    root.remove();
  });

  it('keeps the elements of unchanged blocks across renders', () => {
    const { root, doc } = mount('<p>one</p><p>two</p><p>three</p>');
    const [first, second, third] = Array.from(root.children);
    const block = doc.blocks[1];
    const next = replaceBlock(
      doc,
      1,
      withInlines(block, [{ kind: 'text', text: 'TWO', marks: {} }]),
    );
    renderOgeEditorDom(root, next);
    expect(root.children[0]).toBe(first);
    expect(root.children[1]).not.toBe(second);
    expect(root.children[2]).toBe(third);
    expect(root.textContent).toBe('oneTWOthree');
    root.remove();
  });

  it('renumbers kept elements when a block is inserted above them', () => {
    const { root, doc } = mount('<p>a</p><p>b</p>');
    const kept = root.children[1];
    const next = {
      blocks: [
        doc.blocks[0],
        { type: 'paragraph' as const, indent: 0, inlines: [] },
        doc.blocks[1],
      ],
    };
    renderOgeEditorDom(root, next);
    expect(root.children[2]).toBe(kept);
    expect(kept.getAttribute('data-oge-block')).toBe('2');
    root.remove();
  });

  it('removes nodes the browser added that the model does not know', () => {
    const { root, doc } = mount('<p>a</p>');
    root.appendChild(document.createElement('div'));
    renderOgeEditorDom(root, doc);
    expect(root.children).toHaveLength(1);
    root.remove();
  });

  it('reads the editing DOM back into the same document', () => {
    const html =
      '<h1>T</h1><p><strong>b</strong> <a href="https://a.test">l</a></p><ul><li>a<ul><li>b</li></ul></li></ul>' +
      '<blockquote><p>q</p></blockquote><pre><code>x\ny</code></pre><hr><p>a<br>b</p>';
    const { root, doc } = mount(html);
    expect(ogeEditorToHtml(ogeEditorReadDom(root, { source: 'dom' }))).toBe(
      ogeEditorToHtml(doc),
    );
    root.remove();
  });
});

describe('DOM ↔ model points', () => {
  it('round-trips every position of every block', () => {
    const { root, doc } = mount(
      '<p>ab<strong>cd</strong><em>e</em></p><p>x<br>y<img src="https://i.test/a.png" alt="">z</p><ul><li>one<ul><li>two</li></ul></li></ul><p></p>',
    );
    doc.blocks.forEach((block, index) => {
      for (let offset = 0; offset <= blockLength(block); offset++) {
        const dom = ogeEditorPointToDom(root, { block: index, offset });
        expect(dom, `${index}:${offset}`).not.toBeNull();
        const back = ogeEditorPointFromDom(root, doc, dom!.node, dom!.offset);
        expect(back, `${index}:${offset}`).toEqual({ block: index, offset });
      }
    });
    root.remove();
  });

  it('a point on the root snaps to the nearest block edge', () => {
    const { root, doc } = mount('<p>ab</p><p>cd</p>');
    expect(ogeEditorPointFromDom(root, doc, root, 1)).toEqual({
      block: 1,
      offset: 0,
    });
    expect(ogeEditorPointFromDom(root, doc, root, 2)).toEqual({
      block: 1,
      offset: 2,
    });
    expect(ogeEditorPointFromDom(root, doc, document.body, 0)).toBeNull();
    root.remove();
  });

  it('writes and reads a DOM selection', () => {
    const { root, doc } = mount('<p>hello</p><p>world</p>');
    const selection = {
      anchor: { block: 0, offset: 1 },
      focus: { block: 1, offset: 3 },
    };
    expect(
      ogeEditorWriteSelection(root, selection, document.getSelection()),
    ).toBe(true);
    expect(ogeEditorReadSelection(root, doc, document.getSelection())).toEqual(
      selection,
    );
    root.remove();
  });
});

describe('renderOgeEditorDom adopting a surface rendered elsewhere', () => {
  const html = '<h2>T</h2><p>a <strong>b</strong></p><ul><li>c</li></ul>';
  const copy = (from: Element) => {
    const root = document.createElement('div');
    root.append(...Array.from(from.childNodes).map((n) => n.cloneNode(true)));
    return root;
  };

  it('keeps every server-built element that matches the model', () => {
    // the "server" render (portable parser), copied as a browser would see it
    const server = document.createElement('div');
    renderOgeEditorDom(server, ogeEditorFromHtml(html, { parser: 'portable' }));
    const root = copy(server);
    const before = Array.from(root.childNodes);

    renderOgeEditorDom(root, ogeEditorFromHtml(html));
    expect(root.childNodes).toHaveLength(before.length);
    Array.from(root.childNodes).forEach((n, i) => expect(n).toBe(before[i]));
  });

  it('rebuilds the elements that differ and keeps the rest', () => {
    const first = document.createElement('div');
    renderOgeEditorDom(first, ogeEditorFromHtml(html));
    const root = copy(first);
    const [h2, , list] = Array.from(root.childNodes);

    renderOgeEditorDom(root, ogeEditorFromHtml(html.replace('a ', 'z ')));
    const after = Array.from(root.childNodes);
    expect(after).toHaveLength(3);
    expect(after[0]).toBe(h2);
    expect(after[2]).toBe(list);
    expect(after[1].textContent).toBe('z b');
  });
});
