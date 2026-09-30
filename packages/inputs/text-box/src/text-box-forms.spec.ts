import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';
import { OgeTextBox } from './text-box';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function typeInto(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function blur(input: HTMLInputElement): void {
  input.dispatchEvent(new Event('blur'));
}

describe('OgeTextBox forms integration', () => {
  describe('ControlValueAccessor (reactive forms)', () => {
    @Component({
      imports: [OgeTextBox, ReactiveFormsModule],
      template: `<oge-text-box label="Name" [formControl]="control" />`,
    })
    class CvaHost {
      readonly control = new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required],
      });
    }

    async function render() {
      const fixture = TestBed.createComponent(CvaHost);
      await settle(fixture);
      const el = fixture.nativeElement as HTMLElement;
      return {
        fixture,
        host: fixture.componentInstance,
        el,
        native: () => el.querySelector('.oge-input-native') as HTMLInputElement,
      };
    }

    it('writeValue renders without a feedback loop', async () => {
      const { fixture, host, native } = await render();
      const emissions: string[] = [];
      host.control.valueChanges.subscribe((v) => emissions.push(v));
      host.control.setValue('Klavye');
      await settle(fixture);
      expect(native().value).toBe('Klavye');
      // exactly the one emission from setValue itself — no echo from the CVA
      expect(emissions).toEqual(['Klavye']);
    });

    it('typing updates the control and marks it dirty', async () => {
      const { fixture, host, native } = await render();
      typeInto(native(), 'Fare');
      await settle(fixture);
      expect(host.control.value).toBe('Fare');
      expect(host.control.dirty).toBe(true);
    });

    it('disable()/enable() flow through without touching the disabled input', async () => {
      const { fixture, host, native } = await render();
      host.control.disable();
      await settle(fixture);
      expect(native().disabled).toBe(true);
      host.control.enable();
      await settle(fixture);
      expect(native().disabled).toBe(false);
    });

    it('blur marks the control touched and reveals the required error', async () => {
      const { fixture, host, el, native } = await render();
      expect(el.querySelector('.oge-input-error')).toBeNull();
      blur(native());
      await settle(fixture);
      expect(host.control.touched).toBe(true);
      expect(el.querySelector('.oge-input-error')?.textContent).toContain(
        'This field is required',
      );
      expect(native().getAttribute('aria-invalid')).toBe('true');
    });

    it('markAllAsTouched (no blur) reveals errors via the events bridge', async () => {
      const { fixture, el } = await render();
      fixture.componentInstance.control.markAsTouched();
      await settle(fixture);
      expect(el.querySelector('.oge-input-error')).toBeTruthy();
    });

    it('reset returns to pristine and hides the error', async () => {
      const { fixture, host, el, native } = await render();
      blur(native());
      await settle(fixture);
      expect(el.querySelector('.oge-input-error')).toBeTruthy();
      host.control.reset('');
      await settle(fixture);
      expect(el.querySelector('.oge-input-error')).toBeNull();
    });
  });

  describe('Signal Forms ([formField])', () => {
    @Component({
      imports: [OgeTextBox, FormField],
      template: `<oge-text-box label="Name" [formField]="f.name" />`,
    })
    class SignalHost {
      readonly data = signal({ name: '' });
      readonly f = form(this.data, (p) => {
        required(p.name);
      });
    }

    async function render() {
      const fixture = TestBed.createComponent(SignalHost);
      await settle(fixture);
      const el = fixture.nativeElement as HTMLElement;
      return {
        fixture,
        host: fixture.componentInstance,
        el,
        native: () => el.querySelector('.oge-input-native') as HTMLInputElement,
      };
    }

    it('typing updates the field; programmatic writes render', async () => {
      const { fixture, host, native } = await render();
      typeInto(native(), 'Monitör');
      await settle(fixture);
      expect(host.f.name().value()).toBe('Monitör');

      host.f.name().value.set('Kulaklık');
      await settle(fixture);
      expect(native().value).toBe('Kulaklık');
    });

    it('blur emits touch → field touched; required error renders after touch', async () => {
      const { fixture, host, el, native } = await render();
      expect(host.f.name().touched()).toBe(false);
      expect(el.querySelector('.oge-input-error')).toBeNull();

      blur(native());
      await settle(fixture);
      expect(host.f.name().touched()).toBe(true);
      expect(el.querySelector('.oge-input-error')?.textContent).toContain(
        'This field is required',
      );
    });
  });

  describe('standalone model + debounce', () => {
    @Component({
      imports: [OgeTextBox],
      template: `
        <oge-text-box
          [(value)]="value"
          [debounce]="debounceMs()"
          (inputChange)="raw.push($event.text)"
        />
      `,
    })
    class ModelHost {
      readonly value = signal('');
      readonly debounceMs = signal<number | undefined>(undefined);
      readonly raw: string[] = [];
    }

    it('two-way binds in both directions', async () => {
      const fixture = TestBed.createComponent(ModelHost);
      await settle(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const native = el.querySelector('.oge-input-native') as HTMLInputElement;

      typeInto(native, 'abc');
      await settle(fixture);
      expect(fixture.componentInstance.value()).toBe('abc');

      fixture.componentInstance.value.set('xyz');
      await settle(fixture);
      expect(native.value).toBe('xyz');
    });

    it('debounce batches commits while inputChange streams every keystroke', async () => {
      vi.useFakeTimers();
      try {
        const fixture = TestBed.createComponent(ModelHost);
        fixture.componentInstance.debounceMs.set(200);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const native = el.querySelector(
          '.oge-input-native',
        ) as HTMLInputElement;

        typeInto(native, 'a');
        typeInto(native, 'ab');
        typeInto(native, 'abc');
        expect(fixture.componentInstance.value()).toBe('');
        expect(fixture.componentInstance.raw).toEqual(['a', 'ab', 'abc']);

        vi.advanceTimersByTime(250);
        expect(fixture.componentInstance.value()).toBe('abc');
      } finally {
        vi.useRealTimers();
      }
    });

    it('valueCommitted carries previousValue and discriminates user vs programmatic', async () => {
      const fixture = TestBed.createComponent(ModelHost);
      await settle(fixture);
      const box = fixture.debugElement.children[0]
        .componentInstance as import('./text-box').OgeTextBox;
      const events: {
        value: string;
        previousValue: string;
        event: Event | undefined;
      }[] = [];
      box.valueCommitted.subscribe((e) => events.push(e));
      const native = (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-input-native',
      ) as HTMLInputElement;

      typeInto(native, 'a');
      typeInto(native, 'ab');
      expect(events.length).toBe(2);
      expect(events[1]).toMatchObject({ value: 'ab', previousValue: 'a' });
      expect(events[1].event).toBeInstanceOf(Event); // user-driven

      box.reset();
      expect(events.length).toBe(3);
      expect(events[2]).toMatchObject({
        value: '',
        previousValue: 'ab',
        event: undefined, // programmatic
      });

      // committing an identical value emits nothing
      typeInto(native, '');
      expect(events.length).toBe(3);
    });

    it('reset() returns a standalone field to pristine', async () => {
      const fixture = TestBed.createComponent(ModelHost);
      await settle(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const box = fixture.debugElement.children[0]
        .componentInstance as import('./text-box').OgeTextBox;
      const native = el.querySelector('.oge-input-native') as HTMLInputElement;

      typeInto(native, 'kirli');
      blur(native);
      await settle(fixture);
      expect(box.effectiveTouched()).toBe(true);
      expect(box.effectiveDirty()).toBe(true);

      box.reset();
      await settle(fixture);
      expect(fixture.componentInstance.value()).toBe('');
      expect(native.value).toBe('');
      expect(box.effectiveTouched()).toBe(false);
      expect(box.effectiveDirty()).toBe(false);

      box.reset('önceden dolu');
      await settle(fixture);
      expect(fixture.componentInstance.value()).toBe('önceden dolu');
    });

    it('blur flushes a pending debounced commit immediately', async () => {
      vi.useFakeTimers();
      try {
        const fixture = TestBed.createComponent(ModelHost);
        fixture.componentInstance.debounceMs.set(500);
        fixture.detectChanges();
        const native = (fixture.nativeElement as HTMLElement).querySelector(
          '.oge-input-native',
        ) as HTMLInputElement;

        typeInto(native, 'hızlı');
        expect(fixture.componentInstance.value()).toBe('');
        blur(native);
        expect(fixture.componentInstance.value()).toBe('hızlı');
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
