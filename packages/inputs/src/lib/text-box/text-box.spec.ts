import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeInputPrefix, OgeInputSuffix } from '../field/input-slots';
import { OgeTextBox } from './text-box';
import type {
  OgeInputLabelMode,
  OgeInputStylingMode,
  OgeInputSubscriptSizing,
} from '../field/input-types';

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
  imports: [OgeTextBox, OgeInputPrefix, OgeInputSuffix],
  template: `
    <oge-text-box
      [(value)]="value"
      [label]="label()"
      [labelMode]="labelMode()"
      [stylingMode]="stylingMode()"
      [size]="size()"
      [placeholder]="placeholder()"
      [hint]="hint()"
      [tooltip]="tooltip()"
      [subscriptSizing]="subscriptSizing()"
      [required]="required()"
      [disabled]="disabled()"
      [readonly]="ro()"
      [invalid]="invalid()"
      [errorText]="errorText()"
      [errorDisplay]="'always'"
      [showClearButton]="showClearButton()"
      [showCounter]="showCounter()"
      [maxLength]="maxLength()"
      [inputAttr]="{ 'data-testid': 'inner' }"
      (cleared)="clearCount = clearCount + 1"
    >
      <span ogeInputPrefix class="my-prefix">P</span>
      <span ogeInputSuffix class="my-suffix">S</span>
    </oge-text-box>
  `,
})
class TextBoxHost {
  readonly value = signal('');
  readonly label = signal('Name');
  readonly labelMode = signal<OgeInputLabelMode>('static');
  readonly stylingMode = signal<OgeInputStylingMode>('outlined');
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
  readonly placeholder = signal('Type here');
  readonly hint = signal<string | undefined>(undefined);
  readonly tooltip = signal<string | undefined>(undefined);
  readonly subscriptSizing = signal<OgeInputSubscriptSizing>('fixed');
  readonly required = signal(false);
  readonly disabled = signal(false);
  readonly ro = signal(false);
  readonly invalid = signal(false);
  readonly errorText = signal<string | undefined>(undefined);
  readonly showClearButton = signal(false);
  readonly showCounter = signal(false);
  readonly maxLength = signal<number | undefined>(undefined);
  clearCount = 0;
}

