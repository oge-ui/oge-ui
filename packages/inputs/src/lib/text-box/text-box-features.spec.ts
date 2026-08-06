import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTextBox } from './text-box';
import type { OgeInputCounterMode, OgeTextBoxMode } from '../field/input-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function typeInto(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

@Component({
  imports: [OgeTextBox],
  template: `
    <oge-text-box
      [(value)]="value"
      label="Field"
      [mode]="mode()"
      [showCounter]="showCounter()"
      [counterMode]="counterMode()"
      [maxLength]="maxLength()"
      [revealable]="revealable()"
      [showCopyButton]="showCopyButton()"
      [pending]="pending()"
      [showSuccessIcon]="successIcon()"
      [selectOnFocus]="selectOnFocus()"
      (enterKey)="enters = enters + 1"
    />
  `,
})
class FeaturesHost {
  readonly value = signal('');
  readonly mode = signal<OgeTextBoxMode>('text');
  readonly showCounter = signal(false);
  readonly counterMode = signal<OgeInputCounterMode>('limit');
  readonly maxLength = signal<number | undefined>(undefined);
  readonly revealable = signal(true);
  readonly showCopyButton = signal(false);
  readonly pending = signal(false);
  readonly successIcon = signal<false | 'touched' | 'always'>(false);
  readonly selectOnFocus = signal(false);
  enters = 0;
}

describe('OgeTextBox features', () => {
  async function render(setup?: (host: FeaturesHost) => void) {
    const fixture = TestBed.createComponent(FeaturesHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      native: () => el.querySelector('.oge-input-native') as HTMLInputElement,
      counter: () =>
        el.querySelector('.oge-input-counter > [aria-hidden]') ??
        el.querySelector('.oge-input-counter'),
    };
  }

  it('counter counts graphemes and respects limit mode', async () => {
    const { fixture, host, native, counter } = await render((h) => {
      h.showCounter.set(true);
      h.maxLength.set(10);
    });
    expect(counter()?.textContent?.trim()).toBe('0/10');
    expect(native().getAttribute('maxlength')).toBe('10');

    typeInto(native(), '👨‍👩‍👧');
    await settle(fixture);
    expect(counter()?.textContent?.trim()).toBe('1/10'); // one family, not 8 units

    host.maxLength.set(undefined);
    await settle(fixture);
    expect(counter()?.textContent?.trim()).toBe('1');
  });

  it('soft counter mode drops the native cap and flags overflow', async () => {
    const { fixture, native, counter } = await render((h) => {
      h.showCounter.set(true);
      h.counterMode.set('soft');
      h.maxLength.set(3);
    });
    expect(native().getAttribute('maxlength')).toBeNull();
    typeInto(native(), 'abcde');
    await settle(fixture);
    expect(counter()?.textContent?.trim()).toBe('5/3');
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.oge-input-counter')
        ?.classList.contains('oge-input-counter-over'),
    ).toBe(true);
  });

  it('password mode auto-renders the reveal toggle and flips the type in place', async () => {
    const { fixture, el, native } = await render((h) => h.mode.set('password'));
    expect(native().type).toBe('password');
    const reveal = el.querySelector('.oge-input-reveal') as HTMLButtonElement;
    expect(reveal).toBeTruthy();
    expect(reveal.getAttribute('aria-pressed')).toBe('false');
    // toggle-button pattern: constant accessible name + pressed state
    expect(reveal.getAttribute('aria-label')).toBe('Show password');

    reveal.click();
    await settle(fixture);
    expect(native().type).toBe('text');
    expect(reveal.getAttribute('aria-pressed')).toBe('true');
    expect(reveal.getAttribute('aria-label')).toBe('Show password');
    expect(reveal.getAttribute('title')).toBe('Hide password');

    reveal.click();
    await settle(fixture);
    expect(native().type).toBe('password');
  });

  it('revealable=false suppresses the toggle', async () => {
    const { el } = await render((h) => {
      h.mode.set('password');
      h.revealable.set(false);
    });
    expect(el.querySelector('.oge-input-reveal')).toBeNull();
  });

  it('copy button copies, shows a transient copied state and announces it', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      const { fixture, el, native } = await render((h) =>
        h.showCopyButton.set(true),
      );
      expect(el.querySelector('.oge-input-copy')).toBeNull(); // empty value

      typeInto(native(), 'API-KEY-123');
      await settle(fixture);
      const copy = el.querySelector('.oge-input-copy') as HTMLButtonElement;
      expect(copy).toBeTruthy();

      copy.click();
      await Promise.resolve(); // clipboard promise
      await settle(fixture);
      expect(writeText).toHaveBeenCalledWith('API-KEY-123');
      expect(el.querySelector('.oge-input-copy-done')).toBeTruthy();

      vi.advanceTimersByTime(2100);
      await settle(fixture);
      expect(el.querySelector('.oge-input-copy-done')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('pending shows the spinner and suppresses the success icon', async () => {
    const { fixture, host, el, native } = await render((h) => {
      h.successIcon.set('always');
    });
    typeInto(native(), 'ok');
    await settle(fixture);
    expect(el.querySelector('.oge-input-success')).toBeTruthy();

    host.pending.set(true);
    await settle(fixture);
    expect(el.querySelector('.oge-input-pending')).toBeTruthy();
    expect(el.querySelector('.oge-input-success')).toBeNull();
  });

  it("success icon with 'touched' waits for the first blur", async () => {
    const { fixture, el, native } = await render((h) =>
      h.successIcon.set('touched'),
    );
    typeInto(native(), 'dolu');
    await settle(fixture);
    expect(el.querySelector('.oge-input-success')).toBeNull();

    native().dispatchEvent(new Event('blur'));
    await settle(fixture);
    expect(el.querySelector('.oge-input-success')).toBeTruthy();
  });

  it('selectOnFocus selects the content', async () => {
    const { fixture, native } = await render((h) => {
      h.selectOnFocus.set(true);
      h.value.set('seçilecek');
    });
    const select = vi.spyOn(native(), 'select');
    native().dispatchEvent(new Event('focus'));
    await settle(fixture);
    expect(select).toHaveBeenCalled();
  });

  it('Enter emits enterKey', async () => {
    const { fixture, host, native } = await render();
    native().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await settle(fixture);
    expect(host.enters).toBe(1);
  });

  it('rail renders built-ins in the contracted order', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: () => Promise.resolve() },
    });
    const { fixture, el, native } = await render((h) => {
      h.mode.set('password');
      h.showCopyButton.set(true);
      h.pending.set(true);
    });
    typeInto(native(), 'x');
    await settle(fixture);
    const rail = el.querySelector('.oge-input-rail') as HTMLElement;
    const classes = Array.from(rail.children).map(
      (c) => c.getAttribute('class') ?? '',
    );
    const index = (needle: string): number =>
      classes.findIndex((c) => c.includes(needle));
    expect(index('oge-input-pending')).toBeGreaterThanOrEqual(0);
    expect(index('oge-input-copy')).toBeGreaterThan(index('oge-input-pending'));
    expect(index('oge-input-reveal')).toBeGreaterThan(index('oge-input-copy'));
    vi.unstubAllGlobals();
  });
});
