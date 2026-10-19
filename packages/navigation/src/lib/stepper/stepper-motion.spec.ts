import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeStep } from './step';
import { OgeStepper } from './stepper';

@Component({
  imports: [OgeStepper, OgeStep],
  template: `
    <oge-stepper [(activeIndex)]="active">
      <oge-step label="Account" [completed]="true">account</oge-step>
      <oge-step label="Profile">profile</oge-step>
      <oge-step label="Review">review</oge-step>
    </oge-stepper>
  `,
})
class Host {
  readonly active = signal(0);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeStepper motion', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement.querySelector('oge-stepper');
  });

  const phase = (): string =>
    host.classList.contains('oge-stepper-anim-a')
      ? 'a'
      : host.classList.contains('oge-stepper-anim-b')
        ? 'b'
        : '-';

  it('the panel does not fade in on the first render', () => {
    expect(phase()).toBe('-');
  });

  it('every step change replays the fade by swapping keyframes', async () => {
    fixture.componentInstance.active.set(1);
    await settle(fixture);
    expect(phase()).toBe('a');
    fixture.componentInstance.active.set(2);
    await settle(fixture);
    expect(phase()).toBe('b');
    fixture.componentInstance.active.set(1);
    await settle(fixture);
    expect(phase()).toBe('a');
  });

  it('marks the connector out of a completed step for the fill', async () => {
    fixture.componentInstance.active.set(1);
    await settle(fixture);
    const items = host.querySelectorAll('.oge-stepper-item');
    expect(items[0].classList.contains('oge-stepper-item-done')).toBe(true);
    expect(items[1].classList.contains('oge-stepper-item-done')).toBe(false);
  });
});
