import { describe, expect, it } from 'vitest';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  OgeListBoxCore,
  ogeListBoxDropTarget,
  ogeListBoxReorderAnnouncement,
  ogeListBoxSections,
  ogeListReorderDropIndex,
  ogeMoveListItem,
  type OgeListBoxSelectionMode,
} from './list-box-core';

/** Plain closures, no memoization — proves the machine needs no caching. */
const plain: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next) => (value = next);
    return cell;
  },
  derived: (compute) => compute,
};

interface City {
  id: number;
  name: string;
  country: string;
  closed?: boolean;
}

const CITIES: City[] = [
  { id: 1, name: 'Ankara', country: 'TR' },
  { id: 2, name: 'Berlin', country: 'DE' },
  { id: 3, name: 'Bonn', country: 'DE', closed: true },
  { id: 4, name: 'İzmir', country: 'TR' },
  { id: 5, name: 'Bremen', country: 'DE' },
];

function setup(
  mode: OgeListBoxSelectionMode,
  initial: unknown = mode === 'multiple' ? [] : null,
  extra: { groupBy?: string; search?: boolean } = {},
) {
  let value = initial;
  const core = new OgeListBoxCore<City>(
    {
      inputId: () => 'lb',
      items: () => CITIES,
      displayExpr: () => 'name',
      valueExpr: () => 'id',
      disabledExpr: () => 'closed',
      searchExpr: () => undefined,
      searchEnabled: () => extra.search ?? false,
      searchMode: () => 'contains',
      searchDebounceMs: () => 0,
      groupBy: () => extra.groupBy,
      selectionMode: () => mode,
      value: () => value,
      pageSize: () => 2,
      scrollActiveIntoView: () => undefined,
    },
    plain,
  );
  const apply = (result: { value?: unknown }) => {
    if ('value' in result) value = result.value;
    return result;
  };
  return {
    core,
    apply,
    get value() {
      return value;
    },
  };
}

