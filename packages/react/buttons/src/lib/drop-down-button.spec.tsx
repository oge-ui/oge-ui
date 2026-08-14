import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StrictMode } from 'react';
import type { OgeMenuItem } from '@oge-ui/behavior';
import { OgeDropDownButton } from './drop-down-button';

const items: readonly OgeMenuItem[] = [
  { text: 'CSV' },
  { text: 'Excel' },
  { text: 'PDF', disabled: true },
];

const trigger = () => screen.getByRole('button', { name: /Export/ });

describe('<OgeDropDownButton>', () => {
  it('renders the menu-button pattern and toggles on click', async () => {
    render(<OgeDropDownButton text="Export" items={items} />);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute(
      'aria-controls',
      document.querySelector('.oge-popup')!.id,
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);

    fireEvent.click(trigger());
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('activating an item emits onItemClick and closes the panel', async () => {
    const onItemClick = vi.fn();
    render(
      <OgeDropDownButton
        text="Export"
        items={items}
        onItemClick={onItemClick}
      />,
    );
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('menuitem', { name: 'Excel' }));
    expect(onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({ index: 1 }),
    );
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('ArrowDown opens and moves the active row into the menu', async () => {
    render(<OgeDropDownButton text="Export" items={items} />);
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    const menu = await screen.findByRole('menu');
    await waitFor(() =>
      expect(menu.getAttribute('aria-activedescendant')).toBeTruthy(),
    );
    const active = document.getElementById(
      menu.getAttribute('aria-activedescendant')!,
    );
    expect(active).toHaveTextContent('CSV');
  });

  it('Escape closes the panel and restores focus to the trigger', async () => {
    render(<OgeDropDownButton text="Export" items={items} />);
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    const menu = await screen.findByRole('menu');
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it('lazy items show the loading row, then the resolved menu — cached', async () => {
    let resolve!: (v: readonly OgeMenuItem[]) => void;
    const source = vi.fn(
      () => new Promise<readonly OgeMenuItem[]>((r) => (resolve = r)),
    );
    render(<OgeDropDownButton text="Export" items={source} />);
    fireEvent.click(trigger());
    expect(screen.getByText('Loading…')).toBeInTheDocument();

    await act(async () => resolve([{ text: 'Loaded' }]));
    // presence, not visibility: the popup stays opacity-0 until the first
    // rAF measure, which jsdom's fake layout never grants synchronously
    expect(
      screen.getByRole('menuitem', { name: 'Loaded' }),
    ).toBeInTheDocument();

    // reopen: cached, the source is not invoked again
    fireEvent.click(trigger());
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    fireEvent.click(trigger());
    expect(
      screen.getByRole('menuitem', { name: 'Loaded' }),
    ).toBeInTheDocument();
    expect(source).toHaveBeenCalledTimes(1);
  });

  it('a rejected lazy source shows the error row', async () => {
    let reject!: (e: unknown) => void;
    render(
      <OgeDropDownButton
        text="Export"
        items={() => new Promise((_r, rej) => (reject = rej))}
      />,
    );
    fireEvent.click(trigger());
    await act(async () => reject(new Error('nope')));
    expect(screen.getByText('Could not load items')).toBeInTheDocument();
  });

  it('an empty items list shows the no-items row', () => {
    render(<OgeDropDownButton text="Export" items={[]} />);
    fireEvent.click(trigger());
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('split mode: main click fires onClick, only the toggle opens', () => {
    const onClick = vi.fn();
    render(
      <OgeDropDownButton
        text="Run"
        splitButton
        items={items}
        onClick={onClick}
      />,
    );
    const main = screen.getByRole('button', { name: 'Run' });
    expect(main).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(main);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-haspopup', 'menu');
    fireEvent.click(toggle);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('rememberLastAction swaps the main label and reports the change', async () => {
    const onSelectionChange = vi.fn();
    render(
      <OgeDropDownButton
        text="Run"
        splitButton
        rememberLastAction
        items={items}
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Excel' }));
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ previousItem: null }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Excel' })).toBeVisible(),
    );
  });

  it('renderContent replaces the menu and its close() shuts the panel', async () => {
    render(
      <OgeDropDownButton
        text="More"
        renderContent={(close) => (
          <button type="button" onClick={close}>
            Custom close
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /More/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Custom close' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Custom close' })).toBeNull(),
    );
  });

  it('still works after a StrictMode remount cycle', () => {
    render(
      <StrictMode>
        <OgeDropDownButton text="Export" items={items} />
      </StrictMode>,
    );
    fireEvent.click(trigger());
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
