import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/grid/testing/src/** — keep in sync with the
 * source TSDoc when the harness changes. The React counterpart
 * (`react-grid/react-grid-testing-api-data.ts`) uses the same member names;
 * `docs-tools:parity` compares the two.
 */
export const OGE_GRID_HARNESS_API: ApiSections = {
  properties: [
    {
      title: 'Harness',
      entries: [
        {
          name: 'hostSelector',
          type: "'oge-grid'",
          description:
            'Static. The host selector the CDK loader matches — import from <code>&#64;oge-ui/grid/testing</code>; <code>&#64;angular/cdk</code> is an optional peer only this entry needs.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Finding the grid',
      entries: [
        {
          name: 'with(filters?: OgeGridHarnessFilters)',
          type: 'HarnessPredicate<OgeGridHarness>',
          description:
            'Static. Predicate for <code>loader.getHarness()</code>: <code>selector</code>, <code>ancestor</code> and <code>column</code> (a caption the grid must have, string or RegExp).',
        },
      ],
    },
    {
      title: 'Rows & cells',
      entries: [
        {
          name: 'getColumnCaptions()',
          type: 'Promise<string[]>',
          description: 'Captions of the data columns, in display order.',
        },
        {
          name: 'getRows(filter?: OgeGridRowHarnessFilters)',
          type: 'Promise<OgeGridRowHarness[]>',
          description:
            'The rendered body rows (data and row-template rows; pinned, group and filler rows excluded), optionally filtered by <code>text</code> or <code>selected</code>.',
        },
        {
          name: 'getRowCount()',
          type: 'Promise<number>',
          description:
            'Number of rendered body rows — the window of a virtualized grid, the page of a paged one.',
        },
        {
          name: 'getCellTexts()',
          type: 'Promise<string[][]>',
          description:
            'Every rendered row’s data-cell texts (trimmed, whitespace collapsed).',
        },
        {
          name: 'getCellText(rowIndex: number, column: string | number)',
          type: 'Promise<string>',
          description:
            'Text of one cell. A column is its caption (exact, trimmed) or its 0-based position among the data columns.',
        },
        {
          name: 'isEmpty()',
          type: 'Promise<boolean>',
          description: 'Whether the "no data" row is shown.',
        },
      ],
    },
    {
      title: 'Sorting',
      entries: [
        {
          name: 'sortBy(column: string | number, modifiers?: { shift?, control? })',
          type: 'Promise<void>',
          description:
            'Clicks the column header — one step of the sort cycle; <code>shift</code> adds the column to a multi-column sort.',
        },
        {
          name: 'getSortDirection(column: string | number)',
          type: "Promise<'asc' | 'desc' | 'none'>",
          description:
            'The column’s sort state, read from the header’s <code>aria-sort</code>.',
        },
      ],
    },
    {
      title: 'Filter row',
      entries: [
        {
          name: 'hasFilterRow()',
          type: 'Promise<boolean>',
          description: 'Whether the filter row is shown.',
        },
        {
          name: 'setFilter(column: string | number, text: string)',
          type: 'Promise<void>',
          description:
            "Replaces a column’s filter-row text (Enter commits a date filter; <code>''</code> clears) and waits out the debounce. Boolean and lookup filters are select boxes: drive them with <code>OgeSelectBoxHarness.with({ label: 'Filter &lt;caption&gt;' })</code>.",
        },
        {
          name: 'getFilterText(column: string | number)',
          type: 'Promise<string>',
          description: 'The current text of a column’s filter-row editor.',
        },
      ],
    },
    {
      title: 'Paging',
      entries: [
        {
          name: 'hasPager()',
          type: 'Promise<boolean>',
          description: 'Whether the grid shows a pager.',
        },
        {
          name: 'getCurrentPage()',
          type: 'Promise<number>',
          description:
            'The current page, 1-based — from the current page button, the go-to-page input or the compact <code>n / m</code> text.',
        },
        {
          name: 'goToPage(page: number)',
          type: 'Promise<void>',
          description:
            'Goes to a 1-based page: its page button when listed, otherwise the go-to-page input (<code>showPageInput</code>).',
        },
        {
          name: 'nextPage() / previousPage()',
          type: 'Promise<void>',
          description: 'Clicks the pager’s next / previous page button.',
        },
      ],
    },
    {
      title: 'Selection',
      entries: [
        {
          name: 'toggleRowSelection(rowIndex: number)',
          type: 'Promise<void>',
          description:
            "Toggles a row’s selection: its checkbox in <code>selectionMode: 'checkbox'</code>, otherwise a click on its first data cell.",
        },
        {
          name: 'isRowSelected(rowIndex: number)',
          type: 'Promise<boolean>',
          description:
            'Whether a row is selected (<code>aria-selected="true"</code>).',
        },
        {
          name: 'getSelectedRowIndexes()',
          type: 'Promise<number[]>',
          description: '0-based indexes of the selected rendered rows.',
        },
        {
          name: 'toggleSelectAll()',
          type: 'Promise<void>',
          description: 'Clicks the header’s select-all checkbox.',
        },
      ],
    },
    {
      title: 'Editing',
      entries: [
        {
          name: 'editCell(rowIndex: number, column: string | number, text: string)',
          type: 'Promise<void>',
          description:
            'Edits a cell as a keyboard user does: focus, F2 (unless the row is already editing), replace the text, Enter — which commits per the edit mode. Text, number and date editors.',
        },
        {
          name: 'isCellEditing(rowIndex: number, column: string | number)',
          type: 'Promise<boolean>',
          description: 'Whether a cell shows its editor.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeGridHarnessFilters',
          type: 'BaseHarnessFilters & { column?: string | RegExp }',
          description: 'Options of <code>OgeGridHarness.with()</code>.',
        },
        {
          name: 'OgeGridRowHarness',
          type: 'ComponentHarness',
          description:
            'One body row: <code>getCellTexts()</code>, <code>getCell(columnIndex)</code> (a <code>TestElement</code>), <code>isSelected()</code>, <code>toggleSelection()</code>; <code>OgeGridRowHarness.with({ text, selected })</code>.',
        },
        {
          name: 'OgeGridRowHarnessFilters',
          type: 'BaseHarnessFilters & { text?: string | RegExp; selected?: boolean }',
          description:
            'Options of <code>OgeGridRowHarness.with()</code> and <code>getRows()</code>.',
        },
        {
          name: 'OgeGridSortDirection',
          type: "'asc' | 'desc' | 'none'",
          description: 'A column’s sort state.',
        },
      ],
    },
  ],
};
