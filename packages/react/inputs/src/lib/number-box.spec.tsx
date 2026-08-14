import { fireEvent, render, screen } from '@testing-library/react';
import { OgeNumberBox } from './number-box';

const native = () => screen.getByRole('textbox') as HTMLInputElement;

describe('<OgeNumberBox>', () => {
  it('null is empty, typing parses and commits a number', () => {
    const onValueChange = vi.fn();
    render(<OgeNumberBox onValueChange={onValueChange} />);
    expect(native().value).toBe('');
    fireEvent.change(native(), { target: { value: '42' } });
    expect(onValueChange).toHaveBeenCalledWith(42);
  });

  it('garbage marks the field parse-invalid and never commits', () => {
    const onValueChange = vi.fn();
    render(<OgeNumberBox onValueChange={onValueChange} />);
    fireEvent.change(native(), { target: { value: 'abc' } });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(native()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter a valid number')).toBeInTheDocument();
  });

  it('unparseable text reverts to the committed value on blur', () => {
    render(<OgeNumberBox defaultValue={7} />);
    fireEvent.focus(native());
    fireEvent.change(native(), { target: { value: 'x' } });
    fireEvent.blur(native());
    expect(native().value).toBe('7');
    expect(native()).not.toHaveAttribute('aria-invalid');
  });

  it('clamps to min/max on blur, not while typing', () => {
    const onValueChange = vi.fn();
    render(<OgeNumberBox min={0} max={10} onValueChange={onValueChange} />);
    fireEvent.focus(native());
    fireEvent.change(native(), { target: { value: '250' } });
    expect(onValueChange).toHaveBeenLastCalledWith(250);
    fireEvent.blur(native());
    expect(onValueChange).toHaveBeenLastCalledWith(10);
    expect(native().value).toBe('10');
  });

  it('arrow keys step with float-error correction', () => {
    const onValueChange = vi.fn();
    render(
      <OgeNumberBox
        defaultValue={0.3}
        step={0.1}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.keyDown(native(), { key: 'ArrowUp' });
    expect(onValueChange).toHaveBeenLastCalledWith(0.4);
    fireEvent.keyDown(native(), { key: 'ArrowDown' });
    fireEvent.keyDown(native(), { key: 'ArrowDown' });
    expect(onValueChange).toHaveBeenLastCalledWith(0.2);
  });

  it('spin buttons render, step and respect the bounds', () => {
    const onValueChange = vi.fn();
    render(
      <OgeNumberBox
        defaultValue={9}
        min={0}
        max={10}
        showSpinButtons
        onValueChange={onValueChange}
      />,
    );
    const up = screen.getByRole('button', { name: 'Increase value' });
    fireEvent.pointerDown(up);
    fireEvent.pointerUp(up);
    expect(onValueChange).toHaveBeenLastCalledWith(10);
    // at the ceiling the up button disables
    expect(
      screen.getByRole('button', { name: 'Increase value' }),
    ).toBeDisabled();
  });

  it('formats the display while unfocused and shows the raw number on focus', () => {
    render(
      <OgeNumberBox
        defaultValue={1234.5}
        locale="en-US"
        format={{ style: 'currency', currency: 'EUR' }}
      />,
    );
    expect(native().value).toBe('€1,234.50');
    fireEvent.focus(native());
    expect(native().value).toBe('1234.5');
  });
});
