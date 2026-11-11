import { ogeShownMenuItems } from './menu-item-state';
import type { OgeMenuItem } from './menu-types';

describe('ogeShownMenuItems', () => {
  const sep: OgeMenuItem = { text: '', separator: true };

  it('returns the same array when nothing is hidden', () => {
    const items: OgeMenuItem[] = [{ text: 'A' }, sep, { text: 'B' }];
    expect(ogeShownMenuItems(items)).toBe(items);
  });

  it('drops hidden rows and the separators they strand', () => {
    const items: OgeMenuItem[] = [
      { text: 'Hidden', visible: false },
      sep,
      { text: 'A' },
      sep,
      { text: 'Gone', visible: false },
      sep,
      { text: 'B' },
      sep,
      { text: 'Tail', visible: false },
    ];
    expect(ogeShownMenuItems(items).map((i) => i.text || '—')).toEqual([
      'A',
      '—',
      'B',
    ]);
  });

  it('filters submenus and keeps a stable identity', () => {
    const leaf = { text: 'Keep' };
    const items: OgeMenuItem[] = [
      { text: 'Parent', items: [leaf, { text: 'Drop', visible: false }] },
    ];
    const shown = ogeShownMenuItems(items);
    expect(shown).not.toBe(items);
    expect(shown[0].items).toEqual([leaf]);
    expect(shown[0].items?.[0]).toBe(leaf);
    expect(ogeShownMenuItems(items)).toBe(shown);
  });
});
