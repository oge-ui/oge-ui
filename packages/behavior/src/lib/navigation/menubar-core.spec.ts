import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_MENUBAR_MESSAGES,
  findMenubarItemPath,
  isMenubarCompact,
  menubarBarKeys,
  menubarClosedReason,
  menubarDataDescriptors,
  menubarEventBase,
  menubarItemDomId,
  menubarPanelItems,
  menubarPanelLabel,
  menubarPanelPlacement,
  menubarPopupCloseReason,
  menubarStopDisabled,
  pruneHiddenMenubarItems,
  resolveOgeMenubarConfig,
  type OgeMenubarDescriptorCore,
  type OgeMenubarItemData,
} from './menubar-core';

const deepItem: OgeMenubarItemData = { text: 'b.txt' };

const items: OgeMenubarItemData[] = [
  {
    text: 'File',
    key: 'file',
    items: [
      { text: 'New' },
      { text: 'Hidden', visible: false },
      { text: 'Recent', items: [{ text: 'a.txt' }, deepItem] },
    ],
  },
  { text: 'Hidden menu', visible: false },
  { text: 'Edit', items: [{ text: 'Undo' }] },
];

const descriptors = (): OgeMenubarDescriptorCore[] =>
  menubarDataDescriptors(items) as OgeMenubarDescriptorCore[];

describe('resolveOgeMenubarConfig', () => {
  it('defaults and merges messages key by key', () => {
    expect(resolveOgeMenubarConfig(undefined).messages).toEqual(
      OGE_DEFAULT_MENUBAR_MESSAGES,
    );
    const config = resolveOgeMenubarConfig({ messages: { menubar: 'Menü' } });
    expect(config.messages.menubar).toBe('Menü');
  });
});

describe('pruneHiddenMenubarItems', () => {
  it('drops hidden entries at every level', () => {
    const pruned = pruneHiddenMenubarItems(items);
    expect(pruned.map((item) => item.text)).toEqual(['File', 'Edit']);
    expect(pruned[0].items?.map((item) => item.text)).toEqual([
      'New',
      'Recent',
    ]);
  });

  it('leaves a leaf item untouched by reference', () => {
    const leaf = { text: 'Leaf' };
    expect(pruneHiddenMenubarItems([leaf])[0]).toBe(leaf);
  });

  it('does not mutate the source items', () => {
    pruneHiddenMenubarItems(items);
    expect(items[0].items).toHaveLength(3);
  });
});

describe('menubarDataDescriptors', () => {
  it('drops hidden bar entries and gives each an id', () => {
    // The auto ids number the *rendered* entries, so hiding an entry renumbers
    // the ones after it. That is safe here — nothing keys persistent state off
    // a menubar id — unlike the toolbar, whose imperative `hideItem()` map
    // deliberately assigns ids before filtering.
    expect(descriptors().map((d) => d.id)).toEqual(['file', 'i1']);
  });

  it('treats an absent items array as an empty bar', () => {
    expect(menubarDataDescriptors(undefined)).toEqual([]);
  });
});

describe('findMenubarItemPath', () => {
  it('reports the index chain of a nested item', () => {
    expect(findMenubarItemPath(items, deepItem)).toEqual([0, 2, 1]);
  });

  it('reports a top-level item as a one-element path', () => {
    expect(findMenubarItemPath(items, items[2])).toEqual([2]);
  });

  it('reports null for an item that is not in the tree', () => {
    expect(findMenubarItemPath(items, { text: 'nope' })).toBe(null);
  });
});

describe('menubarStopDisabled', () => {
  const bar: OgeMenubarDescriptorCore[] = [
    { id: 'a', item: { text: 'File' } },
    { id: 'b', item: { text: 'Edit', disabled: true } },
    { id: 'c', item: { text: '', separator: true } },
  ];

  it('lets the roving stop land on a plain entry only', () => {
    expect(menubarStopDisabled(bar, 0)).toBe(false);
    expect(menubarStopDisabled(bar, 1)).toBe(true);
    expect(menubarStopDisabled(bar, 2)).toBe(true);
    expect(menubarStopDisabled(bar, 9)).toBe(true);
  });

  it('has no tab stop at all while the whole bar is disabled', () => {
    expect(menubarStopDisabled(bar, 0, true)).toBe(true);
  });
});

