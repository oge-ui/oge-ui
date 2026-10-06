import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef } from 'react';
import type { OgeContextMenuOpeningEvent } from '@oge-ui/behavior';
import { OgeContextMenu, type OgeContextMenuHandle } from './context-menu';

const menu = (): HTMLElement | null =>
  document.body.querySelector('.oge-menu-list');

const flushFrames = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
};

function Rows({
  openings,
  cancel = false,
  handle,
}: {
  openings: OgeContextMenuOpeningEvent[];
  cancel?: boolean;
  handle?: React.Ref<OgeContextMenuHandle>;
}) {
  return (
    <OgeContextMenu
      ref={handle}
      items={[]}
      target="li"
      ariaLabel="Row actions"
      onOpening={(event) => {
        openings.push(event);
        if (cancel) {
          event.cancel = true;
          return;
        }
        const id = event.target.getAttribute('data-id') ?? 'host';
        event.items = [{ text: `Open ${id}` }, { text: `Delete ${id}` }];
      }}
    >
      <ul data-testid="host">
        {[1, 2, 3].map((id) => (
          <li key={id} tabIndex={0} data-id={id}>
            <span>Row {id}</span>
          </li>
        ))}
        <p data-testid="gap">not a row</p>
      </ul>
    </OgeContextMenu>
  );
}

describe('OgeContextMenu delegation and imperative open', () => {
  it('opens for the closest match and builds the items per target', async () => {
    const openings: OgeContextMenuOpeningEvent[] = [];
    render(<Rows openings={openings} />);
    const cell = screen.getByText('Row 2');
    const notPrevented = fireEvent.contextMenu(cell, {
      clientX: 30,
      clientY: 40,
    });
    expect(notPrevented).toBe(false);
    await flushFrames();
    expect(openings[0].target.getAttribute('data-id')).toBe('2');
    expect(openings[0].event).toBeInstanceOf(MouseEvent);
    expect(menu()?.textContent).toContain('Open 2');
  });

  it('a request outside every match keeps the browser menu', async () => {
    const openings: OgeContextMenuOpeningEvent[] = [];
    render(<Rows openings={openings} />);
    const notPrevented = fireEvent.contextMenu(screen.getByTestId('gap'), {
      clientX: 30,
      clientY: 40,
    });
    expect(notPrevented).toBe(true);
    await flushFrames();
    expect(openings).toHaveLength(0);
    expect(menu()).toBeNull();
  });

  it('a cancelled opening shows nothing but suppresses the browser menu', async () => {
    const openings: OgeContextMenuOpeningEvent[] = [];
    render(<Rows openings={openings} cancel />);
    const notPrevented = fireEvent.contextMenu(screen.getByText('Row 1'), {
      clientX: 30,
      clientY: 40,
    });
    expect(notPrevented).toBe(false);
    await flushFrames();
    expect(menu()).toBeNull();
  });

  it('Shift+F10 on a focused row targets it and focus returns to it', async () => {
    const openings: OgeContextMenuOpeningEvent[] = [];
    render(<Rows openings={openings} />);
    const row = screen.getByText('Row 3').closest('li') as HTMLElement;
    act(() => row.focus());
    fireEvent.keyDown(row, { key: 'F10', shiftKey: true });
    await flushFrames();
    expect(menu()?.textContent).toContain('Open 3');
    fireEvent.keyDown(document, { key: 'Escape' });
    await flushFrames();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(row);
  });

  it('open(x, y) and close() on the ref handle, under StrictMode', async () => {
    const handle = createRef<OgeContextMenuHandle>();
    const openings: OgeContextMenuOpeningEvent[] = [];
    render(
      <StrictMode>
        <OgeContextMenu
          ref={handle}
          items={[{ text: 'Rename' }]}
          onOpening={(e) => openings.push(e)}
        >
          <div tabIndex={0} data-testid="target">
            Target
          </div>
        </OgeContextMenu>
      </StrictMode>,
    );
    act(() => handle.current?.open(40, 50));
    await flushFrames();
    expect(menu()).not.toBeNull();
    expect(openings[0].event).toBe(null);
    expect(openings[0].target).toBe(screen.getByTestId('target'));
    const popup = document.body.querySelector('.oge-popup') as HTMLElement;
    expect(popup.style.left).toBe('40px');
    act(() => handle.current?.close());
    await flushFrames();
    expect(menu()).toBeNull();
    act(() =>
      handle.current?.open(
        new MouseEvent('click', { clientX: 12, clientY: 14, detail: 1 }),
      ),
    );
    await flushFrames();
    expect(menu()).not.toBeNull();
    expect(openings[1].event).toBeInstanceOf(MouseEvent);
  });
});
