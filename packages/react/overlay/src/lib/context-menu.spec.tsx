import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useRef } from 'react';
import type { OgeMenuItem } from '@oge-ui/behavior';
import { OgeContextMenu, type OgeContextMenuHandle } from './context-menu';
import type { OgeMenuListItemClickEvent } from './menu-list';

const ITEMS: OgeMenuItem[] = [
  { text: 'Open', value: 'open' },
  { text: 'Delete', value: 'delete', severity: 'danger' },
];

function Host({
  onItemClick,
  onOpened,
  onClosed,
  disabled,
  onHandle,
}: {
  onItemClick?: (event: OgeMenuListItemClickEvent) => void;
  onOpened?: () => void;
  onClosed?: () => void;
  disabled?: boolean;
  onHandle?: (handle: OgeContextMenuHandle | null) => void;
}) {
  const ref = useRef<OgeContextMenuHandle>(null);
  onHandle?.(ref.current);
  return (
    <OgeContextMenu
      ref={(h) => {
        ref.current = h;
        onHandle?.(h);
      }}
      items={ITEMS}
      ariaLabel="Row actions"
      disabled={disabled}
      onItemClick={onItemClick}
      onOpened={onOpened}
      onClosed={onClosed}
    >
      <div tabIndex={0} data-testid="target">
        Right-click me
      </div>
    </OgeContextMenu>
  );
}

const flushFrames = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
};

describe('OgeContextMenu', () => {
  it('opens a menu at the pointer on right-click and reports it', async () => {
    const onOpened = vi.fn();
    render(<Host onOpened={onOpened} />);
    const target = screen.getByTestId('target');
    const event = fireEvent.contextMenu(target, { clientX: 40, clientY: 30 });
    expect(event).toBe(false); // preventDefault: the native menu is replaced
    await flushFrames();
    const menu = screen.getByRole('menu', { name: 'Row actions' });
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveFocus();
    expect(onOpened).toHaveBeenCalledTimes(1);
  });

  it('opens anchored to the element on Shift+F10', async () => {
    render(<Host />);
    const target = screen.getByTestId('target');
    fireEvent.keyDown(target, { key: 'F10', shiftKey: true });
    await flushFrames();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('activating an item fires onItemClick, closes and restores focus', async () => {
    const onItemClick = vi.fn();
    const onClosed = vi.fn();
    render(<Host onItemClick={onItemClick} onClosed={onClosed} />);
    const target = screen.getByTestId('target');
    fireEvent.contextMenu(target, { clientX: 40, clientY: 30 });
    await flushFrames();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({ item: ITEMS[1], index: 1 }),
    );
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(target).toHaveFocus();
  });

  it('Escape closes the menu', async () => {
    render(<Host />);
    fireEvent.contextMenu(screen.getByTestId('target'), {
      clientX: 10,
      clientY: 10,
    });
    await flushFrames();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('stays native while disabled', () => {
    render(<Host disabled />);
    const event = fireEvent.contextMenu(screen.getByTestId('target'));
    expect(event).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('close() on the handle closes programmatically', async () => {
    let handle: OgeContextMenuHandle | null = null;
    render(<Host onHandle={(h) => (handle = h)} />);
    fireEvent.contextMenu(screen.getByTestId('target'), {
      clientX: 10,
      clientY: 10,
    });
    await flushFrames();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    act(() => handle?.close());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('works under StrictMode', async () => {
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    const target = screen.getByTestId('target');
    fireEvent.contextMenu(target, { clientX: 10, clientY: 10 });
    await flushFrames();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.contextMenu(target, { clientX: 10, clientY: 10 });
    await flushFrames();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
