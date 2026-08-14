import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef } from 'react';
import { OgeTextBox, type OgeTextBoxHandle } from './text-box';
import { OgeInputsConfigProvider } from './inputs-config';

const native = () => screen.getByRole('textbox') as HTMLInputElement;

describe('<OgeTextBox>', () => {
  it('renders the field chrome with the house classes and label wiring', () => {
    render(<OgeTextBox label="E-mail" hint="Work address" required />);
    const input = native();
    const host = input.closest('.oge-input');
    expect(host).toHaveClass('oge-text-box');
    expect(host).toHaveClass('oge-input-empty');
    const label = screen.getByText('E-mail');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('for', input.id);
    expect(input).toHaveAccessibleName(/E-mail/);
    expect(screen.getByText('Work address')).toHaveClass('oge-input-hint');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('uncontrolled: typing commits and reports through the callbacks', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    render(
      <OgeTextBox
        defaultValue="a"
        onValueChange={onValueChange}
        onValueCommitted={onValueCommitted}
      />,
    );
    fireEvent.change(native(), { target: { value: 'ab' } });
    expect(onValueChange).toHaveBeenCalledWith('ab');
    expect(onValueCommitted).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'ab', previousValue: 'a' }),
    );
  });

  it('controlled: the value prop drives the input', () => {
    const { rerender } = render(<OgeTextBox value="one" />);
    expect(native().value).toBe('one');
    rerender(<OgeTextBox value="two" />);
    expect(native().value).toBe('two');
  });

  it('debounce stages the commit; blur flushes it synchronously', () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    render(<OgeTextBox debounce={300} onValueChange={onValueChange} />);
    fireEvent.change(native(), { target: { value: 'staged' } });
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.blur(native());
    expect(onValueChange).toHaveBeenCalledWith('staged');
    vi.useRealTimers();
  });

  it('Enter flushes a staged debounce and fires onEnterKey', () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    const onEnterKey = vi.fn();
    render(
      <OgeTextBox
        debounce={300}
        onValueChange={onValueChange}
        onEnterKey={onEnterKey}
      />,
    );
    fireEvent.change(native(), { target: { value: 'go' } });
    fireEvent.keyDown(native(), { key: 'Enter' });
    expect(onValueChange).toHaveBeenCalledWith('go');
    expect(onEnterKey).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('the clear button empties the value and refocuses the field', () => {
    const onCleared = vi.fn();
    render(
      <OgeTextBox defaultValue="text" showClearButton onCleared={onCleared} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(native().value).toBe('');
    expect(onCleared).toHaveBeenCalled();
    expect(native()).toHaveFocus();
  });

  it('errors resolve through the shared catalog and honor errorDisplay', () => {
    render(
      <OgeTextBox errors={[{ kind: 'required' }]} errorDisplay="touched" />,
    );
    // untouched: invalid but not shown yet
    expect(native()).not.toHaveAttribute('aria-invalid');
    fireEvent.blur(native());
    expect(native()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('This field is required')).toHaveClass(
      'oge-input-error',
    );
    expect(native()).toHaveAccessibleDescription('This field is required');
  });

  it('the grapheme counter counts user-perceived characters', () => {
    render(<OgeTextBox defaultValue="👨‍👩‍👧" showCounter maxLength={5} />);
    expect(screen.getByText('1/5')).toBeInTheDocument();
  });

  it('password mode reveals in place through the rail toggle', () => {
    render(<OgeTextBox mode="password" defaultValue="secret" label="PW" />);
    const input = document.querySelector(
      '.oge-input-native',
    ) as HTMLInputElement;
    expect(input.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');
  });

  it('per-instance and provider messages localize the chrome', () => {
    render(
      <OgeInputsConfigProvider
        config={{ messages: { clearButton: 'Temizle' } }}
      >
        <OgeTextBox defaultValue="x" showClearButton />
      </OgeInputsConfigProvider>,
    );
    expect(screen.getByRole('button', { name: 'Temizle' })).toBeVisible();
  });

  it('exposes focus/blur/clear on the imperative handle', () => {
    const ref = createRef<OgeTextBoxHandle>();
    render(<OgeTextBox ref={ref} defaultValue="x" />);
    act(() => ref.current!.focus());
    expect(native()).toHaveFocus();
    act(() => ref.current!.clear());
    expect(native().value).toBe('');
  });

  it('still commits after a StrictMode remount cycle', () => {
    const onValueChange = vi.fn();
    render(
      <StrictMode>
        <OgeTextBox onValueChange={onValueChange} />
      </StrictMode>,
    );
    fireEvent.change(native(), { target: { value: 'strict' } });
    expect(onValueChange).toHaveBeenCalledWith('strict');
  });
});
