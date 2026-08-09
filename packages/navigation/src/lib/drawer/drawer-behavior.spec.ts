import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeDrawer } from './drawer';
import type {
  OgeDrawerClosedEvent,
  OgeDrawerClosingEvent,
  OgeDrawerMode,
  OgeDrawerOpeningEvent,
  OgeDrawerPosition,
} from './drawer-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function escape(): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
}

@Component({
  imports: [OgeDrawer],
  template: `
    <button type="button" id="opener">Open</button>
    <oge-drawer
      [(opened)]="opened"
      [mode]="mode()"
      [position]="position()"
      [shading]="shading()"
      [closeOnEscape]="closeOnEscape()"
      [closeGuard]="guard()"
      [scrollLock]="false"
      [inertBackground]="false"
      (opening)="openings.push($event)"
      (afterOpened)="afterOpens = afterOpens + 1"
      (closing)="closings.push($event)"
      (closed)="closes.push($event)"
    >
      <div ogeDrawerPanel><button type="button" id="inside">In</button></div>
      <main>content</main>
    </oge-drawer>
  `,
})
class BehaviorHost {
  readonly drawer = viewChild.required(OgeDrawer);
  readonly opened = signal(false);
  readonly mode = signal<OgeDrawerMode>('overlay');
  readonly position = signal<OgeDrawerPosition>('start');
  readonly shading = signal(true);
  readonly closeOnEscape = signal(true);
  readonly guard = signal<(() => boolean | Promise<boolean>) | undefined>(
    undefined,
  );
  readonly openings: OgeDrawerOpeningEvent[] = [];
  readonly closings: OgeDrawerClosingEvent[] = [];
  readonly closes: OgeDrawerClosedEvent[] = [];
  afterOpens = 0;
}

async function render(setup?: (host: BehaviorHost) => void) {
  const fixture = TestBed.createComponent(BehaviorHost);
  setup?.(fixture.componentInstance);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    drawerEl: () => el.querySelector('oge-drawer') as HTMLElement,
    panel: () => el.querySelector('.oge-drawer-panel') as HTMLElement,
    backdrop: () =>
      el.querySelector('.oge-drawer-backdrop') as HTMLElement | null,
  };
}

describe('OgeDrawer — modes and positions render what they advertise', () => {
  it('renders every mode value', async () => {
    for (const mode of ['overlay', 'push', 'side'] as const) {
      const { fixture, drawerEl } = await render((h) => h.mode.set(mode));
      expect(drawerEl().getAttribute('data-mode')).toBe(mode);
      fixture.destroy();
    }
  });

  it('renders every position value', async () => {
    for (const position of ['start', 'end', 'top', 'bottom'] as const) {
      const { fixture, drawerEl } = await render((h) =>
        h.position.set(position),
      );
      expect(drawerEl().getAttribute('data-position')).toBe(position);
      fixture.destroy();
    }
  });

  it('shows a backdrop only for a shaded, open, modal drawer', async () => {
    const { fixture, host, backdrop } = await render();
    expect(backdrop()).toBeNull(); // closed

    host.opened.set(true);
    await settle(fixture);
    expect(backdrop()).not.toBeNull();

    host.shading.set(false);
    await settle(fixture);
    expect(backdrop()).toBeNull();

    host.shading.set(true);
    host.mode.set('side');
    await settle(fixture);
    // a persistent drawer never shades the content it shares the row with
    expect(backdrop()).toBeNull();
  });
});

