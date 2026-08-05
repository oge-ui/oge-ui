import { ComponentFixture, TestBed } from '@angular/core/testing';
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
