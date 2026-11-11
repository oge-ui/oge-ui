import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OgeSimpleTableColumn } from '@oge-ui/behavior';
import { provideOgeSimpleTableConfig } from './config';
import { OgeSimpleTable } from './simple-table';
import {
  OgeSimpleTableEmpty,
  OgeSimpleTableFooter,
  OgeSimpleTableHeader,
  OgeSimpleTableRow,
} from './templates';

interface Line {
  no: number;
  item: { name: string };
  qty: number;
}

const LINES: Line[] = Array.from({ length: 12 }, (_, i) => ({
  no: i + 1,
  item: { name: `Item ${i + 1}` },
  qty: (i + 1) * 2,
}));

@Component({
  imports: [OgeSimpleTable],
  template: `<oge-simple-table [value]="rows()" caption="Lines" />`,
})
class PlainHost {
  readonly rows = signal<readonly unknown[]>([{ orderNo: 7, unitPrice: 3 }]);
}

@Component({
  imports: [
    OgeSimpleTable,
    OgeSimpleTableRow,
    OgeSimpleTableHeader,
    OgeSimpleTableFooter,
    OgeSimpleTableEmpty,
  ],
  template: `
    <oge-simple-table
      [value]="rows()"
      [columns]="columns"
      [paging]="paging()"
      [pageSize]="5"
      [(pageIndex)]="page"
      [compact]="true"
      ariaLabel="Order lines"
    >
      <ng-template
        ogeSimpleTableRow
        [ogeSimpleTableRowOf]="rows()"
        let-line
        let-columns="columns"
        let-rowIndex="rowIndex"
      >
        <tr class="line">
          <td>{{ rowIndex }}:{{ line.item.name }}</td>
          <td [class]="columns[1].cellClass">{{ line.qty * 10 }}</td>
        </tr>
      </ng-template>
      <ng-template ogeSimpleTableFooter let-cols let-all="rows">
        <tr class="total">
          <td>{{ cols.length }} columns</td>
          <td>{{ all.length }} rows</td>
        </tr>
      </ng-template>
      <ng-template ogeSimpleTableEmpty>Nothing yet</ng-template>
    </oge-simple-table>
  `,
})
class TemplateHost {
  readonly rows = signal<readonly Line[]>(LINES);
  readonly paging = signal(true);
  readonly page = signal(0);
  readonly columns: OgeSimpleTableColumn[] = [
    { field: 'item.name', caption: 'Item', width: '60%' },
    { field: 'qty', caption: 'Amount', align: 'end' },
  ];
}

@Component({
  imports: [OgeSimpleTable, OgeSimpleTableHeader],
  template: `
    <oge-simple-table [value]="[]">
      <ng-template ogeSimpleTableHeader>
        <tr>
          <th scope="col" colspan="2">Grouped</th>
        </tr>
      </ng-template>
    </oge-simple-table>
  `,
})
class HeaderHost {}

describe('OgeSimpleTable', () => {
  const q = <E extends Element = HTMLElement>(
    fixture: ComponentFixture<unknown>,
    selector: string,
  ) => (fixture.nativeElement as HTMLElement).querySelector<E>(selector);
  const qa = (fixture: ComponentFixture<unknown>, selector: string) =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(selector),
    );

  it('renders a plain table from the first row without columns', () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.detectChanges();
    expect(q(fixture, 'caption')?.textContent?.trim()).toBe('Lines');
    expect(qa(fixture, 'th').map((th) => th.textContent?.trim())).toEqual([
      'Order No',
      'Unit Price',
    ]);
    expect(qa(fixture, 'th')[0].getAttribute('scope')).toBe('col');
    expect(qa(fixture, 'tbody td').map((td) => td.textContent?.trim())).toEqual(
      ['7', '3'],
    );
    expect(q(fixture, '.oge-simple-table-pager')).toBeNull();
  });

  it('renders the row template with typed context and aligned classes', () => {
    const fixture = TestBed.createComponent(TemplateHost);
    fixture.detectChanges();
    const rows = qa(fixture, 'tbody tr.line');
    expect(rows).toHaveLength(5);
    expect(rows[0].children[0].textContent?.trim()).toBe('0:Item 1');
    const amountTh = qa(fixture, 'th')[1];
    const amountTd = rows[0].children[1];
    expect(amountTh.className).toContain('oge-simple-table-align-end');
    expect(amountTd.className).toBe(amountTh.className);
    expect(q(fixture, 'col')?.getAttribute('style')).toContain('60%');
    expect(
      q(fixture, 'oge-simple-table')?.classList.contains(
        'oge-simple-table-compact',
      ),
    ).toBe(true);
    expect(q(fixture, 'table')?.getAttribute('aria-label')).toBe('Order lines');
    expect(q(fixture, 'tfoot tr.total')?.textContent).toContain('12 rows');
  });

  it('pages with previous / next and keeps rowIndex absolute', () => {
    const fixture = TestBed.createComponent(TemplateHost);
    fixture.detectChanges();
    const info = () =>
      q(fixture, '.oge-simple-table-info')?.textContent?.trim();
    const prev = () =>
      q<HTMLButtonElement>(fixture, '[data-oge-simple-table-pager="prev"]')!;
    const next = () =>
      q<HTMLButtonElement>(fixture, '[data-oge-simple-table-pager="next"]')!;
    expect(info()).toBe('1–5 of 12');
    expect(prev().disabled).toBe(true);
    expect(q(fixture, '[role="group"]')?.getAttribute('aria-label')).toBe(
      'Table pages',
    );
    next().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(1);
    expect(info()).toBe('6–10 of 12');
    expect(
      qa(fixture, 'tbody tr.line')[0].children[0].textContent?.trim(),
    ).toBe('5:Item 6');
    next().click();
    fixture.detectChanges();
    expect(info()).toBe('11–12 of 12');
    expect(next().disabled).toBe(true);
    // an out-of-range page is clamped
    fixture.componentInstance.page.set(9);
    fixture.detectChanges();
    expect(info()).toBe('11–12 of 12');
    // no paging: every row, no pager
    fixture.componentInstance.paging.set(false);
    fixture.detectChanges();
    expect(qa(fixture, 'tbody tr.line')).toHaveLength(12);
    expect(q(fixture, '.oge-simple-table-pager')).toBeNull();
  });

  it('shows the empty template across every column', () => {
    const fixture = TestBed.createComponent(TemplateHost);
    fixture.componentInstance.rows.set([]);
    fixture.detectChanges();
    const empty = q(fixture, 'td.oge-simple-table-empty');
    expect(empty?.textContent?.trim()).toBe('Nothing yet');
    expect(empty?.getAttribute('colspan')).toBe('2');
  });

  it('takes a custom header and the configured messages', () => {
    TestBed.configureTestingModule({
      providers: [provideOgeSimpleTableConfig({ messages: { noData: 'Yok' } })],
    });
    const fixture = TestBed.createComponent(HeaderHost);
    fixture.detectChanges();
    expect(q(fixture, 'th')?.getAttribute('colspan')).toBe('2');
    expect(q(fixture, 'td.oge-simple-table-empty')?.textContent?.trim()).toBe(
      'Yok',
    );
  });

  it('prints user text as text', () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.rows.set([
      { name: '<img src=x onerror=alert(1)>' },
    ]);
    fixture.detectChanges();
    expect(q(fixture, 'tbody img')).toBeNull();
    expect(q(fixture, 'tbody td')?.textContent?.trim()).toBe(
      '<img src=x onerror=alert(1)>',
    );
  });
});
