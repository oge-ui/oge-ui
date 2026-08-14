import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { OgeTabs } from './tabs';
import type { OgeTabItem } from '@oge-ui/behavior';

const tabs = (): HTMLElement[] => screen.getAllByRole('tab');
const tablist = () => screen.getByRole('tablist');
const tabByName = (name: string) => screen.getByRole('tab', { name });

const ITEMS: OgeTabItem[] = [
  { key: 'a', text: 'Alpha' },
  { key: 'b', text: 'Beta' },
  { key: 'c', text: 'Gamma' },
];

function Host(extra: Partial<Parameters<typeof OgeTabs>[0]> = {}) {
  const [index, setIndex] = useState(0);
  return (
    <OgeTabs
      items={ITEMS}
      selectedIndex={index}
      onSelectedIndexChange={setIndex}
      ariaLabel="Sections"
      {...extra}
    />
  );
}

describe('<OgeTabs> selection', () => {
  it('wires the APG roles and the selected state', () => {
    render(<Host />);
    expect(tablist()).toBeInTheDocument();
    expect(tabs()).toHaveLength(3);
    expect(tabByName('Alpha')).toHaveAttribute('aria-selected', 'true');
    expect(tabByName('Beta')).toHaveAttribute('aria-selected', 'false');
    expect(tablist()).toHaveAttribute('aria-label', 'Sections');
  });

  it('renders declarative tabs first, then data-driven items', () => {
    render(
      <OgeTabs
        tabs={[{ key: 'x', text: 'First' }]}
        items={[{ key: 'y', text: 'Second' }]}
      />,
    );
    expect(tabs().map((t) => t.textContent?.trim())).toEqual([
      'First',
      'Second',
    ]);
  });

  it('click selects and reports both the index and the key', () => {
    const indexes: number[] = [];
    const keys: (string | undefined)[] = [];
    render(
      <Host
        onSelectedIndexChange={(i) => indexes.push(i)}
        onSelectedKeyChange={(k) => keys.push(k)}
      />,
    );
    fireEvent.click(tabByName('Beta'));
    expect(indexes.at(-1)).toBe(1);
    expect(keys.at(-1)).toBe('b');
  });

  it('a canceled onSelectionChanging keeps the current tab', () => {
    render(<Host onSelectionChanging={(event) => (event.cancel = true)} />);
    fireEvent.click(tabByName('Beta'));
    expect(tabByName('Alpha')).toHaveAttribute('aria-selected', 'true');
  });

  it('ignores clicks on disabled tabs and on a disabled component', () => {
    const changed = vi.fn();
    const { unmount } = render(
      <Host
        items={[ITEMS[0], { ...ITEMS[1], disabled: true }, ITEMS[2]]}
        onSelectionChanged={changed}
      />,
    );
    fireEvent.click(tabByName('Beta'));
    expect(changed).not.toHaveBeenCalled();
    unmount();

    render(<Host disabled onSelectionChanged={changed} />);
    fireEvent.click(tabByName('Gamma'));
    expect(changed).not.toHaveBeenCalled();
  });

  it('selectedKey drives the selection', () => {
    render(<OgeTabs items={ITEMS} selectedKey="c" />);
    expect(tabByName('Gamma')).toHaveAttribute('aria-selected', 'true');
  });

  it('clamps the index when tabs are removed', () => {
    const { rerender } = render(
      <OgeTabs items={ITEMS} defaultSelectedIndex={2} />,
    );
    expect(tabByName('Gamma')).toHaveAttribute('aria-selected', 'true');
    rerender(<OgeTabs items={ITEMS.slice(0, 2)} defaultSelectedIndex={2} />);
    expect(tabByName('Beta')).toHaveAttribute('aria-selected', 'true');
  });

  it('hides tabs with visible=false and renders badges and the dirty dot', () => {
    render(
      <OgeTabs
        items={[
          { text: 'Shown', badge: 3, dirty: true },
          { text: 'Hidden', visible: false },
        ]}
      />,
    );
    expect(tabs()).toHaveLength(1);
    expect(document.querySelector('.oge-tab-badge')?.textContent).toBe('3');
    expect(document.querySelector('.oge-tab-dirty-dot')).not.toBeNull();
  });

  it('renders the empty message with no tabs', () => {
    render(<OgeTabs items={[]} />);
    expect(document.querySelector('.oge-tab-strip-empty')?.textContent).toBe(
      'No tabs to display',
    );
  });
});

