import { StrictMode, useRef, useState, type ReactNode } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { pushOverlay, removeOverlay } from '@oge-ui/behavior';
import { OgeDrawer, type OgeDrawerHandle, type OgeDrawerProps } from './drawer';
import { OgeDrawerConfigProvider } from './navigation-config';

/**
 * The React mirror of the Angular drawer specs
 * (`drawer-a11y`, `drawer-behavior`, `drawer-compact`, `drawer-overlay-stack`),
 * case for case. jsdom lays nothing out, so the `compactBelow` cases install
 * the same size getter and `ResizeObserver` stand-in the Angular spec uses;
 * the decision itself is covered DOM-free in core's `drawer-mode.spec.ts`.
 */

/** Flushes the microtask queue inside `act` — close guards settle here. */
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const root = (): HTMLElement =>
  document.querySelector('.oge-drawer') as HTMLElement;
const panel = (): HTMLElement =>
  document.querySelector('.oge-drawer-panel') as HTMLElement;
const backdrop = (): HTMLElement | null =>
  document.querySelector('.oge-drawer-backdrop');
const closeButton = (): HTMLButtonElement | null =>
  document.querySelector('.oge-drawer-close');

function escape(): void {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
  });
}

/** Controlled host mirroring the Angular spec fixtures' two-way `opened`. */
function Host({
  handleRef,
  children,
  onOpenedChange,
  ...rest
}: OgeDrawerProps & {
  handleRef?: (handle: OgeDrawerHandle | null) => void;
}) {
  const [opened, setOpened] = useState(rest.defaultOpened ?? false);
  return (
    <>
      <button type="button" id="opener">
        Open
      </button>
      <OgeDrawer
        {...rest}
        ref={handleRef}
        opened={rest.opened ?? opened}
        onOpenedChange={(next) => {
          setOpened(next);
          onOpenedChange?.(next);
        }}
        scrollLock={rest.scrollLock ?? false}
        inertBackground={rest.inertBackground ?? false}
        panel={
          rest.panel ?? (
            <div>
              <button type="button" id="inside">
                In
              </button>
            </div>
          )
        }
      >
        {children ?? <main>content</main>}
      </OgeDrawer>
    </>
  );
}

/** Renders the host and hands back the imperative handle plus the open state. */
function mount(props: OgeDrawerProps & { children?: ReactNode } = {}) {
  const state = { opened: props.defaultOpened ?? false };
  let handle: OgeDrawerHandle | null = null;
  const utils = render(
    <Host
      {...props}
      handleRef={(h) => {
        handle = h;
      }}
      onOpenedChange={(next) => {
        state.opened = next;
        props.onOpenedChange?.(next);
      }}
    />,
  );
  return {
    ...utils,
    state,
    handle: () => handle as unknown as OgeDrawerHandle,
  };
}

