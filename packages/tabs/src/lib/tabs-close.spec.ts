import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTabPanel } from './tab-panel';
import type {
  OgeTabClosedEvent,
  OgeTabClosingEvent,
  OgeTabItem,
} from './tabs-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function flushTimers(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
}

@Component({
  imports: [OgeTabPanel],
  template: `
    <oge-tab-panel
      [items]="items()"
      [closable]="closable()"
      [(selectedIndex)]="index"
      (tabClosing)="onClosing($event)"
      (tabClosed)="onClosed($event)"
    />
  `,
})
class CloseHost {
  readonly items = signal<readonly OgeTabItem[]>([
    { key: 'a', text: 'Alpha' },
    { key: 'b', text: 'Beta' },
    { key: 'c', text: 'Gamma' },
  ]);
  readonly closable = signal(true);
  readonly index = signal(0);
  cancelNext = false;
  removeOnClose = true;
  readonly closing: OgeTabClosingEvent[] = [];
  readonly closed: OgeTabClosedEvent[] = [];

  onClosing(event: OgeTabClosingEvent): void {
    this.closing.push(event);
    if (this.cancelNext) event.cancel = true;
  }

  onClosed(event: OgeTabClosedEvent): void {
    this.closed.push(event);
    if (this.removeOnClose) {
      this.items.set(this.items().filter((item) => item.key !== event.key));
    }
  }
}

describe('OgeTabPanel closing', () => {
  async function render(setup?: (host: CloseHost) => void) {
    const fixture = TestBed.createComponent(CloseHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      tabs: () => Array.from(el.querySelectorAll<HTMLElement>('.oge-tab')),
      closeButtons: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-tab-close')),
    };
  }

  it('renders close buttons only for closable tabs', async () => {
    const { fixture, host, closeButtons } = await render();
    expect(closeButtons().length).toBe(3);

    host.closable.set(false);
    await settle(fixture);
    expect(closeButtons().length).toBe(0);

    host.items.set([{ key: 'a', text: 'Alpha', closable: true }]);
    await settle(fixture);
    expect(closeButtons().length).toBe(1);
  });

  it('close button runs tabClosing → tabClosed and the app removes the tab', async () => {
    const { fixture, host, closeButtons, tabs } = await render();
    closeButtons()[1].click();
    await settle(fixture);
    expect(host.closing.length).toBe(1);
    expect(host.closed.length).toBe(1);
    expect(host.closed[0]).toMatchObject({ index: 1, key: 'b' });
    expect(
      tabs().map((t) => t.querySelector('.oge-tab-text')?.textContent),
    ).toEqual(['Alpha', 'Gamma']);
  });

  it('a canceled tabClosing vetoes the close', async () => {
    const { fixture, host, closeButtons, tabs } = await render();
    host.cancelNext = true;
    closeButtons()[0].click();
    await settle(fixture);
    expect(host.closed.length).toBe(0);
    expect(tabs().length).toBe(3);
  });

  it('a synchronous closeGuard vetoes with false and allows with true', async () => {
    const { fixture, host, closeButtons } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'Alpha', closeGuard: () => false },
        { key: 'b', text: 'Beta', closeGuard: () => true },
      ]),
    );
    closeButtons()[0].click();
    await settle(fixture);
    expect(host.closed.length).toBe(0);

    closeButtons()[1].click();
    await settle(fixture);
    expect(host.closed.length).toBe(1);
    expect(host.closed[0].key).toBe('b');
  });

  it('an async closeGuard is single-flight and closes on resolve(true)', async () => {
    let resolveGuard!: (allowed: boolean) => void;
    let guardCalls = 0;
    const { fixture, host, closeButtons, tabs } = await render((h) =>
      h.items.set([
        {
          key: 'a',
          text: 'Alpha',
          closeGuard: () => {
            guardCalls++;
            return new Promise<boolean>((resolve) => {
              resolveGuard = resolve;
            });
          },
        },
      ]),
    );
    closeButtons()[0].click();
    await settle(fixture);
    expect(tabs()[0].classList.contains('oge-tab-close-pending')).toBe(true);
    expect(host.closed.length).toBe(0);

    // second click while pending is ignored
    closeButtons()[0].click();
    await settle(fixture);
    expect(guardCalls).toBe(1);

    resolveGuard(true);
    await settle(fixture);
    await flushTimers();
    await settle(fixture);
    expect(host.closed.length).toBe(1);
    expect(tabs().length).toBe(0);
  });

  it('an async closeGuard resolving false keeps the tab', async () => {
    let resolveGuard!: (allowed: boolean) => void;
    const { fixture, host, closeButtons, tabs } = await render((h) =>
      h.items.set([
        {
          key: 'a',
          text: 'Alpha',
          closeGuard: () =>
            new Promise<boolean>((resolve) => {
              resolveGuard = resolve;
            }),
        },
      ]),
    );
    closeButtons()[0].click();
    resolveGuard(false);
    await settle(fixture);
    await flushTimers();
    await settle(fixture);
    expect(host.closed.length).toBe(0);
    expect(tabs().length).toBe(1);
    expect(tabs()[0].classList.contains('oge-tab-close-pending')).toBe(false);
  });

  it('a rejected closeGuard counts as a veto', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fixture, host, closeButtons, tabs } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'Alpha', closeGuard: () => Promise.reject() },
      ]),
    );
    closeButtons()[0].click();
    await settle(fixture);
    await flushTimers();
    await settle(fixture);
    expect(host.closed.length).toBe(0);
    expect(tabs().length).toBe(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('Delete on a focused closable tab closes it and focus moves on', async () => {
    const { fixture, host, tabs } = await render();
    const first = tabs()[0];
    first.focus();
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
    );
    await settle(fixture);
    expect(host.closed.length).toBe(1);
    expect(host.closed[0].key).toBe('a');
    await flushTimers();
    await settle(fixture);
    // APG: focus lands on the tab that took the closed tab's place
    expect(document.activeElement?.textContent).toContain('Beta');
  });

  it('closeTab(key) runs the pipeline programmatically', async () => {
    const { fixture, host } = await render();
    const panel = fixture.debugElement.children[0].componentInstance as {
      closeTab(target: number | string): void;
    };
    panel.closeTab('c');
    await settle(fixture);
    expect(host.closed.length).toBe(1);
    expect(host.closed[0].key).toBe('c');
  });
});