describe('<OgeTabs> keyboard', () => {
  it('roving tabindex: only one tab is in the Tab sequence', () => {
    render(<Host />);
    expect(tabs().filter((t) => t.tabIndex === 0)).toHaveLength(1);
    expect(tabByName('Alpha').tabIndex).toBe(0);
  });

  it('ArrowRight moves focus, skips disabled tabs and auto-selects', () => {
    const changed = vi.fn();
    render(
      <Host
        items={[ITEMS[0], { ...ITEMS[1], disabled: true }, ITEMS[2]]}
        onSelectionChanged={changed}
      />,
    );
    fireEvent.keyDown(tabByName('Alpha'), { key: 'ArrowRight' });
    expect(tabByName('Gamma')).toHaveFocus();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0].index).toBe(2);
  });

  it('wraps from the last tab to the first', () => {
    render(<Host defaultSelectedIndex={2} selectedIndex={undefined} />);
    fireEvent.keyDown(tabByName('Gamma'), { key: 'ArrowRight' });
    expect(tabByName('Alpha')).toHaveFocus();
  });

  it('manual activation moves focus only; Enter and Space commit', () => {
    const changed = vi.fn();
    render(<Host activation="manual" onSelectionChanged={changed} />);
    fireEvent.keyDown(tabByName('Alpha'), { key: 'ArrowRight' });
    expect(tabByName('Beta')).toHaveFocus();
    expect(changed).not.toHaveBeenCalled();
    fireEvent.keyDown(tabByName('Beta'), { key: 'Enter' });
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('Home and End jump to the first / last enabled tab', () => {
    render(<Host />);
    fireEvent.keyDown(tabByName('Alpha'), { key: 'End' });
    expect(tabByName('Gamma')).toHaveFocus();
    fireEvent.keyDown(tabByName('Gamma'), { key: 'Home' });
    expect(tabByName('Alpha')).toHaveFocus();
  });

  it('vertical orientation navigates with ArrowDown and marks the tablist', () => {
    render(<Host orientation="vertical" />);
    expect(tablist()).toHaveAttribute('aria-orientation', 'vertical');
    fireEvent.keyDown(tabByName('Alpha'), { key: 'ArrowDown' });
    expect(tabByName('Beta')).toHaveFocus();
  });

  it('sets aria-orientation only when vertical', () => {
    render(<Host />);
    expect(tablist()).not.toHaveAttribute('aria-orientation');
  });
});

describe('<OgeTabs> closing', () => {
  const CLOSABLE: OgeTabItem[] = [
    { key: 'a', text: 'Alpha', closable: true },
    { key: 'b', text: 'Beta' },
  ];

  it('renders the close affordance only for closable tabs', () => {
    render(<OgeTabs items={CLOSABLE} />);
    expect(document.querySelectorAll('.oge-tab-close')).toHaveLength(1);
    expect(tabByName(/Alpha/)).toHaveAttribute('aria-keyshortcuts', 'Delete');
  });

  it('the close affordance runs onTabClosing → onTabClosed', () => {
    const closing = vi.fn();
    const closed = vi.fn();
    render(
      <OgeTabs items={CLOSABLE} onTabClosing={closing} onTabClosed={closed} />,
    );
    fireEvent.click(document.querySelector('.oge-tab-close') as HTMLElement);
    expect(closing).toHaveBeenCalledTimes(1);
    expect(closed).toHaveBeenCalledTimes(1);
    expect(closed.mock.calls[0][0].key).toBe('a');
  });

  it('a canceled onTabClosing vetoes the close', () => {
    const closed = vi.fn();
    render(
      <OgeTabs
        items={CLOSABLE}
        onTabClosing={(event) => (event.cancel = true)}
        onTabClosed={closed}
      />,
    );
    fireEvent.click(document.querySelector('.oge-tab-close') as HTMLElement);
    expect(closed).not.toHaveBeenCalled();
  });

  it('a synchronous closeGuard vetoes with false and allows with true', () => {
    const closed = vi.fn();
    const { unmount } = render(
      <OgeTabs
        items={[{ text: 'A', closable: true, closeGuard: () => false }]}
        onTabClosed={closed}
      />,
    );
    fireEvent.click(document.querySelector('.oge-tab-close') as HTMLElement);
    expect(closed).not.toHaveBeenCalled();
    unmount();

    render(
      <OgeTabs
        items={[{ text: 'A', closable: true, closeGuard: () => true }]}
        onTabClosed={closed}
      />,
    );
    fireEvent.click(document.querySelector('.oge-tab-close') as HTMLElement);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('an async closeGuard is single-flight and closes on resolve(true)', async () => {
    let resolve!: (allowed: boolean) => void;
    const closed = vi.fn();
    render(
      <OgeTabs
        items={[
          {
            text: 'A',
            closable: true,
            closeGuard: () => new Promise<boolean>((r) => (resolve = r)),
          },
        ]}
        onTabClosed={closed}
      />,
    );
    const close = () =>
      fireEvent.click(document.querySelector('.oge-tab-close') as HTMLElement);
    close();
    close(); // second request while pending is ignored
    expect(document.querySelector('.oge-tab-close-pending')).not.toBeNull();
    await act(async () => resolve(true));
    expect(closed).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.oge-tab-close-pending')).toBeNull();
  });

  it('a rejected closeGuard counts as a veto', async () => {
    const closed = vi.fn();
    render(
      <OgeTabs
        items={[
          { text: 'A', closable: true, closeGuard: () => Promise.reject() },
        ]}
        onTabClosed={closed}
      />,
    );
    fireEvent.click(document.querySelector('.oge-tab-close') as HTMLElement);
    await act(async () => {
      await Promise.resolve();
    });
    expect(closed).not.toHaveBeenCalled();
  });

  it('Delete on a focused closable tab closes it', () => {
    const closed = vi.fn();
    render(<OgeTabs items={CLOSABLE} onTabClosed={closed} />);
    fireEvent.keyDown(tabByName(/Alpha/), { key: 'Delete' });
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
