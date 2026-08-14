import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { OgeAutocomplete } from './autocomplete';

const CITIES = [
  { name: 'Istanbul' },
  { name: 'Izmir' },
  { name: 'Iznik', off: true },
  { name: 'Ankara' },
];

const combo = () => screen.getByRole('combobox') as HTMLInputElement;

function Host(extra: Partial<Parameters<typeof OgeAutocomplete>[0]> = {}) {
  const [city, setCity] = useState('');
  return (
    <OgeAutocomplete
      label="City"
      items={CITIES}
      displayExpr="name"
      disabledExpr="off"
      searchTimeout={0}
      value={city}
      onValueChange={setCity}
      {...extra}
    />
  );
}

describe('<OgeAutocomplete>', () => {
  it('suggestions open from minSearchLength characters and cap at maxItemCount', () => {
    render(<Host minSearchLength={2} maxItemCount={2} />);
    fireEvent.change(combo(), { target: { value: 'i' } });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.change(combo(), { target: { value: 'iz' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option').length).toBeLessThanOrEqual(2);
  });

  it('picking a suggestion commits its display text and reports the item', async () => {
    const onSelectionChange = vi.fn();
    render(<Host onSelectionChange={onSelectionChange} />);
    fireEvent.change(combo(), { target: { value: 'izm' } });
    // the highlight <mark> splits the accessible name ("Izm ir") — match loosely
    fireEvent.click(screen.getByRole('option', { name: /Izm/ }));
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(combo().value).toBe('Izmir');
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ item: CITIES[1] }),
    );
  });

  it('the typed match highlights inside each suggestion', () => {
    render(<Host />);
    fireEvent.change(combo(), { target: { value: 'stan' } });
    const mark = document.querySelector('mark.oge-select-highlight');
    expect(mark).toHaveTextContent('stan');
  });

  it('free text commits as the value when forceSelection is off', () => {
    const onValueChange = vi.fn();
    render(<Host onValueChange={onValueChange} />);
    fireEvent.change(combo(), { target: { value: 'Berlin' } });
    fireEvent.blur(combo());
    expect(onValueChange).toHaveBeenCalledWith('Berlin');
  });

  it('forceSelection reverts non-matching text on blur', () => {
    const onValueChange = vi.fn();
    render(<Host forceSelection onValueChange={onValueChange} />);
    fireEvent.change(combo(), { target: { value: 'Berlin' } });
    fireEvent.blur(combo());
    expect(onValueChange).not.toHaveBeenCalled();
    expect(combo().value).toBe('');
  });

  it('an exact display match selects the item even when typed', () => {
    const onSelectionChange = vi.fn();
    render(<Host forceSelection onSelectionChange={onSelectionChange} />);
    fireEvent.change(combo(), { target: { value: 'ankara' } });
    fireEvent.blur(combo());
    expect(combo().value).toBe('Ankara');
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ item: CITIES[3] }),
    );
  });

  it('keyboard: arrows navigate suggestions, Enter picks the active one', async () => {
    render(<Host />);
    fireEvent.change(combo(), { target: { value: 'i' } });
    fireEvent.keyDown(combo(), { key: 'ArrowDown' }); // Istanbul
    fireEvent.keyDown(combo(), { key: 'ArrowDown' }); // Izmir (Iznik disabled)
    fireEvent.keyDown(combo(), { key: 'ArrowDown' });
    const activeId = combo().getAttribute('aria-activedescendant')!;
    expect(document.getElementById(activeId)).toHaveTextContent('Izmir');
    fireEvent.keyDown(combo(), { key: 'Enter' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(combo().value).toBe('Izmir');
  });
});
