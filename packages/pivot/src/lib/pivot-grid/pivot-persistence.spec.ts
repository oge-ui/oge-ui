import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  OGE_STATE_STORAGE,
  type OgeStateStorage,
} from '@oge-ui/grid/foundation';
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
  { region: 'EU', city: 'Paris', year: 2024, amount: 50 },
  { region: 'US', city: 'NYC', year: 2025, amount: 300 },
];

class MemoryStorage implements OgeStateStorage {
  readonly map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Component({
  imports: [OgePivotGrid, OgePivotField],
  template: `
    <oge-pivot-grid [data]="data" stateKey="pivot-test">
      <oge-pivot-field dataField="region" area="row" />
      <oge-pivot-field dataField="city" area="row" />
      <oge-pivot-field dataField="year" area="column" />
      <oge-pivot-field dataField="amount" area="data" summaryType="sum" />
    </oge-pivot-grid>
  `,
})
class PersistenceHost {
  readonly data = SALES;
}

function gridOf(
  fixture: ComponentFixture<PersistenceHost>,
): OgePivotGrid<Sale> {
  return fixture.debugElement.children[0]
    .componentInstance as OgePivotGrid<Sale>;
}

function rowHeaders(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-pivot-row-header')).map(
    (n) => n.textContent?.trim() ?? '',
  );
}

describe('OgePivotGrid persistence + CSV export', () => {
  it('round-trips field layout and expansion through storage', async () => {
    const storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [{ provide: OGE_STATE_STORAGE, useValue: storage }],
    });

    const first = TestBed.createComponent(PersistenceHost);
    await settle(first);
    const el = first.nativeElement as HTMLElement;
    // expand EU + move city out of the layout
    (el.querySelector('.oge-pivot-row-header') as HTMLElement).click();
    await settle(first);
    gridOf(first)['store'].moveField('city', null, 0);
    await settle(first);
    await wait(350); // > save debounce
    first.destroy();

    expect(storage.get('oge-pivot:pivot-test')).toBeTruthy();

    const second = TestBed.createComponent(PersistenceHost);
    await settle(second);
    const el2 = second.nativeElement as HTMLElement;
    // restored: EU expanded (no city level since it was removed)
    expect(rowHeaders(el2)).toEqual(['EU', 'US', 'Grand Total']);
    expect(
      gridOf(second)
        .getFieldLayout()
        .find((f) => f.id === 'city')?.area,
    ).toBeNull();
  });

  it('state()/applyState() round-trip and getCsv flattens what is on screen', async () => {
    const fixture = TestBed.createComponent(PersistenceHost);
    await settle(fixture);
    const grid = gridOf(fixture);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.oge-pivot-row-header') as HTMLElement).click(); // expand EU
    await settle(fixture);
    const snapshot = grid.state();
    expect(snapshot.rowExpandedPaths).toEqual([['EU']]);

    const csv = grid.getCsv({ bom: false });
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(',2024,2025,Grand Total');
    expect(lines[1]).toBe('EU,150,,150');
    expect(lines[2]).toBe('EU / Berlin,100,,100');
    expect(lines.at(-1)).toBe('Grand Total,150,300,450');

    // collapse everything, then restore via applyState
    grid.collapseAll('row');
    await settle(fixture);
    expect(rowHeaders(el)).toEqual(['EU', 'US', 'Grand Total']);
    grid.applyState(snapshot);
    await settle(fixture);
    expect(rowHeaders(el)).toContain('Berlin');
  });
});
