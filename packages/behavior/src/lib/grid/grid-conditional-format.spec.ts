import { describe, expect, it } from 'vitest';
import type { RowNode } from '@oge-ui/core';
import {
  OgePreparedTracker,
  ogeClassList,
  ogeColumnValueRange,
  ogeFormatsNeedRange,
  resolveOgeConditionalFormat,
  type OgeConditionalFormat,
} from './grid-conditional-format';

describe('class hooks', () => {
  it('normalizes strings, arrays and records', () => {
    expect(ogeClassList('a  b')).toEqual(['a', 'b']);
    expect(ogeClassList(['a', 'b c'])).toEqual(['a', 'b', 'c']);
    expect(ogeClassList({ on: true, off: false, maybe: null })).toEqual(['on']);
    expect(ogeClassList(null)).toEqual([]);
    expect(ogeClassList(undefined)).toEqual([]);
  });
});

describe('conditional formats', () => {
  const nodes: RowNode<{ v: unknown }>[] = [
    { kind: 'data', key: 1, data: { v: 10 }, sourceIndex: 0, level: 0 },
    { kind: 'data', key: 2, data: { v: 50 }, sourceIndex: 1, level: 0 },
    { kind: 'data', key: 3, data: { v: 'x' }, sourceIndex: 2, level: 0 },
    { kind: 'data', key: 4, data: { v: 110 }, sourceIndex: 3, level: 0 },
  ];

  it('computes the numeric range over data rows', () => {
    expect(ogeColumnValueRange(nodes, (row) => row.v)).toEqual({
      min: 10,
      max: 110,
    });
    expect(ogeColumnValueRange([], (row: { v: unknown }) => row.v)).toBeNull();
  });

  it('applies predicate and declarative rules with token classes', () => {
    const formats: OgeConditionalFormat<{ v: unknown }>[] = [
      { when: { operator: 'gt', value: 40 }, style: { tone: 'danger', bold: true } },
      { when: (value) => value === 10, class: 'low-row', style: { background: 'info' } },
    ];
    expect(resolveOgeConditionalFormat(formats, 50, { v: 50 }, null).classes).toEqual([
      'oge-cf-tone-danger',
      'oge-cf-bold',
    ]);
    expect(resolveOgeConditionalFormat(formats, 10, { v: 10 }, null).classes).toEqual([
      'low-row',
      'oge-cf-bg-info',
    ]);
    const none = resolveOgeConditionalFormat(formats, 20, { v: 20 }, null);
    expect(none.classes).toEqual([]);
    expect(none.icon).toBeNull();
  });

  it('sizes data bars and colour scales through custom properties', () => {
    const bar = resolveOgeConditionalFormat(
      [{ type: 'dataBar' }],
      55,
      {},
      { min: 10, max: 110 },
    );
    expect(bar.classes).toEqual(['oge-cf-databar', 'oge-cf-bar-accent']);
    expect(bar.vars).toEqual({ '--oge-cf-bar-start': '0', '--oge-cf-bar': '0.5' });
    const scale = resolveOgeConditionalFormat(
      [{ type: 'colorScale', tones: ['danger', 'success'] }],
      35,
      {},
      { min: 10, max: 110 },
    );
    expect(scale.classes).toEqual([
      'oge-cf-scale',
      'oge-cf-scale-from-danger',
      'oge-cf-scale-to-success',
    ]);
    expect(scale.vars['--oge-cf-scale']).toBe('0.25');
    const three = resolveOgeConditionalFormat(
      [{ type: 'colorScale' }],
      85,
      {},
      { min: 10, max: 110 },
    );
    expect(three.classes).toContain('oge-cf-scale-from-warning');
    expect(three.vars['--oge-cf-scale']).toBe('0.5');
  });

  it('draws negative bars from the zero line in the danger tone', () => {
    const bar = resolveOgeConditionalFormat(
      [{ type: 'dataBar', min: -50, max: 50 }],
      -25,
      {},
      null,
    );
    expect(bar.classes).toContain('oge-cf-databar-negative');
    expect(bar.classes).toContain('oge-cf-bar-danger');
    expect(bar.vars).toEqual({
      '--oge-cf-bar-start': '0.25',
      '--oge-cf-bar': '0.25',
    });
  });

  it('picks icon-set glyphs from thresholds or the thirds of the range', () => {
    const fmt: OgeConditionalFormat[] = [{ type: 'iconSet', thresholds: [20, 80] }];
    expect(resolveOgeConditionalFormat(fmt, 10, {}, null).icon).toBe('low');
    expect(resolveOgeConditionalFormat(fmt, 50, {}, null).icon).toBe('mid');
    expect(resolveOgeConditionalFormat(fmt, 80, {}, null).icon).toBe('high');
    const thirds = resolveOgeConditionalFormat(
      [{ type: 'iconSet', icons: 'flags' }],
      100,
      {},
      { min: 10, max: 110 },
    );
    expect(thirds.icon).toBe('high');
    expect(thirds.iconSet).toBe('flags');
  });

  it('skips numeric formats for non-numbers and reports when a range is needed', () => {
    expect(
      resolveOgeConditionalFormat([{ type: 'dataBar' }], 'x', {}, null).classes,
    ).toEqual([]);
    expect(ogeFormatsNeedRange([{ type: 'dataBar' }])).toBe(true);
    expect(ogeFormatsNeedRange([{ when: () => true }])).toBe(false);
    expect(ogeFormatsNeedRange(undefined)).toBe(false);
  });
});

describe('prepared tracker', () => {
  it('reports an element once per row object', () => {
    const tracker = new OgePreparedTracker();
    const element = document.createElement('div');
    const row = { id: 1 };
    expect(tracker.isNew(element, row)).toBe(true);
    expect(tracker.isNew(element, row)).toBe(false);
    expect(tracker.isNew(element, { id: 1 })).toBe(true);
    tracker.reset();
    expect(tracker.isNew(element, row)).toBe(true);
  });
});
