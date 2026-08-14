import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { OgeTagBox } from './tag-box';

const SKILLS = [
  { id: 'ts', name: 'TypeScript' },
  { id: 'ng', name: 'Angular' },
  { id: 're', name: 'React' },
  { id: 'rs', name: 'Rust', off: true },
];

const combo = () => screen.getByRole('combobox') as HTMLInputElement;

function Host(extra: Partial<Parameters<typeof OgeTagBox>[0]> = {}) {
  const [selected, setSelected] = useState<readonly unknown[]>(['ts']);
  return (
    <OgeTagBox
      label="Skills"
      items={SKILLS}
      displayExpr="name"
      valueExpr="id"
      disabledExpr="off"
      value={selected}
      onValueChange={setSelected}
      {...extra}
    />
  );
}

describe('<OgeTagBox>', () => {
  it('renders selected values as chips with remove buttons', () => {
    render(<Host />);
    expect(screen.getByText('TypeScript')).toHaveClass('oge-tag-text');
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('the popup is a multiselectable listbox that stays open while picking', () => {
    const onSelectionChange = vi.fn();
    render(<Host onSelectionChange={onSelectionChange} />);
    fireEvent.click(combo());
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
    expect(screen.getByRole('option', { name: 'TypeScript' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    fireEvent.click(screen.getByRole('option', { name: 'React' }));
    expect(onSelectionChange).toHaveBeenCalledWith({
      addedItems: [SKILLS[2]],
      removedItems: [],
    });
    // stays open for the next pick
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const chipTexts = Array.from(
      document.querySelectorAll('.oge-tag-text'),
    ).map((chip) => chip.textContent);
    expect(chipTexts).toEqual(['TypeScript', 'React']);
  });

  it('toggling a selected option removes it from the value', () => {
    const onValueChange = vi.fn();
    render(<Host onValueChange={onValueChange} />);
    fireEvent.click(combo());
    fireEvent.click(screen.getByRole('option', { name: 'TypeScript' }));
    expect(onValueChange).toHaveBeenCalledWith([]);
  });

  it('chip remove and Backspace both drop the last selection', () => {
    const onValueChange = vi.fn();
    render(<Host onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onValueChange).toHaveBeenCalledWith([]);
    onValueChange.mockClear();
    fireEvent.keyDown(combo(), { key: 'Backspace' });
    expect(onValueChange).toHaveBeenCalledWith([]);
  });

  it('maxDisplayedTags collapses the overflow into a +N chip', () => {
    function Multi() {
      const [selected, setSelected] = useState<readonly unknown[]>([
        'ts',
        'ng',
        're',
      ]);
      return (
        <OgeTagBox
          label="Skills"
          items={SKILLS}
          displayExpr="name"
          valueExpr="id"
          value={selected}
          onValueChange={setSelected}
          maxDisplayedTags={1}
        />
      );
    }
    render(<Multi />);
    expect(screen.getByText('+2')).toHaveClass('oge-tag-more');
    expect(screen.queryByText('Angular')).toBeNull();
  });

  it('hideSelectedItems removes picked options from the popup', () => {
    render(<Host hideSelectedItems />);
    fireEvent.click(combo());
    expect(screen.queryByRole('option', { name: 'TypeScript' })).toBeNull();
    expect(screen.getByRole('option', { name: 'React' })).toBeInTheDocument();
  });

  it('keyboard: arrows navigate, Enter toggles the active option', () => {
    const onValueChange = vi.fn();
    render(<Host onValueChange={onValueChange} />);
    fireEvent.keyDown(combo(), { key: 'ArrowDown' }); // opens, first enabled
    fireEvent.keyDown(combo(), { key: 'ArrowDown' }); // Angular
    fireEvent.keyDown(combo(), { key: 'Enter' });
    expect(onValueChange).toHaveBeenCalledWith(['ts', 'ng']);
  });

  it('showClearButton empties the whole selection', () => {
    const onValueChange = vi.fn();
    render(<Host showClearButton onValueChange={onValueChange} />);
    const clear = document.querySelector('.oge-input-clear') as HTMLElement;
    expect(clear).not.toBeNull();
    fireEvent.click(clear);
    expect(onValueChange).toHaveBeenCalledWith([]);
    // …and it only shows while something is selected
    render(<OgeTagBox label="Empty" items={SKILLS} showClearButton />);
    expect(document.querySelectorAll('.oge-input-clear')).toHaveLength(1); // still just the first host's
  });

  it('searchEnabled filters and clears after a pick', async () => {
    render(<Host searchEnabled />);
    fireEvent.change(combo(), { target: { value: 'rea' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.click(screen.getByRole('option', { name: 'React' }));
    expect(combo().value).toBe('');
  });
});
