import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeGridColumnHidingMode } from '@oge-ui/behavior';
import { OgeColumn } from '../columns/column';
import { OgeCellTemplate } from '../templates/cell-template';
import { OgeGrid } from './grid';

interface Order {
  id: number;
  phone: string;
  email: string;
  amount: number;
}

const ORDERS: Order[] = [
  { id: 1, phone: '555-1', email: 'a@x.com', amount: 10 },
  { id: 2, phone: '555-2', email: 'b@x.com', amount: 1234.5 },
];

@Component({
  imports: [OgeGrid, OgeColumn, OgeCellTemplate],
  template: `
    <oge-grid [data]="data" keyField="id" [columnHidingMode]="mode()">
      <oge-column field="id" dataType="number" [width]="100" />
      <oge-column field="phone" [width]="200" />
      <oge-column
        field="email"
        caption="E-mail"
        [width]="200"
        [hidingPriority]="0"
      >
        <a
          *ogeCellTemplate="let value"
          class="mail"
          [href]="'mailto:' + value"
          >{{ value }}</a
        >
      </oge-column>
      <oge-column
        field="amount"
        dataType="number"
        [format]="money"
        [width]="200"
        [hidingPriority]="1"
      />
    </oge-grid>
  `,
})
class Host {
  readonly data = ORDERS;
  readonly mode = signal<OgeGridColumnHidingMode>('detail');
  readonly money = (value: unknown) => `$${Number(value).toFixed(2)}`;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function narrowGrid(width: number, mode?: OgeGridColumnHidingMode) {
  const fixture = TestBed.createComponent(Host);
  if (mode) fixture.componentInstance.mode.set(mode);
  await settle(fixture);
  const grid = fixture.debugElement.children[0]
    .componentInstance as OgeGrid<Order>;
  (grid as unknown as { hostWidth: { set(v: number): void } }).hostWidth.set(
    width,
  );
  await settle(fixture);
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

const captions = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('.oge-header-caption')).map((h) =>
    h.textContent?.trim(),
  );

describe('OgeGrid adaptive detail (columnHidingMode)', () => {
  it('gives every row a toggle once a column is hidden, counting its width', async () => {
    // 100 + 200 + 200 + 200 = 700 fits 710 → nothing hidden, no toggle
    const wide = await narrowGrid(710);
    expect(captions(wide.el)).toEqual(['Id', 'Phone', 'E-mail', 'Amount']);
    expect(wide.el.querySelector('.oge-adaptive-toggle')).toBeNull();

    // 570: e-mail goes (532 + the 32px toggle = 564 fits)
    const narrow = await narrowGrid(570);
    expect(captions(narrow.el)).toEqual(['Id', 'Phone', 'Amount']);
    const toggles = narrow.el.querySelectorAll('.oge-row .oge-adaptive-toggle');
    expect(toggles.length).toBe(2);
    expect(toggles[0].getAttribute('aria-expanded')).toBe('false');
    expect(toggles[0].getAttribute('aria-label')).toBe('Show hidden columns');
  });

  it('reveals the hidden caption / value pairs, formatted and templated like the cells', async () => {
    const { fixture, el } = await narrowGrid(300);
    expect(captions(el)).toEqual(['Id', 'Phone']);
    const row = el.querySelectorAll<HTMLElement>('.oge-row')[1];
    const toggle = row.querySelector<HTMLButtonElement>(
      '.oge-adaptive-toggle',
    )!;
    toggle.click();
    await settle(fixture);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const detail = row.querySelector<HTMLElement>('.oge-adaptive-detail')!;
    expect(detail.getAttribute('role')).toBe('gridcell');
    expect(toggle.getAttribute('aria-controls')).toBe(detail.id);
    const pairs = Array.from(
      detail.querySelectorAll('.oge-adaptive-detail-item'),
    ).map((item) => [
      item.querySelector('dt')?.textContent?.trim(),
      item.querySelector('dd')?.textContent?.trim(),
    ]);
    expect(pairs).toEqual([
      ['E-mail', 'b@x.com'],
      ['Amount', '$1234.50'],
    ]);
    // the cell template rendered, not just the text
    expect(detail.querySelector('a.mail')?.getAttribute('href')).toBe(
      'mailto:b@x.com',
    );
    // other rows stay collapsed
    expect(el.querySelectorAll('.oge-adaptive-detail').length).toBe(1);

    toggle.click();
    await settle(fixture);
    expect(row.querySelector('.oge-adaptive-detail')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it("drops hidden data entirely with columnHidingMode 'hide'", async () => {
    const { el } = await narrowGrid(300, 'hide');
    expect(captions(el)).toEqual(['Id', 'Phone']);
    expect(el.querySelector('.oge-adaptive-toggle')).toBeNull();
  });
});
