import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OgeTextBox } from './text-box';
import type { OgeMaskCompletedEvent, OgeMaskShowMode } from '@oge-ui/behavior';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** A real browser's keystroke: a cancelable beforeinput the mask consumes. */
function type(input: HTMLInputElement, text: string): void {
  for (const char of Array.from(text)) {
    input.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: char,
        bubbles: true,
        cancelable: true,
      }),
    );
  }
}

function press(input: HTMLInputElement, inputType: string): boolean {
  return input.dispatchEvent(
    new InputEvent('beforeinput', {
      inputType,
      bubbles: true,
      cancelable: true,
    }),
  );
}

@Component({
  imports: [OgeTextBox],
  template: `
    <oge-text-box
      [(value)]="value"
      label="Phone"
      [mask]="mask()"
      [includeLiterals]="includeLiterals()"
      [showMaskMode]="showMaskMode()"
      [maskInvalidMessage]="maskInvalidMessage()"
      [errorDisplay]="'always'"
      (maskCompleted)="completed.push($event)"
    />
  `,
})
class MaskHost {
  readonly value = signal('');
  readonly mask = signal<string | undefined>('(000) 000-0000');
  readonly includeLiterals = signal(false);
  readonly showMaskMode = signal<OgeMaskShowMode>('always');
  readonly maskInvalidMessage = signal<string | undefined>(undefined);
  readonly completed: OgeMaskCompletedEvent[] = [];
}

describe('OgeTextBox mask', () => {
  async function render(setup?: (host: MaskHost) => void) {
    const fixture = TestBed.createComponent(MaskHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input') as HTMLInputElement;
    return { fixture, host: fixture.componentInstance, el, input };
  }

  it('renders the mask with placeholders and a numeric keyboard hint', async () => {
    const { input } = await render();
    expect(input.value).toBe('(___) ___-____');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('maxlength')).toBeNull();
  });

  it('types through literals and commits the raw value', async () => {
    const { fixture, host, input } = await render();
    input.focus();
    input.setSelectionRange(0, 0);
    type(input, '555123');
    await settle(fixture);
    expect(input.value).toBe('(555) 123-____');
    expect(host.value()).toBe('555123');
    expect(input.selectionStart).toBe(10);
  });

  it('commits the formatted value with includeLiterals', async () => {
    const { fixture, host, input } = await render((h) =>
      h.includeLiterals.set(true),
    );
    type(input, '5551');
    await settle(fixture);
    expect(host.value()).toBe('(555) 1');
  });

  it('rejects characters the slot does not accept', async () => {
    const { fixture, host, input } = await render();
    type(input, 'ab');
    await settle(fixture);
    expect(input.value).toBe('(___) ___-____');
    expect(host.value()).toBe('');
  });

  it('backspace empties the previous slot across literals', async () => {
    const { fixture, host, input } = await render((h) => h.value.set('5551'));
    expect(input.value).toBe('(555) 1__-____');
    input.setSelectionRange(7, 7);
    expect(press(input, 'deleteContentBackward')).toBe(false);
    input.setSelectionRange(6, 6);
    press(input, 'deleteContentBackward');
    await settle(fixture);
    expect(input.value).toBe('(55_) ___-____');
    expect(host.value()).toBe('55');
  });

  it('pastes formatted text', async () => {
    const { fixture, host, input } = await render();
    input.setSelectionRange(0, 0);
    input.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertFromPaste',
        data: '(555) 123-4567',
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(fixture);
    expect(host.value()).toBe('5551234567');
    expect(host.completed).toEqual([
      {
        value: '5551234567',
        rawValue: '5551234567',
        maskedValue: '(555) 123-4567',
      },
    ]);
  });

  it('applies IME composition once at compositionend', async () => {
    const { fixture, host, input } = await render((h) => h.mask.set('LLL'));
    input.setSelectionRange(0, 0);
    input.dispatchEvent(new CompositionEvent('compositionstart'));
    // the browser renders the in-progress composition natively
    input.value = 'か__';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(host.value()).toBe('');
    input.dispatchEvent(
      new CompositionEvent('compositionend', { data: 'かな' }),
    );
    await settle(fixture);
    expect(input.value).toBe('かな_');
    expect(host.value()).toBe('かな');
  });

  it('reconciles input no beforeinput announced (autofill)', async () => {
    const { fixture, host, input } = await render();
    input.value = '555 123 4567';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(input.value).toBe('(555) 123-4567');
    expect(host.value()).toBe('5551234567');
  });

  it('re-fills from an external value write', async () => {
    const { fixture, host, input } = await render();
    host.value.set('5559876543');
    await settle(fixture);
    expect(input.value).toBe('(555) 987-6543');
  });

  it('flags an incomplete mask with the mask message', async () => {
    const { fixture, el } = await render((h) => h.value.set('555'));
    await settle(fixture);
    expect(el.querySelector('.oge-input-error')?.textContent?.trim()).toBe(
      'Complete the value in the required format',
    );
    fixture.componentInstance.maskInvalidMessage.set('Enter 10 digits');
    await settle(fixture);
    expect(el.querySelector('.oge-input-error')?.textContent?.trim()).toBe(
      'Enter 10 digits',
    );
  });

  it("hides the empty mask while blurred with showMaskMode 'onFocus'", async () => {
    const { fixture, input } = await render((h) =>
      h.showMaskMode.set('onFocus'),
    );
    expect(input.value).toBe('');
    input.focus();
    input.dispatchEvent(new FocusEvent('focus'));
    await settle(fixture);
    expect(input.value).toBe('(___) ___-____');
  });

  it('is a plain text box without a mask', async () => {
    const { fixture, host, input } = await render((h) => h.mask.set(undefined));
    expect(press(input, 'insertText')).toBe(true);
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(host.value()).toBe('abc');
  });
});

@Component({
  imports: [OgeTextBox, ReactiveFormsModule],
  template: `<oge-text-box
    label="Code"
    mask="00-00"
    [formControl]="control"
  />`,
})
class ReactiveMaskHost {
  readonly control = new FormControl('12');
}

describe('OgeTextBox mask — reactive forms', () => {
  it('adds a mask validator to the bound control', async () => {
    const fixture = TestBed.createComponent(ReactiveMaskHost);
    await settle(fixture);
    const control = fixture.componentInstance.control;
    expect(control.errors).toEqual({
      mask: 'Complete the value in the required format',
    });
    control.setValue('1234');
    expect(control.valid).toBe(true);
    control.setValue('');
    expect(control.valid).toBe(true);
  });
});

@Component({
  imports: [OgeTextBox, ReactiveFormsModule],
  template: `<oge-text-box
    label="Code"
    mask="00-00"
    [maskValidation]="false"
    [formControl]="control"
    errorDisplay="always"
  />`,
})
class NoValidationHost {
  readonly control = new FormControl('12');
}

describe('OgeTextBox mask — maskValidation off', () => {
  it('neither flags the field nor validates the control', async () => {
    const fixture = TestBed.createComponent(NoValidationHost);
    await settle(fixture);
    expect(fixture.componentInstance.control.valid).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.oge-input-error'),
    ).toBeNull();
  });
});
