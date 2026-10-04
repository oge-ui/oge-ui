import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import { OgeTextBox, type OgeTextBoxHandle } from './text-box';
import {
  OgeMaskedTextBox,
  type OgeMaskedTextBoxHandle,
} from './masked-text-box';

const native = () => screen.getByRole('textbox') as HTMLInputElement;

/** A real browser's keystrokes: cancelable beforeinput events. */
function type(input: HTMLInputElement, text: string): void {
  for (const char of Array.from(text)) {
    act(() => {
      input.dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: char,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  }
}

function press(input: HTMLInputElement, inputType: string): boolean {
  let notCancelled = true;
  act(() => {
    notCancelled = input.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  return notCancelled;
}

describe('<OgeTextBox mask>', () => {
  it('renders the mask with placeholders and a numeric keyboard hint', () => {
    render(<OgeTextBox label="Phone" mask="(000) 000-0000" />);
    expect(native().value).toBe('(___) ___-____');
    expect(native()).toHaveAttribute('inputmode', 'numeric');
  });

  it('types through literals and commits the raw value (StrictMode)', () => {
    const onValueChange = vi.fn();
    render(
      <StrictMode>
        <OgeTextBox
          label="Phone"
          mask="(000) 000-0000"
          onValueChange={onValueChange}
        />
      </StrictMode>,
    );
    const input = native();
    input.setSelectionRange(0, 0);
    type(input, '555123');
    expect(input.value).toBe('(555) 123-____');
    expect(onValueChange).toHaveBeenLastCalledWith('555123');
    expect(input.selectionStart).toBe(10);
  });

  it('commits the formatted value with includeLiterals', () => {
    const onValueChange = vi.fn();
    render(
      <OgeTextBox
        mask="(000) 000-0000"
        includeLiterals
        onValueChange={onValueChange}
      />,
    );
    type(native(), '5551');
    expect(onValueChange).toHaveBeenLastCalledWith('(555) 1');
  });

  it('backspace empties the previous slot across literals', () => {
    function Host() {
      const [value, setValue] = useState('5551');
      return (
        <OgeTextBox
          mask="(000) 000-0000"
          value={value}
          onValueChange={setValue}
        />
      );
    }
    render(<Host />);
    const input = native();
    expect(input.value).toBe('(555) 1__-____');
    input.setSelectionRange(7, 7);
    expect(press(input, 'deleteContentBackward')).toBe(false);
    input.setSelectionRange(6, 6);
    press(input, 'deleteContentBackward');
    expect(input.value).toBe('(55_) ___-____');
  });

  it('pastes formatted text and reports completion once', () => {
    const onMaskCompleted = vi.fn();
    render(
      <OgeTextBox mask="(000) 000-0000" onMaskCompleted={onMaskCompleted} />,
    );
    const input = native();
    input.setSelectionRange(0, 0);
    act(() => {
      input.dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'insertFromPaste',
          data: '(555) 123-4567',
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(input.value).toBe('(555) 123-4567');
    expect(onMaskCompleted).toHaveBeenCalledTimes(1);
    expect(onMaskCompleted).toHaveBeenCalledWith({
      value: '5551234567',
      rawValue: '5551234567',
      maskedValue: '(555) 123-4567',
    });
  });

  it('applies IME composition once at compositionend', () => {
    const onValueChange = vi.fn();
    render(<OgeTextBox mask="LLL" onValueChange={onValueChange} />);
    const input = native();
    input.setSelectionRange(0, 0);
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'か__' } });
    expect(input.value).toBe('か__');
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input, { data: 'かな' });
    expect(input.value).toBe('かな_');
    expect(onValueChange).toHaveBeenLastCalledWith('かな');
  });

  it('reconciles input no beforeinput announced (autofill)', () => {
    const onValueChange = vi.fn();
    render(<OgeTextBox mask="(000) 000-0000" onValueChange={onValueChange} />);
    fireEvent.change(native(), { target: { value: '555 123 4567' } });
    expect(native().value).toBe('(555) 123-4567');
    expect(onValueChange).toHaveBeenLastCalledWith('5551234567');
  });

  it('re-fills from a controlled value write', () => {
    const { rerender } = render(<OgeTextBox mask="00-00" value="12" />);
    expect(native().value).toBe('12-__');
    rerender(<OgeTextBox mask="00-00" value="9876" />);
    expect(native().value).toBe('98-76');
  });

  it('flags an incomplete mask with the mask message', () => {
    const { rerender } = render(
      <OgeTextBox mask="0000" defaultValue="12" errorDisplay="always" />,
    );
    expect(
      screen.getByText('Complete the value in the required format'),
    ).toBeTruthy();
    rerender(
      <OgeTextBox
        mask="0000"
        defaultValue="12"
        errorDisplay="always"
        maskInvalidMessage="Enter four digits"
      />,
    );
    expect(screen.getByText('Enter four digits')).toBeTruthy();
  });

  it('maskValidation={false} leaves completeness to the app', () => {
    render(
      <OgeTextBox
        mask="0000"
        defaultValue="12"
        errorDisplay="always"
        maskValidation={false}
      />,
    );
    expect(
      screen.queryByText('Complete the value in the required format'),
    ).toBeNull();
  });

  it("hides the empty mask while blurred with showMaskMode 'onFocus'", () => {
    render(<OgeTextBox mask="00-00" showMaskMode="onFocus" />);
    expect(native().value).toBe('');
    fireEvent.focus(native());
    expect(native().value).toBe('__-__');
  });

  it('exposes isMaskComplete on the handle', () => {
    const ref = createRef<OgeTextBoxHandle>();
    render(<OgeTextBox ref={ref} mask="00" defaultValue="1" />);
    expect(ref.current?.isMaskComplete()).toBe(false);
    type(native(), '2');
    expect(ref.current?.isMaskComplete()).toBe(true);
  });

  it('is a plain text box without a mask', () => {
    render(<OgeTextBox />);
    expect(press(native(), 'insertText')).toBe(true);
  });
});

describe('<OgeMaskedTextBox>', () => {
  it('renders the mask-first defaults', () => {
    render(<OgeMaskedTextBox label="Plate" mask="00 LLL 000" />);
    const input = native();
    expect(input.closest('.oge-input')).toHaveClass('oge-masked-text-box');
    expect(input.value).toBe('__ ___ ___');
    expect(input).toHaveAttribute('spellcheck', 'false');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).not.toHaveAttribute('inputmode');
  });

  it('exposes the raw and masked readers on the handle', () => {
    const ref = createRef<OgeMaskedTextBoxHandle>();
    render(
      <StrictMode>
        <OgeMaskedTextBox ref={ref} label="Plate" mask="00 LLL 000" />
      </StrictMode>,
    );
    const input = native();
    input.setSelectionRange(0, 0);
    type(input, '34abc');
    expect(ref.current?.rawValue()).toBe('34abc');
    expect(ref.current?.maskedValue()).toBe('34 abc');
    expect(ref.current?.isMaskComplete()).toBe(false);
  });
});
