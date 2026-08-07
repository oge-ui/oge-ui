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

describe('OgeToastService duplicate coalescing', () => {
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

  it('identical toasts merge into one with a ×N badge and shared ref', () => {
    const service = TestBed.inject(OgeToastService);
    const first = service.show({ message: 'Ping', coalesce: true });
    const second = service.show({ message: 'Ping', coalesce: true });
    advance(0);

    expect(first).toBe(second);
    expect(document.querySelectorAll('.oge-toast')).toHaveLength(1);
    expect(document.querySelector('.oge-toast-count')?.textContent).toBe('×2');
  });

  it('coalescing restarts the auto-dismiss timer', () => {
    const service = TestBed.inject(OgeToastService);
    service.show({ message: 'Ping', coalesce: true, displayTime: 1000 });
    advance(800);
    service.show({ message: 'Ping', coalesce: true, displayTime: 1000 });
    advance(0);
    advance(900); // 800+900 > 1000, but the restart keeps it alive
    expect(document.querySelector('.oge-toast')).not.toBeNull();
    advance(100 + 200);
    expect(document.querySelector('.oge-toast')).toBeNull();
  });

  it('different severity/title/message do not merge; id overrides the key', () => {
    const service = TestBed.inject(OgeToastService);
    service.show({ message: 'Ping', coalesce: true, sticky: true });
    service.show({
      message: 'Ping',
      severity: 'error',
      coalesce: true,
      sticky: true,
    });
    service.show({
      message: 'Other A',
      id: 'same',
      coalesce: true,
      sticky: true,
    });
    service.show({
      message: 'Other B',
      id: 'same',
      coalesce: true,
      sticky: true,
    });
    advance(0);
    expect(document.querySelectorAll('.oge-toast')).toHaveLength(3);
  });

  it('a closing toast is not a coalesce target', () => {
    const service = TestBed.inject(OgeToastService);
    const first = service.show({
      message: 'Ping',
      coalesce: true,
      sticky: true,
    });
    advance(0);
    first.close(); // enters the closing phase
    const second = service.show({
      message: 'Ping',
      coalesce: true,
      sticky: true,
    });
    advance(300);
    expect(first).not.toBe(second);
    expect(document.querySelectorAll('.oge-toast')).toHaveLength(1);
  });
});
