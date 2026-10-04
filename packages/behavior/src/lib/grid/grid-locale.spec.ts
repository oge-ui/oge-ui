import { ogeMoreTagsText } from '../input/input-config';
import { formatUploadMessage } from '../upload/upload-messages';
import { OGE_DEFAULT_UPLOAD_MESSAGES } from '../upload/upload-messages';
import { OgeGridAnnouncements, rowCountText } from './grid-announcements';
import {
  buildRowFilterExpr,
  resolveOgeGridColumns,
  type OgeGridColumnSpec,
} from './grid-columns';
import { OGE_DEFAULT_GRID_MESSAGES } from './grid-config';
import {
  ogeExportCellText,
  ogeExportColumnOf,
  ogeSummaryText,
} from './grid-export';
import { rowFilterExpr } from './grid-filtering';
import { ogeGroupValueText } from './grid-grouping';
import { formatCellValue, headerValueText } from './grid-header-filter';

const JAN_5 = new Date(2024, 0, 5, 14, 7);

function spec(
  overrides: Partial<OgeGridColumnSpec<Record<string, unknown>>>,
): OgeGridColumnSpec<Record<string, unknown>> {
  return {
    field: 'value',
    caption: undefined,
    width: undefined,
    dataType: 'number',
    alignment: undefined,
    format: undefined,
    visible: true,
    sortable: true,
    filterable: true,
    filterOperator: undefined,
    minWidth: undefined,
    lookup: undefined,
    calculateCellValue: undefined,
    calculateFilterExpression: undefined,
    hidingPriority: undefined,
    pinned: false,
    editable: true,
    cellTemplate: undefined,
    headerTemplate: undefined,
    editTemplate: undefined,
    bandCaption: undefined,
    source: undefined,
    ...overrides,
  };
}

function resolve(
  specs: OgeGridColumnSpec<Record<string, unknown>>[],
  locale: string | undefined,
) {
  return resolveOgeGridColumns({
    specs,
    columnDefs: () => undefined,
    firstDataRow: () => undefined,
    widthOverrides: new Map(),
    pinOverrides: new Map(),
    order: null,
    adaptiveHiddenIds: new Set(),
    locale,
  });
}

describe('formatCellValue — locale', () => {
  it('formats default date cells in the locale', () => {
    expect(formatCellValue(JAN_5, 'date', undefined, 'en-US')).toBe('1/5/2024');
    expect(formatCellValue(JAN_5, 'date', undefined, 'de-DE')).toBe('5.1.2024');
    expect(formatCellValue(JAN_5, 'datetime', undefined, 'de-DE')).toBe(
      '05.01.24, 14:07',
    );
  });

  it('keeps unformatted numbers raw', () => {
    expect(formatCellValue(1234.5, 'number', undefined, 'de-DE')).toBe(
      '1234.5',
    );
  });

  it('renders declarative formats in the locale', () => {
    const currency = { type: 'currency', currency: 'EUR' } as const;
    expect(formatCellValue(1234.5, 'number', currency, 'de-DE')).toMatch(
      /^1\.234,50\s€$/,
    );
    expect(formatCellValue(1234.5, 'number', currency, 'en-US')).toBe(
      '€1,234.50',
    );
    expect(formatCellValue(null, 'number', currency, 'en-US')).toBe('');
  });

  it('function formats win and ignore the locale', () => {
    expect(formatCellValue(5, 'number', (v) => `#${String(v)}`, 'de-DE')).toBe(
      '#5',
    );
  });
});

describe('resolveOgeGridColumns — locale', () => {
  it('compiles declarative formats for the locale and stamps it on columns', () => {
    const [de] = resolve(
      [spec({ format: { type: 'number', minimumFractionDigits: 2 } })],
      'de-DE',
    );
    expect(de.locale).toBe('de-DE');
    expect(typeof de.format).toBe('function');
    expect(de.format?.(1234.5)).toBe('1.234,50');
    const [tr] = resolve([spec({ format: { type: 'percent' } })], 'tr-TR');
    expect(tr.format?.(0.5)).toBe('%50');
  });

  it('passes function formats through untouched', () => {
    const fn = (value: unknown) => String(value);
    const [column] = resolve([spec({ format: fn })], 'de-DE');
    expect(column.format).toBe(fn);
  });
});

describe('filter row — locale number parsing', () => {
  it('reads typed numbers in the column locale', () => {
    expect(buildRowFilterExpr('n', 'number', '1,5', 'eq', 'de-DE')).toEqual({
      type: 'binary',
      field: 'n',
      op: 'eq',
      value: 1.5,
    });
    expect(
      buildRowFilterExpr('n', 'number', '1.234,5', 'eq', 'tr-TR'),
    ).toMatchObject({ value: 1234.5 });
    expect(
      buildRowFilterExpr('n', 'number', '1,234.5', 'eq', 'en-US'),
    ).toMatchObject({ value: 1234.5 });
  });

  it('keeps Number() semantics without a locale', () => {
    expect(buildRowFilterExpr('n', 'number', '1.5')).toMatchObject({
      value: 1.5,
    });
    expect(buildRowFilterExpr('n', 'number', 'abc')).toBeNull();
  });

  it('rowFilterExpr uses the resolved column locale', () => {
    const [column] = resolve([spec({})], 'de-DE');
    expect(rowFilterExpr(column, '2,5')).toMatchObject({ value: 2.5 });
  });
});

