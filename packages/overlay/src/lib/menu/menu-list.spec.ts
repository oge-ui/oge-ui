import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeMenuList } from './menu-list';
import type {
  OgeMenuCloseRequestEvent,
  OgeMenuItem,
  OgeMenuListItemClickEvent,
} from './menu-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeMenuList],
  template: `
    <oge-menu-list
      [items]="items()"
      ariaLabel="Actions"
      (itemClick)="clicks.push($event)"
      (closeRequest)="closes.push($event)"
    />
  `,
})
class MenuHost {
  readonly items = signal<readonly OgeMenuItem[]>([
    { text: 'Open' },
    { text: 'Duplicate', disabled: true },
    { separator: true, text: '' },
    { text: 'Details', checked: true },
    { text: 'Delete', severity: 'danger' },
  ]);
  readonly menu = viewChild.required(OgeMenuList);
  readonly clicks: OgeMenuListItemClickEvent[] = [];
  readonly closes: OgeMenuCloseRequestEvent[] = [];
}

function key(el: HTMLElement, k: string): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: k }),
  );
}

describe('OgeMenuList', () => {
  async function render() {
    const fixture = TestBed.createComponent(MenuHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const menuEl = el.querySelector('.oge-menu-list') as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      menuEl,
      buttons: () =>
        Array.from(
          menuEl.querySelectorAll<HTMLButtonElement>('.oge-menu-item'),
        ),
    };
  }

  it('renders roles, ids, separator and checkbox semantics', async () => {
    const { menuEl, buttons } = await render();
    expect(menuEl.getAttribute('role')).toBe('menu');
    expect(menuEl.getAttribute('tabindex')).toBe('-1');
    expect(menuEl.getAttribute('aria-label')).toBe('Actions');
    expect(
      menuEl.querySelector('.oge-menu-separator[role="separator"]'),
    ).toBeTruthy();

    const all = buttons();
    expect(all.length).toBe(4); // separator is not a button
    expect(all[0].getAttribute('role')).toBe('menuitem');
    expect(all[0].id).toBe(`${menuEl.id}-item-0`);
    expect(all[1].disabled).toBe(true);
    expect(all[1].getAttribute('aria-disabled')).toBe('true');
    expect(all[2].getAttribute('role')).toBe('menuitemcheckbox');
    expect(all[2].getAttribute('aria-checked')).toBe('true');
    expect(all[3].classList.contains('oge-menu-item-danger')).toBe(true);
  });

  it('focus() targets the container and activates the first enabled item', async () => {
    const { fixture, host, menuEl, buttons } = await render();
    host.menu().focus();
    await settle(fixture);
    expect(document.activeElement).toBe(menuEl);
    expect(menuEl.getAttribute('aria-activedescendant')).toBe(buttons()[0].id);
    expect(buttons()[0].classList.contains('oge-menu-item-active')).toBe(true);

    host.menu().focus('last');
    await settle(fixture);
    expect(menuEl.getAttribute('aria-activedescendant')).toBe(buttons()[3].id);
  });

  it('arrows wrap and skip disabled items and separators', async () => {
    const { fixture, host, menuEl } = await render();
    host.menu().focus(); // active: Open (0)
    key(menuEl, 'ArrowDown'); // skips disabled Duplicate + separator → Details (3)
    await settle(fixture);
    expect(menuEl.getAttribute('aria-activedescendant')).toMatch(/-item-3$/);

    key(menuEl, 'ArrowDown'); // Delete (4)
    key(menuEl, 'ArrowDown'); // wraps → Open (0)
    await settle(fixture);
    expect(menuEl.getAttribute('aria-activedescendant')).toMatch(/-item-0$/);

    key(menuEl, 'ArrowUp'); // wraps back → Delete (4)
    await settle(fixture);
    expect(menuEl.getAttribute('aria-activedescendant')).toMatch(/-item-4$/);
  });

  it('Home and End jump to the first/last enabled item', async () => {
    const { fixture, host, menuEl } = await render();
    host.menu().focus();
    key(menuEl, 'End');
    await settle(fixture);
    expect(menuEl.getAttribute('aria-activedescendant')).toMatch(/-item-4$/);
    key(menuEl, 'Home');
    await settle(fixture);
    expect(menuEl.getAttribute('aria-activedescendant')).toMatch(/-item-0$/);
  });

  it('Enter activates the active item: itemClick, action, then closeRequest select', async () => {
    const order: string[] = [];
    const { fixture, host, menuEl } = await render();
    host.items.set([
      { text: 'Run', action: () => order.push('action') },
      { text: 'Stop' },
    ]);
    await settle(fixture);
    host.menu().focus();
    key(menuEl, 'Enter');
    order.push(...host.clicks.map(() => 'click'));
    expect(host.clicks.length).toBe(1);
    expect(host.clicks[0].item.text).toBe('Run');
    expect(host.closes).toEqual([
      { reason: 'select', event: expect.any(KeyboardEvent) },
    ]);
    expect(order).toContain('action');
  });

  it('click activates an item and disabled items stay inert', async () => {
    const { host, buttons } = await render();
    buttons()[3].click(); // Delete
    expect(host.clicks.length).toBe(1);
    expect(host.clicks[0].item.text).toBe('Delete');
    expect(host.closes[0]?.reason).toBe('select');

    buttons()[1].click(); // disabled Duplicate
    expect(host.clicks.length).toBe(1);
  });

  it('Escape and Tab emit closeRequests with their reasons', async () => {
    const { host, menuEl } = await render();
    key(menuEl, 'Escape');
    key(menuEl, 'Tab');
    expect(host.closes.map((c) => c.reason)).toEqual(['escape', 'tab']);
  });

  it('hover marks an enabled item active', async () => {
    const { fixture, menuEl, buttons } = await render();
    buttons()[3].dispatchEvent(
      new MouseEvent('pointerenter', { bubbles: false }),
    );
    await settle(fixture);
    expect(menuEl.getAttribute('aria-activedescendant')).toBe(buttons()[3].id);
  });
});

