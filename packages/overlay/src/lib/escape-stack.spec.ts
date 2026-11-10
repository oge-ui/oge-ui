import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  claimOverlayEscape,
  pushOverlay,
  removeOverlay,
  resetScrollLockForTests,
} from '@oge-ui/behavior';
import { OgeModal } from './modal/modal';
import { OgePopover, OgePopoverTrigger } from './popover/popover';

/**
 * 2.7 — one Escape stack shared with the application's own overlays: modal >
 * popover > an app layer registered with `pushOverlay`, each Escape closes
 * exactly one layer, top first, whatever order the listeners were added in.
 */
@Component({
  imports: [OgeModal, OgePopover, OgePopoverTrigger],
  template: `
    <oge-modal title="Edit" [(opened)]="modalOpen">
      <button type="button" class="trigger" [ogePopover]="pop">More</button>
      <oge-popover #pop title="Options" [(visible)]="popoverOpen">
        <p>Body</p>
      </oge-popover>
    </oge-modal>
  `,
})
class Host {
  readonly modalOpen = signal(false);
  readonly popoverOpen = signal(false);
}

describe('shared Escape stack', () => {
  let fixture: ComponentFixture<Host>;
  const appLayer = { name: 'app layer' };
  let appLayerOpen = false;
  // registered before any OGE surface opened: the order that broke a
  // stack gated on isTopOverlay alone
  const onAppKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !claimOverlayEscape(event, appLayer)) return;
    appLayerOpen = false;
    removeOverlay(appLayer);
  };

  function settle(): void {
    fixture.detectChanges();
    vi.advanceTimersByTime(50);
    fixture.detectChanges();
    vi.advanceTimersByTime(50);
    fixture.detectChanges();
  }

  const escape = () => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    settle();
  };

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    document.addEventListener('keydown', onAppKeydown);
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    settle();
  });

  afterEach(() => {
    document.removeEventListener('keydown', onAppKeydown);
    removeOverlay(appLayer);
    fixture.destroy();
    vi.useRealTimers();
    resetScrollLockForTests();
    document.body.style.overflow = '';
    document.body.innerHTML = '';
  });

  it('closes app layer, then popover, then modal — one per Escape', () => {
    const host = fixture.componentInstance;
    host.modalOpen.set(true);
    settle();
    (document.querySelector('.trigger') as HTMLElement).click();
    settle();
    expect(host.popoverOpen()).toBe(true);
    pushOverlay(appLayer);
    appLayerOpen = true;

    escape();
    expect(appLayerOpen).toBe(false);
    expect(host.popoverOpen()).toBe(true);
    expect(host.modalOpen()).toBe(true);

    escape();
    expect(host.popoverOpen()).toBe(false);
    expect(host.modalOpen()).toBe(true);

    escape();
    expect(host.modalOpen()).toBe(false);
  });

  it('an app layer under an OGE surface waits its turn', () => {
    const host = fixture.componentInstance;
    pushOverlay(appLayer);
    appLayerOpen = true;
    host.modalOpen.set(true);
    settle();

    escape();
    expect(host.modalOpen()).toBe(false);
    expect(appLayerOpen).toBe(true);

    escape();
    expect(appLayerOpen).toBe(false);
  });
});
