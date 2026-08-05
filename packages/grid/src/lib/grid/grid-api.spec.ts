import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeToolbarItem } from '../templates/toolbar-item';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  department: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada', department: 'Eng' },
  { id: 2, name: 'Grace', department: 'Eng' },
  { id: 3, name: 'Erin', department: 'Sales' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeGrid imperative API & events', () => {
  async function render(grouped = false): Promise<{
    fixture: ComponentFixture<OgeGrid<Row>>;
    el: HTMLElement;
    grid: OgeGrid<Row>;
  }> {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', ROWS);
    fixture.componentRef.setInput('columns', ['name', 'department']);
    fixture.componentRef.setInput('keyField', 'id');
    if (grouped) fixture.componentRef.setInput('groupBy', ['department']);
    fixture.detectChanges();
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement, grid: fixture.componentInstance };
  }

  it('collapseAllGroups / expandAllGroups toggle every group', async () => {
    const { fixture, el, grid } = await render(true);
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
    grid.collapseAllGroups();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row').length).toBe(0);
    expect(el.querySelectorAll('.oge-group-row').length).toBe(2);
    grid.expandAllGroups();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
  });

  it('emits cellClick and rowDblClick with row context', async () => {
    const { fixture, el, grid } = await render();
    const cellClicks: unknown[] = [];
    const dblClicks: unknown[] = [];
    grid.cellClick.subscribe((e) => cellClicks.push(e));
    grid.rowDblClick.subscribe((e) => dblClicks.push(e));
    const firstCell = el.querySelector('.oge-row .oge-cell') as HTMLElement;
    firstCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    firstCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();
    expect(cellClicks).toHaveLength(1);
    expect(cellClicks[0]).toMatchObject({ key: 1, field: 'name', value: 'Ada' });
    expect(dblClicks).toHaveLength(1);
    expect(dblClicks[0]).toMatchObject({ key: 1 });
  });

  it('emits contentReady after a result renders and refresh() reloads', async () => {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', ROWS);
    fixture.componentRef.setInput('columns', ['name']);
    fixture.componentRef.setInput('keyField', 'id');
    const grid = fixture.componentInstance;
    let ready = 0;
    grid.contentReady.subscribe(() => ready++);
    fixture.detectChanges();
    await settle(fixture);
    expect(ready).toBeGreaterThan(0);
    grid.refresh();
    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.oge-row').length).toBe(3);
  });

  it('projects [ogeToolbar] content into the grid toolbar', async () => {
    @Component({
      imports: [OgeGrid, OgeToolbarItem],
      template: `
        <oge-grid [data]="rows" keyField="id" [columns]="['name']">
          <button ogeToolbar type="button" class="my-export">Export</button>
        </oge-grid>
      `,
    })
    class Host {
      rows = ROWS;
    }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    // the toolbar renders solely because of the projected item
    expect(el.querySelector('.oge-toolbar .my-export')?.textContent?.trim()).toBe('Export');
  });

  it('getExportData ignores paging by default and honors page/selection scopes', async () => {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', ROWS);
    fixture.componentRef.setInput('columns', ['name']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('paging', { pageSize: 2 });
    fixture.componentRef.setInput('selectionMode', 'multiple');
    const grid = fixture.componentInstance;
    fixture.detectChanges();
    await settle(fixture);
    // default: the whole filtered set, not the 2-row page
    expect((await grid.getExportData()).rows).toHaveLength(3);
    expect((await grid.getExportData({ scope: 'page' })).rows).toHaveLength(2);
    // select one row → selection scope narrows to it
    (fixture.nativeElement as HTMLElement)
      .querySelector('.oge-row')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    const selection = await grid.getExportData({ scope: 'selection' });
    expect(selection.rows).toHaveLength(1);
    expect(selection.rows[0].name).toBe('Ada');
  });

  it('Ctrl+C copies the selected rows as TSV with a header', async () => {
    const written: string[] = [];
    Object.assign(navigator, {
      clipboard: { writeText: (text: string) => (written.push(text), Promise.resolve()) },
    });
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', ROWS);
    fixture.componentRef.setInput('columns', ['name', 'department']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('selectionMode', 'multiple');
    fixture.detectChanges();
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    // focus a cell (roving tabindex) and select the first row
    const firstCell = el.querySelector('.oge-row .oge-cell') as HTMLElement;
    firstCell.dispatchEvent(new FocusEvent('focus'));
    firstCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    el.querySelector('.oge-viewport')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true })
    );
    await settle(fixture);
    expect(written).toHaveLength(1);
    expect(written[0]).toBe('Name\tDepartment\r\nAda\tEng');
  });

  it('select-all covers all pages by default and only the page with selectAllMode: page', async () => {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', ROWS);
    fixture.componentRef.setInput('columns', ['name']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('paging', { pageSize: 2 });
    fixture.componentRef.setInput('selectionMode', 'checkbox');
    const grid = fixture.componentInstance;
    fixture.detectChanges();
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const headerCheckbox = () =>
      el.querySelector('.oge-checkbox-cell input') as HTMLInputElement;
    // default 'allPages': all 3 rows selected although the page shows 2
    headerCheckbox().dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row-selected').length).toBe(2);
    expect(headerCheckbox().checked).toBe(true);
    const selected = (grid as unknown as { store: { selection: { count(): number } } }).store;
    expect(selected.selection.count()).toBe(3);
    // 'page' mode: only the visible page
    headerCheckbox().dispatchEvent(new Event('change')); // clear
    fixture.componentRef.setInput('selectAllMode', 'page');
    await settle(fixture);
    headerCheckbox().dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(selected.selection.count()).toBe(2);
  });

  it('clearFilters and clearSorting reset the view', async () => {
    const { fixture, el, grid } = await render();
    // sort by name desc via two header clicks
    const header = el.querySelector('.oge-header-cell') as HTMLElement;
    header.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    header.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    expect(el.querySelector('.oge-row .oge-cell')?.textContent?.trim()).toBe('Grace');
    grid.clearSorting();
    await settle(fixture);
    expect(el.querySelector('.oge-row .oge-cell')?.textContent?.trim()).toBe('Ada');
    grid.clearFilters(); // no-op without filters — must not throw
  });
});
