import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTabs } from './tabs';
import type {
  OgeTabItem,
  OgeTabSelectionChangedEvent,
  OgeTabsActivation,
  OgeTabsOrientation,
} from './tabs-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function key(target: HTMLElement, keyName: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: keyName, bubbles: true }),
  );
}

@Component({
  imports: [OgeTabs],
  template: `
    <oge-tabs
      [items]="items()"
      [(selectedIndex)]="index"
      [activation]="activation()"
      [orientation]="orientation()"
      (selectionChanged)="changed.push($event)"
    />
  `,
})
class KeyboardHost {
  readonly items = signal<readonly OgeTabItem[]>([
    { key: 'a', text: 'Alpha' },
    { key: 'b', text: 'Beta', disabled: true },
    { key: 'c', text: 'Gamma' },
  ]);
  readonly index = signal(0);
  readonly activation = signal<OgeTabsActivation>('automatic');
  readonly orientation = signal<OgeTabsOrientation>('horizontal');
  readonly changed: OgeTabSelectionChangedEvent[] = [];
}

describe('OgeTabs keyboard', () => {
  async function render(setup?: (host: KeyboardHost) => void) {
    const fixture = TestBed.createComponent(KeyboardHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      strip: el.querySelector<HTMLElement>('.oge-tab-strip') as HTMLElement,
      tabs: () => Array.from(el.querySelectorAll<HTMLElement>('.oge-tab')),
    };
  }

  it('roving tabindex: only the selected tab is in the Tab sequence', async () => {
    const { tabs } = await render();
    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it('ArrowRight moves focus, skips disabled tabs and auto-selects', async () => {
    const { fixture, host, tabs } = await render();
    tabs()[0].focus();
    key(tabs()[0], 'ArrowRight');
    await settle(fixture);
    expect(host.index()).toBe(2);
    expect(document.activeElement).toBe(tabs()[2]);
    expect(tabs().map((t) => t.tabIndex)).toEqual([-1, -1, 0]);
  });

  it('wraps from the last tab to the first', async () => {
    const { fixture, host, tabs } = await render((h) => h.index.set(2));
    tabs()[2].focus();
    key(tabs()[2], 'ArrowRight');
    await settle(fixture);
    expect(host.index()).toBe(0);
  });

  it('manual activation moves focus only; Enter and Space commit', async () => {
    const { fixture, host, tabs } = await render((h) =>
      h.activation.set('manual'),
    );
    tabs()[0].focus();
    key(tabs()[0], 'ArrowRight');
    await settle(fixture);
    expect(host.index()).toBe(0);
    expect(document.activeElement).toBe(tabs()[2]);

    key(tabs()[2], 'Enter');
    await settle(fixture);
    expect(host.index()).toBe(2);

    key(tabs()[2], 'ArrowLeft');
    await settle(fixture);
    key(tabs()[0], ' ');
    await settle(fixture);
    expect(host.index()).toBe(0);
  });

  it('Home and End jump to the first / last enabled tab', async () => {
    const { fixture, host, tabs } = await render((h) => h.index.set(2));
    tabs()[2].focus();
    key(tabs()[2], 'Home');
    await settle(fixture);
    expect(host.index()).toBe(0);

    key(tabs()[0], 'End');
    await settle(fixture);
    expect(host.index()).toBe(2);
  });

  it('flips the horizontal arrows in RTL', async () => {
    const { fixture, host, strip, tabs } = await render();
    strip.style.direction = 'rtl';
    tabs()[0].focus();
    key(tabs()[0], 'ArrowLeft');
    await settle(fixture);
    expect(host.index()).toBe(2);
  });

  it('vertical orientation navigates with ArrowDown/ArrowUp', async () => {
    const { fixture, host, tabs } = await render((h) =>
      h.orientation.set('vertical'),
    );
    tabs()[0].focus();
    key(tabs()[0], 'ArrowDown');
    await settle(fixture);
    expect(host.index()).toBe(2);

    key(tabs()[2], 'ArrowUp');
    await settle(fixture);
    expect(host.index()).toBe(0);

    // horizontal arrows do nothing in vertical mode
    key(tabs()[0], 'ArrowRight');
    await settle(fixture);
    expect(host.index()).toBe(0);
  });

  it('sets aria-orientation only when vertical', async () => {
    const { fixture, host } = await render();
    const list = () =>
      (fixture.nativeElement as HTMLElement).querySelector('[role="tablist"]');
    expect(list()?.getAttribute('aria-orientation')).toBeNull();
    host.orientation.set('vertical');
    await settle(fixture);
    expect(list()?.getAttribute('aria-orientation')).toBe('vertical');
  });
});
