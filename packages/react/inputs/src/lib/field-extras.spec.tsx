import { fireEvent, render, screen } from '@testing-library/react';
import { OgeAutocomplete } from './autocomplete';
import { OgeColorBox } from './color-box';
import { OgeDateBox } from './date-box';
import { OgeNumberBox } from './number-box';
import { OgeSelectBox } from './select-box';
import { OgeTagBox } from './tag-box';
import { OgeTextArea } from './text-area';
import { OgeTextBox } from './text-box';
import { successIconVisible } from './field-extras';

/**
 * The three members every Angular `OgeInputBase` subclass inherits —
 * `showSuccessIcon`, `selectOnFocus` and `inputAttr`. They used to exist on
 * the React `<OgeTextBox>` alone; this suite is the guard that every field
 * editor keeps accepting them (docs/REACT-PARITY.md: no family ships trimmed).
 */

/** Each field editor, rendered with the three extras applied. */
const EDITORS: readonly (readonly [string, () => void])[] = [
  ['OgeTextBox', () => render(<OgeTextBox {...common()} />)],
  ['OgeTextArea', () => render(<OgeTextArea {...common()} />)],
  ['OgeNumberBox', () => render(<OgeNumberBox {...common()} />)],
  ['OgeSelectBox', () => render(<OgeSelectBox {...common()} />)],
  ['OgeTagBox', () => render(<OgeTagBox {...common()} />)],
  ['OgeAutocomplete', () => render(<OgeAutocomplete {...common()} />)],
  ['OgeDateBox', () => render(<OgeDateBox {...common()} />)],
  ['OgeColorBox', () => render(<OgeColorBox {...common()} />)],
];

const common = () => ({
  label: 'Field',
  selectOnFocus: true,
  inputAttr: { 'data-testid': 'native', autocorrect: 'off' },
});

const native = () => screen.getByTestId('native') as HTMLInputElement;

describe('field extras (the OgeInputBase members)', () => {
  for (const [name, mount] of EDITORS) {
    it(`${name} renders inputAttr onto the native element`, () => {
      mount();
      expect(native()).toHaveAttribute('autocorrect', 'off');
    });
  }

  it('selectOnFocus selects the whole text on focus', () => {
    render(
      <OgeTextBox
        label="Key"
        defaultValue="abc123"
        selectOnFocus
        inputAttr={{ 'data-testid': 'native' }}
      />,
    );
    const el = native();
    fireEvent.focus(el);
    expect(el.selectionStart).toBe(0);
    expect(el.selectionEnd).toBe('abc123'.length);
  });

  it('inputAttr may not override an attribute the component owns', () => {
    render(
      <OgeTextBox
        label="Key"
        defaultValue="abc"
        inputAttr={{ 'data-testid': 'native', value: 'hijacked', type: 'url' }}
      />,
    );
    expect(native().value).toBe('abc');
    expect(native().type).toBe('text');
  });

  it('showSuccessIcon renders the chrome icon per the shared rule', () => {
    // 'always' shows as soon as the field is valid and non-empty
    const { unmount } = render(
      <OgeTextBox label="Name" defaultValue="Ada" showSuccessIcon="always" />,
    );
    expect(document.querySelector('.oge-input-success')).not.toBeNull();
    unmount();

    // …but never while invalid
    render(
      <OgeTextBox
        label="Name"
        defaultValue="Ada"
        showSuccessIcon="always"
        invalid
        errorDisplay="always"
      />,
    );
    expect(document.querySelector('.oge-input-success')).toBeNull();
  });

  it('the visibility rule itself: pending, invalid and empty all win', () => {
    const base = {
      pending: false,
      invalid: false,
      empty: false,
      touched: false,
    };
    expect(successIconVisible('always', base)).toBe(true);
    expect(successIconVisible('touched', base)).toBe(false);
    expect(successIconVisible('touched', { ...base, touched: true })).toBe(
      true,
    );
    expect(successIconVisible('always', { ...base, pending: true })).toBe(
      false,
    );
    expect(successIconVisible('always', { ...base, invalid: true })).toBe(
      false,
    );
    expect(successIconVisible('always', { ...base, empty: true })).toBe(false);
    expect(successIconVisible(false, { ...base, touched: true })).toBe(false);
  });
});
