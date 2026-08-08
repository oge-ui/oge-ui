import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTabPanel } from './tab-panel';
import type { OgeTabItem, OgeTabPanelAnimation } from './tabs-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeTabPanel],
  template: `
    <oge-tab-panel
      [items]="items()"
      [(selectedIndex)]="index"
      [panelAnimation]="animation()"
      [dynamicHeight]="dynamicHeight()"
    />
  `,
})
class AnimationHost {
  readonly items = signal<readonly OgeTabItem[]>([
    { key: 'a', text: 'Alpha' },
    { key: 'b', text: 'Beta' },
    { key: 'c', text: 'Gamma' },
  ]);
  readonly index = signal(0);
  readonly animation = signal<OgeTabPanelAnimation>('none');
  readonly dynamicHeight = signal(false);
}

describe('OgeTabPanel transitions', () => {
  async function render(setup?: (host: AnimationHost) => void) {
    const fixture = TestBed.createComponent(AnimationHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      content: () =>
        el.querySelector<HTMLElement>('.oge-tab-panel-content') as HTMLElement,
    };
  }

  it('stays inert while panelAnimation is none', async () => {
    const { fixture, host, content } = await render();
    host.index.set(1);
    await settle(fixture);
    expect(content().classList.contains('oge-tab-panel-animated')).toBe(false);
    expect(content().classList.contains('oge-tab-anim-a')).toBe(false);
    expect(content().classList.contains('oge-tab-anim-b')).toBe(false);
  });

  it('never animates the very first render', async () => {
    const { content } = await render((h) => h.animation.set('fade'));
    expect(content().classList.contains('oge-tab-panel-animated')).toBe(true);
    // no phase class yet — nothing has changed for the user to perceive
    expect(content().classList.contains('oge-tab-anim-a')).toBe(false);
    expect(content().classList.contains('oge-tab-anim-b')).toBe(false);
  });

  it('alternates the phase class so the CSS animation replays', async () => {
    const { fixture, host, content } = await render((h) =>
      h.animation.set('fade'),
    );
    host.index.set(1);
    await settle(fixture);
    expect(content().classList.contains('oge-tab-anim-a')).toBe(true);

    host.index.set(2);
    await settle(fixture);
    expect(content().classList.contains('oge-tab-anim-a')).toBe(false);
    expect(content().classList.contains('oge-tab-anim-b')).toBe(true);

    host.index.set(0);
    await settle(fixture);
    expect(content().classList.contains('oge-tab-anim-a')).toBe(true);
  });

  it('reports the direction of travel for the slide variant', async () => {
    const { fixture, host, content } = await render((h) =>
      h.animation.set('slide'),
    );
    expect(content().classList.contains('oge-tab-panel-anim-slide')).toBe(true);

    host.index.set(2);
    await settle(fixture);
    expect(content().dataset['animDir']).toBe('forward');

    host.index.set(1);
    await settle(fixture);
    expect(content().dataset['animDir']).toBe('backward');
  });

  it('locks the content height only while dynamicHeight is on', async () => {
    const { fixture, host, content } = await render();
    expect(content().style.blockSize).toBe('');
    expect(content().classList.contains('oge-tab-panel-dynamic-height')).toBe(
      false,
    );

    host.dynamicHeight.set(true);
    await settle(fixture);
    expect(content().classList.contains('oge-tab-panel-dynamic-height')).toBe(
      true,
    );
    // jsdom reports 0 for offsetHeight — what matters is that a lock is set
    expect(content().style.blockSize).not.toBe('');

    host.dynamicHeight.set(false);
    await settle(fixture);
    expect(content().style.blockSize).toBe('');
  });
});
