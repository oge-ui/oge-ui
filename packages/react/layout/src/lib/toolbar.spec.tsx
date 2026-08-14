import { StrictMode, createRef, useState } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type {
  OgeToolbarItemActiveChangedEvent,
  OgeToolbarItemClickEvent,
  OgeToolbarItemData,
  OgeToolbarOverflowChangedEvent,
} from '@oge-ui/behavior';
import { OgeToolbar, type OgeToolbarHandle } from './toolbar';
import { OgeToolbarConfigProvider } from './layout-config';

const bar = () => document.querySelector('.oge-toolbar') as HTMLElement;
const menuButton = () =>
  document.querySelector('.oge-toolbar-menu-btn') as HTMLButtonElement;
const buttons = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.oge-toolbar-btn'));
const texts = () =>
  Array.from(document.querySelectorAll('.oge-toolbar-btn-text')).map((n) =>
    n.textContent?.trim(),
  );
const menuTexts = () =>
  Array.from(document.querySelectorAll('.oge-menu-item-text')).map((n) =>
    n.textContent?.trim(),
  );

const items: readonly OgeToolbarItemData[] = [
  { key: 'a', text: 'Alpha' },
  { key: 'b', text: 'Beta', locateInMenu: 'always' },
  { key: 'c', text: 'Gamma' },
];

/**
 * jsdom performs no layout, so the fitting math would always be handed a
 * zero-width container ("not measured yet") and nothing would ever collapse.
 * The size getters are keyed off the class names `measure()` reads — the same
 * stub the Angular toolbar specs install; the arithmetic itself is covered
 * DOM-free in core's `toolbar-fit.spec.ts`.
 */
const ITEM_SIZE = 50;
const MENU_BUTTON_SIZE = 32;

function installSizes(container: { size: number }): () => void {
  const proto = HTMLElement.prototype;
  const offsetWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
  const clientWidth = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  Object.defineProperty(proto, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.classList.contains('oge-toolbar-menu-btn')) {
        return MENU_BUTTON_SIZE;
      }
      return this.classList.contains('oge-toolbar-item') ? ITEM_SIZE : 0;
    },
  });
  Object.defineProperty(proto, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('oge-toolbar') ? container.size : 0;
    },
  });
  return () => {
    if (offsetWidth) Object.defineProperty(proto, 'offsetWidth', offsetWidth);
    if (clientWidth) Object.defineProperty(proto, 'clientWidth', clientWidth);
  };
}

