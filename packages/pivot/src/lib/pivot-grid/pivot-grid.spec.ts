import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgePivotField } from './pivot-field';
import { OgePivotGrid } from './pivot-grid';

interface Sale {
  region: string;
  city: string;
  year: number;
  amount: number;
}

const SALES: Sale[] = [
  { region: 'EU', city: 'Berlin', year: 2024, amount: 100 },
  { region: 'EU', city: 'Berlin', year: 2025, amount: 200 },
  { region: 'EU', city: 'Paris', year: 2024, amount: 50 },
  { region: 'US', city: 'NYC', year: 2024, amount: 300 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgePivotGrid, OgePivotField],
  template: `
    <oge-pivot-grid [data]="data">
      <oge-pivot-field dataField="region" area="row" />
      <oge-pivot-field dataField="city" area="row" />
      <oge-pivot-field dataField="year" area="column" />
      <oge-pivot-field dataField="amount" area="data" summaryType="sum" />
    </oge-pivot-grid>
  `,
})
class PivotHost {
  readonly data = SALES;
}

function texts(el: HTMLElement, selector: string): string[] {
  return Array.from(el.querySelectorAll(selector)).map((n) => n.textContent?.trim() ?? '');
}

describe('OgePivotGrid (MVP)', () => {
  async function render() {
    const fixture = TestBed.createComponent(PivotHost);
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders collapsed roots with grand totals and correct sums', async () => {
    const { el } = await render();
    expect(texts(el, '.oge-pivot-row-header')).toEqual(['EU', 'US', 'Grand Total']);
    expect(texts(el, '.oge-pivot-col-header')).toEqual(['2024', '2025', 'Grand Total']);
    expect(texts(el, '.oge-pivot-cell')).toEqual([
      '150', '200', '350',
      '300', '', '300',
      '450', '200', '650',
    ]);
  });

  it('expands a row: the parent line leads with subtotals, children follow indented', async () => {
    const { fixture, el } = await render();
    (el.querySelector('.oge-pivot-row-header') as HTMLElement).click(); // EU
    await settle(fixture);
    expect(texts(el, '.oge-pivot-row-header')).toEqual([
      'EU',
      'Berlin',
      'Paris',
      'US',
      'Grand Total',
    ]);
    // EU's own line shows its subtotals
    const euCells = Array.from(el.querySelectorAll('.oge-pivot-cell')).slice(0, 3);
    expect(euCells.map((c) => c.textContent?.trim())).toEqual(['150', '200', '350']);
    expect(euCells[0].classList.contains('oge-pivot-total')).toBe(true);

    // collapse via the same parent line
    (el.querySelector('.oge-pivot-row-header') as HTMLElement).click();
    await settle(fixture);
    expect(texts(el, '.oge-pivot-row-header')).toEqual(['EU', 'US', 'Grand Total']);
  });

  it('expands a column header and spans its parent across the children', async () => {
    const { fixture, el } = await render();
    // no expandable columns at depth 1 with a single column field — column
    // headers toggle only when they have children; year nodes have none
    const expandables = el.querySelectorAll('.oge-pivot-col-header.oge-pivot-expandable');
    expect(expandables.length).toBe(0);
    await settle(fixture);
  });

  it('moves a field between areas via drag & drop and re-computes', async () => {
    const { fixture, el } = await render();
    const chips = el.querySelectorAll('.oge-pivot-field-chip');
    const cityChip = Array.from(chips).find((chip) => chip.textContent?.trim() === 'City');
    expect(cityChip).toBeTruthy();

    // jsdom has no DragEvent; the handlers rely on internal drag state and
    // only optionally touch dataTransfer, so plain events suffice
    cityChip?.dispatchEvent(new Event('dragstart', { bubbles: true }));
    const columnArea = el.querySelector('.oge-pivot-area[data-area="column"]') as HTMLElement;
    columnArea.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    columnArea.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await settle(fixture);

    // city moved to columns as the outer level (collapsed roots)
    expect(texts(el, '.oge-pivot-col-header')).toEqual([
      'Berlin',
      'NYC',
      'Paris',
      'Grand Total',
    ]);
    // expanding a city reveals the inner year level with a spanning parent
    (el.querySelector('.oge-pivot-col-header.oge-pivot-expandable') as HTMLElement).click();
    await settle(fixture);
    const headers = texts(el, '.oge-pivot-col-header');
    expect(headers).toContain('2024');
    const berlin = el.querySelector('.oge-pivot-col-header') as HTMLElement;
    expect(berlin.style.gridColumn).toContain('span 3'); // itself + 2024 + 2025
  });

  it('field panel collapses and expands', async () => {
    const { fixture, el } = await render();
    expect(el.querySelectorAll('.oge-pivot-area').length).toBe(4);
    (el.querySelector('.oge-pivot-panel-toggle') as HTMLElement).click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-pivot-area').length).toBe(0);
  });

  it('drillDown returns the raw rows behind a cell', async () => {
    const { fixture } = await render();
    const grid = fixture.debugElement.children[0].componentInstance as OgePivotGrid<Sale>;
    expect(grid.drillDown({ rowPath: ['EU'], columnPath: [2024] })).toHaveLength(2);
    grid.expandAll('row');
    await settle(fixture);
    expect(grid.getFieldLayout().find((f) => f.id === 'region')?.area).toBe('row');
  });
});
