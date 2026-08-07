import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeAnchoredPanel } from '../panel/anchored-panel';
import { OgeModal } from './modal';
import { resetScrollLockForTests } from './scroll-lock';
import type { OgeModalAutoFocus } from './modal-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeModal],
  template: `
    <button id="trigger" type="button">open</button>
    <oge-modal
      [(opened)]="opened"
      title="Focus modal"
      [autoFocus]="autoFocus()"
      [restoreFocus]="restoreFocus()"
    >
      @if (withAutofocusAttr()) {
        <!-- the priority chain under test starts at [autofocus] -->
        <!-- eslint-disable-next-line @angular-eslint/template/no-autofocus -->
        <input id="marked" autofocus />
      }
      @if (withFields()) {
        <input id="first" />
        <input id="second" class="special" />
      }
    </oge-modal>
  `,
})
class FocusHost {
  readonly opened = signal(false);
  readonly autoFocus = signal<OgeModalAutoFocus>('first-tabbable');
  readonly restoreFocus = signal(true);
  readonly withAutofocusAttr = signal(false);
  readonly withFields = signal(true);
  readonly modal = viewChild.required(OgeModal);
}

describe('OgeModal focus behavior', () => {
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

  async function open(fixture: ComponentFixture<FocusHost>): Promise<void> {
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    // Initial focus runs in afterNextRender — flush the async rAF stub.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle(fixture);
  }

  it('focuses the [autofocus] element first', async () => {
    const fixture = TestBed.createComponent(FocusHost);
    fixture.componentInstance.withAutofocusAttr.set(true);
    await settle(fixture);
    await open(fixture);
    expect(document.activeElement?.id).toBe('marked');
  });

  it('resolves an autoFocus CSS selector inside the panel', async () => {
    const fixture = TestBed.createComponent(FocusHost);
    fixture.componentInstance.autoFocus.set('.special');
    await settle(fixture);
    await open(fixture);
    expect(document.activeElement?.id).toBe('second');
  });

  it('falls back to the first tabbable, closing over the ✕ button', async () => {
    const fixture = TestBed.createComponent(FocusHost);
    await settle(fixture);
    await open(fixture);
    // First tabbable in DOM order is the header close button.
    expect(document.activeElement?.classList.contains('oge-modal-close')).toBe(
      true,
    );
  });

  it('focuses the panel itself with autoFocus=panel and no tabbables', async () => {
    const fixture = TestBed.createComponent(FocusHost);
    fixture.componentInstance.autoFocus.set('panel');
    fixture.componentInstance.withFields.set(false);
    await settle(fixture);
    await open(fixture);
    expect(
      (document.activeElement as HTMLElement)?.classList.contains('oge-modal'),
    ).toBe(true);
  });

  it('restores focus to the opener on close', async () => {
    const fixture = TestBed.createComponent(FocusHost);
    await settle(fixture);
    const trigger = document.querySelector<HTMLElement>('#trigger');
    trigger?.focus();
    await open(fixture);
    expect(document.activeElement).not.toBe(trigger);
    fixture.componentInstance.modal().close();
    await settle(fixture);
    expect(document.activeElement).toBe(trigger);
  });

  it('never steals focus the user moved elsewhere before the close', async () => {
    const fixture = TestBed.createComponent(FocusHost);
    await settle(fixture);
    const trigger = document.querySelector<HTMLElement>('#trigger');
    trigger?.focus();
    await open(fixture);
    const elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    fixture.componentInstance.modal().close();
    await settle(fixture);
    expect(document.activeElement).toBe(elsewhere);
  });

  it('Escape closes a popup opened inside the modal before the modal', async () => {
    const fixture = TestBed.createComponent(FocusHost);
    await settle(fixture);
    await open(fixture);

    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    const inner = new OgeAnchoredPanel({
      anchor: () => anchorEl,
      panel: () => null,
    });
    inner.open();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle(fixture);
    expect(inner.isOpen()).toBe(false);
    expect(fixture.componentInstance.opened()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(false);
    inner.destroy();
  });
});
