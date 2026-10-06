import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import type { OgeOtpInputType } from '@oge-ui/behavior';
import { OgeOtpInput, type OgeOtpCompletedEvent } from './otp-input';

@Component({
  imports: [OgeOtpInput],
  template: `
    <oge-otp-input
      label="Code"
      locale="en-US"
      [length]="length()"
      [type]="type()"
      [masked]="masked()"
      [groupSize]="groupSize()"
      [readonly]="readonly()"
      [(value)]="value"
      (completed)="completions.push($event)"
    />
  `,
})
class Host {
  readonly value = signal('');
  readonly length = signal(6);
  readonly type = signal<OgeOtpInputType>('numeric');
  readonly masked = signal(false);
  readonly groupSize = signal(0);
  readonly readonly = signal(false);
  readonly completions: OgeOtpCompletedEvent[] = [];
}

@Component({
  imports: [OgeOtpInput, ReactiveFormsModule],
  template: `<oge-otp-input [length]="4" [formControl]="control" />`,
})
class FormHost {
  readonly control = new FormControl('', [
    Validators.required,
    Validators.minLength(4),
  ]);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function cells(fixture: ComponentFixture<unknown>): HTMLInputElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-otp-input-cell'),
  );
}

function type(cell: HTMLInputElement, text: string): void {
  cell.value = text;
  cell.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
}

function key(cell: HTMLInputElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  cell.dispatchEvent(event);
  return event;
}

function paste(cell: HTMLInputElement, text: string): Event {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: () => text },
  });
  cell.dispatchEvent(event);
  return event;
}

describe('OgeOtpInput', () => {
  it('renders a labelled group of named cells with one Tab stop', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const host = fixture.nativeElement.querySelector('.oge-otp-input');
    expect(host.getAttribute('role')).toBe('group');
    const label = fixture.nativeElement.querySelector('.oge-otp-input-label');
    expect(host.getAttribute('aria-labelledby')).toBe(label.id);
    const all = cells(fixture);
    expect(all).toHaveLength(6);
    expect(all[0].getAttribute('autocomplete')).toBe('one-time-code');
    expect(all[1].getAttribute('autocomplete')).toBe('off');
    expect(all[0].getAttribute('inputmode')).toBe('numeric');
    expect(all[2].getAttribute('aria-label')).toBe('Character 3 of 6');
    expect(all.map((cell) => cell.tabIndex)).toEqual([0, -1, -1, -1, -1, -1]);
  });

  it('types, advances and fires completed once', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.length.set(4);
    await settle(fixture);
    for (const digit of ['1', '2', '3', '4']) {
      const target = cells(fixture).find((cell) => cell.tabIndex === 0)!;
      type(target, digit);
      await settle(fixture);
    }
    expect(fixture.componentInstance.value()).toBe('1234');
    expect(fixture.componentInstance.completions.map((c) => c.value)).toEqual([
      '1234',
    ]);
    expect(
      fixture.nativeElement
        .querySelector('.oge-otp-input')
        .classList.contains('oge-otp-input-complete'),
    ).toBe(true);
    expect(cells(fixture)[3].tabIndex).toBe(0);
  });

  it('rejects characters the type does not accept', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(cells(fixture)[0], 'a');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('');
    expect(cells(fixture)[0].value).toBe('');
  });

  it('distributes a paste over the cells', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const event = paste(cells(fixture)[0], '12 34 56');
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.value()).toBe('123456');
    expect(cells(fixture).map((cell) => cell.value)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    expect(fixture.componentInstance.completions).toHaveLength(1);
  });

  it('takes an autofilled code typed into the first cell', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(cells(fixture)[0], '654321');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('654321');
  });

  it('moves back on Backspace and navigates with arrows', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('123');
    await settle(fixture);
    const all = cells(fixture);
    expect(all[3].tabIndex).toBe(0);
    expect(key(all[3], 'Backspace').defaultPrevented).toBe(true);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('12');
    expect(cells(fixture)[2].tabIndex).toBe(0);
    key(cells(fixture)[2], 'ArrowLeft');
    await settle(fixture);
    expect(cells(fixture)[1].tabIndex).toBe(0);
    expect(document.activeElement).toBe(cells(fixture)[1]);
    key(cells(fixture)[1], 'Delete');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('1');
    key(cells(fixture)[1], 'End');
    await settle(fixture);
    expect(cells(fixture)[1].tabIndex).toBe(0);
  });

  it('snaps focus on a cell past the caret back to the first empty one', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('1');
    await settle(fixture);
    cells(fixture)[4].focus();
    await settle(fixture);
    expect(document.activeElement).toBe(cells(fixture)[1]);
  });

  it('masks, uppercases and groups', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.masked.set(true);
    fixture.componentInstance.type.set('alphanumeric');
    fixture.componentInstance.groupSize.set(3);
    await settle(fixture);
    expect(cells(fixture)[0].type).toBe('password');
    expect(cells(fixture)[0].getAttribute('inputmode')).toBe('text');
    expect(
      fixture.nativeElement.querySelectorAll('.oge-otp-input-separator'),
    ).toHaveLength(1);
  });

  it('stays unchanged while read-only', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('12');
    fixture.componentInstance.readonly.set(true);
    await settle(fixture);
    type(cells(fixture)[2], '3');
    key(cells(fixture)[2], 'Backspace');
    paste(cells(fixture)[0], '999999');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('12');
    expect(cells(fixture)[2].value).toBe('');
  });

  it('binds reactive forms with validators and a default group name', async () => {
    const fixture = TestBed.createComponent(FormHost);
    await settle(fixture);
    const host = fixture.nativeElement.querySelector('.oge-otp-input');
    expect(host.getAttribute('aria-label')).toBe('Verification code');
    expect(cells(fixture)).toHaveLength(4);
    paste(cells(fixture)[0], '42');
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toBe('42');
    expect(fixture.componentInstance.control.valid).toBe(false);
    fixture.componentInstance.control.setValue('9876');
    await settle(fixture);
    expect(
      cells(fixture)
        .map((cell) => cell.value)
        .join(''),
    ).toBe('9876');
    expect(fixture.componentInstance.control.valid).toBe(true);
  });
});
