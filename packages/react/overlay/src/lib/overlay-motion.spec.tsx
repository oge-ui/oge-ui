import { act, fireEvent, render } from '@testing-library/react';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import { OgeActionSheet } from './action-sheet';
import { OgeOverlayConfigProvider } from './overlay-config';
import { OgeToastProvider, useOgeToasts, type OgeToastsHandle } from './toast';
import { OgeWindow } from './window';

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

const frames = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 30)));

describe('overlay exit ghosts', () => {
  let motion: ReturnType<typeof stubMotion>;
  beforeEach(() => (motion = stubMotion()));
  afterEach(() => {
    motion.restore();
    resetScrollLockForTests();
    document.querySelectorAll('.oge-exit-ghost').forEach((el) => el.remove());
  });

  it('a controlled window close fades out through a ghost in its parent', async () => {
    const { container, rerender } = render(
      <div className="window-host">
        <OgeWindow title="Notes" opened>
          notes
        </OgeWindow>
      </div>,
    );
    await frames();
    const host = container.querySelector('.window-host')!;
    expect(host.querySelector('.oge-window-placed')).not.toBeNull();
    rerender(
      <div className="window-host">
        <OgeWindow title="Notes" opened={false}>
          notes
        </OgeWindow>
      </div>,
    );
    await frames();
    const ghost = host.querySelector(':scope > .oge-exit-ghost');
    expect(ghost).not.toBeNull();
    expect(
      host.querySelectorAll('.oge-window:not(.oge-exit-ghost)'),
    ).toHaveLength(0);
    expect(motion.calls.find((call) => call.el === ghost)?.keyframes).toEqual([
      { opacity: 1 },
      { opacity: 0 },
    ]);
  });

  it('a closing action sheet fades its backdrop and slides the sheet down', async () => {
    const items = [{ key: 'share', text: 'Share' }];
    const { rerender } = render(
      <OgeActionSheet title="Photo" items={items} opened />,
    );
    await frames();
    expect(
      document.querySelector('.oge-action-sheet-layer.oge-action-sheet-ready'),
    ).not.toBeNull();
    rerender(<OgeActionSheet title="Photo" items={items} opened={false} />);
    await frames();
    const ghost = document.body.querySelector(
      ':scope > .oge-action-sheet-layer.oge-exit-ghost',
    );
    expect(ghost).not.toBeNull();
    const slide = motion.calls.find(
      (call) => call.el === ghost?.querySelector('.oge-action-sheet'),
    );
    expect(slide?.keyframes).toEqual([{ translate: '0 100%' }]);
  });
});

function Grab({ onHandle }: { onHandle: (h: OgeToastsHandle) => void }) {
  onHandle(useOgeToasts());
  return null;
}

describe('toast stack mode', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  const mount = () => {
    let toasts!: OgeToastsHandle;
    render(
      <OgeOverlayConfigProvider config={{ toastStacked: true }}>
        <OgeToastProvider>
          <Grab onHandle={(h) => (toasts = h)} />
        </OgeToastProvider>
      </OgeOverlayConfigProvider>,
    );
    return toasts;
  };

  it('renders a stacked region and numbers the cells from the newest', () => {
    const toasts = mount();
    act(() => {
      toasts.show({ message: 'one', sticky: true });
      toasts.show({ message: 'two', sticky: true });
    });
    const region = document.querySelector('.oge-toast-region') as HTMLElement;
    expect(region).toHaveClass('oge-toast-region-stacked');
    expect(region).not.toHaveClass('oge-toast-region-expanded');
    const depths = Array.from(
      region.querySelectorAll<HTMLElement>('.oge-toast-cell'),
      (cell) => cell.style.getPropertyValue('--oge-toast-depth'),
    );
    expect(depths).toEqual(['1', '0']);
  });

  it('hover expands the deck and pauses its timers', () => {
    const toasts = mount();
    act(() => {
      toasts.show({ message: 'one', displayTime: 1000 });
    });
    const region = document.querySelector('.oge-toast-region') as HTMLElement;
    fireEvent.pointerOver(region.querySelector('.oge-toast')!);
    expect(region).toHaveClass('oge-toast-region-expanded');
    advance(5000);
    expect(region.querySelector('.oge-toast-cell-closing')).toBeNull();
    fireEvent.pointerOut(region.querySelector('.oge-toast')!);
    expect(region).not.toHaveClass('oge-toast-region-expanded');
    advance(1000);
    expect(region.querySelector('.oge-toast-cell-closing')).not.toBeNull();
  });

  it('a sideways swipe dismisses with reason swipe', async () => {
    const toasts = mount();
    let ref!: ReturnType<OgeToastsHandle['show']>;
    act(() => {
      ref = toasts.show({ message: 'one', sticky: true });
    });
    const toast = document.querySelector('.oge-toast') as HTMLElement;
    const pointer = (type: string, x: number, target: EventTarget) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        button: 0,
      });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      act(() => {
        target.dispatchEvent(event);
      });
    };
    pointer('pointerdown', 0, toast);
    pointer('pointermove', 30, document);
    pointer('pointermove', 90, document);
    pointer('pointerup', 90, document);
    advance(300);
    await expect(ref.closed).resolves.toEqual({ reason: 'swipe' });
  });
});
