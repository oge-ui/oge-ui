import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PivotResult } from '@oge-ui/core';
import type {
  OgePivotCalculatedField,
  OgePivotRowHeaderLayout,
} from '@oge-ui/pivot-engine';
import { OgePivotField } from './pivot-field';
import { OgePivotGrid } from './pivot-grid';
import {
  OgePivotCellTemplate,
  OgePivotColumnHeaderTemplate,
  OgePivotRowHeaderTemplate,
} from './pivot-templates';

interface Sale {
  region: string;
  city: string;
  year: number;
  amount: number;
  cost: number;
}

const SALES: Sale[] = [
  { region: 'EU', city: 'Berlin', year: 2024, amount: 100, cost: 60 },
  { region: 'EU', city: 'Paris', year: 2025, amount: 70, cost: 30 },
  { region: 'US', city: 'NYC', year: 2025, amount: 300, cost: 100 },
  { region: 'Asia', city: 'Tokyo', year: 2025, amount: 20, cost: 15 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [
    OgePivotGrid,
    OgePivotField,
    OgePivotCellTemplate,
    OgePivotRowHeaderTemplate,
    OgePivotColumnHeaderTemplate,
  ],
  template: `
    <oge-pivot-grid
      [data]="data"
      [fieldPanel]="false"
      [calculatedFields]="calcs()"
      [rowHeaderLayout]="layout()"
      (resultChange)="results.push($event)"
    >
      <oge-pivot-field
        dataField="region"
        area="row"
        [topN]="{ count: 2, measure: 'amount' }"
      />
      <oge-pivot-field dataField="city" area="row" />
      <oge-pivot-field dataField="year" area="column" />
      <oge-pivot-field dataField="amount" area="data" />
      <oge-pivot-field dataField="cost" area="data" />
      @if (templates()) {
        <b *ogePivotCellTemplate="let cell" class="tpl-cell"
          >{{ cell.measureId }}={{ cell.text }}</b
        >
        <i *ogePivotRowHeaderTemplate="let line; rowIndex as r" class="tpl-row"
          >{{ r }}:{{ line.text }}</i
        >
        <u *ogePivotColumnHeaderTemplate="let cell" class="tpl-col">{{
          cell.text
        }}</u>
      }
    </oge-pivot-grid>
  `,
})
class Host {
  readonly grid = viewChild.required(OgePivotGrid<Sale>);
  readonly data = SALES;
  readonly calcs = signal<readonly OgePivotCalculatedField[]>([]);
  readonly layout = signal<OgePivotRowHeaderLayout>('compact');
  readonly templates = signal(false);
  readonly results: PivotResult[] = [];
}

async function render(configure?: (host: Host) => void) {
  const fixture = TestBed.createComponent(Host);
  configure?.(fixture.componentInstance);
  await settle(fixture);
  return {
    fixture,
    host: fixture.componentInstance,
    el: fixture.nativeElement as HTMLElement,
  };
}

const rowHeaders = (el: HTMLElement) =>
  [...el.querySelectorAll('.oge-pivot-row-header')].map((h) =>
    h.textContent?.replace(/\s+/g, ' ').trim(),
  );

describe('OgePivotGrid analysis features', () => {
  it('Top-N keeps the two biggest regions; calculated measures render with their format', async () => {
    const { el, host, fixture } = await render((h) =>
      h.calcs.set([
        {
          name: 'profit',
          caption: 'Profit',
          expression: (v) => (v.amount ?? 0) - (v.cost ?? 0),
          format: (value) => `P${String(value)}`,
        },
      ]),
    );
    expect(rowHeaders(el)).toEqual(['EU', 'US', 'Grand Total']);
    const grid = host.grid();
    expect(grid.getResult().measures.map((m) => m.id)).toEqual([
      'amount',
      'cost',
      'profit',
    ]);
    const firstCell = el.querySelector('.oge-pivot-cell');
    expect(firstCell?.querySelectorAll('.oge-pivot-measure')).toHaveLength(3);
    expect(el.textContent).toContain('P200'); // US grand total: 300 − 100
    expect(grid.getPreparedCell(1, 2, 2).text).toBe('P200');
    // the chart helper reads the same view
    const chart = grid.getChartData({ measures: ['profit'] });
    expect(chart.dataSource.map((p) => p.argument)).toEqual(['EU', 'US']);
    expect(host.results.length).toBeGreaterThan(0);
    const before = host.results.length;
    host.calcs.set([]);
    await settle(fixture);
    expect(host.results.length).toBeGreaterThan(before);
  });

  it('lays the row header out as outline / tabular label columns', async () => {
    const { el, host, fixture } = await render((h) => h.layout.set('tabular'));
    host.grid().expandAll('row');
    await settle(fixture);
    const corner = el.querySelector('.oge-pivot-corner');
    expect(corner?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Region City',
    );
    expect(rowHeaders(el)).toContain('EU Berlin');
    host.layout.set('outline');
    await settle(fixture);
    expect(rowHeaders(el)).toContain('Berlin');
    expect(rowHeaders(el)).not.toContain('EU Berlin');
    expect(host.grid().getRowHeaderLayout()).toBe('outline');
    expect(host.grid().getRowFieldCaptions()).toEqual(['Region', 'City']);
  });

  it('renders cell, row-header and column-header templates', async () => {
    const { el } = await render((h) => h.templates.set(true));
    expect(el.querySelector('.tpl-cell')?.textContent).toBe('amount=100');
    expect(el.querySelectorAll('.tpl-cell').length).toBeGreaterThan(2);
    expect(el.querySelector('.tpl-row')?.textContent).toBe('0:EU');
    expect(el.querySelector('.tpl-col')?.textContent).toBe('2024');
    // the expander and the keyboard model stay the grid's
    expect(
      el.querySelector('.oge-pivot-row-header')?.getAttribute('role'),
    ).toBe('rowheader');
  });
});