describe('OgeDrawer — open/close pipeline', () => {
  it('a canceled opening keeps the drawer closed and resets the model', async () => {
    const { fixture, host, panel } = await render();
    const sub = host.drawer().opening.subscribe((e) => (e.cancel = true));

    host.opened.set(true);
    await settle(fixture);

    expect(host.opened()).toBe(false);
    expect(panel().hasAttribute('inert')).toBe(true);
    expect(host.afterOpens).toBe(0);
    sub.unsubscribe();
  });

  it('emits afterOpened without waiting on a transition', async () => {
    // The transition is CSS-only and prefers-reduced-motion zeroes it, so a
    // transitionend-based signal would never arrive for those users.
    const { host } = await render((h) => h.opened.set(true));
    expect(host.afterOpens).toBe(1);
  });

  it('a canceled closing keeps the drawer open', async () => {
    const { fixture, host, panel } = await render((h) => h.opened.set(true));
    host.closings.length = 0;
    // veto through the cancelable pre-event
    const drawer = host.drawer();
    const sub = drawer.closing.subscribe((e) => (e.cancel = true));
    drawer.close();
    await settle(fixture);
    expect(host.opened()).toBe(true);
    expect(host.closes.length).toBe(0);
    expect(panel().hasAttribute('inert')).toBe(false);
    sub.unsubscribe();
  });

  it('a synchronous false guard vetoes the close', async () => {
    const { fixture, host } = await render((h) => {
      h.opened.set(true);
      h.guard.set(() => false);
    });
    host.drawer().close();
    await settle(fixture);
    expect(host.opened()).toBe(true);
    expect(host.closes.length).toBe(0);
  });

  it('a promise guard reports pending and then closes', async () => {
    let allow!: (value: boolean) => void;
    const { fixture, host } = await render((h) => {
      h.opened.set(true);
      h.guard.set(
        () =>
          new Promise<boolean>((resolve) => {
            allow = resolve;
          }),
      );
    });
    host.drawer().close();
    await settle(fixture);
    expect(host.drawer().closePending()).toBe(true);
    expect(host.opened()).toBe(true);

    allow(true);
    await settle(fixture);
    expect(host.drawer().closePending()).toBe(false);
    expect(host.opened()).toBe(false);
    expect(host.closes[0].reason).toBe('api');
  });

  it('a rejected guard is a veto, not a close', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fixture, host } = await render((h) => {
      h.opened.set(true);
      h.guard.set(() => Promise.reject(new Error('nope')));
    });
    host.drawer().close();
    await settle(fixture);
    expect(host.opened()).toBe(true);
    expect(host.closes.length).toBe(0);
    expect(host.drawer().closePending()).toBe(false);
    warn.mockRestore();
  });

  it('a throwing guard is a veto too', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fixture, host } = await render((h) => {
      h.opened.set(true);
      h.guard.set(() => {
        throw new Error('nope');
      });
    });
    host.drawer().close();
    await settle(fixture);
    expect(host.opened()).toBe(true);
    expect(host.closes.length).toBe(0);
    warn.mockRestore();
  });

  it('is single-flight — a second close while pending is dropped', async () => {
    let calls = 0;
    const { fixture, host } = await render((h) => {
      h.opened.set(true);
      h.guard.set(() => {
        calls++;
        return new Promise<boolean>(() => undefined);
      });
    });
    host.drawer().close();
    host.drawer().close();
    await settle(fixture);
    expect(calls).toBe(1);
  });
});

describe('OgeDrawer — Escape and focus', () => {
  it('Escape closes a modal drawer', async () => {
    const { fixture, host } = await render((h) => h.opened.set(true));
    escape();
    await settle(fixture);
    expect(host.opened()).toBe(false);
    expect(host.closes[0].reason).toBe('escape');
  });

  it('closeOnEscape=false keeps it open', async () => {
    const { fixture, host } = await render((h) => {
      h.opened.set(true);
      h.closeOnEscape.set(false);
    });
    escape();
    await settle(fixture);
    expect(host.opened()).toBe(true);
  });

  it('a persistent drawer never takes Escape from the page', async () => {
    const { fixture, host } = await render((h) => {
      h.mode.set('side');
      h.opened.set(true);
    });
    escape();
    await settle(fixture);
    // a landmark is not dismissed by Escape — that belongs to dialogs
    expect(host.opened()).toBe(true);
  });

  it('moves focus into a modal drawer and restores it on close', async () => {
    const { fixture, host, el } = await render();
    const opener = el.querySelector('#opener') as HTMLButtonElement;
    opener.focus();
    expect(document.activeElement).toBe(opener);

    host.opened.set(true);
    await settle(fixture);
    expect(document.activeElement).toBe(el.querySelector('#inside'));

    host.drawer().close();
    await settle(fixture);
    // focus was inside a panel about to go inert, so it is handed back
    expect(document.activeElement).toBe(opener);
  });

  it('does not move focus for a persistent drawer', async () => {
    const { fixture, host, el } = await render((h) => h.mode.set('side'));
    const opener = el.querySelector('#opener') as HTMLButtonElement;
    opener.focus();

    host.opened.set(true);
    await settle(fixture);
    // Tab must flow from the page into the landmark, not be moved there
    expect(document.activeElement).toBe(opener);
  });

  it('traps Tab in a modal drawer but not in a persistent one', async () => {
    const { fixture, host, panel } = await render((h) => h.opened.set(true));
    const inside = panel().querySelector('#inside') as HTMLButtonElement;
    inside.focus();
    const trapped = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    panel().dispatchEvent(trapped);
    expect(trapped.defaultPrevented).toBe(true);

    host.mode.set('side');
    await settle(fixture);
    const free = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    panel().dispatchEvent(free);
    expect(free.defaultPrevented).toBe(false);
  });
});

