import {
  OGE_SHEET_MAX_COLUMNS,
  OGE_SHEET_MAX_ROWS,
  formatOgeCellAddress,
  formatOgeR1C1Address,
  formatOgeRangeAddress,
  isOgeCellInSheet,
  ogeCellRange,
  ogeColumnIndex,
  ogeColumnName,
  ogeOffsetCellAddress,
  ogeQuoteSheetName,
  ogeRangeBoundingBox,
  ogeRangeContains,
  ogeRangeContainsRange,
  ogeRangeFromCorners,
  ogeRangeIntersection,
  ogeRangeSize,
  ogeRangesIntersect,
  ogeSheetNameNeedsQuotes,
  parseOgeCellAddress,
  parseOgeR1C1Address,
  parseOgeRangeAddress,
} from './address';

describe('column letters', () => {
  it.each([
    [0, 'A'],
    [25, 'Z'],
    [26, 'AA'],
    [51, 'AZ'],
    [52, 'BA'],
    [701, 'ZZ'],
    [702, 'AAA'],
    [16383, 'XFD'],
  ])('%i ⇄ %s', (index, name) => {
    expect(ogeColumnName(index)).toBe(name);
    expect(ogeColumnIndex(name)).toBe(index);
    expect(ogeColumnIndex(name.toLowerCase())).toBe(index);
  });

  it('rejects what is not a sheet column', () => {
    expect(ogeColumnIndex('')).toBe(-1);
    expect(ogeColumnIndex('XFE')).toBe(-1); // one past the last column
    expect(ogeColumnIndex('AAAA')).toBe(-1);
    expect(ogeColumnIndex('A1')).toBe(-1);
    expect(ogeColumnIndex('Ä')).toBe(-1);
    expect(ogeColumnName(-1)).toBe('');
    expect(ogeColumnName(1.5)).toBe('');
  });

  it('knows the sheet limits', () => {
    expect(OGE_SHEET_MAX_ROWS).toBe(1048576);
    expect(OGE_SHEET_MAX_COLUMNS).toBe(16384);
    expect(isOgeCellInSheet(1048575, 16383)).toBe(true);
    expect(isOgeCellInSheet(1048576, 0)).toBe(false);
    expect(isOgeCellInSheet(0, 16384)).toBe(false);
    expect(isOgeCellInSheet(-1, 0)).toBe(false);
  });
});

describe('A1 cells', () => {
  it('parses relative, absolute and mixed cells', () => {
    expect(parseOgeCellAddress('B7')).toEqual({
      row: 6,
      col: 1,
      rowAbsolute: false,
      colAbsolute: false,
    });
    expect(parseOgeCellAddress('$B$7')).toEqual({
      row: 6,
      col: 1,
      rowAbsolute: true,
      colAbsolute: true,
    });
    expect(parseOgeCellAddress('b$7')).toMatchObject({
      rowAbsolute: true,
      colAbsolute: false,
    });
    expect(parseOgeCellAddress('XFD1048576')).toMatchObject({
      row: 1048575,
      col: 16383,
    });
  });

  it.each([
    '',
    'A',
    '7',
    'A0',
    'A01',
    'A1048577',
    'XFE1',
    'A1 ',
    ' A1',
    'A$',
    '$$A1',
    'A1:B2',
    'Sheet1!A1',
  ])('rejects %j', (text) => {
    expect(parseOgeCellAddress(text)).toBeNull();
  });

  it('formats with the anchors it was given', () => {
    expect(formatOgeCellAddress({ row: 0, col: 0 })).toBe('A1');
    expect(
      formatOgeCellAddress({
        row: 9,
        col: 27,
        rowAbsolute: true,
        colAbsolute: false,
      }),
    ).toBe('AB$10');
  });
});

