import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOgeGridConfig } from '../config';
import { OgeColumn } from '../columns/column';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  active: boolean;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ali', active: true },
  { id: 2, name: 'Ayşe', active: false },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [filterRow]="true"
      [filterDebounce]="0"
      [searchPanel]="{ placeholder: 'Çalışan ara' }"
      [paging]="{ pageSize: 1, pageSizes: [1, 2], showInfo: true }"
      [sorting]="{ allowUnsorting: false }"
    >
      <oge-column field="name" filterOperator="startswith" />
      <oge-column field="active" dataType="boolean" />
    </oge-grid>
  `,
})
class ConfiguredHost {
  readonly data = ROWS;
}

describe('OgeGrid configuration', () => {
  it('applies global config messages and boolean formatting (localization)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeGridConfig({
          messages: {
            noData: 'Veri yok',
            search: 'Ara…',
            booleanTrue: 'Evet',
            booleanFalse: 'Hayır',
            rowsSuffix: 'satır',
          },
        }),
      ],
    });
    const fixture = TestBed.createComponent(ConfiguredHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.oge-search-input')?.getAttribute('placeholder')).toBe('Çalışan ara');
    expect(el.querySelector('.oge-pager-info')?.textContent?.trim()).toBe('2 satır');
    const cells = el.querySelectorAll('.oge-row .oge-cell');
    expect(cells[1]?.textContent?.trim()).toBe('Evet');
  });

  it('shows the page-size selector and switches sizes', async () => {
    const fixture = TestBed.createComponent(ConfiguredHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.oge-row').length).toBe(1);
    const select = el.querySelector('.oge-pager-sizes select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['1', '2']);
    select.value = '2';
    expect(select.value).toBe('2');
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    const grid = fixture.debugElement.children[0].componentInstance as OgeGrid<Row>;
    const pageSize = (
      grid as unknown as { store: { paging: { pageSize(): number | null } } }
    ).store.paging.pageSize();
    expect(pageSize).toBe(2);
    expect(el.querySelectorAll('.oge-row').length).toBe(2);
  });

  it('respects allowUnsorting: false (third click returns to asc)', async () => {
    const fixture = TestBed.createComponent(ConfiguredHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const header = el.querySelectorAll('.oge-header-cell')[0] as HTMLElement;
    header.click();
    header.click();
    header.click();
    await settle(fixture);
    expect(header.getAttribute('aria-sort')).toBe('ascending');
  });

  it('uses the per-column filterOperator override', async () => {
    const fixture = TestBed.createComponent(ConfiguredHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('[aria-label="Filter Name"]') as HTMLInputElement;
    // 'y' matches 'Ayşe' with contains but nothing with startswith
    input.value = 'y';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row').length).toBe(0);
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    // both Ali and Ayşe start with 'a' (case-insensitive), page size 1 shows 1
    expect(el.querySelector('.oge-pager-info')?.textContent).toContain('2');
  });
});