describe('OgeListBoxCore', () => {
  it('derives option ids and keeps activedescendant on (always open)', () => {
    const { core } = setup('single');
    expect(core.listboxId).toBe('lb-listbox');
    core.ensureActive();
    expect(core.activeIndex()).toBe(0);
    expect(core.activeDescendant()).toBe('lb-option-0');
  });

  it('ensureActive starts at the first selected option', () => {
    const { core } = setup('single', 4);
    core.ensureActive();
    expect(core.activeIndex()).toBe(3);
  });

  it('single mode: selection follows focus and skips disabled options', () => {
    const s = setup('single');
    s.core.ensureActive();
    s.apply(s.core.handleKey({ key: 'ArrowDown' }));
    expect(s.value).toBe(2);
    s.apply(s.core.handleKey({ key: 'ArrowDown' }));
    // Bonn is disabled → İzmir
    expect(s.value).toBe(4);
    s.apply(s.core.handleKey({ key: 'Home' }));
    expect(s.value).toBe(1);
    s.apply(s.core.handleKey({ key: 'End' }));
    expect(s.value).toBe(5);
  });

  it('read-only lists navigate without changing the value', () => {
    const s = setup('single', 1);
    s.core.ensureActive();
    const result = s.core.handleKey({ key: 'ArrowDown' }, false);
    expect(result).toEqual({ handled: true });
    expect(s.core.activeIndex()).toBe(1);
  });

  it('multiple mode: arrows move, Space toggles in items order', () => {
    const s = setup('multiple');
    s.core.ensureActive();
    s.apply(s.core.handleKey({ key: 'End' }));
    expect(s.value).toEqual([]);
    s.apply(s.core.handleKey({ key: ' ' }));
    s.apply(s.core.handleKey({ key: 'Home' }));
    s.apply(s.core.handleKey({ key: 'Enter' }));
    expect(s.value).toEqual([1, 5]);
    s.apply(s.core.handleKey({ key: ' ' }));
    expect(s.value).toEqual([5]);
  });

  it('Shift+Arrow extends from the anchor over enabled options', () => {
    const s = setup('multiple');
    s.core.ensureActive();
    s.apply(s.core.handleKey({ key: ' ' }));
    s.apply(s.core.handleKey({ key: 'ArrowDown', shiftKey: true }));
    s.apply(s.core.handleKey({ key: 'ArrowDown', shiftKey: true }));
    expect(s.value).toEqual([1, 2, 4]);
  });

  it('Ctrl+Shift+End selects to the last option, Ctrl+A toggles all', () => {
    const s = setup('multiple');
    s.core.ensureActive();
    s.apply(s.core.handleKey({ key: 'ArrowDown' }));
    s.apply(s.core.handleKey({ key: 'End', ctrlKey: true, shiftKey: true }));
    expect(s.value).toEqual([2, 4, 5]);
    s.apply(s.core.handleKey({ key: 'a', ctrlKey: true }));
    expect(s.value).toEqual([1, 2, 4, 5]);
    s.apply(s.core.handleKey({ key: 'a', metaKey: true }));
    expect(s.value).toEqual([]);
  });

  it('Ctrl+A is not handled in single mode; Alt combos pass through', () => {
    const s = setup('single');
    expect(s.core.handleKey({ key: 'a', ctrlKey: true }).handled).toBe(false);
    expect(s.core.handleKey({ key: 'ArrowDown', altKey: true }).handled).toBe(
      false,
    );
    expect(s.core.handleKey({ key: 'ArrowRight', ctrlKey: true }).handled).toBe(
      false,
    );
  });

  it('PageDown / PageUp jump by pageSize', () => {
    const s = setup('single');
    s.core.ensureActive();
    s.apply(s.core.handleKey({ key: 'PageDown' }));
    expect(s.core.activeIndex()).toBe(3);
    s.apply(s.core.handleKey({ key: 'PageUp' }));
    expect(s.core.activeIndex()).toBe(0);
  });

  it('type-ahead is accent-insensitive and cycles on a repeated letter', () => {
    const s = setup('single');
    s.core.ensureActive();
    s.apply(s.core.handleKey({ key: 'b' }));
    expect(s.value).toBe(2);
    s.apply(s.core.handleKey({ key: 'b' }));
    // Bonn is disabled → Bremen
    expect(s.value).toBe(5);
    s.core.resetTypeAhead();
    s.apply(s.core.handleKey({ key: 'i' }));
    expect(s.value).toBe(4);
  });

  it('clicks select (single), toggle and Shift-extend (multiple)', () => {
    const single = setup('single');
    expect(single.core.clickOption(1)).toBe(2);
    expect(single.core.clickOption(2)).toBeUndefined();

    const m = setup('multiple');
    m.apply({ value: m.core.clickOption(0) });
    m.apply({ value: m.core.clickOption(4, { shiftKey: true }) });
    expect(m.value).toEqual([1, 2, 4, 5]);
    m.apply({ value: m.core.clickOption(1) });
    expect(m.value).toEqual([1, 4, 5]);
  });

  it('select all / unselect all keep disabled items as they are', () => {
    const s = setup('multiple', [3]);
    expect(s.core.selectAllValue()).toEqual([1, 2, 3, 4, 5]);
    expect(s.core.unselectAllValue()).toEqual([3]);
    expect(s.core.selectedItems().map((c) => c.name)).toEqual(['Bonn']);
  });

  it('keeps values no item produces after the known ones', () => {
    const s = setup('multiple', [99, 2]);
    expect(s.core.toValue(s.core.selectedValues())).toEqual([2, 99]);
  });

  it('folds grouped rows into labelled sections', () => {
    const s = setup('single', null, { groupBy: 'country' });
    const sections = ogeListBoxSections(s.core.rows());
    expect(sections.map((section) => section.label)).toEqual(['TR', 'DE']);
    expect(sections[0].options.map((o) => o.item.name)).toEqual([
      'Ankara',
      'İzmir',
    ]);
    expect(sections[1].options[0].index).toBe(2);
    expect(ogeListBoxSections(setup('single').core.rows())[0].label).toBe(null);
  });

  it('search narrows the visible options', () => {
    const s = setup('multiple', [], { search: true });
    s.core.setSearch('br');
    expect(s.core.visibleItems().map((c) => c.name)).toEqual(['Bremen']);
    expect(s.core.activateItem(CITIES[4])).toBe(true);
    expect(s.core.activateItem(CITIES[0])).toBe(false);
  });
});