@Component({
  imports: [OgeDrawer],
  template: `
    <oge-drawer
      [(opened)]="opened"
      [disabled]="disabled()"
      [showCloseButton]="showCloseButton()"
      [scrollLock]="false"
      [inertBackground]="false"
      (closed)="closes.push($event)"
    >
      <div ogeDrawerPanel><button type="button" id="inside">In</button></div>
      <div>content</div>
    </oge-drawer>
  `,
})
class ExtrasHost {
  readonly drawer = viewChild.required(OgeDrawer);
  readonly opened = signal(false);
  readonly disabled = signal(false);
  readonly showCloseButton = signal(false);
  readonly closes: OgeDrawerClosedEvent[] = [];
}

describe('OgeDrawer — disabled, close button and toggle(force)', () => {
  async function render(setup?: (host: ExtrasHost) => void) {
    const fixture = TestBed.createComponent(ExtrasHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      panel: () => el.querySelector('.oge-drawer-panel') as HTMLElement,
      closeBtn: () =>
        el.querySelector('.oge-drawer-close') as HTMLButtonElement | null,
    };
  }

  it('disabled blocks opening and marks the host', async () => {
    const { fixture, host, panel } = await render((h) => h.disabled.set(true));
    host.drawer().open();
    await settle(fixture);
    expect(host.opened()).toBe(false);
    expect(panel().hasAttribute('inert')).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('oge-drawer')
        ?.classList.contains('oge-disabled'),
    ).toBe(true);
  });

  it('disabled blocks closing an already open drawer', async () => {
    const { fixture, host } = await render((h) => h.opened.set(true));
    host.disabled.set(true);
    await settle(fixture);

    host.drawer().close();
    await settle(fixture);
    // it stays open and stays usable — disabling the gestures, not the content
    expect(host.opened()).toBe(true);
    expect(host.closes.length).toBe(0);
  });

  it('renders no close button unless asked, and closes when clicked', async () => {
    const { fixture, host, closeBtn } = await render((h) => h.opened.set(true));
    expect(closeBtn()).toBeNull();

    host.showCloseButton.set(true);
    await settle(fixture);
    expect(closeBtn()?.getAttribute('aria-label')).toBe('Close drawer');

    closeBtn()?.click();
    await settle(fixture);
    expect(host.opened()).toBe(false);
  });

  it('toggle(force) drives the drawer to a known state', async () => {
    const { fixture, host } = await render();
    host.drawer().toggle(true);
    await settle(fixture);
    expect(host.opened()).toBe(true);

    // forcing the state it already has is a no-op, not a flip
    host.drawer().toggle(true);
    await settle(fixture);
    expect(host.opened()).toBe(true);

    host.drawer().toggle(false);
    await settle(fixture);
    expect(host.opened()).toBe(false);

    host.drawer().toggle();
    await settle(fixture);
    expect(host.opened()).toBe(true);
  });
});
