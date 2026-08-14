import { StrictMode, useRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { OgeAccordion } from './accordion';
import { OgeAccordionConfigProvider } from './layout-config';
import type {
  OgeAccordionHandle,
  OgeAccordionItemDefinition,
} from './use-accordion';

/** Flushes the microtask queue inside `act` — guards and loaders settle here. */
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const toggles = (): HTMLButtonElement[] =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>('.oge-accordion-toggle'),
  );

const panels = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-accordion-panel'));

const expandedFlags = (): (string | null)[] =>
  toggles().map((b) => b.getAttribute('aria-expanded'));

const focusedIndex = (): number =>
  toggles().findIndex((b) => b === document.activeElement);

const key = (
  target: Element,
  keyName: string,
  init: KeyboardEventInit = {},
): void => {
  fireEvent.keyDown(target, { key: keyName, ...init });
};

const three: OgeAccordionItemDefinition[] = [
  { key: 'a', title: 'Account' },
  { key: 'b', title: 'Billing' },
  { key: 'c', title: 'Cancel' },
];

const four: OgeAccordionItemDefinition[] = [
  ...three,
  { key: 'd', title: 'Delivery' },
];

describe('<OgeAccordion> expansion', () => {
  it('renders one panel per visible item, in order', () => {
    render(
      <OgeAccordion
        items={[...three, { key: 'x', title: 'Hidden', visible: false }]}
      />,
    );
    expect(toggles().map((b) => b.textContent?.trim())).toEqual([
      'Account',
      'Billing',
      'Cancel',
    ]);
  });

  it('expands on click and collapses the sibling in single mode', async () => {
    render(<OgeAccordion items={three} />);
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['true', 'false', 'false']);

    fireEvent.click(toggles()[1]);
    await flush();
    expect(expandedFlags()).toEqual(['false', 'true', 'false']);
  });

  it('keeps several panels open in multiple mode', async () => {
    render(<OgeAccordion items={three} multiple />);
    fireEvent.click(toggles()[0]);
    fireEvent.click(toggles()[2]);
    await flush();
    expect(expandedFlags()).toEqual(['true', 'false', 'true']);
  });

  it('refuses to collapse the last open panel unless collapsible', async () => {
    const { rerender } = render(<OgeAccordion items={three} />);
    fireEvent.click(toggles()[0]);
    await flush();
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['true', 'false', 'false']);
    // APG: an expanded panel that cannot be collapsed is aria-disabled
    expect(toggles()[0].getAttribute('aria-disabled')).toBe('true');

    rerender(<OgeAccordion items={three} collapsible />);
    expect(toggles()[0].getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['false', 'false', 'false']);
  });

  it('honors the cancelable onItemExpanding pre-event', async () => {
    const expanded = vi.fn();
    render(
      <OgeAccordion
        items={three}
        onItemExpanding={(e) => (e.cancel = true)}
        onItemExpanded={expanded}
      />,
    );
    fireEvent.click(toggles()[1]);
    await flush();
    expect(expandedFlags()).toEqual(['false', 'false', 'false']);
    expect(expanded).not.toHaveBeenCalled();
  });

  it('honors the cancelable onItemCollapsing pre-event', async () => {
    render(
      <OgeAccordion
        items={three}
        multiple
        collapsible
        onItemCollapsing={(e) => (e.cancel = true)}
      />,
    );
    fireEvent.click(toggles()[0]);
    await flush();
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['true', 'false', 'false']);
  });

  it('ignores clicks on a disabled panel but still reports the click', async () => {
    const clicked = vi.fn();
    render(
      <OgeAccordion
        items={[three[0], { key: 'b', title: 'Billing', disabled: true }]}
        onItemClick={clicked}
      />,
    );
    fireEvent.click(toggles()[1]);
    await flush();
    expect(expandedFlags()).toEqual(['false', 'false']);
    expect(toggles()[1].getAttribute('tabindex')).toBe('-1');
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('syncs the controlled expandedKeys pair both ways', async () => {
    function Host() {
      const [keys, setKeys] = useState<readonly string[]>([]);
      return (
        <>
          <button type="button" onClick={() => setKeys(['a', 'c'])}>
            open ac
          </button>
          <OgeAccordion
            items={three}
            multiple
            expandedKeys={keys}
            onExpandedKeysChange={setKeys}
          />
          <output>{keys.join(',')}</output>
        </>
      );
    }
    render(<Host />);
    fireEvent.click(document.querySelector('button') as HTMLButtonElement);
    await flush();
    expect(expandedFlags()).toEqual(['true', 'false', 'true']);

    fireEvent.click(toggles()[1]);
    await flush();
    expect(
      (document.querySelector('output') as HTMLElement).textContent
        ?.split(',')
        .sort(),
    ).toEqual(['a', 'b', 'c']);
  });

  it('syncs the controlled selectedIndex pair both ways in single mode', async () => {
    function Host() {
      const [index, setIndex] = useState(-1);
      return (
        <>
          <button type="button" onClick={() => setIndex(2)}>
            select 2
          </button>
          <OgeAccordion
            items={three}
            selectedIndex={index}
            onSelectedIndexChange={setIndex}
          />
          <output>{index}</output>
        </>
      );
    }
    render(<Host />);
    fireEvent.click(document.querySelector('button') as HTMLButtonElement);
    await flush();
    expect(expandedFlags()).toEqual(['false', 'false', 'true']);

    fireEvent.click(toggles()[0]);
    await flush();
    expect((document.querySelector('output') as HTMLElement).textContent).toBe(
      '0',
    );
  });

  it('seeds the initial expanded state of an item', async () => {
    render(
      <OgeAccordion
        items={[
          { key: 'x', title: 'One' },
          { key: 'y', title: 'Two', expanded: true },
        ]}
      />,
    );
    await flush();
    expect(expandedFlags()).toEqual(['false', 'true']);
  });

  it('seeds the uncontrolled defaultExpandedKeys', async () => {
    render(
      <OgeAccordion items={three} multiple defaultExpandedKeys={['a', 'c']} />,
    );
    await flush();
    expect(expandedFlags()).toEqual(['true', 'false', 'true']);
  });

  it('expandAll and collapseAll respect multiple and collapsible', async () => {
    const handle = { current: null as OgeAccordionHandle | null };
    render(<OgeAccordion ref={handle} items={three} multiple collapsible />);
    act(() => handle.current?.expandAll());
    await flush();
    expect(expandedFlags()).toEqual(['true', 'true', 'true']);

    act(() => handle.current?.collapseAll());
    await flush();
    expect(expandedFlags()).toEqual(['false', 'false', 'false']);
  });

  it('expandAll does nothing in single-expand mode', async () => {
    const handle = { current: null as OgeAccordionHandle | null };
    render(<OgeAccordion ref={handle} items={three} collapsible />);
    act(() => handle.current?.expandAll());
    await flush();
    expect(expandedFlags()).toEqual(['false', 'false', 'false']);
  });

  it('expandInvalid opens every failing section', async () => {
    const handle = { current: null as OgeAccordionHandle | null };
    render(
      <OgeAccordion
        ref={handle}
        multiple
        items={[
          { key: 'a', title: 'Account' },
          { key: 'b', title: 'Billing', invalid: true },
          { key: 'c', title: 'Cancel', invalid: true },
        ]}
      />,
    );
    act(() => handle.current?.expandInvalid());
    await flush();
    expect(expandedFlags()).toEqual(['false', 'true', 'true']);
    expect(
      document.querySelectorAll('.oge-accordion-item-invalid'),
    ).toHaveLength(2);
  });

  it('exposes isExpanded / expand / collapse / toggle on the handle', async () => {
    const handle = { current: null as OgeAccordionHandle | null };
    render(<OgeAccordion ref={handle} items={three} multiple collapsible />);
    await act(async () => {
      expect(await handle.current?.expand('b')).toBe(true);
    });
    expect(handle.current?.isExpanded('b')).toBe(true);
    await act(async () => {
      expect(await handle.current?.toggle('b')).toBe(true);
    });
    expect(handle.current?.isExpanded(1)).toBe(false);
    await act(async () => {
      expect(await handle.current?.expand('nope')).toBe(false);
    });
  });

  it('prunes state for panels that disappear', async () => {
    const changes: readonly string[][] = [];
    function Host() {
      const [items, setItems] = useState(three);
      return (
        <>
          <button type="button" onClick={() => setItems(three.slice(0, 2))}>
            drop
          </button>
          <OgeAccordion
            items={items}
            multiple
            onExpandedKeysChange={(keys) => changes.push([...keys])}
          />
        </>
      );
    }
    render(<Host />);
    fireEvent.click(toggles()[2]);
    await flush();
    expect(changes.at(-1)).toEqual(['c']);

    fireEvent.click(document.querySelector('button') as HTMLButtonElement);
    await flush();
    expect(changes.at(-1)).toEqual([]);
  });
});

