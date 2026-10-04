import type { PivotFieldConfig } from '@oge-ui/core';
import { OgePivotGridCore, type OgePivotGridInputs } from './pivot-grid-core';
import { OGE_DEFAULT_PIVOT_MESSAGES } from './pivot-messages';
import type { OgePivotFieldDef } from './pivot-types';
import { PLAIN_ADAPTER } from './test-adapter';

interface Sale {
  region: string;
  city: string;
  year: number;
  amount: number;
  units: number;
}

const SALES: Sale[] = [
  { region: 'EU', city: 'Berlin', year: 2024, amount: 100, units: 1 },
  { region: 'EU', city: 'Paris', year: 2024, amount: 50, units: 2 },
  { region: 'US', city: 'NYC', year: 2025, amount: 300, units: 3 },
];

// declaration indexes deliberately sparse: `amount` declares areaIndex 7
const FIELDS: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'city', area: 'row' },
  { dataField: 'year', area: 'column' },
  { dataField: 'amount', area: 'data', areaIndex: 7 },
  { dataField: 'units', area: 'data' },
];

function makeCore(
  chooser: OgePivotGridInputs<Sale>['fieldChooser'] = () => ({}),
  fieldLayoutChange?: (fields: readonly PivotFieldConfig[]) => void,
  rtlEnabled?: () => boolean | undefined,
) {
  return new OgePivotGridCore<Sale>(PLAIN_ADAPTER, {
    inputs: {
      rtlEnabled,
      data: () => SALES,
      fields: () => FIELDS,
      virtualScrolling: () => false,
      showRowTotals: () => true,
      showColumnTotals: () => true,
      showRowGrandTotals: () => true,
      showColumnGrandTotals: () => true,
      messages: () => OGE_DEFAULT_PIVOT_MESSAGES,
      customizeCell: () => undefined,
      fieldChooser: chooser,
    },
    fieldLayoutChange,
  });
}

const ids = (core: OgePivotGridCore<Sale>, area: 'row' | 'data' | 'filter') =>
  core
    .panelAreas()
    .find((zone) => zone.area === area)
    ?.fields.map((f) => f.id);

const field = (core: OgePivotGridCore<Sale>, id: string) => {
  const found = core.resolvedFields().find((f) => f.id === id);
  if (!found) throw new Error(`${id} missing`);
  return found;
};

const keyEvent = (key: string, extra: Record<string, boolean> = {}) => {
  const calls = { prevented: false };
  return {
    calls,
    event: {
      key,
      ...extra,
      preventDefault: () => {
        calls.prevented = true;
      },
      stopPropagation: () => undefined,
    },
  };
};

describe('OgePivotGridCore — unified grid keyboard (one tab stop)', () => {
  it('walks from a value cell into the row and column headers', () => {
    const core = makeCore();
    // depth 1 (year), rows EU / US / Grand Total, columns 2024 / 2025 / GT
    core.focusCell(0, 0);
    const left = core.gridKeydown({ key: 'ArrowLeft' });
    expect(left).toEqual({ moved: true, selector: '[data-hpos="1-0"]' });
    expect(core.isRowHeaderTabbable(0)).toBe(true);
    expect(core.isCellTabbable(0, 0)).toBe(false);

    const up = core.gridKeydown({ key: 'ArrowUp' });
    expect(up?.moved).toBe(false); // the corner is not a stop

    core.gridKeydown({ key: 'ArrowRight' });
    const intoHeader = core.gridKeydown({ key: 'ArrowUp' });
    expect(intoHeader).toEqual({ moved: true, selector: '[data-hpos="0-1"]' });
    const first = core.columnHeaderCells()[0];
    expect(core.isColumnHeaderTabbable(first)).toBe(true);
    expect(core.isRowHeaderTabbable(0)).toBe(false);

    const back = core.gridKeydown({ key: 'ArrowDown' });
    expect(back).toEqual({ moved: true, selector: '[data-cell="0-0"]' });
    expect(core.focusedHeader()).toBeNull();
    expect(core.isCellTabbable(0, 0)).toBe(true);
  });

  it('takes the stop on header focus and gives it back on cell focus', () => {
    const core = makeCore();
    expect(core.isCellTabbable(0, 0)).toBe(true);
    expect(core.gridKeydown({ key: 'ArrowDown' })).toBeNull(); // nothing focused
    const header = core.columnHeaderCells()[1];
    core.focusColumnHeader(header);
    expect(core.columnHeaderPos(header)).toBe('0-2');
    expect(core.isColumnHeaderTabbable(header)).toBe(true);
    expect(core.isCellTabbable(0, 0)).toBe(false);
    core.focusRowHeader(2);
    expect(core.rowHeaderPos(2)).toBe('3-0');
    expect(core.isRowHeaderTabbable(2)).toBe(true);
    core.focusCell(1, 1);
    expect(core.isRowHeaderTabbable(2)).toBe(false);
    expect(core.isCellTabbable(1, 1)).toBe(true);
    expect(core.gridKeydown({ key: 'End', ctrlKey: true })?.selector).toBe(
      '[data-cell="2-2"]',
    );
  });
});

