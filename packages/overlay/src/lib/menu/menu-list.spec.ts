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
