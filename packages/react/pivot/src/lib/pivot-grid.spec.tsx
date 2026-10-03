import { StrictMode, createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  LocalPivotStore,
  type OgePivotStore,
  type PivotLoadOptions,
  type PivotLoadResult,
} from '@oge-ui/core';
import type { OgeStateStorage } from '@oge-ui/behavior';
import { OgeGridStateStorageProvider } from '@oge-ui/react-grid';
import type { OgePivotFieldDef } from '@oge-ui/pivot-engine';
import { OgePivotGrid } from './pivot-grid';
import { OgePivotMessagesProvider } from './pivot-config';
import type { OgePivotGridHandle } from './pivot-types';

interface Sale {
  region: string;
  city: string;
  year: number;
  amount: number;
}

/** Pointer events as jsdom builds them; the move's target is the hit. */
function pointer(
  type: string,
  target: Element,
  x: number,
  pointerType = 'mouse',
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
    clientY: 5,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  act(() => {
    target.dispatchEvent(event);
  });
}

/** The click a drag ends with is swallowed until the next task. */
const afterDropClick = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve));
  });

// the same rows the Angular pivot-grid.spec.ts renders
const SALES: Sale[] = [
  { region: 'EU', city: 'Berlin', year: 2024, amount: 100 },
  { region: 'EU', city: 'Berlin', year: 2025, amount: 200 },
  { region: 'EU', city: 'Paris', year: 2024, amount: 50 },
  { region: 'US', city: 'NYC', year: 2024, amount: 300 },
];

const FIELDS: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'city', area: 'row' },
  { dataField: 'year', area: 'column' },
  { dataField: 'amount', area: 'data', summaryType: 'sum' },
];

function texts(container: HTMLElement, selector: string): string[] {
  return Array.from(container.querySelectorAll(selector)).map(
    (n) => n.textContent?.trim() ?? '',
  );
}

const rowHeaders = (container: HTMLElement) =>
  texts(container, '.oge-pivot-row-header');