describe('<OgeAccordion> expandGuard', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  const pending = () =>
    document.querySelectorAll('.oge-accordion-item-pending').length;

  it('vetoes the expand when a sync guard returns false', async () => {
    render(
      <OgeAccordion
        multiple
        collapsible
        items={[{ key: 'a', title: 'Account', expandGuard: () => false }]}
      />,
    );
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['false']);
  });

  it('marks the panel pending while an async guard is in flight', async () => {
    let allow!: (value: boolean) => void;
    render(
      <OgeAccordion
        multiple
        collapsible
        items={[
          {
            key: 'a',
            title: 'Account',
            expandGuard: () => new Promise<boolean>((r) => (allow = r)),
          },
        ]}
      />,
    );
    fireEvent.click(toggles()[0]);
    await flush();
    expect(pending()).toBe(1);
    expect(expandedFlags()).toEqual(['false']);

    await act(async () => {
      allow(true);
      await Promise.resolve();
    });
    await flush();
    expect(pending()).toBe(0);
    expect(expandedFlags()).toEqual(['true']);
  });

  it('is single-flight — a second click while pending is ignored', async () => {
    let calls = 0;
    let allow!: (value: boolean) => void;
    render(
      <OgeAccordion
        multiple
        collapsible
        items={[
          {
            key: 'a',
            title: 'Account',
            expandGuard: () => {
              calls++;
              return new Promise<boolean>((r) => (allow = r));
            },
          },
        ]}
      />,
    );
    fireEvent.click(toggles()[0]);
    await flush();
    fireEvent.click(toggles()[0]);
    fireEvent.click(toggles()[0]);
    await flush();
    expect(calls).toBe(1);

    await act(async () => {
      allow(false);
      await Promise.resolve();
    });
    await flush();
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('treats a rejection as a veto, clears pending and warns', async () => {
    const expanded = vi.fn();
    render(
      <OgeAccordion
        multiple
        collapsible
        onItemExpanded={expanded}
        items={[
          {
            key: 'a',
            title: 'Account',
            expandGuard: () => Promise.reject(new Error('nope')),
          },
        ]}
      />,
    );
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['false']);
    expect(pending()).toBe(0);
    expect(expanded).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('treats a throw as a veto', async () => {
    render(
      <OgeAccordion
        multiple
        collapsible
        items={[
          {
            key: 'a',
            title: 'Account',
            expandGuard: () => {
              throw new Error('nope');
            },
          },
        ]}
      />,
    );
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['false']);
    expect(warn).toHaveBeenCalled();
  });

  it('runs the guard on collapse too', async () => {
    let verdict = true;
    render(
      <OgeAccordion
        multiple
        collapsible
        items={[{ key: 'a', title: 'Account', expandGuard: () => verdict }]}
      />,
    );
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['true']);

    verdict = false;
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['true']);

    verdict = true;
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['false']);
  });
});

