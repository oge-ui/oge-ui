import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeNumberBox } from './number-box';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function pointer(el: HTMLElement, type: 'pointerdown' | 'pointerup'): void {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
}

@Component({
  imports: [OgeNumberBox],
  template: `
    <oge-number-box
      [(value)]="value"
      label="Qty"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [showSpinButtons]="showSpin()"
      [disabled]="disabled()"
      [readonly]="ro()"
      locale="en-US"
    />
  `,
})
class SpinHost {
  readonly value = signal<number | null>(null);
  readonly min = signal<number | undefined>(undefined);
  readonly max = signal<number | undefined>(undefined);
  readonly step = signal(1);
  readonly showSpin = signal(true);
  readonly disabled = signal(false);
  readonly ro = signal(false);
}

describe('OgeNumberBox spin', () => {
  async function render(setup?: (host: SpinHost) => void) {
    const fixture = TestBed.createComponent(SpinHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      native: () => el.querySelector('.oge-input-native') as HTMLInputElement,
      buttons: () =>
        Array.from(
          el.querySelectorAll<HTMLButtonElement>('.oge-input-spin-btn'),
        ),
    };
  }

  it('renders spin buttons only when enabled', async () => {
    const { fixture, host, buttons } = await render();
    expect(buttons().length).toBe(2);
    host.showSpin.set(false);
    await settle(fixture);
    expect(buttons().length).toBe(0);
  });

  it('null starts from clamp(0, min, max); steps commit immediately', async () => {
    const { fixture, host, buttons } = await render((h) => h.min.set(3));
    pointer(buttons()[0], 'pointerdown');
    pointer(buttons()[0], 'pointerup');
    await settle(fixture);
    expect(host.value()).toBe(3); // null → clamp(0, 3, _) = 3

    pointer(buttons()[0], 'pointerdown');
    pointer(buttons()[0], 'pointerup');
    await settle(fixture);
    expect(host.value()).toBe(4);
  });

  it('disables the buttons at the bounds', async () => {
    const { fixture, host, buttons } = await render((h) => {
      h.max.set(2);
      h.min.set(0);
    });
    host.value.set(2);
    await settle(fixture);
    expect(buttons()[0].disabled).toBe(true); // at max
    expect(buttons()[1].disabled).toBe(false);

    host.value.set(0);
    await settle(fixture);
    expect(buttons()[0].disabled).toBe(false);
    expect(buttons()[1].disabled).toBe(true); // at min
  });

  it('hold repeats after the delay and stops on release', async () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(SpinHost);
      fixture.componentInstance.value.set(0);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const up = el.querySelectorAll<HTMLButtonElement>(
        '.oge-input-spin-btn',
      )[0];

      pointer(up, 'pointerdown');
      expect(fixture.componentInstance.value()).toBe(1); // immediate

      vi.advanceTimersByTime(400); // delay elapses, interval armed
      vi.advanceTimersByTime(160); // two 80ms ticks
      expect(fixture.componentInstance.value()).toBe(3);

      pointer(up, 'pointerup');
      vi.advanceTimersByTime(1000);
      expect(fixture.componentInstance.value()).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hold stops automatically at the bound', async () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(SpinHost);
      fixture.componentInstance.value.set(0);
      fixture.componentInstance.max.set(2);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const up = el.querySelectorAll<HTMLButtonElement>(
        '.oge-input-spin-btn',
      )[0];

      pointer(up, 'pointerdown');
      vi.advanceTimersByTime(2000);
      expect(fixture.componentInstance.value()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ArrowUp/ArrowDown step and prevent default', async () => {
    const { fixture, host, native } = await render();
    host.value.set(5);
    await settle(fixture);

    const upEvent = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    });
    native().dispatchEvent(upEvent);
    await settle(fixture);
    expect(host.value()).toBe(6);
    expect(upEvent.defaultPrevented).toBe(true);

    native().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);
    expect(host.value()).toBe(5);
  });

  it('readonly/disabled suppress spinning entirely', async () => {
    const { fixture, host, buttons, native } = await render((h) =>
      h.ro.set(true),
    );
    expect(buttons().length).toBe(0); // rail hidden while readonly

    host.ro.set(false);
    host.disabled.set(true);
    await settle(fixture);
    expect(buttons().length).toBe(0);

    native().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
    await settle(fixture);
    expect(host.value()).toBeNull();
  });
});
