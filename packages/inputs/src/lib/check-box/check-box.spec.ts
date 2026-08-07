import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OgeCheckBox } from './check-box';
import type { OgeInputValueCommittedEvent } from '../field/input-types';

@Component({
  imports: [OgeCheckBox],
  template: `
    <oge-check-box
      [threeState]="threeState()"
      [readonly]="readonly()"
      [(value)]="value"
      (valueCommitted)="commits.push($event)"
    >
      Accept terms
    </oge-check-box>
  `,
})
class Host {
  readonly value = signal<boolean | null>(false);
  readonly threeState = signal(false);
  readonly readonly = signal(false);
  readonly commits: OgeInputValueCommittedEvent<boolean | null>[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function nativeInput(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('.oge-check-box-input');
}

function click(fixture: ComponentFixture<unknown>): void {
  nativeInput(fixture).click();
}

describe('OgeCheckBox', () => {
  it('renders the projected label and toggles on click with a rich commit payload', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(
      fixture.nativeElement
        .querySelector('.oge-check-box-text')
        .textContent.trim(),
    ).toBe('Accept terms');
    click(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(true);
    expect(nativeInput(fixture).checked).toBe(true);
    expect(fixture.componentInstance.commits.at(-1)).toMatchObject({
      value: true,
      previousValue: false,
    });
    click(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(false);
  });

  it('threeState cycles null → true → false → null and mirrors the indeterminate property', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.threeState.set(true);
    fixture.componentInstance.value.set(null);
    await settle(fixture);
    expect(nativeInput(fixture).indeterminate).toBe(true);
    click(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(true);
    expect(nativeInput(fixture).indeterminate).toBe(false);
    click(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(false);
    click(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(nativeInput(fixture).indeterminate).toBe(true);
  });

  it('renders the indeterminate state for value null even without threeState', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(null);
    await settle(fixture);
    expect(nativeInput(fixture).indeterminate).toBe(true);
    expect(
      fixture.nativeElement.querySelector('.oge-check-box-indeterminate'),
    ).toBeTruthy();
    // a user click resolves it to checked (two-state next from null is true)
    click(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(true);
  });

  it('readonly blocks user toggling but keeps focusability', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.readonly.set(true);
    await settle(fixture);
    click(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(false);
    expect(nativeInput(fixture).disabled).toBe(false);
  });

  it('binds through reactive forms via the CVA constructor-assignment pattern', async () => {
    @Component({
      imports: [OgeCheckBox, ReactiveFormsModule],
      template: `<oge-check-box [formControl]="control" text="Agree" />`,
    })
    class FormHost {
      readonly control = new FormControl<boolean | null>(false, {
        nonNullable: false,
      });
    }
    const fixture = TestBed.createComponent(FormHost);
    await settle(fixture);
    click(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toBe(true);
    expect(fixture.componentInstance.control.dirty).toBe(true);
    fixture.componentInstance.control.setValue(null);
    await settle(fixture);
    expect(nativeInput(fixture).indeterminate).toBe(true);
  });

  it('text input wins over the projected content', async () => {
    @Component({
      imports: [OgeCheckBox],
      template: `<oge-check-box text="From input">Projected</oge-check-box>`,
    })
    class TextHost {}
    const fixture = TestBed.createComponent(TextHost);
    await settle(fixture);
    expect(
      fixture.nativeElement
        .querySelector('.oge-check-box-text')
        .textContent.trim(),
    ).toBe('From input');
  });
});
