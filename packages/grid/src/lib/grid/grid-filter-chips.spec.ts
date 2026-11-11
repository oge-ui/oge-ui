import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomDataSource } from '@oge-ui/core';
import type { OgeMenuItem } from '@oge-ui/behavior';
import { OgeColumn } from '../columns/column';
import { OgeGrid } from './grid';
import type { OgeHeaderContextMenuEvent } from './grid-events';

interface Line {
  id: number;
  name: string | null;
  city: string | null;
  qty: number;
}

const LINES: Line[] = [
  { id: 1, name: 'Ali Kaya', city: 'Ankara', qty: 2 },
  { id: 2, name: 'Ayşe Demir', city: 'İzmir', qty: 5 },
  { id: 3, name: 'Kaya, Mehmet', city: '', qty: 7 },
  { id: 4, name: 'Zeynep', city: null, qty: 1 },
];

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      #grid
      [data]="lines"
      keyField="id"
      [filterRow]="true"
      [filterDebounce]="0"
      [headerFilter]="true"
      [searchPanel]="true"
      [filterChips]="true"
      [summaryMenu]="true"
      (headerContextMenu)="menus.push($event)"
    >
      <oge-column field="name" caption="Name" />
      <oge-column field="city" caption="City" />
      <oge-column
        field="qty"
        caption="Qty"
        dataType="number"
        totalSummary="sum"
      />
    </oge-grid>
  `,
})
class Host {
  readonly lines = LINES;
  readonly menus: OgeHeaderContextMenuEvent[] = [];
  readonly grid = viewChild.required<OgeGrid<Line>>('grid');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeGrid summary menu, filter chips and value lists', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  const names = () =>
    Array.from(el.querySelectorAll('.oge-row')).map(
      (row) => row.querySelector('.oge-cell')?.textContent?.trim() ?? '',
    );
  const chips = () =>
    Array.from(el.querySelectorAll('.oge-filter-chip')).map((chip) =>
      Array.from(chip.querySelectorAll('span'))
        .map((part) => part.textContent?.trim())
        .join(' '),
    );

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    el = fixture.nativeElement as HTMLElement;
    await settle(fixture);
  });

  function openHeaderMenu(colId: string): OgeMenuItem[] {
    el.querySelector(`.oge-header-cell[data-colid="${colId}"]`)?.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    return fixture.componentInstance.menus.at(-1)?.items ?? [];
  }

  it('picks a total from the header menu, persists it and counts text columns', async () => {
    const totals = () =>
      Array.from(el.querySelectorAll('.oge-total-cell')).map((c) =>
        c.textContent?.trim(),
      );
    expect(totals()).toContain('Sum: 15');
    const summary = openHeaderMenu('qty').find((i) => i.text === 'Summary');
    expect(summary?.items?.map((i) => i.text)).toEqual([
      'Column default',
      'None',
      'Count',
      'Sum',
      'Avg',
      'Min',
      'Max',
    ]);
    summary?.items?.find((i) => i.text === 'Max')?.action?.();
    await settle(fixture);
    expect(totals()).toContain('Max: 7');
    // text columns only offer Count
    const nameSummary = openHeaderMenu('name').find(
      (i) => i.text === 'Summary',
    );
    expect(nameSummary?.items?.map((i) => i.text)).toEqual([
      'Column default',
      'None',
      'Count',
    ]);
    nameSummary?.items?.find((i) => i.text === 'Count')?.action?.();
    await settle(fixture);
    expect(totals()).toContain('Count: 4');
    expect(fixture.componentInstance.grid().state().summaries).toEqual([
      ['qty', 'max'],
      ['name', 'count'],
    ]);
  });

  it('shows a chip per narrowing filter and removes one at a time', async () => {
    const input = el.querySelector(
      '.oge-filter-cell .oge-text-box input, .oge-filter-cell input',
    ) as HTMLInputElement;
    input.value = 'kaya';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    fixture.componentInstance.grid().applyState({
      ...fixture.componentInstance.grid().state(),
      filter: {
        ...fixture.componentInstance.grid().state().filter,
        header: [['city', ['Ankara', null]]],
      },
    });
    await settle(fixture);
    expect(chips()).toEqual([
      'Name · Contains · kaya',
      'City · Is any of · Ankara, (Blank)',
    ]);
    // "(Blank)" also matches the empty string, not only null
    expect(names()).toEqual(['Ali Kaya', 'Kaya, Mehmet']);

    const removeName = el.querySelector(
      '[data-chip="row:name"] .oge-filter-chip-remove',
    ) as HTMLButtonElement;
    expect(removeName.getAttribute('aria-label')).toBe(
      'Remove filter: Name · Contains · kaya',
    );
    removeName.click();
    await settle(fixture);
    expect(chips()).toEqual(['City · Is any of · Ankara, (Blank)']);
    // the filter-row editor was emptied with it
    const fresh = el.querySelector(
      '.oge-filter-cell input',
    ) as HTMLInputElement;
    expect(fresh.value).toBe('');
    expect(names()).toEqual(['Ali Kaya', 'Kaya, Mehmet', 'Zeynep']);

    (el.querySelector('.oge-filter-chips-clear') as HTMLButtonElement).click();
    await settle(fixture);
    expect(el.querySelector('.oge-filter-chips')).toBeNull();
    expect(names()).toHaveLength(4);
  });

  it('lists one "(Blank)" item for null, empty and whitespace values', async () => {
    (
      el.querySelectorAll('.oge-header-filter-btn')[1] as HTMLButtonElement
    ).click();
    await settle(fixture);
    const items = Array.from(
      el.querySelectorAll('.oge-hf-item:not(.oge-hf-all) > span'),
    ).map((s) => s.textContent?.trim());
    expect(items).toEqual(['Ankara', 'İzmir', '(Blank)']);
    expect(el.querySelector('.oge-hf-note')).toBeNull();
  });
});

describe('OgeGrid value list on a large server column', () => {
  it('says when the list was cut at valueLimit', async () => {
    const source = new CustomDataSource<Line>({
      key: 'id',
      load: async () => ({ data: LINES, totalCount: LINES.length }),
      distinct: async (_field, options = {}) =>
        Array.from({ length: (options.take ?? 10) + 5 }, (_, i) => `City ${i}`),
    });
    const fixture = TestBed.createComponent(OgeGrid<Line>);
    fixture.componentRef.setInput('data', source);
    fixture.componentRef.setInput('columns', ['id', 'name', 'city']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('headerFilter', { valueLimit: 3 });
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    (
      el.querySelectorAll('.oge-header-filter-btn')[2] as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-hf-item:not(.oge-hf-all)').length).toBe(3);
    expect(el.querySelector('.oge-hf-note')?.textContent?.trim()).toBe(
      'Showing the first 3 values — type to narrow the list.',
    );
  });
});

describe('OgeGrid server totals', () => {
  it('asks the server for totals over the filtered set and shows its answer', async () => {
    const asked: unknown[] = [];
    const source = new CustomDataSource<Line>({
      key: 'id',
      load: async (options) => {
        asked.push(options.totalSummary);
        // one page of two rows; the total covers every filtered row
        return { data: LINES.slice(0, 2), totalCount: 4, summary: [999] };
      },
    });
    @Component({
      imports: [OgeGrid, OgeColumn],
      template: `
        <oge-grid [data]="source" keyField="id" [paging]="{ pageSize: 2 }">
          <oge-column field="name" />
          <oge-column field="qty" dataType="number" totalSummary="sum" />
        </oge-grid>
      `,
    })
    class ServerHost {
      readonly source = source;
    }
    const fixture = TestBed.createComponent(ServerHost);
    await settle(fixture);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(asked.at(-1)).toEqual([{ field: 'qty', type: 'sum' }]);
    expect(
      Array.from(el.querySelectorAll('.oge-total-cell')).map((c) =>
        c.textContent?.trim(),
      ),
    ).toContain('Sum: 999');
  });
});
