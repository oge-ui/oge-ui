import type { OgeExportData } from '@oge-ui/grid';
import { buildExcelWorkbook } from './index';

interface Row {
  id: number;
  name: string;
  hired: string;
  active: boolean;
}

const DATA: OgeExportData<Row> = {
  rows: [
    { id: 1, name: 'Ada', hired: '2021-03-01', active: true },
    { id: 2, name: 'Grace', hired: '2019-11-15', active: false },
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
      caption: 'Hired',
      field: 'hired',
      dataType: 'date',
      accessor: (r) => r.hired,
    },
    {
      caption: 'Active',
      field: 'active',
      dataType: 'boolean',
      accessor: (r) => r.active,
      format: (value) => (value ? 'Yes' : 'No'),
    },
  ],
};

describe('buildExcelWorkbook', () => {
  it('writes a typed worksheet with bold headers and an auto-filter', () => {
    const sheet = buildExcelWorkbook(DATA, {
      sheetName: 'People',
    }).getWorksheet('People');
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(1).font?.bold).toBe(true);
    expect(sheet?.getRow(1).getCell(1).value).toBe('Id');
    // numbers stay numbers, dates become Date cells, formats apply
    expect(sheet?.getRow(2).getCell(1).value).toBe(1);
    expect(sheet?.getRow(2).getCell(2).value).toBe('Ada');
    expect(sheet?.getRow(2).getCell(3).value).toBeInstanceOf(Date);
    expect(sheet?.getRow(2).getCell(4).value).toBe('Yes');
    expect(sheet?.getRow(3).getCell(4).value).toBe('No');
    expect(sheet?.autoFilter).toEqual({
      from: { row: 1, column: 1 },
      to: { row: 1, column: 4 },
    });
  });

  it('honors autoFilter: false and defaults the sheet name', () => {
    const workbook = buildExcelWorkbook(DATA, { autoFilter: false });
    const sheet = workbook.getWorksheet('Data');
    expect(sheet?.autoFilter).toBeFalsy();
    expect(sheet?.rowCount).toBe(3);
  });

  it('customizeCell overrides values and keeps defaults on undefined', () => {
    const sheet = buildExcelWorkbook(DATA, {
      customizeCell: ({ field, value, row }) => {
        if (field === 'name') return `${String(value)} (${String(row.id)})`;
        if (field === 'id') return (value as number) * 100; // stays a typed number
        return undefined;
      },
    }).getWorksheet('Data');
    expect(sheet?.getRow(2).getCell(1).value).toBe(100);
    expect(sheet?.getRow(2).getCell(2).value).toBe('Ada (1)');
    expect(sheet?.getRow(2).getCell(3).value).toBeInstanceOf(Date); // untouched default
  });
});
