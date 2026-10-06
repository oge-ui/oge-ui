import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { applyMenuItemCheck } from '@oge-ui/behavior';
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
      ariaLabel="View"
      (itemClick)="onClick($event)"
      (closeRequest)="closes.push($event)"
    />
  `,
})
class CheckHost {
  readonly items = signal<readonly OgeMenuItem[]>([
    { text: 'Refresh' },
    { text: 'Layout', type: 'header' },
    { text: 'Grid', type: 'radio', group: 'layout', checked: true },
    { text: 'List', type: 'radio', group: 'layout' },
    { text: '', separator: true },
    { text: 'Show hidden', type: 'checkbox' },
    { text: 'Legacy', checked: false },
    { text: 'Pinned', type: 'checkbox', keepOpen: true },
  ]);
  readonly clicks: OgeMenuListItemClickEvent[] = [];
  readonly closes: OgeMenuCloseRequestEvent[] = [];
  onClick(event: OgeMenuListItemClickEvent): void {
    this.clicks.push(event);
    this.items.update((items) => applyMenuItemCheck(items, event.item));
  }
}

function key(el: HTMLElement, k: string): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: k }),
  );
}

describe('OgeMenuList checkbox / radio / header rows', () => {
  async function render() {
    const fixture = TestBed.createComponent(CheckHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const menuEl = el.querySelector('.oge-menu-list') as HTMLElement;
    const row = (text: string) =>
      Array.from(menuEl.querySelectorAll<HTMLElement>('.oge-menu-item')).find(
        (r) => r.textContent?.trim() === text,
      )!;
    return { fixture, host: fixture.componentInstance, menuEl, row };
  }

  it('renders menuitemradio / menuitemcheckbox roles with aria-checked', async () => {
    const { row } = await render();
    expect(row('Grid').getAttribute('role')).toBe('menuitemradio');
    expect(row('Grid').getAttribute('aria-checked')).toBe('true');
    expect(row('List').getAttribute('aria-checked')).toBe('false');
    expect(row('Show hidden').getAttribute('role')).toBe('menuitemcheckbox');
    expect(row('Show hidden').getAttribute('aria-checked')).toBe('false');
    // historical rule unchanged: checked without type is a checkbox
    expect(row('Legacy').getAttribute('role')).toBe('menuitemcheckbox');
    expect(row('Refresh').getAttribute('role')).toBe('menuitem');
    expect(row('Refresh').hasAttribute('aria-checked')).toBe(false);
    expect(row('Grid').querySelector('.oge-menu-item-radio svg')).toBeTruthy();
    expect(row('List').querySelector('.oge-menu-item-radio svg')).toBeNull();
  });

  it('labels the headed section as a role="group"', async () => {
    const { menuEl } = await render();
    const header = menuEl.querySelector('.oge-menu-header') as HTMLElement;
    expect(header.textContent?.trim()).toBe('Layout');
    expect(header.getAttribute('role')).toBe('presentation');
    expect(header.hasAttribute('tabindex')).toBe(false);
    const group = header.closest('[role="group"]') as HTMLElement;
    expect(group.getAttribute('aria-labelledby')).toBe(header.id);
    expect(
      Array.from(group.querySelectorAll('[role="menuitemradio"]')).map((r) =>
        r.textContent?.trim(),
      ),
    ).toEqual(['Grid', 'List']);
    // the separator closes the section
    expect(group.querySelector('.oge-menu-separator')).toBeNull();
  });

  it('arrow keys and type-ahead skip the header', async () => {
    const { fixture, menuEl, row } = await render();
    menuEl.focus();
    key(menuEl, 'ArrowDown');
    await settle(fixture);
    expect(menuEl.getAttribute('aria-activedescendant')).toBe(
      row('Refresh').id,
    );
    key(menuEl, 'ArrowDown');
    await settle(fixture);
    expect(menuEl.getAttribute('aria-activedescendant')).toBe(row('Grid').id);
    key(menuEl, 'l');
    await settle(fixture);
    // "L" matches "List", never the "Layout" header
    expect(menuEl.getAttribute('aria-activedescendant')).toBe(row('List').id);
  });

  it('reports the next checked state and Space keeps the menu open', async () => {
    const { fixture, host, menuEl, row } = await render();
    menuEl.focus();
    key(menuEl, 'ArrowDown');
    key(menuEl, 'ArrowDown');
    key(menuEl, 'ArrowDown'); // List
    await settle(fixture);
    key(menuEl, ' ');
    await settle(fixture);
    expect(host.clicks.at(-1)?.checked).toBe(true);
    expect(host.closes).toHaveLength(0);
    // the application applied it; the radio group moved, the row stayed active
    expect(row('List').getAttribute('aria-checked')).toBe('true');
    expect(row('Grid').getAttribute('aria-checked')).toBe('false');
    expect(menuEl.getAttribute('aria-activedescendant')).toBe(row('List').id);

    key(menuEl, 'ArrowDown'); // Show hidden
    await settle(fixture);
    key(menuEl, 'Enter');
    await settle(fixture);
    expect(host.clicks.at(-1)?.checked).toBe(true);
    expect(host.closes.map((c) => c.reason)).toEqual(['select']);
  });

  it('a pointer click closes, unless the row says keepOpen', async () => {
    const { fixture, host, row } = await render();
    row('Show hidden').click();
    await settle(fixture);
    expect(host.closes).toHaveLength(1);
    row('Pinned').click();
    await settle(fixture);
    expect(host.clicks.at(-1)?.checked).toBe(true);
    expect(host.closes).toHaveLength(1);
  });

  it('legacy checked rows keep closing on Space', async () => {
    const { fixture, host, menuEl, row } = await render();
    menuEl.focus();
    key(menuEl, 'End');
    key(menuEl, 'ArrowUp'); // Legacy
    await settle(fixture);
    expect(menuEl.getAttribute('aria-activedescendant')).toBe(row('Legacy').id);
    key(menuEl, ' ');
    await settle(fixture);
    expect(host.clicks.at(-1)?.checked).toBe(true);
    expect(host.closes).toHaveLength(1);
  });

  it('plain rows report no checked state', async () => {
    const { fixture, host, row } = await render();
    row('Refresh').click();
    await settle(fixture);
    expect(host.clicks[0].checked).toBeUndefined();
  });
});
