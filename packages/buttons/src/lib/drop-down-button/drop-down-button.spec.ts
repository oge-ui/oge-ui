import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeMenuItem } from '@oge-ui/overlay';
import { OgeDropDownButton } from './drop-down-button';
import { OgeDropDownContent } from './drop-down-button-content';
import type { OgeDropDownButtonItemClickEvent } from './drop-down-button-types';
import type { OgeButtonClickEvent } from '../button/button-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const ITEMS: readonly OgeMenuItem[] = [
  { text: 'Excel', value: 'xlsx' },
  { text: 'CSV', value: 'csv' },
  { text: 'PDF', value: 'pdf', disabled: true },
];

@Component({
  imports: [OgeDropDownButton],
  template: `
    <oge-drop-down-button
      [text]="text()"
      [splitButton]="split()"
      [items]="items()"
      [disabled]="disabled()"
      [rememberLastAction]="remember()"
      [action]="action()"
      [(opened)]="opened"
      (itemClick)="itemClicks.push($event)"
      (clicked)="clicks.push($event)"
    />
  `,
})
class DropDownHost {
  readonly text = signal('Export');
  readonly split = signal(false);
  readonly disabled = signal(false);
  readonly remember = signal(false);
  readonly items = signal<
    readonly OgeMenuItem[] | (() => Promise<readonly OgeMenuItem[]>) | undefined
  >(ITEMS);
  readonly action = signal<(() => unknown) | undefined>(undefined);
  readonly opened = signal(false);
  readonly itemClicks: OgeDropDownButtonItemClickEvent[] = [];
  readonly clicks: OgeButtonClickEvent[] = [];
}

