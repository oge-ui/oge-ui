import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeButton } from './button';
import { provideOgeButtonsConfig } from '../config';
import type {
  OgeButtonActionDoneEvent,
  OgeButtonActionFailedEvent,
  OgeButtonClickEvent,
} from './button-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets the action's `.then` callbacks run before asserting. */
async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

@Component({
  imports: [OgeButton],
  template: `
    <oge-button
      text="Run"
      [(loading)]="loading"
      [action]="action()"
      [messages]="messages()"
      (clicked)="clicks.push($event)"
      (actionDone)="done.push($event)"
      (actionFailed)="failed.push($event)"
    />
  `,
})
class LoadingHost {
  readonly loading = signal(false);
  readonly action = signal<(() => unknown) | undefined>(undefined);
  readonly messages = signal<{ loading: string } | undefined>(undefined);
  readonly clicks: OgeButtonClickEvent[] = [];
  readonly done: OgeButtonActionDoneEvent[] = [];
  readonly failed: OgeButtonActionFailedEvent[] = [];
}

describe('OgeButton loading & action', () => {
  async function render() {
    const fixture = TestBed.createComponent(LoadingHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      native: el.querySelector('.oge-button-native') as HTMLButtonElement,
    };
  }

  it('manual loading model shows the spinner, aria-busy and disables the button', async () => {
    const { fixture, host, el, native } = await render();
    host.loading.set(true);
    await settle(fixture);
    expect(el.querySelector('.oge-button-spinner')).toBeTruthy();
    expect(native.getAttribute('aria-busy')).toBe('true');
    expect(native.disabled).toBe(true);
    expect(
      el.querySelector('.oge-button')?.classList.contains('oge-button-loading'),
    ).toBe(true);

    host.loading.set(false);
    await settle(fixture);
    expect(el.querySelector('.oge-button-spinner')).toBeNull();
  });

  it('async action: click turns loading on, resolve emits actionDone and turns it off', async () => {
    const { fixture, host, native } = await render();
    const gate = deferred<string>();
    host.action.set(() => gate.promise);
    await settle(fixture);

    native.click();
    fixture.detectChanges();
    expect(host.loading()).toBe(true);
    expect(host.clicks.length).toBe(1);
    expect(host.done.length).toBe(0);

    gate.resolve('ok');
    await flushMicrotasks();
    fixture.detectChanges();
    expect(host.loading()).toBe(false);
    expect(host.done).toEqual([{ result: 'ok' }]);
    expect(host.failed.length).toBe(0);
  });

  it('async action: reject emits actionFailed and clears loading', async () => {
    const { fixture, host, native } = await render();
    const gate = deferred<string>();
    host.action.set(() => gate.promise);
    await settle(fixture);

    native.click();
    gate.reject(new Error('boom'));
    await flushMicrotasks();
    fixture.detectChanges();
    expect(host.loading()).toBe(false);
    expect(host.failed.length).toBe(1);
    expect((host.failed[0].error as Error).message).toBe('boom');
    expect(host.done.length).toBe(0);
  });

  it('single-flight: repeat clicks while pending invoke the action only once', async () => {
    const { fixture, host, native } = await render();
    const gate = deferred<void>();
    let calls = 0;
    host.action.set(() => {
      calls++;
      return gate.promise;
    });
    await settle(fixture);

    native.click();
    native.click();
    native.click();
    expect(calls).toBe(1);
    expect(host.clicks.length).toBe(1);

    gate.resolve();
    await flushMicrotasks();
    fixture.detectChanges();
    native.click();
    expect(calls).toBe(2);
  });

  it('synchronous action emits actionDone immediately without a loading flicker', async () => {
    const { fixture, host, native } = await render();
    host.action.set(() => 42);
    await settle(fixture);
    native.click();
    expect(host.loading()).toBe(false);
    expect(host.done).toEqual([{ result: 42 }]);
  });

  it('synchronous throw emits actionFailed', async () => {
    const { fixture, host, native } = await render();
    host.action.set(() => {
      throw new Error('sync');
    });
    await settle(fixture);
    native.click();
    expect(host.failed.length).toBe(1);
    expect(host.done.length).toBe(0);
  });

  it('a settlement after destroy emits nothing and does not crash', async () => {
    const { fixture, host, native } = await render();
    const gate = deferred<void>();
    host.action.set(() => gate.promise);
    await settle(fixture);
    native.click();
    fixture.destroy();
    gate.resolve();
    await flushMicrotasks();
    expect(host.done.length).toBe(0);
    expect(host.failed.length).toBe(0);
  });

  it('screen-reader loading text comes from messages and is overridable per instance', async () => {
    const { fixture, host, el } = await render();
    host.loading.set(true);
    await settle(fixture);
    const srText = () =>
      Array.from(el.querySelectorAll('.oge-button-sr')).map((n) =>
        n.textContent?.trim(),
      );
    expect(srText()).toContain('Loading');

    host.messages.set({ loading: 'Yükleniyor' });
    await settle(fixture);
    expect(srText()).toContain('Yükleniyor');
  });

  it('provideOgeButtonsConfig overrides the default loading message', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeButtonsConfig({ messages: { loading: 'Bekleyin' } }),
      ],
    });
    const fixture = TestBed.createComponent(LoadingHost);
    fixture.componentInstance.loading.set(true);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const texts = Array.from(el.querySelectorAll('.oge-button-sr')).map((n) =>
      n.textContent?.trim(),
    );
    expect(texts).toContain('Bekleyin');
  });
});
