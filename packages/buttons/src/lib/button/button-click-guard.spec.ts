import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeButton } from './button';
import { provideOgeButtonsConfig } from '../config';
import type { OgeButtonClickEvent, OgeClickGuardOptions } from './button-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeButton],
  template: `
    <oge-button
      text="Guarded"
      [clickGuard]="guard()"
      [action]="action()"
      (clicked)="clicks.push($event)"
    />
  `,
})
class GuardHost {
  readonly guard = signal<boolean | OgeClickGuardOptions>(false);
  readonly action = signal<(() => unknown) | undefined>(undefined);
  readonly clicks: OgeButtonClickEvent[] = [];
}

describe('OgeButton clickGuard', () => {
  let now = 0;

  beforeEach(() => {
    now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function render(guard: boolean | OgeClickGuardOptions) {
    const fixture = TestBed.createComponent(GuardHost);
    fixture.componentInstance.guard.set(guard);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      native: el.querySelector('.oge-button-native') as HTMLButtonElement,
    };
  }

  it('throttle: fires immediately, drops clicks inside the window, passes after it', async () => {
    const { host, native } = await render({ mode: 'throttle', ms: 300 });
    native.click();
    expect(host.clicks.length).toBe(1);

    now = 200;
    native.click();
    expect(host.clicks.length).toBe(1);

    now = 350;
    native.click();
    expect(host.clicks.length).toBe(2);
  });

  it('`true` shorthand throttles with the 500ms config default', async () => {
    const { host, native } = await render(true);
    native.click();
    now = 499;
    native.click();
    expect(host.clicks.length).toBe(1);
    now = 501;
    native.click();
    expect(host.clicks.length).toBe(2);
  });

  it('provideOgeButtonsConfig changes the shorthand window', async () => {
    TestBed.configureTestingModule({
      providers: [provideOgeButtonsConfig({ clickGuardMs: 100 })],
    });
    const { host, native } = await render(true);
    native.click();
    now = 150;
    native.click();
    expect(host.clicks.length).toBe(2);
  });

  it('debounce: fires once, trailing, with the last event', async () => {
    vi.useFakeTimers();
    const { fixture, host, native } = await render({
      mode: 'debounce',
      ms: 250,
    });
    native.click();
    native.click();
    native.click();
    expect(host.clicks.length).toBe(0);

    vi.advanceTimersByTime(249);
    expect(host.clicks.length).toBe(0);
    vi.advanceTimersByTime(2);
    fixture.detectChanges();
    expect(host.clicks.length).toBe(1);
  });

  it('throttled clicks never reach the action', async () => {
    const { fixture, host, native } = await render({
      mode: 'throttle',
      ms: 500,
    });
    let calls = 0;
    host.action.set(() => {
      calls++;
      return undefined;
    });
    await settle(fixture);
    native.click();
    now = 100;
    native.click();
    expect(calls).toBe(1);
  });

  it('destroy clears a pending debounce timer', async () => {
    vi.useFakeTimers();
    const { fixture, host, native } = await render({
      mode: 'debounce',
      ms: 250,
    });
    native.click();
    fixture.destroy();
    vi.advanceTimersByTime(1000);
    expect(host.clicks.length).toBe(0);
  });
});
