import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeNumberBox } from './number-box';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeNumberBox],
  template: `
    <oge-number-box
      [(value)]="value"
      label="Amount"
      locale="en-US"
      [formatWhileTyping]="live()"
      [maxFractionDigits]="maxFraction()"
      [wheelStep]="wheel()"
    />
  `,
})
class TypingHost {
  readonly value = signal<number | null>(null);
  readonly live = signal(true);
  readonly maxFraction = signal<number | undefined>(undefined);
  readonly wheel = signal<number | undefined>(undefined);
}

describe('OgeNumberBox typing', () => {
  async function render(setup?: (host: TypingHost) => void) {
    const fixture = TestBed.createComponent(TypingHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const native = el.querySelector('.oge-input-native') as HTMLInputElement;
    const type = async (text: string, caret = text.length) => {
      native.value = text;
      native.setSelectionRange(caret, caret);
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await settle(fixture);
    };
    return { fixture, host: fixture.componentInstance, native, type };
  }

  it('groups thousands live and keeps the caret beside the typed digit', async () => {
    const { host, native, type } = await render();
    native.dispatchEvent(new FocusEvent('focus'));
    await type('12345');
    expect(native.value).toBe('12,345');
    expect(native.selectionStart).toBe(6);
    expect(host.value()).toBe(12345);
    // typing in the middle: "12,3945" with the caret after the 9
    await type('12,3945', 5);
    expect(native.value).toBe('123,945');
    expect(native.selectionStart).toBe(5);
    expect(host.value()).toBe(123945);
  });

  it('shows the grouped editable text on focus', async () => {
    const { fixture, host, native } = await render((h) => h.value.set(9876543));
    native.dispatchEvent(new FocusEvent('focus'));
    await settle(fixture);
    expect(native.value).toBe('9,876,543');
    expect(host.value()).toBe(9876543);
  });

  it('enforces maxFractionDigits while typing', async () => {
    const { host, native, type } = await render((h) => {
      h.live.set(false);
      h.maxFraction.set(2);
    });
    native.dispatchEvent(new FocusEvent('focus'));
    await type('1.239');
    expect(native.value).toBe('1.23');
    expect(host.value()).toBe(1.23);
  });

  it('steps on the wheel only while focused and only when opted in', async () => {
    const { fixture, host, native } = await render((h) => h.value.set(10));
    const wheel = (deltaY: number) => {
      const event = new WheelEvent('wheel', { deltaY, cancelable: true });
      native.dispatchEvent(event);
      return event;
    };
    native.dispatchEvent(new FocusEvent('focus'));
    await settle(fixture);
    expect(wheel(-100).defaultPrevented).toBe(false); // not opted in
    expect(host.value()).toBe(10);

    host.wheel.set(5);
    await settle(fixture);
    expect(wheel(-100).defaultPrevented).toBe(true);
    expect(host.value()).toBe(15);
    wheel(100);
    expect(host.value()).toBe(10);

    native.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(wheel(-100).defaultPrevented).toBe(false); // page scroll wins
    expect(host.value()).toBe(10);
  });
});
