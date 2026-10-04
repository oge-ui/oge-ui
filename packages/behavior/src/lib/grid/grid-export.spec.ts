import { describe, expect, it } from 'vitest';
import {
  buildOgeExportItems,
  mergeOgeExportStyles,
  ogeExportColumnsOf,
  ogeExportHeaderCells,
  ogeExportItemsOf,
  ogeExportScope,
  ogeGridExportItems,
  ogeGridExportLoadOptions,
} from './grid-export';

interface Sale {
  region: string;
  city: string;
  amount: number;
}

const ROWS: Sale[] = [
  { region: 'EU', city: 'Paris', amount: 10 },
  { region: 'EU', city: 'Rome', amount: 20 },
  { region: 'US', city: 'Austin', amount: 5 },
];

const text = {
  summaryText: (s: { type: string; value: unknown }) =>
    `${s.type}: ${String(s.value)}`,
  groupText: (g: { value: unknown; count: number }) =>
    `${String(g.value)} (${g.count})`,
};

describe('ogeExportColumnsOf', () => {
  it('keeps field columns, resolves widths, alignment and display formats', () => {
    const columns = ogeExportColumnsOf<Sale & { active: boolean }>(
      [
        {
          caption: 'Amount',
          field: 'amount',
          dataType: 'number',
          accessor: (r) => r.amount,
          width: '120px',
          pinned: 'left',
          bandCaption: 'Money',
        },
        {
          caption: 'Active',
          field: 'active',
          dataType: 'boolean',
          accessor: (r) => r.active,
          width: '1fr',
        },
        {
          caption: 'Commands',
          field: undefined,
          dataType: 'string',
          accessor: () => null,
        },
      ],
      { booleanTrue: 'Yes', booleanFalse: 'No' },
    );
    expect(columns).toHaveLength(2);
    expect(columns[0]).toMatchObject({
      width: 120,
      alignment: 'end',
      pinned: 'left',
      bandCaption: 'Money',
    });
    expect(columns[1].width).toBeUndefined();
    expect(columns[1].alignment).toBe('start');
    expect(columns[1].format?.(true)).toBe('Yes');
    expect(columns[1].format?.(null)).toBe('');
  });
});

describe('buildOgeExportItems', () => {
  it('returns flat data lines without groups and closes with totals', () => {
    const items = buildOgeExportItems(ROWS, {
      ...text,
      totalSummary: [{ field: 'amount', type: 'sum' }],
      summaryLabel: () => 'Sum',
    });
    expect(items.map((item) => item.kind)).toEqual([
      'data',
      'data',
      'data',
      'total',
    ]);
    const total = items[3];
    expect(total.kind === 'total' && total.summaries[0]).toMatchObject({
      field: 'amount',
      value: 35,
      text: 'sum: 35',
      label: 'Sum',
    });
  });

  it('nests group headers, data at the group depth, and footer summaries', () => {
    const items = buildOgeExportItems(ROWS, {
      ...text,
      groups: [{ field: 'region' }],
      groupSummary: [
        { field: 'amount', type: 'sum' },
        { field: 'amount', type: 'count' },
      ],
      groupFooterFields: new Set(['amount']),
    });
    expect(
      items.map((item) => `${item.kind}:${'level' in item ? item.level : ''}`),
    ).toEqual([
      'group:0',
      'data:1',
      'data:1',
      'groupFooter:1',
      'group:0',
      'data:1',
      'groupFooter:1',
    ]);
    const eu = items[0];
    expect(eu.kind === 'group' && eu.text).toBe('EU (2)');
    // footer-position summaries leave the header, land on the footer
    expect(eu.kind === 'group' && eu.summaries).toEqual([]);
    const footer = items[3];
    expect(footer.kind === 'groupFooter' && footer.summaries[0].value).toBe(30);
  });

  it('keeps header-position summaries on the group line and uses server totals', () => {
    const items = buildOgeExportItems(ROWS, {
      ...text,
      groups: [{ field: 'region' }, { field: 'city' }],
      groupSummary: [{ field: 'amount', type: 'max' }],
      totalSummary: [{ field: 'amount', type: 'sum' }],
      totalValues: [999],
    });
    const first = items[0];
    expect(first.kind === 'group' && first.summaries[0].value).toBe(20);
    expect(items[1]).toMatchObject({ kind: 'group', level: 1, value: 'Paris' });
    expect(items[2]).toMatchObject({ kind: 'data', level: 2 });
    const last = items[items.length - 1];
    expect(last.kind === 'total' && last.summaries[0].value).toBe(999);
  });
});