describe('OgePivotGridCore — keyboard field moves', () => {
  it('renumbers an area so a move lands exactly where asked', () => {
    const changes: (readonly PivotFieldConfig[])[] = [];
    const core = makeCore(undefined, (f) => changes.push(f));
    expect(ids(core, 'data')).toEqual(['units', 'amount']);
    // drag & drop places at the end — even past a sparse declared index
    core.placeField('region', 'data');
    expect(ids(core, 'data')).toEqual(['units', 'amount', 'region']);
    expect(ids(core, 'row')).toEqual(['city']);
    expect(changes).toHaveLength(1);
    expect(core.announcement()).toBe('Region moved to Values, position 3 of 3');
  });

  it('reorders within an area and refuses to step past the edges', () => {
    const core = makeCore();
    expect(core.moveFieldBy('city', -1)).toBe(true);
    expect(ids(core, 'row')).toEqual(['city', 'region']);
    expect(core.announcement()).toBe('City moved to Rows, position 1 of 2');
    expect(core.moveFieldBy('city', -1)).toBe(false);
    expect(core.moveFieldBy('region', 1)).toBe(false);
  });

  it('walks the areas in panel order with Ctrl+Up/Down', () => {
    const core = makeCore();
    expect(core.moveFieldToAdjacentArea('region', -1)).toBe(true);
    expect(ids(core, 'filter')).toEqual(['region']);
    expect(core.moveFieldToAdjacentArea('region', -1)).toBe(false);
    expect(core.moveFieldToAdjacentArea('units', 1)).toBe(false);
  });

  it('turns chip keys into menu, reorder, area and remove', () => {
    const core = makeCore();
    const at = { x: 5, y: 6 };
    const ctrlRight = keyEvent('ArrowRight', { ctrlKey: true });
    expect(
      core.fieldChipKeydown(field(core, 'region'), 'row', ctrlRight.event, at),
    ).toEqual({ kind: 'moved', fieldId: 'region', area: 'row' });
    expect(ctrlRight.calls.prevented).toBe(true);
    expect(ids(core, 'row')).toEqual(['city', 'region']);

    const ctrlDown = keyEvent('ArrowDown', { ctrlKey: true });
    expect(
      core.fieldChipKeydown(field(core, 'region'), 'row', ctrlDown.event, at),
    ).toEqual({ kind: 'moved', fieldId: 'region', area: 'column' });

    const del = keyEvent('Delete');
    expect(
      core.fieldChipKeydown(field(core, 'region'), 'column', del.event, at),
    ).toEqual({ kind: 'moved', fieldId: 'region', area: null });
    expect(core.announcement()).toBe('Region removed from the layout');

    const enter = keyEvent('Enter');
    expect(
      core.fieldChipKeydown(field(core, 'city'), 'row', enter.event, at),
    ).toEqual({ kind: 'menu' });
    expect(core.menu()).toMatchObject({
      x: 5,
      y: 6,
      label: 'City field actions',
    });

    const plain = keyEvent('ArrowRight');
    expect(
      core.fieldChipKeydown(field(core, 'city'), 'row', plain.event, at),
    ).toBeNull();
    expect(plain.calls.prevented).toBe(false);
  });

  it('builds the field menu: left/right, every other area, remove, measure items', () => {
    const core = makeCore();
    core.openFieldMenu(field(core, 'amount'), 'data', { x: 0, y: 0 });
    const texts = core.menu()?.items.map((i) => i.text) ?? [];
    expect(texts.slice(0, 6)).toEqual([
      'Move left',
      'Move right',
      'Move to Filters',
      'Move to Rows',
      'Move to Columns',
      'Remove field',
    ]);
    expect(texts).toContain('Summary type: Count');
    expect(core.menu()?.items[0].disabled).toBe(false);
    expect(core.menu()?.items[1].disabled).toBe(true); // already last

    const toRows = core.menu()?.items.find((i) => i.text === 'Move to Rows');
    if (!toRows) throw new Error('missing item');
    core.runMenuItem(toRows);
    expect(ids(core, 'row')).toEqual(['region', 'city', 'amount']);

    // an unused field (the chooser's All Fields list) only offers the areas
    core.moveFieldTo('units', null);
    core.openFieldMenu(field(core, 'units'), null, { x: 0, y: 0 });
    expect(core.menu()?.items.map((i) => i.text)).toEqual([
      'Move to Filters',
      'Move to Rows',
      'Move to Columns',
      'Move to Values',
    ]);
  });

  it('keeps keyboard moves in the chooser draft until Apply', () => {
    const changes: (readonly PivotFieldConfig[])[] = [];
    const core = makeCore(
      () => ({ applyChangesMode: 'onDemand' }),
      (f) => changes.push(f),
    );
    core.showFieldChooser();
    core.moveFieldBy('city', -1);
    expect(core.chooserAreaFields('row').map((f) => f.id)).toEqual([
      'city',
      'region',
    ]);
    expect(ids(core, 'row')).toEqual(['region', 'city']); // live layout untouched
    core.openFieldMenu(field(core, 'amount'), 'data', { x: 0, y: 0 });
    expect(core.menu()?.items.map((i) => i.text)).not.toContain(
      'Summary type: Count',
    );
    core.applyFieldChooser();
    expect(ids(core, 'row')).toEqual(['city', 'region']);
    expect(changes).toHaveLength(1);
  });

  it('drives the open menu from the keyboard', () => {
    const core = makeCore();
    expect(core.menuKeydown('ArrowDown', 0)).toBeNull(); // no menu
    core.openFieldMenu(field(core, 'region'), 'row', { x: 0, y: 0 });
    // "Move left" is disabled for the first field
    expect(core.menuKeydown('Home', 3)).toEqual({ kind: 'focus', index: 1 });
    expect(core.menuKeydown('ArrowUp', 1)).toEqual({
      kind: 'focus',
      index: (core.menu()?.items.length ?? 0) - 1,
    });
    expect(core.menuKeydown('Escape', 1)).toEqual({ kind: 'close' });
    expect(core.menu()).toBeNull();
  });

  it('tells the host whether focus returns to the menu opener', () => {
    const core = makeCore();
    core.openFieldMenu(field(core, 'region'), 'row', { x: 0, y: 0 });
    const toFilters = core
      .menu()
      ?.items.find((i) => i.text === 'Move to Filters');
    if (!toFilters) throw new Error('missing item');
    expect(core.runMenuItem(toFilters)).toBe(true);
    expect(core.runMenuItem({ text: 'x', disabled: true })).toBe(false);
    // an item that opens the chooser keeps focus there
    expect(
      core.runMenuItem({
        text: 'chooser',
        action: () => core.showFieldChooser(),
      }),
    ).toBe(false);
    // …while a move made from inside the open chooser returns to its chip
    expect(core.runMenuItem({ text: 'noop' }, true)).toBe(true);
  });

  it('opens the field menu from a right-click', () => {
    const core = makeCore();
    const calls: string[] = [];
    core.openFieldContextMenu(field(core, 'year'), 'column', {
      clientX: 3,
      clientY: 4,
      preventDefault: () => calls.push('prevent'),
      stopPropagation: () => calls.push('stop'),
    });
    expect(calls).toEqual(['prevent', 'stop']);
    expect(core.menu()?.items.map((i) => i.text)).toContain('Move to Rows');
  });
});

describe('OgePivotGridCore — RTL', () => {
  it('follows the host direction and lets rtlEnabled win', async () => {
    const wrap = document.createElement('div');
    const host = document.createElement('div');
    wrap.append(host);
    document.body.append(wrap);
    const explicit: { value?: boolean } = {};
    const core = makeCore(undefined, undefined, () => explicit.value);
    const stop = core.watchDirection(host);
    expect(core.rtl()).toBe(false);
    wrap.setAttribute('dir', 'rtl');
    await Promise.resolve();
    expect(core.rtl()).toBe(true);
    explicit.value = false;
    expect(core.rtl()).toBe(false);
    stop();
    wrap.remove();
  });

  it('labels the field menu moves by screen side in RTL', () => {
    const core = makeCore(undefined, undefined, () => true);
    core.openFieldMenu(field(core, 'amount'), 'data', { x: 0, y: 0 });
    const items = core.menu()?.items ?? [];
    // the earlier position (delta -1) is on the right in RTL
    expect(items[0].text).toBe('Move right');
    expect(items[0].disabled).toBe(false);
    expect(items[1].text).toBe('Move left');
    expect(items[1].disabled).toBe(true);
  });
});
