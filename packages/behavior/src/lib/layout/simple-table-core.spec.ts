import {
  OGE_DEFAULT_SIMPLE_TABLE_MESSAGES,
  ogeSimpleTableCellText,
  ogeSimpleTablePage,
  ogeSimpleTablePageInfo,
  resolveOgeSimpleTableColumns,
  resolveOgeSimpleTableConfig,
} from './simple-table-core';

describe('simple table core', () => {
  it('derives columns from the first row when none are given', () => {
    const columns = resolveOgeSimpleTableColumns(undefined, [
      { orderNo: 1, unit_price: 2 },
    ]);
    expect(columns.map((c) => [c.field, c.caption, c.cellClass])).toEqual([
      ['orderNo', 'Order No', 'oge-simple-table-align-start'],
      ['unit_price', 'Unit price', 'oge-simple-table-align-start'],
    ]);
    expect(resolveOgeSimpleTableColumns(undefined, [])).toEqual([]);
    expect(resolveOgeSimpleTableColumns(undefined, [42])).toEqual([]);
  });

  it('resolves captions, alignment and the shared cell class', () => {
    const [qty, note] = resolveOgeSimpleTableColumns(
      [
        { field: 'qty', align: 'end', cssClass: 'num' },
        { caption: 'Note', width: '30%' },
      ],
      [],
    );
    expect(qty.caption).toBe('Qty');
    expect(qty.cellClass).toBe('oge-simple-table-align-end num');
    expect(note.align).toBe('start');
    expect(note.width).toBe('30%');
  });

  it('reads dotted fields and blanks null', () => {
    const row = { customer: { name: 'Kaya, Mehmet' }, note: null };
    expect(ogeSimpleTableCellText(row, { field: 'customer.name' })).toBe(
      'Kaya, Mehmet',
    );
    expect(ogeSimpleTableCellText(row, { field: 'note' })).toBe('');
    expect(ogeSimpleTableCellText(row, { caption: 'x' })).toBe('');
  });

  it('pages and clamps, or shows everything without paging', () => {
    expect(ogeSimpleTablePage(42, true, 10, 4)).toEqual({
      pageIndex: 4,
      pageCount: 5,
      start: 40,
      end: 42,
    });
    expect(ogeSimpleTablePage(42, true, 10, 99).pageIndex).toBe(4);
    expect(ogeSimpleTablePage(42, true, 10, -3).pageIndex).toBe(0);
    expect(ogeSimpleTablePage(0, true, 10, 0)).toEqual({
      pageIndex: 0,
      pageCount: 1,
      start: 0,
      end: 0,
    });
    expect(ogeSimpleTablePage(42, false, 10, 3)).toEqual({
      pageIndex: 0,
      pageCount: 1,
      start: 0,
      end: 42,
    });
  });

  it('formats the range text and merges config messages', () => {
    const page = ogeSimpleTablePage(42, true, 10, 1);
    expect(
      ogeSimpleTablePageInfo(page, 42, OGE_DEFAULT_SIMPLE_TABLE_MESSAGES),
    ).toBe('11–20 of 42');
    expect(
      ogeSimpleTablePageInfo(
        ogeSimpleTablePage(0, true, 10, 0),
        0,
        OGE_DEFAULT_SIMPLE_TABLE_MESSAGES,
      ),
    ).toBe('0–0 of 0');
    const config = resolveOgeSimpleTableConfig({
      pageSize: 5,
      messages: { noData: 'Kayıt yok' },
    });
    expect(config.pageSize).toBe(5);
    expect(config.messages.noData).toBe('Kayıt yok');
    expect(config.messages.nextPage).toBe('Next page');
  });
});
