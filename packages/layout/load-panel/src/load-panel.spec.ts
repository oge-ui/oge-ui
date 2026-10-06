import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  OGE_LIVE_ANNOUNCER_ATTR,
  OGE_LOAD_PANEL_TARGET_CLASS,
  getOgeLiveAnnouncer,
} from '@oge-ui/behavior';
import { provideOgeLoadIndicatorConfig } from '../../load-indicator/src/config';
import { OgeLoadPanel } from './load-panel';

@Component({
  imports: [OgeLoadPanel],
  template: `
    <section class="target" aria-busy="false">
      <button type="button" class="inside" (click)="clicks = clicks + 1">
        Act
      </button>
      <oge-load-panel
        [visible]="visible()"
        [showDelay]="showDelay()"
        [minDisplayTime]="minDisplayTime()"
        [message]="message()"
        [showIndicator]="showIndicator()"
        [target]="target()"
        [fullScreen]="fullScreen()"
        (shown)="log.push('shown')"
        (hidden)="log.push('hidden')"
      />
    </section>
    <div class="elsewhere"></div>
  `,
})
class LoadPanelHost {
  readonly visible = signal(false);
  readonly showDelay = signal(0);
  readonly minDisplayTime = signal(0);
  readonly message = signal<string | undefined>(undefined);
  readonly showIndicator = signal(true);
  readonly target = signal<Element | string | undefined>(undefined);
  readonly fullScreen = signal(false);
  readonly panel = viewChild.required(OgeLoadPanel);
  readonly log: string[] = [];
  clicks = 0;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const polite = () =>
  document.querySelector(`[${OGE_LIVE_ANNOUNCER_ATTR}="polite"]`);

describe('OgeLoadPanel', () => {
  let fixture: ComponentFixture<LoadPanelHost>;
  let host: LoadPanelHost;
  let el: HTMLElement;

  const target = () => el.querySelector('.target') as HTMLElement;
  const panelEl = () => document.querySelector('oge-load-panel') as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(LoadPanelHost);
    host = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    el.remove();
    getOgeLiveAnnouncer().clear();
  });

  it('renders nothing until visible', () => {
    expect(panelEl().classList).not.toContain('oge-load-panel-shown');
    expect(panelEl().querySelector('.oge-load-panel-pane')).toBeNull();
    expect(target().getAttribute('aria-busy')).toBe('false');
  });

  it('marks its parent busy while shown and restores it after', async () => {
    host.visible.set(true);
    await settle(fixture);
    expect(panelEl().classList).toContain('oge-load-panel-shown');
    expect(target().getAttribute('aria-busy')).toBe('true');
    expect(target().classList).toContain(OGE_LOAD_PANEL_TARGET_CLASS);
    expect(host.log).toEqual(['shown']);

    host.visible.set(false);
    await settle(fixture);
    expect(target().getAttribute('aria-busy')).toBe('false');
    expect(target().classList).not.toContain(OGE_LOAD_PANEL_TARGET_CLASS);
    expect(host.log).toEqual(['shown', 'hidden']);
  });

  it('shows the default message and names the indicator with it', async () => {
    host.visible.set(true);
    await settle(fixture);
    const message = panelEl().querySelector('.oge-load-panel-message');
    expect(message?.textContent?.trim()).toBe('Loading…');
    expect(message?.getAttribute('aria-hidden')).toBe('true');
    expect(
      panelEl().querySelector('oge-load-indicator')?.getAttribute('aria-label'),
    ).toBe('Loading…');
  });

  it('announces the message through the shared live region', async () => {
    host.message.set('Fetching orders');
    host.visible.set(true);
    await settle(fixture);
    await wait(150);
    expect(polite()?.textContent).toBe('Fetching orders');
    // never a component-local live region or status role
    expect(panelEl().querySelector('[aria-live], [role="status"]')).toBeNull();
  });

  it('without the indicator the message is the readable text', async () => {
    host.showIndicator.set(false);
    host.visible.set(true);
    await settle(fixture);
    expect(panelEl().querySelector('oge-load-indicator')).toBeNull();
    expect(
      panelEl()
        .querySelector('.oge-load-panel-message')
        ?.hasAttribute('aria-hidden'),
    ).toBe(false);
  });

  it('blocks pointer input from reaching the covered container', async () => {
    let containerClicks = 0;
    target().addEventListener('click', () => containerClicks++);
    host.visible.set(true);
    await settle(fixture);
    panelEl().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(containerClicks).toBe(0);
    const down = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    panelEl().dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });

  it('honours showDelay and minDisplayTime', async () => {
    vi.useFakeTimers();
    try {
      host.showDelay.set(200);
      host.minDisplayTime.set(300);
      host.visible.set(true);
      fixture.detectChanges();
      vi.advanceTimersByTime(100);
      fixture.detectChanges();
      expect(host.log).toEqual([]);
      vi.advanceTimersByTime(100);
      fixture.detectChanges();
      expect(host.log).toEqual(['shown']);
      host.visible.set(false);
      fixture.detectChanges();
      vi.advanceTimersByTime(200);
      expect(host.log).toEqual(['shown']);
      vi.advanceTimersByTime(100);
      fixture.detectChanges();
      expect(host.log).toEqual(['shown', 'hidden']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('moves into an explicit target and marks that one', async () => {
    const elsewhere = el.querySelector('.elsewhere') as HTMLElement;
    host.target.set(elsewhere);
    host.visible.set(true);
    await settle(fixture);
    expect(panelEl().parentElement).toBe(elsewhere);
    expect(elsewhere.getAttribute('aria-busy')).toBe('true');
    expect(target().getAttribute('aria-busy')).toBe('false');
  });

  it('full screen without a target marks nothing busy', async () => {
    host.fullScreen.set(true);
    host.visible.set(true);
    await settle(fixture);
    expect(panelEl().classList).toContain('oge-load-panel-full-screen');
    expect(target().getAttribute('aria-busy')).toBe('false');
  });

  it('destroying while shown releases the target', async () => {
    host.visible.set(true);
    await settle(fixture);
    fixture.destroy();
    expect(target().getAttribute('aria-busy')).toBe('false');
  });
});

describe('OgeLoadPanel messages', () => {
  it('reads loadPanelMessage from the load-indicator config', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeLoadIndicatorConfig({
          messages: { loadPanelMessage: 'Yükleniyor…' },
        }),
      ],
    });
    const fixture = TestBed.createComponent(LoadPanelHost);
    fixture.componentInstance.visible.set(true);
    await settle(fixture);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.oge-load-panel-message')
        ?.textContent?.trim(),
    ).toBe('Yükleniyor…');
    fixture.destroy();
  });
});
