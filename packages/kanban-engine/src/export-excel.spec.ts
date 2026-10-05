import { buildKanbanExcelWorkbook } from './export-excel';
import { OGE_DEFAULT_KANBAN_MESSAGES, fillKanbanMessages } from './lib/config';
import type { OgeKanbanExportData } from './lib/export';

const data: OgeKanbanExportData = {
  messages: fillKanbanMessages(OGE_DEFAULT_KANBAN_MESSAGES).export,
  locale: 'en-US',
  hasSwimlanes: false,
  rows: [
    {
      key: 7,
      title: 'Ship it',
      column: 'Done',
      columnKey: 'done',
      swimlane: null,
      description: '',
      tags: ['a', 'b'],
      assignees: ['Ada'],
      priority: 'high',
      dueDate: new Date(2026, 4, 2),
      checklistDone: 1,
      checklistTotal: 3,
    },
  ],
};

describe('buildKanbanExcelWorkbook', () => {
  it('writes a header row and one typed row per card', () => {
    const workbook = buildKanbanExcelWorkbook(data);
    const sheet = workbook.getWorksheet('Cards');
    expect(sheet).toBeDefined();
    const header = sheet?.getRow(1).values as unknown[];
    expect(header.slice(1)).toEqual([
      'Key',
      'Title',
      'Column',
      'Description',
      'Tags',
      'Assignees',
      'Priority',
      'Due date',
      'Checklist',
    ]);
    const row = sheet?.getRow(2).values as unknown[];
    expect(row[1]).toBe('7');
    expect(row[5]).toBe('a; b');
    expect(row[8]).toBeInstanceOf(Date);
    expect(row[9]).toBe('1/3');
  });

  it('adds a swimlane column and honours the sheet name', () => {
    const workbook = buildKanbanExcelWorkbook(
      { ...data, hasSwimlanes: true },
      { sheetName: 'Board' },
    );
    const header = workbook.getWorksheet('Board')?.getRow(1)
      .values as unknown[];
    expect(header).toContain('Swimlane');
  });
});