describe('<OgePivotGrid> — rendering (mirror of the Angular MVP spec)', () => {
  it('renders collapsed roots with grand totals and correct sums', () => {
    const { container } = render(<OgePivotGrid data={SALES} fields={FIELDS} />);
    expect(container.firstElementChild?.className).toBe('oge-pivot-grid');
    expect(rowHeaders(container)).toEqual(['EU', 'US', 'Grand Total']);
    expect(texts(container, '.oge-pivot-col-header')).toEqual([
      '2024',
      '2025',
      'Grand Total',
    ]);
    expect(texts(container, '.oge-pivot-cell')).toEqual([
      '150',
      '200',
      '350',
      '300',
      '',
      '300',
      '450',
      '200',
      '650',
    ]);
    const grid = container.querySelector('.oge-pivot-viewport');
    expect(grid?.getAttribute('role')).toBe('grid');
    expect(grid?.getAttribute('aria-rowcount')).toBe('4');
    expect(grid?.getAttribute('aria-colcount')).toBe('4');
    // grid > row > cell: one header row plus one row per visible line
    const rows = grid?.querySelectorAll(
      ':scope > .oge-pivot-matrix > [role="row"]',
    );
    expect(rows).toHaveLength(4);
    expect(
      rows?.[1].querySelector('[role="rowheader"]')?.textContent?.trim(),
    ).toBe('EU');
    expect(rows?.[1].querySelectorAll('[role="gridcell"]')).toHaveLength(3);
  });

  it('expands a row: the parent line leads with subtotals, children follow', () => {
    const { container } = render(<OgePivotGrid data={SALES} fields={FIELDS} />);
    const eu = container.querySelector('.oge-pivot-row-header') as HTMLElement;
    expect(eu.getAttribute('aria-expanded')).toBe('false');
    expect(eu.tabIndex).toBe(-1); // the grid keeps one tab stop, on the first value cell
    fireEvent.click(eu);
    expect(rowHeaders(container)).toEqual([
      'EU',
      'Berlin',
      'Paris',
      'US',
      'Grand Total',
    ]);
    const cells = container.querySelectorAll('.oge-pivot-cell');
    expect(cells[0].classList.contains('oge-pivot-total')).toBe(true);
    const berlin = container.querySelectorAll(
      '.oge-pivot-row-header',
    )[1] as HTMLElement;
    expect(berlin.style.paddingInlineStart).toBe('30px');
    // Enter on the same line collapses it again
    fireEvent.keyDown(eu, { key: 'Enter' });
    expect(rowHeaders(container)).toEqual(['EU', 'US', 'Grand Total']);
  });

  it('touch chips need a long press; Escape cancels a chip drag', async () => {
    const onFieldLayoutChange = vi.fn();
    const { container } = render(
      <StrictMode>
        <OgePivotGrid
          data={SALES}
          fields={FIELDS}
          onFieldLayoutChange={onFieldLayoutChange}
        />
      </StrictMode>,
    );
    const chip = (caption: string) =>
      Array.from(container.querySelectorAll('.oge-pivot-field-chip')).find(
        (el) => el.textContent?.trim() === caption,
      ) as HTMLElement;
    const columns = container.querySelector(
      '.oge-pivot-area[data-area="column"]',
    ) as HTMLElement;
    // a swipe before the hold is a scroll
    pointer('pointerdown', chip('City'), 0, 'touch');
    pointer('pointermove', columns, 60, 'touch');
    pointer('pointerup', columns, 60, 'touch');
    expect(onFieldLayoutChange).not.toHaveBeenCalled();
    // Escape mid-drag
    pointer('pointerdown', chip('City'), 0);
    pointer('pointermove', columns, 60);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    pointer('pointerup', columns, 60);
    expect(onFieldLayoutChange).not.toHaveBeenCalled();
    expect(container.querySelector('.oge-pivot-area-drop-active')).toBeNull();
    // a held touch drags; dropping on a chip inserts in front of it
    pointer('pointerdown', chip('City'), 0, 'touch');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 340));
    });
    pointer('pointermove', chip('Region'), 60, 'touch');
    expect(chip('Region')).toHaveClass('oge-pivot-chip-drop-target');
    pointer('pointerup', chip('Region'), 60, 'touch');
    expect(onFieldLayoutChange).toHaveBeenCalledTimes(1);
    const rows = Array.from(
      container.querySelectorAll('.oge-pivot-area[data-area="row"] .oge-pivot-field-chip'),
    ).map((el) => el.textContent?.trim());
    expect(rows).toEqual(['City', 'Region']);
  });

  it('moves a field between areas via drag & drop and spans parents', async () => {
    const onFieldLayoutChange = vi.fn();
    const { container } = render(
      <OgePivotGrid
        data={SALES}
        fields={FIELDS}
        onFieldLayoutChange={onFieldLayoutChange}
      />,
    );
    const city = Array.from(
      container.querySelectorAll('.oge-pivot-field-chip'),
    ).find((chip) => chip.textContent?.trim() === 'City') as HTMLElement;
    const columns = container.querySelector(
      '.oge-pivot-area[data-area="column"]',
    ) as HTMLElement;
    expect(container.querySelector('[draggable]')).toBeNull();
    pointer('pointerdown', city, 0);
    pointer('pointermove', columns, 60);
    expect(columns).toHaveClass('oge-pivot-area-drop-active');
    pointer('pointerup', columns, 60);
    expect(columns).not.toHaveClass('oge-pivot-area-drop-active');
    await afterDropClick();
    expect(onFieldLayoutChange).toHaveBeenCalledTimes(1);
    // a drop appends: city joins the columns as the inner level
    expect(texts(container, '.oge-pivot-col-header')).toEqual([
      '2024',
      '2025',
      'Grand Total',
    ]);
    fireEvent.click(
      container.querySelector(
        '.oge-pivot-col-header.oge-pivot-expandable',
      ) as HTMLElement,
    );
    expect(texts(container, '.oge-pivot-col-header')).toContain('Berlin');
    const year2024 = container.querySelector(
      '.oge-pivot-col-header',
    ) as HTMLElement;
    expect(year2024.style.gridColumn).toContain('span 4'); // itself + Berlin + Paris + NYC
  });

  it('field panel collapses and expands', () => {
    const { container } = render(<OgePivotGrid data={SALES} fields={FIELDS} />);
    expect(container.querySelectorAll('.oge-pivot-area')).toHaveLength(4);
    const toggle = container.querySelector(
      '.oge-pivot-panel-toggle',
    ) as HTMLElement;
    expect(toggle.getAttribute('aria-label')).toBe('Collapse field panel');
    fireEvent.click(toggle);
    expect(container.querySelectorAll('.oge-pivot-area')).toHaveLength(0);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('hides the field panel and runs customizeCell', () => {
    const { container } = render(
      <OgePivotGrid
        data={SALES}
        fields={FIELDS}
        fieldPanel={false}
        customizeCell={(cell) => {
          if (Number(cell.value) >= 300) cell.cssClass = 'hot';
          if (cell.isGrandTotal) cell.text = `Σ ${cell.text}`;
        }}
      />,
    );
    expect(container.querySelector('.oge-pivot-field-panel')).toBeNull();
    // 350, 300 (US × 2024 and its row total), 450 and 650
    expect(container.querySelectorAll('.oge-pivot-measure.hot').length).toBe(5);
    expect(texts(container, '.oge-pivot-cell').at(-1)).toBe('Σ 650');
  });

  it('exposes the imperative handle', () => {
    const ref = createRef<OgePivotGridHandle<Sale>>();
    const { container } = render(
      <OgePivotGrid ref={ref} data={SALES} fields={FIELDS} />,
    );
    expect(
      ref.current?.drillDown({ rowPath: ['EU'], columnPath: [2024] }),
    ).toHaveLength(2);
    act(() => ref.current?.expandAll('row'));
    expect(rowHeaders(container)).toContain('NYC');
    expect(
      ref.current?.getFieldLayout().find((f) => f.id === 'region')?.area,
    ).toBe('row');
    const snapshot = ref.current?.state();
    act(() => ref.current?.collapseAll('row'));
    expect(rowHeaders(container)).toEqual(['EU', 'US', 'Grand Total']);
    act(() => {
      if (snapshot) ref.current?.applyState(snapshot);
    });
    expect(rowHeaders(container)).toContain('Berlin');
    expect(ref.current?.getCsv({ bom: false }).split('\r\n')[0]).toBe(
      ',2024,2025,Grand Total',
    );
    expect(ref.current?.getResult().rowLeafCount).toBeGreaterThan(3);
  });

  it('fires onCellClick / onCellDblClick with the cell coordinates', () => {
    const onCellClick = vi.fn();
    const onCellDblClick = vi.fn();
    const { container } = render(
      <OgePivotGrid
        data={SALES}
        fields={FIELDS}
        onCellClick={onCellClick}
        onCellDblClick={onCellDblClick}
      />,
    );
    const first = container.querySelector('.oge-pivot-cell') as HTMLElement;
    fireEvent.click(first);
    fireEvent.doubleClick(first);
    expect(onCellClick.mock.calls[0][0]).toMatchObject({
      rowPath: ['EU'],
      columnPath: [2024],
      measureIndex: 0,
      value: 150,
    });
    expect(onCellClick.mock.calls[0][0].event).toBeInstanceOf(MouseEvent);
    expect(onCellDblClick).toHaveBeenCalledTimes(1);
  });
});

