import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { disabled, form, required } from '@angular/forms/signals';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeForm } from './form';
import { OgeFormItem } from './form-item';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function inputs(el: HTMLElement): HTMLInputElement[] {
  return Array.from(el.querySelectorAll('input'));
}

async function type(
  fixture: ComponentFixture<unknown>,
  input: HTMLInputElement,
  value: string,
): Promise<void> {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  await settle(fixture);
}

interface Profile extends Record<string, unknown> {
  name: string;
  email: string;
}

@Component({
  selector: 'oge-data-host',
  imports: [OgeForm, OgeFormItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="data">
      <oge-form-item field="name" label="Name" [isRequired]="true" />
      <oge-form-item field="email" label="Email" />
    </oge-form>
  `,
})
class DataHost {
  readonly data = signal<Profile>({ name: '', email: '' });
}

@Component({
  selector: 'oge-tree-host',
  imports: [OgeForm, OgeFormItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [fieldTree]="f">
      <oge-form-item field="name" label="Name" />
      <oge-form-item field="email" label="Email" />
    </oge-form>
  `,
})
class TreeHost {
  readonly model = signal<Profile>({ name: 'Ada', email: '' });
  readonly f = form(this.model, (p) => {
    required(p.name);
    disabled(p.email, () => true);
  });
}

@Component({
  selector: 'oge-group-binding-host',
  imports: [OgeForm, OgeFormItem, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [formGroup]="fg">
      <oge-form-item field="name" label="Name" />
      <oge-form-item field="email" label="Email" [disabled]="true" />
    </oge-form>
  `,
})
class GroupBindingHost {
  readonly fg = new FormGroup({
    name: new FormControl('Grace', Validators.required),
    email: new FormControl(''),
  });
}

describe('OgeForm — [(formData)] binding', () => {
  it('seeds the editors from the model', async () => {
    const fixture = TestBed.createComponent(DataHost);
    fixture.componentInstance.data.set({ name: 'Ada', email: 'a@b.c' });
    await settle(fixture);
    expect(inputs(fixture.nativeElement).map((i) => i.value)).toEqual([
      'Ada',
      'a@b.c',
    ]);
  });

  it('writes edits back through the two-way model', async () => {
    const fixture = TestBed.createComponent(DataHost);
    await settle(fixture);
    await type(fixture, inputs(fixture.nativeElement)[0], 'Grace');
    expect(fixture.componentInstance.data().name).toBe('Grace');
  });

  it('emits fieldChanged with the previous value', async () => {
    const fixture = TestBed.createComponent(DataHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    const seen: { field: string; value: unknown; previousValue: unknown }[] =
      [];
    form.fieldChanged.subscribe((e) => seen.push(e));
    await type(fixture, inputs(fixture.nativeElement)[0], 'Grace');
    expect(seen).toEqual([
      { field: 'name', value: 'Grace', previousValue: '' },
    ]);
  });

  it('compiles isRequired into a real validation error', async () => {
    const fixture = TestBed.createComponent(DataHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    expect(form.valid()).toBe(false);
    expect(form.errors()[0].field).toBe('name');
    await type(fixture, inputs(fixture.nativeElement)[0], 'Grace');
    expect(form.valid()).toBe(true);
  });
});

describe('OgeForm — [fieldTree] binding', () => {
  it('reports the fieldTree mode and seeds from the tree', async () => {
    const fixture = TestBed.createComponent(TreeHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    expect(form.mode()).toBe('fieldTree');
    expect(inputs(fixture.nativeElement)[0].value).toBe('Ada');
  });

  it('lets the schema own disabled state', async () => {
    const fixture = TestBed.createComponent(TreeHost);
    await settle(fixture);
    const [name, email] = inputs(fixture.nativeElement);
    expect(name.disabled).toBe(false);
    expect(email.disabled).toBe(true);
  });

  it('emits fieldChanged in fieldTree mode too', async () => {
    const fixture = TestBed.createComponent(TreeHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    const seen: { field: string; previousValue: unknown }[] = [];
    form.fieldChanged.subscribe((e) => seen.push(e));
    await type(fixture, inputs(fixture.nativeElement)[0], 'Grace');
    expect(seen).toEqual([
      { field: 'name', value: 'Grace', previousValue: 'Ada' },
    ]);
  });

  it('writes edits into the caller-owned model', async () => {
    const fixture = TestBed.createComponent(TreeHost);
    await settle(fixture);
    await type(fixture, inputs(fixture.nativeElement)[0], 'Grace');
    expect(fixture.componentInstance.model().name).toBe('Grace');
  });
});

describe('OgeForm — [formGroup] binding', () => {
  it('reports the formGroup mode and seeds from the controls', async () => {
    const fixture = TestBed.createComponent(GroupBindingHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    expect(form.mode()).toBe('formGroup');
    expect(inputs(fixture.nativeElement)[0].value).toBe('Grace');
  });

  it('honours a template [disabled] binding, which formField would clobber', async () => {
    const fixture = TestBed.createComponent(GroupBindingHost);
    await settle(fixture);
    expect(inputs(fixture.nativeElement)[1].disabled).toBe(true);
  });

  it('writes edits into the FormControl', async () => {
    const fixture = TestBed.createComponent(GroupBindingHost);
    await settle(fixture);
    await type(fixture, inputs(fixture.nativeElement)[0], 'Ada');
    expect(fixture.componentInstance.fg.value.name).toBe('Ada');
  });

  it('emits fieldChanged in formGroup mode too', async () => {
    const fixture = TestBed.createComponent(GroupBindingHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    const seen: { field: string }[] = [];
    form.fieldChanged.subscribe((e) => seen.push(e));
    await type(fixture, inputs(fixture.nativeElement)[0], 'Ada');
    expect(seen.map((e) => e.field)).toEqual(['name']);
  });

  it('reports dirty once a control has been edited', async () => {
    const fixture = TestBed.createComponent(GroupBindingHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    expect(form.dirty()).toBe(false);
    await type(fixture, inputs(fixture.nativeElement)[0], 'Ada');
    expect(form.dirty()).toBe(true);
  });

  it('surfaces the control validators as form errors', async () => {
    const fixture = TestBed.createComponent(GroupBindingHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    expect(form.valid()).toBe(true);
    await type(fixture, inputs(fixture.nativeElement)[0], '');
    expect(form.valid()).toBe(false);
    expect(form.errors()[0].field).toBe('name');
  });
});
