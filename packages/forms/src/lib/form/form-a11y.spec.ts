import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeForm } from './form';
import { OgeFormGroup } from './form-group';
import { OgeFormItem } from './form-item';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

interface Signup extends Record<string, unknown> {
  name: string;
  email: string;
  terms: boolean;
}

@Component({
  selector: 'oge-a11y-host',
  imports: [OgeForm, OgeFormItem, OgeFormGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form
      [(formData)]="data"
      [labelLocation]="labelLocation()"
      [showValidationSummary]="true"
      [scrollToFirstInvalid]="false"
    >
      <oge-form-group caption="Account">
        <oge-form-item field="name" label="Name" [isRequired]="true" />
        <oge-form-item field="email" label="Email" [isRequired]="true" />
      </oge-form-group>
      <oge-form-item
        field="terms"
        label="Accept terms"
        hint="Required to continue"
      />
    </oge-form>
  `,
})
class A11yHost {
  readonly data = signal<Signup>({ name: '', email: '', terms: false });
  readonly labelLocation = signal<'top' | 'start'>('start');
}

describe('OgeForm — accessibility', () => {
  it('wraps a group in a fieldset with a real legend', async () => {
    const fixture = TestBed.createComponent(A11yHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const legend = el.querySelector('fieldset.oge-form-group > legend');
    expect(legend?.tagName).toBe('LEGEND');
    expect(legend?.textContent?.trim()).toBe('Account');
  });

  it('associates each side label with its control through for/id', async () => {
    const fixture = TestBed.createComponent(A11yHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const label = el.querySelector<HTMLLabelElement>('.oge-form-label');
    expect(label?.htmlFor).toBeTruthy();
    expect(el.querySelector(`#${label?.htmlFor}`)).toBeTruthy();
  });

  it('marks a required field visually and for screen readers', async () => {
    const fixture = TestBed.createComponent(A11yHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const label = el.querySelector<HTMLElement>('.oge-form-label');
    expect(
      label
        ?.querySelector('.oge-form-required-mark')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(label?.querySelector('.oge-sr-only')?.textContent).toBe('required');
  });

  it('renders the label itself only for side layouts and bare controls', async () => {
    const fixture = TestBed.createComponent(A11yHost);
    fixture.componentInstance.labelLocation.set('top');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    // only the bare check box still needs a form-drawn label
    expect(el.querySelectorAll('.oge-form-label').length).toBe(1);
    expect(
      el.querySelector('.oge-form-field-bare .oge-form-label'),
    ).toBeTruthy();
  });

  it('gives a bare control the hint chrome its editor does not render', async () => {
    const fixture = TestBed.createComponent(A11yHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const bare = el.querySelector('.oge-form-field-bare');
    expect(bare?.querySelector('.oge-form-hint')?.textContent).toBe(
      'Required to continue',
    );
  });

  it('announces the summary and links every invalid field after a failed submit', async () => {
    const fixture = TestBed.createComponent(A11yHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('oge-validation-summary')).toBeNull();

    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    await form.submit();
    await settle(fixture);

    const summary = el.querySelector('oge-validation-summary');
    expect(summary?.getAttribute('role')).toBe('alert');
    const links = Array.from(
      summary?.querySelectorAll('.oge-validation-summary-link') ?? [],
    );
    expect(links.length).toBe(2);
    expect(links[0].textContent).toContain('Name');
  });

  it('moves focus to the first invalid field on a failed submit', async () => {
    const fixture = TestBed.createComponent(A11yHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    const ok = await form.submit();
    await settle(fixture);

    expect(ok).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    const firstInput = el.querySelector('input');
    expect(document.activeElement).toBe(firstInput);
  });

  it('focuses the field a summary row points at', async () => {
    const fixture = TestBed.createComponent(A11yHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    await form.submit();
    await settle(fixture);

    const el = fixture.nativeElement as HTMLElement;
    const links = el.querySelectorAll<HTMLButtonElement>(
      '.oge-validation-summary-link',
    );
    links[1].click();
    await settle(fixture);
    expect(document.activeElement).toBe(el.querySelectorAll('input')[1]);
  });
});