describe('OgeMenuList — links, badges and shortcuts', () => {
  async function render(items: readonly OgeMenuItem[]) {
    const fixture = TestBed.createComponent(MenuHost);
    fixture.componentInstance.items.set(items);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      menuEl: el.querySelector('.oge-menu-list') as HTMLElement,
      rows: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-menu-item')),
    };
  }

  it('renders a url item as a real link with menuitem semantics', async () => {
    const { rows } = await render([
      { text: 'Docs', url: '/docs' },
      { text: 'Copy' },
    ]);
    expect(rows()[0].tagName).toBe('A');
    expect(rows()[0].getAttribute('href')).toBe('/docs');
    expect(rows()[0].getAttribute('role')).toBe('menuitem');
    expect(rows()[1].tagName).toBe('BUTTON');
  });

  it('clicking a link row still emits itemClick and a select close', async () => {
    const { host, rows } = await render([{ text: 'Docs', url: '/docs' }]);
    rows()[0].addEventListener('click', (e) => e.preventDefault()); // no jsdom nav
    rows()[0].dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }),
    );
    expect(host.clicks.map((c) => c.item.text)).toEqual(['Docs']);
    expect(host.closes.map((c) => c.reason)).toEqual(['select']);
  });

  it('keyboard activation clicks the real link — native anchor semantics', async () => {
    const { fixture, host, menuEl, rows } = await render([
      { text: 'Docs', url: '/docs' },
    ]);
    let anchorClicks = 0;
    rows()[0].addEventListener('click', (e) => {
      anchorClicks++;
      e.preventDefault(); // keep jsdom from attempting a real navigation
    });
    host.menu().focus();
    key(menuEl, 'Enter');
    await settle(fixture);
    expect(anchorClicks).toBe(1); // Enter became one real anchor click
    expect(host.clicks).toHaveLength(1); // which emitted itemClick once
    expect(host.clicks[0].event).toBeInstanceOf(MouseEvent);
    expect(host.closes.map((c) => c.reason)).toEqual(['select']);
  });

  it('a handler claiming navigation prevents the default like a pointer click', async () => {
    const { host, menuEl, rows } = await render([
      { text: 'Router', url: '/r' },
    ]);
    const sub = host
      .menu()
      .itemClick.subscribe((e) => e.event.preventDefault());
    let prevented: boolean | null = null;
    // Registered after Angular's own (click) handler, so it observes the
    // handler's decision; the extra preventDefault only silences jsdom.
    rows()[0].addEventListener('click', (e) => {
      prevented = e.defaultPrevented;
      e.preventDefault();
    });
    host.menu().focus();
    key(menuEl, 'Enter');
    expect(prevented).toBe(true);
    sub.unsubscribe();
  });

  it('a disabled link row neither navigates nor emits', async () => {
    const { host, rows } = await render([
      { text: 'Docs', url: '/docs', disabled: true },
    ]);
    expect(rows()[0].classList.contains('oge-menu-item-disabled')).toBe(true);
    expect(rows()[0].getAttribute('aria-disabled')).toBe('true');
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail: 1,
    });
    rows()[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(host.clicks).toHaveLength(0);
  });

  it('renders badges and shortcuts, announcing the shortcut on the row', async () => {
    const { rows } = await render([
      { text: 'Inbox', badge: 12 },
      { text: 'New', shortcut: 'Ctrl+N' },
    ]);
    expect(
      rows()[0].querySelector('.oge-menu-item-badge')?.textContent?.trim(),
    ).toBe('12');
    const shortcutEl = rows()[1].querySelector('.oge-menu-item-shortcut');
    expect(shortcutEl?.textContent?.trim()).toBe('Ctrl+N');
    expect(shortcutEl?.getAttribute('aria-hidden')).toBe('true');
    expect(rows()[1].getAttribute('aria-keyshortcuts')).toBe('Ctrl+N');
  });
});

