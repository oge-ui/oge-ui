import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeToolbar } from './toolbar';
import { OgeToolbarMenuItemTemplate } from './templates';
import type {
  OgeToolbarItemClickEvent,
  OgeToolbarItemData,
  OgeToolbarMenuClosingEvent,
  OgeToolbarMenuOpeningEvent,
  OgeToolbarOverflow,
  OgeToolbarOverflowChangedEvent,
} from './toolbar-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeToolbar],
  template: `
    <oge-toolbar
      [items]="items()"
      [overflow]="overflow()"
      (itemClick)="clicks.push($event)"
      (menuOpening)="opening.push($event); $event.cancel = cancelOpen()"
      (menuOpened)="opened = opened + 1"
      (menuClosing)="closing.push($event)"
      (menuClosed)="closed = closed + 1"
      (overflowChanged)="overflows.push($event)"
    />
  `,
})
class OverflowHost {
  readonly bar = viewChild.required(OgeToolbar);
  readonly items = signal<readonly OgeToolbarItemData[]>([
    { key: 'a', text: 'Alpha' },
    { key: 'b', text: 'Beta', locateInMenu: 'always' },
    { key: 'c', text: 'Gamma' },
  ]);
  readonly overflow = signal<OgeToolbarOverflow>('menu');
  readonly cancelOpen = signal(false);
  readonly clicks: OgeToolbarItemClickEvent[] = [];
  readonly opening: OgeToolbarMenuOpeningEvent[] = [];
  readonly closing: OgeToolbarMenuClosingEvent[] = [];
  readonly overflows: OgeToolbarOverflowChangedEvent[] = [];
  opened = 0;
  closed = 0;
}

async function render(setup?: (host: OverflowHost) => void) {
  const fixture = TestBed.createComponent(OverflowHost);
  setup?.(fixture.componentInstance);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    menuButton: () =>
      el.querySelector('.oge-toolbar-menu-btn') as HTMLButtonElement,
    hasMenuButton: () => el.querySelector('.oge-toolbar-menu-btn') !== null,
    inlineTexts: () =>
      Array.from(el.querySelectorAll('.oge-toolbar-btn-text')).map((n) =>
        n.textContent?.trim(),
      ),
    menuTexts: () =>
      Array.from(el.querySelectorAll('.oge-menu-item-text')).map((n) =>
        n.textContent?.trim(),
      ),
  };
}

describe('OgeToolbar overflow menu', () => {
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
  afterEach(() => rafSpy.mockRestore());

  it("keeps 'auto' items inline while the container is unmeasured", async () => {
    // jsdom reports zero sizes, so only the explicit 'always' item collapses.
    const { inlineTexts, hasMenuButton } = await render();
    expect(inlineTexts()).toEqual(['Alpha', 'Gamma']);
    expect(hasMenuButton()).toBe(true);
  });

  it("never collapses a 'never' item and shows no button without a menu", async () => {
    const { hasMenuButton, inlineTexts } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'Alpha', locateInMenu: 'never' },
        { key: 'b', text: 'Beta', locateInMenu: 'never' },
      ]),
    );
    expect(inlineTexts()).toEqual(['Alpha', 'Beta']);
    expect(hasMenuButton()).toBe(false);
  });

  it("renders no button at all when overflow is 'none' or 'wrap'", async () => {
    const { fixture, host, hasMenuButton, inlineTexts } = await render((h) =>
      h.overflow.set('none'),
    );
    expect(hasMenuButton()).toBe(false);
    expect(inlineTexts()).toEqual(['Alpha', 'Beta', 'Gamma']);

    host.overflow.set('wrap');
    await settle(fixture);
    expect(hasMenuButton()).toBe(false);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.oge-toolbar-wrap'),
    ).not.toBeNull();
  });

  it('opens the menu with the collapsed items and closes on select', async () => {
    const { fixture, host, menuButton, menuTexts } = await render();
    menuButton().click();
    await settle(fixture);
    expect(menuTexts()).toEqual(['Beta']);
    expect(host.opened).toBe(1);

    const item = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-menu-item',
    ) as HTMLButtonElement;
    item.click();
    await settle(fixture);
    expect(host.clicks.map((c) => [c.key, c.inMenu])).toEqual([['b', true]]);
    expect(host.closed).toBe(1);
    expect(host.closing.at(-1)?.reason).toBe('select');
  });

  it('menuOpening can veto the open', async () => {
    const { fixture, host, menuButton, menuTexts } = await render((h) =>
      h.cancelOpen.set(true),
    );
    menuButton().click();
    await settle(fixture);
    expect(host.opening.length).toBe(1);
    expect(host.opened).toBe(0);
    expect(menuTexts()).toEqual([]);
  });

  it('menuClosing can veto the close', async () => {
    const { fixture, host, menuButton, menuTexts } = await render();
    menuButton().click();
    await settle(fixture);
    expect(menuTexts()).toEqual(['Beta']);

    const veto = (e: OgeToolbarMenuClosingEvent) => (e.cancel = true);
    host.bar().menuClosing.subscribe(veto);
    host.bar().closeMenu('api');
    await settle(fixture);
    expect(menuTexts()).toEqual(['Beta']);
    expect(host.closed).toBe(0);
  });

  it('marks the overflow button with the menu ARIA wiring', async () => {
    const { fixture, menuButton } = await render();
    expect(menuButton().getAttribute('aria-haspopup')).toBe('menu');
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(menuButton().getAttribute('aria-controls')).toBeNull();

    menuButton().click();
    await settle(fixture);
    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    expect(menuButton().getAttribute('aria-controls')).not.toBeNull();
  });

  it('carries disabled and toggle state into the menu row', async () => {
    const { fixture, menuButton, el } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'Alpha' },
        {
          key: 'b',
          text: 'Beta',
          locateInMenu: 'always',
          disabled: true,
          active: true,
        },
      ]),
    );
    menuButton().click();
    await settle(fixture);
    const row = el.querySelector('.oge-menu-item') as HTMLButtonElement;
    expect(row.disabled).toBe(true);
    expect(row.getAttribute('role')).toBe('menuitemcheckbox');
    expect(row.getAttribute('aria-checked')).toBe('true');
  });

  it('reports the collapsed set through overflowChanged', async () => {
    const { fixture, host } = await render();
    expect(host.overflows.at(-1)).toEqual({ keys: ['b'], count: 1 });

    host.items.set([{ key: 'a', text: 'Alpha' }]);
    await settle(fixture);
    expect(host.overflows.at(-1)).toEqual({ keys: [], count: 0 });
  });

  it('renders menu rows through [ogeToolbarMenuItemTemplate]', async () => {
    @Component({
      imports: [OgeToolbar, OgeToolbarMenuItemTemplate],
      template: `
        <oge-toolbar
          [items]="[{ key: 'b', text: 'Beta', locateInMenu: 'always' }]"
        >
          <ng-template ogeToolbarMenuItemTemplate let-item>
            <span class="custom-row">{{ item.text }}!</span>
          </ng-template>
        </oge-toolbar>
      `,
    })
    class MenuTemplateHost {}
    const fixture = TestBed.createComponent(MenuTemplateHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.oge-toolbar-menu-btn') as HTMLButtonElement).click();
    await settle(fixture);
    expect(el.querySelector('.custom-row')?.textContent?.trim()).toBe('Beta!');
  });

  it('is the last stop of the roving tabindex', async () => {
    const { el, menuButton } = await render();
    const stops = Array.from(
      el.querySelectorAll<HTMLElement>(
        '.oge-toolbar-btn, .oge-toolbar-menu-btn',
      ),
    );
    expect(stops.at(-1)).toBe(menuButton());
    expect(stops.map((s) => s.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
    ]);
  });
});

