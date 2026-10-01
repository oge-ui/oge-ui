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
  { region: 'EU', city: 'Paris', year: 2025, amount: 50 },
  { region: 'US', city: 'NYC', year: 2024, amount: 300 },
];

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

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  // the grid moves DOM focus in a macrotask, after the re-render
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

function press(
  target: Element | null,
  key: string,
  init: KeyboardEventInit = {},
): void {
  target?.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

const chip = (el: HTMLElement, area: string, caption: string) =>
  Array.from(
    el.querySelectorAll<HTMLElement>(
      `.oge-pivot-area[data-area="${area}"] .oge-pivot-field-chip`,
    ),
  ).find((c) => c.textContent?.trim() === caption) ?? null;

const areaChips = (el: HTMLElement, area: string) =>
  Array.from(
    el.querySelectorAll(
      `.oge-pivot-area[data-area="${area}"] .oge-pivot-field-chip`,
    ),
  ).map((c) => c.textContent?.trim());

describe('OgePivotGrid — keyboard alternatives', () => {
  async function render() {
    const fixture = TestBed.createComponent(PivotHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    return { fixture, el };
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps headers and value cells in one roving tab stop', async () => {
    const { fixture, el } = await render();
    const matrix = el.querySelector('.oge-pivot-matrix') as HTMLElement;
    const stops = () => matrix.querySelectorAll('[tabindex="0"]');
    expect(stops()).toHaveLength(1);
    expect(stops()[0].getAttribute('data-cell')).toBe('0-0');
    expect(
      Array.from(
        matrix.querySelectorAll('.oge-pivot-row-header, .oge-pivot-col-header'),
      ).every((h) => h.getAttribute('tabindex') === '-1'),
    ).toBe(true);

    const first = matrix.querySelector<HTMLElement>('[data-cell="0-0"]');
    first?.focus();
    press(first, 'ArrowLeft');
    await settle(fixture);
    const eu = document.activeElement as HTMLElement;
    expect(eu.classList).toContain('oge-pivot-row-header');
    expect(eu.textContent?.trim()).toBe('EU');
    expect(stops()).toHaveLength(1);
    expect(eu.getAttribute('tabindex')).toBe('0');

    // Enter still toggles the row header
    press(eu, 'Enter');
    await settle(fixture);
    expect(
      matrix
        .querySelector('.oge-pivot-row-header')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');

    // Ctrl+Home lands on the first column header
    press(document.activeElement, 'Home', { ctrlKey: true });
    await settle(fixture);
    expect((document.activeElement as HTMLElement).textContent?.trim()).toBe(
      '2024',
    );
    press(document.activeElement, 'ArrowDown');
    await settle(fixture);
    expect(document.activeElement?.getAttribute('data-cell')).toBe('0-0');
  });

  it('reorders and moves field chips with Ctrl+Arrow and announces it', async () => {
    const { fixture, el } = await render();
    const region = chip(el, 'row', 'Region');
    expect(region?.getAttribute('role')).toBe('button');
    expect(region?.getAttribute('tabindex')).toBe('0');
    region?.focus();
    press(region, 'ArrowRight', { ctrlKey: true });
    await settle(fixture);
    expect(areaChips(el, 'row')).toEqual(['City', 'Region']);
    expect(document.activeElement?.textContent?.trim()).toBe('Region');
    expect(el.querySelector('.oge-pivot-live')?.textContent?.trim()).toBe(
      'Region moved to Rows, position 2 of 2',
    );

    press(document.activeElement, 'ArrowDown', { ctrlKey: true });
    await settle(fixture);
    expect(areaChips(el, 'column')).toEqual(['Year', 'Region']);
    expect(
      document.activeElement?.closest('[data-area]')?.getAttribute('data-area'),
    ).toBe('column');
  });

  it('opens a field menu from the keyboard and moves through it', async () => {
    const { fixture, el } = await render();
    const city = chip(el, 'row', 'City');
    city?.focus();
    press(city, 'Enter');
    await settle(fixture);
    const menu = el.querySelector('.oge-context-menu') as HTMLElement;
    expect(menu.getAttribute('aria-label')).toBe('City field actions');
    expect(document.activeElement?.textContent?.trim()).toBe('Move left');

    // Escape returns focus to the chip
    press(document.activeElement, 'Escape');
    await settle(fixture);
    expect(el.querySelector('.oge-context-menu')).toBeNull();
    expect(document.activeElement).toBe(chip(el, 'row', 'City'));

    press(document.activeElement, 'F10', { shiftKey: true });
    await settle(fixture);
    press(document.activeElement, 'ArrowDown'); // Move right is disabled → Move to Filters
    await settle(fixture);
    expect(document.activeElement?.textContent?.trim()).toBe('Move to Filters');
    press(document.activeElement, 'ArrowDown');
    await settle(fixture);
    (document.activeElement as HTMLButtonElement).click(); // Move to Columns
    await settle(fixture);
    expect(areaChips(el, 'column')).toEqual(['Year', 'City']);
    expect(document.activeElement?.textContent?.trim()).toBe('City');
    expect(
      document.activeElement?.closest('[data-area]')?.getAttribute('data-area'),
    ).toBe('column');
  });

  it('removes a chip with Delete and opens header menus from the keyboard', async () => {
    const { fixture, el } = await render();
    const city = chip(el, 'row', 'City');
    city?.focus();
    press(city, 'Delete');
    await settle(fixture);
    expect(areaChips(el, 'row')).toEqual(['Region']);
    expect(el.querySelector('.oge-pivot-live')?.textContent?.trim()).toBe(
      'City removed from the layout',
    );

    const header = el.querySelector<HTMLElement>('.oge-pivot-row-header');
    header?.focus();
    press(header, 'ContextMenu');
    await settle(fixture);
    expect(el.querySelector('.oge-context-menu')).not.toBeNull();
    expect(document.activeElement?.getAttribute('role')).toBe('menuitem');
  });
});
