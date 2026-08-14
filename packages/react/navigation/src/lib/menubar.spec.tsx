import { StrictMode, createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type {
  OgeMenubarCompactChangedEvent,
  OgeMenubarItemClickEvent,
  OgeMenubarItemData,
  OgeMenubarSubmenuClosedEvent,
  OgeMenubarSubmenuClosingEvent,
  OgeMenubarSubmenuOpenedEvent,
  OgeMenubarSubmenuOpeningEvent,
} from '@oge-ui/behavior';
import { OgeMenubar, type OgeMenubarHandle } from './menubar';
import { OgeMenubarConfigProvider } from './navigation-config';

const MENU: readonly OgeMenubarItemData[] = [
  {
    text: 'File',
    key: 'file',
    items: [
      { text: 'New', key: 'new' },
      { text: 'Open…', key: 'open' },
      { separator: true, text: '' },
      { text: 'Share', key: 'share', items: [{ text: 'Email', key: 'email' }] },
    ],
  },
  { text: 'Edit', key: 'edit', items: [{ text: 'Undo', key: 'undo' }] },
  { text: 'Help', key: 'help' },
];

const barItems = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-menubar-item'));
const lists = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-menu-list'));
const rows = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-menu-item'));
const rowTexts = (): (string | undefined)[] =>
  rows().map((el) => el.textContent?.trim());

/** Lets the panel machine measure (it schedules through rAF). */
function settle(): void {
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

const click = (el: HTMLElement, detail = 1): void => {
  fireEvent.click(el, { detail });
};
const key = (el: HTMLElement, k: string): void => {
  fireEvent.keyDown(el, { key: k, bubbles: true });
};

describe('<OgeMenubar>', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'Date'],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('renders the data-driven items as a bar', () => {
    render(<OgeMenubar items={MENU} />);
    expect(barItems().map((el) => el.textContent?.trim())).toEqual([
      'File',
      'Edit',
      'Help',
    ]);
  });

  it('clicking a parent item toggles its submenu', () => {
    const closed: OgeMenubarSubmenuClosedEvent[] = [];
    const opened: OgeMenubarSubmenuOpenedEvent[] = [];
    render(
      <OgeMenubar
        items={MENU}
        onSubmenuOpened={(e) => opened.push(e)}
        onSubmenuClosed={(e) => closed.push(e)}
      />,
    );
    click(barItems()[0]);
    settle();
    expect(lists()).toHaveLength(1);
    expect(opened).toEqual([{ item: MENU[0], key: 'file', path: [0] }]);

    click(barItems()[0]);
    settle();
    expect(lists()).toHaveLength(0);
    expect(closed.map((c) => c.reason)).toEqual(['api']);
  });

  it('clicking a leaf item emits itemClick with its path', () => {
    const clicks: OgeMenubarItemClickEvent[] = [];
    render(<OgeMenubar items={MENU} onItemClick={(e) => clicks.push(e)} />);
    click(barItems()[2]);
    expect(clicks).toHaveLength(1);
    expect(clicks[0].key).toBe('help');
    expect(clicks[0].path).toEqual([2]);
    expect(clicks[0].index).toBe(2);
  });

  it('selecting a nested leaf reports the full hierarchical path', () => {
    const clicks: OgeMenubarItemClickEvent[] = [];
    const closed: OgeMenubarSubmenuClosedEvent[] = [];
    const ref = createRef<OgeMenubarHandle>();
    render(
      <OgeMenubar
        ref={ref}
        items={MENU}
        onItemClick={(e) => clicks.push(e)}
        onSubmenuClosed={(e) => closed.push(e)}
      />,
    );
    act(() => ref.current?.open('file'));
    settle();
    click(
      rows().find((el) => el.textContent?.includes('Share')) as HTMLElement,
    );
    settle();
    click(
      rows().find((el) => el.textContent?.includes('Email')) as HTMLElement,
    );
    settle();
    expect(clicks).toHaveLength(1);
    expect(clicks[0].key).toBe('email');
    // File (0) → Share (3, after the separator) → Email (0).
    expect(clicks[0].path).toEqual([0, 3, 0]);
    expect(closed.map((c) => c.reason)).toEqual(['select']);
    expect(lists()).toHaveLength(0);
  });

  it('open() accepts an index or a key; close() closes', () => {
    const ref = createRef<OgeMenubarHandle>();
    render(<OgeMenubar ref={ref} items={MENU} />);
    act(() => ref.current?.open(1));
    settle();
    expect(lists()[0].getAttribute('aria-label')).toBe('Edit');

    act(() => ref.current?.close());
    settle();
    expect(lists()).toHaveLength(0);

    act(() => ref.current?.open('file'));
    settle();
    expect(lists()[0].getAttribute('aria-label')).toBe('File');
  });

  it('cancelling submenuOpening keeps the menu closed', () => {
    const ref = createRef<OgeMenubarHandle>();
    const opened: OgeMenubarSubmenuOpenedEvent[] = [];
    render(
      <OgeMenubar
        ref={ref}
        items={MENU}
        onSubmenuOpening={(e: OgeMenubarSubmenuOpeningEvent) =>
          (e.cancel = true)
        }
        onSubmenuOpened={(e) => opened.push(e)}
      />,
    );
    act(() => ref.current?.open('file'));
    settle();
    expect(lists()).toHaveLength(0);
    expect(opened).toHaveLength(0);
  });

  it('cancelling submenuClosing keeps the menu open', () => {
    const ref = createRef<OgeMenubarHandle>();
    const closed: OgeMenubarSubmenuClosedEvent[] = [];
    let veto = false;
    render(
      <OgeMenubar
        ref={ref}
        items={MENU}
        onSubmenuClosing={(e: OgeMenubarSubmenuClosingEvent) =>
          (e.cancel = veto)
        }
        onSubmenuClosed={(e) => closed.push(e)}
      />,
    );
    act(() => ref.current?.open('file'));
    settle();
    veto = true;
    act(() => ref.current?.close());
    settle();
    expect(lists()).toHaveLength(1);
    expect(closed).toHaveLength(0);
  });

  it('switching bar items reports a navigation close of the previous menu', () => {
    const ref = createRef<OgeMenubarHandle>();
    const opened: OgeMenubarSubmenuOpenedEvent[] = [];
    const closed: OgeMenubarSubmenuClosedEvent[] = [];
    render(
      <OgeMenubar
        ref={ref}
        items={MENU}
        onSubmenuOpened={(e) => opened.push(e)}
        onSubmenuClosed={(e) => closed.push(e)}
      />,
    );
    act(() => ref.current?.open('file'));
    settle();
    act(() => ref.current?.open('edit'));
    settle();
    expect(lists()[0].getAttribute('aria-label')).toBe('Edit');
    expect(closed.map((c) => [c.key, c.reason])).toEqual([
      ['file', 'navigation'],
    ]);
    expect(opened.map((o) => o.key)).toEqual(['file', 'edit']);
  });

  it('items with visible: false disappear at every depth', () => {
    const ref = createRef<OgeMenubarHandle>();
    render(
      <OgeMenubar
        ref={ref}
        items={[
          {
            text: 'File',
            items: [{ text: 'Hidden', visible: false }, { text: 'New' }],
          },
          { text: 'Gone', visible: false },
        ]}
      />,
    );
    expect(barItems().map((el) => el.textContent?.trim())).toEqual(['File']);
    act(() => ref.current?.open(0));
    settle();
    expect(rowTexts()).toEqual(['New']);
  });

  it('a disabled bar is inert and leaves the Tab sequence', () => {
    const ref = createRef<OgeMenubarHandle>();
    const items: readonly OgeMenubarItemData[] = [
      { text: 'File', key: 'file', items: [{ text: 'New' }] },
      { text: 'Inbox', key: 'inbox', badge: 3 },
    ];
    const view = render(<OgeMenubar ref={ref} items={items} disabled />);
    const buttons = () =>
      Array.from(
        document.querySelectorAll<HTMLButtonElement>('.oge-menubar-item'),
      );
    expect(document.querySelector('.oge-menubar-disabled')).not.toBeNull();
    expect(buttons().every((item) => item.tabIndex === -1)).toBe(true);
    expect(buttons()[0].disabled).toBe(true);

    act(() => ref.current?.open('file'));
    settle();
    expect(lists()).toHaveLength(0);

    view.rerender(<OgeMenubar ref={ref} items={items} disabled={false} />);
    expect(buttons().some((item) => item.tabIndex === 0)).toBe(true);
  });

  it('renders an item badge on the bar', () => {
    render(<OgeMenubar items={[{ text: 'Inbox', key: 'inbox', badge: 3 }]} />);
    expect(
      document.querySelector('.oge-menubar-item-badge')?.textContent?.trim(),
    ).toBe('3');
  });

  it('the config provider overrides messages', () => {
    render(
      <OgeMenubarConfigProvider
        config={{ messages: { menubar: 'Ana menü', hamburger: 'Menü' } }}
      >
        <OgeMenubar items={MENU} />
      </OgeMenubarConfigProvider>,
    );
    expect(
      document.querySelector('[role="menubar"]')?.getAttribute('aria-label'),
    ).toBe('Ana menü');
  });

  it('per-instance messages win over the provider', () => {
    render(<OgeMenubar items={MENU} messages={{ menubar: 'Komutlar' }} />);
    expect(
      document.querySelector('[role="menubar"]')?.getAttribute('aria-label'),
    ).toBe('Komutlar');
  });

  it('renderItem replaces the top-level item rendering', () => {
    render(
      <OgeMenubar
        items={MENU}
        renderItem={(item) => <strong>{item.text?.toUpperCase()}</strong>}
      />,
    );
    expect(barItems()[0].textContent?.trim()).toBe('FILE');
  });

  it('survives a StrictMode double mount', () => {
    const ref = createRef<OgeMenubarHandle>();
    render(
      <StrictMode>
        <OgeMenubar ref={ref} items={MENU} />
      </StrictMode>,
    );
    act(() => ref.current?.open('file'));
    settle();
    expect(lists()).toHaveLength(1);
    act(() => ref.current?.close());
    settle();
    expect(lists()).toHaveLength(0);
  });
});

