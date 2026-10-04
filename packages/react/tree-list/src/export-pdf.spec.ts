import type { OgeTreeExportData } from '@oge-ui/behavior';
import { exportOgeTreeListToPdf } from './export-pdf';
import type { OgeTreeListHandle } from './lib/tree-list-types';

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
  name: string;
}

const DATA: OgeTreeExportData<Row> = {
  rows: [{ name: 'Build' }, { name: 'Design' }],
  levels: [0, 1],
  columns: [
    {
      caption: 'Name',
      field: 'name',
      dataType: 'string',
      accessor: (r) => r.name,
    },
  ],
};

describe('@oge-ui/react-tree-list/export-pdf', () => {
  it('reads the handle with the options and saves the document', async () => {
    const getExportData = vi.fn(() => DATA);
    await exportOgeTreeListToPdf(
      { getExportData } as unknown as OgeTreeListHandle<Row>,
      { summaries: false },
    );
    expect(getExportData).toHaveBeenCalledWith({ summaries: false });
    expect(save).toHaveBeenCalledWith('tree-list.pdf');
  });
});
