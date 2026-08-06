import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeMenuItem } from '@oge-ui/overlay';
import { OgeDropDownButton } from './drop-down-button';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function key(el: HTMLElement, k: string): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: k }),
  );
}

const ITEMS: readonly OgeMenuItem[] = [
  { text: 'Excel' },
  { text: 'CSV' },
  { text: 'PDF' },
];

@Component({
  imports: [OgeDropDownButton],
  template: `
    <oge-drop-down-button text="Export" [items]="items" [(opened)]="opened" />
  `,
})
class KeyboardHost {
  readonly items = ITEMS;
  readonly opened = signal(false);
}

describe('OgeDropDownButton keyboard', () => {
  async function render() {
    const fixture = TestBed.createComponent(KeyboardHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      trigger: () =>
        el.querySelector('.oge-button-native') as HTMLButtonElement,
      menu: () => el.querySelector('.oge-menu-list') as HTMLElement | null,
    };
  }

  it('ArrowDown on the trigger opens the panel and focuses the first item', async () => {
    const { fixture, host, trigger, menu } = await render();
    trigger().focus();
    key(trigger(), 'ArrowDown');
    await settle(fixture);
    expect(host.opened()).toBe(true);
    const menuEl = menu();
    expect(menuEl).toBeTruthy();
    expect(document.activeElement).toBe(menuEl);
    expect(menuEl?.getAttribute('aria-activedescendant')).toMatch(/-item-0$/);
  });

  it('ArrowUp opens and activates the last item', async () => {
    const { fixture, trigger, menu } = await render();
    trigger().focus();
    key(trigger(), 'ArrowUp');
    await settle(fixture);
    expect(menu()?.getAttribute('aria-activedescendant')).toMatch(/-item-2$/);
  });

  it('Escape inside the menu closes the panel and restores trigger focus', async () => {
    const { fixture, host, trigger, menu } = await render();
    trigger().focus();
    key(trigger(), 'ArrowDown');
    await settle(fixture);

    key(menu() as HTMLElement, 'Escape');
    await settle(fixture);
    expect(host.opened()).toBe(false);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('Tab inside the menu closes and parks focus on the trigger', async () => {
    const { fixture, host, trigger, menu } = await render();
    trigger().focus();
    key(trigger(), 'ArrowDown');
    await settle(fixture);

    key(menu() as HTMLElement, 'Tab');
    await settle(fixture);
    expect(host.opened()).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it('Enter on an active item selects it and closes', async () => {
    const { fixture, host, trigger, menu, el } = await render();
    trigger().focus();
    key(trigger(), 'ArrowDown');
    await settle(fixture);
    key(menu() as HTMLElement, 'ArrowDown'); // CSV
    key(menu() as HTMLElement, 'Enter');
    await settle(fixture);
    expect(host.opened()).toBe(false);
    expect(el.querySelector('.oge-popup')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});
