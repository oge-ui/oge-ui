import { ApplicationRef, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import { OgeActionSheet } from './action-sheet/action-sheet';
import { provideOgeOverlayConfig } from './config';
import { OgeToastService } from './toast/toast-service';
import { OgeWindow } from './window/window';

interface AnimateCall {
  el: Element;
  keyframes: Keyframe[];
}

/**
 * Motion on: a Web Animations stub, and a visible box for every element
 * (jsdom lays nothing out, and a zero box gets no ghost).
 */
function stubMotion(): { calls: AnimateCall[]; restore(): void } {
  const proto = HTMLElement.prototype as unknown as {
    animate?: unknown;
    getBoundingClientRect: () => DOMRect;
  };
  const animate = proto.animate;
  const rect = proto.getBoundingClientRect;
  const calls: AnimateCall[] = [];
  proto.animate = function (this: Element, keyframes: Keyframe[]) {
    calls.push({ el: this, keyframes });
    return { finished: new Promise(() => undefined), cancel: () => undefined };
  };
  proto.getBoundingClientRect = () =>
    ({
      left: 20,
      top: 30,
      width: 300,
      height: 200,
      right: 320,
      bottom: 230,
      x: 20,
      y: 30,
    }) as DOMRect;
  return {
    calls,
    restore() {
      if (animate === undefined) delete proto.animate;
      else proto.animate = animate;
      proto.getBoundingClientRect = rect;
    },
  };
}

const frame = () => new Promise((resolve) => setTimeout(resolve, 20));

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await frame();
  fixture.detectChanges();
  await fixture.whenStable();
}

@Component({
  imports: [OgeWindow, OgeActionSheet],
  template: `
    <div class="window-host">
      <oge-window title="Notes" [(opened)]="windowOpen">notes</oge-window>
    </div>
    <oge-action-sheet
      title="Photo"
      [items]="[{ key: 'share', text: 'Share' }]"
      [(opened)]="sheetOpen"
    />
  `,
})
class Host {
  readonly windowOpen = signal(false);
  readonly sheetOpen = signal(false);
}

describe('overlay exit ghosts', () => {
  let fixture: ComponentFixture<Host>;
  let motion: ReturnType<typeof stubMotion>;

  beforeEach(async () => {
    motion = stubMotion();
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
  });
  afterEach(() => {
    motion.restore();
    fixture.destroy();
    resetScrollLockForTests();
    document.querySelectorAll('.oge-exit-ghost').forEach((el) => el.remove());
  });

  it('a closing window fades out through a ghost in its host; the panel goes at once', async () => {
    fixture.componentInstance.windowOpen.set(true);
    await settle(fixture);
    const host = fixture.nativeElement.querySelector('oge-window');
    expect(host.querySelector('.oge-window-placed')).not.toBeNull();
    fixture.componentInstance.windowOpen.set(false);
    await settle(fixture);
    const ghost = host.querySelector(
      ':scope > .oge-exit-ghost',
    ) as HTMLElement | null;
    expect(ghost).not.toBeNull();
    expect(ghost?.getAttribute('aria-hidden')).toBe('true');
    expect(
      host.querySelectorAll('.oge-window:not(.oge-exit-ghost)'),
    ).toHaveLength(0);
    const fade = motion.calls.find((call) => call.el === ghost);
    expect(fade?.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
  });

  it('a closing action sheet fades its backdrop and slides the sheet down', async () => {
    fixture.componentInstance.sheetOpen.set(true);
    await settle(fixture);
    expect(
      document.querySelector('.oge-action-sheet-layer.oge-action-sheet-ready'),
    ).not.toBeNull();
    fixture.componentInstance.sheetOpen.set(false);
    await settle(fixture);
    const ghost = document.body.querySelector(
      ':scope > .oge-action-sheet-layer.oge-exit-ghost',
    );
    expect(ghost).not.toBeNull();
    expect(
      document.querySelectorAll('.oge-action-sheet-layer:not(.oge-exit-ghost)'),
    ).toHaveLength(0);
    const slide = motion.calls.find(
      (call) => call.el === ghost?.querySelector('.oge-action-sheet'),
    );
    expect(slide?.keyframes).toEqual([{ translate: '0 100%' }]);
  });
});

describe('OgeToastService stack mode', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideOgeOverlayConfig({ toastStacked: true })],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  const tick = () => TestBed.inject(ApplicationRef).tick();
  const advance = (ms: number) => {
    vi.advanceTimersByTime(ms);
    tick();
  };

  it('renders a stacked region and numbers the cells from the newest', () => {
    const toasts = TestBed.inject(OgeToastService);
    toasts.show({ message: 'one', sticky: true });
    toasts.show({ message: 'two', sticky: true });
    advance(0);
    const region = document.querySelector('.oge-toast-region') as HTMLElement;
    expect(region.classList.contains('oge-toast-region-stacked')).toBe(true);
    expect(region.classList.contains('oge-toast-region-expanded')).toBe(false);
    const depths = Array.from(
      region.querySelectorAll<HTMLElement>('.oge-toast-cell'),
      (cell) => cell.style.getPropertyValue('--oge-toast-depth'),
    );
    expect(depths).toEqual(['1', '0']);
  });

  it('hover and focus expand the deck and pause its timers', () => {
    const toasts = TestBed.inject(OgeToastService);
    toasts.show({ message: 'one', displayTime: 1000 });
    advance(0);
    const region = document.querySelector('.oge-toast-region') as HTMLElement;
    const toast = region.querySelector('.oge-toast') as HTMLElement;
    toast.dispatchEvent(
      new MouseEvent('pointerover', { bubbles: true, relatedTarget: null }),
    );
    tick();
    expect(region.classList.contains('oge-toast-region-expanded')).toBe(true);
    advance(5000);
    expect(region.querySelector('.oge-toast-cell-closing')).toBeNull();
    toast.dispatchEvent(
      new MouseEvent('pointerout', { bubbles: true, relatedTarget: null }),
    );
    tick();
    expect(region.classList.contains('oge-toast-region-expanded')).toBe(false);
    advance(1000);
    expect(region.querySelector('.oge-toast-cell-closing')).not.toBeNull();
  });

  it('a sideways swipe dismisses with reason swipe', async () => {
    const toasts = TestBed.inject(OgeToastService);
    const ref = toasts.show({ message: 'one', sticky: true });
    advance(0);
    const toast = document.querySelector('.oge-toast') as HTMLElement;
    const pointer = (type: string, x: number, target: EventTarget) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        button: 0,
      });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      target.dispatchEvent(event);
    };
    pointer('pointerdown', 0, toast);
    pointer('pointermove', 30, document);
    pointer('pointermove', 90, document);
    pointer('pointerup', 90, document);
    advance(300);
    await expect(ref.closed).resolves.toEqual({ reason: 'swipe' });
  });
});
