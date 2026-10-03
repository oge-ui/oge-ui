import {
  LocalPivotStore,
  type OgePivotStore,
  type PivotFieldConfig,
  type PivotLoadOptions,
  type PivotLoadResult,
} from '@oge-ui/core';
import { OgePivotGridCore, type OgePivotGridInputs } from './pivot-grid-core';
import { OGE_DEFAULT_PIVOT_MESSAGES } from './pivot-messages';
import type { OgePivotFieldDef, OgePivotPointer } from './pivot-types';
import { PLAIN_ADAPTER } from './test-adapter';

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

const FIELDS: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'city', area: 'row' },
  { dataField: 'year', area: 'column' },
  { dataField: 'amount', area: 'data', summaryType: 'sum' },
];

function makeCore(
  overrides: Partial<Record<keyof OgePivotGridInputs<Sale>, unknown>> = {},
  fieldLayoutChange?: (fields: readonly PivotFieldConfig[]) => void,
) {
  const inputs: OgePivotGridInputs<Sale> = {
    data: () => SALES,
    fields: () => FIELDS,
    virtualScrolling: () => false,
    showRowTotals: () => true,
    showColumnTotals: () => true,
    showRowGrandTotals: () => true,
    showColumnGrandTotals: () => true,
    messages: () => OGE_DEFAULT_PIVOT_MESSAGES,
    customizeCell: () => undefined,
    fieldChooser: () => ({}),
  };
  for (const [key, value] of Object.entries(overrides)) {
    (inputs as unknown as Record<string, () => unknown>)[key] = () => value;
  }
  return new OgePivotGridCore<Sale>(PLAIN_ADAPTER, {
    inputs,
    fieldLayoutChange,
  });
}

const pointer = (x = 10, y = 20): OgePivotPointer => ({
  clientX: x,
  clientY: y,
  preventDefault: () => undefined,
  stopPropagation: () => undefined,
});

/**
 * The field panel's markup, as both render layers emit it: area zones with
 * `data-area`, chips with `data-field-id`.
 */
function fieldPanel(core: OgePivotGridCore<Sale>): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'oge-pivot-field-panel';
  for (const zone of core.panelAreas()) {
    const area = document.createElement('div');
    area.className = 'oge-pivot-area';
    area.dataset['area'] = zone.area;
    for (const field of zone.fields) {
      const chip = document.createElement('span');
      chip.className = 'oge-pivot-field-chip';
      chip.dataset['fieldId'] = field.id;
      chip.textContent = field.caption ?? field.id;
      area.appendChild(chip);
    }
    panel.appendChild(area);
  }
  document.body.appendChild(panel);
  return panel;
}

/** A jsdom pointer event (no PointerEvent constructor); the target is the hit. */
function pointerEvent(
  type: string,
  target: EventTarget,
  x: number,
  pointerType = 'mouse',
): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
    clientY: 5,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  target.dispatchEvent(event);
  return event;
}

function dragChip(
  core: OgePivotGridCore<Sale>,
  panel: HTMLElement,
  id: string,
  over: Element,
  pointerType = 'mouse',
): void {
  const chip = panel.querySelector(`[data-field-id="${id}"]`) as HTMLElement;
  const field = core.resolvedFields().find((f) => f.id === id);
  if (!field) throw new Error(`${id} missing`);
  const down = new MouseEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: 0,
    clientY: 5,
  });
  Object.defineProperty(down, 'pointerId', { value: 1 });
  Object.defineProperty(down, 'pointerType', { value: pointerType });
  Object.defineProperty(down, 'target', { value: chip });
  core.fieldPointerDown(field, down as unknown as PointerEvent, chip);
  pointerEvent('pointermove', over, 40, pointerType);
}

const rowTexts = (core: OgePivotGridCore<Sale>) =>
  core.rowLines().map((line) => line.text);

