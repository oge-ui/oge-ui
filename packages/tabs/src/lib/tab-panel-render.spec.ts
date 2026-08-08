import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTab } from './tab';
import { OgeTabPanel } from './tab-panel';
import { OgeTabContentTemplate } from './templates';
import type { OgeTabItem } from './tabs-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-spy',
  template: `spy`,
})
class SpyComp {
  static instances = 0;
  constructor() {
    SpyComp.instances++;
  }
}

@Component({
  imports: [OgeTabPanel, OgeTab, OgeTabContentTemplate, SpyComp],
  template: `
    <oge-tab-panel
      [(selectedIndex)]="index"
      [deferRendering]="defer()"
      [keepAlive]="keepAlive()"
      [items]="items()"
    >
      <oge-tab text="Eager">eager-content</oge-tab>
      <oge-tab text="Lazy">
        <ng-template ogeTabContentTemplate>
          <oge-spy />
        </ng-template>
      </oge-tab>
      <ng-template ogeTabContentTemplate let-item>
        item-content:{{ item?.text }}
      </ng-template>
    </oge-tab-panel>
  `,
})
class RenderHost {
  readonly index = signal(0);
  readonly defer = signal(true);
  readonly keepAlive = signal(true);
  readonly items = signal<readonly OgeTabItem[] | undefined>(undefined);
}

describe('OgeTabPanel rendering modes', () => {
  beforeEach(() => {
    SpyComp.instances = 0;
  });

  async function render(setup?: (host: RenderHost) => void) {
    const fixture = TestBed.createComponent(RenderHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      bodies: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-tab-panel-body')),
    };
  }

  it('defers a lazy template until first activation', async () => {
    const { fixture, host, bodies } = await render();
    expect(SpyComp.instances).toBe(0);
    expect(bodies()[0].textContent).toContain('eager-content');
    expect(bodies()[1].textContent?.trim()).toBe('');

    host.index.set(1);
    await settle(fixture);
    expect(SpyComp.instances).toBe(1);
    expect(bodies()[1].textContent).toContain('spy');
  });

  it('keepAlive keeps a rendered panel mounted while hidden', async () => {
    const { fixture, host, bodies } = await render();
    host.index.set(1);
    await settle(fixture);
    host.index.set(0);
    await settle(fixture);
    expect(bodies()[1].hidden).toBe(true);
    expect(bodies()[1].textContent).toContain('spy');
    expect(SpyComp.instances).toBe(1);

    host.index.set(1);
    await settle(fixture);
    // still the same instance — state survived the switch
    expect(SpyComp.instances).toBe(1);
  });

  it('keepAlive=false destroys lazy content on deactivation', async () => {
    const { fixture, host, bodies } = await render((h) =>
      h.keepAlive.set(false),
    );
    host.index.set(1);
    await settle(fixture);
    expect(SpyComp.instances).toBe(1);

    host.index.set(0);
    await settle(fixture);
    expect(bodies()[1].textContent?.trim()).toBe('');

    host.index.set(1);
    await settle(fixture);
    expect(SpyComp.instances).toBe(2);
  });

  it('deferRendering=false renders every panel up front', async () => {
    const { bodies } = await render((h) => h.defer.set(false));
    expect(bodies()[0].textContent).toContain('eager-content');
    expect(bodies()[1].textContent).toContain('spy');
    expect(SpyComp.instances).toBe(1);
  });

  it('data-driven items render through the component-level content template', async () => {
    const { fixture, host, bodies } = await render((h) =>
      h.items.set([{ key: 'x', text: 'Extra' }]),
    );
    host.index.set(2);
    await settle(fixture);
    expect(bodies()[2].textContent).toContain('item-content:Extra');
  });
});
