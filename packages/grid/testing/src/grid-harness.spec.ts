import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import type { HarnessLoader } from '@angular/cdk/testing';
import type { OgeEditingOptions, OgeSelectionMode } from '@oge-ui/behavior';
import { OgeColumn } from '../../src/lib/columns/column';
import { provideOgeGridConfig } from '../../src/lib/config';
import { OgeGrid } from '../../src/lib/grid/grid';
import { OgeGridHarness } from './grid-harness';

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

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      id="people"
      [data]="people"
      keyField="id"
      [filterRow]="true"
      [filterDebounce]="0"
      [paging]="paging()"
      [selectionMode]="selectionMode()"
      [editing]="editing()"
    >
      <oge-column field="name" caption="Name" />
      <oge-column field="age" caption="Age" dataType="number" />
    </oge-grid>
    <oge-grid id="other" [data]="[]" [columns]="['code']" />
  `,
})
class Host {
  readonly people = PEOPLE.map((p) => ({ ...p }));
  readonly paging = signal<false | { pageSize: number }>(false);
  readonly selectionMode = signal<OgeSelectionMode>('none');
  readonly editing = signal<false | OgeEditingOptions>(false);
}

async function setup(
  patch: (host: Host) => void = () => undefined,
): Promise<{ host: Host; loader: HarnessLoader; grid: OgeGridHarness }> {
  const fixture = TestBed.createComponent(Host);
  patch(fixture.componentInstance);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const grid = await loader.getHarness(OgeGridHarness.with({ column: 'Name' }));
  return { host: fixture.componentInstance, loader, grid };
}

describe('OgeGridHarness', () => {
  it('filters grids by selector and by column caption', async () => {
    const { loader } = await setup();
    expect(await loader.getAllHarnesses(OgeGridHarness)).toHaveLength(2);
    const other = await loader.getHarness(
      OgeGridHarness.with({ selector: '#other' }),
    );
    expect(await other.getColumnCaptions()).toEqual(['Code']);
    expect(await other.isEmpty()).toBe(true);
    expect(
      await loader.getAllHarnesses(OgeGridHarness.with({ column: /^Ag/ })),
    ).toHaveLength(1);
  });

  it('reads captions, rows and cells as text', async () => {
    const { grid } = await setup();
    expect(await grid.getColumnCaptions()).toEqual(['Name', 'Age']);
    expect(await grid.getRowCount()).toBe(5);
    expect((await grid.getCellTexts())[1]).toEqual(['Ada', '36']);
    expect(await grid.getCellText(2, 'Name')).toBe('Linus');
    expect(await grid.getCellText(2, 1)).toBe('55');
    const [row] = await grid.getRows({ text: /Grace/ });
    expect(await row.getCellTexts()).toEqual(['Grace', '85']);
  });

  it('sorts by clicking a header and reports aria-sort', async () => {
    const { grid } = await setup();
    expect(await grid.getSortDirection('Name')).toBe('none');
    await grid.sortBy('Name');
    expect(await grid.getSortDirection('Name')).toBe('asc');
    expect((await grid.getCellTexts()).map(([name]) => name)).toEqual([
      'Ada',
      'Alan',
      'Cem',
      'Grace',
      'Linus',
    ]);
    await grid.sortBy('Name');
    expect(await grid.getSortDirection('Name')).toBe('desc');
    expect(await grid.getCellText(0, 'Name')).toBe('Linus');
  });

  it('types into the filter row', async () => {
    const { grid } = await setup();
    expect(await grid.hasFilterRow()).toBe(true);
    await grid.setFilter('Name', 'al');
    expect(await grid.getFilterText('Name')).toBe('al');
    expect((await grid.getCellTexts()).map(([name]) => name)).toEqual(['Alan']);
    await grid.setFilter('Name', '');
    expect(await grid.getRowCount()).toBe(5);
  });

  it('navigates pages', async () => {
    const { grid } = await setup((host) => host.paging.set({ pageSize: 2 }));
    expect(await grid.hasPager()).toBe(true);
    expect(await grid.getCurrentPage()).toBe(1);
    await grid.nextPage();
    expect(await grid.getCurrentPage()).toBe(2);
    expect(await grid.getCellText(0, 'Name')).toBe('Linus');
    await grid.goToPage(3);
    expect(await grid.getCellTexts()).toEqual([['Alan', '41']]);
    await grid.previousPage();
    expect(await grid.getCurrentPage()).toBe(2);
  });

  it('toggles row selection through the checkbox column', async () => {
    const { grid } = await setup((host) => host.selectionMode.set('checkbox'));
    await grid.toggleRowSelection(1);
    await grid.toggleRowSelection(3);
    expect(await grid.getSelectedRowIndexes()).toEqual([1, 3]);
    expect(await grid.isRowSelected(1)).toBe(true);
    expect(await grid.getRows({ selected: true })).toHaveLength(2);
    await grid.toggleSelectAll();
    expect(await grid.getSelectedRowIndexes()).toEqual([0, 1, 2, 3, 4]);
  });

  it('selects a row by clicking it in single mode', async () => {
    const { grid } = await setup((host) => host.selectionMode.set('single'));
    await grid.toggleRowSelection(2);
    expect(await grid.getSelectedRowIndexes()).toEqual([2]);
  });

  it('edits a cell with F2, typing and Enter', async () => {
    const { host, grid } = await setup((h) =>
      h.editing.set({ mode: 'cell', allowUpdating: true }),
    );
    await grid.editCell(1, 'Name', 'Ada Lovelace');
    expect(await grid.isCellEditing(1, 'Name')).toBe(false);
    expect(await grid.getCellText(1, 'Name')).toBe('Ada Lovelace');
    expect(host.people[1].name).toBe('Ada Lovelace');
  });

  it('works in a zoneless TestBed (filter debounce configured to 0)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideOgeGridConfig({ filterDebounce: 0 }),
      ],
    });
    const { grid } = await setup((host) => host.paging.set({ pageSize: 2 }));
    await grid.sortBy('Name');
    expect(await grid.getCellText(0, 'Name')).toBe('Ada');
    await grid.nextPage();
    expect(await grid.getCurrentPage()).toBe(2);
    await grid.setFilter('Name', 'li');
    expect(await grid.getCellTexts()).toEqual([['Linus', '55']]);
  });

  it('explains a missing column', async () => {
    const { grid } = await setup();
    await expect(grid.getCellText(0, 'Missing')).rejects.toThrow(
      /no column "Missing" \(columns: Name, Age\)/,
    );
  });
});