describe('<OgeToolbar> rendering', () => {
  it('renders a role="toolbar" host with the data-driven items', () => {
    render(<OgeToolbar items={[items[0], items[2]]} />);
    expect(bar()).toHaveAttribute('role', 'toolbar');
    expect(texts()).toEqual(['Alpha', 'Gamma']);
  });

  it('drops items whose visible is false', () => {
    render(
      <OgeToolbar
        items={[
          { key: 'a', text: 'Alpha' },
          { key: 'b', text: 'Beta', visible: false },
        ]}
      />,
    );
    expect(texts()).toEqual(['Alpha']);
  });

  it('places items in the before / center / after sections', () => {
    render(
      <OgeToolbar
        items={[
          { key: 'a', text: 'A' },
          { key: 'b', text: 'B', location: 'center' },
          { key: 'c', text: 'C', location: 'after' },
        ]}
      />,
    );
    const textIn = (section: string) =>
      Array.from(
        document.querySelectorAll(
          `.oge-toolbar-section-${section} .oge-toolbar-btn`,
        ),
      ).map((n) => n.textContent?.trim());
    expect(textIn('before')).toEqual(['A']);
    expect(textIn('center')).toEqual(['B']);
    expect(textIn('after')).toEqual(['C']);
  });

  it('renders each item type with its own element', () => {
    render(
      <OgeToolbar
        items={[
          { key: 'b', type: 'button', text: 'Go' },
          { key: 's', type: 'separator' },
          { key: 'g', type: 'spacer' },
          { key: 'l', type: 'label', text: 'Rows' },
        ]}
      />,
    );
    expect(
      document.querySelector('.oge-toolbar-btn')?.textContent?.trim(),
    ).toBe('Go');
    expect(document.querySelector('.oge-toolbar-separator')).not.toBeNull();
    expect(document.querySelector('.oge-toolbar-gap')).not.toBeNull();
    expect(
      document.querySelector('.oge-toolbar-label')?.textContent?.trim(),
    ).toBe('Rows');
  });

  it('keeps the item wrapper class alongside a custom cssClass', () => {
    render(
      <OgeToolbar items={[{ key: 'a', text: 'A', cssClass: 'my-tool' }]} />,
    );
    const item = document.querySelector('.oge-toolbar-item') as HTMLElement;
    expect(item.classList.contains('oge-toolbar-item')).toBe(true);
    expect(item.classList.contains('my-tool')).toBe(true);
  });

  it('renders the severity and toggle-state chrome', () => {
    render(
      <OgeToolbar
        items={[
          { key: 'a', text: 'Save', severity: 'accent' },
          { key: 'b', text: 'Delete', severity: 'danger' },
          { key: 'c', text: 'Bold', active: true },
        ]}
      />,
    );
    expect(document.querySelector('.oge-toolbar-btn-accent')).not.toBeNull();
    expect(document.querySelector('.oge-toolbar-btn-danger')).not.toBeNull();
    expect(document.querySelector('[aria-pressed]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('renders an icon-only item with the text as its accessible name', () => {
    render(
      <OgeToolbar
        items={[
          { key: 'a', text: 'Columns', icon: 'M2 2h12', showText: 'inMenu' },
        ]}
      />,
    );
    const btn = document.querySelector('.oge-toolbar-btn') as HTMLElement;
    expect(btn.classList.contains('oge-toolbar-btn-icon-only')).toBe(true);
    expect(btn).toHaveAttribute('aria-label', 'Columns');
    expect(document.querySelector('.oge-toolbar-btn-text')).toBeNull();
    expect(document.querySelector('svg path')).toHaveAttribute('d', 'M2 2h12');
  });

  it('shows the empty message only when nothing at all is rendered', () => {
    const { unmount } = render(<OgeToolbar items={[]} />);
    expect(
      document.querySelector('.oge-toolbar-empty')?.textContent?.trim(),
    ).toBe('No commands to display');
    unmount();

    render(
      <OgeToolbar
        items={[]}
        after={
          <button type="button" className="slotted">
            Slot
          </button>
        }
      />,
    );
    expect(document.querySelector('.slotted')).not.toBeNull();
    expect(document.querySelector('.oge-toolbar-empty')).toBeNull();
  });

  it('emits itemClick with the index, key and source entry', () => {
    const clicks: OgeToolbarItemClickEvent[] = [];
    render(
      <OgeToolbar
        items={[{ key: 'c1', text: 'Child', data: 7 }]}
        onItemClick={(event) => clicks.push(event)}
      />,
    );
    fireEvent.click(buttons()[0]);
    expect(clicks.map((c) => [c.key, c.index, c.inMenu])).toEqual([
      ['c1', 0, false],
    ]);
    expect(clicks[0].item?.data).toBe(7);
  });

  it('does not activate a disabled item', () => {
    const clicks: number[] = [];
    render(
      <OgeToolbar
        items={[{ key: 'a', text: 'A', disabled: true }]}
        onItemClick={(event) => clicks.push(event.index)}
      />,
    );
    expect(buttons()[0].disabled).toBe(true);
    fireEvent.click(buttons()[0]);
    expect(clicks).toEqual([]);
  });

  it('replaces the items rendering with renderItem', () => {
    render(
      <OgeToolbar
        items={[{ key: 'a', text: 'A' }]}
        renderItem={({ item, index }) => (
          <span className="custom">
            {index}:{item?.text}
          </span>
        )}
      />,
    );
    expect(document.querySelector('.custom')?.textContent?.trim()).toBe('0:A');
    expect(document.querySelector('.oge-toolbar-btn')).toBeNull();
  });
});

describe('<OgeToolbar> string-union parity', () => {
  it('size: sm | md | lg', () => {
    const { rerender } = render(<OgeToolbar items={items} size="sm" />);
    expect(bar().className).toContain('oge-toolbar-sm');
    rerender(<OgeToolbar items={items} size="md" />);
    expect(bar().className).not.toContain('oge-toolbar-sm');
    expect(bar().className).not.toContain('oge-toolbar-lg');
    rerender(<OgeToolbar items={items} size="lg" />);
    expect(bar().className).toContain('oge-toolbar-lg');
  });

  it('stylingMode: outlined | filled | flat', () => {
    const { rerender } = render(<OgeToolbar stylingMode="outlined" />);
    expect(bar().className).not.toContain('oge-toolbar-filled');
    rerender(<OgeToolbar stylingMode="filled" />);
    expect(bar().className).toContain('oge-toolbar-filled');
    rerender(<OgeToolbar stylingMode="flat" />);
    expect(bar().className).toContain('oge-toolbar-flat');
  });

  it('orientation: horizontal | vertical', () => {
    const { rerender } = render(<OgeToolbar items={items} />);
    expect(bar().className).not.toContain('oge-toolbar-vertical');
    expect(bar().getAttribute('aria-orientation')).toBeNull();
    rerender(<OgeToolbar items={items} orientation="vertical" />);
    expect(bar().className).toContain('oge-toolbar-vertical');
    expect(bar()).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('overflow: menu | wrap | none', () => {
    const collapsing = [
      { key: 'a', text: 'A', locateInMenu: 'always' as const },
    ];
    const { rerender } = render(<OgeToolbar items={collapsing} />);
    expect(menuButton()).not.toBeNull();

    rerender(<OgeToolbar items={collapsing} overflow="wrap" />);
    expect(bar().className).toContain('oge-toolbar-wrap');
    expect(menuButton()).toBeNull();

    rerender(<OgeToolbar items={collapsing} overflow="none" />);
    expect(bar().className).not.toContain('oge-toolbar-wrap');
    expect(menuButton()).toBeNull();
  });

  it('showText / showIcon: always | inMenu | never', () => {
    const one = [{ key: 'a', text: 'A', icon: 'M2 2h12' }];
    for (const mode of ['always', 'inMenu', 'never'] as const) {
      const { unmount } = render(
        <OgeToolbar items={one} showText={mode} showIcon={mode} />,
      );
      const visible = mode === 'always';
      expect(document.querySelector('.oge-toolbar-btn-text') !== null).toBe(
        visible,
      );
      expect(document.querySelector('svg path') !== null).toBe(visible);
      // an icon-only button never loses its accessible name
      expect(
        document.querySelector('.oge-toolbar-btn')?.getAttribute('aria-label'),
      ).toBe(visible ? null : 'A');
      unmount();
    }
  });

  it('item severity: default | accent | danger', () => {
    for (const [severity, cls] of Object.entries({
      default: null,
      accent: 'oge-toolbar-btn-accent',
      danger: 'oge-toolbar-btn-danger',
    })) {
      const { unmount } = render(
        <OgeToolbar
          items={[
            {
              key: 'x',
              text: 'A',
              severity: severity as 'default' | 'accent' | 'danger',
            },
          ]}
        />,
      );
      const btn = buttons()[0];
      expect(btn.classList.contains('oge-toolbar-btn-accent')).toBe(
        cls === 'oge-toolbar-btn-accent',
      );
      expect(btn.classList.contains('oge-toolbar-btn-danger')).toBe(
        cls === 'oge-toolbar-btn-danger',
      );
      unmount();
    }
  });
});

describe('<OgeToolbar> keyboard (APG toolbar)', () => {
  const three: readonly OgeToolbarItemData[] = [
    { key: 'a', text: 'A' },
    { key: 'b', text: 'B' },
    { key: 'c', text: 'C' },
  ];
  const tabindexes = () => buttons().map((b) => b.getAttribute('tabindex'));

  it('puts exactly one control in the Tab sequence', () => {
    render(<OgeToolbar items={three} />);
    expect(tabindexes()).toEqual(['0', '-1', '-1']);
  });

  it('moves focus with Right/Left and follows the roving anchor', () => {
    render(<OgeToolbar items={three} />);
    act(() => buttons()[0].focus());
    fireEvent.keyDown(buttons()[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons()[1]);
    expect(tabindexes()).toEqual(['-1', '0', '-1']);

    fireEvent.keyDown(buttons()[1], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(buttons()[0]);
  });

  it('wraps by default and stops at the ends when wrap is off', () => {
    const { rerender } = render(<OgeToolbar items={three} />);
    act(() => buttons()[2].focus());
    fireEvent.keyDown(buttons()[2], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons()[0]);

    rerender(<OgeToolbar items={three} wrap={false} />);
    act(() => buttons()[2].focus());
    fireEvent.keyDown(buttons()[2], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons()[2]);
  });

  it('jumps to the first and last enabled control with Home/End', () => {
    render(<OgeToolbar items={three} />);
    act(() => buttons()[1].focus());
    fireEvent.keyDown(buttons()[1], { key: 'End' });
    expect(document.activeElement).toBe(buttons()[2]);
    fireEvent.keyDown(buttons()[2], { key: 'Home' });
    expect(document.activeElement).toBe(buttons()[0]);
  });

  it('skips disabled controls and anchors the Tab stop on the first enabled one', () => {
    render(
      <OgeToolbar
        items={[
          { key: 'a', text: 'A' },
          { key: 'b', text: 'B', disabled: true },
          { key: 'c', text: 'C' },
        ]}
      />,
    );
    act(() => buttons()[0].focus());
    fireEvent.keyDown(buttons()[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons()[2]);
  });

  it('anchors the Tab stop on the first enabled control', () => {
    render(
      <OgeToolbar
        items={[
          { key: 'a', text: 'A', disabled: true },
          { key: 'b', text: 'B' },
        ]}
      />,
    );
    expect(tabindexes()).toEqual(['-1', '0']);
  });

  it('uses Up/Down when the toolbar is vertical', () => {
    render(<OgeToolbar items={three} orientation="vertical" />);
    expect(bar()).toHaveAttribute('aria-orientation', 'vertical');
    act(() => buttons()[0].focus());
    fireEvent.keyDown(buttons()[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(buttons()[1]);
    // the horizontal keys are inert on a vertical toolbar
    fireEvent.keyDown(buttons()[1], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons()[1]);
  });

  it('leaves the arrow keys to a text-entry control', () => {
    render(
      <OgeToolbar
        items={three}
        after={<input className="search" type="search" />}
      />,
    );
    const input = document.querySelector('.search') as HTMLInputElement;
    act(() => input.focus());
    fireEvent.keyDown(input, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(input);
  });

  it('takes the whole toolbar out of the Tab sequence when disabled', () => {
    render(<OgeToolbar items={three} disabled />);
    expect(tabindexes()).toEqual(['-1', '-1', '-1']);
    expect(bar()).toHaveAttribute('aria-disabled', 'true');
  });

  it('keyboardNavigation off restores the natural Tab order', () => {
    const two: readonly OgeToolbarItemData[] = [
      { key: 'a', text: 'A' },
      { key: 'b', text: 'B' },
    ];
    const { rerender } = render(<OgeToolbar items={two} />);
    expect(tabindexes()).toEqual(['0', '-1']);

    rerender(<OgeToolbar items={two} keyboardNavigation={false} />);
    expect(tabindexes()).toEqual([null, null]);

    // and the arrow keys are inert
    act(() => buttons()[0].focus());
    fireEvent.keyDown(buttons()[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons()[0]);
  });
});

describe('<OgeToolbar> overflow menu', () => {
  it("keeps 'auto' items inline while the container is unmeasured", () => {
    // jsdom reports zero sizes, so only the explicit 'always' item collapses.
    render(<OgeToolbar items={items} />);
    expect(texts()).toEqual(['Alpha', 'Gamma']);
    expect(menuButton()).not.toBeNull();
  });

  it("never collapses a 'never' item and shows no button without a menu", () => {
    render(
      <OgeToolbar
        items={[
          { key: 'a', text: 'Alpha', locateInMenu: 'never' },
          { key: 'b', text: 'Beta', locateInMenu: 'never' },
        ]}
      />,
    );
    expect(texts()).toEqual(['Alpha', 'Beta']);
    expect(menuButton()).toBeNull();
  });

  it('opens the menu with the collapsed items and closes on select', async () => {
    const clicks: OgeToolbarItemClickEvent[] = [];
    let opened = 0;
    let closed = 0;
    const closings: string[] = [];
    render(
      <OgeToolbar
        items={items}
        onItemClick={(event) => clicks.push(event)}
        onMenuOpened={() => (opened += 1)}
        onMenuClosing={(event) => closings.push(event.reason)}
        onMenuClosed={() => (closed += 1)}
      />,
    );
    fireEvent.click(menuButton());
    await screen.findByRole('menu');
    expect(menuTexts()).toEqual(['Beta']);
    expect(opened).toBe(1);

    fireEvent.click(screen.getByRole('menuitem'));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(clicks.map((c) => [c.key, c.inMenu])).toEqual([['b', true]]);
    expect(closed).toBe(1);
    expect(closings.at(-1)).toBe('select');
  });

  it('onMenuOpening can veto the open', () => {
    let opened = 0;
    render(
      <OgeToolbar
        items={items}
        onMenuOpening={(event) => (event.cancel = true)}
        onMenuOpened={() => (opened += 1)}
      />,
    );
    fireEvent.click(menuButton());
    expect(opened).toBe(0);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('onMenuClosing can veto the close', async () => {
    const ref = createRef<OgeToolbarHandle>();
    let closed = 0;
    render(
      <OgeToolbar
        ref={ref}
        items={items}
        onMenuClosing={(event) => (event.cancel = true)}
        onMenuClosed={() => (closed += 1)}
      />,
    );
    fireEvent.click(menuButton());
    await screen.findByRole('menu');

    act(() => ref.current?.closeMenu('api'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(closed).toBe(0);
  });

  it('marks the overflow button with the menu ARIA wiring', async () => {
    render(<OgeToolbar items={items} />);
    expect(menuButton()).toHaveAttribute('aria-haspopup', 'menu');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton().getAttribute('aria-controls')).toBeNull();

    fireEvent.click(menuButton());
    await screen.findByRole('menu');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    expect(menuButton().getAttribute('aria-controls')).not.toBeNull();
  });

  it('carries disabled and toggle state into the menu row', async () => {
    render(
      <OgeToolbar
        items={[
          { key: 'a', text: 'Alpha' },
          {
            key: 'b',
            text: 'Beta',
            locateInMenu: 'always',
            disabled: true,
            active: true,
          },
        ]}
      />,
    );
    fireEvent.click(menuButton());
    await screen.findByRole('menu');
    const row = document.querySelector('.oge-menu-item') as HTMLButtonElement;
    expect(row.disabled).toBe(true);
    expect(row).toHaveAttribute('role', 'menuitemcheckbox');
    expect(row).toHaveAttribute('aria-checked', 'true');
  });

  it('reports the collapsed set through onOverflowChanged', () => {
    const seen: OgeToolbarOverflowChangedEvent[] = [];
    const { rerender } = render(
      <OgeToolbar items={items} onOverflowChanged={(e) => seen.push(e)} />,
    );
    expect(seen.at(-1)).toEqual({ keys: ['b'], count: 1 });

    rerender(
      <OgeToolbar
        items={[{ key: 'a', text: 'Alpha' }]}
        onOverflowChanged={(e) => seen.push(e)}
      />,
    );
    expect(seen.at(-1)).toEqual({ keys: [], count: 0 });
  });

  it('renders menu rows through renderMenuItem', async () => {
    render(
      <OgeToolbar
        items={[{ key: 'b', text: 'Beta', locateInMenu: 'always' }]}
        renderMenuItem={({ item }) => (
          <span className="custom-row">{item?.text}!</span>
        )}
      />,
    );
    fireEvent.click(menuButton());
    await screen.findByRole('menu');
    expect(document.querySelector('.custom-row')?.textContent?.trim()).toBe(
      'Beta!',
    );
  });

  it('is the last stop of the roving tabindex', () => {
    render(<OgeToolbar items={items} />);
    const stops = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.oge-toolbar-btn, .oge-toolbar-menu-btn',
      ),
    );
    expect(stops.at(-1)).toBe(menuButton());
    expect(stops.map((s) => s.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
    ]);
  });

  it("carries a collapsed item's icon into the menu row, honouring showIcon", async () => {
    const { unmount } = render(
      <OgeToolbar
        items={[
          {
            key: 'b',
            text: 'Beta',
            icon: 'M2 2h8v8H2z',
            locateInMenu: 'always',
          },
        ]}
      />,
    );
    fireEvent.click(menuButton());
    await screen.findByRole('menu');
    expect(
      document.querySelector('.oge-menu-item-icon svg path')?.getAttribute('d'),
    ).toBe('M2 2h8v8H2z');
    unmount();

    render(
      <OgeToolbar
        items={[
          {
            key: 'b',
            text: 'Beta',
            icon: 'M2 2h8v8H2z',
            showIcon: 'onBar',
            locateInMenu: 'always',
          },
        ]}
      />,
    );
    fireEvent.click(menuButton());
    await screen.findByRole('menu');
    expect(document.querySelector('.oge-menu-item-icon svg')).toBeNull();
  });

  it('supports an icon-font class on a menu row', async () => {
    render(
      <OgeToolbar
        items={[
          {
            key: 'b',
            text: 'Beta',
            iconClass: 'fa fa-cut',
            locateInMenu: 'always',
          },
        ]}
      />,
    );
    fireEvent.click(menuButton());
    await screen.findByRole('menu');
    expect(document.querySelector('.oge-menu-item-icon i')?.className).toBe(
      'fa fa-cut',
    );
  });

  it("showText 'onBar' keeps the label off the menu row", async () => {
    render(
      <OgeToolbar
        items={[{ key: 'b', text: 'Beta', locateInMenu: 'always' }]}
        showText="onBar"
      />,
    );
    fireEvent.click(menuButton());
    await screen.findByRole('menu');
    expect(menuTexts()).toEqual(['']);
  });
});

describe('<OgeToolbar> — overflowPriority', () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  // Room for two of three items plus the overflow button: 2×50 + 32 = 132.
  const renderAt = (size: number, list: readonly OgeToolbarItemData[]) => {
    restore = installSizes({ size });
    return render(<OgeToolbar items={list} />);
  };

  it('collapses the last item when no priority is set', () => {
    renderAt(132, [
      { key: 'a', text: 'Alpha' },
      { key: 'b', text: 'Beta' },
      { key: 'c', text: 'Gamma' },
    ]);
    expect(texts()).toEqual(['Alpha', 'Beta']);
  });

  it('keeps a high-priority trailing item and collapses a default one instead', () => {
    renderAt(132, [
      { key: 'a', text: 'Alpha' },
      { key: 'b', text: 'Beta' },
      { key: 'c', text: 'Gamma', overflowPriority: 5 },
    ]);
    // Beta yields even though Gamma sits after it on the bar.
    expect(texts()).toEqual(['Alpha', 'Gamma']);
  });

  it('collapses the lowest priority first even when it leads the row', () => {
    renderAt(132, [
      { key: 'a', text: 'Alpha', overflowPriority: -1 },
      { key: 'b', text: 'Beta' },
      { key: 'c', text: 'Gamma' },
    ]);
    expect(texts()).toEqual(['Beta', 'Gamma']);
  });

  it('re-fits through refreshOverflow() when only the container width moved', () => {
    const container = { size: 300 };
    restore = installSizes(container);
    const ref = createRef<OgeToolbarHandle>();
    const seen: OgeToolbarOverflowChangedEvent[] = [];
    render(
      <OgeToolbar
        ref={ref}
        items={[
          { key: 'a', text: 'Alpha' },
          { key: 'b', text: 'Beta' },
          { key: 'c', text: 'Gamma' },
        ]}
        onOverflowChanged={(event) => seen.push(event)}
      />,
    );
    expect(seen.at(-1)?.count ?? 0).toBe(0);

    container.size = 132;
    act(() => ref.current?.refreshOverflow());
    expect(seen.at(-1)?.count).toBe(1);
    expect(seen.at(-1)?.keys).toEqual(['c']);
  });
});

describe('<OgeToolbar> — reference-parity extras', () => {
  it("overflow: 'scroll' and 'extended' each render their own chrome", () => {
    const two: readonly OgeToolbarItemData[] = [
      { key: 'a', text: 'Alpha' },
      { key: 'b', text: 'Beta', locateInMenu: 'always' },
    ];
    const { rerender } = render(<OgeToolbar items={two} />);
    // 'menu' — the overflow button
    expect(menuButton()).not.toBeNull();
    expect(document.querySelector('.oge-toolbar-extend-btn')).toBeNull();

    // 'extended' — a toggle plus a second row, no menu
    rerender(<OgeToolbar items={two} overflow="extended" />);
    const toggle = document.querySelector<HTMLButtonElement>(
      '.oge-toolbar-extend-btn',
    );
    expect(toggle).not.toBeNull();
    expect(menuButton()).toBeNull();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('.oge-toolbar-extended-row')).toBeNull();

    fireEvent.click(toggle as HTMLButtonElement);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const row = document.querySelector('.oge-toolbar-extended-row');
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain('Beta');
    // the toggle names the row it controls
    expect(toggle?.getAttribute('aria-controls')).toBe(row?.id);

    // 'scroll' — no collapsing at all; jsdom reports no overflow, so the
    // arrows stay hidden, which is the documented unmeasured behaviour
    rerender(<OgeToolbar items={two} overflow="scroll" />);
    expect(document.querySelector('.oge-toolbar-extend-btn')).toBeNull();
    expect(menuButton()).toBeNull();
    expect(bar().className).toContain('oge-toolbar-scroll');
  });

  it('renders prefix and suffix icons, from path data or a class', () => {
    render(
      <OgeToolbar
        items={[
          { key: 'a', text: 'A', icon: 'M2 2h12', suffixIcon: 'M3 3h10' },
          {
            key: 'b',
            text: 'B',
            iconClass: 'fa fa-save',
            suffixIconClass: 'fa-x',
          },
        ]}
      />,
    );
    const paths = Array.from(
      document.querySelectorAll('svg.oge-toolbar-icon path'),
    );
    expect(paths.map((p) => p.getAttribute('d'))).toEqual([
      'M2 2h12',
      'M3 3h10',
    ]);
    expect(
      document.querySelectorAll('svg.oge-toolbar-icon-suffix').length,
    ).toBe(1);
    const classIcons = Array.from(
      document.querySelectorAll('i.oge-toolbar-icon'),
    );
    expect(classIcons[0].classList.contains('fa-save')).toBe(true);
    expect(classIcons[1].classList.contains('oge-toolbar-icon-suffix')).toBe(
      true,
    );
  });

  it('applies item width and the htmlAttributes bag', () => {
    const { rerender } = render(
      <OgeToolbar
        items={[
          {
            key: 'a',
            text: 'A',
            width: 140,
            htmlAttributes: { 'data-role': 'primary', 'data-tour': '1' },
          },
          { key: 'b', text: 'B', width: '8rem' },
        ]}
      />,
    );
    const wrappers = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.oge-toolbar-item'));
    expect(wrappers()[0].style.inlineSize).toBe('140px');
    expect(wrappers()[1].style.inlineSize).toBe('8rem');
    expect(wrappers()[0].getAttribute('data-role')).toBe('primary');
    expect(wrappers()[0].getAttribute('data-tour')).toBe('1');

    // clearing a key removes the attribute rather than leaving it stale
    rerender(
      <OgeToolbar
        items={[
          {
            key: 'a',
            text: 'A',
            width: 140,
            htmlAttributes: { 'data-role': 'x' },
          },
          { key: 'b', text: 'B', width: '8rem' },
        ]}
      />,
    );
    expect(wrappers()[0].getAttribute('data-role')).toBe('x');
    expect(wrappers()[0].hasAttribute('data-tour')).toBe(false);
  });

  it('reports a toggle item instead of mutating the items array', () => {
    const changes: OgeToolbarItemActiveChangedEvent[] = [];
    render(
      <OgeToolbar
        items={[{ key: 'bold', text: 'Bold', active: false }]}
        onActiveChanged={(event) => changes.push(event)}
      />,
    );
    expect(buttons()[0]).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(buttons()[0]);
    // `items` entries are data the toolbar must not mutate — it reports
    // instead, and the application applies the change.
    expect(changes.map((c) => [c.key, c.active])).toEqual([['bold', true]]);
    expect(buttons()[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('a controlled toggle flips when the application applies the change', () => {
    function Host() {
      const [bold, setBold] = useState(false);
      return (
        <OgeToolbar
          items={[{ key: 'b', text: 'Bold', active: bold }]}
          onActiveChanged={(event) => setBold(event.active)}
        />
      );
    }
    render(<Host />);
    fireEvent.click(buttons()[0]);
    expect(buttons()[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('addItem / removeItem / hideItem / enableItem layer over items', () => {
    const ref = createRef<OgeToolbarHandle>();
    const declared: readonly OgeToolbarItemData[] = [
      { key: 'a', text: 'Alpha' },
      { key: 'b', text: 'Beta' },
    ];
    const { rerender } = render(<OgeToolbar ref={ref} items={declared} />);
    expect(texts()).toEqual(['Alpha', 'Beta']);

    act(() => ref.current?.addItem({ key: 'c', text: 'Gamma' }));
    expect(texts()).toEqual(['Alpha', 'Beta', 'Gamma']);

    act(() => ref.current?.hideItem('b'));
    expect(texts()).toEqual(['Alpha', 'Gamma']);

    // the override survives a re-supplied items array — that is the point
    rerender(<OgeToolbar ref={ref} items={[...declared]} />);
    expect(texts()).toEqual(['Alpha', 'Gamma']);

    act(() => ref.current?.hideItem('b', false));
    expect(texts()).toEqual(['Alpha', 'Beta', 'Gamma']);

    act(() => ref.current?.enableItem('a', false));
    expect(buttons()[0].disabled).toBe(true);

    // removeItem drops an added entry outright, and hides an `items` one
    act(() => ref.current?.removeItem('c'));
    expect(texts()).toEqual(['Alpha', 'Beta']);
    act(() => ref.current?.removeItem('b'));
    expect(texts()).toEqual(['Alpha']);

    act(() => ref.current?.clearItemOverrides());
    expect(texts()).toEqual(['Alpha', 'Beta']);
  });

  it('loads a remote command list through dataSource', async () => {
    const source = {
      load: () =>
        Promise.resolve({
          data: [
            { key: 'r1', text: 'Remote one' },
            { key: 'r2', text: 'Remote two' },
          ],
        }),
    };
    render(
      <OgeToolbar
        items={[{ key: 'local', text: 'Local' }]}
        dataSource={source}
      />,
    );
    await waitFor(() =>
      expect(texts()).toEqual(['Local', 'Remote one', 'Remote two']),
    );
  });

  it('fires onItemHold after itemHoldTimeout and cancels on pointerup', async () => {
    const held: string[] = [];
    render(
      <OgeToolbar
        items={[{ key: 'a', text: 'Alpha' }]}
        itemHoldTimeout={20}
        onItemHold={(event) => held.push(event.key ?? '')}
      />,
    );
    const item = document.querySelector('.oge-toolbar-item') as HTMLElement;

    fireEvent.pointerDown(item);
    await waitFor(() => expect(held).toEqual(['a']));

    // a release before the timeout cancels it
    held.length = 0;
    fireEvent.pointerDown(item);
    fireEvent.pointerUp(item);
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(held).toEqual([]);
  });

  it('fires onItemContextMenu on right click', () => {
    const menued: string[] = [];
    render(
      <OgeToolbar
        items={[{ key: 'a', text: 'Alpha' }]}
        onItemContextMenu={(event) => menued.push(event.key ?? '')}
      />,
    );
    fireEvent.contextMenu(
      document.querySelector('.oge-toolbar-item') as HTMLElement,
    );
    expect(menued).toEqual(['a']);
  });

  it('focus() lands on the current roving stop', () => {
    const ref = createRef<OgeToolbarHandle>();
    render(
      <OgeToolbar
        ref={ref}
        items={[
          { key: 'a', text: 'A' },
          { key: 'b', text: 'B' },
        ]}
      />,
    );
    act(() => ref.current?.focus());
    expect(document.activeElement).toBe(buttons()[0]);
  });
});

describe('<OgeToolbar> accessibility', () => {
  it('is a labelled role="toolbar"', () => {
    render(<OgeToolbar items={[{ key: 'a', text: 'A' }]} />);
    expect(bar()).toHaveAttribute('role', 'toolbar');
    // horizontal is the ARIA default and is deliberately not written out
    expect(bar().getAttribute('aria-orientation')).toBeNull();
    expect(bar()).toHaveAttribute('aria-label', 'Toolbar');
  });

  it('prefers ariaLabel, and ariaLabelledBy over that', () => {
    const { rerender } = render(<OgeToolbar ariaLabel="Formatting" />);
    expect(bar()).toHaveAttribute('aria-label', 'Formatting');

    rerender(<OgeToolbar ariaLabel="Formatting" ariaLabelledBy="bar-label" />);
    expect(bar()).toHaveAttribute('aria-labelledby', 'bar-label');
    expect(bar().getAttribute('aria-label')).toBeNull();
  });

  it('renders separators with a cross-axis aria-orientation', () => {
    render(<OgeToolbar items={[{ key: 's', type: 'separator' }]} />);
    const separator = document.querySelector(
      '.oge-toolbar-separator',
    ) as HTMLElement;
    expect(separator).toHaveAttribute('role', 'separator');
    // a separator in a horizontal toolbar is drawn vertically
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('takes every string from the messages prop', () => {
    render(<OgeToolbar messages={{ toolbar: 'Araç çubuğu' }} />);
    expect(bar()).toHaveAttribute('aria-label', 'Araç çubuğu');
  });

  it('takes strings and presets from OgeToolbarConfigProvider', () => {
    render(
      <OgeToolbarConfigProvider
        config={{
          size: 'sm',
          messages: { toolbar: 'Komutlar', overflowMenu: 'Daha fazla' },
        }}
      >
        <OgeToolbar items={[{ key: 'b', text: 'B', locateInMenu: 'always' }]} />
      </OgeToolbarConfigProvider>,
    );
    expect(bar()).toHaveAttribute('aria-label', 'Komutlar');
    expect(bar().className).toContain('oge-toolbar-sm');
    expect(menuButton()).toHaveAttribute('aria-label', 'Daha fazla');
  });
});

describe('<OgeToolbar> under StrictMode', () => {
  // StrictMode simulates an unmount (dropping the observers and the anchored
  // panel) and then a remount; a toolbar that ties its measurement or its menu
  // machine to the first mount would come back inert.
  it('still renders, measures and opens its menu after a remount cycle', async () => {
    const clicks: string[] = [];
    render(
      <StrictMode>
        <OgeToolbar
          items={items}
          onItemClick={(event) => clicks.push(event.key ?? '')}
        />
      </StrictMode>,
    );
    expect(texts()).toEqual(['Alpha', 'Gamma']);

    fireEvent.click(menuButton());
    await screen.findByRole('menu');
    fireEvent.click(screen.getByRole('menuitem'));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(clicks).toEqual(['b']);
  });
});
