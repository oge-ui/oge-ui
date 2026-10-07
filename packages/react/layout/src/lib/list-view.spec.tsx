import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  getOgeLiveAnnouncer,
  type OgeListViewItemActionClickEvent,
  type OgeListViewKey,
  type OgeListViewLoadMoreEvent,
  type OgeListViewSelectionMode,
} from '@oge-ui/behavior';
import { OgeListView, type OgeListViewHandle } from './list-view';
import { OgeListViewConfigProvider } from './layout-config';

interface Person {
  id: number;
  name: string;
  team: string;
  away?: boolean;
}

const PEOPLE: Person[] = [
  { id: 1, name: 'Ada', team: 'Core' },
  { id: 2, name: 'Grace', team: 'Web' },
  { id: 3, name: 'Alan', team: 'Core', away: true },
  { id: 4, name: 'Linus', team: 'Web' },
  { id: 5, name: 'Barbara', team: 'Core' },
];

const rows = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-list-view-item'));

function Controlled({
  mode = 'multiple',
  onKeys,
}: {
  mode?: OgeListViewSelectionMode;
  onKeys?: (keys: OgeListViewKey[]) => void;
}) {
  const [keys, setKeys] = useState<OgeListViewKey[]>([]);
  return (
    <OgeListView
      items={PEOPLE}
      displayExpr="name"
      disabledExpr="away"
      selectionMode={mode}
      selectedKeys={keys}
      onSelectedKeysChange={(next) => {
        setKeys(next);
        onKeys?.(next);
      }}
      ariaLabel="People"
    />
  );
}

