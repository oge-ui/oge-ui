import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OgeToastService } from './toast-service';

function tick(): void {
  TestBed.inject(ApplicationRef).tick();
}

function advance(ms: number): void {
  vi.advanceTimersByTime(ms);
  tick();
}

function toastEl(): HTMLElement | null {
  return document.querySelector('.oge-toast');
}

describe('OgeToastService timers', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('auto-dismisses after displayTime (reason timeout)', async () => {
    const service = TestBed.inject(OgeToastService);
    const ref = service.show({ message: 'bye', displayTime: 1000 });
    advance(0);
    expect(toastEl()).not.toBeNull();

    advance(999);
    expect(toastEl()).not.toBeNull();
    advance(1); // timer fires → closing phase
    advance(200); // exit transition
    expect(toastEl()).toBeNull();
    await expect(ref.closed).resolves.toEqual({ reason: 'timeout' });
  });

  it('sticky and loading toasts never auto-dismiss', () => {
    const service = TestBed.inject(OgeToastService);
    service.show({ message: 'stay', sticky: true });
    service.show({ message: 'busy', loading: true });
    advance(0);
    advance(60_000);
    expect(document.querySelectorAll('.oge-toast')).toHaveLength(2);
  });

  it('hover pauses and resumes with the remaining time', () => {
    const service = TestBed.inject(OgeToastService);
    service.show({ message: 'pausable', displayTime: 1000 });
    advance(0);
    const el = toastEl();
    expect(el).not.toBeNull();

    advance(600); // 400ms remaining
    el?.dispatchEvent(new MouseEvent('mouseenter'));
    advance(5000); // paused — nothing happens
    expect(toastEl()).not.toBeNull();

    el?.dispatchEvent(new MouseEvent('mouseleave'));
    advance(399);
    expect(toastEl()).not.toBeNull();
    advance(1 + 200);
    expect(toastEl()).toBeNull();
  });

  it('focus-within pauses; moving focus inside the toast does not resume', () => {
    const service = TestBed.inject(OgeToastService);
    service.show({
      message: 'focus me',
      displayTime: 1000,
      action: { text: 'Undo' },
    });
    advance(0);
    const el = toastEl();
    const buttons = el?.querySelectorAll('button') ?? [];

    el?.dispatchEvent(
      new FocusEvent('focusin', { relatedTarget: document.body }),
    );
    advance(5000);
    expect(toastEl()).not.toBeNull();

    // focus moves between the toast's own buttons — still paused
    el?.dispatchEvent(
      new FocusEvent('focusout', { relatedTarget: buttons[0] }),
    );
    el?.dispatchEvent(new FocusEvent('focusin', { relatedTarget: buttons[0] }));
    advance(5000);
    expect(toastEl()).not.toBeNull();

    // focus leaves entirely
    el?.dispatchEvent(
      new FocusEvent('focusout', { relatedTarget: document.body }),
    );
    advance(1000 + 200);
    expect(toastEl()).toBeNull();
  });

  it('pauses while the tab is hidden and resumes on return', () => {
    const service = TestBed.inject(OgeToastService);
    service.show({ message: 'tabbed', displayTime: 1000 });
    advance(0);

    Object.defineProperty(document, 'hidden', {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    advance(10_000);
    expect(toastEl()).not.toBeNull();

    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    advance(1000 + 200);
    expect(toastEl()).toBeNull();
  });

  it('overlapping pause causes are ref-counted (hover + hidden)', () => {
    const service = TestBed.inject(OgeToastService);
    service.show({ message: 'both', displayTime: 1000 });
    advance(0);
    const el = toastEl();

    el?.dispatchEvent(new MouseEvent('mouseenter'));
    Object.defineProperty(document, 'hidden', {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    // releasing only one cause must NOT resume
    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    advance(10_000);
    expect(toastEl()).not.toBeNull();

    el?.dispatchEvent(new MouseEvent('mouseleave'));
    advance(1000 + 200);
    expect(toastEl()).toBeNull();
  });
});
