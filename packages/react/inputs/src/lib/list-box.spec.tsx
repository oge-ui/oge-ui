import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import { OgeListBox, type OgeListBoxHandle } from './list-box';

interface City {
  id: number;
  name: string;
  country: string;
  closed?: boolean;
}

const CITIES: City[] = [
  { id: 1, name: 'Ankara', country: 'TR' },
  { id: 2, name: 'Berlin', country: 'DE' },
  { id: 3, name: 'Bonn', country: 'DE', closed: true },
  { id: 4, name: 'İzmir', country: 'TR' },
];

const options = () => screen.getAllByRole('option');

describe('<OgeListBox>', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders a labelled APG listbox; single mode selection follows focus', () => {
    const onValueChange = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <OgeListBox
        label="Cities"
        items={CITIES}
        displayExpr="name"
        valueExpr="id"
        disabledExpr="closed"
        onValueChange={onValueChange}
        onSelectionChange={onSelectionChange}
      />,
    );
    const list = screen.getByRole('listbox', { name: 'Cities' });
    expect(list.getAttribute('aria-activedescendant')).toBeNull();
    fireEvent.focus(list);
    expect(list.getAttribute('aria-activedescendant')).toBe(options()[0].id);
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    expect(options()[3].getAttribute('aria-selected')).toBe('true');
    expect(options()[2].getAttribute('aria-disabled')).toBe('true');
    const last = onSelectionChange.mock.calls.at(-1)![0];
    expect(last.previousValue).toBe(2);
    expect(last.addedItems.map((c: City) => c.name)).toEqual(['İzmir']);
  });

  it('multiple mode: click toggles, Shift+click extends, Ctrl+A selects all', () => {
    function Host() {
      const [value, setValue] = useState<unknown>([]);
      return (
        <>
          <OgeListBox
            label="Cities"
            items={CITIES}
            displayExpr="name"
            valueExpr="id"
            disabledExpr="closed"
            selectionMode="multiple"
            showCheckBoxes
            value={value}
            onValueChange={setValue}
          />
          <output data-testid="v">{JSON.stringify(value)}</output>
        </>
      );
    }
    render(<Host />);
    const list = screen.getByRole('listbox');
    expect(list.getAttribute('aria-multiselectable')).toBe('true');
    expect(document.querySelectorAll('.oge-list-box-check').length).toBe(4);
    fireEvent.click(options()[0]);
    fireEvent.click(options()[3], { shiftKey: true });
    expect(screen.getByTestId('v').textContent).toBe('[1,2,4]');
    fireEvent.click(options()[0]);
    expect(screen.getByTestId('v').textContent).toBe('[2,4]');
    fireEvent.keyDown(list, { key: 'a', ctrlKey: true });
    expect(screen.getByTestId('v').textContent).toBe('[1,2,4]');
  });

  it('search filters, groups render as labelled role=group, renderItem applies', () => {
    render(
      <OgeListBox
        items={CITIES}
        displayExpr="name"
        valueExpr="id"
        groupBy="country"
        searchEnabled
        renderItem={(city, { selected }) => (
          <b className="custom">
            {city.name}:{String(selected)}
          </b>
        )}
        renderGroup={(label, { count }) => (
          <i className="group">
            {label} ({count})
          </i>
        )}
      />,
    );
    const list = screen.getByRole('listbox', { name: 'Options' });
    const groups = screen.getAllByRole('group');
    expect(groups.length).toBe(2);
    expect(groups[0].getAttribute('aria-labelledby')).toBe(
      groups[0].querySelector('.oge-list-box-group-header')!.id,
    );
    expect(document.querySelector('.group')!.textContent).toBe('TR (2)');
    expect(document.querySelector('.custom')!.textContent).toBe('Ankara:false');
    const search = screen.getByRole('searchbox');
    expect(search.getAttribute('aria-controls')).toBe(list.id);
    fireEvent.change(search, { target: { value: 'b' } });
    expect(options().map((o) => o.textContent)).toEqual([
      'Berlin:false',
      'Bonn:false',
    ]);
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.queryAllByRole('option').length).toBe(0);
    expect(document.querySelector('.oge-list-box-empty')).not.toBeNull();
  });

  it('read-only navigates without committing; the handle selects all', () => {
    const onValueChange = vi.fn();
    const ref = createRef<OgeListBoxHandle<City>>();
    const { rerender } = render(
      <OgeListBox
        ref={ref}
        items={CITIES}
        displayExpr="name"
        valueExpr="id"
        selectionMode="multiple"
        readonly
        onValueChange={onValueChange}
      />,
    );
    const list = screen.getByRole('listbox');
    fireEvent.focus(list);
    fireEvent.keyDown(list, { key: ' ' });
    fireEvent.click(options()[1]);
    expect(onValueChange).not.toHaveBeenCalled();
    rerender(
      <OgeListBox
        ref={ref}
        items={CITIES}
        displayExpr="name"
        valueExpr="id"
        selectionMode="multiple"
        onValueChange={onValueChange}
      />,
    );
    act(() => ref.current!.selectAll());
    expect(onValueChange).toHaveBeenLastCalledWith([1, 2, 3, 4]);
    expect(ref.current!.getVisibleItems().length).toBe(4);
  });

  it('survives StrictMode (type-ahead and selection still work)', () => {
    const onValueChange = vi.fn();
    render(
      <StrictMode>
        <OgeListBox
          items={CITIES}
          displayExpr="name"
          valueExpr="id"
          onValueChange={onValueChange}
        />
      </StrictMode>,
    );
    const list = screen.getByRole('listbox');
    fireEvent.focus(list);
    fireEvent.keyDown(list, { key: 'i' });
    expect(onValueChange).toHaveBeenLastCalledWith(4);
  });
});
