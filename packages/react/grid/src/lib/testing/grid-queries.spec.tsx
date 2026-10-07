import { render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import type { OgeEditingOptions, OgeSelectionMode } from '@oge-ui/behavior';
import { OgeGrid } from '../grid';
import { getAllGrids, getGrid } from './grid-queries';

interface Person {
  id: number;
  name: string;
  age: number;
}

const PEOPLE: Person[] = [
  { id: 1, name: 'Cem', age: 41 },
  { id: 2, name: 'Ada', age: 36 },
  { id: 3, name: 'Linus', age: 55 },
  { id: 4, name: 'Grace', age: 85 },
  { id: 5, name: 'Alan', age: 41 },
];

const COLUMNS = [
  { field: 'name', caption: 'Name' },
  { field: 'age', caption: 'Age', dataType: 'number' as const },
];

function People(props: {
  paging?: { pageSize: number };
  selectionMode?: OgeSelectionMode;
  editing?: OgeEditingOptions;
  data?: Person[];
}) {
  return (
    <StrictMode>
      <OgeGrid
        data={props.data ?? PEOPLE}
        keyField="id"
        columns={COLUMNS}
        filterRow
        filterDebounce={0}
        paging={props.paging}
        selectionMode={props.selectionMode}
        editing={props.editing}
      />
      <OgeGrid data={[]} columns={['code']} />
    </StrictMode>
  );
}

async function setup(props: Parameters<typeof People>[0] = {}) {
  const view = render(<People {...props} />);
  const grid = getGrid(view.container, { column: 'Name' });
  await waitFor(() => expect(grid.getRowCount()).toBeGreaterThan(0));
  return { ...view, grid };
}

describe('getGrid', () => {
  it('finds grids and refuses an ambiguous container', async () => {
    const { container } = await setup();
    expect(getAllGrids(container)).toHaveLength(2);
    expect(() => getGrid(container)).toThrow(/expected one grid, found 2/);
    const other = getGrid(container, { column: /^Co/ });
    expect(other.getColumnCaptions()).toEqual(['Code']);
    expect(other.isEmpty()).toBe(true);
  });

  it('reads captions, rows and cells as text', async () => {
    const { grid } = await setup();
    expect(grid.getColumnCaptions()).toEqual(['Name', 'Age']);
    expect(grid.getRowCount()).toBe(5);
    expect(grid.getCellTexts()[1]).toEqual(['Ada', '36']);
    expect(grid.getCellText(2, 'Name')).toBe('Linus');
    expect(grid.getCell(2, 1)).toHaveTextContent('55');
  });

  it('sorts by clicking a header and reports aria-sort', async () => {
    const { grid } = await setup();
    expect(grid.getSortDirection('Name')).toBe('none');
    grid.sortBy('Name');
    await waitFor(() => expect(grid.getSortDirection('Name')).toBe('asc'));
    expect(grid.getCellTexts().map(([name]) => name)).toEqual([
      'Ada',
      'Alan',
      'Cem',
      'Grace',
      'Linus',
    ]);
  });

  it('types into the filter row', async () => {
    const { grid } = await setup();
    expect(grid.hasFilterRow()).toBe(true);
    grid.setFilter('Name', 'al');
    expect(grid.getFilterText('Name')).toBe('al');
    await waitFor(() =>
      expect(grid.getCellTexts().map(([name]) => name)).toEqual(['Alan']),
    );
  });

  it('navigates pages', async () => {
    const { grid } = await setup({ paging: { pageSize: 2 } });
    expect(grid.hasPager()).toBe(true);
    expect(grid.getCurrentPage()).toBe(1);
    grid.nextPage();
    await waitFor(() => expect(grid.getCurrentPage()).toBe(2));
    grid.goToPage(3);
    await waitFor(() => expect(grid.getCellTexts()).toEqual([['Alan', '41']]));
    grid.previousPage();
    await waitFor(() => expect(grid.getCurrentPage()).toBe(2));
  });

  it('toggles row selection through the checkbox column', async () => {
    const { grid } = await setup({ selectionMode: 'checkbox' });
    grid.toggleRowSelection(1);
    grid.toggleRowSelection(3);
    await waitFor(() => expect(grid.getSelectedRowIndexes()).toEqual([1, 3]));
    expect(grid.isRowSelected(1)).toBe(true);
    grid.toggleSelectAll();
    await waitFor(() =>
      expect(grid.getSelectedRowIndexes()).toEqual([0, 1, 2, 3, 4]),
    );
  });

  it('edits a cell with F2, typing and Enter', async () => {
    const data = PEOPLE.map((p) => ({ ...p }));
    const { grid } = await setup({
      data,
      editing: { mode: 'cell', allowUpdating: true },
    });
    grid.editCell(1, 'Name', 'Ada Lovelace');
    await waitFor(() =>
      expect(grid.getCellText(1, 'Name')).toBe('Ada Lovelace'),
    );
    expect(grid.isCellEditing(1, 'Name')).toBe(false);
  });

  it('explains a missing column', async () => {
    const { grid } = await setup();
    expect(() => grid.getCellText(0, 'Missing')).toThrow(
      /no column "Missing" \(columns: Name, Age\)/,
    );
  });
});