describe('OgeTextBox', () => {
  async function render(setup?: (host: TextBoxHost) => void) {
    const fixture = TestBed.createComponent(TextBoxHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      box: () => el.querySelector('.oge-text-box') as HTMLElement,
      native: () => el.querySelector('.oge-input-native') as HTMLInputElement,
    };
  }

  it('renders the field with associated label and projected slots', async () => {
    const { box, native, el } = await render();
    expect(box().classList.contains('oge-input')).toBe(true);
    const label = el.querySelector('.oge-input-label') as HTMLLabelElement;
    expect(label.textContent).toContain('Name');
    expect(label.getAttribute('for')).toBe(native().id);
    expect(el.querySelector('.my-prefix')).toBeTruthy();
    expect(el.querySelector('.my-suffix')).toBeTruthy();
    expect(native().getAttribute('data-testid')).toBe('inner');
  });

  it('label modes: outside/static render a label, hidden uses aria-label', async () => {
    const { fixture, host, el, native } = await render();
    host.labelMode.set('hidden');
    await settle(fixture);
    expect(el.querySelector('.oge-input-label')).toBeNull();
    expect(native().getAttribute('aria-label')).toBe('Name');

    host.labelMode.set('outside');
    await settle(fixture);
    expect(el.querySelector('.oge-input-label')).toBeTruthy();
    expect(native().getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('floating label floats up on focus or content and suppresses the placeholder', async () => {
    const { fixture, host, box, native, el } = await render((h) =>
      h.labelMode.set('floating'),
    );
    expect(el.querySelector('.oge-input-label-float')).toBeTruthy();
    expect(box().classList.contains('oge-input-float-up')).toBe(false);
    expect(native().placeholder).toBe(''); // label occupies the slot

    native().dispatchEvent(new Event('focus'));
    await settle(fixture);
    expect(box().classList.contains('oge-input-float-up')).toBe(true);
    expect(native().placeholder).toBe('Type here');

    native().dispatchEvent(new Event('blur'));
    await settle(fixture);
    expect(box().classList.contains('oge-input-float-up')).toBe(false);

    host.value.set('dolu');
    await settle(fixture);
    expect(box().classList.contains('oge-input-float-up')).toBe(true);
  });

  it('applies stylingMode and size host classes', async () => {
    const { fixture, host, box } = await render();
    host.stylingMode.set('filled');
    host.size.set('sm');
    await settle(fixture);
    expect(box().classList.contains('oge-input-filled')).toBe(true);
    expect(box().classList.contains('oge-input-sm')).toBe(true);

    host.stylingMode.set('underlined');
    host.size.set('lg');
    await settle(fixture);
    expect(box().classList.contains('oge-input-underlined')).toBe(true);
    expect(box().classList.contains('oge-input-lg')).toBe(true);
  });

  it('chains aria-describedby across hint, error and counter', async () => {
    const { fixture, host, native, el } = await render((h) => {
      h.hint.set('Helper');
    });
    const id = native().id;
    expect(native().getAttribute('aria-describedby')).toBe(`${id}-hint`);
    expect(el.querySelector('.oge-input-hint')?.textContent).toContain(
      'Helper',
    );

    host.invalid.set(true);
    host.errorText.set('Broken');
    await settle(fixture);
    expect(native().getAttribute('aria-describedby')).toBe(`${id}-error`);
    expect(el.querySelector('.oge-input-error')?.textContent).toContain(
      'Broken',
    );
    expect(el.querySelector('.oge-input-hint')).toBeNull();
    expect(native().getAttribute('aria-invalid')).toBe('true');

    host.showCounter.set(true);
    host.maxLength.set(10);
    await settle(fixture);
    expect(native().getAttribute('aria-describedby')).toBe(
      `${id}-error ${id}-counter`,
    );
  });

  it('marks required visually and with aria-required', async () => {
    const { native, el } = await render((h) => h.required.set(true));
    expect(el.querySelector('.oge-input-required-mark')).toBeTruthy();
    expect(native().getAttribute('aria-required')).toBe('true');
  });

  it('clear button shows only with content, clears, emits and is not tabbable', async () => {
    const { fixture, host, el, native } = await render((h) =>
      h.showClearButton.set(true),
    );
    expect(el.querySelector('.oge-input-clear')).toBeNull();

    typeInto(native(), 'hello');
    await settle(fixture);
    const clear = el.querySelector('.oge-input-clear') as HTMLButtonElement;
    expect(clear).toBeTruthy();
    expect(clear.getAttribute('tabindex')).toBe('-1');

    clear.click();
    await settle(fixture);
    expect(host.value()).toBe('');
    expect(native().value).toBe('');
    expect(host.clearCount).toBe(1);
    expect(el.querySelector('.oge-input-clear')).toBeNull();
  });

  it('subscriptSizing none removes the subscript region entirely', async () => {
    const { fixture, host, el } = await render((h) => {
      h.hint.set('Helper');
      h.subscriptSizing.set('none');
    });
    expect(el.querySelector('.oge-input-subscript')).toBeNull();

    host.subscriptSizing.set('fixed');
    await settle(fixture);
    expect(
      el
        .querySelector('.oge-input-subscript')
        ?.classList.contains('oge-input-subscript-fixed'),
    ).toBe(true);
  });

  it('disabled/readonly and tooltip pass through to the native input', async () => {
    const { fixture, host, native } = await render((h) => {
      h.tooltip.set('More info');
    });
    expect(native().getAttribute('title')).toBe('More info');
    host.disabled.set(true);
    await settle(fixture);
    expect(native().disabled).toBe(true);

    host.disabled.set(false);
    host.ro.set(true);
    await settle(fixture);
    expect(native().readOnly).toBe(true);
  });
});
