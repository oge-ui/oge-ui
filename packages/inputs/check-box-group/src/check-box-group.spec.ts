import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, form, minLength } from '@angular/forms/signals';
import { OgeCheckBoxGroup } from './check-box-group';

interface Channel {
  id: string;
  name: string;
  locked?: boolean;
}

const CHANNELS: Channel[] = [
  { id: 'mail', name: 'E-mail' },
  { id: 'sms', name: 'SMS' },
  { id: 'push', name: 'Push', locked: true },
  { id: 'call', name: 'Phone call' },
];

@Component({
  imports: [OgeCheckBoxGroup],
  template: `
    <oge-check-box-group
      label="Notify me by"
      hint="Pick any"
      [items]="items"
      displayExpr="name"
      valueExpr="id"
      disabledExpr="locked"
      [layout]="layout()"
      [showSelectAll]="true"
      [(value)]="value"
      (itemClick)="clicks.push($event.checked)"
    />
  `,
})
class Host {
  readonly items = CHANNELS;
  readonly layout = signal<'vertical' | 'horizontal' | 'columns'>('vertical');
  readonly value = signal<readonly unknown[]>([]);
  readonly clicks: boolean[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function boxes(fixture: ComponentFixture<unknown>): HTMLInputElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll(
      '.oge-check-box-group-item .oge-check-box-input',
    ),
  );
}

function selectAll(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector(
    '.oge-check-box-group-select-all .oge-check-box-input',
  );
}

describe('OgeCheckBoxGroup', () => {
  it('renders a labelled group of native check boxes with a hint', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const group: HTMLElement = fixture.nativeElement.querySelector(
      '.oge-check-box-group',
    );
    expect(group.getAttribute('role')).toBe('group');
    const label = group.querySelector('.oge-check-box-group-label');
    expect(label?.textContent?.trim()).toBe('Notify me by');
    expect(group.getAttribute('aria-labelledby')).toBe(label?.id);
    const hint = group.querySelector('.oge-check-box-group-subscript');
    expect(hint?.textContent?.trim()).toBe('Pick any');
    expect(group.getAttribute('aria-describedby')).toBe(hint?.id);
    const inputs = boxes(fixture);
    expect(inputs).toHaveLength(4);
    expect(inputs[2].disabled).toBe(true);
    expect(
      Array.from(group.querySelectorAll('.oge-check-box-group-item')).map(
        (el) => el.textContent?.trim(),
      ),
    ).toEqual(['E-mail', 'SMS', 'Push', 'Phone call']);
  });

  it('commits the checked values in items order, not click order', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    boxes(fixture)[3].click();
    await settle(fixture);
    boxes(fixture)[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(['mail', 'call']);
    expect(fixture.componentInstance.clicks).toEqual([true, true]);
    boxes(fixture)[3].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(['mail']);
    expect(boxes(fixture)[0].checked).toBe(true);
    expect(boxes(fixture)[3].checked).toBe(false);
  });

  it('select all is tri-state over the enabled items and spares disabled ones', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(['push']);
    await settle(fixture);
    // 'push' is locked + checked: none of the enabled items is checked yet
    expect(selectAll(fixture).checked).toBe(false);
    expect(selectAll(fixture).indeterminate).toBe(false);

    boxes(fixture)[0].click();
    await settle(fixture);
    expect(selectAll(fixture).indeterminate).toBe(true);

    selectAll(fixture).click(); // mixed → all
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([
      'mail',
      'sms',
      'push',
      'call',
    ]);
    expect(selectAll(fixture).checked).toBe(true);

    selectAll(fixture).click(); // all → none (the locked one stays)
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(['push']);
  });

  it('applies the columns layout through a custom property', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.layout.set('columns');
    await settle(fixture);
    const group: HTMLElement = fixture.nativeElement.querySelector(
      '.oge-check-box-group',
    );
    expect(group.classList).toContain('oge-check-box-group-columns');
    expect(group.style.getPropertyValue('--oge-check-box-group-columns')).toBe(
      '2',
    );
  });

  it('exposes selectAll() / unselectAll()', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const group = fixture.debugElement.children[0]
      .componentInstance as OgeCheckBoxGroup;
    group.selectAll();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(['mail', 'sms', 'call']);
    group.unselectAll();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([]);
  });

  describe('forms', () => {
    @Component({
      imports: [OgeCheckBoxGroup, ReactiveFormsModule],
      template: `
        <oge-check-box-group
          label="Channels"
          [items]="items"
          displayExpr="name"
          valueExpr="id"
          [formControl]="control"
        />
      `,
    })
    class CvaHost {
      readonly items = CHANNELS;
      readonly control = new FormControl<string[]>([], {
        nonNullable: true,
        validators: [Validators.required],
      });
    }

    it('binds a reactive control and shows "required" once touched', async () => {
      const fixture = TestBed.createComponent(CvaHost);
      await settle(fixture);
      const control = fixture.componentInstance.control;
      expect(control.invalid).toBe(true);
      const input = boxes(fixture)[1];
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await settle(fixture);
      expect(control.touched).toBe(true);
      const error = fixture.nativeElement.querySelector(
        '.oge-check-box-group-error',
      );
      expect(error?.textContent?.trim()).toBe('This field is required');

      input.click();
      await settle(fixture);
      expect(control.value).toEqual(['sms']);
      expect(control.valid).toBe(true);

      control.setValue(['mail', 'call']);
      await settle(fixture);
      expect(boxes(fixture).map((box) => box.checked)).toEqual([
        true,
        false,
        false,
        true,
      ]);

      control.disable();
      await settle(fixture);
      expect(boxes(fixture).every((box) => box.disabled)).toBe(true);
    });

    @Component({
      imports: [OgeCheckBoxGroup, FormField],
      template: `
        <oge-check-box-group
          label="Channels"
          [items]="items"
          displayExpr="name"
          valueExpr="id"
          [formField]="f.channels"
        />
      `,
    })
    class SignalHost {
      readonly items = CHANNELS;
      readonly model = signal<{ channels: readonly unknown[] }>({
        channels: ['sms'],
      });
      readonly f = form(this.model, (p) => {
        // Signal Forms' required() treats [] as a value — "at least one"
        // is minLength(…, 1) with its own message
        minLength(p.channels, 1, { message: 'Pick at least one channel' });
      });
    }

    it('binds a Signal Forms field', async () => {
      const fixture = TestBed.createComponent(SignalHost);
      await settle(fixture);
      expect(boxes(fixture)[1].checked).toBe(true);
      boxes(fixture)[0].click();
      await settle(fixture);
      expect(fixture.componentInstance.model().channels).toEqual([
        'mail',
        'sms',
      ]);
      boxes(fixture)[0].click();
      boxes(fixture)[1].click();
      await settle(fixture);
      expect(fixture.componentInstance.f.channels().invalid()).toBe(true);
      fixture.componentInstance.f.channels().markAsTouched();
      await settle(fixture);
      expect(
        fixture.nativeElement
          .querySelector('.oge-check-box-group-error')
          ?.textContent?.trim(),
      ).toBe('Pick at least one channel');
    });
  });
});