describe('header filter, group captions, summaries and exports — locale', () => {
  const messages = {
    blankValue: '(Blank)',
    booleanTrue: 'Yes',
    booleanFalse: 'No',
  };

  it('header-filter values follow the column locale and format', () => {
    expect(
      headerValueText(JAN_5, { dataType: 'date', messages, locale: 'de-DE' }),
    ).toBe('5.1.2024');
    expect(
      headerValueText(1500, {
        dataType: 'number',
        format: { type: 'number' },
        messages,
        locale: 'de-DE',
      }),
    ).toBe('1.500');
    expect(headerValueText(1500, { dataType: 'number', messages })).toBe(
      '1500',
    );
  });

  it('group captions use the locale', () => {
    const intervals = {
      groupWeekPattern: 'Week of {date}',
      groupQuarterPattern: 'Q{quarter} {year}',
      groupRangePattern: '{from} – {to}',
    };
    expect(
      ogeGroupValueText(
        JAN_5,
        { dataType: 'date', locale: 'de-DE' },
        undefined,
        intervals,
      ),
    ).toBe('5.1.2024');
    expect(
      ogeGroupValueText(
        JAN_5,
        { dataType: 'date', locale: 'de-DE' },
        'week',
        intervals,
      ),
    ).toBe('Week of 5.1.2024');
    expect(
      ogeGroupValueText(
        1000,
        {
          dataType: 'number',
          format: (v) => new Intl.NumberFormat('de-DE').format(Number(v)),
          locale: 'de-DE',
        },
        1000,
        intervals,
      ),
    ).toBe('1.000 – 2.000');
  });

  it('summaries and export text use the column locale', () => {
    const [column] = resolve(
      [spec({ format: { type: 'currency', currency: 'EUR' } })],
      'de-DE',
    );
    expect(
      ogeSummaryText(
        { field: 'value', type: 'sum', value: 1500 },
        column,
        OGE_DEFAULT_GRID_MESSAGES,
      ),
    ).toMatch(/^Sum: 1\.500,00\s€$/);
    const [dateColumn] = resolve(
      [spec({ dataType: 'date', field: 'when' })],
      'de-DE',
    );
    const exportColumn = ogeExportColumnOf(dateColumn, messages);
    expect(exportColumn.locale).toBe('de-DE');
    expect(ogeExportCellText(exportColumn, { when: JAN_5 })).toBe('5.1.2024');
  });
});

describe('plural-aware grid messages', () => {
  it('rowCountText picks the plural form', () => {
    expect(rowCountText(OGE_DEFAULT_GRID_MESSAGES, 1, 'en')).toBe('1 row');
    expect(rowCountText(OGE_DEFAULT_GRID_MESSAGES, 3, 'en')).toBe('3 rows');
    expect(rowCountText(OGE_DEFAULT_GRID_MESSAGES, 1500, 'de-DE')).toBe(
      '1.500 rows',
    );
    const ru = {
      ...OGE_DEFAULT_GRID_MESSAGES,
      rowCountAnnouncement:
        '{count, plural, one {# строка} few {# строки} many {# строк} other {# строки}}',
    };
    expect(rowCountText(ru, 21, 'ru')).toBe('21 строка');
    expect(rowCountText(ru, 24, 'ru')).toBe('24 строки');
    expect(rowCountText(ru, 25, 'ru')).toBe('25 строк');
  });

  it('honours the deprecated singular key with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const messages = {
      ...OGE_DEFAULT_GRID_MESSAGES,
      rowCountAnnouncement: '{count} satır',
      rowCountOneAnnouncement: 'Tek satır',
    };
    expect(rowCountText(messages, 1, 'tr')).toBe('Tek satır');
    expect(rowCountText(messages, 2, 'tr')).toBe('2 satır');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('rowCountOneAnnouncement'),
    );
    warn.mockRestore();
  });

  it('selection and cell-write announcements are plural-aware', () => {
    const spoken: string[] = [];
    const announcements = new OgeGridAnnouncements({
      announce: (text) => spoken.push(text),
      messages: () => OGE_DEFAULT_GRID_MESSAGES,
      enabled: () => true,
      caption: (field) => field,
      locale: () => 'en-US',
    });
    announcements.selectionCount(1);
    announcements.selectionCount(1200);
    announcements.cellsWritten('paste', 1);
    announcements.cellsWritten('fill', 4);
    announcements.cellsWritten('undo', 1);
    announcements.cellsWritten('redo', 2);
    expect(spoken).toEqual([
      '1 row selected',
      '1,200 rows selected',
      '1 cell pasted',
      '4 cells filled',
      'Undo: 1 cell restored',
      'Redo: 2 cells changed',
    ]);
  });
});

describe('plural-aware input and upload messages', () => {
  it('moreTags accepts plain and ICU templates', () => {
    expect(ogeMoreTagsText('+{count} more', 3, 'en')).toBe('+3 more');
    expect(
      ogeMoreTagsText(
        '{count, plural, one {+# weiteres} other {+# weitere}}',
        1,
        'de',
      ),
    ).toBe('+1 weiteres');
  });

  it('upload announcements pluralize', () => {
    const { filesAdded, allCompleted } =
      OGE_DEFAULT_UPLOAD_MESSAGES.announcements;
    expect(formatUploadMessage(filesAdded, { count: '1' }, 'en')).toBe(
      '1 file added',
    );
    expect(formatUploadMessage(filesAdded, { count: '4' }, 'en')).toBe(
      '4 files added',
    );
    expect(
      formatUploadMessage(allCompleted, { succeeded: '2', total: '3' }, 'en'),
    ).toBe('2 of 3 files uploaded');
    expect(
      formatUploadMessage(allCompleted, { succeeded: '1', total: '1' }, 'en'),
    ).toBe('1 of 1 file uploaded');
  });
});
