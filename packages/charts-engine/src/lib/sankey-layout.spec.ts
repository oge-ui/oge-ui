import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';
import { layoutSankey, sankeyLinkPath } from './sankey-layout';
import {
  buildSankeyScene,
  sankeyHighlight,
  sankeyNodeText,
  sankeySrTable,
  sankeyTooltip,
} from './sankey-model';

const links = [
  { source: 'A', target: 'X', value: 10 },
  { source: 'A', target: 'Y', value: 5 },
  { source: 'B', target: 'X', value: 5 },
  { source: 'X', target: 'Z', value: 15 },
  { source: 'Y', target: 'Z', value: 5 },
];
const base = {
  nodes: [],
  links,
  width: 400,
  height: 200,
  nodeWidth: 10,
  nodePadding: 10,
  nodeAlign: 'justify' as const,
};

describe('layoutSankey', () => {
  it('columns from the longest path; node heights ∝ throughput', () => {
    const layout = layoutSankey(base);
    const by = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
    expect(layout.columns).toBe(3);
    expect(by['A'].column).toBe(0);
    expect(by['X'].column).toBe(1);
    expect(by['Z'].column).toBe(2);
    expect(by['X'].value).toBe(15);
    expect(by['Z'].value).toBe(20);
    // Z is the tallest node (20 of the column's 20 units)
    const hz = by['Z'].y1 - by['Z'].y0;
    const hx = by['X'].y1 - by['X'].y0;
    expect(hz / hx).toBeCloseTo(20 / 15, 1);
    expect(by['A'].x0).toBe(0);
    expect(by['Z'].x1).toBe(400);
  });

  it('nodes of a column keep the padding and stay inside the box', () => {
    const layout = layoutSankey(base);
    for (let c = 0; c < layout.columns; c++) {
      const column = layout.nodes
        .filter((n) => n.column === c)
        .sort((a, b) => a.y0 - b.y0);
      for (const n of column) {
        expect(n.y0).toBeGreaterThanOrEqual(-0.01);
        expect(n.y1).toBeLessThanOrEqual(200.01);
      }
      for (let i = 1; i < column.length; i++) {
        expect(column[i].y0 - column[i - 1].y1).toBeGreaterThanOrEqual(
          10 - 0.01,
        );
      }
    }
  });

  it('link bands stack inside their nodes', () => {
    const layout = layoutSankey(base);
    const a = layout.nodes.find((n) => n.id === 'A');
    const out = layout.links.filter((l) => l.source === a?.index);
    const total = out.reduce((sum, l) => sum + l.width, 0);
    expect(total).toBeCloseTo((a?.y1 ?? 0) - (a?.y0 ?? 0), 1);
  });

  it('justify vs left: a sink stays in its depth column with left', () => {
    const extra = [...links, { source: 'A', target: 'S', value: 1 }];
    const justify = layoutSankey({ ...base, links: extra });
    const left = layoutSankey({ ...base, links: extra, nodeAlign: 'left' });
    expect(justify.nodes.find((n) => n.id === 'S')?.column).toBe(2);
    expect(left.nodes.find((n) => n.id === 'S')?.column).toBe(1);
  });

  it('breaks cycles and drops self-loops / zero links', () => {
    const layout = layoutSankey({
      ...base,
      links: [
        { source: 'A', target: 'B', value: 3 },
        { source: 'B', target: 'A', value: 1 },
        { source: 'B', target: 'B', value: 9 },
        { source: 'A', target: 'C', value: 0 },
      ],
    });
    expect(layout.links).toHaveLength(2);
    expect(layout.nodes.find((n) => n.id === 'B')?.column).toBe(1);
  });

  it('RTL mirrors the flow; the band path is closed', () => {
    const rtl = layoutSankey({ ...base, rtl: true });
    expect(rtl.nodes.find((n) => n.id === 'A')?.x1).toBe(400);
    expect(sankeyLinkPath(0, 10, 100, 50, 4).endsWith('Z')).toBe(true);
  });
});

describe('buildSankeyScene', () => {
  const messages = OGE_DEFAULT_CHARTS_MESSAGES;
  const scene = buildSankeyScene({
    dataSource: links,
    sourceField: 'source',
    targetField: 'target',
    valueField: 'value',
    nodes: [{ id: 'A', label: 'Alpha', color: 'red' }],
    nodeWidth: 12,
    nodePadding: 12,
    nodeAlign: 'justify',
    linkColor: 'source',
    showLabels: true,
    width: 420,
    height: 220,
    locale: 'en-US',
    messages,
  });

  it('labels, colours and the column map', () => {
    const alpha = scene.nodes.find((n) => n.id === 'A');
    expect(alpha?.label).toBe('Alpha');
    expect(alpha?.color).toBe('red');
    expect(alpha?.labelVm?.anchor).toBe('start');
    expect(scene.nodes.find((n) => n.id === 'Z')?.labelVm?.anchor).toBe('end');
    expect(scene.links.filter((l) => l.color === 'red')).toHaveLength(2);
    expect(scene.columns.map((c) => c.length)).toEqual([2, 2, 1]);
    expect(scene.ariaLabel).toBe('Sankey diagram, 5 nodes, 5 links');
  });

  it('highlight: a node lights its links, a link its ends', () => {
    const alpha = scene.nodes.find((n) => n.id === 'A');
    const lit = sankeyHighlight(scene, {
      kind: 'node',
      index: alpha?.index ?? -1,
    });
    expect(lit?.links.size).toBe(2);
    const one = sankeyHighlight(scene, { kind: 'link', index: 0 });
    expect(one?.nodes.size).toBe(2);
    expect(sankeyHighlight(scene, null)).toBeNull();
  });

  it('tooltips and the sr table of flows', () => {
    const x = scene.nodes.find((n) => n.id === 'X');
    expect(
      sankeyTooltip(
        scene,
        { kind: 'node', index: x?.index ?? -1 },
        messages,
        420,
        'en-US',
      )?.valueText,
    ).toBe('in 15, out 15');
    expect(
      sankeyTooltip(scene, { kind: 'link', index: 0 }, messages, 420, 'en-US')
        ?.label,
    ).toBe('Alpha → X');
    if (x === undefined) throw new Error('missing');
    expect(sankeyNodeText(x, messages, 'en-US')).toBe('X: in 15, out 15');
    const table = sankeySrTable(scene, messages, 50);
    expect(table.headers).toEqual(['Source', 'Target', 'Value']);
    expect(table.rows[0]).toEqual({ argText: 'Alpha', cells: ['X', '10'] });
  });
});
