import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/grid/src/lib/testing/** — the React
 * Testing Library counterpart of `OgeGridHarness`, with the same member names
 * (`docs-tools:parity` compares them). Reads are synchronous; actions fire
 * act-wrapped events, so work the grid finishes later is asserted with
 * `await waitFor(…)`.
 */
export const OGE_REACT_GRID_TESTING_API: ApiSections = {
  properties: [
    {
      title: 'Queries object',
      entries: [
        {
          name: 'element',
          type: 'HTMLElement',
          description:
            'The grid’s root element (<code>.oge-grid</code>) — scope further queries with <code>within(grid.element)</code>.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Finding the grid',
      entries: [
        {
          name: 'getGrid(container?: HTMLElement, filters?: OgeGridQueryFilters)',
          type: 'OgeGridQueries',
          description:
            'The one <code>&lt;OgeGrid&gt;</code> in (or being) the container (default <code>document.body</code>); throws on none or several. <code>filters.column</code> keeps grids with that caption. Import from <code>&#64;oge-ui/react-grid/testing</code>; <code>&#64;testing-library/dom</code> is an optional peer only this entry needs.',
        },
        {
          name: 'getAllGrids(container?: HTMLElement, filters?: OgeGridQueryFilters)',
          type: 'OgeGridQueries[]',
          description: 'Every grid in the container that matches the filters.',
        },
      ],
    },
    {
      title: 'Rows & cells',
      entries: [
        {
          name: 'getColumnCaptions()',
          type: 'string[]',
          description: 'Captions of the data columns, in display order.',
        },
        {
          name: 'getRows()',
          type: 'HTMLElement[]',
          description:
            'The rendered body rows (data and render-row rows; pinned, group and filler rows excluded).',
        },
        {
          name: 'getRowCount()',
          type: 'number',
          description:
            'Number of rendered body rows — the window of a virtualized grid, the page of a paged one.',
        },
        {
          name: 'getCellTexts()',
          type: 'string[][]',
          description:
            'Every rendered row’s data-cell texts (trimmed, whitespace collapsed).',
        },
        {
          name: 'getCellText(rowIndex: number, column: string | number)',
          type: 'string',
          description:
            'Text of one cell. A column is its caption (exact, trimmed) or its 0-based position among the data columns.',
        },
        {
          name: 'getCell(rowIndex: number, column: string | number)',
          type: 'HTMLElement',
          description: 'The data cell element itself.',
        },
        {
          name: 'isEmpty()',
          type: 'boolean',
          description: 'Whether the "no data" row is shown.',
        },
      ],
    },
    {
      title: 'Sorting',
      entries: [
        {
          name: 'sortBy(column: string | number, modifiers?: { shift?, control? })',
          type: 'void',
          description:
            'Clicks the column header — one step of the sort cycle; <code>shift</code> adds the column to a multi-column sort.',
        },
        {
          name: 'getSortDirection(column: string | number)',
          type: "'asc' | 'desc' | 'none'",
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
          type: 'boolean',
          description: 'Whether the filter row is shown.',
        },
        {
          name: 'setFilter(column: string | number, text: string)',
          type: 'void',
          description:
            "Replaces a column’s filter-row text (Enter commits a date filter). The filter applies after <code>filterDebounce</code>: assert with <code>await waitFor(…)</code>. Boolean and lookup filters are select boxes: <code>getSelectBox(grid.element, { label: 'Filter &lt;caption&gt;' })</code>.",
        },
        {
          name: 'getFilterText(column: string | number)',
          type: 'string',
          description: 'The current text of a column’s filter-row editor.',
        },
      ],
    },
    {
      title: 'Paging',
      entries: [
        {
          name: 'hasPager()',
          type: 'boolean',
          description: 'Whether the grid shows a pager.',
        },
        {
          name: 'getCurrentPage()',
          type: 'number',
          description:
            'The current page, 1-based — from the current page button, the go-to-page input or the compact <code>n / m</code> text.',
        },
        {
          name: 'goToPage(page: number)',
          type: 'void',
          description:
            'Goes to a 1-based page: its page button when listed, otherwise the go-to-page input.',
        },
        {
          name: 'nextPage() / previousPage()',
          type: 'void',
          description: 'Clicks the pager’s next / previous page button.',
        },
      ],
    },
    {
      title: 'Selection',
      entries: [
        {
          name: 'toggleRowSelection(rowIndex: number)',
          type: 'void',
          description:
            'Toggles a row’s selection: its checkbox in <code>selectionMode="checkbox"</code>, otherwise a click on its first data cell.',
        },
        {
          name: 'isRowSelected(rowIndex: number)',
          type: 'boolean',
          description:
            'Whether a row is selected (<code>aria-selected="true"</code>).',
        },
        {
          name: 'getSelectedRowIndexes()',
          type: 'number[]',
          description: '0-based indexes of the selected rendered rows.',
        },
        {
          name: 'toggleSelectAll()',
          type: 'void',
          description: 'Clicks the header’s select-all checkbox.',
        },
      ],
    },
    {
      title: 'Editing',
      entries: [
        {
          name: 'editCell(rowIndex: number, column: string | number, text: string)',
          type: 'void',
          description:
            'Edits a cell as a keyboard user does: focus, F2 (unless already editing), replace the text, Enter — which commits per the edit mode. Text, number and date editors.',
        },
        {
          name: 'isCellEditing(rowIndex: number, column: string | number)',
          type: 'boolean',
          description: 'Whether a cell shows its editor.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeGridQueries',
          type: 'interface',
          description:
            'What <code>getGrid()</code> returns — the members above.',
        },
        {
          name: 'OgeGridQueryFilters',
          type: '{ column?: string | RegExp }',
          description:
            'Filters of <code>getGrid()</code> / <code>getAllGrids()</code>.',
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
