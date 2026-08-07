import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeModal } from './modal';
import { resetScrollLockForTests } from './scroll-lock';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeModal],
  template: `
    <oge-modal [(opened)]="opened" title="Guarded" [closeGuard]="guard()">
      <input />
    </oge-modal>
  `,
})
class GuardHost {
  readonly opened = signal(false);
  readonly guard = signal<(() => boolean | Promise<boolean>) | undefined>(
    undefined,
  );
  readonly modal = viewChild.required(OgeModal);
}

describe('OgeModal closeGuard', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetScrollLockForTests();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.innerHTML = '';
  });

  async function create(): Promise<ComponentFixture<GuardHost>> {
    const fixture = TestBed.createComponent(GuardHost);
    await settle(fixture);
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    return fixture;
  }

  it('a sync guard returning false vetoes, true allows', async () => {
    const fixture = await create();
    const host = fixture.componentInstance;
    host.guard.set(() => false);
    await settle(fixture);
    host.modal().close();
    await settle(fixture);
    expect(host.opened()).toBe(true);

    host.guard.set(() => true);
    await settle(fixture);
    host.modal().close();
    await settle(fixture);
    expect(host.opened()).toBe(false);
  });

  it('an async guard resolves before closing; closePending covers the wait', async () => {
    const fixture = await create();
    const host = fixture.componentInstance;
    let resolveGuard!: (allowed: boolean) => void;
    host.guard.set(
      () => new Promise<boolean>((resolve) => (resolveGuard = resolve)),
    );
    await settle(fixture);

    host.modal().close();
    expect(host.modal().closePending()).toBe(true);
    expect(host.opened()).toBe(true);

    resolveGuard(true);
    await settle(fixture);
    expect(host.modal().closePending()).toBe(false);
    expect(host.opened()).toBe(false);
  });

  it('is single-flight: repeated closes while pending are ignored', async () => {
    const fixture = await create();
    const host = fixture.componentInstance;
    let calls = 0;
    let resolveGuard!: (allowed: boolean) => void;
    host.guard.set(() => {
      calls++;
      return new Promise<boolean>((resolve) => (resolveGuard = resolve));
    });
    await settle(fixture);

    host.modal().close();
    host.modal().close();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(calls).toBe(1);

    resolveGuard(false);
    await settle(fixture);
    expect(host.opened()).toBe(true);
    expect(host.modal().closePending()).toBe(false);
  });

  it('a rejected guard vetoes with a dev warning instead of closing', async () => {
    const fixture = await create();
    const host = fixture.componentInstance;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    host.guard.set(() => Promise.reject(new Error('boom')));
    await settle(fixture);
    host.modal().close();
    await settle(fixture);
    expect(host.opened()).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('closeGuard'));
  });

  it('a direct opened=false model write bypasses the guard', async () => {
    const fixture = await create();
    const host = fixture.componentInstance;
    host.guard.set(() => false);
    await settle(fixture);
    host.opened.set(false);
    await settle(fixture);
    expect(host.opened()).toBe(false);
    expect(document.querySelector('.oge-modal-layer')).toBeNull();
  });
});
