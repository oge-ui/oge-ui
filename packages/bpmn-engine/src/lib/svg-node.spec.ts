import {
  bpmnSvg,
  bpmnSvgToString,
  sanitizeBpmnSvg,
  type OgeBpmnSvgNode,
} from './svg-node';
import { bpmnCustomGlyph, bpmnHotkey } from './editor-extensions';
import { createEmptyDiagram } from './bpmn-model';
import { addNodeCommand } from './commands';
import { renderDiagramSvg } from './svg-export';

describe('safe SVG builders', () => {
  it('builds plain data trees', () => {
    expect(bpmnSvg.circle(12, 12, 8, { 'stroke-width': 2 })).toEqual({
      tag: 'circle',
      attrs: { cx: 12, cy: 12, r: 8, 'stroke-width': 2 },
    });
    expect(bpmnSvg.text(1, 2, 'Hi')).toEqual({
      tag: 'text',
      text: 'Hi',
      attrs: { x: 1, y: 2 },
    });
  });

  it('drops unknown tags, handlers, hrefs, styles and external urls', () => {
    const hostile = [
      { tag: 'script', text: 'alert(1)' },
      { tag: 'foreignObject' },
      {
        tag: 'path',
        attrs: {
          d: 'M0 0',
          onclick: 'alert(1)',
          href: 'javascript:alert(1)',
          style: 'fill:red',
          fill: 'url(https://evil.example/x.svg#a)',
          stroke: 'url(#local)',
          class: 'ok-class',
        },
      },
      { tag: 'rect', attrs: { x: Number.NaN, width: 4, class: 'a"b' } },
    ] as unknown as OgeBpmnSvgNode[];
    expect(sanitizeBpmnSvg(hostile)).toEqual([
      {
        tag: 'path',
        attrs: { d: 'M0 0', stroke: 'url(#local)', class: 'ok-class' },
      },
      { tag: 'rect', attrs: { width: '4' } },
    ]);
  });

  it('bounds depth and size', () => {
    let deep: OgeBpmnSvgNode = bpmnSvg.circle(0, 0, 1);
    for (let i = 0; i < 20; i++) deep = bpmnSvg.g([deep]);
    const flatten = (nodes: readonly OgeBpmnSvgNode[]): number =>
      nodes.reduce((n, node) => n + 1 + flatten(node.children ?? []), 0);
    expect(flatten(sanitizeBpmnSvg([deep]))).toBeLessThanOrEqual(9);
    const many = Array.from({ length: 500 }, () => bpmnSvg.circle(0, 0, 1));
    expect(sanitizeBpmnSvg(many)).toHaveLength(200);
  });

  it('serializes escaped text for the static export', () => {
    expect(bpmnSvgToString([bpmnSvg.text(0, 0, '<b>&')])).toBe(
      '<text x="0" y="0">&lt;b&gt;&amp;</text>',
    );
  });
});

describe('renderer overrides', () => {
  const model = addNodeCommand('task', { x: 100, y: 100 }, 'T').apply(
    createEmptyDiagram(),
  );

  it('falls back on null and on a throwing renderer', () => {
    const node = model.nodes['T'];
    const ctx = { node, width: 100, height: 80, fill: null, stroke: null };
    expect(bpmnCustomGlyph({ task: () => null }, ctx)).toBeNull();
    expect(
      bpmnCustomGlyph(
        {
          task: () => {
            throw new Error('x');
          },
        },
        ctx,
      ),
    ).toBeNull();
    expect(
      bpmnCustomGlyph(
        { task: (c) => [bpmnSvg.rect(0, 0, c.width, c.height)] },
        ctx,
      ),
    ).toEqual([
      { tag: 'rect', attrs: { x: '0', y: '0', width: '100', height: '80' } },
    ]);
  });

  it('applies to the SVG export', () => {
    const svg = renderDiagramSvg(model, {
      renderers: { task: () => [bpmnSvg.ellipse(50, 40, 50, 40)] },
    });
    expect(svg).toContain('<ellipse cx="50" cy="40" rx="50" ry="40"/>');
  });

  it('normalizes hotkeys and refuses the reserved canvas keys', () => {
    expect(bpmnHotkey('T')).toBe('t');
    expect(bpmnHotkey('h')).toBeNull();
    expect(bpmnHotkey('ab')).toBeNull();
    expect(bpmnHotkey(undefined)).toBeNull();
  });
});
