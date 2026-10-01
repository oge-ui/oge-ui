import { StrictMode } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type { OgePivotFieldDef } from '@oge-ui/pivot-engine';
import { OgePivotGrid } from './pivot-grid';

interface Sale {
  region: string;
  city: string;
  year: number;
  amount: number;
}

// the same rows the Angular pivot-keyboard.spec.ts renders
const SALES: Sale[] = [
  { region: 'EU', city: 'Berlin', year: 2024, amount: 100 },
  { region: 'EU', city: 'Paris', year: 2025, amount: 50 },
  { region: 'US', city: 'NYC', year: 2024, amount: 300 },
];

const FIELDS: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'city', area: 'row' },
  { dataField: 'year', area: 'column' },
  { dataField: 'amount', area: 'data', summaryType: 'sum' },
];

const chip = (container: HTMLElement, area: string, caption: string) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      `.oge-pivot-area[data-area="${area}"] .oge-pivot-field-chip`,
    ),
  ).find((c) => c.textContent?.trim() === caption) as HTMLElement;

const areaChips = (container: HTMLElement, area: string) =>
  Array.from(
    container.querySelectorAll(
      `.oge-pivot-area[data-area="${area}"] .oge-pivot-field-chip`,
    ),
  ).map((c) => c.textContent?.trim());

const active = () => document.activeElement as HTMLElement;
const flush = () => act(() => vi.runAllTimers());

describe('<OgePivotGrid> — keyboard alternatives (mirror of the Angular spec)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps headers and value cells in one roving tab stop', () => {
    const { container } = render(
      <StrictMode>
        <OgePivotGrid data={SALES} fields={FIELDS} />
      </StrictMode>,
    );
    const matrix = container.querySelector('.oge-pivot-matrix') as HTMLElement;
    const stops = () => matrix.querySelectorAll('[tabindex="0"]');
    expect(stops()).toHaveLength(1);
    expect(stops()[0].getAttribute('data-cell')).toBe('0-0');

    const first = matrix.querySelector('[data-cell="0-0"]') as HTMLElement;
    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    flush();
    expect(active().classList).toContain('oge-pivot-row-header');
    expect(active().textContent?.trim()).toBe('EU');
    expect(stops()).toHaveLength(1);
    expect(active().tabIndex).toBe(0);

    fireEvent.keyDown(active(), { key: 'Enter' });
    flush();
    expect(
      matrix
        .querySelector('.oge-pivot-row-header')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');

    fireEvent.keyDown(active(), { key: 'Home', ctrlKey: true });
    flush();
    expect(active().textContent?.trim()).toBe('2024');
    fireEvent.keyDown(active(), { key: 'ArrowDown' });
    flush();
    expect(active().getAttribute('data-cell')).toBe('0-0');
  });

  it('reorders and moves field chips with Ctrl+Arrow and announces it', () => {
    const onFieldLayoutChange = vi.fn();
    const { container } = render(
      <OgePivotGrid
        data={SALES}
        fields={FIELDS}
        onFieldLayoutChange={onFieldLayoutChange}
      />,
    );
    const region = chip(container, 'row', 'Region');
    expect(region.getAttribute('role')).toBe('button');
    expect(region.tabIndex).toBe(0);
    act(() => region.focus());
    fireEvent.keyDown(region, { key: 'ArrowRight', ctrlKey: true });
    flush();
    expect(areaChips(container, 'row')).toEqual(['City', 'Region']);
    expect(active().textContent?.trim()).toBe('Region');
    expect(
      container.querySelector('.oge-pivot-live')?.textContent?.trim(),
    ).toBe('Region moved to Rows, position 2 of 2');
    expect(onFieldLayoutChange).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(active(), { key: 'ArrowDown', ctrlKey: true });
    flush();
    expect(areaChips(container, 'column')).toEqual(['Year', 'Region']);
    expect(active().closest('[data-area]')?.getAttribute('data-area')).toBe(
      'column',
    );
  });

  it('opens a field menu from the keyboard and moves through it', () => {
    const { container } = render(<OgePivotGrid data={SALES} fields={FIELDS} />);
    const city = chip(container, 'row', 'City');
    act(() => city.focus());
    fireEvent.keyDown(city, { key: 'Enter' });
    flush();
    const menu = container.querySelector('.oge-context-menu') as HTMLElement;
    expect(menu.getAttribute('aria-label')).toBe('City field actions');
    expect(active().textContent?.trim()).toBe('Move left');

    fireEvent.keyDown(active(), { key: 'Escape' });
    flush();
    expect(container.querySelector('.oge-context-menu')).toBeNull();
    expect(active()).toBe(chip(container, 'row', 'City'));

    fireEvent.keyDown(active(), { key: 'F10', shiftKey: true });
    flush();
    fireEvent.keyDown(active(), { key: 'ArrowDown' }); // Move right is disabled
    expect(active().textContent?.trim()).toBe('Move to Filters');
    fireEvent.keyDown(active(), { key: 'ArrowDown' });
    fireEvent.click(active()); // Move to Columns
    flush();
    expect(areaChips(container, 'column')).toEqual(['Year', 'City']);
    expect(active().textContent?.trim()).toBe('City');
    expect(active().closest('[data-area]')?.getAttribute('data-area')).toBe(
      'column',
    );
  });

  it('removes a chip with Delete and opens header menus from the keyboard', () => {
    const { container } = render(<OgePivotGrid data={SALES} fields={FIELDS} />);
    const city = chip(container, 'row', 'City');
    act(() => city.focus());
    fireEvent.keyDown(city, { key: 'Delete' });
    flush();
    expect(areaChips(container, 'row')).toEqual(['Region']);
    expect(
      container.querySelector('.oge-pivot-live')?.textContent?.trim(),
    ).toBe('City removed from the layout');

    const header = container.querySelector(
      '.oge-pivot-row-header',
    ) as HTMLElement;
    act(() => header.focus());
    fireEvent.keyDown(header, { key: 'ContextMenu' });
    flush();
    expect(container.querySelector('.oge-context-menu')).not.toBeNull();
    expect(active().getAttribute('role')).toBe('menuitem');
  });

  it('offers move and summary items on a measure chip right-click', () => {
    const { container } = render(<OgePivotGrid data={SALES} fields={FIELDS} />);
    fireEvent.contextMenu(chip(container, 'data', 'Amount'));
    const texts = Array.from(
      container.querySelectorAll('.oge-context-menu .oge-menu-item'),
    ).map((b) => b.textContent?.trim());
    expect(texts).toContain('Move to Rows');
    expect(texts).toContain('Summary type: Count');
  });
});
