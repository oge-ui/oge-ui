import { buildCsv, guardCsvFormula, type CsvColumn } from './csv';

interface Row {
  name: string | null;
  amount: number;
}

const columns: CsvColumn<Row>[] = [
  { caption: 'Name', accessor: (r) => r.name },
  { caption: 'Amount', accessor: (r) => r.amount, format: (v) => `${v} TL` },
];

describe('buildCsv', () => {
  it('builds header + rows with CRLF and BOM', () => {
    const csv = buildCsv([{ name: 'Ali', amount: 5 }], columns);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('Name,Amount\r\nAli,5 TL');
  });

  it('escapes separators, quotes and newlines', () => {
    const csv = buildCsv(
      [{ name: 'a,b "c"\nd', amount: 1 }],
      [{ caption: 'N', accessor: (r: Row) => r.name }],
      { bom: false },
    );
    expect(csv).toBe('N\r\n"a,b ""c""\nd"');
  });

  it('renders null as empty and supports custom separator / no header', () => {
    const csv = buildCsv([{ name: null, amount: 2 }], columns, {
      bom: false,
      header: false,
      separator: ';',
    });
    expect(csv).toBe(';2 TL');
  });
});

describe('CSV formula injection guard', () => {
  const nameColumn: CsvColumn<Row>[] = [
    { caption: 'N', accessor: (r: Row) => r.name },
  ];
  const cell = (value: string) =>
    buildCsv([{ name: value, amount: 0 }], nameColumn, {
      bom: false,
      header: false,
    });

  it('prefixes cells a spreadsheet would evaluate', () => {
    expect(guardCsvFormula('=1+1')).toBe("'=1+1");
    expect(guardCsvFormula("=cmd|'/c calc'!A1")).toBe("'=cmd|'/c calc'!A1");
    expect(guardCsvFormula('@SUM(A1:A9)')).toBe("'@SUM(A1:A9)");
    expect(guardCsvFormula('+HYPERLINK("http://evil.test")')).toBe(
      '\'+HYPERLINK("http://evil.test")',
    );
    // Excel strips leading whitespace before it decides, so the guard must too
    expect(guardCsvFormula('\t=1+1')).toBe("'\t=1+1");
    expect(guardCsvFormula('\r=1+1')).toBe("'\r=1+1");
  });

  it('leaves numbers and ordinary text alone', () => {
    for (const value of ['-5', '+3.14', '-.5', '1e9', 'Ankara', '', 'a=b']) {
      expect(guardCsvFormula(value)).toBe(value);
    }
  });

  it('guards through buildCsv, and quotes the guarded cell when needed', () => {
    expect(cell('=1+1')).toBe("'=1+1");
    expect(cell('-5')).toBe('-5');
    // the guard runs before RFC 4180 quoting, so the apostrophe stays inside
    expect(cell('=A1,B1')).toBe('"\'=A1,B1"');
  });

  it('can be turned off for machine-read output', () => {
    const csv = buildCsv([{ name: '=1+1', amount: 0 }], nameColumn, {
      bom: false,
      header: false,
      formulaGuard: false,
    });
    expect(csv).toBe('=1+1');
  });
});
