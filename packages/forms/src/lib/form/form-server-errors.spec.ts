import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { form } from '@angular/forms/signals';
import { OgeForm } from './form';
import type { OgeFormItemData } from './form-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 2; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  fixture.detectChanges();
}

interface Account extends Record<string, unknown> {
  kind: string;
  vat: string;
  email: string;
  password: string;
  confirm: string;
}

@Component({
  imports: [OgeForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form
      [(formData)]="data"
      [items]="items"
      [showValidationSummary]="true"
      [scrollToFirstInvalid]="false"
    />
  `,
})
class DataHost {
  readonly form = viewChild.required(OgeForm);
  readonly data = signal<Account>({
    kind: 'person',
    vat: '',
    email: 'taken@example.com',
    password: 'secret',
    confirm: 'secret',
  });
  readonly items: readonly OgeFormItemData[] = [
    { field: 'kind', label: 'Kind' },
    {
      field: 'vat',
      label: 'VAT number',
      visibleWhen: { field: 'kind', equals: 'company' },
      requiredWhen: { field: 'kind', equals: 'company' },
    },
    { field: 'email', label: 'Email' },
    { field: 'password', label: 'Password' },
    {
      field: 'confirm',
      label: 'Confirm',
      validationRules: [{ type: 'compare', comparisonTarget: 'password' }],
    },
  ];
}

@Component({
  imports: [OgeForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<oge-form [formGroup]="group" [items]="items" />`,
})
class GroupHost {
  readonly form = viewChild.required(OgeForm);
  readonly group = new FormGroup({ email: new FormControl('a@b.c') });
  readonly items: readonly OgeFormItemData[] = [{ field: 'email' }];
}

@Component({
  imports: [OgeForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<oge-form [fieldTree]="tree" [items]="items" />`,
})
class TreeHost {
  readonly form = viewChild.required(OgeForm);
  readonly model = signal({ email: 'a@b.c' });
  readonly tree = form(this.model);
  readonly items: readonly OgeFormItemData[] = [{ field: 'email' }];
}

const labels = (fixture: ComponentFixture<unknown>) =>
  Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.oge-form-label, .oge-input-label',
    ),
  ).map((el) => el.textContent?.replaceAll('*', '').trim());

describe('OgeForm conditions, compare rule and server errors', () => {
  it('visibleWhen hides an item (and its validation) until the condition holds', async () => {
    const fixture = TestBed.createComponent(DataHost);
    await settle(fixture);
    const host = fixture.componentInstance;
    expect(labels(fixture)).not.toContain('VAT number');
    expect(host.form().valid()).toBe(true);
    host.data.update((d) => ({ ...d, kind: 'company' }));
    await settle(fixture);
    expect(labels(fixture)).toContain('VAT number');
    // requiredWhen now holds and the field is empty
    expect(
      host
        .form()
        .errors()
        .map((e) => e.field),
    ).toEqual(['vat']);
    expect(host.form().itemOption('vat')?.required).toBe(true);
  });

  it('the compare rule fails a mismatching confirmation', async () => {
    const fixture = TestBed.createComponent(DataHost);
    await settle(fixture);
    const host = fixture.componentInstance;
    host.data.update((d) => ({ ...d, confirm: 'secreT' }));
    await settle(fixture);
    expect(host.form().errors()).toEqual([
      {
        field: 'confirm',
        label: 'Confirm',
        message: 'The values do not match',
      },
    ]);
    host.data.update((d) => ({ ...d, password: 'secreT' }));
    await settle(fixture);
    expect(host.form().valid()).toBe(true);
  });

  it('setErrors shows server errors in the field and summary; an edit clears them', async () => {
    const fixture = TestBed.createComponent(DataHost);
    await settle(fixture);
    const host = fixture.componentInstance;
    host.form().setErrors({ email: ['Email is already registered'] });
    await settle(fixture);
    expect(host.form().valid()).toBe(false);
    expect(host.form().errors()[0]).toMatchObject({
      field: 'email',
      message: 'Email is already registered',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Email is already registered',
    );
    host.data.update((d) => ({ ...d, email: 'fresh@example.com' }));
    await settle(fixture);
    expect(host.form().valid()).toBe(true);
    host.form().setFieldErrors('password', 'Too weak');
    await settle(fixture);
    expect(
      host
        .form()
        .errors()
        .map((e) => e.field),
    ).toEqual(['password']);
    host.form().clearErrors();
    await settle(fixture);
    expect(host.form().valid()).toBe(true);
  });

  it('fieldTree mode hands them to Signal Forms as submission errors', async () => {
    const fixture = TestBed.createComponent(TreeHost);
    await settle(fixture);
    const host = fixture.componentInstance;
    host.form().setErrors({ email: 'Taken' });
    await settle(fixture);
    expect(host.tree.email().errors()).toEqual([
      expect.objectContaining({ kind: 'server', message: 'Taken' }),
    ]);
    host.model.set({ email: 'new@b.c' });
    await settle(fixture);
    expect(host.tree.email().errors()).toEqual([]);
    expect(host.form().valid()).toBe(true);
  });

  it('formGroup mode puts server errors on the control', async () => {
    const fixture = TestBed.createComponent(GroupHost);
    await settle(fixture);
    const host = fixture.componentInstance;
    host.form().setErrors({ email: 'Taken' });
    await settle(fixture);
    expect(host.group.get('email')?.errors).toEqual({ server: 'Taken' });
    expect(host.form().errors()[0].message).toBe('Taken');
    host.form().clearErrors('email');
    await settle(fixture);
    expect(host.group.get('email')?.errors).toBeNull();
  });
});
