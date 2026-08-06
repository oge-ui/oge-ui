import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeButton } from './button';
import type {
  OgeAutoRepeatOptions,
  OgeButtonClickEvent,
  OgeClickGuardOptions,
  OgeHoldToConfirmOptions,
} from './button-types';

@Component({
  imports: [OgeButton],
  template: `
    <oge-button
      text="Hold"
      [disabled]="disabled()"
      [holdToConfirm]="holdToConfirm()"
      [autoRepeat]="autoRepeat()"
      [clickGuard]="clickGuard()"
      (clicked)="clicks.push($event)"
    />
  `,
})
class HoldHost {
  readonly disabled = signal(false);
  readonly holdToConfirm = signal<boolean | OgeHoldToConfirmOptions>(false);
  readonly autoRepeat = signal<boolean | OgeAutoRepeatOptions>(false);
  readonly clickGuard = signal<boolean | OgeClickGuardOptions>(false);
  readonly clicks: OgeButtonClickEvent[] = [];
}

/** jsdom has no PointerEvent; pointer listeners fire for any event of the right type. */
function pointer(
  el: HTMLElement,
  type: 'pointerdown' | 'pointerup' | 'pointercancel',
): void {
  el.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }),
  );
}

function key(
  el: HTMLElement,
  type: 'keydown' | 'keyup',
  key: string,
  repeat = false,
): void {
  el.dispatchEvent(
    new KeyboardEvent(type, { bubbles: true, cancelable: true, key, repeat }),
  );
}

describe('OgeButton holdToConfirm & autoRepeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function render(setup: (host: HoldHost) => void): {
    fixture: ComponentFixture<HoldHost>;
    host: HoldHost;
    button: HTMLElement;
    native: HTMLButtonElement;
  } {
    const fixture = TestBed.createComponent(HoldHost);
    setup(fixture.componentInstance);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      button: el.querySelector('.oge-button') as HTMLElement,
      native: el.querySelector('.oge-button-native') as HTMLButtonElement,
    };
  }

  it('quick press-and-release fires nothing; a full hold fires once on release', () => {
    const { fixture, host, native } = render((h) =>
      h.holdToConfirm.set({ ms: 800 }),
    );

    pointer(native, 'pointerdown');
    vi.advanceTimersByTime(300);
    pointer(native, 'pointerup');
    native.click(); // the trailing native click browsers send after pointerup
    expect(host.clicks.length).toBe(0);

    pointer(native, 'pointerdown');
    vi.advanceTimersByTime(850);
    pointer(native, 'pointerup');
    native.click();
    fixture.detectChanges();
    expect(host.clicks.length).toBe(1);
  });

  it('shows the holding class only while pressed', () => {
    const { fixture, button, native } = render((h) =>
      h.holdToConfirm.set(true),
    );
    expect(button.classList.contains('oge-button-holding')).toBe(false);
    pointer(native, 'pointerdown');
    fixture.detectChanges();
    expect(button.classList.contains('oge-button-holding')).toBe(true);
    pointer(native, 'pointerup');
    fixture.detectChanges();
    expect(button.classList.contains('oge-button-holding')).toBe(false);
  });

  it('renders the hold bar and appends the hold message to the title', () => {
    const { button, native } = render((h) => h.holdToConfirm.set(true));
    expect(button.querySelector('.oge-button-hold-bar')).toBeTruthy();
    expect(native.getAttribute('title')).toBe('Hold to confirm');
  });

  it('Escape cancels a hold even after the duration elapsed', () => {
    const { host, native } = render((h) => h.holdToConfirm.set({ ms: 500 }));
    pointer(native, 'pointerdown');
    vi.advanceTimersByTime(600);
    key(native, 'keydown', 'Escape');
    pointer(native, 'pointerup');
    expect(host.clicks.length).toBe(0);
  });

  it('pointercancel aborts the hold', () => {
    const { host, native } = render((h) => h.holdToConfirm.set({ ms: 500 }));
    pointer(native, 'pointerdown');
    vi.advanceTimersByTime(600);
    pointer(native, 'pointercancel');
    pointer(native, 'pointerup');
    expect(host.clicks.length).toBe(0);
  });

  it('keyboard hold: Space held for the duration fires on keyup; key repeats are ignored', () => {
    const { host, native } = render((h) => h.holdToConfirm.set({ ms: 400 }));
    key(native, 'keydown', ' ');
    key(native, 'keydown', ' ', true); // auto-repeat from the OS
    vi.advanceTimersByTime(450);
    key(native, 'keyup', ' ');
    expect(host.clicks.length).toBe(1);

    key(native, 'keydown', ' ');
    vi.advanceTimersByTime(100);
    key(native, 'keyup', ' ');
    expect(host.clicks.length).toBe(1);
  });

  it('autoRepeat fires immediately, then repeats after delay at the configured interval', () => {
    const { host, native } = render((h) =>
      h.autoRepeat.set({ delayMs: 300, intervalMs: 100 }),
    );
    pointer(native, 'pointerdown');
    expect(host.clicks.length).toBe(1);

    vi.advanceTimersByTime(300); // delay elapses, interval armed
    expect(host.clicks.length).toBe(1);
    vi.advanceTimersByTime(250); // ticks at 400ms and 500ms
    expect(host.clicks.length).toBe(3);

    pointer(native, 'pointerup');
    native.click();
    vi.advanceTimersByTime(1000);
    expect(host.clicks.length).toBe(3);
  });

  it('autoRepeat stops when the button becomes disabled mid-press', () => {
    const { fixture, host, native } = render((h) =>
      h.autoRepeat.set({ delayMs: 100, intervalMs: 100 }),
    );
    pointer(native, 'pointerdown');
    vi.advanceTimersByTime(250); // fires at 0, 200
    expect(host.clicks.length).toBe(2);

    host.disabled.set(true);
    fixture.detectChanges(); // effect cancels the press
    vi.advanceTimersByTime(1000);
    expect(host.clicks.length).toBe(2);
  });

  it('holdToConfirm wins over autoRepeat and logs a dev-mode error', () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { fixture, host, native } = render((h) => {
      h.holdToConfirm.set({ ms: 300 });
      h.autoRepeat.set(true);
    });
    fixture.detectChanges();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('mutually exclusive'),
    );

    pointer(native, 'pointerdown');
    expect(host.clicks.length).toBe(0); // autoRepeat would have fired immediately
    vi.advanceTimersByTime(350);
    pointer(native, 'pointerup');
    expect(host.clicks.length).toBe(1);
  });

  it('hold completions pass through the click guard', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    const { host, native } = render((h) => {
      h.holdToConfirm.set({ ms: 200 });
      h.clickGuard.set({ mode: 'throttle', ms: 500 });
    });

    pointer(native, 'pointerdown');
    vi.advanceTimersByTime(250);
    pointer(native, 'pointerup');
    expect(host.clicks.length).toBe(1);

    // a second hold inside the throttle window is dropped
    pointer(native, 'pointerdown');
    vi.advanceTimersByTime(250);
    pointer(native, 'pointerup');
    expect(host.clicks.length).toBe(1);
  });
});
