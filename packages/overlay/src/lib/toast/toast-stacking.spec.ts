import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideOgeOverlayConfig } from '../config';
import { OgeToastService } from './toast-service';
import type { OgeToastPosition } from './toast-types';

function tick(): void {
  TestBed.inject(ApplicationRef).tick();
}

function advance(ms: number): void {
  vi.advanceTimersByTime(ms);
  tick();
}

const POSITIONS: OgeToastPosition[] = [
  'top-start',
  'top-center',
  'top-end',
  'bottom-start',
  'bottom-center',
  'bottom-end',
];

describe('OgeToastService stacking & positions', () => {
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

  it('renders one region per used position with the right class', () => {
    const service = TestBed.inject(OgeToastService);
    for (const position of POSITIONS) {
      service.show({ message: position, position, sticky: true });
    }
    advance(0);

    const regions = document.querySelectorAll('.oge-toast-region');
    expect(regions).toHaveLength(6);
    for (const position of POSITIONS) {
      expect(
        document.querySelector(`.oge-toast-region-${position} .oge-toast`),
      ).not.toBeNull();
    }
  });

  it('caps visible toasts at toastMaxVisible and promotes FIFO', () => {
    TestBed.configureTestingModule({
      providers: [provideOgeOverlayConfig({ toastMaxVisible: 2 })],
    });
    const service = TestBed.inject(OgeToastService);
    service.show({ message: 'one', sticky: true });
    service.show({ message: 'two', sticky: true });
    const third = service.show({ message: 'three', sticky: true });
    advance(0);

    let messages = Array.from(
      document.querySelectorAll('.oge-toast-message'),
    ).map((el) => el.textContent?.trim());
    expect(messages).toEqual(['one', 'two']); // third is queued, not rendered
    void third;

    // closing the first promotes the queued third
    document.querySelector<HTMLButtonElement>('.oge-toast-close')?.click();
    advance(300);
    messages = Array.from(document.querySelectorAll('.oge-toast-message')).map(
      (el) => el.textContent?.trim(),
    );
    expect(messages).toEqual(['two', 'three']);
  });

  it('positions queue independently', () => {
    TestBed.configureTestingModule({
      providers: [provideOgeOverlayConfig({ toastMaxVisible: 1 })],
    });
    const service = TestBed.inject(OgeToastService);
    service.show({ message: 'a1', position: 'top-start', sticky: true });
    service.show({ message: 'a2', position: 'top-start', sticky: true });
    service.show({ message: 'b1', position: 'bottom-end', sticky: true });
    advance(0);

    expect(
      document.querySelectorAll('.oge-toast-region-top-start .oge-toast'),
    ).toHaveLength(1);
    expect(
      document.querySelectorAll('.oge-toast-region-bottom-end .oge-toast'),
    ).toHaveLength(1);
  });

  it('dismissal is two-phase: closing class, then removal', () => {
    const service = TestBed.inject(OgeToastService);
    const ref = service.show({ message: 'exit', sticky: true });
    advance(0);
    ref.close();
    tick();

    const cell = document.querySelector('.oge-toast-cell');
    expect(cell?.classList.contains('oge-toast-cell-closing')).toBe(true);
    advance(200);
    expect(document.querySelector('.oge-toast-cell')).toBeNull();
  });

  it('clear(position) only clears that region', () => {
    const service = TestBed.inject(OgeToastService);
    service.show({ message: 'keep', position: 'top-end', sticky: true });
    service.show({ message: 'drop', position: 'bottom-end', sticky: true });
    advance(0);
    service.clear('bottom-end');
    advance(300);

    expect(document.querySelectorAll('.oge-toast')).toHaveLength(1);
    expect(document.querySelector('.oge-toast-message')?.textContent).toContain(
      'keep',
    );
  });
});
