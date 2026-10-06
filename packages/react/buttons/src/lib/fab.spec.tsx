import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { OgeSpeedDialItem } from '@oge-ui/behavior';
import { OgeFabConfigProvider } from './buttons-config';
import { OgeFab, type OgeFabHandle } from './fab';
import { OgeSpeedDial, type OgeSpeedDialHandle } from './speed-dial';

const ITEMS: OgeSpeedDialItem[] = [
  { key: 'doc', label: 'Document', icon: 'M4 4h16v16H4z' },
  { key: 'sheet', label: 'Spreadsheet', disabled: true },
  { key: 'slides', label: 'Slides' },
];

describe('<OgeFab>', () => {
  it('is an icon-only button named by its label, with the layer classes', () => {
    const clicks: unknown[] = [];
    render(
      <OgeFab
        label="New message"
        icon="M12 5v14M5 12h14"
        offset="24px"
        onClick={(e) => clicks.push(e)}
      />,
    );
    const button = screen.getByRole('button', { name: 'New message' });
    const host = button.parentElement as HTMLElement;
    expect(host.className).toContain('oge-fab oge-fab-layer');
    expect(host.className).toContain('oge-fab-fixed');
    expect(host.className).toContain('oge-fab-position-bottom-end');
    expect(host.className).toContain('oge-fab-size-md');
    expect(host.className).toContain('oge-fab-severity-accent');
    expect(host.style.getPropertyValue('--oge-fab-offset')).toBe('24px');
    fireEvent.click(button);
    expect(clicks).toHaveLength(1);
  });

  it('extended shows the label as text; config supplies the defaults', () => {
    render(
      <OgeFabConfigProvider config={{ position: 'top-start', size: 'lg' }}>
        <OgeFab label="Compose" extended />
      </OgeFabConfigProvider>,
    );
    const button = screen.getByRole('button', { name: 'Compose' });
    expect(button).not.toHaveAttribute('aria-label');
    expect(button.querySelector('.oge-fab-label')?.textContent).toBe('Compose');
    const host = button.parentElement as HTMLElement;
    expect(host.className).toContain('oge-fab-position-top-start');
    expect(host.className).toContain('oge-fab-size-lg');
    expect(host.className).toContain('oge-fab-extended');
  });

  it('focus() focuses the button', () => {
    const ref = createRef<OgeFabHandle>();
    render(<OgeFab ref={ref} label="Add" />);
    act(() => ref.current?.focus());
    expect(document.activeElement).toBe(screen.getByRole('button'));
  });
});

describe('<OgeSpeedDial>', () => {
  const toggle = () =>
    document.querySelector('.oge-speed-dial-toggle') as HTMLButtonElement;
  const actions = () => screen.queryAllByRole('menuitem');

  it('renders an APG menu button; click opens on the first action', () => {
    render(
      <StrictMode>
        <OgeSpeedDial label="Create" items={ITEMS} />
      </StrictMode>,
    );
    expect(toggle()).toHaveAttribute('aria-haspopup', 'menu');
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(toggle()).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(toggle());
    const menu = screen.getByRole('menu');
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(toggle()).toHaveAttribute('aria-controls', menu.id);
    expect(menu.id).toMatch(/^oge-speed-dial-[a-zA-Z0-9_-]+-menu$/);
    expect(menu).toHaveAttribute('aria-orientation', 'vertical');
    expect(document.activeElement).toBe(actions()[0]);
    expect(actions()[1]).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(toggle());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('falls back to the catalog name', () => {
    render(<OgeSpeedDial items={ITEMS} />);
    expect(toggle()).toHaveAttribute('aria-label', 'Actions');
  });

  it('keyboard: open on first/last, move, wrap, Escape returns focus', () => {
    render(<OgeSpeedDial label="Create" items={ITEMS} />);
    fireEvent.keyDown(toggle(), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(actions()[0]);
    fireEvent.keyDown(actions()[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(actions()[2]);
    fireEvent.keyDown(actions()[2], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(actions()[0]);
    fireEvent.keyDown(actions()[0], { key: 'End' });
    expect(document.activeElement).toBe(actions()[2]);
    fireEvent.keyDown(actions()[2], { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(toggle());
    fireEvent.keyDown(toggle(), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(actions()[2]);
    fireEvent.keyDown(actions()[2], { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('activating an action reports it, closes and returns focus', () => {
    const clicks: [string | number, number][] = [];
    render(
      <OgeSpeedDial
        items={ITEMS}
        onItemClick={({ item, index }) => clicks.push([item.key, index])}
      />,
    );
    fireEvent.click(toggle());
    fireEvent.click(actions()[1]);
    expect(clicks).toEqual([]);
    fireEvent.click(actions()[2]);
    expect(clicks).toEqual([['slides', 2]]);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(toggle());
  });

  it('a press outside closes it', () => {
    render(
      <>
        <button>Outside</button>
        <OgeSpeedDial items={ITEMS} defaultOpened />
      </>,
    );
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('controlled: reports onOpenedChange and follows the prop', () => {
    const changes: boolean[] = [];
    function Host() {
      const [opened, setOpened] = useState(false);
      return (
        <OgeSpeedDial
          items={ITEMS}
          opened={opened}
          onOpenedChange={(next) => {
            changes.push(next);
            setOpened(next);
          }}
        />
      );
    }
    render(<Host />);
    fireEvent.click(toggle());
    expect(changes).toEqual([true]);
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(toggle(), { key: 'Escape' });
    expect(changes).toEqual([true, false]);
  });

  it('handle open/close/toggle, a top dial unfolds down, hover mode', () => {
    const ref = createRef<OgeSpeedDialHandle>();
    render(
      <OgeSpeedDial
        ref={ref}
        items={ITEMS}
        position="top-start"
        openMode="hover"
        labelMode="always"
      />,
    );
    const host = toggle().parentElement as HTMLElement;
    expect(host.className).toContain('oge-speed-dial-down');
    expect(host.className).toContain('oge-speed-dial-labels-after');
    expect(host.className).toContain('oge-speed-dial-labels-always');
    act(() => ref.current?.open());
    expect(screen.getByRole('menu')).toBeTruthy();
    act(() => ref.current?.toggle());
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.pointerEnter(host, { pointerType: 'mouse' });
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(document.activeElement).not.toBe(actions()[0]);
    fireEvent.pointerLeave(host, { pointerType: 'mouse' });
    expect(screen.queryByRole('menu')).toBeNull();
    act(() => ref.current?.focus());
    expect(document.activeElement).toBe(toggle());
  });
});
