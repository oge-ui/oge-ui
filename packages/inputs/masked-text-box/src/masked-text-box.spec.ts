import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { OgeMaskedTextBox } from './masked-text-box';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

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

@Component({
  imports: [OgeMaskedTextBox],
  template: `
    <oge-masked-text-box
      #box
      [(value)]="value"
      label="Licence plate"
      mask="00 LLL 000"
      [maskRules]="rules"
    />
  `,
})
class MaskedHost {
  readonly value = signal('');
  readonly rules = {};
  readonly box = viewChild.required<OgeMaskedTextBox>('box');
}

describe('OgeMaskedTextBox', () => {
  it('renders the mask-first defaults', async () => {
    const fixture = TestBed.createComponent(MaskedHost);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    const input = host.querySelector('input') as HTMLInputElement;
    expect(
      host
        .querySelector('oge-masked-text-box')
        ?.classList.contains('oge-text-box'),
    ).toBe(true);
    expect(input.value).toBe('__ ___ ___');
    expect(input.getAttribute('spellcheck')).toBe('false');
    expect(input.getAttribute('autocomplete')).toBe('off');
    // letters in the mask → the full keyboard
    expect(input.getAttribute('inputmode')).toBeNull();
  });

  it('exposes raw and masked readers and completion', async () => {
    const fixture = TestBed.createComponent(MaskedHost);
    await settle(fixture);
    const input = (fixture.nativeElement as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement;
    input.setSelectionRange(0, 0);
    type(input, '34abc');
    await settle(fixture);
    const box = fixture.componentInstance.box();
    expect(input.value).toBe('34 abc ___');
    expect(box.rawValue()).toBe('34abc');
    expect(box.maskedValue()).toBe('34 abc');
    expect(box.isMaskComplete()).toBe(false);
    type(input, '123');
    await settle(fixture);
    expect(box.isMaskComplete()).toBe(true);
    expect(fixture.componentInstance.value()).toBe('34abc123');
  });
});

@Component({
  imports: [OgeMaskedTextBox, FormField],
  template: `<oge-masked-text-box
    label="PIN"
    mask="0000"
    [formField]="pinForm.pin"
  />`,
})
class SignalFormsHost {
  readonly model = signal({ pin: '12' });
  readonly pinForm = form(this.model);
}

describe('OgeMaskedTextBox — Signal Forms', () => {
  it('binds through [formField] and writes the raw value back', async () => {
    const fixture = TestBed.createComponent(SignalFormsHost);
    await settle(fixture);
    const input = (fixture.nativeElement as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement;
    expect(input.value).toBe('12__');
    input.setSelectionRange(2, 2);
    type(input, '34');
    await settle(fixture);
    expect(fixture.componentInstance.model().pin).toBe('1234');
  });
});
