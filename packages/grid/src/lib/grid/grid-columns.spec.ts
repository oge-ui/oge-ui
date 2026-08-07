import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '../columns/column';
import { OgeColumnGroup } from '../columns/column-group';
import { OgeGrid } from './grid';

interface Order {
  id: number;
  status: number;
  phone: string;
  email: string;
  amount: number;
}

const STATUSES = [
  { id: 1, name: 'Pending' },
  { id: 2, name: 'Shipped' },
  { id: 3, name: 'Delivered' },
];

const ORDERS: Order[] = [
  { id: 1, status: 2, phone: '555-1', email: 'a@x.com', amount: 10 },
  { id: 2, status: 1, phone: '555-2', email: 'b@x.com', amount: 30 },
  { id: 3, status: 2, phone: '555-3', email: 'c@x.com', amount: 20 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function cellTexts(el: HTMLElement, col: number): string[] {
  return Array.from(el.querySelectorAll('.oge-row')).map(
    (row) => row.querySelectorAll('.oge-cell')[col]?.textContent?.trim() ?? '',
  );
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [filterRow]="true"
      [filterDebounce]="0"
      [headerFilter]="true"
      [editing]="{ mode: 'cell' }"
    >
      <oge-column
        field="id"
        dataType="number"
        [width]="60"
        [editable]="false"
      />
      <oge-column
        field="status"
        caption="Status"
        [lookup]="{
          dataSource: statuses,
          valueExpr: 'id',
          displayExpr: 'name',
        }"
      />
      <oge-column field="amount" dataType="number" />
    </oge-grid>
  `,
})
class LookupHost {
  readonly data = ORDERS.map((o) => ({ ...o }));
  readonly statuses = STATUSES;
}

describe('OgeGrid lookup columns', () => {
  async function render() {
    const fixture = TestBed.createComponent(LookupHost);
    await settle(fixture);
    return {
      fixture,
      host: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  it('displays lookup text instead of the raw value', async () => {
    const { el } = await render();
    expect(cellTexts(el, 1)).toEqual(['Shipped', 'Pending', 'Shipped']);
  });

  it('filters via the lookup select box on the raw value', async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    try {
      const { fixture, el } = await render();
      const filterInput = el.querySelector(
        'oge-select-box.oge-filter-input .oge-input-native',
      ) as HTMLInputElement;
      expect(filterInput).toBeTruthy();
      filterInput.click(); // opens the filter select-box popup
      await settle(fixture);
      const options = Array.from(el.querySelectorAll('.oge-select-option'));
      expect(options.map((o) => o.textContent?.trim())).toEqual([
        'Pending',
        'Shipped',
        'Delivered',
      ]);
      options[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);
      expect(cellTexts(el, 1)).toEqual(['Shipped', 'Shipped']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('shows lookup texts in the header filter list', async () => {
    const { fixture, el } = await render();
    (
      el.querySelectorAll('.oge-header-filter-btn')[1] as HTMLButtonElement
    ).click();
    await settle(fixture);
    const items = Array.from(
      el.querySelectorAll('.oge-hf-item:not(.oge-hf-all) > span'),
    ).map((s) => s.textContent?.trim());
    expect(items).toEqual(['Pending', 'Shipped']);
  });

  it('edits through a lookup select box and commits the raw value', async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    try {
      const { fixture, host, el } = await render();
      const statusCell = el
        .querySelectorAll('.oge-row')[1]
        .querySelectorAll('.oge-cell')[1] as HTMLElement;
      statusCell.click();
      await settle(fixture);
      const editor = el.querySelector(
        '.oge-editor .oge-input-native',
      ) as HTMLInputElement;
      expect(editor).toBeTruthy();
      expect(editor.value).toBe('Pending'); // display text of the raw value
      editor.click(); // opens the select-box popup
      await settle(fixture);
      const delivered = Array.from(
        el.querySelectorAll('.oge-select-option'),
      ).find((o) => o.textContent?.trim() === 'Delivered');
      expect(delivered).toBeTruthy();
      delivered?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);
      editor.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await settle(fixture);
      expect(host.data[1].status).toBe(3); // raw value written back
      expect(cellTexts(el, 1)[1]).toBe('Delivered');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('exports lookup display text in CSV', async () => {
    const { fixture } = await render();
    const grid = fixture.debugElement.children[0]
      .componentInstance as OgeGrid<Order>;
    const csv = await grid.getCsv({ bom: false });
    expect(csv.split('\r\n')[1]).toBe('1,Shipped,10');
  });
});

@Component({
  imports: [OgeGrid, OgeColumn, OgeColumnGroup],
  template: `
    <oge-grid [data]="data" keyField="id">
      <oge-column field="id" dataType="number" [width]="60" sortOrder="desc" />
      <oge-column-group caption="Contact">
        <oge-column field="phone" />
        <oge-column field="email" />
      </oge-column-group>
      <oge-column
        field="amount"
        dataType="number"
        [calculateCellValue]="doubled"
      />
    </oge-grid>
  `,
})
class BandedHost {
  readonly data = ORDERS;
  readonly doubled = (row: Order) => row.amount * 2;
}

describe('OgeGrid banded + calculated + initial sort', () => {
  async function render() {
    const fixture = TestBed.createComponent(BandedHost);
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders a band row with correct spans', async () => {
    const { el } = await render();
    const cells = Array.from(el.querySelectorAll('.oge-band-cell'));
    expect(cells.map((c) => c.textContent?.trim())).toEqual([
      '',
      'Contact',
      '',
    ]);
    expect((cells[1] as HTMLElement).style.gridColumn).toBe('span 2');
  });

  it('applies the initial sortOrder from the column input', async () => {
    const { el } = await render();
    expect(
      el.querySelectorAll('.oge-header-cell')[0].getAttribute('aria-sort'),
    ).toBe('descending');
    expect(cellTexts(el, 0)).toEqual(['3', '2', '1']);
  });

  it('renders calculateCellValue output (display-only)', async () => {
    const { el } = await render();
    expect(cellTexts(el, 3)).toEqual(['40', '60', '20']); // sorted desc by id
  });
});

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid [data]="data" keyField="id" [wordWrap]="true">
      <oge-column field="id" dataType="number" [width]="100" />
      <oge-column field="phone" [width]="200" />
      <oge-column field="email" [width]="200" [hidingPriority]="0" />
      <oge-column field="amount" [width]="200" [hidingPriority]="1" />
    </oge-grid>
  `,
})
class AdaptiveHost {
  readonly data = ORDERS;
}

