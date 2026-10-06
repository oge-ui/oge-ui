import { describe, expect, it, vi } from 'vitest';
import {
  buildOgeDrawerItems,
  ogeDrawerItemKey,
  ogeDrawerItemNavIndex,
  runOgeDrawerItemClick,
  type OgeDrawerItem,
} from './drawer-core';

const items: OgeDrawerItem[] = [
  { key: 'inbox', text: 'Inbox', badge: 3 },
  { text: 'Sent' },
  { separator: true },
  { key: 'trash', text: 'Trash', disabled: true },
  { key: 'settings', text: 'Settings', url: '/settings' },
];

describe('drawer items', () => {
  it('keys entries by key, then text, then index', () => {
    expect(ogeDrawerItemKey(items[0], 0)).toBe('inbox');
    expect(ogeDrawerItemKey(items[1], 1)).toBe('Sent');
    expect(ogeDrawerItemKey(items[2], 2)).toBe('#2');
  });

  it('resolves the active entry and disables separators', () => {
    const views = buildOgeDrawerItems(items, 'Sent');
    expect(views.map((v) => v.active)).toEqual([
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(views[2].separator).toBe(true);
    expect(views[2].disabled).toBe(true);
    expect(views[3].disabled).toBe(true);
    expect(buildOgeDrawerItems(undefined, 'x')).toEqual([]);
  });

  it('moves focus with the arrows, wrapping and skipping disabled entries', () => {
    const views = buildOgeDrawerItems(items, undefined);
    expect(ogeDrawerItemNavIndex(views, 1, 'ArrowDown')).toBe(4);
    expect(ogeDrawerItemNavIndex(views, 4, 'ArrowDown')).toBe(0);
    expect(ogeDrawerItemNavIndex(views, 0, 'ArrowUp')).toBe(4);
    expect(ogeDrawerItemNavIndex(views, 4, 'Home')).toBe(0);
    expect(ogeDrawerItemNavIndex(views, 0, 'End')).toBe(4);
    expect(ogeDrawerItemNavIndex(views, 0, 'Tab')).toBeNull();
  });

  it('activates: itemClick, commit, then selectionChanged', () => {
    const views = buildOgeDrawerItems(items, 'inbox');
    const order: string[] = [];
    const changed = runOgeDrawerItemClick({
      view: views[4],
      selectedKey: 'inbox',
      event: new Event('click'),
      emitItemClick: (e) => order.push(`click:${e.key}`),
      commit: (key) => order.push(`commit:${key}`),
      emitSelectionChanged: (e) =>
        order.push(`changed:${e.previousKey}->${e.key}`),
    });
    expect(changed).toBe(true);
    expect(order).toEqual([
      'click:settings',
      'commit:settings',
      'changed:inbox->settings',
    ]);
  });

  it('re-clicking the active entry only reports the click; disabled does nothing', () => {
    const views = buildOgeDrawerItems(items, 'inbox');
    const click = vi.fn();
    const changed = vi.fn();
    const commit = vi.fn();
    expect(
      runOgeDrawerItemClick({
        view: views[0],
        selectedKey: 'inbox',
        event: new Event('click'),
        emitItemClick: click,
        emitSelectionChanged: changed,
        commit,
      }),
    ).toBe(false);
    expect(click).toHaveBeenCalledTimes(1);
    expect(changed).not.toHaveBeenCalled();
    expect(
      runOgeDrawerItemClick({
        view: views[3],
        selectedKey: 'inbox',
        event: new Event('click'),
        emitItemClick: click,
        emitSelectionChanged: changed,
        commit,
      }),
    ).toBe(false);
    expect(click).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
  });
});