describe('OgeDropDownButton', () => {
  async function render(setup?: (host: DropDownHost) => void) {
    const fixture = TestBed.createComponent(DropDownHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      trigger: () =>
        el.querySelector(
          '.oge-drop-down-button > .oge-button .oge-button-native',
        ) as HTMLButtonElement,
      natives: () =>
        Array.from(
          el.querySelectorAll<HTMLButtonElement>('.oge-button-native'),
        ),
      popup: () => el.querySelector('.oge-popup'),
      menuItems: () =>
        Array.from(el.querySelectorAll<HTMLButtonElement>('.oge-menu-item')),
    };
  }

  it('non-split: trigger click toggles the panel, never emits clicked', async () => {
    const { fixture, host, trigger, popup } = await render();
    expect(popup()).toBeNull();

    trigger().click();
    await settle(fixture);
    expect(popup()).toBeTruthy();
    expect(host.opened()).toBe(true);
    expect(host.clicks.length).toBe(0);

    trigger().click();
    await settle(fixture);
    expect(popup()).toBeNull();
    expect(host.opened()).toBe(false);
  });

  it('wires the WAI-ARIA menu-button trio on the trigger', async () => {
    const { fixture, trigger, el } = await render();
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    trigger().click();
    await settle(fixture);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const controls = trigger().getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(el.querySelector(`#${controls}`)).toBe(
      el.querySelector('.oge-popup'),
    );
  });

  it('renders items and re-emits itemClick, then closes and restores focus', async () => {
    const { fixture, host, trigger, menuItems, popup } = await render();
    trigger().click();
    await settle(fixture);
    expect(menuItems().map((b) => b.textContent?.trim())).toEqual([
      'Excel',
      'CSV',
      'PDF',
    ]);

    menuItems()[1].click();
    await settle(fixture);
    expect(host.itemClicks.length).toBe(1);
    expect(host.itemClicks[0].item.value).toBe('csv');
    expect(popup()).toBeNull();
    expect(host.opened()).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it('the opened model is two-way (programmatic open)', async () => {
    const { fixture, host, popup } = await render();
    host.opened.set(true);
    await settle(fixture);
    expect(popup()).toBeTruthy();
    host.opened.set(false);
    await settle(fixture);
    expect(popup()).toBeNull();
  });

  it('split: main click emits clicked without opening; the chevron toggles', async () => {
    const { fixture, host, natives, popup } = await render((h) =>
      h.split.set(true),
    );
    const [main, chevron] = natives();
    expect(chevron).toBeTruthy();
    expect(chevron.getAttribute('aria-haspopup')).toBe('menu');
    expect(chevron.getAttribute('title')).toBe('Open menu');
    expect(main.getAttribute('aria-haspopup')).toBeNull();

    main.click();
    await settle(fixture);
    expect(host.clicks.length).toBe(1);
    expect(popup()).toBeNull();

    chevron.click();
    await settle(fixture);
    expect(popup()).toBeTruthy();
  });

  it('split main runs the action input through the button pipeline', async () => {
    const gate = deferred<void>();
    let calls = 0;
    const { fixture, host, natives } = await render((h) => {
      h.split.set(true);
      h.action.set(() => {
        calls++;
        return gate.promise;
      });
    });
    natives()[0].click();
    fixture.detectChanges();
    expect(calls).toBe(1);
    expect(host.opened()).toBe(false);
    gate.resolve();
    await flushMicrotasks();
  });

  it('rememberLastAction: the last item becomes the main label and action', async () => {
    const gate = deferred<void>();
    let itemRuns = 0;
    const items: readonly OgeMenuItem[] = [
      { text: 'Run tests', value: 't' },
      {
        text: 'Run build',
        value: 'b',
        action: () => {
          itemRuns++;
          return gate.promise;
        },
      },
    ];
    const { fixture, host, natives, menuItems } = await render((h) => {
      h.split.set(true);
      h.remember.set(true);
      h.items.set(items);
    });
    expect(natives()[0].textContent).toContain('Export');

    natives()[1].click(); // open via chevron
    await settle(fixture);
    menuItems()[1].click(); // "Run build" — menu runs its action once
    await settle(fixture);
    expect(itemRuns).toBe(1);
    expect(host.itemClicks.length).toBe(1);
    expect(natives()[0].textContent).toContain('Run build');

    gate.resolve();
    await flushMicrotasks();

    // main click now re-dispatches the remembered item
    natives()[0].click();
    await settle(fixture);
    expect(host.clicks.length).toBe(1);
    expect(host.itemClicks.length).toBe(2);
    expect(host.itemClicks[1].item.value).toBe('b');
    expect(itemRuns).toBe(2);

    // turning the feature off resets the label
    host.remember.set(false);
    await settle(fixture);
    expect(natives()[0].textContent).toContain('Export');
  });

  it('open()/close()/toggle() drive the panel; selectionChanged tracks rememberLastAction', async () => {
    const { fixture, popup, menuItems } = await render((h) => {
      h.split.set(true);
      h.remember.set(true);
    });
    const dropDown = fixture.debugElement.children[0]
      .componentInstance as OgeDropDownButton;
    const changes: { item: OgeMenuItem; previousItem: OgeMenuItem | null }[] =
      [];
    dropDown.selectionChanged.subscribe((e) => changes.push(e));

    dropDown.open();
    await settle(fixture);
    expect(popup()).toBeTruthy();

    menuItems()[0].click(); // Excel
    await settle(fixture);
    expect(changes).toEqual([
      { item: expect.objectContaining({ value: 'xlsx' }), previousItem: null },
    ]);

    dropDown.toggle();
    await settle(fixture);
    expect(popup()).toBeTruthy();

    menuItems()[1].click(); // CSV
    await settle(fixture);
    expect(changes.length).toBe(2);
    expect(changes[1].previousItem).toEqual(
      expect.objectContaining({ value: 'xlsx' }),
    );

    dropDown.open();
    await settle(fixture);
    dropDown.close();
    await settle(fixture);
    expect(popup()).toBeNull();
  });

  it('renders custom content via *ogeDropDownContent with a working close fn', async () => {
    @Component({
      imports: [OgeDropDownButton, OgeDropDownContent],
      template: `
        <oge-drop-down-button text="Filters" [(opened)]="opened">
          <div *ogeDropDownContent="let close" class="custom-panel">
            <button type="button" class="apply" (click)="close()">Apply</button>
          </div>
        </oge-drop-down-button>
      `,
    })
    class ContentHost {
      readonly opened = signal(false);
    }
    const fixture = TestBed.createComponent(ContentHost);
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.custom-panel')).toBeTruthy();
    expect(el.querySelector('.oge-menu-list')).toBeNull();

    (el.querySelector('.apply') as HTMLButtonElement).click();
    await settle(fixture);
    expect(el.querySelector('.oge-popup')).toBeNull();
    expect(fixture.componentInstance.opened()).toBe(false);
  });

  it('disabled disables both buttons and blocks opening', async () => {
    const { fixture, host, natives, popup, trigger } = await render((h) => {
      h.split.set(true);
      h.disabled.set(true);
    });
    for (const native of natives()) expect(native.disabled).toBe(true);
    trigger().click();
    await settle(fixture);
    expect(popup()).toBeNull();
    expect(host.opened()).toBe(false);
  });
});