describe('<OgeAccordion> keyboard', () => {
  it('keeps every header in the Tab sequence (APG: no roving tabindex)', () => {
    render(<OgeAccordion items={four} multiple collapsible />);
    expect(toggles().map((b) => b.getAttribute('tabindex'))).toEqual([
      '0',
      '0',
      '0',
      '0',
    ]);
  });

  it('wraps each header button in a native heading of the configured level', () => {
    const { rerender } = render(<OgeAccordion items={four} />);
    expect(document.querySelectorAll('h3.oge-accordion-heading')).toHaveLength(
      4,
    );
    expect(
      document.querySelector(
        'h3.oge-accordion-heading > .oge-accordion-toggle',
      ),
    ).not.toBeNull();

    rerender(<OgeAccordion items={four} headingLevel={2} />);
    expect(document.querySelectorAll('h2.oge-accordion-heading')).toHaveLength(
      4,
    );
    expect(document.querySelectorAll('h3.oge-accordion-heading')).toHaveLength(
      0,
    );
  });

  it('falls back to role=heading when the level has no native element', () => {
    render(<OgeAccordion items={four} headingLevel={7} />);
    const heading = document.querySelector('.oge-accordion-heading');
    expect(heading?.tagName).toBe('DIV');
    expect(heading?.getAttribute('role')).toBe('heading');
    expect(heading?.getAttribute('aria-level')).toBe('7');
  });

  it('moves focus with ArrowDown / ArrowUp and wraps', () => {
    render(<OgeAccordion items={four} multiple collapsible />);
    toggles()[0].focus();
    key(toggles()[0], 'ArrowDown');
    expect(focusedIndex()).toBe(1);

    key(toggles()[1], 'ArrowUp');
    expect(focusedIndex()).toBe(0);

    key(toggles()[0], 'ArrowUp');
    expect(focusedIndex()).toBe(3);
  });

  it('jumps to the first and last header with Home / End', () => {
    render(<OgeAccordion items={four} multiple collapsible />);
    toggles()[1].focus();
    key(toggles()[1], 'End');
    expect(focusedIndex()).toBe(3);

    key(toggles()[3], 'Home');
    expect(focusedIndex()).toBe(0);
  });

  it('skips disabled headers while navigating', () => {
    render(
      <OgeAccordion
        multiple
        collapsible
        items={[four[0], { ...four[1], disabled: true }, four[2], four[3]]}
      />,
    );
    toggles()[0].focus();
    key(toggles()[0], 'ArrowDown');
    expect(focusedIndex()).toBe(2);
  });

  it('moves focus by type-ahead over the titles', () => {
    render(<OgeAccordion items={four} multiple collapsible />);
    toggles()[0].focus();
    key(toggles()[0], 'd');
    expect(focusedIndex()).toBe(3);
  });

  it('supports Ctrl+PageDown / Ctrl+PageUp from inside panel content', () => {
    render(<OgeAccordion items={four} multiple collapsible />);
    toggles()[1].focus();
    const bodies = document.querySelectorAll('.oge-accordion-panel-body');
    key(bodies[1], 'PageDown', { ctrlKey: true });
    expect(focusedIndex()).toBe(2);

    key(bodies[2], 'PageUp', { ctrlKey: true });
    expect(focusedIndex()).toBe(1);
  });

  it('stays put when keyboardNavigation is off', () => {
    render(<OgeAccordion items={four} keyboardNavigation={false} />);
    toggles()[0].focus();
    key(toggles()[0], 'ArrowDown');
    expect(focusedIndex()).toBe(0);
  });

  it('expands on focus move when selectOnFocus is set', async () => {
    render(<OgeAccordion items={four} multiple collapsible selectOnFocus />);
    act(() => toggles()[2].focus());
    await flush();
    expect(toggles()[2].getAttribute('aria-expanded')).toBe('true');
  });

  it('focuses the first enabled header via the handle', () => {
    const handle = { current: null as OgeAccordionHandle | null };
    render(
      <OgeAccordion
        ref={handle}
        items={[{ ...four[0], disabled: true }, four[1], four[2], four[3]]}
      />,
    );
    act(() => handle.current?.focus());
    expect(focusedIndex()).toBe(1);
  });
});

