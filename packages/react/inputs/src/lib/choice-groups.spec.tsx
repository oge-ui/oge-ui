import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import {
  OgeCheckBoxGroup,
  type OgeCheckBoxGroupHandle,
} from './check-box-group';
import { OgeToggleGroup } from './toggle-group';

interface Channel {
  id: string;
  name: string;
  locked?: boolean;
}

const CHANNELS: Channel[] = [
  { id: 'mail', name: 'E-mail' },
  { id: 'sms', name: 'SMS' },
  { id: 'push', name: 'Push', locked: true },
  { id: 'call', name: 'Phone call' },
];

function itemBoxes(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      '.oge-check-box-group-item .oge-check-box-input',
    ),
  );
}

function selectAllBox(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>(
    '.oge-check-box-group-select-all .oge-check-box-input',
  )!;
}

describe('<OgeCheckBoxGroup>', () => {
  function Host(props: {
    initial?: unknown[];
    onChange?: (v: unknown) => void;
  }) {
    const [value, setValue] = useState<readonly unknown[]>(props.initial ?? []);
    return (
      <OgeCheckBoxGroup<Channel>
        label="Notify me by"
        hint="Pick any"
        items={CHANNELS}
        displayExpr="name"
        valueExpr="id"
        disabledExpr="locked"
        showSelectAll
        value={value}
        onValueChange={(next) => {
          setValue(next);
          props.onChange?.(next);
        }}
      />
    );
  }

  it('renders a labelled group with the hint and native check boxes (StrictMode)', () => {
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    const group = screen.getByRole('group', { name: 'Notify me by' });
    expect(group).toHaveClass('oge-check-box-group');
    const hint = group.querySelector('.oge-check-box-group-subscript')!;
    expect(hint.textContent).toBe('Pick any');
    expect(group.getAttribute('aria-describedby')).toBe(hint.id);
    expect(itemBoxes()).toHaveLength(4);
    expect(itemBoxes()[2].disabled).toBe(true);
  });

  it('commits in items order, not click order', () => {
    const onChange = vi.fn();
    render(
      <StrictMode>
        <Host onChange={onChange} />
      </StrictMode>,
    );
    fireEvent.click(itemBoxes()[3]);
    fireEvent.click(itemBoxes()[0]);
    expect(onChange).toHaveBeenLastCalledWith(['mail', 'call']);
    fireEvent.click(itemBoxes()[3]);
    expect(onChange).toHaveBeenLastCalledWith(['mail']);
    expect(itemBoxes()[0].checked).toBe(true);
  });

  it('select all is tri-state and leaves disabled items alone', () => {
    const onChange = vi.fn();
    render(<Host initial={['push']} onChange={onChange} />);
    expect(selectAllBox().checked).toBe(false);
    fireEvent.click(itemBoxes()[0]);
    expect(selectAllBox().indeterminate).toBe(true);
    fireEvent.click(selectAllBox());
    expect(onChange).toHaveBeenLastCalledWith(['mail', 'sms', 'push', 'call']);
    expect(selectAllBox().checked).toBe(true);
    fireEvent.click(selectAllBox());
    expect(onChange).toHaveBeenLastCalledWith(['push']);
  });

  it('shows a resolved error and exposes selectAll() / unselectAll()', () => {
    const ref = createRef<OgeCheckBoxGroupHandle>();
    const onValueChange = vi.fn();
    render(
      <OgeCheckBoxGroup
        ref={ref}
        label="Channels"
        items={CHANNELS}
        displayExpr="name"
        valueExpr="id"
        layout="columns"
        columns={3}
        errors={[{ kind: 'required' }]}
        errorDisplay="always"
        onValueChange={onValueChange}
      />,
    );
    const group = screen.getByRole('group', { name: 'Channels' });
    expect(group).toHaveClass('oge-check-box-group-columns');
    expect(group.style.getPropertyValue('--oge-check-box-group-columns')).toBe(
      '3',
    );
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(group.querySelector('.oge-check-box-group-error')?.textContent).toBe(
      'This field is required',
    );
    ref.current!.selectAll();
    // no disabledExpr here — every item is selectable
    expect(onValueChange).toHaveBeenLastCalledWith([
      'mail',
      'sms',
      'push',
      'call',
    ]);
  });
});

describe('<OgeToggleGroup>', () => {
  const ALIGNS = [
    { id: 'left', text: 'Left' },
    { id: 'center', text: 'Center' },
    { id: 'right', text: 'Right', off: true },
    { id: 'justify', text: 'Justify' },
  ];

  function Host(props: {
    mode?: 'single' | 'multiple';
    initial?: unknown;
    onChange?: (v: unknown) => void;
  }) {
    const [value, setValue] = useState<unknown>(props.initial ?? 'center');
    return (
      <OgeToggleGroup
        label="Alignment"
        items={ALIGNS}
        displayExpr="text"
        valueExpr="id"
        disabledExpr="off"
        selectionMode={props.mode}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          props.onChange?.(next);
        }}
      />
    );
  }

  const segments = (): HTMLButtonElement[] =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>('.oge-toggle-group-item'),
    );

  it('single: a labelled radiogroup with the roving tab stop on first paint', () => {
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    const track = screen.getByRole('radiogroup', { name: 'Alignment' });
    expect(track).toHaveClass('oge-toggle-group-track');
    expect(segments().map((b) => b.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
      'false',
    ]);
    expect(segments().map((b) => b.tabIndex)).toEqual([-1, 0, -1, -1]);
  });

  it('single: arrows move selection past disabled segments; no unselect', () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    segments()[1].focus();
    fireEvent.keyDown(segments()[1], { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('justify');
    expect(document.activeElement).toBe(segments()[3]);
    fireEvent.click(segments()[3]);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('multiple: aria-pressed toggles in items order', () => {
    const onChange = vi.fn();
    const onSelection = vi.fn();
    render(
      <OgeToggleGroup
        label="Alignment"
        items={ALIGNS}
        displayExpr="text"
        valueExpr="id"
        selectionMode="multiple"
        defaultValue={[]}
        onValueChange={onChange}
        onSelectionChange={onSelection}
      />,
    );
    expect(screen.getByRole('group', { name: 'Alignment' })).toBeTruthy();
    fireEvent.click(segments()[3]);
    fireEvent.click(segments()[0]);
    expect(onChange).toHaveBeenLastCalledWith(['left', 'justify']);
    expect(onSelection).toHaveBeenLastCalledWith({
      value: ['left', 'justify'],
      addedValues: ['left'],
      removedValues: [],
    });
    expect(segments()[0].getAttribute('aria-pressed')).toBe('true');
    expect(segments()[0].hasAttribute('role')).toBe(false);
  });
});