describe('A1 ranges', () => {
  it('normalises reversed corners and keeps each anchor with its edge', () => {
    const range = parseOgeRangeAddress('D$9:$B2');
    expect(range).toMatchObject({
      kind: 'range',
      top: 1,
      bottom: 8,
      left: 1,
      right: 3,
      topAbsolute: false,
      bottomAbsolute: true,
      leftAbsolute: true,
      rightAbsolute: false,
    });
    expect(range && formatOgeRangeAddress(range)).toBe('$B2:D$9');
  });

  it('reads whole columns and whole rows', () => {
    expect(parseOgeRangeAddress('B:D')).toMatchObject({
      kind: 'columns',
      top: 0,
      bottom: OGE_SHEET_MAX_ROWS - 1,
      left: 1,
      right: 3,
    });
    expect(parseOgeRangeAddress('$9:$2')).toMatchObject({
      kind: 'rows',
      top: 1,
      bottom: 8,
      topAbsolute: true,
      left: 0,
      right: OGE_SHEET_MAX_COLUMNS - 1,
    });
    const columns = parseOgeRangeAddress('$A:C');
    expect(columns && formatOgeRangeAddress(columns)).toBe('$A:C');
    const rows = parseOgeRangeAddress('3:$5');
    expect(rows && formatOgeRangeAddress(rows)).toBe('3:$5');
  });

  it('reads plain, quoted and 3-D sheet prefixes', () => {
    expect(parseOgeRangeAddress('Sheet1!A1')).toMatchObject({
      sheet: 'Sheet1',
      kind: 'cell',
    });
    expect(parseOgeRangeAddress("'Q1 2026'!A1:B2")).toMatchObject({
      sheet: 'Q1 2026',
      kind: 'range',
    });
    expect(parseOgeRangeAddress("'It''s'!C3")).toMatchObject({
      sheet: "It's",
    });
    expect(parseOgeRangeAddress('Jan:Mar!B2')).toMatchObject({
      sheet: 'Jan',
      lastSheet: 'Mar',
    });
    expect(parseOgeRangeAddress("'Jan 1:Mar 1'!B2")).toMatchObject({
      sheet: 'Jan 1',
      lastSheet: 'Mar 1',
    });
    expect(parseOgeRangeAddress('Satış!A1')).toMatchObject({ sheet: 'Satış' });
  });

  it.each([
    'A1:',
    ':A1',
    'A1:B2:C3',
    'A:1',
    'A1:B',
    '!A1',
    "'unterminated!A1",
    "''!A1",
    'My Sheet!A1',
    "'Sheet1'A1",
    'Sheet1!',
  ])('rejects %j', (text) => {
    expect(parseOgeRangeAddress(text)).toBeNull();
  });

  it('quotes sheet names exactly when a reference needs it', () => {
    expect(ogeQuoteSheetName('Sheet1')).toBe('Sheet1');
    expect(ogeQuoteSheetName('Satış')).toBe('Satış');
    expect(ogeQuoteSheetName('_data')).toBe('_data');
    expect(ogeQuoteSheetName('Q1 2026')).toBe("'Q1 2026'");
    expect(ogeQuoteSheetName("It's")).toBe("'It''s'");
    expect(ogeQuoteSheetName('2026')).toBe("'2026'");
    expect(ogeQuoteSheetName('a-b')).toBe("'a-b'");
    expect(ogeQuoteSheetName('a.b')).toBe("'a.b'");
    for (const clash of [
      'A1',
      'xfd99',
      'R1C1',
      'R',
      'C',
      'RC',
      'C12',
      'TRUE',
    ]) {
      expect(ogeSheetNameNeedsQuotes(clash)).toBe(true);
    }
    expect(ogeSheetNameNeedsQuotes('ABCD1')).toBe(false); // not a column
  });

  it('formats sheet prefixes, quoting 3-D pairs as one unit', () => {
    const quoted = parseOgeRangeAddress("'Q1 2026'!A1:B2");
    expect(quoted && formatOgeRangeAddress(quoted)).toBe("'Q1 2026'!A1:B2");
    const threeD = parseOgeRangeAddress('Jan:Mar!B2');
    expect(threeD && formatOgeRangeAddress(threeD)).toBe('Jan:Mar!B2');
    const quotedThreeD = parseOgeRangeAddress("'Jan 1:Mar'!B2");
    expect(quotedThreeD && formatOgeRangeAddress(quotedThreeD)).toBe(
      "'Jan 1:Mar'!B2",
    );
  });
});