describe('OgePivotGridCore — layout and cells', () => {
  it('materializes collapsed roots with totals', () => {
    const core = makeCore();
    expect(rowTexts(core)).toEqual(['EU', 'US', 'Grand Total']);
    expect(core.columnLines().map((l) => l.text)).toEqual([
      '2024',
      '2025',
      'Grand Total',
    ]);
    expect(core.preparedCell(0, 0, 0).text).toBe('150');
    expect(core.preparedCell(2, 2, 0)).toMatchObject({
      text: '450',
      isGrandTotal: true,
    });
  });

  it('toggles a row and runs the customizeCell hook', () => {
    const core = makeCore({
      customizeCell: (cell: {
        value: unknown;
        text: string;
        cssClass?: string;
      }) => {
        if (Number(cell.value) > 100) cell.cssClass = 'big';
      },
    });
    core.toggleRow(core.rowLines()[0]);
    expect(rowTexts(core)).toEqual([
      'EU',
      'Berlin',
      'Paris',
      'US',
      'Grand Total',
    ]);
    expect(core.preparedCell(0, 0, 0).cssClass).toBe('big');
    expect(core.preparedCell(1, 0, 0).cssClass).toBeUndefined();
  });

  it('formats percent display modes and custom formatters', () => {
    const core = makeCore({
      fields: [
        { dataField: 'region', area: 'row' },
        {
          dataField: 'amount',
          area: 'data',
          summaryDisplayMode: 'percentOfGrandTotal',
        },
        {
          dataField: 'amount',
          id: 'money',
          area: 'data',
          format: (v: unknown) => `€${String(v)}`,
        },
      ],
    });
    expect(core.preparedCell(0, 0, 0).text).toBe('33.3%');
    expect(core.preparedCell(0, 0, 1).text).toBe('€150');
  });

  it('returns click payloads, drill-down rows and CSV', () => {
    const core = makeCore();
    const event = new MouseEvent('click');
    expect(core.cellClickPayload(0, 0, event)).toMatchObject({
      rowPath: ['EU'],
      columnPath: [2024],
      measureIndex: 0,
      value: 150,
    });
    expect(core.cellClickPayload(99, 0, event)).toBeNull();
    expect(
      core.drillDown({ rowPath: ['EU'], columnPath: [2024] }),
    ).toHaveLength(2);
    expect(core.getCsv({ bom: false }).split('\r\n')[0]).toBe(
      ',2024,2025,Grand Total',
    );
  });

  it('expands and collapses whole axes', () => {
    const core = makeCore();
    core.expandAll('row');
    expect(rowTexts(core)).toContain('NYC');
    core.collapseAll('row');
    expect(rowTexts(core)).toEqual(['EU', 'US', 'Grand Total']);
  });

  it('windows the matrix in virtual mode', () => {
    const core = makeCore({ virtualScrolling: true });
    core.viewportSize.set({ width: 400, height: 64 });
    expect(core.matrixTemplate().rows).toContain('32px');
    expect(core.visibleRowIndexes().length).toBeLessThanOrEqual(
      core.result().rowLeafCount,
    );
    core.scrollPos.set({ top: 10_000, left: 0 });
    expect(core.visibleRowIndexes()).toEqual([]);
  });
});

describe('OgePivotGridCore — keyboard', () => {
  it('roves the tab stop and reports moves', () => {
    const core = makeCore();
    expect(core.isCellTabbable(0, 0)).toBe(true);
    expect(core.matrixKeydown('ArrowRight')).toBeNull(); // nothing focused yet
    core.focusCell(0, 0);
    expect(core.matrixKeydown('ArrowRight')).toEqual({
      moved: true,
      cell: { row: 0, col: 1 },
    });
    expect(core.isCellTabbable(0, 1)).toBe(true);
    expect(core.matrixKeydown('ArrowUp')).toEqual({
      moved: false,
      cell: { row: 0, col: 1 },
    });
    expect(core.matrixKeydown('End')?.cell).toEqual({ row: 0, col: 2 });
    expect(core.matrixKeydown('x')).toBeNull();
  });
});

