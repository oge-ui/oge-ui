import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeMenuList } from './menu-list';
import type { OgeMenuItem } from './menu-types';

@Component({
  imports: [OgeMenuList],
  template: `<oge-menu-list [items]="items()" />`,
})
class TypeAheadHost {
  readonly items = signal<readonly OgeMenuItem[]>([
    { text: 'Alpha' },
    { text: 'Beta' },
    { text: 'Bravo' },
    { text: 'Delta', disabled: true },
    { text: 'Deploy' },
    { text: 'Detach' },
  ]);
  readonly menu = viewChild.required(OgeMenuList);
}

function type(el: HTMLElement, char: string): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: char,
    }),
  );
}

describe('OgeMenuList type-ahead', () => {
  let now = 0;

  beforeEach(() => {
    now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function render(): Promise<{
    fixture: ComponentFixture<TypeAheadHost>;
    host: TypeAheadHost;
    menuEl: HTMLElement;
    active: () => string | null;
  }> {
    const fixture = TestBed.createComponent(TypeAheadHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const menuEl = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-menu-list',
    ) as HTMLElement;
    const active = () => {
      fixture.detectChanges();
      return menuEl.getAttribute('aria-activedescendant');
    };
    return { fixture, host: fixture.componentInstance, menuEl, active };
  }

  it('jumps to the first item starting with the typed character', async () => {
    const { menuEl, active } = await render();
    type(menuEl, 'b');
    expect(active()).toMatch(/-item-1$/); // Beta
  });

  it('a growing buffer refines the match without leaving the current item', async () => {
    const { menuEl, active } = await render();
    type(menuEl, 'd');
    expect(active()).toMatch(/-item-4$/); // Deploy (Delta disabled)
    now += 100;
    type(menuEl, 'e');
    expect(active()).toMatch(/-item-4$/); // still Deploy ("de")
    now += 100;
    type(menuEl, 't');
    expect(active()).toMatch(/-item-5$/); // Detach ("det")
  });

  it('a repeated character cycles through matches', async () => {
    const { menuEl, active } = await render();
    type(menuEl, 'b');
    expect(active()).toMatch(/-item-1$/); // Beta
    now += 100;
    type(menuEl, 'b');
    expect(active()).toMatch(/-item-2$/); // Bravo
    now += 100;
    type(menuEl, 'b');
    expect(active()).toMatch(/-item-1$/); // wraps back to Beta
  });

  it('the buffer resets after the idle timeout', async () => {
    const { menuEl, active } = await render();
    type(menuEl, 'd');
    expect(active()).toMatch(/-item-4$/); // Deploy
    now += 600; // > 500ms default
    type(menuEl, 'a');
    expect(active()).toMatch(/-item-0$/); // Alpha — new buffer, not "da"
  });

  it('disabled items are never matched', async () => {
    const { menuEl, active } = await render();
    type(menuEl, 'd');
    expect(active()).not.toMatch(/-item-3$/); // Delta is disabled
  });
});