describe('<OgePivotGrid> — keyboard', () => {
  it('roves the tab stop across the value matrix', async () => {
    vi.useFakeTimers();
    try {
      const { container } = render(
        <OgePivotGrid data={SALES} fields={FIELDS} />,
      );
      const cell = (r: number, c: number) =>
        container.querySelector(`[data-cell="${r}-${c}"]`) as HTMLElement;
      // first paint: exactly one cell is tabbable
      expect(
        container.querySelectorAll('.oge-pivot-cell[tabindex="0"]'),
      ).toHaveLength(1);
      expect(cell(0, 0).tabIndex).toBe(0);
      act(() => cell(0, 0).focus());
      fireEvent.keyDown(cell(0, 0), { key: 'ArrowRight' });
      act(() => vi.runAllTimers());
      expect(cell(0, 1).tabIndex).toBe(0);
      expect(cell(0, 0).tabIndex).toBe(-1);
      expect(document.activeElement).toBe(cell(0, 1));
      fireEvent.keyDown(cell(0, 1), { key: 'End' });
      act(() => vi.runAllTimers());
      expect(document.activeElement).toBe(cell(0, 2));
      fireEvent.keyDown(cell(0, 2), { key: 'ArrowDown' });
      act(() => vi.runAllTimers());
      expect(document.activeElement).toBe(cell(1, 2));
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('<OgePivotGrid> — menus, filters, chooser (mirror of pivot-chooser.spec)', () => {
  const SMALL: Sale[] = [
    { region: 'EU', city: 'Berlin', year: 2024, amount: 100 },
    { region: 'EU', city: 'Paris', year: 2024, amount: 50 },
    { region: 'US', city: 'NYC', year: 2025, amount: 300 },
  ];

  function header(container: HTMLElement, text: string): HTMLElement {
    return Array.from(
      container.querySelectorAll(
        '.oge-pivot-row-header, .oge-pivot-col-header',
      ),
    ).find((h) => h.textContent?.trim() === text) as HTMLElement;
  }

  function menuItem(container: HTMLElement, text: string): HTMLElement {
    return Array.from(container.querySelectorAll('.oge-menu-item')).find((b) =>
      b.textContent?.includes(text),
    ) as HTMLElement;
  }

  it('header menu sorts descending and clears sorting', () => {
    const { container } = render(<OgePivotGrid data={SMALL} fields={FIELDS} />);
    fireEvent.contextMenu(header(container, 'EU'), {
      clientX: 12,
      clientY: 34,
    });
    const menu = container.querySelector('.oge-context-menu') as HTMLElement;
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.style.top).toBe('34px');
    fireEvent.click(menuItem(container, 'Sort Z to A'));
    expect(container.querySelector('.oge-context-menu')).toBeNull();
    expect(rowHeaders(container)).toEqual(['US', 'EU', 'Grand Total']);
    fireEvent.contextMenu(header(container, 'US'));
    fireEvent.click(menuItem(container, 'Clear sorting'));
    expect(rowHeaders(container)).toEqual(['EU', 'US', 'Grand Total']);
  });

  it('sortBySummary from a column header orders rows by that column', () => {
    const { container } = render(<OgePivotGrid data={SMALL} fields={FIELDS} />);
    fireEvent.contextMenu(header(container, '2025'));
    fireEvent.click(menuItem(container, 'Sort by "2025"'));
    expect(rowHeaders(container)).toEqual(['US', 'EU', 'Grand Total']);
  });

  it('filter popup narrows the pivot to the selected values', () => {
    const { container } = render(<OgePivotGrid data={SMALL} fields={FIELDS} />);
    fireEvent.contextMenu(header(container, 'EU'));
    fireEvent.click(menuItem(container, 'Filter values'));
    const popup = container.querySelector(
      '.oge-pivot-filter-popup',
    ) as HTMLElement;
    expect(popup).toBeTruthy();
    // an outside-document click must not have closed it
    const us = Array.from(
      popup.querySelectorAll('.oge-hf-item:not(.oge-hf-all)'),
    ).find((i) => i.textContent?.includes('US'));
    fireEvent.click(us?.querySelector('input') as HTMLInputElement);
    fireEvent.click(
      Array.from(popup.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Apply'),
      ) as HTMLElement,
    );
    expect(rowHeaders(container)).toEqual(['EU', 'Grand Total']);
  });

  it('closes the menu on an outside click and on Escape', () => {
    const { container } = render(<OgePivotGrid data={SMALL} fields={FIELDS} />);
    fireEvent.contextMenu(header(container, 'EU'));
    expect(container.querySelector('.oge-context-menu')).toBeTruthy();
    fireEvent.click(document.body);
    expect(container.querySelector('.oge-context-menu')).toBeNull();
    fireEvent.contextMenu(header(container, 'EU'));
    fireEvent.keyDown(
      container.querySelector('.oge-context-menu') as HTMLElement,
      {
        key: 'Escape',
      },
    );
    expect(container.querySelector('.oge-context-menu')).toBeNull();
  });

  it('remove field via the menu drops it from the layout', () => {
    const { container } = render(<OgePivotGrid data={SMALL} fields={FIELDS} />);
    fireEvent.contextMenu(header(container, 'EU'));
    fireEvent.click(menuItem(container, 'Remove field'));
    expect(rowHeaders(container)).toEqual([
      'Berlin',
      'NYC',
      'Paris',
      'Grand Total',
    ]);
  });

  it('measure menu switches the summary type', () => {
    const { container } = render(<OgePivotGrid data={SMALL} fields={FIELDS} />);
    const chip = Array.from(
      container.querySelectorAll(
        '.oge-pivot-area[data-area="data"] .oge-pivot-field-chip',
      ),
    ).find((c) => c.textContent?.trim() === 'Amount') as HTMLElement;
    fireEvent.contextMenu(chip);
    fireEvent.click(menuItem(container, 'Summary type: Count'));
    expect(
      container.querySelector('.oge-pivot-cell')?.textContent?.trim(),
    ).toBe('2');
  });

  it('field chooser onDemand only applies the draft on Apply', async () => {
    const ref = createRef<OgePivotGridHandle<Sale>>();
    const { container } = render(
      <OgePivotGrid
        ref={ref}
        data={SMALL}
        fields={FIELDS}
        fieldChooser={{ applyChangesMode: 'onDemand' }}
      />,
    );
    act(() => ref.current?.showFieldChooser());
    const chooser = container.querySelector(
      '.oge-pivot-chooser',
    ) as HTMLElement;
    expect(chooser.getAttribute('role')).toBe('dialog');
    expect(chooser.getAttribute('aria-label')).toBe('Field Chooser');
    const city = Array.from(
      chooser.querySelectorAll('[data-area="row"] .oge-pivot-field-chip'),
    ).find((c) => c.textContent?.trim() === 'City') as HTMLElement;
    const all = chooser.querySelector('.oge-pivot-chooser-all') as HTMLElement;
    pointer('pointerdown', city, 0);
    pointer('pointermove', all, 60);
    pointer('pointerup', all, 60);
    await afterDropClick();
    expect(rowHeaders(container)).toEqual(['EU', 'US', 'Grand Total']);
    expect(
      ref.current?.getFieldLayout().find((f) => f.id === 'city')?.area,
    ).toBe('row');
    fireEvent.click(
      Array.from(chooser.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Apply'),
      ) as HTMLElement,
    );
    expect(container.querySelector('.oge-pivot-chooser')).toBeNull();
    expect(
      ref.current?.getFieldLayout().find((f) => f.id === 'city')?.area,
    ).toBeNull();
  });
});

describe('<OgePivotGrid> — configuration', () => {
  it('localizes through the provider and per-instance messages', () => {
    const { container, rerender } = render(
      <OgePivotMessagesProvider messages={{ grandTotal: 'Toplam' }}>
        <OgePivotGrid data={SALES} fields={FIELDS} />
      </OgePivotMessagesProvider>,
    );
    expect(rowHeaders(container).at(-1)).toBe('Toplam');
    // a new provider value re-resolves the subtree (runtime language switch)
    rerender(
      <OgePivotMessagesProvider messages={{ grandTotal: 'Gesamt' }}>
        <OgePivotGrid data={SALES} fields={FIELDS} />
      </OgePivotMessagesProvider>,
    );
    expect(rowHeaders(container).at(-1)).toBe('Gesamt');
    rerender(
      <OgePivotMessagesProvider messages={{ grandTotal: 'Gesamt' }}>
        <OgePivotGrid
          data={SALES}
          fields={FIELDS}
          messages={{ grandTotal: 'Summe' }}
        />
      </OgePivotMessagesProvider>,
    );
    expect(rowHeaders(container).at(-1)).toBe('Summe');
  });

  it('reacts to data and totals props', () => {
    const { container, rerender } = render(
      <OgePivotGrid data={SALES} fields={FIELDS} />,
    );
    rerender(
      <OgePivotGrid
        data={SALES.slice(0, 1)}
        fields={FIELDS}
        showRowGrandTotals={false}
      />,
    );
    expect(rowHeaders(container)).toEqual(['EU']);
  });
});

describe('<OgePivotGrid> — persistence', () => {
  class MemoryStorage implements OgeStateStorage {
    readonly map = new Map<string, string>();
    get(key: string): string | null {
      return this.map.get(key) ?? null;
    }
    set(key: string, value: string): void {
      this.map.set(key, value);
    }
  }

  it('round-trips field layout and expansion through the grid storage', async () => {
    vi.useFakeTimers();
    try {
      const storage = new MemoryStorage();
      const onStateChange = vi.fn();
      const first = render(
        <OgeGridStateStorageProvider storage={storage}>
          <OgePivotGrid
            data={SALES}
            fields={FIELDS}
            stateKey="pivot-test"
            onStateChange={onStateChange}
          />
        </OgeGridStateStorageProvider>,
      );
      fireEvent.click(
        first.container.querySelector('.oge-pivot-row-header') as HTMLElement,
      );
      act(() => vi.advanceTimersByTime(350));
      expect(onStateChange).toHaveBeenCalledTimes(1);
      expect(storage.get('oge-pivot:pivot-test')).toContain('"EU"');
      first.unmount();

      const second = render(
        <OgeGridStateStorageProvider storage={storage}>
          <OgePivotGrid data={SALES} fields={FIELDS} stateKey="pivot-test" />
        </OgeGridStateStorageProvider>,
      );
      expect(rowHeaders(second.container)).toContain('Berlin');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('<OgePivotGrid> — virtualization and remote data', () => {
  function makeSales(count: number): Sale[] {
    return Array.from({ length: count }, (_, i) => ({
      region: `Region ${String(i % 50)}`,
      city: `City ${String(i % 200)}`,
      year: 2020 + (i % 3),
      amount: (i * 31) % 500,
    }));
  }

  it('renders only the windowed slice of a large matrix', () => {
    const ref = createRef<OgePivotGridHandle<Sale>>();
    const { container } = render(
      <OgePivotGrid
        ref={ref}
        data={makeSales(20_000)}
        fields={FIELDS}
        virtualScrolling
        fieldPanel={false}
      />,
    );
    act(() => ref.current?.expandAll('row'));
    expect(
      container.querySelectorAll('.oge-pivot-row-header').length,
    ).toBeLessThan(80);
    expect(container.querySelectorAll('.oge-pivot-cell').length).toBeLessThan(
      400,
    );
    const matrix = container.querySelector('.oge-pivot-matrix') as HTMLElement;
    expect(matrix.style.gridTemplateRows).toContain('32px');
    // scrolling moves the window
    const viewport = container.querySelector(
      '.oge-pivot-viewport',
    ) as HTMLElement;
    viewport.scrollTop = 32 * 150; // 251 row slots: 50 regions + 200 cities + grand
    fireEvent.scroll(viewport);
    const firstRow = container.querySelector(
      '.oge-pivot-row-header',
    ) as HTMLElement;
    expect(Number(firstRow.getAttribute('aria-rowindex'))).toBeGreaterThan(100);
  });

  class LoggingStore implements OgePivotStore<Sale> {
    readonly calls: PivotLoadOptions[] = [];
    private readonly inner = new LocalPivotStore<Sale>(makeSales(200));
    load(options: PivotLoadOptions): Promise<PivotLoadResult> {
      this.calls.push(options);
      return this.inner.load(options);
    }
  }

  it('loads through the serializable contract and re-loads on expand', async () => {
    const store = new LoggingStore();
    const { container } = render(
      <OgePivotGrid data={store} fields={FIELDS} fieldPanel={false} />,
    );
    expect(screen.getByRole('status').textContent).toContain('Loading…');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve));
    });
    expect(store.calls).toHaveLength(1);
    expect(store.calls[0].rowFields.map((f) => f.dataField)).toEqual([
      'region',
      'city',
    ]);
    expect(rowHeaders(container)[0]).toBe('Region 0');
    expect(rowHeaders(container).at(-1)).toBe('Grand Total');
    expect(container.querySelector('.oge-load-panel')).toBeNull();

    fireEvent.click(
      container.querySelector('.oge-pivot-row-header') as HTMLElement,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve));
    });
    expect(store.calls).toHaveLength(2);
    expect(store.calls[1].rowExpandedPaths).toEqual([['Region 0']]);
    expect(rowHeaders(container)).toContain('City 0');
  });
});

describe('<OgePivotGrid> — StrictMode', () => {
  it('survives the cleanup → remount cycle and still loads remote data', async () => {
    class CountingStore implements OgePivotStore<Sale> {
      calls = 0;
      private readonly inner = new LocalPivotStore<Sale>(SALES);
      load(options: PivotLoadOptions): Promise<PivotLoadResult> {
        this.calls += 1;
        return this.inner.load(options);
      }
    }
    const store = new CountingStore();
    const { container } = render(
      <StrictMode>
        <OgePivotGrid data={store} fields={FIELDS} />
      </StrictMode>,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve));
    });
    // the first load was aborted by the simulated unmount; the revived
    // instance issued its own and rendered it
    expect(store.calls).toBe(2);
    expect(rowHeaders(container)).toEqual(['EU', 'US', 'Grand Total']);
    fireEvent.click(
      container.querySelector('.oge-pivot-row-header') as HTMLElement,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve));
    });
    expect(rowHeaders(container)).toContain('Berlin');
  });

  it('keeps local interaction alive after the remount', () => {
    const { container } = render(
      <StrictMode>
        <OgePivotGrid data={SALES} fields={FIELDS} />
      </StrictMode>,
    );
    fireEvent.click(
      container.querySelector('.oge-pivot-row-header') as HTMLElement,
    );
    expect(rowHeaders(container)).toContain('Berlin');
    fireEvent.contextMenu(
      container.querySelector('.oge-pivot-row-header') as HTMLElement,
    );
    expect(container.querySelector('.oge-context-menu')).toBeTruthy();
  });
});
