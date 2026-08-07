import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeRadioGroup } from './radio-group';

interface Plan {
  id: string;
  name: string;
  soldOut?: boolean;
}

const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter' },
  { id: 'team', name: 'Team' },
  { id: 'scale', name: 'Scale', soldOut: true },
  { id: 'enterprise', name: 'Enterprise' },
];

@Component({
  imports: [OgeRadioGroup],
  template: `
    <oge-radio-group
      label="Plan"
      [items]="items()"
      displayExpr="name"
      valueExpr="id"
      disabledExpr="soldOut"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly items = signal<Plan[]>(PLANS);
  readonly value = signal<unknown>(null);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function radios(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.oge-radio'));
}

function press(fixture: ComponentFixture<unknown>, key: string): void {
  fixture.nativeElement
    .querySelector('.oge-radio-group')
    .dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }),
    );
}

describe('OgeRadioGroup keyboard', () => {
  it('arrows move focus AND selection, skipping disabled items', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('team');
    await settle(fixture);
    press(fixture, 'ArrowDown'); // Scale is disabled → jumps to Enterprise
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('enterprise');
    expect(document.activeElement).toBe(radios(fixture)[3]);
    press(fixture, 'ArrowUp');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('team');
  });

  it('wraps at the edges in both directions', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('enterprise');
    await settle(fixture);
    press(fixture, 'ArrowRight');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('starter'); // wrapped
    press(fixture, 'ArrowLeft');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('enterprise'); // wrapped back
  });

  it('Home and End jump to the first/last enabled item and select it', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('team');
    await settle(fixture);
    press(fixture, 'End'); // Scale disabled → Enterprise is the last enabled
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('enterprise');
    press(fixture, 'Home');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('starter');
  });

  it('with no selection, the first arrow moves off the first enabled item', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    press(fixture, 'ArrowDown');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('team');
  });
});
