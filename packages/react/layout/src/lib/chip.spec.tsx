import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { OgeChipItem, OgeChipKey } from '@oge-ui/behavior';
import { OgeChip, type OgeChipHandle } from './chip';
import { OgeChipList } from './chip-list';
import { OgeChipConfigProvider } from './layout-config';

const ITEMS: OgeChipItem[] = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta', disabled: true },
  { key: 'c', label: 'Gamma' },
  { key: 'd', label: 'Delta' },
];

describe('<OgeChip>', () => {
  it('renders a static chip as plain text', () => {
    render(<OgeChip label="Design" severity="accent" />);
    const chip = document.querySelector('.oge-chip')!;
    expect(chip.className).toContain('oge-chip-accent');
    expect(chip.querySelector('.oge-chip-label')?.textContent).toBe('Design');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('toggles aria-pressed uncontrolled and reports the change', () => {
    const changes: boolean[] = [];
    render(
      <OgeChip
        label="Remote"
        selectable
        onSelectedChange={(s) => changes.push(s)}
      />,
    );
    const button = screen.getByRole('button', { name: 'Remote' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(changes).toEqual([true]);
  });

  it('removes through the remove button and Delete; disabled blocks it', () => {
    const removed: unknown[] = [];
    const { rerender } = render(
      <OgeChip
        label="Design"
        selectable
        removable
        onRemoved={(e) => removed.push(e)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove Design' }));
    const main = screen.getByRole('button', { name: 'Design' });
    expect(main).toHaveAttribute('aria-keyshortcuts', 'Delete Backspace');
    fireEvent.keyDown(main, { key: 'Backspace' });
    expect(removed).toHaveLength(2);
    rerender(
      <OgeChip
        label="Design"
        selectable
        removable
        disabled
        onRemoved={(e) => removed.push(e)}
      />,
    );
    fireEvent.keyDown(main, { key: 'Delete' });
    expect(removed).toHaveLength(2);
  });

  it('uses the config for size, styling and messages; focus() via the handle', () => {
    const ref = createRef<OgeChipHandle>();
    render(
      <OgeChipConfigProvider
        config={{
          size: 'lg',
          stylingMode: 'outlined',
          messages: { remove: 'Kaldır: {label}' },
        }}
      >
        <OgeChip
          ref={ref}
          label="Tasarım"
          removable
          avatar={{ name: 'Ada Lovelace' }}
        />
      </OgeChipConfigProvider>,
    );
    const chip = document.querySelector('.oge-chip')!;
    expect(chip.className).toContain('oge-chip-lg');
    expect(chip.className).toContain('oge-chip-outlined');
    expect(document.querySelector('.oge-chip-avatar')?.textContent).toBe('AL');
    act(() => ref.current?.focus());
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Kaldır: Tasarım' }),
    );
  });
});

function ControlledList(props: {
  mode?: 'none' | 'single' | 'multiple';
  removable?: boolean;
  veto?: boolean;
}) {
  const [items, setItems] = useState(ITEMS);
  const [keys, setKeys] = useState<readonly OgeChipKey[]>([]);
  return (
    <OgeChipList
      items={items}
      selectionMode={props.mode ?? 'multiple'}
      selectedKeys={keys}
      onSelectedKeysChange={setKeys}
      removable={props.removable}
      onItemRemoving={(e) => {
        e.cancel = !!props.veto;
      }}
      onItemRemoved={(e) =>
        setItems((current) => current.filter((i) => i.key !== e.item.key))
      }
    />
  );
}

describe('<OgeChipList> listbox', () => {
  const options = () => screen.getAllByRole('option');

  it('has one tab stop on the first paint and skips disabled chips', () => {
    render(<ControlledList />);
    const list = screen.getByRole('listbox', { name: 'Chips' });
    expect(list).toHaveAttribute('aria-multiselectable', 'true');
    expect(options().map((o) => o.tabIndex)).toEqual([0, -1, -1, -1]);
    act(() => options()[0].focus());
    fireEvent.keyDown(options()[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(options()[2]);
    fireEvent.keyDown(options()[2], { key: 'End' });
    expect(document.activeElement).toBe(options()[3]);
    fireEvent.keyDown(options()[3], { key: 'Home' });
    expect(document.activeElement).toBe(options()[0]);
  });

  it('Space and click toggle aria-selected', () => {
    render(<ControlledList />);
    fireEvent.keyDown(options()[0], { key: ' ' });
    fireEvent.click(options()[2]);
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    expect(options()[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(options()[1]);
    expect(options()[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('Delete removes and moves focus to the next chip; a veto keeps it', () => {
    const { unmount } = render(<ControlledList removable />);
    act(() => options()[2].focus());
    fireEvent.keyDown(options()[2], { key: 'Delete' });
    expect(options()).toHaveLength(3);
    expect(document.activeElement?.textContent).toContain('Delta');
    unmount();
    render(<ControlledList removable veto />);
    fireEvent.keyDown(options()[0], { key: 'Delete' });
    expect(options()).toHaveLength(4);
  });
});

describe('<OgeChipList> grid and list', () => {
  it('static chips are a list with nothing focusable', () => {
    render(<OgeChipList items={ITEMS} />);
    expect(screen.getByRole('list')).not.toHaveAttribute('aria-label');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(document.querySelectorAll('[tabindex]')).toHaveLength(0);
  });

  it('removable chips form a grid; arrows reach the real remove button', () => {
    render(<ControlledList mode="none" removable />);
    expect(screen.getByRole('grid', { name: 'Chips' })).toBeInTheDocument();
    const cells = screen.getAllByRole('gridcell');
    const first = cells[0];
    expect(first.tabIndex).toBe(0);
    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Remove Alpha' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha' }));
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('renderChip replaces the label', () => {
    render(
      <OgeChipList
        items={ITEMS.slice(0, 2)}
        renderChip={({ item, index }) => (
          <b className="custom">{`${index}:${item.label}`}</b>
        )}
      />,
    );
    expect(
      Array.from(document.querySelectorAll('.custom')).map(
        (c) => c.textContent,
      ),
    ).toEqual(['0:Alpha', '1:Beta']);
  });

  it('survives StrictMode double effects', () => {
    render(
      <StrictMode>
        <ControlledList removable />
      </StrictMode>,
    );
    fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'Delete' });
    expect(screen.getAllByRole('option')).toHaveLength(3);
    // Beta is disabled, so focus skips to Gamma
    expect(document.activeElement?.textContent).toContain('Gamma');
  });
});
