import {
  OGE_DEFAULT_KANBAN_MESSAGES,
  fillKanbanMessages,
  type OgeKanbanExportData,
} from '@oge-ui/kanban-engine';
import { buildKanbanExcelWorkbook, exportKanbanToExcel } from './export-excel';
import type { OgeKanbanHandle } from './lib/kanban-types';

const data: OgeKanbanExportData = {
  messages: fillKanbanMessages(OGE_DEFAULT_KANBAN_MESSAGES).export,
  locale: 'en-US',
  hasSwimlanes: false,
  rows: [
    {
      key: 1,
      title: 'Card',
      column: 'To do',
      columnKey: 'todo',
      swimlane: null,
      description: '',
      tags: [],
      assignees: [],
      priority: null,
      dueDate: null,
      checklistDone: 0,
      checklistTotal: 0,
    },
  ],
};

describe('@oge-ui/react-kanban/export-excel', () => {
  it('re-exports the shared workbook builder', () => {
    const sheet = buildKanbanExcelWorkbook(data).getWorksheet('Cards');
    expect((sheet?.getRow(2).values as unknown[])[2]).toBe('Card');
  });

  it('reads the board through the handle', async () => {
    const getExportData = vi.fn(() => data);
    const handle = { getExportData } as unknown as OgeKanbanHandle<object>;
    URL.createObjectURL = () => 'blob:x';
    URL.revokeObjectURL = () => undefined;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    await exportKanbanToExcel(handle, { visibleOnly: true });
    expect(getExportData).toHaveBeenCalledWith({ visibleOnly: true });
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
