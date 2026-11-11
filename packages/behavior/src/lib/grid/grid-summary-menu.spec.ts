import {
  createFilterPredicate,
  sanitizeGridStateSnapshot,
  type SummaryDescriptor,
} from '@oge-ui/core';
import { OGE_DEFAULT_GRID_MESSAGES } from './grid-config';
import { OgeGridStateCore } from './grid-state-core';
import { ogeSummaryMenuChoices, ogeSummaryMenuItem } from './grid-summary-menu';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

const plainReactivity: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next: T) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

describe('column summary picker', () => {
  it('offers Count everywhere and the numeric aggregates on numbers only', () => {
    expect(ogeSummaryMenuChoices('string')).toEqual(['count']);
    expect(ogeSummaryMenuChoices('date')).toEqual(['count']);
    expect(ogeSummaryMenuChoices('number')).toEqual([
      'count',
      'sum',
      'avg',
      'min',
      'max',
    ]);
  });

  it('builds radio rows that reflect and apply the pick', () => {
    const picks: unknown[] = [];
    const item = ogeSummaryMenuItem({
      dataType: 'number',
      current: 'sum',
      messages: OGE_DEFAULT_GRID_MESSAGES,
      select: (type) => picks.push(type),
    });
    expect(item.text).toBe('Summary');
    const rows = item.items ?? [];
    expect(rows.map((row) => [row.text, row.checked])).toEqual([
      ['Column default', false],
      ['None', false],
      ['Count', false],
      ['Sum', true],
      ['Avg', false],
      ['Min', false],
      ['Max', false],
    ]);
    expect(rows.every((row) => row.type === 'radio')).toBe(true);
    rows[0].action?.();
    rows[1].action?.();
    rows[4].action?.();
    expect(picks).toEqual([null, 'none', 'avg']);
  });
});

describe('user total summaries in the grid state', () => {
  const declared: SummaryDescriptor[] = [
    { field: 'qty', type: 'sum' },
    { field: 'price', type: 'avg' },
  ];

  it('replace the column totals, hide them with none and persist', () => {
    const state = new OgeGridStateCore(plainReactivity);
    state.grouping.setSummaries([], declared);
    state.grouping.setUserTotal('qty', 'max');
    state.grouping.setUserTotal('price', 'none');
    state.grouping.setUserTotal('name', 'count');
    expect(state.grouping.totalSummary()).toEqual([
      { field: 'qty', type: 'max' },
      { field: 'name', type: 'count' },
    ]);
    expect(state.loadOptions().totalSummary).toEqual([
      { field: 'qty', type: 'max' },
      { field: 'name', type: 'count' },
    ]);
    const snapshot = state.snapshot();
    expect(snapshot.summaries).toEqual([
      ['qty', 'max'],
      ['price', 'none'],
      ['name', 'count'],
    ]);

    const restored = new OgeGridStateCore(plainReactivity);
    restored.grouping.setSummaries([], declared);
    restored.applySnapshot(
      sanitizeGridStateSnapshot(JSON.parse(JSON.stringify(snapshot)))!,
    );
    expect(restored.grouping.totalSummary()).toEqual(
      state.grouping.totalSummary(),
    );
    restored.grouping.setUserTotal('qty', null);
    restored.grouping.setUserTotal('price', null);
    restored.grouping.setUserTotal('name', null);
    expect(restored.grouping.totalSummary()).toEqual(declared);
  });

  it('drops unknown summary types from untrusted state', () => {
    const clean = sanitizeGridStateSnapshot({
      summaries: [['qty', 'sum'], ['qty', 'custom'], ['x', 'evil'], 'nope'],
    });
    expect(clean?.summaries).toEqual([['qty', 'sum']]);
  });
});

describe('the "(Blank)" value-list item', () => {
  it('becomes a blank check next to the checked values', () => {
    const state = new OgeGridStateCore(plainReactivity);
    state.filter.setHeaderFilter('city', ['Ankara', null]);
    const test = createFilterPredicate<{ city: string | null }>(
      state.filter.combinedExpr()!,
    );
    expect(
      ['Ankara', '', '  ', null, 'İzmir'].map((city) => test({ city })),
    ).toEqual([true, true, true, true, false]);
    state.filter.blankOperatorOf = () => 'isnull';
    state.filter.setHeaderFilter('qty', [null]);
    expect(state.filter.headerExpr('qty', [null])).toEqual({
      type: 'binary',
      field: 'qty',
      op: 'isnull',
    });
    // nothing checked still means nothing matches
    expect(state.filter.headerExpr('city', [])).toEqual({
      type: 'binary',
      field: 'city',
      op: 'in',
      value: [],
    });
  });
});
