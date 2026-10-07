import {
  CHART_AXIS_LABEL_LINE_H,
  chartAxisLabelBox,
  createChartLabelMeasure,
  estimateChartLabelWidth,
} from './axis-label-boxes';

/** 6px per character — easy arithmetic. */
const six = (text: string): number => text.length * 6;

describe('chartAxisLabelBox', () => {
  it('keeps a label that fits on one line', () => {
    expect(chartAxisLabelBox('North', six, 100)).toEqual({
      lines: ['North'],
      width: 30,
      height: CHART_AXIS_LABEL_LINE_H,
    });
    expect(chartAxisLabelBox('North', six).lines).toEqual(['North']);
  });

  it('wraps at whitespace when wider than maxWidth', () => {
    // 'Enterprise support' = 18 chars = 108px > 90
    const box = chartAxisLabelBox('Enterprise support renewals', six, 90);
    expect(box.lines).toEqual(['Enterprise', 'support', 'renewals']);
    expect(box.width).toBe(60);
    expect(box.height).toBe(3 * CHART_AXIS_LABEL_LINE_H);
    for (const line of box.lines) expect(six(line)).toBeLessThanOrEqual(90);
  });

  it('packs words greedily per line', () => {
    expect(chartAxisLabelBox('aa bb cc dd ee', six, 36).lines).toEqual([
      'aa bb',
      'cc dd',
      'ee',
    ]);
  });

  it('ellipsizes what does not fit in three lines', () => {
    const box = chartAxisLabelBox('aa bb cc dd ee ff gg', six, 36);
    expect(box.lines).toHaveLength(3);
    expect(box.lines[2].endsWith('…')).toBe(true);
    expect(six(box.lines[2])).toBeLessThanOrEqual(36);
  });

  it('keeps an unbreakable word on one line', () => {
    expect(chartAxisLabelBox('Supercalifragilistic', six, 50).lines).toEqual([
      'Supercalifragilistic',
    ]);
  });
});

describe('createChartLabelMeasure', () => {
  it('is undefined without an svg or where svg text cannot be measured (jsdom)', () => {
    expect(createChartLabelMeasure(null)).toBeUndefined();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expect(createChartLabelMeasure(svg)).toBeUndefined();
  });

  it('measures in the svg with the label classes, caches, and leaves no probe', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.append(svg);
    const proto = Object.getPrototypeOf(
      document.createElementNS('http://www.w3.org/2000/svg', 'text'),
    ) as { getComputedTextLength?: () => number };
    const calls: string[] = [];
    proto.getComputedTextLength = function (this: SVGTextElement) {
      calls.push(`${this.getAttribute('class')}|${this.textContent}`);
      expect(this.parentNode).toBe(svg);
      return this.textContent === 'hidden' ? 0 : 42;
    };
    try {
      const measure = createChartLabelMeasure(svg);
      expect(measure).toBeDefined();
      expect(measure?.('North')).toBe(42);
      expect(measure?.('North')).toBe(42);
      expect(calls).toEqual(['oge-chart-axis-label oge-chart-arg-label|North']);
      // not laid out: the estimate, measured again next time
      expect(measure?.('hidden')).toBe(estimateChartLabelWidth('hidden'));
      measure?.('hidden');
      expect(calls).toHaveLength(3);
      expect(measure?.('')).toBe(0);
      expect(svg.childNodes).toHaveLength(0);
    } finally {
      delete proto.getComputedTextLength;
      svg.remove();
    }
  });
});
