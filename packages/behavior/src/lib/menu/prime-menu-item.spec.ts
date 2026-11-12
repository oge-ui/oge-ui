import {
  ogeFromPrimeMenuItems,
  ogePrimeRouterLinkUrl,
  type OgePrimeMenuItem,
} from './prime-menu-item';
import { ogeShownMenuItems } from './menu-item-state';

describe('ogeFromPrimeMenuItems', () => {
  it('maps every PrimeNG field the menus render', () => {
    const save = vi.fn();
    const prime: OgePrimeMenuItem[] = [
      {
        label: 'Save',
        icon: 'pi pi-save',
        command: save,
        shortcut: 'Ctrl+S',
        badge: '2',
        styleClass: 'menu-primary',
        title: 'Save the draft',
        id: 'save',
      },
      { separator: true },
      {
        label: 'Users',
        routerLink: ['/admin', 'users', 42],
        queryParams: { tab: 'roles and rights', empty: undefined },
        fragment: 'top',
      },
      { label: 'Docs', url: 'https://example.com/docs', tooltip: 'Opens docs' },
      { label: 'Hidden', visible: false },
      { label: 'Off', disabled: true },
      {
        label: 'More',
        items: [{ label: 'Child', routerLink: '/child' }],
      },
    ];
    const items = ogeFromPrimeMenuItems(prime);
    expect(items[0]).toMatchObject({
      text: 'Save',
      iconClass: 'pi pi-save',
      shortcut: 'Ctrl+S',
      badge: '2',
      cssClass: 'menu-primary',
      hint: 'Save the draft',
      value: 'save',
    });
    items[0].action?.();
    expect(save).toHaveBeenCalledWith({ item: prime[0] });
    expect(items[1]).toEqual({ text: '', separator: true });
    expect(items[2].url).toBe('/admin/users/42?tab=roles%20and%20rights#top');
    expect(items[2].value).toBe(prime[2]);
    expect(items[3]).toMatchObject({
      url: 'https://example.com/docs',
      hint: 'Opens docs',
    });
    expect(items[4].visible).toBe(false);
    expect(items[5].disabled).toBe(true);
    expect(items[6].items).toEqual([
      { text: 'Child', value: prime[6].items?.[0], url: '/child' },
    ]);
    // hidden rows drop out the OGE way
    expect(ogeShownMenuItems(items).map((i) => i.text)).not.toContain('Hidden');
  });

  it('builds router URLs from segments', () => {
    expect(ogePrimeRouterLinkUrl({ routerLink: ['/'] })).toBe('/');
    expect(ogePrimeRouterLinkUrl({ routerLink: ['users/', '/5/'] })).toBe(
      'users/5',
    );
    expect(ogePrimeRouterLinkUrl({ routerLink: undefined })).toBeUndefined();
    expect(ogePrimeRouterLinkUrl({ routerLink: '/a', fragment: 'x y' })).toBe(
      '/a#x%20y',
    );
  });
});