describe('OgePivotGridCore — field panel, menus, filters, chooser', () => {
  it('drags a field to another area and reports the layout', () => {
    const changes: (readonly PivotFieldConfig[])[] = [];
    const core = makeCore({}, (fields) => changes.push(fields));
    const panel = fieldPanel(core);
    const column = panel.querySelector('[data-area="column"]') as HTMLElement;
    dragChip(core, panel, 'city', column);
    expect(core.fieldDropTarget()).toEqual({ area: 'column', beforeId: null });
    pointerEvent('pointerup', column, 40);
    expect(core.fieldDropTarget()).toBeNull();
    expect(core.getFieldLayout().find((f) => f.id === 'city')?.area).toBe(
      'column',
    );
    expect(changes).toHaveLength(1);
    expect(core.announcement()).not.toBe('');
    panel.remove();
  });

  it('inserts a dropped field in front of the chip under the pointer', () => {
    const core = makeCore();
    const panel = fieldPanel(core);
    const region = panel.querySelector('[data-field-id="region"]') as HTMLElement;
    dragChip(core, panel, 'year', region);
    expect(core.fieldDropTarget()).toEqual({ area: 'row', beforeId: 'region' });
    pointerEvent('pointerup', region, 40);
    const rows = core
      .getFieldLayout()
      .filter((f) => f.area === 'row')
      .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0))
      .map((f) => f.id);
    expect(rows).toEqual(['year', 'region', 'city']);
    panel.remove();
  });

  it('a pointer drop and the chip keyboard reach the same layout', () => {
    const pointerCore = makeCore();
    const panel = fieldPanel(pointerCore);
    const region = panel.querySelector('[data-field-id="region"]') as HTMLElement;
    dragChip(pointerCore, panel, 'city', region);
    pointerEvent('pointerup', region, 40);
    panel.remove();
    const keyboardCore = makeCore();
    keyboardCore.moveFieldBy('city', -1);
    expect(pointerCore.getFieldLayout()).toEqual(keyboardCore.getFieldLayout());
  });

  it('Escape cancels a chip drag, and a touch swipe never starts one', () => {
    const changes: (readonly PivotFieldConfig[])[] = [];
    const core = makeCore({}, (fields) => changes.push(fields));
    const panel = fieldPanel(core);
    const column = panel.querySelector('[data-area="column"]') as HTMLElement;
    dragChip(core, panel, 'city', column);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    pointerEvent('pointerup', column, 40);
    expect(core.fieldDropTarget()).toBeNull();
    expect(changes).toHaveLength(0);

    dragChip(core, panel, 'city', column, 'touch'); // no long press: a scroll
    pointerEvent('pointerup', column, 40, 'touch');
    expect(changes).toHaveLength(0);
    expect(core.getFieldLayout().find((f) => f.id === 'city')?.area).toBe('row');
    panel.remove();
  });

  it('builds the header menu and sorts through it', () => {
    const core = makeCore();
    core.openHeaderMenu('row', core.rowLines()[0], pointer(5, 6));
    const menu = core.menu();
    expect(menu).toMatchObject({ x: 5, y: 6 });
    expect(menu?.items.map((i) => i.text)).toEqual([
      'Sort A to Z',
      'Sort Z to A',
      'Sort by "EU"',
      'Clear sorting',
      'Filter values…',
      'Remove field',
      'Expand all',
      'Collapse all',
      'Field chooser…',
    ]);
    const desc = menu?.items.find((i) => i.text === 'Sort Z to A');
    if (!desc) throw new Error('missing item');
    core.runMenuItem(desc);
    expect(core.menu()).toBeNull();
    expect(rowTexts(core)).toEqual(['US', 'EU', 'Grand Total']);
    // the grand-total line only carries the axis-wide items
    core.openHeaderMenu('row', core.rowLines()[2], pointer());
    expect(core.menu()?.items).toHaveLength(3);
  });

  it('switches summary type from the measure menu', () => {
    const core = makeCore();
    const amount = core.resolvedFields().find((f) => f.id === 'amount');
    if (!amount) throw new Error('amount missing');
    core.openMeasureMenu(amount, pointer());
    const count = core
      .menu()
      ?.items.find((i) => i.text === 'Summary type: Count');
    if (!count) throw new Error('missing item');
    core.runMenuItem(count);
    expect(core.preparedCell(0, 0, 0).text).toBe('2');
  });

  it('filters values through the popup', () => {
    const core = makeCore();
    const region = core.resolvedFields()[0];
    core.openFilterPopup(region, { x: 1, y: 2 });
    expect(core.filterPopup()?.values).toEqual(['EU', 'US']);
    core.filterSearch.set('u');
    expect(core.visibleFilterValues()).toEqual(['EU', 'US']);
    core.filterSearch.set('us');
    expect(core.visibleFilterValues()).toEqual(['US']);
    core.toggleFilterValue('US');
    core.applyFilterPopup();
    expect(rowTexts(core)).toEqual(['EU', 'Grand Total']);
    core.openFilterPopup(core.resolvedFields()[0], { x: 1, y: 2 });
    core.setFilterType('exclude');
    core.toggleAllFilterValues(); // select all → exclude everything but…
    core.toggleAllFilterValues(); // …toggle back to none
    expect(core.filterPopup()?.selected.size).toBe(0);
    core.clearFilterPopup();
    expect(rowTexts(core)).toEqual(['EU', 'US', 'Grand Total']);
    expect(core.filterValueText('')).toBe('(Blank)');
  });

  it('closes popups on outside document clicks only', () => {
    const core = makeCore();
    core.openHeaderMenu('row', core.rowLines()[0], pointer());
    const inside = document.createElement('div');
    inside.className = 'oge-context-menu';
    const child = document.createElement('button');
    inside.appendChild(child);
    core.documentClick(child);
    expect(core.menu()).not.toBeNull();
    core.documentClick(document.body);
    expect(core.menu()).toBeNull();
  });

  it('keeps chooser edits in a draft until Apply (onDemand)', () => {
    const changes: (readonly PivotFieldConfig[])[] = [];
    const core = makeCore(
      { fieldChooser: { applyChangesMode: 'onDemand' } },
      (f) => changes.push(f),
    );
    core.showFieldChooser();
    expect(core.chooserOpen()).toBe(true);
    expect(core.chooserDraft()).not.toBeNull();
    core.placeField('city', null);
    expect(core.getFieldLayout().find((f) => f.id === 'city')?.area).toBe(
      'row',
    );
    expect(core.chooserAreaFields('row').map((f) => f.id)).toEqual(['region']);
    core.chooserSearch.set('reg');
    expect(core.chooserAllFields().map((f) => f.id)).toEqual(['region']);
    core.applyFieldChooser();
    expect(core.chooserOpen()).toBe(false);
    expect(core.getFieldLayout().find((f) => f.id === 'city')?.area).toBeNull();
    expect(changes).toHaveLength(1);
  });

  it('applies chooser edits live by default', () => {
    const core = makeCore();
    core.showFieldChooser();
    expect(core.chooserDraft()).toBeNull();
    core.placeField('year', 'row');
    expect(core.getFieldLayout().find((f) => f.id === 'year')?.area).toBe(
      'row',
    );
    core.closeFieldChooser();
    expect(core.chooserOpen()).toBe(false);
  });
});

