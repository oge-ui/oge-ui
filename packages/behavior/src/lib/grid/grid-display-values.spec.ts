import type {
  DataSource,
  DistinctOptions,
  GridStateSnapshot,
} from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { ogeColumnFilterValues } from './grid-filter-extras';
import { ogeSortHeaderValuesByText } from './grid-header-filter';
import { OgeHeaderValuesLoader } from './grid-header-values';
import { ogeParseSavedViews } from './grid-saved-views';
import { OgeGridStateCore } from './grid-state-core';

const rx: OgeReactivityAdapter = {
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

interface Row {
  first: string;
  last: string;
  status: number;
}

describe('ogeColumnFilterValues', () => {
  const STATUS = [
    { value: 0, text: 'Open' },
    { value: 1, text: 'Closed' },
  ];
  const result = ogeColumnFilterValues<Row>([
    { field: 'name', calculateFilterValue: (r) => `${r.first} ${r.last}` },
    { field: 'status', lookupItems: STATUS, filterField: 'statusId' },
    { field: 'last' },
    { field: undefined, calculateFilterValue: () => 'x' },
  ]);
  const row: Row = { first: 'Ada', last: 'Kaya', status: 1 };

  it('collects filter values, lookup search text and server fields', () => {
    expect(Object.keys(result.filterValues ?? {})).toEqual(['name']);
    expect(result.filterValues?.['name'](row)).toBe('Ada Kaya');
    expect(result.searchValues?.['status'](row)).toBe('Closed');
    expect(result.fieldMap).toEqual({ status: 'statusId' });
  });

  it('leaves the maps out when no column needs them', () => {
    const none = ogeColumnFilterValues<Row>([{ field: 'last' }]);
    expect(none.filterValues).toBeUndefined();
    expect(none.searchValues).toBeUndefined();
    expect(none.fieldMap).toEqual({});
  });
});

describe('ogeSortHeaderValuesByText', () => {
  it('orders by label and keeps the blank item last', () => {
    const text = (v: unknown) => ['Zeytin', 'Ilık', 'çam'][v as number];
    const tr = new Intl.Collator('tr');
    expect(
      ogeSortHeaderValuesByText([0, null, 1, 2], text, (a, b) =>
        tr.compare(a, b),
      ),
    ).toEqual([2, 1, 0, null]);
  });
});

describe('filterField', () => {
  it('renames the load filter, the state keeps the column field', () => {
    const core = new OgeGridStateCore(rx);
    core.filter.setRowFilter('customer', {
      type: 'binary',
      field: 'customer',
      op: 'contains',
      value: 'ka',
    });
    core.filter.setFieldMap({ customer: 'customer.lastName' });
    expect(core.loadOptions().filter).toEqual({
      type: 'binary',
      field: 'customer.lastName',
      op: 'contains',
      value: 'ka',
    });
    expect(core.snapshot().filter?.row?.[0][0]).toBe('customer');
  });

  it('asks the value list for the server field', () => {
    const asked: [string, DistinctOptions][] = [];
    const source = {
      capabilities: {
        sort: true,
        filter: true,
        group: true,
        paging: true,
        summary: true,
      },
      load: () => Promise.resolve({ data: [] }),
      keyOf: () => 0,
      distinct: (field: string, options: DistinctOptions = {}) => {
        asked.push([field, options]);
        return Promise.resolve([]);
      },
    } as DataSource<never>;
    const loader = new OgeHeaderValuesLoader({
      source: () => source,
      filterFor: () => ({
        type: 'binary',
        field: 'region',
        op: 'eq',
        value: 'EU',
      }),
      searchText: () => '',
      limit: () => 10,
      fieldMap: () => ({ customer: 'customerId', region: 'regionCode' }),
      onValues: () => undefined,
    });
    loader.open('customer');
    expect(asked[0][0]).toBe('customerId');
    expect(asked[0][1].filter).toEqual({
      type: 'binary',
      field: 'regionCode',
      op: 'eq',
      value: 'EU',
    });
    loader.close();
  });
});

describe('saved views and stateMigrations', () => {
  it('upgrades every stored view', () => {
    const old: GridStateSnapshot = { sort: [{ field: 'state', dir: 'asc' }] };
    const raw = JSON.stringify([{ name: 'Old', state: old }]);
    const views = ogeParseSavedViews(raw, [
      (state) =>
        JSON.parse(JSON.stringify(state).replace('"state"', '"status"')),
    ]);
    expect(views[0].state.sort).toEqual([{ field: 'status', dir: 'asc' }]);
    expect(views[0].state.version).toBe(1);
  });
});
