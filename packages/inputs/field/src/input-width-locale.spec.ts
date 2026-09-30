import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOgeInputsConfig } from './config';
import { OgeNumberBox } from '../../number-box/src/number-box';
import { OgeTextBox } from '../../text-box/src/text-box';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeTextBox, OgeNumberBox],
  template: `
    <oge-text-box label="A" [width]="width()" />
    <oge-number-box label="Amount" [(value)]="amount" />
  `,
})
class Host {
  readonly width = signal<number | string | undefined>(160);
  readonly amount = signal<number | null>(null);
}

describe('input [width] and the config locale', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideOgeInputsConfig({ locale: 'tr-TR' })],
    }),
  );

  it('[width] sets --oge-input-width on that host only', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const box = (fixture.nativeElement as HTMLElement).querySelector(
      'oge-text-box',
    ) as HTMLElement;
    expect(box.style.getPropertyValue('--oge-input-width')).toBe('160px');
    fixture.componentInstance.width.set('12rem');
    await settle(fixture);
    expect(box.style.getPropertyValue('--oge-input-width')).toBe('12rem');
    fixture.componentInstance.width.set(undefined);
    await settle(fixture);
    expect(box.style.getPropertyValue('--oge-input-width')).toBe('');
  });

  it('the number box parses with provideOgeInputsConfig({ locale })', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const input = (fixture.nativeElement as HTMLElement).querySelector(
      'oge-number-box input',
    ) as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    input.value = '1.250,50';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur'));
    await settle(fixture);
    expect(fixture.componentInstance.amount()).toBe(1250.5);
  });
});
