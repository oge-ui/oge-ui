import type { OgeKanban } from '@oge-ui/kanban';
import {
  OGE_DEFAULT_KANBAN_MESSAGES,
  fillKanbanMessages,
} from '@oge-ui/kanban-engine';
import { buildKanbanExcelWorkbook, exportKanbanToExcel } from './index';

const data = {
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

describe('@oge-ui/kanban/export-excel', () => {
  it('re-exports the shared workbook builder', () => {
    const sheet = buildKanbanExcelWorkbook(data).getWorksheet('Cards');
    expect((sheet?.getRow(2).values as unknown[])[2]).toBe('Card');
  });

  it('reads the board through getExportData()', async () => {
    const getExportData = vi.fn(() => data);
    const board = { getExportData } as unknown as OgeKanban<object>;
    // jsdom: the download itself is skipped when object URLs are missing
    const create = URL.createObjectURL;
    URL.createObjectURL = () => 'blob:x';
    URL.revokeObjectURL = () => undefined;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    await exportKanbanToExcel(board, { visibleOnly: true });
    expect(getExportData).toHaveBeenCalledWith({ visibleOnly: true });
    expect(click).toHaveBeenCalled();
    click.mockRestore();
    URL.createObjectURL = create;
  });
});
