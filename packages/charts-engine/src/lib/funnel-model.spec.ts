import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';
import { layoutFunnel } from './funnel-layout';
import {
  buildFunnelScene,
  funnelAnnouncement,
  funnelSrTable,
  funnelTooltip,
  toggleChartIndex,
} from './funnel-model';

const messages = OGE_DEFAULT_CHARTS_MESSAGES;
const box = { x: 0, y: 0, width: 200, height: 300 };

describe('layoutFunnel', () => {
  it('dynamicSlope: equal heights, widths follow the values', () => {
    const stages = layoutFunnel({
      ...box,
      values: [100, 50, 25],
      type: 'funnel',
      algorithm: 'dynamicSlope',
      gap: 0,
    });
    expect(stages).toHaveLength(3);
    const heights = stages.map((s) => s.bottom - s.top);
    expect(heights[0]).toBeCloseTo(100);
    expect(heights[2]).toBeCloseTo(100);
    // top edge of stage 0 is full width, of stage 1 half
    expect(stages[0].points[1].x - stages[0].points[0].x).toBeCloseTo(200);
    expect(stages[1].points[1].x - stages[1].points[0].x).toBeCloseTo(100);
  });

  it('dynamicHeight: heights follow the values, outline narrows to the neck', () => {
    const stages = layoutFunnel({
      ...box,
      values: [60, 30, 10],
      type: 'funnel',
      algorithm: 'dynamicHeight',
      neckWidth: 0.2,
      neckHeight: 0.2,
      gap: 0,
    });
    const heights = stages.map((s) => s.bottom - s.top);
    expect(heights[0]).toBeCloseTo(180);
    expect(heights[1]).toBeCloseTo(90);
    expect(heights[2]).toBeCloseTo(30);
    // the last stage sits in the neck: constant 40px wide
    expect(stages[2].midWidth).toBeCloseTo(40);
  });

  it('pyramid: apex on top, the first stage at the base', () => {
    const stages = layoutFunnel({
      ...box,
      values: [50, 30, 20],
      type: 'pyramid',
      algorithm: 'dynamicHeight',
      gap: 0,
    });
    const first = stages.find((s) => s.index === 0);
    const last = stages.find((s) => s.index === 2);
    expect(first?.bottom).toBeCloseTo(300);
    expect(last?.top).toBeCloseTo(0);
    expect(
      last?.points.some((p) => Math.abs(p.x - 100) < 0.01 && p.y === 0),
    ).toBe(true);
  });

  it('inverted flips the shape vertically; gaps separate the stages', () => {
    const stages = layoutFunnel({
      ...box,
      values: [1, 1],
      type: 'funnel',
      algorithm: 'dynamicSlope',
      inverted: true,
      gap: 10,
    });
    expect(stages[0].bottom).toBeCloseTo(300);
    expect(stages[0].top - stages[1].bottom).toBeCloseTo(10);
  });

  it('skips zero stages and empty boxes', () => {
    expect(
      layoutFunnel({
        ...box,
        values: [5, 0, 3],
        type: 'funnel',
        algorithm: 'dynamicSlope',
      }).map((s) => s.index),
    ).toEqual([0, 2]);
    expect(
      layoutFunnel({
        ...box,
        width: 0,
        values: [1],
        type: 'funnel',
        algorithm: 'dynamicSlope',
      }),
    ).toEqual([]);
  });
});

describe('buildFunnelScene', () => {
  const data = [
    { stage: 'Leads', count: 400 },
    { stage: 'Visits', count: 1000 },
    { stage: 'Orders', count: 100 },
  ];
  const input = {
    dataSource: data,
    argumentField: 'stage',
    valueField: 'count',
    type: 'funnel' as const,
    algorithm: 'dynamicSlope' as const,
    neckWidth: 0,
    neckHeight: 0,
    inverted: false,
    sortData: true,
    itemGap: 2,
    showLabels: true,
    width: 400,
    height: 300,
    locale: 'en-US',
    messages,
  };

  it('sorts largest first and computes the conversion rates', () => {
    const scene = buildFunnelScene(input);
    expect(scene.items.map((i) => i.label)).toEqual([
      'Visits',
      'Leads',
      'Orders',
    ]);
    expect(scene.items[1].payload.percentOfFirst).toBeCloseTo(0.4);
    expect(scene.items[2].payload.percentOfPrevious).toBeCloseTo(0.25);
    expect(scene.ariaLabel).toBe('funnel chart, 3 stages');
    expect(scene.legendItems).toHaveLength(3);
  });

  it('keeps the data order when sortData is off', () => {
    const scene = buildFunnelScene({ ...input, sortData: false });
    expect(scene.items.map((i) => i.label)).toEqual([
      'Leads',
      'Visits',
      'Orders',
    ]);
  });

  it('inside labels fit or drop; outside labels get connectors', () => {
    const inside = buildFunnelScene(input);
    expect(inside.labels.every((l) => l.inside)).toBe(true);
    expect(inside.labels[0].text).toBe('Visits: 1,000');
    const outside = buildFunnelScene({
      ...input,
      label: { position: 'outside' },
    });
    expect(outside.labels).toHaveLength(3);
    expect(
      outside.labels.every((l) => l.connector !== null && l.anchor === 'start'),
    ).toBe(true);
    const rtl = buildFunnelScene({
      ...input,
      label: { position: 'outside' },
      rtl: true,
    });
    expect(rtl.labels.every((l) => l.anchor === 'end')).toBe(true);
  });

  it('customizePoint / colorField colour stages and speak descriptions', () => {
    const scene = buildFunnelScene({
      ...input,
      customizePoint: (info) =>
        info.value === 100 ? { color: 'red', description: 'low' } : null,
    });
    const orders = scene.items.find((i) => i.label === 'Orders');
    expect(orders?.color).toBe('red');
    expect(orders?.valueText).toBe('100, low');
  });

  it('tooltip, sr table and announcement carry the conversion', () => {
    const scene = buildFunnelScene(input);
    const tip = funnelTooltip(scene, 1, messages, 'en-US');
    expect(tip?.rows).toEqual([
      '400',
      '40% of first stage',
      '40% of previous stage',
    ]);
    expect(funnelTooltip(scene, 0, messages, 'en-US')?.rows).toEqual(['1,000']);
    const table = funnelSrTable(scene, messages, 'en-US');
    expect(table.headers).toEqual(['Argument', 'Value', 'Share']);
    expect(table.rows[2]).toEqual({
      argText: 'Orders',
      cells: ['100', '10% of first stage'],
    });
    expect(funnelAnnouncement(scene, 1, messages, 'en-US')).toBe(
      'Leads: 400, 40% of first stage',
    );
  });

  it('pyramid labels its root differently', () => {
    expect(
      buildFunnelScene({
        ...input,
        type: 'pyramid',
        algorithm: 'dynamicHeight',
        title: 'Age',
      }).ariaLabel,
    ).toBe('Age pyramid chart, 3 levels');
  });

  it('toggleChartIndex adds and removes', () => {
    expect(toggleChartIndex([1], 2)).toEqual([1, 2]);
    expect(toggleChartIndex([1, 2], 1)).toEqual([2]);
  });
});
