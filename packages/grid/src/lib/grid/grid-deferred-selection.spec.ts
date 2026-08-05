import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { FilterExpr } from '@oge-ui/core';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  amount: number;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada', amount: 100 },
  { id: 2, name: 'Grace', amount: 200 },
  { id: 3, name: 'Linus', amount: 300 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [columns]="['name', 'amount']"
      selectionMode="checkbox"
      [selectionDeferred]="true"
      [(selectionFilter)]="selectionFilter"
    />
  `,
})
class DeferredHost {
  readonly data = ROWS;
  readonly selectionFilter = signal<FilterExpr | null>(null);
}

function rowCheckboxes(el: HTMLElement): HTMLInputElement[] {
  return Array.from(el.querySelectorAll('.oge-row input[type="checkbox"]'));
}

describe('OgeGrid deferred selection', () => {
  async function render() {
    const fixture = TestBed.createComponent(DeferredHost);
    await settle(fixture);
    return { fixture, host: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('builds key expressions instead of tracking keys', async () => {
    const { fixture, host, el } = await render();
    rowCheckboxes(el)[0].click();
    await settle(fixture);
    expect(host.selectionFilter()).toEqual({ type: 'binary', field: 'id', op: 'eq', value: 1 });
    expect(rowCheckboxes(el)[0].checked).toBe(true);

    rowCheckboxes(el)[2].click();
    await settle(fixture);
    expect(host.selectionFilter()).toEqual({
      type: 'or',
      operands: [
        { type: 'binary', field: 'id', op: 'eq', value: 1 },
        { type: 'binary', field: 'id', op: 'eq', value: 3 },
      ],
    });
  });

  it('select-all produces a filter expression and unchecking carves rows out', async () => {
    const { fixture, host, el } = await render();
    (el.querySelector('.oge-header-cell.oge-checkbox-cell input') as HTMLInputElement).click();
    await settle(fixture);
    expect(host.selectionFilter()).toEqual({ type: 'binary', field: 'id', op: 'isnotnull' });
    expect(rowCheckboxes(el).every((cb) => cb.checked)).toBe(true);

    rowCheckboxes(el)[1].click();
    await settle(fixture);
    expect(host.selectionFilter()).toEqual({
      type: 'and',
      operands: [
        { type: 'binary', field: 'id', op: 'isnotnull' },
        { type: 'not', operand: { type: 'binary', field: 'id', op: 'eq', value: 2 } },
      ],
    });
    expect(rowCheckboxes(el).map((cb) => cb.checked)).toEqual([true, false, true]);

    // header checkbox reset clears everything
    (el.querySelector('.oge-header-cell.oge-checkbox-cell input') as HTMLInputElement).click();
    await settle(fixture);
    (el.querySelector('.oge-header-cell.oge-checkbox-cell input') as HTMLInputElement).click();
    await settle(fixture);
    expect(host.selectionFilter()).toBeNull();
    expect(rowCheckboxes(el).some((cb) => cb.checked)).toBe(false);
  });

  it('a programmatic selectionFilter pre-selects matching rows and drives exports', async () => {
    const { fixture, host, el } = await render();
    host.selectionFilter.set({ type: 'binary', field: 'amount', op: 'ge', value: 200 });
    await settle(fixture);
    expect(rowCheckboxes(el).map((cb) => cb.checked)).toEqual([false, true, true]);

    const grid = fixture.debugElement.children[0].componentInstance as OgeGrid<Row>;
    const { rows } = await grid.getExportData({ scope: 'selection' });
    expect(rows.map((r) => r.id)).toEqual([2, 3]);
  });
});
