import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTab } from './tab';
import { OgeTabPanel } from './tab-panel';
import type {
  OgeTabClickEvent,
  OgeTabItem,
  OgeTabSelectionChangedEvent,
  OgeTabSelectionChangingEvent,
} from './tabs-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeTabPanel, OgeTab],
  template: `
    <oge-tab-panel
      [items]="items()"
      [(selectedIndex)]="index"
      [(selectedKey)]="key"
      [disabled]="allDisabled()"
      (selectionChanging)="onChanging($event)"
      (selectionChanged)="changed.push($event)"
      (tabClick)="clicks.push($event)"
    >
      <oge-tab text="Alpha" key="a">Alpha body</oge-tab>
      <oge-tab text="Beta" key="b" [disabled]="betaDisabled()"
        >Beta body</oge-tab
      >
    </oge-tab-panel>
  `,
})
class SelectionHost {
  readonly items = signal<readonly OgeTabItem[] | undefined>([
    { key: 'c', text: 'Gamma' },
  ]);
  readonly index = signal(0);
  readonly key = signal<string | undefined>(undefined);
  readonly betaDisabled = signal(false);
  readonly allDisabled = signal(false);
  cancelNext = false;
  readonly changing: OgeTabSelectionChangingEvent[] = [];
  readonly changed: OgeTabSelectionChangedEvent[] = [];
  readonly clicks: OgeTabClickEvent[] = [];

  onChanging(event: OgeTabSelectionChangingEvent): void {
    this.changing.push(event);
    if (this.cancelNext) event.cancel = true;
  }
}

describe('OgeTabPanel selection', () => {
  async function render(setup?: (host: SelectionHost) => void) {
    const fixture = TestBed.createComponent(SelectionHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      tabs: () => Array.from(el.querySelectorAll<HTMLElement>('.oge-tab')),
      panels: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-tab-panel-body')),
    };
  }

  it('renders projected children first, then data-driven items', async () => {
    const { tabs } = await render();
    expect(tabs().map((t) => t.textContent?.trim())).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ]);
  });

  it('wires the APG roles and id pairs', async () => {
    const { fixture, tabs, panels } = await render();
    const list = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="tablist"]',
    );
    expect(list).not.toBeNull();
    expect(tabs()[0].getAttribute('role')).toBe('tab');
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs()[1].getAttribute('aria-selected')).toBe('false');
    expect(panels()[0].getAttribute('role')).toBe('tabpanel');
    expect(tabs()[0].getAttribute('aria-controls')).toBe(panels()[0].id);
    expect(panels()[0].getAttribute('aria-labelledby')).toBe(tabs()[0].id);
    expect(panels()[0].hidden).toBe(false);
    expect(panels()[1].hidden).toBe(true);
  });

  it('click selects and updates both two-way models', async () => {
    const { fixture, host, tabs, panels } = await render();
    tabs()[2].click();
    await settle(fixture);
    expect(host.index()).toBe(2);
    expect(host.key()).toBe('c');
    expect(host.changed.length).toBe(1);
    expect(host.changed[0]).toMatchObject({
      index: 2,
      key: 'c',
      previousIndex: 0,
      previousKey: 'a',
    });
    expect(host.changed[0].item).toEqual({ key: 'c', text: 'Gamma' });
    expect(host.clicks.length).toBe(1);
    expect(panels()[2].hidden).toBe(false);
    expect(panels()[0].hidden).toBe(true);
  });

  it('a canceled selectionChanging keeps the current tab', async () => {
    const { fixture, host, tabs } = await render();
    host.cancelNext = true;
    tabs()[1].click();
    await settle(fixture);
    expect(host.changing.length).toBe(1);
    expect(host.changed.length).toBe(0);
    expect(host.index()).toBe(0);
  });

  it('ignores clicks on disabled tabs and on a disabled component', async () => {
    const { fixture, host, tabs } = await render((h) =>
      h.betaDisabled.set(true),
    );
    tabs()[1].click();
    await settle(fixture);
    expect(host.index()).toBe(0);
    expect(host.clicks.length).toBe(0);

    host.allDisabled.set(true);
    await settle(fixture);
    tabs()[2].click();
    await settle(fixture);
    expect(host.index()).toBe(0);
  });

  it('setting selectedKey resolves the index (and back)', async () => {
    const { fixture, host } = await render();
    host.key.set('c');
    await settle(fixture);
    expect(host.index()).toBe(2);

    host.index.set(1);
    await settle(fixture);
    expect(host.key()).toBe('b');
  });

  it('an initial selectedKey wins over the index default', async () => {
    const { host } = await render((h) => h.key.set('b'));
    expect(host.index()).toBe(1);
  });

  it('clamps the index when tabs are removed', async () => {
    const { fixture, host } = await render();
    host.index.set(2);
    await settle(fixture);
    host.items.set([]);
    await settle(fixture);
    expect(host.index()).toBe(1);
    expect(host.key()).toBe('b');
  });

  it('hides tabs with visible=false', async () => {
    const { fixture, host, tabs } = await render();
    host.items.set([{ key: 'c', text: 'Gamma', visible: false }]);
    await settle(fixture);
    expect(tabs().map((t) => t.textContent?.trim())).toEqual(['Alpha', 'Beta']);
  });

  it('renders badges and the dirty indicator', async () => {
    const { fixture, host } = await render();
    host.items.set([{ key: 'c', text: 'Gamma', badge: 7, dirty: true }]);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.oge-tab-badge')?.textContent?.trim()).toBe('7');
    expect(el.querySelector('.oge-tab-dirty-dot')).not.toBeNull();
  });
});