describe('OgePivotGridCore — state', () => {
  it('round-trips state()/applyState()', () => {
    const core = makeCore();
    core.toggleRow(core.rowLines()[0]);
    core.store.moveField('city', null, 0);
    core.store.toggleFieldPanel();
    const snapshot = core.state();
    expect(snapshot.rowExpandedPaths).toEqual([['EU']]);

    const other = makeCore();
    other.applyState(snapshot);
    expect(
      other.getFieldLayout().find((f) => f.id === 'city')?.area,
    ).toBeNull();
    expect(other.store.rowExpandedPathList()).toEqual([['EU']]);
    expect(other.store.fieldPanelCollapsed()).toBe(true);
    other.applyState({ fieldPanelCollapsed: true });
    expect(other.store.fieldPanelCollapsed()).toBe(true);
  });
});

describe('OgePivotGridCore — remote store', () => {
  class LoggingStore implements OgePivotStore<Sale> {
    readonly calls: PivotLoadOptions[] = [];
    private readonly inner = new LocalPivotStore<Sale>(SALES);
    load(options: PivotLoadOptions): Promise<PivotLoadResult> {
      this.calls.push(options);
      return this.inner.load(options);
    }
  }

  const flush = () => new Promise((resolve) => setTimeout(resolve));

  it('loads through the contract and skips unchanged requests', async () => {
    const store = new LoggingStore();
    const core = makeCore({ data: store });
    expect(core.isRemote()).toBe(true);
    expect(core.result().rowLeafCount).toBe(0);
    core.syncRemote();
    core.syncRemote(); // same request → no second load
    expect(store.calls).toHaveLength(1);
    expect(core.loading()).toBe(true);
    await flush();
    expect(core.loading()).toBe(false);
    expect(rowTexts(core)).toEqual(['EU', 'US', 'Grand Total']);

    core.toggleRow(core.rowLines()[0]);
    core.syncRemote();
    expect(store.calls).toHaveLength(2);
    expect(store.calls[1].rowExpandedPaths).toEqual([['EU']]);
    await flush();
    expect(rowTexts(core)).toContain('Berlin');

    // remote expandAll expands every loaded node that reports children
    core.collapseAll('row');
    core.expandAll('row');
    expect(core.store.rowExpandedPathList()).toEqual([['EU'], ['US']]);
  });

  it('aborts a superseded load and reloads after revive', async () => {
    const store = new LoggingStore();
    const core = makeCore({ data: store });
    core.syncRemote();
    const first = store.calls[0].signal;
    core.load(core.remoteRequest());
    expect(first?.aborted).toBe(true);
    core.dispose();
    core.revive();
    core.syncRemote();
    expect(store.calls).toHaveLength(3);
    await flush();
    expect(core.load(null)).toBeUndefined();
  });
});
