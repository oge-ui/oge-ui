import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeButtonGroup } from '../button-group/button-group';
import { OgeButton } from './button';
import type {
  OgeButtonClickEvent,
  OgeButtonSelectedChangedEvent,
} from './button-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeButton, OgeButtonGroup],
  template: `
    <oge-button
      id="bold"
      text="Bold"
      [toggle]="toggle()"
      [disabled]="disabled()"
      [(selected)]="bold"
      (selectedChanged)="changes.push($event)"
      (clicked)="clicks.push($event)"
    />
    <oge-button-group selectionMode="multiple" [(selectedKeys)]="keys">
      <oge-button id="grouped" text="Italic" value="i" [toggle]="true" />
    </oge-button-group>
    <oge-button-group>
      <oge-button id="tool" text="Wrap" [toggle]="true" />
    </oge-button-group>
  `,
})
class ToggleHost {
  readonly toggle = signal(true);
  readonly disabled = signal(false);
  readonly bold = signal(false);
  readonly keys = signal<readonly string[]>([]);
  readonly changes: OgeButtonSelectedChangedEvent[] = [];
  readonly clicks: OgeButtonClickEvent[] = [];
}

describe('OgeButton toggle', () => {
  async function render() {
    const fixture = TestBed.createComponent(ToggleHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const native = (id: string) =>
      el.querySelector<HTMLButtonElement>(`#${id} .oge-button-native`)!;
    const hostEl = (id: string) => el.querySelector<HTMLElement>(`#${id}`)!;
    return { fixture, host: fixture.componentInstance, native, hostEl };
  }

  it('renders aria-pressed="false" when idle and flips on click', async () => {
    const { fixture, host, native, hostEl } = await render();
    expect(native('bold').getAttribute('aria-pressed')).toBe('false');
    expect(hostEl('bold').classList.contains('oge-button-toggle')).toBe(true);
    expect(hostEl('bold').classList.contains('oge-button-selected')).toBe(
      false,
    );

    native('bold').click();
    await settle(fixture);
    expect(host.bold()).toBe(true);
    expect(native('bold').getAttribute('aria-pressed')).toBe('true');
    expect(hostEl('bold').classList.contains('oge-button-selected')).toBe(true);
    expect(host.changes).toHaveLength(1);
    expect(host.changes[0]).toMatchObject({
      selected: true,
      previousValue: false,
    });
    expect(host.changes[0].event).toBeInstanceOf(MouseEvent);
    expect(host.clicks).toHaveLength(1);

    native('bold').click();
    await settle(fixture);
    expect(host.bold()).toBe(false);
    expect(host.changes[1]).toMatchObject({
      selected: false,
      previousValue: true,
    });
  });

  it('reflects the two-way model set from outside', async () => {
    const { fixture, host, native } = await render();
    host.bold.set(true);
    await settle(fixture);
    expect(native('bold').getAttribute('aria-pressed')).toBe('true');
    expect(host.changes).toHaveLength(0);
  });

  it('renders no state without toggle', async () => {
    const { fixture, host, native, hostEl } = await render();
    host.toggle.set(false);
    host.bold.set(true);
    await settle(fixture);
    expect(native('bold').hasAttribute('aria-pressed')).toBe(false);
    expect(hostEl('bold').classList.contains('oge-button-selected')).toBe(
      false,
    );
    native('bold').click();
    await settle(fixture);
    expect(host.changes).toHaveLength(0);
    expect(host.clicks).toHaveLength(1);
  });

  it('a disabled toggle does not flip', async () => {
    const { fixture, host, native } = await render();
    host.disabled.set(true);
    await settle(fixture);
    native('bold').click();
    await settle(fixture);
    expect(host.bold()).toBe(false);
    expect(native('bold').getAttribute('aria-pressed')).toBe('false');
  });

  it('a selection group keeps owning the state', async () => {
    const { fixture, host, native, hostEl } = await render();
    expect(native('grouped').getAttribute('aria-pressed')).toBe('false');
    native('grouped').click();
    await settle(fixture);
    expect(host.keys()).toEqual(['i']);
    expect(native('grouped').getAttribute('aria-pressed')).toBe('true');
    expect(hostEl('grouped').classList.contains('oge-button-toggle')).toBe(
      false,
    );
  });

  it('a toolbar group ("none") still lets the button toggle itself', async () => {
    const { fixture, native } = await render();
    expect(native('tool').getAttribute('aria-pressed')).toBe('false');
    native('tool').click();
    await settle(fixture);
    expect(native('tool').getAttribute('aria-pressed')).toBe('true');
  });
});