describe('<OgeListView>', () => {
  afterEach(() => getOgeLiveAnnouncer().clear());

  it('renders a listbox with an active descendant on first paint', () => {
    render(<Controlled />);
    const lb = screen.getByRole('listbox', { name: 'People' });
    expect(lb).toHaveAttribute('aria-multiselectable', 'true');
    expect(lb.tabIndex).toBe(0);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(lb).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[2]).toHaveAttribute('aria-disabled', 'true');
    expect(options[3]).toHaveAttribute('aria-posinset', '4');
  });

  it('navigates, skips disabled options and toggles with Space', () => {
    const seen: OgeListViewKey[][] = [];
    render(<Controlled onKeys={(k) => seen.push(k)} />);
    const lb = screen.getByRole('listbox');
    fireEvent.keyDown(lb, { key: 'ArrowDown' });
    fireEvent.keyDown(lb, { key: 'ArrowDown' });
    expect(lb).toHaveAttribute('aria-activedescendant', rows()[3].id);
    fireEvent.keyDown(lb, { key: ' ' });
    expect(seen.at(-1)).toEqual([4]);
    expect(rows()[3]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(lb, { key: 'a', ctrlKey: true });
    expect(seen.at(-1)).toEqual([1, 2, 4, 5]);
  });

  it('renders a list with a roving tab stop when not selectable', () => {
    const clicks: number[] = [];
    render(
      <OgeListView
        items={PEOPLE}
        displayExpr="name"
        onItemClick={(e) => clicks.push(e.index)}
      />,
    );
    expect(screen.getByRole('list', { name: 'List' })).toBeTruthy();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('tabindex', '0');
    items[0].focus();
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(rows()[1]);
    fireEvent.keyDown(rows()[1], { key: 'Enter' });
    expect(clicks).toEqual([1]);
  });

  it('groups under aria-hidden sticky headers with render props', () => {
    render(
      <OgeListView
        items={PEOPLE}
        displayExpr="name"
        groupExpr="team"
        selectionMode="single"
        renderGroup={({ group, count }) => `${group}/${count}`}
        renderItem={({ item, selected }) => (
          <b>
            {item.name}
            {selected ? '!' : ''}
          </b>
        )}
      />,
    );
    const groups = screen.getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual([
      'Core',
      'Web',
    ]);
    const header = groups[0].querySelector('.oge-list-view-group-header')!;
    expect(header).toHaveAttribute('aria-hidden', 'true');
    expect(header.textContent).toBe('Core/3');
    fireEvent.click(rows()[3]);
    expect(rows()[3].textContent).toBe('Grace!');
  });

  it('virtualizes a long list and follows End', () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Person ${i}`,
    }));
    render(
      <OgeListView
        items={many}
        displayExpr="name"
        selectionMode="single"
        virtualScroll
        height={200}
      />,
    );
    expect(rows().length).toBeLessThan(30);
    expect(
      (document.querySelector('.oge-list-view-canvas') as HTMLElement).style
        .height,
    ).toBe('44000px');
    const lb = screen.getByRole('listbox');
    fireEvent.keyDown(lb, { key: 'End' });
    expect(lb.scrollTop).toBeGreaterThan(40000);
    const id = lb.getAttribute('aria-activedescendant')!;
    expect(document.getElementById(id)?.textContent).toBe('Person 999');
  });

  it('a plain virtual list keeps focus when the focused row scrolls away', async () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Person ${i}`,
    }));
    render(
      <OgeListView
        items={many}
        displayExpr="name"
        selectionMode="none"
        virtualScroll
        height={200}
        ariaLabel="People"
      />,
    );
    const viewport = screen.getByRole('list', { name: 'People' });
    const first = rows()[0];
    await act(async () => {
      first.focus();
    });
    expect(document.activeElement).toBe(first);
    expect(viewport.tabIndex).toBe(-1);

    // a wheel scroll far down: the row leaves the window, focus waits on the
    // viewport (not <body>), which becomes the tab stop
    await act(async () => {
      viewport.scrollTop = 20000;
      fireEvent.scroll(viewport);
    });
    expect(rows().some((row) => row.textContent === 'Person 0')).toBe(false);
    expect(document.activeElement).toBe(viewport);
    expect(viewport.tabIndex).toBe(0);

    // scrolled back: the row is rendered again and gets the focus back
    await act(async () => {
      viewport.scrollTop = 0;
      fireEvent.scroll(viewport);
    });
    expect(document.activeElement?.textContent).toBe('Person 0');
    expect(viewport.tabIndex).toBe(-1);
  });

  it('searches, announces the count and shows the empty state', () => {
    vi.useFakeTimers();
    try {
      render(
        <OgeListViewConfigProvider config={{ messages: { noResults: 'Nada' } }}>
          <OgeListView items={PEOPLE} displayExpr="name" searchEnabled />
        </OgeListViewConfigProvider>,
      );
      const input = screen.getByRole('searchbox', { name: 'Search' });
      fireEvent.change(input, { target: { value: 'a' } });
      expect(rows()).toHaveLength(4);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(
        document.querySelector('[data-oge-live-announcer="polite"]')
          ?.textContent,
      ).toContain('4 results');
      fireEvent.change(input, { target: { value: 'zzz' } });
      expect(document.querySelector('.oge-list-view-empty')?.textContent).toBe(
        'Nada',
      );
      fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
      expect(rows()).toHaveLength(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it('requests more through the load-more button', () => {
    const loads: OgeListViewLoadMoreEvent[] = [];
    render(
      <OgeListView
        items={PEOPLE}
        displayExpr="name"
        pageLoadMode="button"
        hasMore
        onLoadMoreRequested={(e) => loads.push(e)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(loads).toEqual([{ reason: 'button', itemCount: 5 }]);
  });

  it('runs item actions by shortcut and by clicking their glyph', () => {
    const ran: OgeListViewItemActionClickEvent[] = [];
    render(
      <OgeListView
        items={PEOPLE}
        displayExpr="name"
        selectionMode="single"
        itemActions={[
          {
            key: 'delete',
            label: 'Delete',
            severity: 'danger',
            shortcut: 'Delete',
          },
          { key: 'pin', label: 'Pin' },
        ]}
        onItemActionClick={(e) => ran.push(e)}
      />,
    );
    const first = rows()[0];
    expect(first).toHaveAttribute('aria-keyshortcuts', 'Delete');
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Delete' });
    expect(ran[0].action.key).toBe('delete');
    fireEvent.click(rows()[1].querySelector('[data-oge-list-action="pin"]')!);
    expect(ran[1]).toMatchObject({ key: 2 });
    expect(rows()[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('exposes the imperative handle', () => {
    const ref = createRef<OgeListViewHandle>();
    const seen: OgeListViewKey[][] = [];
    render(
      <OgeListView
        ref={ref}
        items={PEOPLE}
        displayExpr="name"
        disabledExpr="away"
        selectionMode="multiple"
        onSelectedKeysChange={(k) => seen.push(k)}
      />,
    );
    act(() => ref.current!.selectAll());
    expect(seen.at(-1)).toEqual([1, 2, 4, 5]);
    act(() => ref.current!.clearSelection());
    expect(seen.at(-1)).toEqual([]);
  });

  it('survives StrictMode double effects', () => {
    const seen: OgeListViewKey[][] = [];
    render(
      <StrictMode>
        <Controlled mode="single" onKeys={(k) => seen.push(k)} />
      </StrictMode>,
    );
    const lb = screen.getByRole('listbox');
    fireEvent.keyDown(lb, { key: 'ArrowDown' });
    fireEvent.keyDown(lb, { key: 'Enter' });
    expect(seen).toEqual([[2]]);
    expect(rows()[1]).toHaveAttribute('aria-selected', 'true');
  });
});