describe('OgeToolbar overflow menu — icons', () => {
  let rafSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        setTimeout(() => cb(0), 0);
        return 0;
      });
  });
  afterEach(() => rafSpy.mockRestore());

  async function openWith(items: readonly OgeToolbarItemData[]) {
    const { fixture, el, menuButton } = await render((h) => h.items.set(items));
    menuButton().click();
    await settle(fixture);
    return {
      rows: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-menu-item')),
    };
  }

  it("carries a collapsed item's icon into the menu row", async () => {
    const { rows } = await openWith([
      { key: 'b', text: 'Beta', icon: 'M2 2h8v8H2z', locateInMenu: 'always' },
    ]);
    expect(
      rows()[0]
        .querySelector('.oge-menu-item-icon svg path')
        ?.getAttribute('d'),
    ).toBe('M2 2h8v8H2z');
  });

  it("showIcon 'onBar' keeps the icon off the menu row", async () => {
    const { rows } = await openWith([
      {
        key: 'b',
        text: 'Beta',
        icon: 'M2 2h8v8H2z',
        showIcon: 'onBar',
        locateInMenu: 'always',
      },
    ]);
    expect(rows()[0].querySelector('.oge-menu-item-icon svg')).toBeNull();
  });

  it("showIcon 'inMenu' puts the icon in the menu but not on the bar", async () => {
    const { fixture, el, menuButton } = await render((h) =>
      h.items.set([
        {
          key: 'a',
          text: 'Alpha',
          icon: 'M2 2h8v8H2z',
          showIcon: 'inMenu',
          locateInMenu: 'always',
        },
        { key: 'c', text: 'Gamma', icon: 'M2 2h8v8H2z', showIcon: 'inMenu' },
      ]),
    );
    // Gamma stays on the bar: 'inMenu' means its icon is not drawn there.
    expect(el.querySelector('.oge-toolbar-item .oge-toolbar-icon')).toBeNull();
    menuButton().click();
    await settle(fixture);
    expect(
      el.querySelector('.oge-menu-item .oge-menu-item-icon svg'),
    ).not.toBeNull();
  });

  it('supports an icon-font class on a menu row', async () => {
    const { rows } = await openWith([
      {
        key: 'b',
        text: 'Beta',
        iconClass: 'fa fa-cut',
        locateInMenu: 'always',
      },
    ]);
    expect(rows()[0].querySelector('.oge-menu-item-icon i')?.className).toBe(
      'fa fa-cut',
    );
  });
});