describe('<OgeDrawer> — modality is derived from mode', () => {
  it('a modal mode is a dialog with aria-modal', () => {
    for (const mode of ['overlay', 'push'] as const) {
      const { unmount } = mount({ mode, defaultOpened: true });
      expect(panel().getAttribute('role')).toBe('dialog');
      expect(panel().getAttribute('aria-modal')).toBe('true');
      unmount();
    }
  });

  it("a persistent 'side' drawer is a landmark with no aria-modal", () => {
    mount({ mode: 'side', defaultOpened: true });
    // The reference libraries get exactly this wrong: PrimeNG emits
    // role="complementary" AND aria-modal together, Material emits neither.
    expect(panel().getAttribute('role')).toBe('navigation');
    expect(panel().getAttribute('aria-modal')).toBeNull();
  });

  it('renders every landmark value it advertises', () => {
    for (const landmark of ['navigation', 'complementary', 'region'] as const) {
      const { unmount } = mount({
        mode: 'side',
        landmark,
        defaultOpened: true,
      });
      expect(panel().getAttribute('role')).toBe(landmark);
      unmount();
    }
  });

  it('names the panel from messages, ariaLabel, then ariaLabelledBy', () => {
    const { rerender } = render(<Host defaultOpened opened />);
    expect(panel().getAttribute('aria-label')).toBe('Drawer');

    rerender(<Host defaultOpened opened ariaLabel="Main menu" />);
    expect(panel().getAttribute('aria-label')).toBe('Main menu');

    // aria-labelledby wins and clears aria-label, so there is only one name
    rerender(
      <Host
        defaultOpened
        opened
        ariaLabel="Main menu"
        ariaLabelledBy="heading-1"
      />,
    );
    expect(panel().getAttribute('aria-labelledby')).toBe('heading-1');
    expect(panel().getAttribute('aria-label')).toBeNull();
  });

  it('exposes a stable id so a trigger aria-controls always resolves', () => {
    const { handle } = mount();
    // closed, but still in the DOM — this is why aria-controls stays valid
    expect(panel().id).toBe(handle().drawerId);
    expect(panel().id).toMatch(/^oge-drawer-\d+$/);
  });

  it('marks a closed panel inert and aria-hidden', () => {
    const { handle } = mount();
    expect(panel().hasAttribute('inert')).toBe(true);
    expect(panel().getAttribute('aria-hidden')).toBe('true');

    act(() => handle().open());
    expect(panel().hasAttribute('inert')).toBe(false);
    expect(panel().getAttribute('aria-hidden')).toBeNull();
  });

  it('keeps a side rail reachable while closed', () => {
    mount({ mode: 'side', minSize: 56 });
    // a rail is visible and clickable, so it must not be inert
    expect(panel().hasAttribute('inert')).toBe(false);
    expect(panel().getAttribute('aria-hidden')).toBeNull();
  });

  it('overrides every message through the config provider', () => {
    render(
      <OgeDrawerConfigProvider config={{ messages: { drawer: 'Gezinme' } }}>
        <Host defaultOpened />
      </OgeDrawerConfigProvider>,
    );
    expect(panel().getAttribute('aria-label')).toBe('Gezinme');
  });
});

describe('<OgeDrawer> — modes and positions render what they advertise', () => {
  it('renders every mode value', () => {
    for (const mode of ['overlay', 'push', 'side'] as const) {
      const { unmount } = mount({ mode });
      expect(root().getAttribute('data-mode')).toBe(mode);
      unmount();
    }
  });

  it('renders every position value', () => {
    for (const position of ['start', 'end', 'top', 'bottom'] as const) {
      const { unmount } = mount({ position });
      expect(root().getAttribute('data-position')).toBe(position);
      unmount();
    }
  });

  it('shows a backdrop only for a shaded, open, modal drawer', () => {
    const { handle, rerender } = mount();
    expect(backdrop()).toBeNull(); // closed

    act(() => handle().open());
    expect(backdrop()).not.toBeNull();

    rerender(<Host opened shading={false} />);
    expect(backdrop()).toBeNull();

    // a persistent drawer never shades the content it shares the row with
    rerender(<Host opened mode="side" />);
    expect(backdrop()).toBeNull();
  });
});