describe('<OgeMenubar> — accessibility contract', () => {
  const A11Y_MENU: readonly OgeMenubarItemData[] = [
    { text: 'File', key: 'file', items: [{ text: 'New', key: 'new' }] },
    { separator: true, text: '' },
    { text: 'Docs', key: 'docs', url: '/docs' },
    { text: 'Off', key: 'off', disabled: true },
  ];

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'Date'],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('renders the APG role and attribute contract', () => {
    render(<OgeMenubar items={A11Y_MENU} />);
    const bar = document.querySelector('[role="menubar"]') as HTMLElement;
    expect(bar.getAttribute('aria-label')).toBe('Menu bar');
    expect(bar.getAttribute('aria-orientation')).toBeNull();

    const items = Array.from(bar.querySelectorAll('[role="menuitem"]'));
    expect(items).toHaveLength(3);
    expect(items[0].getAttribute('aria-haspopup')).toBe('menu');
    expect(items[0].getAttribute('aria-expanded')).toBe('false');
    expect(items[1].tagName).toBe('A');
    expect(items[1].getAttribute('href')).toBe('/docs');
    expect(items[1].getAttribute('aria-haspopup')).toBeNull();
    expect(items[2].getAttribute('aria-disabled')).toBe('true');

    expect(
      bar.querySelector('[role="separator"]')?.getAttribute('aria-orientation'),
    ).toBe('vertical');
  });

  it('wires aria-controls to the open panel', () => {
    render(<OgeMenubar items={A11Y_MENU} />);
    const parent = document.querySelector('[role="menuitem"]') as HTMLElement;
    expect(parent.getAttribute('aria-controls')).toBeNull();
    click(parent);
    settle();
    const menu = document.querySelector('.oge-menu-list') as HTMLElement;
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    expect(parent.getAttribute('aria-controls')).toBe(
      menu.closest('.oge-popup')?.id,
    );
    expect(menu.getAttribute('aria-label')).toBe('File');
  });

  it('activeKey marks the current item with aria-current="page"', () => {
    const view = render(<OgeMenubar items={A11Y_MENU} activeKey="docs" />);
    const link = document.querySelector('a.oge-menubar-item') as HTMLElement;
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(link.classList.contains('oge-menubar-item-active')).toBe(true);

    view.rerender(<OgeMenubar items={A11Y_MENU} />);
    expect(
      document
        .querySelector('a.oge-menubar-item')
        ?.getAttribute('aria-current'),
    ).toBeNull();
  });

  it('a vertical bar sets aria-orientation and swaps the arrow axes', () => {
    render(<OgeMenubar items={A11Y_MENU} orientation="vertical" />);
    const bar = document.querySelector('[role="menubar"]') as HTMLElement;
    expect(bar.getAttribute('aria-orientation')).toBe('vertical');
    expect(
      bar.querySelector('[role="separator"]')?.getAttribute('aria-orientation'),
    ).toBe('horizontal');

    const items = Array.from(
      bar.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    key(items[0], 'ArrowDown');
    // Vertical: ArrowDown traverses instead of opening.
    expect(document.activeElement).toBe(items[1]);
    expect(lists()).toHaveLength(0);

    key(items[0], 'ArrowRight');
    settle();
    // Vertical: ArrowRight opens the submenu.
    expect(lists()).toHaveLength(1);
  });
});

