import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { OgeForm } from './form';
import { OgeFormGroup } from './form-group';
import { OgeFormItem } from './form-item';
import { OgeFormSteps } from './form-sections';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

interface Order extends Record<string, unknown> {
  email: string;
  card: string;
}

@Component({
  selector: 'oge-steps-data-host',
  imports: [OgeForm, OgeFormItem, OgeFormGroup, OgeFormSteps],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="order">
      <oge-form-steps [linear]="linear()">
        <oge-form-group caption="Account">
          <oge-form-item field="email" label="E-mail" [isRequired]="true" />
        </oge-form-group>
        <oge-form-group caption="Payment">
          <oge-form-item field="card" label="Card" [isRequired]="true" />
        </oge-form-group>
      </oge-form-steps>
    </oge-form>
  `,
})
class StepsDataHost {
  readonly linear = signal(true);
  readonly order = signal<Order>({ email: '', card: '' });
}

@Component({
  selector: 'oge-steps-group-host',
  imports: [OgeForm, OgeFormItem, OgeFormGroup, OgeFormSteps],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [formGroup]="group">
      <oge-form-steps [linear]="true">
        <oge-form-group caption="Account">
          <oge-form-item field="email" label="E-mail" />
        </oge-form-group>
        <oge-form-group caption="Payment">
          <oge-form-item field="card" label="Card" />
        </oge-form-group>
      </oge-form-steps>
    </oge-form>
  `,
})
class StepsGroupHost {
  readonly group = new FormGroup({
    email: new FormControl('', Validators.required),
    card: new FormControl('', Validators.required),
  });
}

function dom(fixture: ComponentFixture<unknown>) {
  const el = fixture.nativeElement as HTMLElement;
  return {
    stepper: () => el.querySelector('oge-stepper') as HTMLElement,
    headers: () =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('.oge-stepper-header')),
    next: () => el.querySelector('.oge-stepper-nav-next') as HTMLButtonElement,
    labels: () =>
      Array.from(el.querySelectorAll('.oge-stepper-label')).map((n) =>
        n.textContent?.trim(),
      ),
    errors: () =>
      Array.from(el.querySelectorAll('.oge-input-error')).map((n) =>
        n.textContent?.trim(),
      ),
  };
}

describe('<oge-form-steps> — wraps the stepper rather than copying it', () => {
  it('renders one real oge-stepper with a step per group', async () => {
    const fixture = TestBed.createComponent(StepsDataHost);
    await settle(fixture);
    const { stepper, headers, labels } = dom(fixture);
    expect(stepper()).not.toBeNull();
    expect(labels()).toEqual(['Account', 'Payment']);
    expect(headers().length).toBe(2);
    // the stepper's own semantics come through unchanged
    expect(headers()[0].getAttribute('aria-current')).toBe('step');
  });

  it('derives step completion from the form errors in formData mode', async () => {
    const fixture = TestBed.createComponent(StepsDataHost);
    await settle(fixture);
    const { headers, next } = dom(fixture);

    // step 1's required field is empty, so linear must not let it through
    next().click();
    await settle(fixture);
    expect(headers()[0].getAttribute('aria-current')).toBe('step');

    fixture.componentInstance.order.set({ email: 'a@b.co', card: '' });
    await settle(fixture);
    next().click();
    await settle(fixture);
    expect(headers()[1].getAttribute('aria-current')).toBe('step');
  });

  it('derives step completion the same way in formGroup mode', async () => {
    const fixture = TestBed.createComponent(StepsGroupHost);
    await settle(fixture);
    const { headers, next } = dom(fixture);

    next().click();
    await settle(fixture);
    expect(headers()[0].getAttribute('aria-current')).toBe('step');

    // the controlRevision bridge is what makes this recompute at all
    fixture.componentInstance.group.controls.email.setValue('a@b.co');
    await settle(fixture);
    next().click();
    await settle(fixture);
    expect(headers()[1].getAttribute('aria-current')).toBe('step');
  });

  it('flags a step that holds an invalid field', async () => {
    const fixture = TestBed.createComponent(StepsDataHost);
    await settle(fixture);
    expect(dom(fixture).headers()[0].getAttribute('data-state')).toBe('error');

    fixture.componentInstance.order.set({ email: 'a@b.co', card: 'x' });
    await settle(fixture);
    // active outranks done, and step 2 is now complete
    expect(dom(fixture).headers()[0].getAttribute('data-state')).toBe('active');
    expect(dom(fixture).headers()[1].getAttribute('data-state')).toBe('done');
  });

  it('touches only the step being left, so the next one stays quiet', async () => {
    const fixture = TestBed.createComponent(StepsDataHost);
    fixture.componentInstance.linear.set(false);
    await settle(fixture);
    const { next, errors } = dom(fixture);

    // nothing has been touched yet, so nothing is shown
    expect(errors()).toEqual([]);

    next().click();
    await settle(fixture);

    // step 1's field is now touched and complains; step 2's does not, even
    // though it is just as empty — markAllAsTouched would have lit both
    expect(errors().length).toBe(1);
  });

  it('a failed submit reveals the step holding the first invalid field', async () => {
    const fixture = TestBed.createComponent(StepsDataHost);
    fixture.componentInstance.linear.set(false);
    fixture.componentInstance.order.set({ email: 'a@b.co', card: '' });
    await settle(fixture);
    const { headers } = dom(fixture);

    // jump to step 1 and submit: the invalid field is on step 2
    const form = (fixture.nativeElement as HTMLElement).querySelector(
      'oge-form',
    ) as HTMLElement;
    expect(headers()[0].getAttribute('aria-current')).toBe('step');

    const instance = fixture.debugElement.children[0].componentInstance as {
      submit: () => Promise<boolean>;
    };
    await instance.submit();
    await settle(fixture);
    expect(form).not.toBeNull();
    expect(headers()[1].getAttribute('aria-current')).toBe('step');
  });
});
