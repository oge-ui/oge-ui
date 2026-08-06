import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeMenuItem } from '@oge-ui/overlay';
import { OgeDropDownButton } from './drop-down-button';
import { provideOgeButtonsConfig } from '../config';

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

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

@Component({
  imports: [OgeDropDownButton],
  template: `
    <oge-drop-down-button text="Export" [items]="items()" [(opened)]="opened" />
  `,
})
class AsyncItemsHost {
  readonly items = signal<
    | readonly OgeMenuItem[]
    | (() => readonly OgeMenuItem[] | Promise<readonly OgeMenuItem[]>)
    | undefined
  >(undefined);
  readonly opened = signal(false);
}

describe('OgeDropDownButton async items', () => {
  async function render(
    items: AsyncItemsHost['items'] extends { set(v: infer V): void }
      ? V
      : never,
  ) {
    const fixture = TestBed.createComponent(AsyncItemsHost);
    fixture.componentInstance.items.set(items);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      statusText: () =>
        el.querySelector('.oge-menu-status-row')?.textContent?.trim() ?? null,
      itemTexts: () =>
        Array.from(el.querySelectorAll('.oge-menu-item')).map((b) =>
          b.textContent?.trim(),
        ),
    };
  }

  it('shows the loading row, then the items once the promise resolves', async () => {
    const gate = deferred<readonly OgeMenuItem[]>();
    let calls = 0;
    const { fixture, host, statusText, itemTexts, el } = await render(() => {
      calls++;
      return gate.promise;
    });
    host.opened.set(true);
    await settle(fixture);
    expect(calls).toBe(1);
    expect(statusText()).toContain('Loading');
    expect(el.querySelector('.oge-menu-status-spinner')).toBeTruthy();

    gate.resolve([{ text: 'Excel' }, { text: 'CSV' }]);
    await flushMicrotasks();
    await settle(fixture);
    expect(statusText()).toBeNull();
    expect(itemTexts()).toEqual(['Excel', 'CSV']);
  });

  it('caches the result: reopening does not re-invoke the function', async () => {
    let calls = 0;
    const { fixture, host, itemTexts } = await render(() => {
      calls++;
      return Promise.resolve([{ text: 'One' }] as const);
    });
    host.opened.set(true);
    await settle(fixture);
    await flushMicrotasks();
    await settle(fixture);
    expect(itemTexts()).toEqual(['One']);

    host.opened.set(false);
    await settle(fixture);
    host.opened.set(true);
    await settle(fixture);
    expect(calls).toBe(1);
    expect(itemTexts()).toEqual(['One']);
  });

  it('synchronous function results skip the loading row entirely', async () => {
    const { fixture, host, statusText, itemTexts } = await render(() => [
      { text: 'Sync' },
    ]);
    host.opened.set(true);
    await settle(fixture);
    expect(statusText()).toBeNull();
    expect(itemTexts()).toEqual(['Sync']);
  });

  it('rejection shows the error row; reopening retries', async () => {
    let calls = 0;
    let fail = true;
    const { fixture, host, statusText, itemTexts } = await render(() => {
      calls++;
      return fail
        ? Promise.reject(new Error('nope'))
        : Promise.resolve([{ text: 'Recovered' }] as const);
    });
    host.opened.set(true);
    await settle(fixture);
    await flushMicrotasks();
    await settle(fixture);
    expect(statusText()).toContain('Could not load items');

    host.opened.set(false);
    await settle(fixture);
    fail = false;
    host.opened.set(true);
    await settle(fixture);
    await flushMicrotasks();
    await settle(fixture);
    expect(calls).toBe(2);
    expect(itemTexts()).toEqual(['Recovered']);
  });

  it('a new function reference while loading discards the stale settlement', async () => {
    const slow = deferred<readonly OgeMenuItem[]>();
    const { fixture, host, itemTexts } = await render(() => slow.promise);
    host.opened.set(true);
    await settle(fixture);

    host.items.set(() => Promise.resolve([{ text: 'Fresh' }] as const));
    await settle(fixture); // effect resets to idle and re-invokes (panel open)
    await flushMicrotasks();
    await settle(fixture);
    expect(itemTexts()).toEqual(['Fresh']);

    slow.resolve([{ text: 'Stale' }]);
    await flushMicrotasks();
    await settle(fixture);
    expect(itemTexts()).toEqual(['Fresh']);
  });

  it('an empty result renders the no-items row (config-overridable)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeButtonsConfig({ messages: { dropDownNoItems: 'Boş' } }),
      ],
    });
    const { fixture, host, statusText } = await render([]);
    host.opened.set(true);
    await settle(fixture);
    expect(statusText()).toBe('Boş');
  });
});