describe('range arithmetic', () => {
  const a = { top: 1, left: 1, bottom: 4, right: 3 };
  const b = { top: 3, left: 2, bottom: 6, right: 8 };

  it('tests containment and intersection', () => {
    expect(ogeRangeContains(a, 1, 1)).toBe(true);
    expect(ogeRangeContains(a, 5, 1)).toBe(false);
    expect(ogeRangesIntersect(a, b)).toBe(true);
    expect(ogeRangeIntersection(a, b)).toEqual({
      top: 3,
      left: 2,
      bottom: 4,
      right: 3,
    });
    expect(
      ogeRangeIntersection(a, { top: 9, left: 9, bottom: 9, right: 9 }),
    ).toBeNull();
    expect(
      ogeRangeContainsRange(a, { top: 2, left: 2, bottom: 3, right: 3 }),
    ).toBe(true);
    expect(ogeRangeContainsRange(a, b)).toBe(false);
  });

  it('builds ranges from cells and corners', () => {
    expect(ogeCellRange(2, 3)).toEqual({
      top: 2,
      left: 3,
      bottom: 2,
      right: 3,
    });
    expect(ogeRangeFromCorners({ row: 5, col: 1 }, { row: 2, col: 4 })).toEqual(
      { top: 2, left: 1, bottom: 5, right: 4 },
    );
    expect(ogeRangeBoundingBox(a, b)).toEqual({
      top: 1,
      left: 1,
      bottom: 6,
      right: 8,
    });
    expect(ogeRangeSize(a)).toEqual({ rows: 4, cols: 3 });
  });

  it('offsets only the relative parts and refuses to leave the sheet', () => {
    const mixed = parseOgeCellAddress('$B3');
    expect(mixed && ogeOffsetCellAddress(mixed, 2, 5)).toMatchObject({
      row: 4,
      col: 1,
    });
    const relative = parseOgeCellAddress('A1');
    expect(relative && ogeOffsetCellAddress(relative, -1, 0)).toBeNull();
  });
});

describe('R1C1', () => {
  const origin = { row: 4, col: 2 }; // C5

  it('formats absolute parts one-based and relative parts as offsets', () => {
    const address = (text: string) => {
      const parsed = parseOgeCellAddress(text);
      if (!parsed) throw new Error(text);
      return parsed;
    };
    expect(formatOgeR1C1Address(address('$A$1'), origin)).toBe('R1C1');
    expect(formatOgeR1C1Address(address('C5'), origin)).toBe('RC');
    expect(formatOgeR1C1Address(address('B6'), origin)).toBe('R[1]C[-1]');
    expect(formatOgeR1C1Address(address('$B4'), origin)).toBe('R[-1]C2');
  });

  it('parses what it formats, case-insensitively', () => {
    expect(parseOgeR1C1Address('R1C1', origin)).toEqual({
      row: 0,
      col: 0,
      rowAbsolute: true,
      colAbsolute: true,
    });
    expect(parseOgeR1C1Address('rc', origin)).toEqual({
      row: 4,
      col: 2,
      rowAbsolute: false,
      colAbsolute: false,
    });
    expect(parseOgeR1C1Address('R[1]C[-1]', origin)).toMatchObject({
      row: 5,
      col: 1,
    });
  });

  it.each(['', 'R', 'C1', 'R0C1', 'R[-5]C', 'R[1C', 'R1C1:R2C2', 'R[x]C'])(
    'rejects %j',
    (text) => {
      expect(parseOgeR1C1Address(text, origin)).toBeNull();
    },
  );
});
