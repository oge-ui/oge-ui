import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { OgeDateBox } from '../date-box';
import { OgeNumberBox } from '../number-box';
import { OgeSelectBox } from '../select-box';
import { OgeTextBox } from '../text-box';
import {
  getAllTextBoxes,
  getDateBox,
  getNumberBox,
  getSelectBox,
  getTextBox,
  selectOption,
} from './input-queries';

const CITIES = ['Lisbon', 'Oslo', 'Rome'];

/** Mirrors every committed value into the DOM so specs can read it back. */
function Form() {
  const [name, setName] = useState('');
  const [qty, setQty] = useState<number | null>(2);
  const [city, setCity] = useState<unknown>(null);
  const [due, setDue] = useState<Date | null>(new Date(2026, 2, 14));
  return (
    <StrictMode>
      <OgeTextBox
        label="Name"
        placeholder="Full name"
        hint="As on the badge"
        required
        value={name}
        onValueChange={setName}
      />
      <OgeTextBox label="Code" disabled value="X-1" />
      <OgeTextBox
        label="Email"
        invalid
        errorDisplay="always"
        errorText="Enter an email address"
      />
      <OgeNumberBox
        label="Qty"
        locale="en-US"
        step={1}
        value={qty}
        onValueChange={setQty}
      />
      <OgeSelectBox
        label="City"
        items={CITIES}
        value={city}
        onValueChange={setCity}
      />
      <OgeDateBox
        label="Due"
        locale="en-US"
        value={due}
        onValueChange={setDue}
      />
      <output data-testid="state">
        {JSON.stringify({
          name,
          qty,
          city,
          due: due ? due.toDateString() : null,
        })}
      </output>
    </StrictMode>
  );
}

const state = () =>
  JSON.parse(screen.getByTestId('state').textContent ?? '{}') as {
    name: string;
    qty: number | null;
    city: unknown;
    due: string | null;
  };

describe('inputs testing helpers', () => {
  describe('getTextBox', () => {
    it('filters by label, value and disabled state', () => {
      const { container } = render(<Form />);
      expect(getAllTextBoxes(container)).toHaveLength(3);
      expect(() => getTextBox(container)).toThrow(
        /expected one editor, found 3/,
      );
      const code = getTextBox(container, { value: 'X-1' });
      expect(code.getLabel()).toBe('Code');
      expect(code.isDisabled()).toBe(true);
      expect(getAllTextBoxes(container, { disabled: true })).toHaveLength(1);
    });

    it('types, commits on blur and reads the field state', async () => {
      const { container } = render(<Form />);
      const name = getTextBox(container, { label: 'Name' });
      expect(name.getPlaceholder()).toBe('Full name');
      expect(name.getHintText()).toBe('As on the badge');
      expect(name.isRequired()).toBe(true);
      expect(name.isReadonly()).toBe(false);
      name.setValue('Ada');
      await waitFor(() => expect(state().name).toBe('Ada'));
      expect(name.getValue()).toBe('Ada');
      expect(name.isFocused()).toBe(false);
    });

    it('reports the error state', () => {
      const { container } = render(<Form />);
      const email = getTextBox(container, { label: /mail/ });
      expect(email.isInvalid()).toBe(true);
      expect(email.getErrorText()).toBe('Enter an email address');
    });
  });

  it('getNumberBox reads, steps and types numbers', async () => {
    const { container } = render(<Form />);
    const qty = getNumberBox(container);
    expect(qty.getValue()).toBe('2');
    qty.increment();
    await waitFor(() => expect(state().qty).toBe(3));
    qty.decrement();
    qty.decrement();
    await waitFor(() => expect(state().qty).toBe(1));
    qty.setValue('42');
    await waitFor(() => expect(state().qty).toBe(42));
  });

  it('getSelectBox opens, lists, selects by text and closes', async () => {
    const { container } = render(<Form />);
    const city = getSelectBox(container, { label: 'City' });
    expect(city.isOpen()).toBe(false);
    expect(city.getOptions()).toEqual(CITIES);
    expect(city.isOpen()).toBe(true);
    expect(city.getOptions({ text: /o$/ })).toEqual(['Oslo']);
    city.close();
    await waitFor(() => expect(city.isOpen()).toBe(false));

    city.selectOption('Oslo');
    await waitFor(() => expect(state().city).toBe('Oslo'));
    expect(city.getValue()).toBe('Oslo');
    expect(city.getSelectedOptionText()).toBe('Oslo');
    expect(() => city.selectOption('Paris')).toThrow(
      /no option matching Paris \(options: Lisbon, Oslo, Rome\)/,
    );
  });

  it('selectOption accepts the combobox element', async () => {
    render(<Form />);
    selectOption(screen.getByRole('combobox', { name: 'City' }), 'Rome');
    await waitFor(() => expect(state().city).toBe('Rome'));
  });

  it('getDateBox types a date and picks a day from the calendar', async () => {
    const { container } = render(<Form />);
    const due = getDateBox(container, { label: 'Due' });
    expect(due.getValue()).toBe('3/14/26');
    due.setValue('4/2/2026');
    await waitFor(() =>
      expect(state().due).toBe(new Date(2026, 3, 2).toDateString()),
    );
    due.open();
    expect(due.isOpen()).toBe(true);
    expect(due.getCalendarTitle()).toBe('April 2026');
    due.nextMonth();
    expect(due.getCalendarTitle()).toBe('May 2026');
    due.selectDay(20);
    await waitFor(() =>
      expect(state().due).toBe(new Date(2026, 4, 20).toDateString()),
    );
    expect(due.isOpen()).toBe(false);
  });
});
