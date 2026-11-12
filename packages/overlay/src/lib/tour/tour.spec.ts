import { Component, signal, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import {
  resetScrollLockForTests,
  type OgeTourClosedEvent,
  type OgeTourStep,
} from '@oge-ui/behavior';
import { provideOgeOverlayConfig } from '../config';
import { OgeTour } from './tour';

@Component({
  imports: [OgeTour],
  providers: [provideOgeOverlayConfig({ messages: { tourSkip: 'Atla' } })],
  template: `
    <button id="trigger" type="button" (click)="tour.start()">Tour</button>
    <div id="search" style="width: 120px; height: 30px">Search</div>
    <oge-tour
      #tour
      [steps]="steps"
      [(opened)]="opened"
      [(step)]="step"
      [closeOnBackdropClick]="backdrop()"
      (closed)="closed.push($event)"
    />
  `,
})
class Host {
  readonly steps: OgeTourStep[] = [
    { target: '#search', title: 'Search', content: 'Find anything here.' },
    { title: 'No target', placement: 'top' },
    { target: '#missing', title: 'Last' },
  ];
  readonly opened = signal(false);
  readonly step = signal(0);
  readonly backdrop = signal(false);
  readonly tour = viewChild.required(OgeTour);
  readonly closed: OgeTourClosedEvent[] = [];
}

async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
}

const card = () =>
  document.body.querySelector('.oge-tour-card') as HTMLElement | null;
const button = (cls: string) =>
  document.body.querySelector(`.oge-tour-${cls}`) as HTMLButtonElement | null;
const key = (el: Element, k: string) =>
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
  );

describe('OgeTour', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  beforeEach(async () => {
    resetScrollLockForTests();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    const search = document.getElementById('search')!;
    search.getBoundingClientRect = () =>
      ({ top: 100, left: 50, width: 120, height: 30 }) as DOMRect;
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('walks the steps with a spotlight, a labelled modal card and focus restore', async () => {
    expect(card()).toBeNull();
    const trigger = document.getElementById('trigger') as HTMLButtonElement;
    trigger.focus();
    trigger.click();
    await settle(fixture);
    await settle(fixture);
    const dialog = card()!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-roledescription')).toBe('Tour');
    expect(
      document.getElementById(dialog.getAttribute('aria-labelledby')!)!
        .textContent,
    ).toBe('Search');
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby')!)!
        .textContent,
    ).toBe('Find anything here.');
    expect(dialog.querySelector('.oge-tour-progress')!.textContent).toBe(
      'Step 1 of 3',
    );
    expect(document.activeElement).toBe(button('next'));
    expect(button('previous')).toBeNull();
    expect(button('skip')!.textContent!.trim()).toBe('Atla');
    const spot = document.body.querySelector(
      '.oge-tour-spotlight',
    ) as HTMLElement;
    expect(spot.style.top).toBe('94px');
    expect(spot.style.width).toBe('132px');
    expect(dialog.dataset['placement']).toBe('bottom');
    expect(document.querySelector('[role="status"]')!.textContent).toBe(
      'Step 1 of 3: Search',
    );

    button('next')!.click();
    await settle(fixture);
    await settle(fixture);
    expect(host.step()).toBe(1);
    // no target: centered, page dimmed by the layer
    expect(document.body.querySelector('.oge-tour-spotlight')).toBeNull();
    expect(document.body.querySelector('.oge-tour-no-target')).not.toBeNull();
    expect(card()!.dataset['placement']).toBe('center');
    expect(card()!.hasAttribute('aria-describedby')).toBe(false);
    button('previous')!.click();
    await settle(fixture);
    expect(host.step()).toBe(0);
    // Back is gone on the first step: focus moved to Next
    expect(document.activeElement).toBe(button('next'));

    key(card()!, 'ArrowRight');
    key(card()!, 'ArrowRight');
    await settle(fixture);
    expect(host.step()).toBe(2);
    // the last step: Done, no Skip; → does not finish
    expect(button('next')!.textContent!.trim()).toBe('Done');
    expect(button('skip')).toBeNull();
    key(card()!, 'ArrowRight');
    key(card()!, 'Enter');
    await settle(fixture);
    expect(host.opened()).toBe(true);
    key(card()!, 'ArrowLeft');
    await settle(fixture);
    expect(host.step()).toBe(1);
    host.step.set(2);
    await settle(fixture);
    button('next')!.click();
    await settle(fixture);
    expect(card()).toBeNull();
    expect(host.closed).toEqual([{ reason: 'done', step: 2 }]);
    expect(document.activeElement).toBe(trigger);
  });

  it('skips, dismisses with Escape, and closes on the backdrop only when asked', async () => {
    host.tour().start(1);
    await settle(fixture);
    expect(host.step()).toBe(1);
    button('skip')!.click();
    await settle(fixture);
    expect(host.closed.at(-1)).toEqual({ reason: 'skip', step: 1 });

    host.tour().start();
    await settle(fixture);
    key(card()!, 'Escape');
    await settle(fixture);
    expect(host.closed.at(-1)).toEqual({ reason: 'escape', step: 0 });

    host.tour().start();
    await settle(fixture);
    const layer = document.body.querySelector('.oge-tour-layer')!;
    layer.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(host.opened()).toBe(true);
    host.backdrop.set(true);
    await settle(fixture);
    layer.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(host.closed.at(-1)).toEqual({ reason: 'backdrop', step: 0 });

    host.tour().start(9); // clamped
    await settle(fixture);
    expect(host.step()).toBe(2);
    window.dispatchEvent(new Event('resize'));
    host.tour().previous();
    await settle(fixture);
    expect(host.step()).toBe(1);
    host.tour().close();
    await settle(fixture);
    expect(host.closed.at(-1)).toEqual({ reason: 'api', step: 1 });
    host.tour().close(); // closed: no-op
    host.tour().previous();
    expect(host.closed).toHaveLength(4);
  });
});
