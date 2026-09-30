import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { OgeTextArea } from './text-area';
import { OgeTextBox } from '../text-box/text-box';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeTextArea, OgeTextBox, FormField],
  template: `
    <oge-text-area [formField]="f.note" label="Note" [showCounter]="true" />
    <oge-text-box [formField]="f.code" label="Code" [showCounter]="true" />
  `,
})
class Host {
  readonly model = signal({ note: 'abc', code: '' });
  readonly f = form(this.model, (p) => {
    maxLength(p.note, 20);
    maxLength(p.code, 8);
  });
}

describe('text fields under [formField]: schema maxLength', () => {
  it('drives the counter and the native maxlength without a [maxLength] binding', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const area = el.querySelector('oge-text-area') as HTMLElement;
    const box = el.querySelector('oge-text-box') as HTMLElement;
    expect(area.textContent).toContain('3/20');
    expect(box.textContent).toContain('0/8');
    expect(area.querySelector('textarea')?.getAttribute('maxlength')).toBe(
      '20',
    );
    expect(box.querySelector('input')?.getAttribute('maxlength')).toBe('8');
  });
});
