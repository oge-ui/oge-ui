import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '../columns/column';
import { OgeDetailTemplate } from '../templates/detail-template';
import { OgeGrid } from './grid';

interface Sale {
  id: number;
  region: string;
  city: string;
  amount: number;
}

const SALES: Sale[] = [
  { id: 1, region: 'EU', city: 'Berlin', amount: 100 },
  { id: 2, region: 'EU', city: 'Paris', amount: 200 },
  { id: 3, region: 'US', city: 'NYC', amount: 300 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid [data]="data" keyField="id" [groupBy]="groupBy()" [groupPanel]="true">
      <oge-column field="id" dataType="number" [width]="70" pinned="left" />
      <oge-column field="region" />
      <oge-column field="city" />
      <oge-column field="amount" dataType="number" groupSummary="sum" totalSummary="sum" />
    </oge-grid>
  `,
})
class GroupingHost {
  readonly data = SALES;
  readonly groupBy = signal<string[]>(['region']);
}

describe('OgeGrid grouping', () => {
  async function render() {
    const fixture = TestBed.createComponent(GroupingHost);
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders group rows with caption, value, count and summaries', async () => {
    const { el } = await render();
    const groups = Array.from(el.querySelectorAll('.oge-group-row')).map((g) =>
      g.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(groups).toEqual([
      'Region: EU (2) Sum of Amount: 300',
      'Region: US (1) Sum of Amount: 300',
    ]);
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
  });

  it('collapses and re-expands a group on click', async () => {
    const { fixture, el } = await render();
    (el.querySelector('.oge-group-row') as HTMLElement).click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row').length).toBe(1); // only the US row remains
    expect(el.querySelector('.oge-group-row')?.getAttribute('aria-expanded')).toBe('false');

    (el.querySelector('.oge-group-row') as HTMLElement).click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
  });

  it('shows the grid total summary row', async () => {
    const { el } = await render();
    const totalCells = Array.from(el.querySelectorAll('.oge-total-cell')).map((c) =>
      c.textContent?.trim()
    );
    expect(totalCells).toContain('Sum: 600');
  });

  it('collapses and expands all groups via the toolbar buttons', async () => {
    const { fixture, el } = await render();
    const button = (label: string) =>
      el.querySelector(`.oge-toolbar-btn[aria-label="${label}"]`) as HTMLButtonElement;

    button('Collapse all groups').click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row').length).toBe(0);
    expect(
      Array.from(el.querySelectorAll('.oge-group-row')).map((g) => g.getAttribute('aria-expanded'))
    ).toEqual(['false', 'false']);

    button('Expand all groups').click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
  });

  it('renders group panel chips and ungroups via the chip button', async () => {
    const { fixture, el } = await render();
    expect(el.querySelector('.oge-group-chip')?.textContent).toContain('Region');
    (el.querySelector('.oge-group-chip-remove') as HTMLButtonElement).click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-group-row').length).toBe(0);
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
  });

  it('reacts to groupBy input changes', async () => {
    const { fixture, el } = await render();
    fixture.componentInstance.groupBy.set(['region', 'city']);
    await settle(fixture);
    expect(el.querySelectorAll('.oge-group-row').length).toBe(2 + 3); // regions + cities
  });

  it('marks pinned columns sticky with computed offsets', async () => {
    const { el } = await render();
    const pinnedHeader = el.querySelector('.oge-header-cell.oge-pinned') as HTMLElement;
    expect(pinnedHeader).toBeTruthy();
    // logical property so RTL mirrors pinning automatically
    expect(pinnedHeader.style.insetInlineStart).toBe('0px');
  });
});

@Component({
  imports: [OgeGrid, OgeColumn, OgeDetailTemplate],
  template: `
    <oge-grid [data]="data" keyField="id">
      <oge-column field="id" dataType="number" />
      <oge-column field="city" />
      <div *ogeDetailTemplate="let sale" class="detail-content">Detail of {{ sale.id }}</div>
    </oge-grid>
  `,
})
class DetailHost {
  readonly data = SALES;
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid [data]="data" keyField="id" [groupBy]="['region']">
      <oge-column field="region" />
      <oge-column
        field="amount"
        dataType="number"
        [groupSummary]="['sum', 'avg']"
        [totalSummary]="['sum', 'count']"
      />
    </oge-grid>
  `,
})
class MultiSummaryHost {
  readonly data = SALES;
}

