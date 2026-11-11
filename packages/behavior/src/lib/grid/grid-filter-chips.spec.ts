import { OGE_DEFAULT_GRID_MESSAGES } from './grid-config';
import { dateFilterExpr, dateRangeFilterExpr } from './grid-columns';
import { ogeFilterChipText, ogeGridFilterChips } from './grid-filter-chips';
import type { OgeGridFilterChipColumn } from './grid-filter-chips';

const COLUMNS: Record<string, OgeGridFilterChipColumn> = {
  name: { caption: 'Name', dataType: 'string' },
  qty: { caption: 'Quantity', dataType: 'number' },
  hired: { caption: 'Hired', dataType: 'date', locale: 'en-US' },
  city: { caption: 'City', dataType: 'string' },
};
const columnOf = (field: string) => COLUMNS[field];
const m = OGE_DEFAULT_GRID_MESSAGES;

describe('active filter chips', () => {
  it('names the column, the operator and the value of each filter', () => {
    const chips = ogeGridFilterChips(
      {
        row: [
          [
            'name',
            { type: 'binary', field: 'name', op: 'contains', value: 'ali' },
          ],
          ['hf:qty', { type: 'binary', field: 'qty', op: 'isnull' }],
        ],
        header: [['city', ['Kaya, Mehmet', 'Ankara', null, 'İzmir', 'Bursa']]],
        builder: null,
        searchText: '  istanbul ',
      },
      columnOf,
      m,
    );
    expect(chips.map((c) => [c.id, c.kind, c.slot, c.label, c.text])).toEqual([
      ['row:name', 'row', 'name', 'Name', 'Contains · ali'],
      ['row:hf:qty', 'row', 'hf:qty', 'Quantity', 'Is blank'],
      [
        'header:city',
        'header',
        'city',
        'City',
        'Is any of · Kaya, Mehmet, Ankara, (Blank) +2',
      ],
      ['search', 'search', '', 'Search', '“istanbul”'],
    ]);
  });

  it('reads the grid date idioms as one condition', () => {
    const day = new Date(2026, 2, 14);
    const hired = COLUMNS['hired'];
    expect(
      ogeFilterChipText(dateFilterExpr('hired', 'eq', day), hired, m),
    ).toBe('Equals · 3/14/2026');
    expect(
      ogeFilterChipText(dateFilterExpr('hired', 'ne', day), hired, m),
    ).toBe('Does not equal · 3/14/2026');
    // an open range is a real filter: it narrows, so it is a chip
    const from = dateRangeFilterExpr('hired', day, null)!;
    expect(ogeFilterChipText(from, hired, m)).toBe(
      'Greater than or equal · 3/14/2026',
    );
  });

  it('describes the builder expression with captions and emits nothing when idle', () => {
    const chips = ogeGridFilterChips(
      {
        row: [],
        header: [],
        builder: { type: 'binary', field: 'qty', op: 'gt', value: 5 },
        searchText: '',
      },
      columnOf,
      m,
      [{ field: 'qty', caption: 'Quantity', dataType: 'number' }],
    );
    expect(chips).toEqual([
      {
        id: 'builder',
        kind: 'builder',
        slot: '',
        label: 'Custom filter',
        text: "[Quantity] Greater than '5'",
      },
    ]);
    expect(
      ogeGridFilterChips(
        { row: [], header: [], builder: null, searchText: '   ' },
        columnOf,
        m,
      ),
    ).toEqual([]);
  });
});