describe('<OgeDrawer> — open/close pipeline', () => {
  it('a canceled opening keeps the drawer closed and resets the state', () => {
    let afterOpens = 0;
    const { handle, state } = mount({
      onOpening: (event) => {
        event.cancel = true;
      },
      onAfterOpened: () => {
        afterOpens++;
      },
    });
    act(() => handle().open());
    expect(state.opened).toBe(false);
    expect(panel().hasAttribute('inert')).toBe(true);
    expect(afterOpens).toBe(0);
  });

  it('reports afterOpened without waiting on a transition', () => {
    // The transition is CSS-only and prefers-reduced-motion zeroes it, so a
    // transitionend-based signal would never arrive for those users.
    let afterOpens = 0;
    mount({
      defaultOpened: true,
      onAfterOpened: () => {
        afterOpens++;
      },
    });
    expect(afterOpens).toBe(1);
  });

  it('a canceled closing keeps the drawer open', () => {
    const closes: unknown[] = [];
    const { handle, state } = mount({
      defaultOpened: true,
      onClosing: (event) => {
        event.cancel = true;
      },
      onClosed: (event) => closes.push(event),
    });
    act(() => handle().close());
    expect(state.opened).toBe(true);
    expect(closes.length).toBe(0);
    expect(panel().hasAttribute('inert')).toBe(false);
  });

  it('a synchronous false guard vetoes the close', () => {
    const closes: unknown[] = [];
    const { handle, state } = mount({
      defaultOpened: true,
      closeGuard: () => false,
      onClosed: (event) => closes.push(event),
    });
    act(() => handle().close());
    expect(state.opened).toBe(true);
    expect(closes.length).toBe(0);
  });

  it('a promise guard reports pending and then closes', async () => {
    let allow!: (value: boolean) => void;
    const reasons: string[] = [];
    const pendings: boolean[] = [];
    const { handle, state } = mount({
      defaultOpened: true,
      closeGuard: () =>
        new Promise<boolean>((resolve) => {
          allow = resolve;
        }),
      onClosed: (event) => reasons.push(event.reason),
      onClosePendingChange: (pending) => pendings.push(pending),
    });
    act(() => handle().close());
    expect(handle().closePending).toBe(true);
    expect(state.opened).toBe(true);

    await act(async () => {
      allow(true);
      await Promise.resolve();
    });
    expect(handle().closePending).toBe(false);
    expect(state.opened).toBe(false);
    expect(reasons).toEqual(['api']);
    expect(pendings).toEqual([true, false]);
  });

  it('a rejected guard is a veto, not a close', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const closes: unknown[] = [];
    const { handle, state } = mount({
      defaultOpened: true,
      closeGuard: () => Promise.reject(new Error('nope')),
      onClosed: (event) => closes.push(event),
    });
    act(() => handle().close());
    await flush();
    expect(state.opened).toBe(true);
    expect(closes.length).toBe(0);
    expect(handle().closePending).toBe(false);
    warn.mockRestore();
  });

  it('a throwing guard is a veto too', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const closes: unknown[] = [];
    const { handle, state } = mount({
      defaultOpened: true,
      closeGuard: () => {
        throw new Error('nope');
      },
      onClosed: (event) => closes.push(event),
    });
    act(() => handle().close());
    expect(state.opened).toBe(true);
    expect(closes.length).toBe(0);
    warn.mockRestore();
  });

  it('is single-flight — a second close while pending is dropped', () => {
    let calls = 0;
    const { handle } = mount({
      defaultOpened: true,
      closeGuard: () => {
        calls++;
        return new Promise<boolean>(() => undefined);
      },
    });
    act(() => {
      handle().close();
      handle().close();
    });
    expect(calls).toBe(1);
  });
});

