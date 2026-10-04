import type { OgeTreeExportData, OgeTreeList } from '@oge-ui/tree-list';
import { buildTreePdfDocument, exportOgeTreeListToPdf } from './index';

const save = vi.fn();
vi.mock('@oge-ui/behavior/export-pdf', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@oge-ui/behavior/export-pdf')>();
  return {
    ...actual,
    buildTreePdfDocument: vi.fn(
      (...args: Parameters<typeof actual.buildTreePdfDocument>) => {
        const doc = actual.buildTreePdfDocument(...args);
        doc.save = save as never;
        return doc;
      },
    ),
  };
});

interface Row {
  id: number;
  name: string;
  hours: number;
}

const DATA: OgeTreeExportData<Row> = {
  rows: [
    { id: 1, name: 'Build', hours: 6 },
    { id: 2, name: 'Design', hours: 4 },
  ],
  columns: [
    {
      caption: 'Name',
      field: 'name',
      dataType: 'string',
      accessor: (r) => r.name,
    },
    {
      caption: 'Hours',
      field: 'hours',
      dataType: 'number',
      accessor: (r) => r.hours,
    },
  ],
  levels: [0, 1],
};

describe('@oge-ui/tree-list/export-pdf', () => {
  it('builds the document from tree export data', () => {
    const doc = buildTreePdfDocument(DATA, { title: 'Tasks' });
    const text = JSON.stringify(doc.output());
    expect(text).toContain('Tasks');
    expect(text).toContain('Design');
  });

  it('reads the tree list export data with the options and saves', async () => {
    const getExportData = vi.fn(() => DATA);
    await exportOgeTreeListToPdf(
      { getExportData } as unknown as OgeTreeList<Row>,
      { filename: 'tasks.pdf', selectedRowsOnly: true },
    );
    expect(getExportData).toHaveBeenCalledWith({
      filename: 'tasks.pdf',
      selectedRowsOnly: true,
    });
    expect(save).toHaveBeenCalledWith('tasks.pdf');
  });
});