describe('menubarBarKeys', () => {
  it('traverses the inline axis and opens downward on a horizontal bar', () => {
    expect(menubarBarKeys('horizontal', false)).toEqual({
      next: 'ArrowRight',
      prev: 'ArrowLeft',
      open: 'ArrowDown',
      openLast: 'ArrowUp',
      back: 'ArrowLeft',
    });
  });

  it('mirrors the inline axis in RTL', () => {
    expect(menubarBarKeys('horizontal', true)).toMatchObject({
      next: 'ArrowLeft',
      prev: 'ArrowRight',
      back: 'ArrowRight',
    });
  });

  it('traverses the block axis and opens to the inline end on a vertical bar', () => {
    expect(menubarBarKeys('vertical', false)).toEqual({
      next: 'ArrowDown',
      prev: 'ArrowUp',
      open: 'ArrowRight',
      openLast: null,
      back: 'ArrowLeft',
    });
    expect(menubarBarKeys('vertical', true).open).toBe('ArrowLeft');
  });
});

describe('the single anchored panel', () => {
  it('shows the open bar entry’s submenu, pruned', () => {
    const rows = menubarPanelItems(descriptors(), 'bar', 0);
    expect(rows.map((row) => row.text)).toEqual(['New', 'Recent']);
  });

  it('shows the whole bar in the hamburger panel', () => {
    const rows = menubarPanelItems(descriptors(), 'hamburger', -1);
    expect(rows.map((row) => row.text)).toEqual(['File', 'Edit']);
  });

  it('shows nothing while nothing is open', () => {
    expect(menubarPanelItems(descriptors(), 'bar', -1)).toEqual([]);
    expect(menubarPanelItems(descriptors(), 'none', 0)).toEqual([]);
  });

  it('names the panel after its parent entry, or after the hamburger', () => {
    expect(menubarPanelLabel(descriptors(), 'bar', 0, 'Menu')).toBe('File');
    expect(menubarPanelLabel(descriptors(), 'hamburger', -1, 'Menu')).toBe(
      'Menu',
    );
    expect(menubarPanelLabel(descriptors(), 'bar', -1, 'Menu')).toBeUndefined();
  });

  it('places the panel beside a vertical bar and below everything else', () => {
    expect(menubarPanelPlacement('bar', 'vertical')).toBe('right-start');
    expect(menubarPanelPlacement('bar', 'horizontal')).toBe('bottom-start');
    expect(menubarPanelPlacement('hamburger', 'vertical')).toBe('bottom-start');
  });

  it('carries the open entry into every submenu event', () => {
    expect(menubarEventBase(descriptors(), 'bar', 0)).toMatchObject({
      key: 'file',
      path: [0],
    });
    expect(menubarEventBase(descriptors(), 'hamburger', 0)).toEqual({
      path: [],
    });
    expect(menubarEventBase(descriptors(), 'bar', -1)).toMatchObject({
      path: [],
    });
  });
});

describe('close reasons', () => {
  it('passes the shared reasons through to the panel', () => {
    expect(menubarPopupCloseReason('escape')).toBe('escape');
    expect(menubarPopupCloseReason('select')).toBe('select');
    expect(menubarPopupCloseReason('tab')).toBe('tab');
  });

  it('maps the menubar-only reasons onto a plain api close', () => {
    expect(menubarPopupCloseReason('api')).toBe('api');
    expect(menubarPopupCloseReason('outside')).toBe('api');
  });

  it('prefers the reason the menubar itself initiated the close with', () => {
    expect(menubarClosedReason('select', 'api')).toBe('select');
  });

  it('falls back to the panel’s own reason when the menubar had none', () => {
    expect(menubarClosedReason(null, 'outside')).toBe('outside');
    expect(menubarClosedReason(null, 'escape')).toBe('escape');
    // 'back' is a submenu level closing — not a menubar-level reason
    expect(menubarClosedReason(null, 'back')).toBe('api');
  });
});

describe('menubarItemDomId', () => {
  it('namespaces the bar entry ids per component', () => {
    expect(menubarItemDomId('oge-menubar-1', 2)).toBe('oge-menubar-1-item-2');
  });
});

describe('isMenubarCompact', () => {
  it('collapses to the hamburger below the breakpoint', () => {
    expect(isMenubarCompact(400, 600)).toBe(true);
    expect(isMenubarCompact(800, 600)).toBe(false);
  });

  it('never collapses without a breakpoint, or before the first measure', () => {
    expect(isMenubarCompact(100, undefined)).toBe(false);
    expect(isMenubarCompact(0, 600)).toBe(false);
  });
});