describe('<OgeDrawer> — Escape and focus', () => {
  it('Escape closes a modal drawer', () => {
    const reasons: string[] = [];
    const { state } = mount({
      defaultOpened: true,
      onClosed: (event) => reasons.push(event.reason),
    });
    escape();
    expect(state.opened).toBe(false);
    expect(reasons).toEqual(['escape']);
  });

  it('closeOnEscape=false keeps it open', () => {
    const { state } = mount({ defaultOpened: true, closeOnEscape: false });
    escape();
    expect(state.opened).toBe(true);
  });

  it('a persistent drawer never takes Escape from the page', () => {
    const { state } = mount({ mode: 'side', defaultOpened: true });
    escape();
    // a landmark is not dismissed by Escape — that belongs to dialogs
    expect(state.opened).toBe(true);
  });

  it('only the topmost overlay reacts to Escape', () => {
    // The counterpart of the Angular overlay-stack spec: a popup opened inside
    // the drawer registers itself in the *same* shared stack, and the drawer
    // must ignore Escape until it is topmost again. A bare token stands in for
    // the popup, so the case tests the stack rather than the popup.
    const { state } = mount({ defaultOpened: true });
    const popup = {};
    pushOverlay(popup);
    escape();
    expect(state.opened).toBe(true);

    removeOverlay(popup);
    escape();
    expect(state.opened).toBe(false);
  });

  it('moves focus into a modal drawer and restores it on close', () => {
    const { handle } = mount();
    const opener = document.querySelector('#opener') as HTMLButtonElement;
    opener.focus();
    expect(document.activeElement).toBe(opener);

    act(() => handle().open());
    expect(document.activeElement).toBe(document.querySelector('#inside'));

    act(() => handle().close());
    // focus was inside a panel about to go inert, so it is handed back
    expect(document.activeElement).toBe(opener);
  });

  it('does not move focus for a persistent drawer', () => {
    const { handle } = mount({ mode: 'side' });
    const opener = document.querySelector('#opener') as HTMLButtonElement;
    opener.focus();

    act(() => handle().open());
    // Tab must flow from the page into the landmark, not be moved there
    expect(document.activeElement).toBe(opener);
  });

  it('honours every autoFocus target', () => {
    const { unmount } = mount({ defaultOpened: true, autoFocus: 'panel' });
    expect(document.activeElement).toBe(panel());
    unmount();

    const none = mount({ defaultOpened: true, autoFocus: 'none' });
    expect(document.activeElement).toBe(document.body);
    none.unmount();

    mount({ defaultOpened: true, autoFocus: '#inside' });
    expect(document.activeElement).toBe(document.querySelector('#inside'));
  });

  it('traps Tab in a modal drawer but not in a persistent one', () => {
    const { rerender } = render(<Host opened />);
    (document.querySelector('#inside') as HTMLButtonElement).focus();
    const trapped = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      panel().dispatchEvent(trapped);
    });
    expect(trapped.defaultPrevented).toBe(true);

    rerender(<Host opened mode="side" />);
    const free = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      panel().dispatchEvent(free);
    });
    expect(free.defaultPrevented).toBe(false);
  });
});

describe('<OgeDrawer> — disabled, close button and toggle(force)', () => {
  it('disabled blocks opening and marks the host', () => {
    const { handle, state } = mount({ disabled: true });
    act(() => handle().open());
    expect(state.opened).toBe(false);
    expect(panel().hasAttribute('inert')).toBe(true);
    expect(root().classList.contains('oge-disabled')).toBe(true);
  });

  it('disabled blocks closing an already open drawer', () => {
    const closes: unknown[] = [];
    let handle: OgeDrawerHandle | null = null;
    const opened = { value: true };
    const host = (disabled: boolean) => (
      <Host
        opened
        disabled={disabled}
        handleRef={(h) => {
          handle = h;
        }}
        onOpenedChange={(next) => {
          opened.value = next;
        }}
        onClosed={(event) => closes.push(event)}
      />
    );
    // it opens first, and only then is disabled — disabling never closes
    const { rerender } = render(host(false));
    rerender(host(true));
    act(() => (handle as unknown as OgeDrawerHandle).close());
    // it stays open and stays usable — disabling the gestures, not the content
    expect(opened.value).toBe(true);
    expect(closes.length).toBe(0);
  });

  it('renders no close button unless asked, and closes when clicked', () => {
    const { rerender } = render(<Host defaultOpened />);
    expect(closeButton()).toBeNull();

    rerender(<Host defaultOpened showCloseButton />);
    expect(closeButton()?.getAttribute('aria-label')).toBe('Close drawer');

    act(() => {
      fireEvent.click(closeButton() as HTMLButtonElement);
    });
    expect(panel().hasAttribute('inert')).toBe(true);
  });

  it('a backdrop click closes only when the press started on it', () => {
    const { state } = mount({ defaultOpened: true });
    // a drag that ends on the backdrop after starting inside the panel
    act(() => {
      fireEvent.click(backdrop() as HTMLElement);
    });
    expect(state.opened).toBe(true);

    act(() => {
      fireEvent.pointerDown(backdrop() as HTMLElement);
      fireEvent.click(backdrop() as HTMLElement);
    });
    expect(state.opened).toBe(false);
  });

  it('toggle(force) drives the drawer to a known state', () => {
    const { handle, state } = mount();
    act(() => handle().toggle(true));
    expect(state.opened).toBe(true);

    // forcing the state it already has is a no-op, not a flip
    act(() => handle().toggle(true));
    expect(state.opened).toBe(true);

    act(() => handle().toggle(false));
    expect(state.opened).toBe(false);

    act(() => handle().toggle());
    expect(state.opened).toBe(true);
  });
});