describe('OgeGrid multiple summaries per column', () => {
  it('renders every declared aggregate on group rows and in the total row', async () => {
    const fixture = TestBed.createComponent(MultiSummaryHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    const firstGroup = el.querySelector('.oge-group-row')?.textContent?.replace(/\s+/g, ' ');
    expect(firstGroup).toContain('Sum of Amount: 300');
    expect(firstGroup).toContain('Avg of Amount: 150');

    const totalCells = Array.from(el.querySelectorAll('.oge-total-cell')).map((c) =>
      c.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(totalCells).toContain('Sum: 600 · Count: 3');
  });
});

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid [data]="data" keyField="id" [groupBy]="['region']">
      <oge-column field="region" />
      <oge-column
        field="amount"
        dataType="number"
        groupSummary="custom"
        totalSummary="custom"
        [calculateCustomSummary]="amountRange"
      />
    </oge-grid>
  `,
})
class CustomSummaryHost {
  readonly data = SALES;
  readonly amountRange = (rows: readonly Sale[]): number => {
    const values = rows.map((r) => r.amount);
    return Math.max(...values) - Math.min(...values);
  };
}

describe('OgeGrid calculateCustomSummary', () => {
  it('computes group and total aggregates with the column reducer', async () => {
    const fixture = TestBed.createComponent(CustomSummaryHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    const groups = Array.from(el.querySelectorAll('.oge-group-row')).map((g) =>
      g.textContent?.replace(/\s+/g, ' ').trim()
    );
    // EU: 200-100=100, US single row: 300-300=0
    expect(groups[0]).toContain('Custom of Amount: 100');
    expect(groups[1]).toContain('Custom of Amount: 0');

    const totalCells = Array.from(el.querySelectorAll('.oge-total-cell')).map((c) =>
      c.textContent?.trim()
    );
    expect(totalCells).toContain('Custom: 200'); // 300-100 over all rows
  });
});

describe('OgeGrid master-detail', () => {
  async function render() {
    const fixture = TestBed.createComponent(DetailHost);
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders a leading expander column and toggles detail rows', async () => {
    const { fixture, el } = await render();
    expect(el.querySelectorAll('.oge-expander-btn').length).toBe(3);
    expect(el.querySelectorAll('.oge-detail-row').length).toBe(0);

    (el.querySelectorAll('.oge-expander-btn')[1] as HTMLButtonElement).click();
    await settle(fixture);
    const detail = el.querySelector('.oge-detail-row');
    expect(detail?.textContent).toContain('Detail of 2');
    // detail row sits directly after its parent row
    expect(detail?.previousElementSibling?.classList.contains('oge-row')).toBe(true);

    (el.querySelectorAll('.oge-expander-btn')[1] as HTMLButtonElement).click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-detail-row').length).toBe(0);
  });
});

describe('OgeGrid column operations', () => {
  async function render() {
    const fixture = TestBed.createComponent(GroupingHost);
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('applies width overrides from resize state', async () => {
    const { fixture, el } = await render();
    const grid = fixture.debugElement.children[0].componentInstance as OgeGrid<Sale>;
    (grid as unknown as { store: { columns: { setWidth(id: string, w: number): void } } }).store.columns.setWidth(
      'city',
      222
    );
    await settle(fixture);
    const headerRow = el.querySelector('.oge-header-row') as HTMLElement;
    expect(headerRow.style.gridTemplateColumns).toContain('222px');
  });

  it('reorders columns via the columns slice', async () => {
    const { fixture, el } = await render();
    const grid = fixture.debugElement.children[0].componentInstance as OgeGrid<Sale>;
    const store = (grid as unknown as {
      store: { columns: { reorder(base: readonly string[], s: string, t: string): void } };
    }).store;
    store.columns.reorder(['id', 'region', 'city', 'amount'], 'city', 'region');
    await settle(fixture);
    const captions = Array.from(el.querySelectorAll('.oge-header-caption')).map((h) =>
      h.textContent?.trim()
    );
    expect(captions).toEqual(['Id', 'City', 'Region', 'Amount']);
  });
});
