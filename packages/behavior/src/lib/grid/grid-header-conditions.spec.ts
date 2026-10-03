import { describe, expect, it } from 'vitest';
import { createFilterPredicate } from '@oge-ui/core';
import {
  emptyHeaderConditionFilter,
  flattenHeaderDateTree,
  groupHeaderValuesByDate,
  headerConditionExpr,
  headerConditionNeedsValue,
  headerConditionOperators,
  ogeHeaderConditionKey,
  parseHeaderConditionExpr,
} from './grid-header-conditions';

describe('header filter conditions', () => {
  it('offers type-specific operators and keys the row-filter slot', () => {
    expect(headerConditionOperators('string')[0]).toBe('contains');
    expect(headerConditionOperators('number')).toContain('ge');
    expect(headerConditionNeedsValue('isnull')).toBe(false);
    expect(ogeHeaderConditionKey('city')).toBe('hf:city');
  });

  it('builds nothing until a condition is filled in', () => {
    expect(
      headerConditionExpr('n', 'number', emptyHeaderConditionFilter('number')),
    ).toBeNull();
  });

  it('joins two conditions with the logic and filters rows', () => {
    const expr = headerConditionExpr('n', 'number', {
      first: { operator: 'ge', value: 10 },
      second: { operator: 'lt', value: '20' },
      logic: 'and',
    });
    expect(expr).toEqual({
      type: 'and',
      operands: [
        { type: 'binary', field: 'n', op: 'ge', value: 10 },
        { type: 'binary', field: 'n', op: 'lt', value: 20 },
      ],
    });
    const test = createFilterPredicate<{ n: number }>(expr!);
    expect([5, 10, 19, 20].filter((n) => test({ n }))).toEqual([10, 19]);
  });

  it('compares dates by whole local days', () => {
    const expr = headerConditionExpr('d', 'date', {
      first: { operator: 'eq', value: new Date(2026, 2, 14) },
      second: { operator: 'isnull', value: null },
      logic: 'or',
    });
    const test = createFilterPredicate<{ d: Date | null }>(expr!);
    expect(test({ d: new Date(2026, 2, 14, 17, 30) })).toBe(true);
    expect(test({ d: new Date(2026, 2, 15) })).toBe(false);
    expect(test({ d: null })).toBe(true);
  });

  it('reads its own expressions back into the menu state', () => {
    const filter = {
      first: { operator: 'contains' as const, value: 'an' },
      second: { operator: 'ne' as const, value: 'Ankara' },
      logic: 'or' as const,
    };
    expect(
      parseHeaderConditionExpr(
        headerConditionExpr('city', 'string', filter),
        'string',
      ),
    ).toEqual(filter);
    const day = new Date(2026, 0, 2);
    const parsed = parseHeaderConditionExpr(
      headerConditionExpr('d', 'date', {
        first: { operator: 'eq', value: day },
        second: { operator: 'eq', value: null },
        logic: 'and',
      }),
      'date',
    );
    expect(parsed.first.operator).toBe('eq');
    expect((parsed.first.value as Date).getTime()).toBe(day.getTime());
    expect(parseHeaderConditionExpr(null, 'number')).toEqual(
      emptyHeaderConditionFilter('number'),
    );
  });
});

describe('header filter date tree', () => {
  const values = [
    null,
    new Date(2025, 11, 31),
    new Date(2026, 0, 5),
    new Date(2026, 0, 5, 18),
    new Date(2026, 1, 1),
  ];

  it('groups values year → month → day, keeping blanks as leaves', () => {
    const tree = groupHeaderValuesByDate(values, '', '(Blank)', String);
    expect(tree.map((node) => node.label)).toEqual(['(Blank)', '2025', '2026']);
    const y2026 = tree[2];
    expect(y2026.values).toHaveLength(3);
    expect(y2026.children.map((m) => m.key)).toEqual(['2026-01', '2026-02']);
    const jan = y2026.children[0];
    expect(jan.children).toHaveLength(1);
    // a datetime column's two timestamps share their day node
    expect(jan.children[0].values).toHaveLength(2);
    expect(jan.children[0].level).toBe(2);
  });

  it('prunes by search and flattens with collapsed nodes', () => {
    const tree = groupHeaderValuesByDate(values, '2025', '(Blank)', String);
    expect(tree.map((node) => node.key)).toEqual(['2025']);
    const all = groupHeaderValuesByDate(values, '', '(Blank)', String);
    const rows = flattenHeaderDateTree(all, new Set(['2026']));
    expect(rows.map((node) => node.key)).toEqual([
      '~(Blank)',
      '2025',
      '2025-12',
      '2025-12-31',
      '2026',
    ]);
  });
});