/**
 * jsdom performs no layout, so the drawer would always be handed a zero-width
 * container ("not measured yet") and never go compact. These cases install a
 * size getter and a stand-in `ResizeObserver`, exactly as the Angular spec
 * does.
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
      return this.classList.contains('oge-drawer') ? container.size : 0;
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
    resize: () => act(() => notify?.()),
    restore: () => {
      if (clientWidth) Object.defineProperty(proto, 'clientWidth', clientWidth);
      (globalThis as Record<string, unknown>).ResizeObserver = previous;
    },
  };
}

describe('<OgeDrawer> — compactBelow', () => {
  let harness: ReturnType<typeof installHarness> | undefined;
  afterEach(() => {
    harness?.restore();
    harness = undefined;
  });

  function mountCompact(size: number) {
    const container = { size };
    harness = installHarness(container);
    const changes: { mode: string; requestedMode: string; compact: boolean }[] =
      [];
    const result = mount({
      mode: 'side',
      compactBelow: 720,
      defaultOpened: true,
      onModeChanged: (event) => changes.push({ ...event }),
    });
    return { ...result, container, changes };
  }

  it('keeps the requested mode while the container is wide enough', () => {
    const { state } = mountCompact(900);
    expect(root().getAttribute('data-mode')).toBe('side');
    expect(root().classList.contains('oge-drawer-compact')).toBe(false);
    expect(state.opened).toBe(true);
  });

  it('downgrades to overlay and closes when the container narrows', () => {
    const { state, container, changes } = mountCompact(900);
    changes.length = 0;

    container.size = 400;
    harness?.resize();

    expect(root().getAttribute('data-mode')).toBe('overlay');
    expect(root().classList.contains('oge-drawer-compact')).toBe(true);
    // an overlay covering the content with a backdrop the user never asked
    // for is worse than a closed drawer
    expect(state.opened).toBe(false);
    expect(changes.at(-1)).toEqual({
      mode: 'overlay',
      requestedMode: 'side',
      compact: true,
    });
  });

  it('restores the requested mode when the room comes back', () => {
    const { container, changes } = mountCompact(400);
    expect(root().getAttribute('data-mode')).toBe('overlay');

    changes.length = 0;
    container.size = 900;
    harness?.resize();

    expect(root().getAttribute('data-mode')).toBe('side');
    expect(changes.at(-1)).toEqual({
      mode: 'side',
      requestedMode: 'side',
      compact: false,
    });
  });

  it('releases the modal hold when it stops being modal', () => {
    // Going compact→side while open must undo everything a modal surface
    // holds; otherwise the body stays scroll-locked with no dialog on screen.
    const { handle, container } = mountCompact(400);
    act(() => handle().open());
    expect(panel().getAttribute('aria-modal')).toBe('true');

    container.size = 900;
    harness?.resize();

    expect(panel().getAttribute('aria-modal')).toBeNull();
    expect(panel().getAttribute('role')).toBe('navigation');
  });
});

describe('<OgeDrawer> — StrictMode', () => {
  function StrictHost() {
    const handle = useRef<OgeDrawerHandle>(null);
    const [opened, setOpened] = useState(false);
    return (
      <>
        <button type="button" id="strict-open" onClick={() => setOpened(true)}>
          Open
        </button>
        <OgeDrawer
          ref={handle}
          opened={opened}
          onOpenedChange={setOpened}
          scrollLock={false}
          inertBackground={false}
          panel={
            <button type="button" id="inside">
              In
            </button>
          }
        >
          <main>content</main>
        </OgeDrawer>
      </>
    );
  }

  it('survives a double mount and still opens and closes', () => {
    render(
      <StrictMode>
        <StrictHost />
      </StrictMode>,
    );
    expect(panel().hasAttribute('inert')).toBe(true);

    act(() => {
      fireEvent.click(document.querySelector('#strict-open') as HTMLElement);
    });
    expect(panel().hasAttribute('inert')).toBe(false);

    escape();
    expect(panel().hasAttribute('inert')).toBe(true);
  });
});
