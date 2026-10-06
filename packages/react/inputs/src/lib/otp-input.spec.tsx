import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef, useState, act } from 'react';
import {
  OgeOtpInput,
  type OgeOtpInputHandle,
  type OgeOtpInputProps,
} from './otp-input';

function Host(props: Partial<OgeOtpInputProps> & { initial?: string }) {
  const { initial = '', ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <>
      <OgeOtpInput
        label="Code"
        locale="en-US"
        value={value}
        onValueChange={setValue}
        {...rest}
      />
      <output data-testid="value">{value}</output>
    </>
  );
}

const shown = () => screen.getByTestId('value').textContent;
const cells = () =>
  Array.from(
    document.querySelectorAll<HTMLInputElement>('.oge-otp-input-cell'),
  );
const caretCell = () => cells().find((cell) => cell.tabIndex === 0)!;

function type(cell: HTMLInputElement, text: string) {
  fireEvent.input(cell, { target: { value: text } });
}

function paste(cell: HTMLInputElement, text: string) {
  fireEvent.paste(cell, { clipboardData: { getData: () => text } });
}

describe('<OgeOtpInput>', () => {
  it('renders a labelled group of named cells with one Tab stop', () => {
    render(<Host />);
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute(
      'aria-labelledby',
      document.querySelector('.oge-otp-input-label')!.id,
    );
    expect(cells()).toHaveLength(6);
    expect(cells()[0]).toHaveAttribute('autocomplete', 'one-time-code');
    expect(cells()[1]).toHaveAttribute('autocomplete', 'off');
    expect(cells()[2]).toHaveAttribute('aria-label', 'Character 3 of 6');
    expect(cells().map((cell) => cell.tabIndex)).toEqual([
      0, -1, -1, -1, -1, -1,
    ]);
  });

  it('types, advances and completes once', () => {
    const onCompleted = vi.fn();
    render(<Host length={4} onCompleted={onCompleted} />);
    for (const digit of ['1', '2', '3', '4']) type(caretCell(), digit);
    expect(shown()).toBe('1234');
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(onCompleted.mock.calls[0][0].value).toBe('1234');
    expect(document.querySelector('.oge-otp-input')).toHaveClass(
      'oge-otp-input-complete',
    );
  });

  it('rejects characters the type does not accept', () => {
    render(<Host />);
    type(cells()[0], 'x');
    expect(shown()).toBe('');
    expect(cells()[0].value).toBe('');
  });

  it('distributes a paste and an autofill', () => {
    render(<Host />);
    paste(cells()[0], '12 34 56');
    expect(shown()).toBe('123456');
    expect(
      cells()
        .map((cell) => cell.value)
        .join(''),
    ).toBe('123456');
    type(cells()[0], '654321');
    expect(shown()).toBe('654321');
  });

  it('moves back on Backspace and navigates with RTL-mirrored arrows', () => {
    render(
      <div dir="rtl">
        <Host initial="123" />
      </div>,
    );
    const start = cells()[3];
    expect(start.tabIndex).toBe(0);
    start.focus();
    fireEvent.keyDown(start, { key: 'Backspace' });
    expect(shown()).toBe('12');
    expect(document.activeElement).toBe(cells()[2]);
    fireEvent.keyDown(cells()[2], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cells()[1]);
    fireEvent.keyDown(cells()[1], { key: 'Delete' });
    expect(shown()).toBe('1');
  });

  it('masks, uppercases and groups', () => {
    render(
      <Host masked type="alphanumeric" letterCase="upper" groupSize={3} />,
    );
    expect(cells()[0]).toHaveAttribute('type', 'password');
    expect(cells()[0]).toHaveAttribute('inputmode', 'text');
    expect(document.querySelectorAll('.oge-otp-input-separator')).toHaveLength(
      1,
    );
    type(cells()[0], 'a');
    expect(shown()).toBe('A');
  });

  it('stays unchanged while read-only', () => {
    render(<Host initial="12" readonly />);
    type(cells()[2], '3');
    fireEvent.keyDown(cells()[2], { key: 'Backspace' });
    paste(cells()[0], '999999');
    expect(shown()).toBe('12');
  });

  it('clears through the handle and survives StrictMode', () => {
    const ref = createRef<OgeOtpInputHandle>();
    const onValueChange = vi.fn();
    render(
      <StrictMode>
        <OgeOtpInput
          ref={ref}
          defaultValue="1234"
          length={4}
          onValueChange={onValueChange}
        />
      </StrictMode>,
    );
    expect(screen.getByRole('group')).toHaveAttribute(
      'aria-label',
      'Verification code',
    );
    act(() => ref.current!.clear());
    expect(onValueChange).toHaveBeenCalledWith('');
    paste(cells()[0], '42');
    expect(onValueChange).toHaveBeenLastCalledWith('42');
  });
});
