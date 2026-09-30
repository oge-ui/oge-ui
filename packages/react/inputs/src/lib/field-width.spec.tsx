import { fireEvent, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { OgeAutocomplete } from './autocomplete';
import { OgeColorBox } from './color-box';
import { OgeDateBox } from './date-box';
import { OgeDateRangeBox } from './date-range-box';
import { OgeInputsConfigProvider } from './inputs-config';
import { OgeNumberBox } from './number-box';
import { OgeSelectBox } from './select-box';
import { OgeTagBox } from './tag-box';
import { OgeTextArea } from './text-area';
import { OgeTextBox } from './text-box';
import { OgeTreeSelect } from './tree-select';

/** Every field editor — the React face of Angular's `OgeInputBase` subclasses. */
const FIELDS: [string, ComponentType<Record<string, unknown>>][] = [
  ['text box', OgeTextBox as never],
  ['text area', OgeTextArea as never],
  ['number box', OgeNumberBox as never],
  ['select box', OgeSelectBox as never],
  ['tag box', OgeTagBox as never],
  ['autocomplete', OgeAutocomplete as never],
  ['date box', OgeDateBox as never],
  ['date range box', OgeDateRangeBox as never],
  ['color box', OgeColorBox as never],
  ['tree select', OgeTreeSelect as never],
];

const host = (container: HTMLElement) =>
  container.querySelector('.oge-input') as HTMLElement;

describe('field `width`', () => {
  it.each(FIELDS)('%s: a number sets --oge-input-width in px', (_, Field) => {
    const { container } = render(<Field label="Field" width={180} />);
    expect(host(container).style.getPropertyValue('--oge-input-width')).toBe(
      '180px',
    );
  });

  it('a string is used verbatim and merges with style', () => {
    const { container } = render(
      <OgeTextBox label="Field" width="12rem" style={{ marginTop: '4px' }} />,
    );
    expect(host(container).style.getPropertyValue('--oge-input-width')).toBe(
      '12rem',
    );
    expect(host(container).style.marginTop).toBe('4px');
  });

  it('unset leaves the host style alone', () => {
    const { container } = render(<OgeTextBox label="Field" />);
    expect(host(container).style.getPropertyValue('--oge-input-width')).toBe(
      '',
    );
  });
});

describe('number box locale', () => {
  const native = (container: HTMLElement) =>
    container.querySelector('input') as HTMLInputElement;

  it('falls back to the inputs config locale when no prop is set', () => {
    const { container } = render(
      <OgeInputsConfigProvider config={{ locale: 'de-DE' }}>
        <OgeNumberBox label="Amount" defaultValue={1250.5} />
      </OgeInputsConfigProvider>,
    );
    expect(native(container).value).toBe('1250,5');
  });

  it('the prop wins over the config', () => {
    const { container } = render(
      <OgeInputsConfigProvider config={{ locale: 'de-DE' }}>
        <OgeNumberBox label="Amount" locale="en-US" defaultValue={1250.5} />
      </OgeInputsConfigProvider>,
    );
    expect(native(container).value).toBe('1250.5');
  });

  it('parses typed text with the config locale', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <OgeInputsConfigProvider config={{ locale: 'de-DE' }}>
        <OgeNumberBox label="Amount" onValueChange={onValueChange} />
      </OgeInputsConfigProvider>,
    );
    const input = native(container);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1.250,5' } });
    fireEvent.blur(input);
    expect(onValueChange).toHaveBeenLastCalledWith(1250.5);
  });
});
