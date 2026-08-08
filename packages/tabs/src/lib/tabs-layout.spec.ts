import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTabs } from './tabs';
import type {
  OgeTabItem,
  OgeTabsAlignment,
  OgeTabsIndicatorFit,
} from './tabs-types';
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
      [tabAlignment]="alignment()"
      [indicatorFit]="indicatorFit()"
      [size]="size()"
      [messages]="messages()"
    />
  `,
})
class LayoutHost {
  readonly items = signal<readonly OgeTabItem[]>([
    { key: 'a', text: 'Alpha' },
    { key: 'b', text: 'Beta' },
  ]);
  readonly alignment = signal<OgeTabsAlignment>('start');
  readonly indicatorFit = signal<OgeTabsIndicatorFit>('tab');
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
  readonly messages = signal<Partial<OgeTabsMessages>>({});
}

describe('OgeTabs layout options', () => {
  async function render(setup?: (host: LayoutHost) => void) {
    const fixture = TestBed.createComponent(LayoutHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      strip: () =>
        el.querySelector<HTMLElement>('.oge-tab-strip') as HTMLElement,
      tabs: () => Array.from(el.querySelectorAll<HTMLElement>('.oge-tab')),
      empty: () => el.querySelector<HTMLElement>('.oge-tab-strip-empty'),
      list: () =>
        el.querySelector<HTMLElement>('[role="tablist"]') as HTMLElement,
    };
  }

  it('exposes the alignment on the strip for the stylesheet', async () => {
    const { fixture, host, strip } = await render();
    expect(strip().dataset['alignment']).toBe('start');

    for (const alignment of ['center', 'end', 'justify', 'stretch'] as const) {
      host.alignment.set(alignment);
      await settle(fixture);
      expect(strip().dataset['alignment']).toBe(alignment);
    }
  });

  it('toggles the content-fitted indicator class', async () => {
    const { fixture, host, strip } = await render();
    expect(strip().classList.contains('oge-tab-strip-ink-content')).toBe(false);

    host.indicatorFit.set('content');
    await settle(fixture);
    expect(strip().classList.contains('oge-tab-strip-ink-content')).toBe(true);
  });

  it('renders the empty state instead of tabs when nothing is visible', async () => {
    const { fixture, host, empty, tabs, list } = await render();
    expect(empty()).toBeNull();

    host.items.set([]);
    await settle(fixture);
    expect(tabs().length).toBe(0);
    expect(empty()?.textContent?.trim()).toBe('No tabs to display');
    // the tablist stays in the DOM so the strip keeps its accessible shape
    expect(list()).not.toBeNull();
  });

  it('hides every tab through visible:false and shows the empty state', async () => {
    const { fixture, host, empty, tabs } = await render();
    host.items.set([
      { key: 'a', text: 'Alpha', visible: false },
      { key: 'b', text: 'Beta', visible: false },
    ]);
    await settle(fixture);
    expect(tabs().length).toBe(0);
    expect(empty()).not.toBeNull();
  });

  it('takes the empty-state text from the messages override', async () => {
    const { empty } = await render((h) => {
      h.items.set([]);
      h.messages.set({ noData: 'Sekme yok' });
    });
    expect(empty()?.textContent?.trim()).toBe('Sekme yok');
  });

  it('keeps the size modifier classes that drive the padding variables', async () => {
    const { fixture, host, strip } = await render((h) => h.size.set('sm'));
    expect(strip().classList.contains('oge-tab-strip-sm')).toBe(true);

    host.size.set('lg');
    await settle(fixture);
    expect(strip().classList.contains('oge-tab-strip-lg')).toBe(true);
    expect(strip().classList.contains('oge-tab-strip-sm')).toBe(false);
  });
});