describe('<OgeAccordion> accessibility and render props', () => {
  const withSlots = (extra: Partial<OgeAccordionItemDefinition> = {}) => [
    {
      key: 'child',
      title: 'Child',
      invalid: true,
      content: 'body',
      ...extra,
    },
    { key: 'a', title: 'Account' },
  ];

  it('renders header actions beside — never inside — the toggle button', () => {
    render(
      <OgeAccordion
        multiple
        collapsible
        items={withSlots({
          renderHeaderActions: () => (
            <button type="button" className="remove">
              Remove
            </button>
          ),
        })}
      />,
    );
    const remove = document.querySelector<HTMLButtonElement>('.remove');
    expect(remove).not.toBeNull();
    for (const toggle of toggles()) {
      expect(
        toggle.querySelectorAll('button, a[href], input, select, textarea'),
      ).toHaveLength(0);
    }
    expect(remove?.closest('.oge-accordion-toggle')).toBeNull();
    expect(remove?.closest('.oge-accordion-header')).not.toBeNull();
  });

  it('keeps the header actions clickable without toggling the panel', async () => {
    const removed: number[] = [];
    render(
      <OgeAccordion
        multiple
        collapsible
        items={withSlots({
          renderHeaderActions: ({ index }) => (
            <button
              type="button"
              className="remove"
              onClick={() => removed.push(index)}
            >
              Remove
            </button>
          ),
        })}
      />,
    );
    fireEvent.click(document.querySelector('.remove') as HTMLButtonElement);
    await flush();
    expect(removed).toEqual([0]);
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('wires the APG aria contract on every panel', () => {
    render(
      <OgeAccordion
        multiple
        collapsible
        ariaLabel="Settings"
        items={withSlots()}
      />,
    );
    toggles().forEach((toggle, index) => {
      expect(toggle.getAttribute('aria-controls')).toBe(panels()[index].id);
      expect(panels()[index].getAttribute('aria-labelledby')).toBe(toggle.id);
      expect(panels()[index].getAttribute('role')).toBe('region');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(toggle.closest('h3.oge-accordion-heading')).not.toBeNull();
    });
    expect(
      document.querySelector('.oge-accordion')?.getAttribute('aria-label'),
    ).toBe('Settings');
  });

  it('drops role=region when useRegionRole is off', () => {
    render(<OgeAccordion items={withSlots()} useRegionRole={false} />);
    expect(panels()[0].getAttribute('role')).toBeNull();
  });

  it('announces an invalid section with a visually hidden label', () => {
    render(<OgeAccordion items={withSlots()} />);
    const invalid = document.querySelector('.oge-accordion-item-invalid');
    expect(invalid).not.toBeNull();
    expect(invalid?.querySelector('.oge-accordion-sr')?.textContent).toContain(
      'section has errors',
    );
    expect(
      invalid
        ?.querySelector('.oge-accordion-invalid-dot')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('lets a per-panel renderHeader win over the shared one', () => {
    render(
      <OgeAccordion
        items={withSlots({
          renderHeader: ({ title }) => (
            <span className="own-header">{title}?</span>
          ),
        })}
        renderHeader={({ item }) => (
          <span className="custom-header">{item?.title}!</span>
        )}
      />,
    );
    const headers = toggles();
    expect(headers[0].querySelector('.own-header')?.textContent).toBe('Child?');
    expect(headers[1].querySelector('.custom-header')?.textContent).toBe(
      'Account!',
    );
  });

  it('replaces the chevron with renderToggleIcon on every panel', async () => {
    render(
      <OgeAccordion
        multiple
        collapsible
        items={withSlots()}
        renderToggleIcon={({ expanded }) => (
          <span className="custom-icon">{expanded ? '-' : '+'}</span>
        )}
      />,
    );
    expect(document.querySelectorAll('.custom-icon')).toHaveLength(2);
    expect(document.querySelector('.custom-icon')?.textContent).toBe('+');

    fireEvent.click(toggles()[1]);
    await flush();
    expect(document.querySelectorAll('.custom-icon')[1]?.textContent).toBe('-');
  });

  it('hides the toggle icon entirely with hideToggle', () => {
    render(<OgeAccordion items={withSlots()} hideToggle />);
    expect(
      document.querySelectorAll('.oge-accordion-toggle-icon'),
    ).toHaveLength(0);
  });

  it('renders an icon path and a badge from the item data', () => {
    render(
      <OgeAccordion
        items={[{ key: 'a', title: 'Account', icon: 'M4 4h16', badge: 7 }]}
      />,
    );
    expect(
      document.querySelector('.oge-accordion-icon path')?.getAttribute('d'),
    ).toBe('M4 4h16');
    expect(
      document.querySelector('.oge-accordion-badge')?.textContent?.trim(),
    ).toBe('7');
  });

  it('shows the empty message when nothing is visible', () => {
    render(<OgeAccordion items={[]} />);
    expect(
      document.querySelector('.oge-accordion-empty')?.textContent,
    ).toContain('No sections to display');
  });

  it('honors OgeAccordionConfigProvider message overrides', () => {
    render(
      <OgeAccordionConfigProvider
        config={{ messages: { noData: 'Bölüm yok' } }}
      >
        <OgeAccordion items={[]} />
      </OgeAccordionConfigProvider>,
    );
    expect(
      document.querySelector('.oge-accordion-empty')?.textContent,
    ).toContain('Bölüm yok');
  });

  it('maps the presets onto the host attributes', () => {
    render(
      <OgeAccordion
        items={three}
        displayMode="flat"
        stylingMode="filled"
        size="lg"
        togglePosition="start"
        disabled
      />,
    );
    const host = document.querySelector('.oge-accordion') as HTMLElement;
    expect(host.className).toContain('oge-accordion-flat');
    expect(host.className).toContain('oge-disabled');
    expect(host.getAttribute('data-styling-mode')).toBe('filled');
    expect(host.getAttribute('data-size')).toBe('lg');
    expect(host.getAttribute('data-toggle-position')).toBe('start');
  });
});

describe('<OgeAccordion> rendering', () => {
  let mounts = 0;

  function Spy() {
    const first = useRef(true);
    if (first.current) {
      first.current = false;
      mounts++;
    }
    return <span className="spy">spy</span>;
  }

  const spies = () => document.querySelectorAll('.spy').length;

  const lazyItems: OgeAccordionItemDefinition[] = [
    { key: 'a', title: 'Account', text: 'plain' },
    { key: 'b', title: 'Billing', renderContent: () => <Spy /> },
  ];

  beforeEach(() => (mounts = 0));

  it('defers lazy content until the panel first expands', async () => {
    render(<OgeAccordion items={lazyItems} multiple collapsible />);
    expect(spies()).toBe(0);

    fireEvent.click(toggles()[1]);
    await flush();
    expect(spies()).toBe(1);
    expect(mounts).toBe(1);
  });

  it('keeps content mounted after collapse with keepAlive', async () => {
    render(<OgeAccordion items={lazyItems} multiple collapsible />);
    fireEvent.click(toggles()[1]);
    await flush();
    fireEvent.click(toggles()[1]);
    await flush();
    expect(spies()).toBe(1);
    expect(mounts).toBe(1);

    fireEvent.click(toggles()[1]);
    await flush();
    expect(mounts).toBe(1);
  });

  it('destroys and re-creates content when keepAlive is off', async () => {
    render(
      <OgeAccordion items={lazyItems} multiple collapsible keepAlive={false} />,
    );
    fireEvent.click(toggles()[1]);
    await flush();
    expect(mounts).toBe(1);

    fireEvent.click(toggles()[1]);
    await flush();
    expect(spies()).toBe(0);

    fireEvent.click(toggles()[1]);
    await flush();
    expect(mounts).toBe(2);
  });

  it('renders everything up front when deferRendering is off', () => {
    render(
      <OgeAccordion
        items={lazyItems}
        multiple
        collapsible
        deferRendering={false}
      />,
    );
    expect(spies()).toBe(1);
  });

  it('renders the plain text body of a panel without content', async () => {
    render(<OgeAccordion items={lazyItems} multiple collapsible />);
    fireEvent.click(toggles()[0]);
    await flush();
    expect(
      document.querySelectorAll('.oge-accordion-panel-body')[0].textContent,
    ).toBe('plain');
  });

  it('keeps the panel element mounted so the aria id pair survives', () => {
    render(<OgeAccordion items={lazyItems} multiple collapsible />);
    expect(panels()).toHaveLength(2);
    expect(panels()[1].getAttribute('aria-labelledby')).toBe(
      toggles()[1].getAttribute('id'),
    );
    expect(toggles()[1].getAttribute('aria-controls')).toBe(panels()[1].id);
    // collapsed panels are inert so their content is not tabbable
    expect(panels()[1].hasAttribute('inert')).toBe(true);
  });

  it('fires afterExpand / afterCollapse immediately without an animation', async () => {
    const after: string[] = [];
    render(
      <OgeAccordion
        items={three}
        multiple
        collapsible
        animation={false}
        onAfterExpand={() => after.push('expand')}
        onAfterCollapse={() => after.push('collapse')}
      />,
    );
    fireEvent.click(toggles()[0]);
    await flush();
    fireEvent.click(toggles()[0]);
    await flush();
    expect(after).toEqual(['expand', 'collapse']);
  });

  it('survives a StrictMode double mount', async () => {
    render(
      <StrictMode>
        <OgeAccordion items={three} multiple collapsible />
      </StrictMode>,
    );
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['true', 'false', 'false']);
    fireEvent.click(toggles()[0]);
    await flush();
    expect(expandedFlags()).toEqual(['false', 'false', 'false']);
  });
});

describe('<OgeAccordion> content loader', () => {
  const skeleton = () => document.querySelector('.oge-accordion-skeleton');
  const error = () => document.querySelector('.oge-accordion-error');
  const retry = () =>
    document.querySelector<HTMLButtonElement>('.oge-accordion-retry');
  const payload = () => document.querySelector('.payload')?.textContent?.trim();

  const withLoader = (
    loader: () => Promise<unknown>,
    handlers: {
      onItemContentLoaded?: (e: { data: unknown }) => void;
      onItemContentFailed?: (e: { error: unknown }) => void;
    } = {},
  ) =>
    render(
      <OgeAccordion
        multiple
        collapsible
        items={[
          {
            key: 'a',
            title: 'Account',
            contentLoader: loader,
            renderContent: ({ data }) => (
              <span className="payload">{String(data)}</span>
            ),
          },
        ]}
        {...handlers}
      />,
    );

  it('shows a skeleton while loading, then the resolved content', async () => {
    let resolve!: (value: string) => void;
    const loaded: unknown[] = [];
    withLoader(() => new Promise<string>((r) => (resolve = r)), {
      onItemContentLoaded: (e) => loaded.push(e.data),
    });
    fireEvent.click(toggles()[0]);
    await flush();
    expect(skeleton()).not.toBeNull();
    expect(payload()).toBeUndefined();

    await act(async () => {
      resolve('42 invoices');
      await Promise.resolve();
    });
    await flush();
    expect(skeleton()).toBeNull();
    expect(payload()).toBe('42 invoices');
    expect(loaded).toEqual(['42 invoices']);
  });

  it('runs the loader only once across collapse and re-expand', async () => {
    let calls = 0;
    withLoader(() => {
      calls++;
      return Promise.resolve('once');
    });
    fireEvent.click(toggles()[0]);
    await flush();
    fireEvent.click(toggles()[0]);
    await flush();
    fireEvent.click(toggles()[0]);
    await flush();
    expect(calls).toBe(1);
  });

  it('renders an error with a working retry button on rejection', async () => {
    let attempt = 0;
    const failed: unknown[] = [];
    const loaded: unknown[] = [];
    withLoader(
      () => {
        attempt++;
        return attempt === 1
          ? Promise.reject(new Error('boom'))
          : Promise.resolve('second try');
      },
      {
        onItemContentFailed: (e) => failed.push(e.error),
        onItemContentLoaded: (e) => loaded.push(e.data),
      },
    );
    fireEvent.click(toggles()[0]);
    await flush();
    expect(error()).not.toBeNull();
    expect(failed).toHaveLength(1);

    fireEvent.click(retry() as HTMLButtonElement);
    await flush();
    expect(error()).toBeNull();
    expect(payload()).toBe('second try');
    expect(loaded).toHaveLength(1);
  });

  it('treats a synchronous throw in the loader as a failure', async () => {
    const failed: unknown[] = [];
    withLoader(
      () => {
        throw new Error('sync boom');
      },
      { onItemContentFailed: (e) => failed.push(e.error) },
    );
    fireEvent.click(toggles()[0]);
    await flush();
    expect(error()).not.toBeNull();
    expect(failed).toHaveLength(1);
  });

  it('replays the fade animation when content resolves late', async () => {
    let resolve!: (value: string) => void;
    withLoader(() => new Promise<string>((r) => (resolve = r)));
    fireEvent.click(toggles()[0]);
    await flush();
    expect(document.querySelector('.oge-accordion-fade-a')).toBeNull();

    await act(async () => {
      resolve('done');
      await Promise.resolve();
    });
    await flush();
    expect(document.querySelector('.oge-accordion-fade-a')).not.toBeNull();
  });
});