describe('OgeGrid adaptive hiding + word wrap', () => {
  it('hides low-priority columns when the width runs out and restores them', async () => {
    const fixture = TestBed.createComponent(AdaptiveHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const grid = fixture.debugElement.children[0]
      .componentInstance as OgeGrid<Order>;
    const setWidth = (w: number) =>
      (
        grid as unknown as { hostWidth: { set(v: number): void } }
      ).hostWidth.set(w);

    const captions = () =>
      Array.from(el.querySelectorAll('.oge-header-caption')).map((h) =>
        h.textContent?.trim(),
      );

    setWidth(710); // fits all (100+200+200+200)
    await settle(fixture);
    expect(captions()).toEqual(['Id', 'Phone', 'Email', 'Amount']);

    setWidth(520); // one must go → lowest priority (email, 0) hides first
    await settle(fixture);
    expect(captions()).toEqual(['Id', 'Phone', 'Amount']);

    setWidth(300); // amount (priority 1) hides too
    await settle(fixture);
    expect(captions()).toEqual(['Id', 'Phone']);

    setWidth(1000);
    await settle(fixture);
    expect(captions()).toEqual(['Id', 'Phone', 'Email', 'Amount']);
  });

  it('applies the word-wrap class', async () => {
    const fixture = TestBed.createComponent(AdaptiveHost);
    await settle(fixture);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-grid.oge-wrap',
      ),
    ).toBeTruthy();
  });
});
