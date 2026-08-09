import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeDrawer } from './drawer';
import { provideOgeDrawerConfig } from './config';
import type { OgeDrawerLandmark, OgeDrawerMode } from './drawer-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeDrawer],
  template: `
    <button type="button" id="opener">Open</button>
    <oge-drawer
      [(opened)]="opened"
      [mode]="mode()"
      [landmark]="landmark()"
      [ariaLabel]="ariaLabel()"
      [ariaLabelledBy]="ariaLabelledBy()"
    >
      <div ogeDrawerPanel>
        <button type="button" id="first">First</button>
        <button type="button" id="last">Last</button>
      </div>
      <main>content</main>
    </oge-drawer>
  `,
})
class A11yHost {
  readonly drawer = viewChild.required(OgeDrawer);
  readonly opened = signal(false);
  readonly mode = signal<OgeDrawerMode>('overlay');
  readonly landmark = signal<OgeDrawerLandmark>('navigation');
  readonly ariaLabel = signal<string | undefined>(undefined);
  readonly ariaLabelledBy = signal<string | undefined>(undefined);
}

async function render(setup?: (host: A11yHost) => void) {
  const fixture = TestBed.createComponent(A11yHost);
  setup?.(fixture.componentInstance);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    panel: () => el.querySelector('.oge-drawer-panel') as HTMLElement,
  };
}

describe('OgeDrawer — modality is derived from mode', () => {
  it('a modal mode is a dialog with aria-modal', async () => {
    for (const mode of ['overlay', 'push'] as const) {
      const { fixture, panel } = await render((h) => {
        h.mode.set(mode);
        h.opened.set(true);
      });
      expect(panel().getAttribute('role')).toBe('dialog');
      expect(panel().getAttribute('aria-modal')).toBe('true');
      fixture.destroy();
    }
  });

  it("a persistent 'side' drawer is a landmark with no aria-modal", async () => {
    const { panel } = await render((h) => {
      h.mode.set('side');
      h.opened.set(true);
    });
    // The reference libraries get exactly this wrong: PrimeNG emits
    // role="complementary" AND aria-modal together, Material emits neither.
    expect(panel().getAttribute('role')).toBe('navigation');
    expect(panel().getAttribute('aria-modal')).toBeNull();
  });

  it('renders every landmark value it advertises', async () => {
    for (const landmark of ['navigation', 'complementary', 'region'] as const) {
      const { fixture, panel } = await render((h) => {
        h.mode.set('side');
        h.landmark.set(landmark);
        h.opened.set(true);
      });
      expect(panel().getAttribute('role')).toBe(landmark);
      fixture.destroy();
    }
  });

  it('names the panel from messages, ariaLabel, then ariaLabelledBy', async () => {
    const { fixture, host, panel } = await render((h) => h.opened.set(true));
    expect(panel().getAttribute('aria-label')).toBe('Drawer');

    host.ariaLabel.set('Main menu');
    await settle(fixture);
    expect(panel().getAttribute('aria-label')).toBe('Main menu');

    // aria-labelledby wins and clears aria-label, so there is only one name
    host.ariaLabelledBy.set('heading-1');
    await settle(fixture);
    expect(panel().getAttribute('aria-labelledby')).toBe('heading-1');
    expect(panel().getAttribute('aria-label')).toBeNull();
  });

  it('exposes a stable id so a trigger aria-controls always resolves', async () => {
    const { host, panel } = await render();
    // closed, but still in the DOM — this is why aria-controls stays valid
    expect(panel().id).toBe(host.drawer().drawerId);
    expect(panel().id).toMatch(/^oge-drawer-\d+$/);
  });

  it('marks a closed panel inert and aria-hidden', async () => {
    const { fixture, host, panel } = await render();
    expect(panel().hasAttribute('inert')).toBe(true);
    expect(panel().getAttribute('aria-hidden')).toBe('true');

    host.opened.set(true);
    await settle(fixture);
    expect(panel().hasAttribute('inert')).toBe(false);
    expect(panel().getAttribute('aria-hidden')).toBeNull();
  });

  it('keeps a side rail reachable while closed', async () => {
    const fixture = TestBed.createComponent(RailHost);
    await settle(fixture);
    const panel = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-drawer-panel',
    ) as HTMLElement;
    // a rail is visible and clickable, so it must not be inert
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(panel.getAttribute('aria-hidden')).toBeNull();
  });

  it('overrides every message through provideOgeDrawerConfig', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideOgeDrawerConfig({ messages: { drawer: 'Gezinme' } })],
    });
    const fixture = TestBed.createComponent(A11yHost);
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    const panel = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-drawer-panel',
    ) as HTMLElement;
    expect(panel.getAttribute('aria-label')).toBe('Gezinme');
  });
});

@Component({
  imports: [OgeDrawer],
  template: `
    <oge-drawer mode="side" [minSize]="56">
      <div ogeDrawerPanel><button type="button">Home</button></div>
      <main>content</main>
    </oge-drawer>
  `,
})
class RailHost {}
