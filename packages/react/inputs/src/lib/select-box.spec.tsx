import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { OgeSelectBox } from './select-box';

const CITIES = [
  { id: 1, name: 'Istanbul' },
  { id: 2, name: 'Izmir' },
  { id: 3, name: 'Ankara', off: true },
  { id: 4, name: 'Antalya' },
];

const combo = () => screen.getByRole('combobox') as HTMLInputElement;

function Host(extra: Partial<Parameters<typeof OgeSelectBox>[0]> = {}) {
  const [city, setCity] = useState<unknown>(null);
  return (
    <OgeSelectBox
      label="City"
      items={CITIES}
      displayExpr="name"
      valueExpr="id"
      disabledExpr="off"
      value={city}
      onValueChange={setCity}
      {...extra}
    />
  );
}

describe('<OgeSelectBox>', () => {
  it('renders the combobox pattern closed by default', () => {
    render(<Host />);
    expect(combo()).toHaveAttribute('aria-haspopup', 'listbox');
    expect(combo()).toHaveAttribute('aria-expanded', 'false');
    expect(combo()).toHaveAttribute('aria-autocomplete', 'none');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens on field click, selects on option click, closes and commits', async () => {
    render(<Host />);
    fireEvent.click(combo());
    expect(combo()).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(listbox.id).toBe(combo().getAttribute('aria-controls'));
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByRole('option', { name: 'Ankara' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    fireEvent.click(screen.getByRole('option', { name: 'Izmir' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(combo().value).toBe('Izmir');
  });

  it('ArrowDown opens and navigates with aria-activedescendant, Enter commits', async () => {
    render(<Host />);
    fireEvent.keyDown(combo(), { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // opening activates the first enabled option
    await waitFor(() =>
      expect(combo().getAttribute('aria-activedescendant')).toBeTruthy(),
    );
    fireEvent.keyDown(combo(), { key: 'ArrowDown' }); // Istanbul → Izmir
    const activeId = combo().getAttribute('aria-activedescendant')!;
    expect(document.getElementById(activeId)).toHaveTextContent('Izmir');

    fireEvent.keyDown(combo(), { key: 'Enter' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(combo().value).toBe('Izmir');
  });

  it('select-only type-ahead jumps by label and skips disabled items', async () => {
    render(<Host />);
    fireEvent.keyDown(combo(), { key: 'a' });
    await waitFor(() =>
      expect(combo().getAttribute('aria-activedescendant')).toBeTruthy(),
    );
    // "Ankara" is disabled → "Antalya" wins
    const activeId = combo().getAttribute('aria-activedescendant')!;
    expect(document.getElementById(activeId)).toHaveTextContent('Antalya');
  });

  it('searchEnabled filters the list as the user types', async () => {
    render(<Host searchEnabled searchTimeout={0} />);
    fireEvent.change(combo(), { target: { value: 'iz' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    expect(screen.getByRole('option', { name: 'Izmir' })).toBeInTheDocument();
  });

  it('groupBy renders headers between option groups', () => {
    render(
      <Host
        groupBy={(city: { name: string }) =>
          city.name.startsWith('I') ? 'I…' : 'A…'
        }
      />,
    );
    fireEvent.click(combo());
    const groups = document.querySelectorAll('.oge-select-group');
    expect(Array.from(groups).map((g) => g.textContent?.trim())).toEqual([
      'I…',
      'A…',
    ]);
  });

  it('a lazy items function shows the loading row, then the options', async () => {
    let resolve!: (v: readonly { id: number; name: string }[]) => void;
    render(
      <OgeSelectBox
        label="Lazy"
        items={() => new Promise((r) => (resolve = r))}
        displayExpr="name"
        valueExpr="id"
      />,
    );
    fireEvent.click(combo());
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await act(async () => resolve([{ id: 1, name: 'Loaded' }]));
    expect(screen.getByRole('option', { name: 'Loaded' })).toBeInTheDocument();
  });

  it('Escape closes the popup and the close teardown drops the search text', async () => {
    render(<Host searchEnabled searchTimeout={0} />);
    fireEvent.change(combo(), { target: { value: 'an' } });
    fireEvent.keyDown(combo(), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    // closing resets the search — the field falls back to the selected text
    expect(combo().value).toBe('');
  });

  it('an outside click runs the close teardown the panel machine triggers', async () => {
    const closed: string[] = [];
    render(
      <Host
        searchEnabled
        searchTimeout={0}
        onDropDownClosed={() => closed.push('closed')}
      />,
    );
    fireEvent.change(combo(), { target: { value: 'an' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // the panel core closes itself from its own document listener — the
    // component still owes the teardown (search reset, closed event)
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(closed).toEqual(['closed']);
    expect(combo().value).toBe(''); // search text reset, not left staged
  });

  it('the rail chevron reflects and toggles the popup', async () => {
    render(<Host />);
    const chevron = screen.getByRole('button', { name: 'Toggle dropdown' });
    expect(chevron).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(chevron);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Toggle dropdown' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('<OgeSelectBox acceptCustomValue>', () => {
  interface Fruit {
    name: string;
    kind?: string;
  }
  const FRUITS: Fruit[] = [{ name: 'Apple' }, { name: 'Cherry' }];

  function Host({
    onCustomItemCreating,
    onValueChange,
  }: {
    onCustomItemCreating?: (payload: {
      text: string;
      customItem?: Fruit | null | PromiseLike<Fruit | null>;
    }) => void;
    onValueChange?: (value: unknown) => void;
  }) {
    const [value, setValue] = useState<unknown>(null);
    return (
      <OgeSelectBox<Fruit>
        label="Fruit"
        items={FRUITS}
        displayExpr="name"
        searchEnabled
        searchTimeout={0}
        acceptCustomValue
        onCustomItemCreating={onCustomItemCreating}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
      />
    );
  }

  it('Enter on unmatched text commits via onCustomItemCreating', async () => {
    const committed: unknown[] = [];
    render(
      <Host
        onCustomItemCreating={(payload) => {
          payload.customItem = { name: payload.text, kind: 'Custom' };
        }}
        onValueChange={(value) => committed.push(value)}
      />,
    );
    fireEvent.change(combo(), { target: { value: 'Quince' } });
    fireEvent.keyDown(combo(), { key: 'Enter' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(committed).toEqual([{ name: 'Quince', kind: 'Custom' }]);
    // custom item is not in `items` — selectedItem falls back to the cache
    expect(combo().value).toBe('Quince');
  });

  it('a null customItem rejects the text', async () => {
    const committed: unknown[] = [];
    render(
      <Host
        onCustomItemCreating={(payload) => {
          payload.customItem = null;
        }}
        onValueChange={(value) => committed.push(value)}
      />,
    );
    fireEvent.change(combo(), { target: { value: 'Quince' } });
    fireEvent.keyDown(combo(), { key: 'Enter' });
    expect(committed).toEqual([]);
  });

  it('exact display match selects the existing item instead of creating one', async () => {
    const committed: unknown[] = [];
    render(<Host onValueChange={(value) => committed.push(value)} />);
    fireEvent.change(combo(), { target: { value: 'cherry' } });
    fireEvent.keyDown(combo(), { key: 'Enter' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(committed).toEqual([FRUITS[1]]); // whole item (no valueExpr)
    expect(combo().value).toBe('Cherry');
  });

  it('a promised customItem commits when it resolves', async () => {
    const committed: unknown[] = [];
    render(
      <Host
        onCustomItemCreating={(payload) => {
          payload.customItem = Promise.resolve<Fruit>({ name: payload.text });
        }}
        onValueChange={(value) => committed.push(value)}
      />,
    );
    fireEvent.change(combo(), { target: { value: 'Quince' } });
    fireEvent.keyDown(combo(), { key: 'Enter' });
    await waitFor(() => expect(committed).toEqual([{ name: 'Quince' }]));
  });

  it('commits the typed text on blur', async () => {
    const committed: unknown[] = [];
    render(<Host onValueChange={(value) => committed.push(value)} />);
    fireEvent.change(combo(), { target: { value: 'Quince' } });
    fireEvent.blur(combo());
    // no handler: the typed text itself becomes the item
    await waitFor(() => expect(committed).toEqual(['Quince']));
  });
});
