import { buildCsv, type CsvColumn } from './csv';

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
      { bom: false }
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
