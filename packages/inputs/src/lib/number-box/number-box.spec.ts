import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField, form, max as maxRule } from '@angular/forms/signals';
import { OgeNumberBox } from './number-box';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function typeInto(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function focus(input: HTMLInputElement): void {
  input.dispatchEvent(new Event('focus'));
}

function blur(input: HTMLInputElement): void {
  input.dispatchEvent(new Event('blur'));
}

@Component({
  imports: [OgeNumberBox],
  template: `
    <oge-number-box
      [(value)]="value"
      label="Amount"
      [min]="min()"
      [max]="max()"
      [format]="format()"
      [locale]="locale()"
    />
  `,
})
class NumberHost {
  readonly value = signal<number | null>(null);
  readonly min = signal<number | undefined>(undefined);
  readonly max = signal<number | undefined>(undefined);
  readonly format = signal<Intl.NumberFormatOptions | undefined>(undefined);
  readonly locale = signal<string | undefined>('en-US');
}

describe('OgeNumberBox', () => {
  async function render(setup?: (host: NumberHost) => void) {
    const fixture = TestBed.createComponent(NumberHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      native: () => el.querySelector('.oge-input-native') as HTMLInputElement,
    };
  }

  it('renders empty for null (never 0) with inputmode=decimal', async () => {
    const { native } = await render();
    expect(native().value).toBe('');
    expect(native().getAttribute('inputmode')).toBe('decimal');
  });

  it('typing commits parsed numbers; clearing commits null', async () => {
    const { fixture, host, native } = await render();
    focus(native());
    typeInto(native(), '12.5');
    await settle(fixture);
    expect(host.value()).toBe(12.5);

    typeInto(native(), '');
    await settle(fixture);
    expect(host.value()).toBeNull();
  });

  it('invalid text shows the parse error, blur reverts to the last valid value', async () => {
    const { fixture, host, el, native } = await render();
    focus(native());
    typeInto(native(), '42');
    await settle(fixture);
    expect(host.value()).toBe(42);

    typeInto(native(), '4..2');
    await settle(fixture);
    expect(host.value()).toBe(42); // no commit
    expect(el.querySelector('.oge-input-error')).toBeTruthy();
    expect(el.querySelector('.oge-input-error')?.textContent).toContain(
      'Enter a valid number',
    );

    blur(native());
    await settle(fixture);
    expect(native().value).toBe('42'); // reverted display
    expect(el.querySelector('.oge-input-error')).toBeNull();
  });

  it('clamps to min/max on blur, not while typing', async () => {
    const { fixture, host, native } = await render((h) => h.max.set(10));
    focus(native());
    typeInto(native(), '99');
    await settle(fixture);
    expect(host.value()).toBe(99); // typing stays unclamped

    blur(native());
    await settle(fixture);
    expect(host.value()).toBe(10);
    expect(native().value).toBe('10');
  });

  it('formats on blur and shows the raw editable number on focus', async () => {
    const { fixture, host, native } = await render((h) => {
      h.locale.set('de-DE');
      h.format.set({ style: 'currency', currency: 'EUR' });
    });
    host.value.set(1234.5);
    await settle(fixture);
    expect(native().value).toContain('1.234,50');

    focus(native());
    await settle(fixture);
    expect(native().value).toBe('1234,5'); // raw, no grouping

    blur(native());
    await settle(fixture);
    expect(native().value).toContain('1.234,50');
  });

  it('parses locale input (de-DE comma decimal)', async () => {
    const { fixture, host, native } = await render((h) =>
      h.locale.set('de-DE'),
    );
    focus(native());
    typeInto(native(), '1.234,5');
    await settle(fixture);
    expect(host.value()).toBe(1234.5);
  });

  it('works with a FormControl<number | null>', async () => {
    @Component({
      imports: [OgeNumberBox, ReactiveFormsModule],
      template: `<oge-number-box label="Qty" [formControl]="control" />`,
    })
    class CvaHost {
      readonly control = new FormControl<number | null>(null);
    }
    const fixture = TestBed.createComponent(CvaHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const native = el.querySelector('.oge-input-native') as HTMLInputElement;
    expect(native.value).toBe('');

    fixture.componentInstance.control.setValue(7);
    await settle(fixture);
    expect(native.value).toBe('7');

    focus(native);
    typeInto(native, '21');
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toBe(21);
  });

  it('round-trips through Signal Forms with schema errors', async () => {
    @Component({
      imports: [OgeNumberBox, FormField],
      template: `<oge-number-box label="Qty" [formField]="f.qty" />`,
    })
    class SignalHost {
      readonly data = signal<{ qty: number | null }>({ qty: null });
      readonly f = form(this.data, (p) => {
        maxRule(p.qty, 5);
      });
    }
    const fixture = TestBed.createComponent(SignalHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const native = el.querySelector('.oge-input-native') as HTMLInputElement;

    focus(native);
    typeInto(native, '9');
    await settle(fixture);
    expect(fixture.componentInstance.f.qty().value()).toBe(9);
    expect(fixture.componentInstance.f.qty().invalid()).toBe(true);

    // The schema's max(5) auto-binds into the component's `max` input via
    // the FormValueControl contract — blur clamps the committed value.
    blur(native);
    await settle(fixture);
    const field = fixture.componentInstance.f.qty();
    expect(field.value()).toBe(5);
    expect(field.invalid()).toBe(false);
    expect(field.touched()).toBe(true);
    expect(native.value).toBe('5');
    expect(el.querySelector('.oge-input-error')).toBeNull();
  });
});
