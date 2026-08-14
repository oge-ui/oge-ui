import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { OgeButton } from './button';
import { OgeButtonGroup, type OgeButtonGroupHandle } from './button-group';
import type { OgeButtonGroupSelectionChange } from '@oge-ui/behavior';

const buttons = () => screen.getAllByRole('radio');

describe('<OgeButtonGroup>', () => {
  it('takes the ARIA role that matches its selection mode', () => {
    const { rerender } = render(
      <OgeButtonGroup ariaLabel="Align">
        <OgeButton value="l" text="Left" />
      </OgeButtonGroup>,
    );
    expect(screen.getByRole('toolbar')).toHaveAttribute('aria-label', 'Align');

    rerender(
      <OgeButtonGroup selectionMode="single" ariaLabel="Align">
        <OgeButton value="l" text="Left" />
      </OgeButtonGroup>,
    );
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();

    rerender(
      <OgeButtonGroup selectionMode="multiple" ariaLabel="Align">
        <OgeButton value="l" text="Left" />
      </OgeButtonGroup>,
    );
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('cascades stylingMode, severity, size and disabled to children', () => {
    render(
      <OgeButtonGroup
        severity="danger"
        size="sm"
        stylingMode="outlined"
        disabled
      >
        <OgeButton value="a" text="A" />
      </OgeButtonGroup>,
    );
    const host = screen.getByRole('button').parentElement;
    expect(host).toHaveClass('oge-button-severity-danger');
    expect(host).toHaveClass('oge-button-sm');
    expect(host).toHaveClass('oge-button-outlined');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('single mode selects one and refuses to unselect it', () => {
    const onSelectionChange =
      vi.fn<(c: OgeButtonGroupSelectionChange) => void>();
    render(
      <OgeButtonGroup
        selectionMode="single"
        defaultSelectedKeys={['l']}
        onSelectionChange={onSelectionChange}
      >
        <OgeButton value="l" text="Left" />
        <OgeButton value="c" text="Center" />
      </OgeButtonGroup>,
    );
    const [left, center] = buttons();
    expect(left).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(center);
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      selectedKeys: ['c'],
      addedKeys: ['c'],
      removedKeys: ['l'],
    });
    expect(buttons()[1]).toHaveAttribute('aria-checked', 'true');

    onSelectionChange.mockClear();
    fireEvent.click(buttons()[1]); // re-click the selected radio
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('multiple mode toggles independently', () => {
    const onSelectionChange =
      vi.fn<(c: OgeButtonGroupSelectionChange) => void>();
    render(
      <OgeButtonGroup
        selectionMode="multiple"
        onSelectionChange={onSelectionChange}
      >
        <OgeButton value="b" text="Bold" />
        <OgeButton value="i" text="Italic" />
      </OgeButtonGroup>,
    );
    const [bold, italic] = screen.getAllByRole('button');
    fireEvent.click(bold);
    fireEvent.click(italic);
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      selectedKeys: ['b', 'i'],
      addedKeys: ['i'],
      removedKeys: [],
    });
    fireEvent.click(bold);
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      selectedKeys: ['i'],
      addedKeys: [],
      removedKeys: ['b'],
    });
  });

  it('honours a controlled selectedKeys prop', () => {
    function Controlled() {
      const [keys, setKeys] = useState<readonly string[]>(['l']);
      return (
        <OgeButtonGroup
          selectionMode="single"
          selectedKeys={keys}
          onSelectionChange={(c) => setKeys(c.selectedKeys)}
        >
          <OgeButton value="l" text="Left" />
          <OgeButton value="r" text="Right" />
        </OgeButtonGroup>
      );
    }
    render(<Controlled />);
    fireEvent.click(buttons()[1]);
    expect(buttons()[1]).toHaveAttribute('aria-checked', 'true');
    expect(buttons()[0]).toHaveAttribute('aria-checked', 'false');
  });

  it('renders data-driven items after the projected children', () => {
    render(
      <OgeButtonGroup items={[{ value: 'c', text: 'Center' }]}>
        <OgeButton value="l" text="Left" />
      </OgeButtonGroup>,
    );
    const labels = screen.getAllByRole('button').map((b) => b.textContent);
    expect(labels).toEqual(['Left', 'Center']);
  });

  it('keeps exactly one button in the Tab sequence', () => {
    render(
      <OgeButtonGroup>
        <OgeButton value="a" text="A" />
        <OgeButton value="b" text="B" />
        <OgeButton value="c" text="C" />
      </OgeButtonGroup>,
    );
    const tabbable = screen
      .getAllByRole('button')
      .filter((b) => b.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].textContent).toBe('A');
  });

  it('arrow keys move focus, and in single mode the selection too', () => {
    const onSelectionChange =
      vi.fn<(c: OgeButtonGroupSelectionChange) => void>();
    render(
      <OgeButtonGroup
        selectionMode="single"
        defaultSelectedKeys={['l']}
        onSelectionChange={onSelectionChange}
      >
        <OgeButton value="l" text="Left" />
        <OgeButton value="c" text="Center" />
      </OgeButtonGroup>,
    );
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons()[1]);
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      selectedKeys: ['c'],
      addedKeys: ['c'],
      removedKeys: ['l'],
    });
  });

  it('arrow navigation wraps and skips disabled buttons', () => {
    render(
      <OgeButtonGroup>
        <OgeButton value="a" text="A" />
        <OgeButton value="b" text="B" disabled />
        <OgeButton value="c" text="C" />
      </OgeButtonGroup>,
    );
    const group = screen.getByRole('toolbar');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect((document.activeElement as HTMLElement).textContent).toBe('C');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect((document.activeElement as HTMLElement).textContent).toBe('A');
    fireEvent.keyDown(group, { key: 'End' });
    expect((document.activeElement as HTMLElement).textContent).toBe('C');
    fireEvent.keyDown(group, { key: 'Home' });
    expect((document.activeElement as HTMLElement).textContent).toBe('A');
  });

  it('reports item clicks with the matching data item', () => {
    const onItemClick = vi.fn();
    render(
      <OgeButtonGroup items={[{ value: 'c', text: 'Center' }]}>
        <OgeButton value="l" text="Left" />
      </OgeButtonGroup>,
    );
    render(
      <OgeButtonGroup
        items={[{ value: 'c', text: 'Center' }]}
        onItemClick={onItemClick}
      >
        <OgeButton value="l" text="Left" />
      </OgeButtonGroup>,
    );
    fireEvent.click(screen.getAllByText('Center')[1]);
    expect(onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 'c',
        item: { value: 'c', text: 'Center' },
      }),
    );
  });
});

describe('<OgeButtonGroup> — parity with the Angular group', () => {
  it('reports the DOM-order index with each item click', () => {
    const onItemClick = vi.fn();
    render(
      <OgeButtonGroup onItemClick={onItemClick}>
        <OgeButton value="a" text="A" />
        <OgeButton value="b" text="B" />
      </OgeButtonGroup>,
    );
    fireEvent.click(screen.getByText('B'));
    expect(onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'b', index: 1 }),
    );
  });

  it('focus() moves to the roving-tabindex target, not simply the first button', () => {
    const ref = createRef<OgeButtonGroupHandle>();
    render(
      <OgeButtonGroup
        ref={ref}
        selectionMode="single"
        defaultSelectedKeys={['b']}
      >
        <OgeButton value="a" text="A" />
        <OgeButton value="b" text="B" />
      </OgeButtonGroup>,
    );
    act(() => ref.current?.focus());
    expect((document.activeElement as HTMLElement).textContent).toBe('B');
  });
});
