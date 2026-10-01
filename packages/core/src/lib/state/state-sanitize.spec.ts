import {
  isUnsafeStateKey,
  parseStateJson,
  sanitizeGridStateSnapshot,
  sanitizePivotGridStateSnapshot,
  sanitizeTreeListStateSnapshot,
} from './state-sanitize';

/** Deterministic PRNG (mulberry32) so a failing fuzz case is reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KEYS = [
  'sort',
  'group',
  'filter',
  'paging',
  'columns',
  'expansion',
  'toggled',
  'row',
  'header',
  'builder',
  'searchText',
  'pageIndex',
  'pageSize',
  'order',
  'widths',
  'pins',
  'hidden',
  'field',
  'dir',
  'type',
  'op',
  'value',
  'operands',
  'operand',
  'fields',
  'id',
  'area',
  'rowExpandedPaths',
  'fieldPanelCollapsed',
  '__proto__',
  'constructor',
  'prototype',
  'polluted',
];

/** A random JSON-ish value, biased toward state-like keys. */
function randomValue(next: () => number, depth: number): unknown {
  const pick = Math.floor(next() * (depth > 4 ? 6 : 9));
  switch (pick) {
    case 0:
      return null;
    case 1:
      return next() < 0.5;
    case 2:
      return [NaN, Infinity, -1, 0, 7, 1e300, 2.5][Math.floor(next() * 7)];
    case 3:
      return ['asc', 'desc', 'binary', 'and', 'eq', '', 'x', 'left'][
        Math.floor(next() * 8)
      ];
    case 4:
      return undefined;
    case 5:
      return KEYS[Math.floor(next() * KEYS.length)];
    case 6:
    case 7: {
      const length = Math.floor(next() * 4);
      return Array.from({ length }, () => randomValue(next, depth + 1));
    }
    default: {
      const out: Record<string, unknown> = {};
      const count = Math.floor(next() * 5);
      for (let i = 0; i < count; i++) {
        out[KEYS[Math.floor(next() * KEYS.length)]] = randomValue(
          next,
          depth + 1,
        );
      }
      return out;
    }
  }
}

describe('state snapshot sanitizers', () => {
  const sanitizers = [
    sanitizeGridStateSnapshot,
    sanitizeTreeListStateSnapshot,
    sanitizePivotGridStateSnapshot,
  ];

  it('keeps a valid grid snapshot intact', () => {
    const snapshot = {
      sort: [{ field: 'name', dir: 'asc' }],
      group: [{ field: 'city', dir: 'desc', interval: 'month' }],
      filter: {
        row: [['age', { type: 'binary', field: 'age', op: 'gt', value: 3 }]],
        header: [['city', ['Ankara', null]]],
        builder: {
          type: 'and',
          operands: [
            {
              type: 'not',
              operand: { type: 'binary', field: 'x', op: 'isnull' },
            },
          ],
        },
        searchText: 'abc',
      },
      paging: { pageIndex: 2, pageSize: 20 },
      columns: {
        order: ['a', 'b'],
        widths: [['a', 120]],
        pins: [
          ['a', 'left'],
          ['b', false],
        ],
        hidden: ['c'],
      },
    };
    expect(sanitizeGridStateSnapshot(snapshot)).toEqual(snapshot);
    expect(sanitizeGridStateSnapshot(snapshot)).not.toBe(snapshot);
  });

  it('keeps Date filter operands of an in-memory snapshot', () => {
    const when = new Date(2026, 0, 2);
    const safe = sanitizeGridStateSnapshot({
      filter: {
        row: [['d', { type: 'binary', field: 'd', op: 'ge', value: when }]],
      },
    });
    const row = safe?.filter?.row?.[0][1];
    expect(row?.type === 'binary' && row.value).toEqual(when);
  });

  it('drops unknown keys and wrongly typed entries', () => {
    expect(
      sanitizeGridStateSnapshot({
        sort: [
          { field: 'a', dir: 'up' },
          { field: 1 },
          { field: 'b', dir: 'desc', x: 1 },
        ],
        paging: { pageSize: -5, pageIndex: 'x' },
        columns: {
          widths: [['a', 'wide'], ['b', 40], 'c'],
          pins: [['a', 'top']],
        },
        filter: { builder: { type: 'eval', code: 'x' }, searchText: 5 },
        extra: 'dropped',
      }),
    ).toEqual({
      sort: [{ field: 'b', dir: 'desc' }],
      paging: {},
      columns: { widths: [['b', 40]], pins: [] },
      filter: {},
    });
    expect(
      sanitizeTreeListStateSnapshot({
        expansion: { toggled: [1, 'a', {}, null] },
        group: [{ field: 'a', dir: 'asc' }], // not a tree-list slice
      }),
    ).toEqual({ expansion: { toggled: [1, 'a'] } });
    expect(
      sanitizePivotGridStateSnapshot({
        fields: [
          { id: 'a', area: 'row', areaIndex: 0, summaryType: 'eval' },
          { id: 'b', area: 'nowhere' },
        ],
        fieldPanelCollapsed: 'yes',
      }),
    ).toEqual({ fields: [{ id: 'a', area: 'row', areaIndex: 0 }] });
  });

  it('rejects prototype keys at any depth', () => {
    for (const sanitize of sanitizers) {
      expect(sanitize(JSON.parse('{"__proto__":{"polluted":1}}'))).toBeNull();
      expect(
        sanitize(
          JSON.parse('{"sort":[{"field":"a","dir":"asc","constructor":{}}]}'),
        ),
      ).toBeNull();
      expect(
        sanitize(JSON.parse('{"filter":{"header":[["a",[{"prototype":1}]]]}}')),
      ).toBeNull();
    }
    expect(isUnsafeStateKey('__proto__')).toBe(true);
    expect(isUnsafeStateKey('sort')).toBe(false);
  });

  it('returns null for non-object input', () => {
    for (const sanitize of sanitizers) {
      for (const value of [null, undefined, 1, 'x', [], [{}], true]) {
        expect(sanitize(value)).toBeNull();
      }
    }
  });

  it('parseStateJson never throws and refuses prototype keys', () => {
    expect(parseStateJson('{not json')).toBeUndefined();
    expect(parseStateJson('{"a":{"__proto__":{"x":1}}}')).toBeUndefined();
    expect(parseStateJson('{"a":[1,2]}')).toEqual({ a: [1, 2] });
  });

  it('fuzz: random input never throws and never pollutes Object.prototype', () => {
    const next = rng(0x5eed);
    for (let i = 0; i < 1000; i++) {
      const value = randomValue(next, 0);
      const text = JSON.stringify(value) ?? 'null';
      for (const sanitize of sanitizers) {
        expect(() => sanitize(value)).not.toThrow();
        expect(() => sanitize(parseStateJson(text))).not.toThrow();
        const out = sanitize(JSON.parse(text));
        // the result is plain data: re-serialising it never throws either
        expect(() => JSON.stringify(out)).not.toThrow();
      }
      // garbage text, truncated JSON
      expect(() =>
        parseStateJson(text.slice(0, i % (text.length + 1))),
      ).not.toThrow();
    }
    // explicit pollution payloads
    for (const payload of [
      '{"__proto__":{"polluted":true}}',
      '{"constructor":{"prototype":{"polluted":true}}}',
      '{"sort":[{"__proto__":{"polluted":true},"field":"a","dir":"asc"}]}',
    ]) {
      for (const sanitize of sanitizers) {
        const out = sanitize(JSON.parse(payload)) ?? {};
        Object.assign({}, out);
        JSON.parse(JSON.stringify(out));
      }
    }
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });
});