describe('list box reordering', () => {
  it('moves an entry to its final index', () => {
    expect(ogeMoveListItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(ogeMoveListItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(ogeMoveListItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });

  it('turns a before / after drop into a final index', () => {
    // [A, B, C]: A after B → [B, A, C]; C before A → [C, A, B]
    expect(ogeListReorderDropIndex(0, 1, 'after')).toBe(1);
    expect(ogeListReorderDropIndex(2, 0, 'before')).toBe(0);
    expect(ogeListReorderDropIndex(0, 2, 'before')).toBe(1);
    expect(ogeListReorderDropIndex(2, 0, 'after')).toBe(1);
    // onto itself or the slot it already holds
    expect(ogeListReorderDropIndex(1, 1, 'after')).toBe(-1);
    expect(ogeListReorderDropIndex(1, 0, 'after')).toBe(-1);
    expect(ogeListReorderDropIndex(1, 2, 'before')).toBe(-1);
  });

  it('reorders the active option with Alt+arrows only', () => {
    const { core } = setup('single');
    core.setActive(1);
    expect(core.reorderKey({ key: 'ArrowDown', altKey: true })).toEqual({
      handled: true,
      reorder: { fromIndex: 1, toIndex: 2 },
    });
    expect(core.reorderKey({ key: 'ArrowUp', altKey: true })).toEqual({
      handled: true,
      reorder: { fromIndex: 1, toIndex: 0 },
    });
    expect(core.reorderKey({ key: 'ArrowDown' }).handled).toBe(false);
    expect(
      core.reorderKey({ key: 'ArrowDown', altKey: true, ctrlKey: true })
        .handled,
    ).toBe(false);
    // at an edge the key is still swallowed, but nothing moves
    core.setActive(0);
    expect(core.reorderKey({ key: 'ArrowUp', altKey: true })).toEqual({
      handled: true,
    });
  });

  it('never moves a disabled option', () => {
    const { core } = setup('single');
    core.setActive(2); // Bonn is closed
    expect(core.reorderKey({ key: 'ArrowDown', altKey: true })).toEqual({
      handled: true,
    });
  });

  it('keeps a move inside its group and maps grouped views to items', () => {
    const { core } = setup('single', null, { groupBy: 'country' });
    // grouped view: Ankara, İzmir | Berlin, Bonn, Bremen
    expect(core.visibleItems().map((c) => c.name)).toEqual([
      'Ankara',
      'İzmir',
      'Berlin',
      'Bonn',
      'Bremen',
    ]);
    core.setActive(1); // İzmir — the next option is in another group
    expect(core.reorderKey({ key: 'ArrowDown', altKey: true })).toEqual({
      handled: true,
    });
    core.setActive(0); // Ankara ↓ İzmir: indices into the whole item set
    expect(core.reorderKey({ key: 'ArrowDown', altKey: true })).toEqual({
      handled: true,
      reorder: { fromIndex: 0, toIndex: 3 },
    });
  });

  it('moves past rows a search hides', () => {
    const { core } = setup('single', null, { search: true });
    core.setSearch('br');
    expect(core.visibleItems().map((c) => c.name)).toEqual(['Bremen']);
    // Bremen dropped before the hidden Ankara lands at the very top
    expect(core.reorderAt(CITIES[4], CITIES[0], 'before')).toEqual({
      fromIndex: 4,
      toIndex: 0,
    });
    expect(core.reorderAt(CITIES[0], CITIES[0], 'after')).toBeNull();
  });

  it('resolves the drop target from the option under the pointer', () => {
    const list = document.createElement('div');
    list.setAttribute('role', 'listbox');
    const option = document.createElement('div');
    option.className = 'oge-list-box-option';
    option.setAttribute('data-index', '3');
    const label = document.createElement('span');
    option.append(label);
    list.append(option);
    option.getBoundingClientRect = () =>
      ({ top: 100, height: 20, bottom: 120 }) as DOMRect;
    expect(ogeListBoxDropTarget(label, list, 105)).toEqual({
      index: 3,
      position: 'before',
    });
    expect(ogeListBoxDropTarget(label, list, 115)).toEqual({
      index: 3,
      position: 'after',
    });
    expect(ogeListBoxDropTarget(list, list, 105)).toBeNull();
    const other = document.createElement('div');
    other.setAttribute('role', 'listbox');
    expect(ogeListBoxDropTarget(label, other, 105)).toBeNull();
  });

  it('words the announcement', () => {
    expect(
      ogeListBoxReorderAnnouncement(
        '{item} moved to position {position} of {count}',
        'Berlin',
        2,
        5,
        'en',
      ),
    ).toBe('Berlin moved to position 2 of 5');
  });
});
