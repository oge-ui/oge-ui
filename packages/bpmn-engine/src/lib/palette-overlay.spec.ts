import { OGE_DEFAULT_BPMN_PALETTE_ITEMS, bpmnPaletteNavIndex } from './palette';
import { sanitizeBpmnOverlayHtml } from './overlay-html';

describe('bpmnPaletteNavIndex', () => {
  it('wraps the arrows and jumps with Home/End', () => {
    expect(bpmnPaletteNavIndex('ArrowDown', 2, 3)).toBe(0);
    expect(bpmnPaletteNavIndex('ArrowUp', 0, 3)).toBe(2);
    expect(bpmnPaletteNavIndex('Home', 2, 3)).toBe(0);
    expect(bpmnPaletteNavIndex('End', 0, 3)).toBe(2);
    expect(bpmnPaletteNavIndex('a', 0, 3)).toBeNull();
    expect(bpmnPaletteNavIndex('ArrowDown', 0, 0)).toBeNull();
  });

  it('offers all 18 placeable items by default', () => {
    expect(OGE_DEFAULT_BPMN_PALETTE_ITEMS).toHaveLength(18);
    expect(OGE_DEFAULT_BPMN_PALETTE_ITEMS).toContain('pool');
  });
});

describe('sanitizeBpmnOverlayHtml', () => {
  it('keeps allow-listed elements, classes and text', () => {
    expect(
      sanitizeBpmnOverlayHtml('<span class="badge" title="t">3</span>'),
    ).toEqual([
      {
        kind: 'element',
        tag: 'span',
        attributes: { class: 'badge', title: 't' },
        children: [{ kind: 'text', text: '3' }],
      },
    ]);
  });

  it('drops scripts, handlers, styles and unknown elements', () => {
    const nodes = sanitizeBpmnOverlayHtml(
      '<img src="x" onerror="alert(1)" style="color:red"><script>alert(2)</script><blink>ok</blink><svg><text>no</text></svg>',
    );
    expect(nodes).toEqual([
      { kind: 'element', tag: 'img', attributes: { src: 'x' }, children: [] },
      { kind: 'text', text: 'ok' },
    ]);
  });

  it('keeps aria-* and data-* attributes', () => {
    const [node] = sanitizeBpmnOverlayHtml(
      '<b aria-label="count" data-n="1" id="x">1</b>',
    );
    expect(node).toMatchObject({
      kind: 'element',
      attributes: { 'aria-label': 'count', 'data-n': '1' },
    });
  });
});