describe('OgeMenuList — icons', () => {
  async function render(items: readonly OgeMenuItem[]) {
    const fixture = TestBed.createComponent(MenuHost);
    fixture.componentInstance.items.set(items);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      buttons: Array.from(
        el.querySelectorAll<HTMLButtonElement>('.oge-menu-item'),
      ),
    };
  }

  it('renders SVG path data and an icon-font class', async () => {
    const { buttons } = await render([
      { text: 'Copy', icon: 'M2 2h8v8H2z' },
      { text: 'Paste', iconClass: 'fa fa-paste' },
    ]);
    const path = buttons[0].querySelector('.oge-menu-item-icon svg path');
    expect(path?.getAttribute('d')).toBe('M2 2h8v8H2z');
    expect(buttons[0].querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    const i = buttons[1].querySelector('.oge-menu-item-icon i');
    expect(i?.className).toBe('fa fa-paste');
  });

  it('gives every row an icon column once any row has an icon', async () => {
    const { buttons } = await render([
      { text: 'Copy', icon: 'M2 2h8v8H2z' },
      { text: 'Rename' },
    ]);
    // The iconless row still gets the (empty) column, so labels stay aligned.
    expect(buttons[1].querySelector('.oge-menu-item-icon')).not.toBeNull();
    expect(buttons[1].querySelector('.oge-menu-item-icon svg')).toBeNull();
  });

  it('renders no icon column at all when no row has an icon', async () => {
    const { buttons } = await render([{ text: 'Copy' }, { text: 'Rename' }]);
    expect(buttons[0].querySelector('.oge-menu-item-icon')).toBeNull();
  });

  it('keeps the check mark alongside an icon', async () => {
    const { buttons } = await render([
      { text: 'Wrap', icon: 'M2 2h8v8H2z', checked: true },
    ]);
    expect(buttons[0].querySelector('.oge-menu-item-check svg')).not.toBeNull();
    expect(buttons[0].querySelector('.oge-menu-item-icon svg')).not.toBeNull();
    expect(buttons[0].getAttribute('role')).toBe('menuitemcheckbox');
  });
});
