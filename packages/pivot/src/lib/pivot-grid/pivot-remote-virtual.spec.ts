import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LocalPivotStore,
  type OgePivotStore,
  type PivotLoadOptions,
  type PivotLoadResult,
} from '@oge-ui/core';
import { OgePivotField } from './pivot-field';
import { OgePivotGrid } from './pivot-grid';

interface Sale {
  region: string;
  city: string;
  year: number;
  amount: number;
}

function makeSales(count: number): Sale[] {
  return Array.from({ length: count }, (_, i) => ({
    region: `Region ${String(i % 50)}`,
    city: `City ${String(i % 200)}`,
    year: 2020 + (i % 3),
    amount: (i * 31) % 500,
  }));
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

// --- virtualization ----------------------------------------------------------

@Component({
  imports: [OgePivotGrid, OgePivotField],
  template: `
    <oge-pivot-grid
      [data]="data"
      [virtualScrolling]="true"
      [fieldPanel]="false"
    >
      <oge-pivot-field dataField="region" area="row" />
      <oge-pivot-field dataField="city" area="row" />
      <oge-pivot-field dataField="year" area="column" />
      <oge-pivot-field dataField="amount" area="data" summaryType="sum" />
    </oge-pivot-grid>
  `,
})
class VirtualHost {
  readonly data = makeSales(20_000);
}

describe('OgePivotGrid virtual scrolling', () => {
  it('renders only the windowed slice of a large matrix', async () => {
    const fixture = TestBed.createComponent(VirtualHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const grid = fixture.debugElement.children[0]
      .componentInstance as OgePivotGrid<Sale>;
    grid.expandAll('row'); // 50 regions × 200 cities → thousands of row slots
    await settle(fixture);

    const totalRows = Array.from(
      el.querySelectorAll('.oge-pivot-row-header'),
    ).length;
    expect(totalRows).toBeLessThan(80); // window + overscan, not thousands
    expect(el.querySelectorAll('.oge-pivot-cell').length).toBeLessThan(400);

    // explicit track templates keep off-window slots in place
    const matrix = el.querySelector('.oge-pivot-matrix') as HTMLElement;
    expect(matrix.style.gridTemplateRows).toContain('32px');
  });
});

// --- remote store ------------------------------------------------------------

class LoggingStore implements OgePivotStore<Sale> {
  readonly calls: PivotLoadOptions[] = [];
  private readonly inner = new LocalPivotStore<Sale>(makeSales(200));

  load(options: PivotLoadOptions): Promise<PivotLoadResult> {
    this.calls.push(options);
    return this.inner.load(options);
  }
}

@Component({
  imports: [OgePivotGrid, OgePivotField],
  template: `
    <oge-pivot-grid [data]="store" [fieldPanel]="false">
      <oge-pivot-field dataField="region" area="row" />
      <oge-pivot-field dataField="city" area="row" />
      <oge-pivot-field dataField="year" area="column" />
      <oge-pivot-field dataField="amount" area="data" summaryType="sum" />
    </oge-pivot-grid>
  `,
})
class RemoteHost {
  readonly store = new LoggingStore();
}

describe('OgePivotGrid remote store', () => {
  it('loads through the serializable contract and re-loads on expand', async () => {
    const fixture = TestBed.createComponent(RemoteHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const store = fixture.componentInstance.store;

    expect(store.calls).toHaveLength(1);
    expect(store.calls[0].rowFields.map((f) => f.dataField)).toEqual([
      'region',
      'city',
    ]);
    expect(store.calls[0].measures).toEqual([
      { field: 'amount', type: 'sum', name: undefined },
    ]);

    const headers = Array.from(
      el.querySelectorAll('.oge-pivot-row-header'),
    ).map((h) => h.textContent?.trim());
    expect(headers[0]).toBe('Region 0');
    expect(headers.at(-1)).toBe('Grand Total'); // grand row from rowTotals payload

    // expanding issues exactly one new request carrying the expanded path
    (el.querySelector('.oge-pivot-row-header') as HTMLElement).click();
    await settle(fixture);
    expect(store.calls).toHaveLength(2);
    expect(store.calls[1].rowExpandedPaths).toEqual([['Region 0']]);
    const expanded = Array.from(
      el.querySelectorAll('.oge-pivot-row-header'),
    ).map((h) => h.textContent?.trim());
    expect(expanded).toContain('City 0'); // children came from the second load
  });
});
