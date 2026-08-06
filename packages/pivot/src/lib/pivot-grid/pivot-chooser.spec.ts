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
  { region: 'EU', city: 'Paris', year: 2024, amount: 50 },
  { region: 'US', city: 'NYC', year: 2025, amount: 300 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgePivotGrid, OgePivotField],
  template: `
    <oge-pivot-grid [data]="data" [fieldChooser]="{ applyChangesMode: mode }">
      <oge-pivot-field dataField="region" area="row" />
      <oge-pivot-field dataField="city" area="row" />
      <oge-pivot-field dataField="year" area="column" />
      <oge-pivot-field dataField="amount" area="data" summaryType="sum" />
    </oge-pivot-grid>
  `,
})
class ChooserHost {
  readonly data = SALES;
  mode: 'instantly' | 'onDemand' = 'instantly';
}

function rowHeaders(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-pivot-row-header')).map(
    (n) => n.textContent?.trim() ?? '',
  );
}

function gridOf(fixture: ComponentFixture<ChooserHost>): OgePivotGrid<Sale> {
  return fixture.debugElement.children[0]
    .componentInstance as OgePivotGrid<Sale>;
}

describe('OgePivotGrid P2: menus, filters, chooser', () => {
  async function render(mode: 'instantly' | 'onDemand' = 'instantly') {
    const fixture = TestBed.createComponent(ChooserHost);
    fixture.componentInstance.mode = mode;
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  function openHeaderMenu(el: HTMLElement, text: string): void {
    const header = Array.from(
      el.querySelectorAll('.oge-pivot-row-header, .oge-pivot-col-header'),
    ).find((h) => h.textContent?.trim() === text);
    header?.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
  }

  function menuItem(
    el: HTMLElement,
    text: string,
  ): HTMLButtonElement | undefined {
    return Array.from(el.querySelectorAll('.oge-menu-item')).find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement | undefined;
  }

  it('header menu sorts an axis field descending and clears sorting', async () => {
    const { fixture, el } = await render();
    expect(rowHeaders(el)).toEqual(['EU', 'US', 'Grand Total']);
    openHeaderMenu(el, 'EU');
    await settle(fixture);
    menuItem(el, 'Sort Z to A')?.click();
    await settle(fixture);
    expect(rowHeaders(el)).toEqual(['US', 'EU', 'Grand Total']);

    openHeaderMenu(el, 'US');
    await settle(fixture);
    menuItem(el, 'Clear sorting')?.click();
    await settle(fixture);
    expect(rowHeaders(el)).toEqual(['EU', 'US', 'Grand Total']);
  });

  it('sortBySummary from a column header orders rows by that column', async () => {
    const { fixture, el } = await render();
    openHeaderMenu(el, '2024'); // sort rows by the 2024 column
    await settle(fixture);
    menuItem(el, 'Sort by "2024"')?.click();
    await settle(fixture);
    // 2024 totals: EU=150, US=null → desc puts EU first, null last
    expect(rowHeaders(el)).toEqual(['EU', 'US', 'Grand Total']);
    openHeaderMenu(el, '2025');
    await settle(fixture);
    menuItem(el, 'Sort by "2025"')?.click();
    await settle(fixture);
    // 2025: US=300, EU=null
    expect(rowHeaders(el)).toEqual(['US', 'EU', 'Grand Total']);
  });

  it('filter popup narrows the pivot to the selected values', async () => {
    const { fixture, el } = await render();
    openHeaderMenu(el, 'EU');
    await settle(fixture);
    menuItem(el, 'Filter values')?.click();
    await settle(fixture);
    const popup = el.ownerDocument.querySelector(
      '.oge-pivot-filter-popup',
    ) as HTMLElement;
    expect(popup).toBeTruthy();
    // uncheck US
    const usItem = Array.from(
      popup.querySelectorAll('.oge-hf-item:not(.oge-hf-all)'),
    ).find((i) => i.textContent?.includes('US'));
    (usItem?.querySelector('input') as HTMLInputElement).click();
    (
      Array.from(popup.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Apply'),
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(rowHeaders(el)).toEqual(['EU', 'Grand Total']);
  });

  it('remove field via the menu drops it from the layout', async () => {
    const { fixture, el } = await render();
    openHeaderMenu(el, 'EU');
    await settle(fixture);
    menuItem(el, 'Remove field')?.click();
    await settle(fixture);
    // region removed → outer row level is now city (still collapsed roots)
    expect(rowHeaders(el)).toEqual(['Berlin', 'NYC', 'Paris', 'Grand Total']);
  });

  it('measure menu switches summary type and display mode', async () => {
    const { fixture, el } = await render();
    const chip = Array.from(
      el.querySelectorAll(
        '.oge-pivot-area[data-area="data"] .oge-pivot-field-chip',
      ),
    ).find((c) => c.textContent?.trim() === 'Amount');
    chip?.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    menuItem(el, 'Summary type: Count')?.click();
    await settle(fixture);
    const firstCell = el.querySelector('.oge-pivot-cell')?.textContent?.trim();
    expect(firstCell).toBe('2'); // EU × 2024 count
  });

  it('field chooser onDemand only applies the draft on Apply', async () => {
    const { fixture, el } = await render('onDemand');
    gridOf(fixture).showFieldChooser();
    await settle(fixture);
    const doc = el.ownerDocument;
    const chooser = doc.querySelector('.oge-pivot-chooser') as HTMLElement;
    expect(chooser).toBeTruthy();

    // drag city out of the layout (to All Fields = unused)
    const cityChip = Array.from(
      chooser.querySelectorAll('[data-area="row"] .oge-pivot-field-chip'),
    ).find((c) => c.textContent?.trim() === 'City');
    cityChip?.dispatchEvent(new Event('dragstart', { bubbles: true }));
    const allZone = chooser.querySelector(
      '.oge-pivot-chooser-all',
    ) as HTMLElement;
    allZone.dispatchEvent(
      new Event('dragover', { bubbles: true, cancelable: true }),
    );
    allZone.dispatchEvent(
      new Event('drop', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);

    // live pivot unchanged until Apply
    expect(rowHeaders(el)).toEqual(['EU', 'US', 'Grand Total']);
    (
      Array.from(chooser.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Apply'),
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    // city unused now: expanding EU shows no city level
    const grid = gridOf(fixture);
    expect(grid.getFieldLayout().find((f) => f.id === 'city')?.area).toBeNull();
  });
});
