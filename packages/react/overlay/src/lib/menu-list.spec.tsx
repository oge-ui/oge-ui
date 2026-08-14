import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef } from 'react';
import type { OgeMenuItem } from '@oge-ui/behavior';
import { OgeMenuList, type OgeMenuListHandle } from './menu-list';

const items: readonly OgeMenuItem[] = [
  { text: 'New' },
  { text: 'Open' },
  { separator: true, text: '' },
  { text: 'Duplicate', disabled: true },
  { text: 'Delete', severity: 'danger' },
];

const menu = () => screen.getByRole('menu');
const activeId = () => menu().getAttribute('aria-activedescendant');
const activeText = () => {
  const id = activeId();
  return id ? document.getElementById(id)?.textContent?.trim() : null;
};

describe('<OgeMenuList>', () => {
  it('renders the ARIA menu pattern with the house classes', () => {
    render(<OgeMenuList items={items} ariaLabel="Actions" />);
    expect(menu()).toHaveClass('oge-menu-list');
    expect(menu()).toHaveAccessibleName('Actions');
    expect(screen.getAllByRole('menuitem')).toHaveLength(4);
    expect(screen.getByRole('separator')).toHaveClass('oge-menu-separator');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveClass(
      'oge-menu-item-danger',
    );
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeDisabled();
  });

  it('arrow keys wrap and skip disabled items and separators', () => {
    const ref = createRef<OgeMenuListHandle>();
    render(<OgeMenuList items={items} ref={ref} />);
    act(() => ref.current!.focus());
    expect(activeText()).toBe('New');
    fireEvent.keyDown(menu(), { key: 'ArrowDown' });
    expect(activeText()).toBe('Open');
    fireEvent.keyDown(menu(), { key: 'ArrowDown' }); // skips separator+disabled
    expect(activeText()).toBe('Delete');
    fireEvent.keyDown(menu(), { key: 'ArrowDown' }); // wraps
    expect(activeText()).toBe('New');
    fireEvent.keyDown(menu(), { key: 'End' });
    expect(activeText()).toBe('Delete');
    fireEvent.keyDown(menu(), { key: 'Home' });
    expect(activeText()).toBe('New');
  });

  it('type-ahead moves the active row and Enter activates it', () => {
    const onItemClick = vi.fn();
    const onCloseRequest = vi.fn();
    const ref = createRef<OgeMenuListHandle>();
    render(
      <OgeMenuList
        items={items}
        ref={ref}
        onItemClick={onItemClick}
        onCloseRequest={onCloseRequest}
      />,
    );
    act(() => ref.current!.focus());
    fireEvent.keyDown(menu(), { key: 'd' }); // Duplicate disabled → Delete
    expect(activeText()).toBe('Delete');
    fireEvent.keyDown(menu(), { key: 'Enter' });
    expect(onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({ index: 4 }),
    );
    expect(onCloseRequest).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'select' }),
    );
  });

  it('Escape and Tab ask the owner to close without acting', () => {
    const onCloseRequest = vi.fn();
    render(<OgeMenuList items={items} onCloseRequest={onCloseRequest} />);
    fireEvent.keyDown(menu(), { key: 'Escape' });
    expect(onCloseRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: 'escape' }),
    );
    fireEvent.keyDown(menu(), { key: 'Tab' });
    expect(onCloseRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: 'tab' }),
    );
  });

  it('checkbox items expose menuitemcheckbox with aria-checked', () => {
    render(
      <OgeMenuList
        items={[
          { text: 'Bold', checked: true },
          { text: 'Italic', checked: false },
        ]}
      />,
    );
    const bold = screen.getByRole('menuitemcheckbox', { name: 'Bold' });
    expect(bold).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Italic' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('link items render as real anchors', () => {
    render(<OgeMenuList items={[{ text: 'Docs', url: '/docs' }]} />);
    const link = screen.getByRole('menuitem', { name: 'Docs' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/docs');
  });

  it('a submenu parent opens its nested list on ArrowRight', async () => {
    const nested: readonly OgeMenuItem[] = [
      { text: 'Parent', items: [{ text: 'Child A' }, { text: 'Child B' }] },
      { text: 'Leaf' },
    ];
    const ref = createRef<OgeMenuListHandle>();
    render(<OgeMenuList items={nested} ref={ref} />);
    const parent = screen.getByRole('menuitem', { name: 'Parent' });
    expect(parent).toHaveAttribute('aria-haspopup', 'menu');
    expect(parent).toHaveAttribute('aria-expanded', 'false');

    act(() => ref.current!.focus());
    fireEvent.keyDown(screen.getAllByRole('menu')[0], { key: 'ArrowRight' });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    // presence, not visibility: the popup stays opacity-0 until the first
    // rAF measure, which jsdom's fake layout may not grant in time
    expect(
      await screen.findByRole('menuitem', { name: 'Child A' }),
    ).toBeInTheDocument();
  });

  it('activating a leaf runs its action after onItemClick', () => {
    const order: string[] = [];
    render(
      <OgeMenuList
        items={[{ text: 'Run', action: () => order.push('action') }]}
        onItemClick={() => order.push('click')}
      />,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Run' }));
    expect(order).toEqual(['click', 'action']);
  });

  it('survives a StrictMode remount cycle', () => {
    const onItemClick = vi.fn();
    render(
      <StrictMode>
        <OgeMenuList items={items} onItemClick={onItemClick} />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open' }));
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });
});