describe('ogeExportHeaderCells', () => {
  const base = { dataType: 'string' as const, accessor: () => '' };
  it('is one caption row without bands', () => {
    const header = ogeExportHeaderCells([
      { ...base, caption: 'A', field: 'a' },
      { ...base, caption: 'B', field: 'b' },
    ]);
    expect(header.rows).toBe(1);
    expect(header.cells.map((cell) => cell.caption)).toEqual(['A', 'B']);
  });

  it('merges adjacent bands and lets band-less columns span both rows', () => {
    const header = ogeExportHeaderCells([
      { ...base, caption: 'Id', field: 'id' },
      { ...base, caption: 'City', field: 'city', bandCaption: 'Address' },
      { ...base, caption: 'Zip', field: 'zip', bandCaption: 'Address' },
    ]);
    expect(header.rows).toBe(2);
    expect(header.cells[0]).toMatchObject({ caption: 'Id', rowSpan: 2 });
    expect(header.cells[1]).toMatchObject({
      caption: 'Address',
      colSpan: 2,
      columnIndex: undefined,
    });
    expect(
      header.cells.slice(2).map((cell) => [cell.row, cell.column]),
    ).toEqual([
      [2, 2],
      [2, 3],
    ]);
  });
});

describe('ogeGridExportLoadOptions / ogeGridExportItems', () => {
  const messages = {
    summaryLabels: {
      sum: 'Sum',
      avg: 'Avg',
      min: 'Min',
      max: 'Max',
      count: 'Count',
      custom: 'Custom',
    },
    groupSummaryPattern: '{label} of {column}: {value}',
    totalSummaryPattern: '{label}: {value}',
  };
  const fieldInfo = (field: string) =>
    field === 'amount'
      ? {
          caption: 'Amount',
          dataType: 'number' as const,
          format: (v: unknown) => `$${String(v)}`,
        }
      : { caption: 'Region', dataType: 'string' as const };

  it('puts group fields first in the sort, pages only for scope page', () => {
    const load = {
      sort: [
        { field: 'amount', dir: 'desc' as const },
        { field: 'region', dir: 'asc' as const },
      ],
      group: [{ field: 'region', dir: 'desc' as const }],
      skip: 20,
      take: 10,
      searchText: 'x',
    };
    expect(ogeGridExportLoadOptions(load, 'all', true)).toEqual({
      sort: [
        { field: 'region', dir: 'desc' },
        { field: 'amount', dir: 'desc' },
      ],
      searchText: 'x',
    });
    expect(ogeGridExportLoadOptions(load, 'page', false)).toMatchObject({
      sort: load.sort,
      skip: 20,
      take: 10,
    });
  });

  it('words group rows like the grid and formats summaries', () => {
    const items = ogeGridExportItems({
      rows: ROWS,
      loadOptions: {
        group: [{ field: 'region', dir: 'asc' }],
        groupSummary: [{ field: 'amount', type: 'sum' }],
        totalSummary: [{ field: 'amount', type: 'sum' }],
      },
      fieldInfo,
      groupFooterFields: new Set(),
      messages,
      options: {},
    });
    expect(items?.[0]).toMatchObject({
      kind: 'group',
      text: 'Region: EU (2) Sum of Amount: $30',
    });
    const total = items?.at(-1);
    expect(total?.kind === 'total' && total.summaries[0]).toMatchObject({
      text: 'Sum: $35',
      label: 'Sum',
    });
  });

  it('is undefined for a flat, unsummarized view and honours the switches', () => {
    const base = {
      rows: ROWS,
      fieldInfo,
      groupFooterFields: new Set<string>(),
      messages,
    };
    expect(
      ogeGridExportItems({ ...base, loadOptions: {}, options: {} }),
    ).toBeUndefined();
    expect(
      ogeGridExportItems({
        ...base,
        loadOptions: {
          group: [{ field: 'region', dir: 'asc' }],
          totalSummary: [{ field: 'amount', type: 'sum' }],
        },
        options: { groups: false, summaries: false },
      }),
    ).toBeUndefined();
  });
});

describe('export helpers', () => {
  it('ogeExportItemsOf falls back to flat rows', () => {
    expect(ogeExportItemsOf({ rows: ROWS, columns: [] })).toHaveLength(3);
  });
  it('mergeOgeExportStyles skips undefined keys, later wins', () => {
    expect(
      mergeOgeExportStyles({ bold: true, color: '#111111' }, undefined, {
        color: '#222222',
        italic: undefined,
      }),
    ).toEqual({ bold: true, color: '#222222' });
  });
  it('ogeExportScope maps selectedRowsOnly', () => {
    expect(ogeExportScope({ selectedRowsOnly: true })).toBe('selection');
    expect(ogeExportScope({ scope: 'page' })).toBe('page');
    expect(ogeExportScope({})).toBe('all');
  });
});
