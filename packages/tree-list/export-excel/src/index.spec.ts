import type { OgeTreeExportData, OgeTreeList } from '@oge-ui/tree-list';
import { buildTreeExcelWorkbook, exportOgeTreeListToExcel } from './index';

interface Row {
  id: number;
  name: string;
  hired: string;
  active: boolean;
}

const DATA: OgeTreeExportData<Row> = {
  rows: [
    { id: 1, name: 'Ada', hired: '2021-03-01', active: true },
    { id: 2, name: 'Grace', hired: '2019-11-15', active: false },
    { id: 3, name: 'Linus', hired: '2020-06-20', active: true },
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
  levels: [0, 1, 2],
};

describe('buildTreeExcelWorkbook', () => {
  it('writes a typed worksheet with bold headers', () => {
    const sheet = buildTreeExcelWorkbook(DATA, {
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
  });

  it('mirrors the tree depth as row outline levels and defaults the sheet name', () => {
    const sheet = buildTreeExcelWorkbook(DATA).getWorksheet('Data');
    expect(sheet?.rowCount).toBe(4);
    expect(sheet?.getRow(1).outlineLevel).toBe(0); // header stays top-level
    expect(sheet?.getRow(2).outlineLevel).toBe(0);
    expect(sheet?.getRow(3).outlineLevel).toBe(1);
    expect(sheet?.getRow(4).outlineLevel).toBe(2);
    // hierarchy is expressed via outlining, not first-column indentation
    expect(sheet?.getRow(4).getCell(2).value).toBe('Linus');
  });
});

describe('exportOgeTreeListToExcel', () => {
  it('builds the workbook from the tree-list export data and downloads it', async () => {
    const treeList = {
      getExportData: () => DATA,
    } as unknown as OgeTreeList<Row>;
    const click = vi.fn();
    const anchor = { click } as unknown as HTMLAnchorElement;
    const createElement = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(anchor);
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    try {
      await exportOgeTreeListToExcel(treeList);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(anchor.download).toBe('tree-list.xlsx');
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    } finally {
      createElement.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
