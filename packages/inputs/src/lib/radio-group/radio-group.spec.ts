import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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

describe('OgeRadioGroup', () => {
  it('renders a radiogroup of role=radio buttons with mapped display text', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const group = fixture.nativeElement.querySelector('.oge-radio-group');
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Plan');
    const buttons = radios(fixture);
    expect(buttons.length).toBe(4);
    expect(buttons.map((b) => b.getAttribute('role'))).toEqual([
      'radio',
      'radio',
      'radio',
      'radio',
    ]);
    expect(buttons[0].textContent?.trim()).toBe('Starter');
    expect(buttons[2].disabled).toBe(true); // disabledExpr
  });

  it('click selects (valueExpr result), cannot unselect, and checks aria state', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    radios(fixture)[1].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('team');
    expect(radios(fixture)[1].getAttribute('aria-checked')).toBe('true');
    expect(radios(fixture)[0].getAttribute('aria-checked')).toBe('false');
    radios(fixture)[1].click(); // radios can't unselect
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('team');
  });

  it('keeps a single roving tabindex anchored on the selection', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    // nothing selected → first enabled item is the target
    expect(radios(fixture).map((b) => b.tabIndex)).toEqual([0, -1, -1, -1]);
    fixture.componentInstance.value.set('enterprise');
    await settle(fixture);
    expect(radios(fixture).map((b) => b.tabIndex)).toEqual([-1, -1, -1, 0]);
  });

  it('binds through reactive forms and reports touched on leaving the group', async () => {
    @Component({
      imports: [OgeRadioGroup, ReactiveFormsModule],
      template: `
        <oge-radio-group
          [items]="items"
          displayExpr="name"
          valueExpr="id"
          [formControl]="control"
        />
      `,
    })
    class FormHost {
      readonly items = PLANS;
      readonly control = new FormControl<string | null>(null);
    }
    const fixture = TestBed.createComponent(FormHost);
    await settle(fixture);
    radios(fixture)[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toBe('starter');
    const first = radios(fixture)[0];
    first.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.control.touched).toBe(true);
  });
});
