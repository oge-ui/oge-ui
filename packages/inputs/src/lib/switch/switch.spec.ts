import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideOgeInputsConfig } from '../config';
import { OgeSwitch } from './switch';

@Component({
  imports: [OgeSwitch],
  template: `
    <oge-switch
      label="Notifications"
      [onText]="onText()"
      [offText]="offText()"
      [readonly]="readonly()"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly value = signal(false);
  readonly onText = signal<string | undefined>(undefined);
  readonly offText = signal<string | undefined>(undefined);
  readonly readonly = signal(false);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function button(fixture: ComponentFixture<unknown>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('.oge-switch-button');
}

function trackText(fixture: ComponentFixture<unknown>): string | undefined {
  return fixture.nativeElement
    .querySelector('.oge-switch-text')
    ?.textContent?.trim();
}

describe('OgeSwitch', () => {
  it('is a role=switch button that toggles aria-checked on click', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = button(fixture);
    expect(el.getAttribute('role')).toBe('switch');
    expect(el.getAttribute('aria-checked')).toBe('false');
    expect(el.getAttribute('aria-label')).toBe('Notifications');
    el.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(true);
    expect(el.getAttribute('aria-checked')).toBe('true');
    expect(fixture.nativeElement.querySelector('.oge-switch-on')).toBeTruthy();
  });

  it('falls back to the localized ON/OFF messages and honors per-instance overrides', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(trackText(fixture)).toBe('OFF');
    button(fixture).click();
    await settle(fixture);
    expect(trackText(fixture)).toBe('ON');
    fixture.componentInstance.onText.set('AÇIK');
    await settle(fixture);
    expect(trackText(fixture)).toBe('AÇIK');
    // empty string hides the track text entirely
    fixture.componentInstance.onText.set('');
    await settle(fixture);
    expect(trackText(fixture)).toBeUndefined();
  });

  it('takes ON/OFF texts from the DI config messages', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeInputsConfig({
          messages: { switchOn: 'AKTIF', switchOff: 'PASIF' },
        }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(trackText(fixture)).toBe('PASIF');
  });

  it('readonly and disabled block toggling; toggle() respects them too', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.readonly.set(true);
    await settle(fixture);
    button(fixture).click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(false);
    const instance = fixture.debugElement.children[0]
      .componentInstance as OgeSwitch;
    instance.toggle();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(false);
    fixture.componentInstance.readonly.set(false);
    await settle(fixture);
    instance.toggle();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(true);
  });
});
