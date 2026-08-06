import type { OgeExportData } from '@oge-ui/grid';
import { buildPdfDocument } from './index';

interface Row {
  id: number;
  name: string;
  amount: number;
}

const DATA: OgeExportData<Row> = {
  rows: [
    { id: 1, name: 'Ada', amount: 100 },
    { id: 2, name: 'Grace', amount: 250 },
  ],
  columns: [
    { caption: 'Id', field: 'id', dataType: 'number', accessor: (r) => r.id },
    {
      caption: 'Name',
      field: 'name',
      dataType: 'string',
      accessor: (r) => r.name,
    },
    {
      caption: 'Amount',
      field: 'amount',
      dataType: 'number',
      accessor: (r) => r.amount,
      format: (value) => `$${String(value)}`,
    },
  ],
};

interface AutoTableDoc {
  lastAutoTable?: { finalY: number };
}

describe('buildPdfDocument', () => {
  it('renders header and formatted body cells into an autotable', () => {
    const doc = buildPdfDocument(DATA, { title: 'Report' });
    expect(doc.getNumberOfPages()).toBe(1);
    const table = (doc as unknown as AutoTableDoc).lastAutoTable;
    expect(table).toBeDefined();
    expect(table?.finalY ?? 0).toBeGreaterThan(0);
    // the whole document contains the formatted cell text
    const text = JSON.stringify(doc.output());
    expect(text).toContain('Report');
    expect(text).toContain('Grace');
    expect(text).toContain('$250');
  });

  it('customizeCell rewrites the emitted text', () => {
    const doc = buildPdfDocument(DATA, {
      customizeCell: ({ field, text }) =>
        field === 'name' ? text.toUpperCase() : undefined,
    });
    const output = JSON.stringify(doc.output());
    expect(output).toContain('GRACE');
    expect(output).toContain('$250'); // other cells keep their defaults
  });

  it('defaults to landscape a4', () => {
    const doc = buildPdfDocument(DATA);
    const { width, height } = doc.internal.pageSize;
    expect(width).toBeGreaterThan(height); // landscape
  });
});
