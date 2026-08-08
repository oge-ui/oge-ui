import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTabs } from './tabs';
import type { OgeTabItem, OgeTabsNavButtonsMode } from './tabs-types';
import type { OgeTabsMessages } from './config';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeTabs],
  template: `
    <oge-tabs
      [items]="items()"
      [(selectedIndex)]="index"
      [showNavButtons]="navMode()"
      [showTabListButton]="listButton()"
      [messages]="messages()"
    />
  `,
})
class OverflowHost {
  readonly items = signal<readonly OgeTabItem[]>([
    { key: 'a', text: 'Alpha' },
    { key: 'b', text: 'Beta' },
    { key: 'c', text: 'Gamma', disabled: true },
  ]);
  readonly index = signal(0);
  readonly navMode = signal<OgeTabsNavButtonsMode>('auto');
  readonly listButton = signal(false);
  readonly messages = signal<Partial<OgeTabsMessages>>({});
}

describe('OgeTabs overflow & all-tabs menu', () => {
  // The anchored panel measures on animation frames; a synchronous stub
  // re-enters Angular's render scheduler mid-tick (bogus NG0100), so rAF is
  // stubbed asynchronously per the workspace convention.
  let rafSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        setTimeout(() => cb(0), 0);
        return 0;
      });
  });
  afterEach(() => {
    rafSpy.mockRestore();
  });

  async function render(setup?: (host: OverflowHost) => void) {
    const fixture = TestBed.createComponent(OverflowHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      navButtons: () =>
        Array.from(
          el.querySelectorAll<HTMLButtonElement>('.oge-tab-strip-nav'),
        ),
      menuButton: () =>
        el.querySelector<HTMLButtonElement>('.oge-tab-strip-menu-btn'),
    };
  }

  it('auto mode hides the nav arrows while nothing overflows', async () => {
    // jsdom reports zero sizes → no overflow
    const { navButtons } = await render();
    expect(navButtons().length).toBe(0);
  });

  it('always/never force the arrows on and off', async () => {
    const { fixture, host, navButtons } = await render((h) =>
      h.navMode.set('always'),
    );
    expect(navButtons().length).toBe(2);
    expect(navButtons()[0].getAttribute('aria-label')).toBe(
      'Scroll tabs backward',
    );

    host.navMode.set('never');
    await settle(fixture);
    expect(navButtons().length).toBe(0);
  });

  it('opens the all-tabs menu and selects through it', async () => {
    const { fixture, host, menuButton } = await render((h) =>
      h.listButton.set(true),
    );
    const button = menuButton() as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Show all tabs');
    button.click();
    await settle(fixture);

    const menu = document.querySelector('.oge-menu-list');
    expect(menu).not.toBeNull();
    const options = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.oge-menu-list [role^="menuitem"]',
      ),
    );
    expect(options.length).toBe(3);
    expect(options[2].getAttribute('aria-disabled')).toBe('true');

    options[1].click();
    await settle(fixture);
    expect(host.index()).toBe(1);
    expect(document.querySelector('.oge-menu-list')).toBeNull();
  });

  it('message overrides reach the strip aria labels', async () => {
    const { menuButton } = await render((h) => {
      h.listButton.set(true);
      h.messages.set({ tabListMenu: 'Tüm sekmeler' });
    });
    expect(menuButton()?.getAttribute('aria-label')).toBe('Tüm sekmeler');
  });
});
