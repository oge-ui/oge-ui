import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeDrawer } from './drawer';
import type { OgeDrawerModeChangedEvent } from './drawer-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/**
 * jsdom performs no layout, so the drawer would always be handed a zero-width
 * container ("not measured yet") and never go compact. These specs install a
 * size getter and a stand-in `ResizeObserver`, which is the only way to
 * exercise the component's own wiring; the decision itself is covered DOM-free
 * in core's `drawer-mode.spec.ts`.
 */
function installHarness(container: { size: number }): {
  restore: () => void;
  resize: () => void;
} {
  const proto = HTMLElement.prototype;
  const clientWidth = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  Object.defineProperty(proto, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.tagName === 'OGE-DRAWER' ? container.size : 0;
    },
  });

  let notify: (() => void) | undefined;
  const previous = (globalThis as Record<string, unknown>).ResizeObserver;
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    constructor(cb: () => void) {
      notify = cb;
    }
    observe(): void {
      /* the spec drives notifications directly */
    }
    disconnect(): void {
      /* nothing to release */
    }
  };

  return {
    resize: () => notify?.(),
    restore: () => {
      if (clientWidth) Object.defineProperty(proto, 'clientWidth', clientWidth);
      (globalThis as Record<string, unknown>).ResizeObserver = previous;
    },
  };
}

@Component({
  imports: [OgeDrawer],
  template: `
    <oge-drawer
      [(opened)]="opened"
      mode="side"
      [compactBelow]="720"
      [scrollLock]="false"
      [inertBackground]="false"
      (modeChanged)="changes.push($event)"
    >
      <div ogeDrawerPanel><button type="button">Home</button></div>
      <main>content</main>
    </oge-drawer>
  `,
})
class CompactHost {
  readonly drawer = viewChild.required(OgeDrawer);
  readonly opened = signal(true);
  readonly changes: OgeDrawerModeChangedEvent[] = [];
}

describe('OgeDrawer — compactBelow', () => {
  let harness: ReturnType<typeof installHarness> | undefined;
  afterEach(() => {
    harness?.restore();
    harness = undefined;
  });

  async function render(size: number) {
    const container = { size };
    harness = installHarness(container);
    const fixture = TestBed.createComponent(CompactHost);
    // measure() runs in afterNextRender and writes a signal, so the mode it
    // resolves only reaches the DOM on the following pass
    await settle(fixture);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      container,
      drawerEl: () => el.querySelector('oge-drawer') as HTMLElement,
      panel: () => el.querySelector('.oge-drawer-panel') as HTMLElement,
    };
  }

  it('keeps the requested mode while the container is wide enough', async () => {
    const { drawerEl, host } = await render(900);
    expect(drawerEl().getAttribute('data-mode')).toBe('side');
    expect(drawerEl().classList.contains('oge-drawer-compact')).toBe(false);
    expect(host.opened()).toBe(true);
  });

  it('downgrades to overlay and closes when the container narrows', async () => {
    const { fixture, host, container, drawerEl } = await render(900);
    host.changes.length = 0;

    container.size = 400;
    harness?.resize();
    await settle(fixture);
    await settle(fixture);

    expect(drawerEl().getAttribute('data-mode')).toBe('overlay');
    expect(drawerEl().classList.contains('oge-drawer-compact')).toBe(true);
    // an overlay covering the content with a backdrop the user never asked
    // for is worse than a closed drawer
    expect(host.opened()).toBe(false);
    expect(host.changes.at(-1)).toEqual({
      mode: 'overlay',
      requestedMode: 'side',
      compact: true,
    });
  });

  it('restores the requested mode when the room comes back', async () => {
    const { fixture, host, container, drawerEl } = await render(400);
    expect(drawerEl().getAttribute('data-mode')).toBe('overlay');

    host.changes.length = 0;
    container.size = 900;
    harness?.resize();
    await settle(fixture);
    await settle(fixture);

    expect(drawerEl().getAttribute('data-mode')).toBe('side');
    expect(host.changes.at(-1)).toEqual({
      mode: 'side',
      requestedMode: 'side',
      compact: false,
    });
  });

  it('releases the modal hold when it stops being modal', async () => {
    // Going compact→side while open must undo everything a modal surface
    // holds; otherwise the body stays scroll-locked with no dialog on screen.
    const { fixture, host, container, panel } = await render(400);
    host.opened.set(true);
    await settle(fixture);
    expect(panel().getAttribute('aria-modal')).toBe('true');

    container.size = 900;
    harness?.resize();
    await settle(fixture);
    await settle(fixture);

    expect(panel().getAttribute('aria-modal')).toBeNull();
    expect(panel().getAttribute('role')).toBe('navigation');
  });
});