describe('<OgeMenubar> — APG keyboard', () => {
  const KEY_MENU: readonly OgeMenubarItemData[] = [
    {
      text: 'File',
      key: 'file',
      items: [
        { text: 'New', key: 'new' },
        {
          text: 'Share',
          key: 'share',
          items: [{ text: 'Email', key: 'email' }],
        },
      ],
    },
    { text: 'Edit', key: 'edit', items: [{ text: 'Undo', key: 'undo' }] },
    { text: 'Help', key: 'help' },
  ];

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'Date'],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('keeps a single roving tab stop on the bar', () => {
    render(<OgeMenubar items={KEY_MENU} />);
    expect(barItems().map((el) => el.tabIndex)).toEqual([0, -1, -1]);
    key(barItems()[0], 'ArrowRight');
    expect(barItems().map((el) => el.tabIndex)).toEqual([-1, 0, -1]);
    expect(document.activeElement).toBe(barItems()[1]);
  });

  it('ArrowLeft wraps backwards; Home/End jump to the edges', () => {
    render(<OgeMenubar items={KEY_MENU} />);
    key(barItems()[0], 'ArrowLeft');
    expect(document.activeElement).toBe(barItems()[2]);
    key(barItems()[2], 'Home');
    expect(document.activeElement).toBe(barItems()[0]);
    key(barItems()[0], 'End');
    expect(document.activeElement).toBe(barItems()[2]);
  });

  it('ArrowDown opens the submenu with the first item active', () => {
    render(<OgeMenubar items={KEY_MENU} />);
    key(barItems()[0], 'ArrowDown');
    settle();
    expect(lists()).toHaveLength(1);
    expect(barItems()[0].getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(lists()[0]);
    expect(lists()[0].getAttribute('aria-activedescendant')).toMatch(
      /-item-0$/,
    );
  });

  it('ArrowUp opens the submenu with the last item active', () => {
    render(<OgeMenubar items={KEY_MENU} />);
    key(barItems()[0], 'ArrowUp');
    settle();
    expect(lists()[0].getAttribute('aria-activedescendant')).toMatch(
      /-item-1$/,
    );
  });

  it('Escape closes the submenu and returns focus to the bar item', () => {
    render(<OgeMenubar items={KEY_MENU} />);
    key(barItems()[0], 'ArrowDown');
    settle();
    key(lists()[0], 'Escape');
    settle();
    expect(lists()).toHaveLength(0);
    expect(document.activeElement).toBe(barItems()[0]);
    expect(barItems()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('ArrowRight on a submenu leaf hops to the next bar item, menu open', () => {
    render(<OgeMenubar items={KEY_MENU} />);
    key(barItems()[0], 'ArrowDown'); // File menu, New active
    settle();
    key(lists()[0], 'ArrowRight'); // leaf → Edit opens focused
    settle();
    expect(barItems()[1].getAttribute('aria-expanded')).toBe('true');
    expect(barItems()[0].getAttribute('aria-expanded')).toBe('false');
    expect(lists()[0].getAttribute('aria-label')).toBe('Edit');
    expect(document.activeElement).toBe(lists()[0]);
  });

  it('ArrowLeft in a level-1 submenu hops to the previous bar item', () => {
    render(<OgeMenubar items={KEY_MENU} />);
    key(barItems()[1], 'ArrowDown'); // Edit menu
    settle();
    key(lists()[0], 'ArrowLeft');
    settle();
    expect(lists()[0].getAttribute('aria-label')).toBe('File');
    expect(barItems()[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('ArrowRight on a nested parent opens the nested submenu instead of hopping', () => {
    render(<OgeMenubar items={KEY_MENU} />);
    key(barItems()[0], 'ArrowDown');
    settle();
    key(lists()[0], 'ArrowDown'); // → Share
    key(lists()[0], 'ArrowRight'); // opens nested Email menu
    settle();
    expect(lists()).toHaveLength(2);
    expect(lists()[1].getAttribute('aria-label')).toBe('Share');
    expect(document.activeElement).toBe(lists()[1]);

    // ArrowLeft returns to the parent list, not the bar.
    key(lists()[1], 'ArrowLeft');
    settle();
    expect(lists()).toHaveLength(1);
    expect(document.activeElement).toBe(lists()[0]);
    expect(barItems()[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('ArrowRight on a nested leaf hops all the way to the next bar item', () => {
    render(<OgeMenubar items={KEY_MENU} />);
    key(barItems()[0], 'ArrowDown');
    settle();
    key(lists()[0], 'ArrowDown');
    key(lists()[0], 'ArrowRight'); // nested open, Email active
    settle();
    key(lists()[1], 'ArrowRight'); // nested leaf → Edit
    settle();
    expect(lists()).toHaveLength(1);
    expect(lists()[0].getAttribute('aria-label')).toBe('Edit');
    expect(barItems()[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('Enter on a submenu leaf selects it and refocuses the bar item', () => {
    const clicks: OgeMenubarItemClickEvent[] = [];
    render(<OgeMenubar items={KEY_MENU} onItemClick={(e) => clicks.push(e)} />);
    key(barItems()[0], 'ArrowDown');
    settle();
    key(lists()[0], 'Enter'); // New
    settle();
    expect(clicks).toHaveLength(1);
    expect(clicks[0].key).toBe('new');
    expect(lists()).toHaveLength(0);
    expect(document.activeElement).toBe(barItems()[0]);
  });

  it('type-ahead moves the bar focus by prefix', () => {
    render(<OgeMenubar items={KEY_MENU} />);
    key(barItems()[0], 'e');
    expect(document.activeElement).toBe(barItems()[1]);
    // Within the idle window keystrokes accumulate ("e","h" → "eh" — no
    // match); a fresh press after it starts a new prefix search.
    vi.setSystemTime(Date.now() + 600);
    key(barItems()[1], 'h');
    expect(document.activeElement).toBe(barItems()[2]);
  });

  it('hover only opens a closed menu in hover mode, after the delay', () => {
    const view = render(<OgeMenubar items={KEY_MENU} />);
    fireEvent.pointerEnter(barItems()[0]);
    settle();
    expect(lists()).toHaveLength(0); // click mode: hover never opens

    view.rerender(<OgeMenubar items={KEY_MENU} openMode="hover" />);
    fireEvent.pointerEnter(barItems()[0]);
    settle();
    expect(lists()).toHaveLength(1);
  });

  it('with a menu open, hovering a sibling switches without a click', () => {
    render(<OgeMenubar items={KEY_MENU} />);
    key(barItems()[0], 'ArrowDown');
    settle();
    fireEvent.pointerEnter(barItems()[1]);
    settle();
    expect(lists()[0].getAttribute('aria-label')).toBe('Edit');
    // Hovering a childless sibling closes the open menu.
    fireEvent.pointerEnter(barItems()[2]);
    settle();
    expect(lists()).toHaveLength(0);
  });
});

/**
 * jsdom performs no layout, so the menubar would always be handed a zero-width
 * container ("not measured yet") and never go compact. These specs install a
 * size getter and a stand-in `ResizeObserver`; the decision itself is covered
 * DOM-free in core's `menubar-compact.spec.ts`.
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
      return this.classList.contains('oge-menubar') ? container.size : 0;
    },
  });

  // The anchored panel constructs its own ResizeObserver while open, so the
  // stub must fan notifications out to every registered callback.
  const callbacks: (() => void)[] = [];
  const previous = (globalThis as Record<string, unknown>).ResizeObserver;
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    constructor(cb: () => void) {
      callbacks.push(cb);
    }
    observe(): void {
      /* the spec drives notifications directly */
    }
    disconnect(): void {
      /* nothing to release */
    }
  };

  return {
    resize: () =>
      act(() => {
        [...callbacks].forEach((cb) => cb());
      }),
    restore: () => {
      if (clientWidth) Object.defineProperty(proto, 'clientWidth', clientWidth);
      (globalThis as Record<string, unknown>).ResizeObserver = previous;
    },
  };
}

describe('<OgeMenubar> — compactBelow', () => {
  const COMPACT_MENU: readonly OgeMenubarItemData[] = [
    { text: 'File', key: 'file', items: [{ text: 'New', key: 'new' }] },
    { text: 'Help', key: 'help' },
  ];
  let harness: ReturnType<typeof installHarness> | undefined;

  const hamburger = () =>
    document.querySelector('.oge-menubar-hamburger') as HTMLElement | null;
  const barEl = () =>
    document.querySelector('.oge-menubar-bar') as HTMLElement | null;
  const hostEl = () => document.querySelector('.oge-menubar') as HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'Date'],
    });
  });
  afterEach(() => {
    harness?.restore();
    harness = undefined;
    vi.useRealTimers();
  });

  it('keeps the bar while the container is wide enough', () => {
    harness = installHarness({ size: 900 });
    render(<OgeMenubar items={COMPACT_MENU} compactBelow={480} />);
    settle();
    expect(barEl()).not.toBeNull();
    expect(hamburger()).toBeNull();
    expect(hostEl().classList.contains('oge-menubar-compact')).toBe(false);
  });

  it('collapses into a hamburger below the threshold and emits compactChanged', () => {
    const container = { size: 900 };
    harness = installHarness(container);
    const changes: OgeMenubarCompactChangedEvent[] = [];
    render(
      <OgeMenubar
        items={COMPACT_MENU}
        compactBelow={480}
        onCompactChanged={(e) => changes.push(e)}
      />,
    );
    settle();
    container.size = 400;
    harness.resize();
    settle();
    expect(barEl()).toBeNull();
    expect(hamburger()).not.toBeNull();
    expect(hamburger()?.getAttribute('aria-label')).toBe('Menu');
    expect(hostEl().classList.contains('oge-menubar-compact')).toBe(true);
    expect(changes).toEqual([{ compact: true }]);

    container.size = 900;
    harness.resize();
    settle();
    expect(barEl()).not.toBeNull();
    expect(changes).toEqual([{ compact: true }, { compact: false }]);
  });

  it('the hamburger opens the full tree as one nested menu', () => {
    harness = installHarness({ size: 400 });
    render(<OgeMenubar items={COMPACT_MENU} compactBelow={480} />);
    settle();
    click(hamburger() as HTMLElement);
    settle();
    expect(rowTexts()).toEqual(['File', 'Help']);
    // The childful root renders as a submenu parent inside the tree.
    expect(rows()[0].getAttribute('aria-haspopup')).toBe('menu');
    expect(hamburger()?.getAttribute('aria-expanded')).toBe('true');
  });

  it('collapsing while a menu is open closes it first', () => {
    const container = { size: 900 };
    harness = installHarness(container);
    const ref = createRef<OgeMenubarHandle>();
    render(<OgeMenubar ref={ref} items={COMPACT_MENU} compactBelow={480} />);
    settle();
    act(() => ref.current?.open('file'));
    settle();
    expect(lists()).toHaveLength(1);
    container.size = 400;
    harness.resize();
    settle();
    expect(lists()).toHaveLength(0);
  });
});
