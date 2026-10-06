import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import { applyMenuItemCheck, type OgeMenuItem } from '@oge-ui/behavior';
import {
  OgeMenuList,
  type OgeMenuCloseRequestEvent,
  type OgeMenuListHandle,
  type OgeMenuListItemClickEvent,
} from './menu-list';

const initial: readonly OgeMenuItem[] = [
  { text: 'Refresh' },
  { text: 'Layout', type: 'header' },
  { text: 'Grid', type: 'radio', group: 'layout', checked: true },
  { text: 'List', type: 'radio', group: 'layout' },
  { text: '', separator: true },
  { text: 'Show hidden', type: 'checkbox' },
  { text: 'Legacy', checked: false },
  { text: 'Pinned', type: 'checkbox', keepOpen: true },
];

const menu = () => screen.getByRole('menu');
const activeText = () => {
  const id = menu().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id)?.textContent?.trim() : null;
};

function Host(props: {
  listRef?: React.Ref<OgeMenuListHandle>;
  clicks: OgeMenuListItemClickEvent[];
  closes: OgeMenuCloseRequestEvent[];
}) {
  const [items, setItems] = useState(initial);
  return (
    <OgeMenuList
      ref={props.listRef}
      items={items}
      ariaLabel="View"
      onItemClick={(event) => {
        props.clicks.push(event);
        setItems((current) => applyMenuItemCheck(current, event.item));
      }}
      onCloseRequest={(event) => props.closes.push(event)}
    />
  );
}

function setup(strict = false) {
  const clicks: OgeMenuListItemClickEvent[] = [];
  const closes: OgeMenuCloseRequestEvent[] = [];
  const ref = createRef<OgeMenuListHandle>();
  const tree = <Host listRef={ref} clicks={clicks} closes={closes} />;
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { clicks, closes, ref };
}

describe('<OgeMenuList> checkbox / radio / header rows', () => {
  it('renders menuitemradio / menuitemcheckbox roles with aria-checked', () => {
    setup();
    const grid = screen.getByRole('menuitemradio', { name: 'Grid' });
    expect(grid).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'List' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Show hidden' }),
    ).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Legacy' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Refresh' }),
    ).not.toHaveAttribute('aria-checked');
    expect(grid.querySelector('.oge-menu-item-radio svg')).toBeTruthy();
  });

  it('labels the headed section as a role="group"', () => {
    setup();
    const group = screen.getByRole('group', { name: 'Layout' });
    expect(group.querySelectorAll('[role="menuitemradio"]')).toHaveLength(2);
    const header = group.querySelector('.oge-menu-header')!;
    expect(header).toHaveAttribute('role', 'presentation');
    expect(header).not.toHaveAttribute('tabindex');
    expect(group.querySelector('.oge-menu-separator')).toBeNull();
  });

  it('arrow keys and type-ahead skip the header', () => {
    const { ref } = setup();
    act(() => ref.current!.focus());
    expect(activeText()).toBe('Refresh');
    fireEvent.keyDown(menu(), { key: 'ArrowDown' });
    expect(activeText()).toBe('Grid');
    fireEvent.keyDown(menu(), { key: 'l' });
    expect(activeText()).toBe('List');
  });

  it('reports the next checked state and Space keeps the menu open', () => {
    const { ref, clicks, closes } = setup();
    act(() => ref.current!.focus());
    fireEvent.keyDown(menu(), { key: 'ArrowDown' });
    fireEvent.keyDown(menu(), { key: 'ArrowDown' }); // List
    fireEvent.keyDown(menu(), { key: ' ' });
    expect(clicks.at(-1)?.checked).toBe(true);
    expect(closes).toHaveLength(0);
    expect(screen.getByRole('menuitemradio', { name: 'List' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: 'Grid' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(activeText()).toBe('List');
    fireEvent.keyDown(menu(), { key: 'ArrowDown' }); // Show hidden
    fireEvent.keyDown(menu(), { key: 'Enter' });
    expect(clicks.at(-1)?.checked).toBe(true);
    expect(closes.map((c) => c.reason)).toEqual(['select']);
  });

  it('a pointer click closes, unless the row says keepOpen', () => {
    const { clicks, closes } = setup();
    fireEvent.click(
      screen.getByRole('menuitemcheckbox', { name: 'Show hidden' }),
    );
    expect(closes).toHaveLength(1);
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Pinned' }));
    expect(clicks.at(-1)?.checked).toBe(true);
    expect(closes).toHaveLength(1);
  });

  it('legacy checked rows keep closing on Space', () => {
    const { ref, closes } = setup();
    act(() => ref.current!.focus());
    fireEvent.keyDown(menu(), { key: 'End' });
    fireEvent.keyDown(menu(), { key: 'ArrowUp' });
    expect(activeText()).toBe('Legacy');
    fireEvent.keyDown(menu(), { key: ' ' });
    expect(closes).toHaveLength(1);
  });

  it('works under StrictMode', () => {
    const { ref, closes } = setup(true);
    act(() => ref.current!.focus());
    fireEvent.keyDown(menu(), { key: 'ArrowDown' });
    fireEvent.keyDown(menu(), { key: 'ArrowDown' });
    fireEvent.keyDown(menu(), { key: ' ' });
    expect(screen.getByRole('menuitemradio', { name: 'List' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(closes).toHaveLength(0);
  });
});
