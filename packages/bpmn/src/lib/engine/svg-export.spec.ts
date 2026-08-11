import { createEmptyDiagram } from './bpmn-model';
import { renderDiagramSvg } from './svg-export';
import { DEMO_EXPECTED_MODEL } from './xml-fixtures';

function count(svg: string, pattern: RegExp): number {
  return svg.match(pattern)?.length ?? 0;
}

describe('renderDiagramSvg', () => {
  it('renders every shape and edge of the demo model with a fitted viewBox', () => {
    const svg = renderDiagramSvg(DEMO_EXPECTED_MODEL);
    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="-?\d+ -?\d+ \d+ \d+"/,
    );
    // 5 edges: 4 sequence flows + 1 association.
    expect(count(svg, /<polyline /g)).toBe(5);
    // Task rect only (start/end events are circles, gateway/annotation paths).
    expect(count(svg, /<rect /g)).toBe(1);
    // Start + end event circles.
    expect(count(svg, /<circle /g)).toBe(2);
    // Gateway diamond + mark, annotation bracket.
    expect(count(svg, /<path d="/g)).toBeGreaterThanOrEqual(3);
    expect(svg).toContain('marker-end="url(#oge-bpmn-svg-arrow)"');
    expect(svg).toContain('stroke-dasharray="4 4"'); // association
    expect(svg).toContain('>Approve</text>');
    expect(svg).toContain('>yes</text>'); // edge label
    expect(svg).toContain('>Check limits</text>'); // annotation text
    // Content bounds (152..556 x, 40..240 y) + 20 padding.
    expect(svg).toContain('viewBox="132 20 444 240"');
  });

  it('is self-contained: no CSS variables, classes or external refs', () => {
    const svg = renderDiagramSvg(DEMO_EXPECTED_MODEL);
    expect(svg).not.toContain('var(--');
    expect(svg).not.toContain('class=');
    expect(svg).not.toContain('http://ogeui');
    expect(svg).toContain('fill="#fff"');
    expect(svg).toContain('stroke="#334155"');
    expect(svg).toContain('stroke="#64748b"');
  });

  it('escapes labels and honors the padding option', () => {
    const model = {
      ...createEmptyDiagram(),
      nodes: {
        T: { id: 'T', type: 'task' as const, name: 'a < b & c' },
      },
      order: ['T'],
      shapeDi: { T: { bounds: { x: 0, y: 0, width: 100, height: 80 } } },
    };
    const svg = renderDiagramSvg(model, { padding: 5 });
    expect(svg).toContain('a &lt; b &amp; c');
    expect(svg).toContain('viewBox="-5 -5 110 90"');
  });

  it('renders an empty diagram with a fallback viewBox', () => {
    const svg = renderDiagramSvg(createEmptyDiagram());
    expect(svg).toContain('viewBox="-20 -20 140 140"');
    expect(svg).toContain('</svg>');
  });
});
