import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeForm } from './form';
import { OgeFormItem } from './form-item';
import type { OgeFormItemData, OgeFormSubmittingEvent } from './form-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

interface Order extends Record<string, unknown> {
  code: string;
  email: string;
  quantity: number;
  note: string;
}

@Component({
  selector: 'oge-rules-host',
  imports: [OgeForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form
      [(formData)]="data"
      [items]="items()"
      [scrollToFirstInvalid]="false"
    />
  `,
})
class RulesHost {
  readonly data = signal<Order>({
    code: 'AB',
    email: 'nope',
    quantity: 99,
    note: '',
  });
  readonly items = signal<readonly OgeFormItemData[]>([
    {
      field: 'code',
      label: 'Code',
      validationRules: [{ type: 'stringLength', min: 3 }],
    },
    { field: 'email', label: 'Email', validationRules: [{ type: 'email' }] },
    {
      field: 'quantity',
      label: 'Quantity',
      validationRules: [{ type: 'numeric', max: 10 }],
    },
    { field: 'note', label: 'Note' },
  ]);
}

@Component({
  selector: 'oge-submit-host',
  imports: [OgeForm, OgeFormItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form
      [(formData)]="data"
      [scrollToFirstInvalid]="false"
      (submitting)="onSubmitting($event)"
      (submitted)="submitted.set(true)"
    >
      <oge-form-item field="code" label="Code" [isRequired]="true" />
    </oge-form>
  `,
})
class SubmitHost {
  readonly data = signal<{ code: string }>({ code: 'ok' });
  readonly cancel = signal(false);
  readonly submitted = signal(false);
  readonly seen = signal<OgeFormSubmittingEvent<Record<string, unknown>>[]>([]);

  onSubmitting(event: OgeFormSubmittingEvent<Record<string, unknown>>): void {
    this.seen.update((all) => [...all, event]);
    if (this.cancel()) event.cancel = true;
  }
}

function formOf(fixture: ComponentFixture<unknown>): OgeForm {
  return fixture.debugElement.children[0].componentInstance as OgeForm;
}

describe('OgeForm — validationRules compile to Signal Forms', () => {
  it('reports one entry per failing rule, in layout order', async () => {
    const fixture = TestBed.createComponent(RulesHost);
    await settle(fixture);
    expect(
      formOf(fixture)
        .errors()
        .map((e) => e.field),
    ).toEqual(['code', 'email', 'quantity']);
  });

  it('renders the message the inputs package would render inline', async () => {
    const fixture = TestBed.createComponent(RulesHost);
    await settle(fixture);
    const messages = formOf(fixture)
      .errors()
      .map((e) => e.message);
    expect(messages[1]).toBe('Enter a valid email address');
    expect(messages[2]).toContain('10');
  });

  it('clears an error once the value satisfies the rule', async () => {
    const fixture = TestBed.createComponent(RulesHost);
    await settle(fixture);
    fixture.componentInstance.data.update((d) => ({
      ...d,
      code: 'ABC',
      email: 'a@b.co',
      quantity: 5,
    }));
    await settle(fixture);
    expect(formOf(fixture).valid()).toBe(true);
  });

  it('runs a custom rule and surfaces its message', async () => {
    const fixture = TestBed.createComponent(RulesHost);
    fixture.componentInstance.items.set([
      {
        field: 'note',
        label: 'Note',
        validationRules: [
          {
            type: 'custom',
            validate: ({ value }) =>
              String(value ?? '').includes('!') ? null : 'Needs a bang',
          },
        ],
      },
    ]);
    await settle(fixture);
    expect(formOf(fixture).errors()[0].message).toBe('Needs a bang');
  });

  it('runs an async rule and surfaces its message once it settles', async () => {
    const fixture = TestBed.createComponent(RulesHost);
    fixture.componentInstance.items.set([
      {
        field: 'code',
        label: 'Code',
        validationRules: [
          {
            type: 'async',
            validate: async (value) =>
              String(value ?? '').startsWith('AB') ? 'Already taken' : null,
          },
        ],
      },
    ]);
    await settle(fixture);
    // the resource has to resolve before the error exists
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle(fixture);

    expect(formOf(fixture).errors()[0]?.message).toBe('Already taken');

    fixture.componentInstance.data.update((d) => ({ ...d, code: 'ZZ' }));
    await settle(fixture);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle(fixture);
    expect(formOf(fixture).errors().length).toBe(0);
  });

  it('keeps the error out of the DOM until the field is touched', async () => {
    const fixture = TestBed.createComponent(RulesHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.oge-input-error')).toBeNull();

    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await settle(fixture);
    expect(el.querySelector('.oge-input-error')).toBeTruthy();
  });
});

describe('OgeForm — submit pipeline', () => {
  it('emits submitting then submitted for a valid form', async () => {
    const fixture = TestBed.createComponent(SubmitHost);
    await settle(fixture);
    const ok = await formOf(fixture).submit();
    expect(ok).toBe(true);
    expect(fixture.componentInstance.submitted()).toBe(true);
  });

  it('honours a canceled submitting event', async () => {
    const fixture = TestBed.createComponent(SubmitHost);
    fixture.componentInstance.cancel.set(true);
    await settle(fixture);
    const ok = await formOf(fixture).submit();
    expect(ok).toBe(false);
    expect(fixture.componentInstance.submitted()).toBe(false);
  });

  it('reports validity to the submitting handler without suppressing it', async () => {
    const fixture = TestBed.createComponent(SubmitHost);
    fixture.componentInstance.data.set({ code: '' });
    await settle(fixture);
    const ok = await formOf(fixture).submit();
    expect(ok).toBe(false);
    expect(fixture.componentInstance.seen()[0].valid).toBe(false);
    expect(fixture.componentInstance.submitted()).toBe(false);
  });

  it('emits validated with the error list', async () => {
    const fixture = TestBed.createComponent(RulesHost);
    await settle(fixture);
    const form = formOf(fixture);
    const seen: { valid: boolean; errors: readonly { field: string }[] }[] = [];
    form.validated.subscribe((e) => seen.push(e));
    form.validate();
    expect(seen.length).toBe(1);
    expect(seen[0].valid).toBe(false);
    expect(seen[0].errors.length).toBe(3);
  });

  it('a native form submit runs the same pipeline', async () => {
    const fixture = TestBed.createComponent(SubmitHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.submitted()).toBe(true);
  });
});

describe('OgeForm — imperative API', () => {
  it('updateData patches one field', async () => {
    const fixture = TestBed.createComponent(RulesHost);
    await settle(fixture);
    formOf(fixture).updateData('code', 'XYZ');
    await settle(fixture);
    expect(fixture.componentInstance.data().code).toBe('XYZ');
  });

  it('itemOption returns the resolved item', async () => {
    const fixture = TestBed.createComponent(RulesHost);
    await settle(fixture);
    const resolved = formOf(fixture).itemOption('quantity');
    expect(resolved?.editorType).toBe('numberBox');
    expect(resolved?.label).toBe('Quantity');
  });

  it('clear empties every editor by dataType', async () => {
    const fixture = TestBed.createComponent(RulesHost);
    await settle(fixture);
    formOf(fixture).clear();
    await settle(fixture);
    expect(fixture.componentInstance.data().code).toBe('');
    expect(fixture.componentInstance.data().quantity).toBeNull();
  });

  it('focus moves to a named field', async () => {
    const fixture = TestBed.createComponent(RulesHost);
    await settle(fixture);
    formOf(fixture).focus('email');
    const el = fixture.nativeElement as HTMLElement;
    expect(document.activeElement).toBe(el.querySelectorAll('input')[1]);
  });
});
