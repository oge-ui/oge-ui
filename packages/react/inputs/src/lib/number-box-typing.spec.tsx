import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OgeNumberBox } from './number-box';

const native = () => screen.getByRole('textbox') as HTMLInputElement;

describe('<OgeNumberBox> typing', () => {
  it('groups thousands live with the caret after the typed digit', () => {
    const onValueChange = vi.fn();
    render(
      <OgeNumberBox
        locale="en-US"
        formatWhileTyping
        onValueChange={onValueChange}
      />,
    );
    fireEvent.focus(native());
    fireEvent.change(native(), { target: { value: '1234567' } });
    expect(native().value).toBe('1,234,567');
    expect(native().selectionStart).toBe(9);
    expect(onValueChange).toHaveBeenLastCalledWith(1234567);
  });

  it('shows the grouped editable text on focus', () => {
    render(
      <OgeNumberBox locale="en-US" formatWhileTyping defaultValue={4321} />,
    );
    fireEvent.focus(native());
    expect(native().value).toBe('4,321');
  });

  it('enforces maxFractionDigits while typing', () => {
    const onValueChange = vi.fn();
    render(
      <OgeNumberBox
        locale="de-DE"
        maxFractionDigits={1}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.focus(native());
    fireEvent.change(native(), { target: { value: '3,14' } });
    expect(native().value).toBe('3,1');
    expect(onValueChange).toHaveBeenLastCalledWith(3.1);
  });

  it('steps on the wheel only while focused and opted in (StrictMode-safe listener)', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <StrictMode>
        <OgeNumberBox defaultValue={10} onValueChange={onValueChange} />
      </StrictMode>,
    );
    const wheel = (deltaY: number) => {
      const event = new WheelEvent('wheel', { deltaY, cancelable: true });
      act(() => {
        native().dispatchEvent(event);
      });
      return event;
    };
    fireEvent.focus(native());
    expect(wheel(-100).defaultPrevented).toBe(false);
    rerender(
      <StrictMode>
        <OgeNumberBox
          defaultValue={10}
          wheelStep={2}
          onValueChange={onValueChange}
        />
      </StrictMode>,
    );
    expect(wheel(-100).defaultPrevented).toBe(true);
    // one listener only, even after StrictMode's double effect
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(12);
    fireEvent.blur(native());
    expect(wheel(-100).defaultPrevented).toBe(false);
  });
});
