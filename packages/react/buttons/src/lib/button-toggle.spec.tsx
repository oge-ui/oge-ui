import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { OgeButton, type OgeButtonSelectedChangeEvent } from './button';
import { OgeButtonGroup } from './button-group';

describe('<OgeButton toggle>', () => {
  it('an uncontrolled toggle starts at defaultSelected and flips on click', () => {
    const onSelectedChange = vi.fn<(e: OgeButtonSelectedChangeEvent) => void>();
    const onClick = vi.fn();
    render(
      <OgeButton
        text="Bold"
        toggle
        onSelectedChange={onSelectedChange}
        onClick={onClick}
      />,
    );
    const button = screen.getByRole('button', { name: 'Bold' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.parentElement).toHaveClass('oge-button-toggle');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.parentElement).toHaveClass('oge-button-selected');
    expect(onSelectedChange).toHaveBeenCalledTimes(1);
    expect(onSelectedChange.mock.calls[0][0]).toMatchObject({
      selected: true,
      previousValue: false,
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('a controlled toggle follows its selected prop', () => {
    function Host() {
      const [bold, setBold] = useState(true);
      return (
        <OgeButton
          text="Bold"
          toggle
          selected={bold}
          onSelectedChange={(e) => setBold(e.selected)}
        />
      );
    }
    render(<Host />);
    const button = screen.getByRole('button', { name: 'Bold' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('a controlled toggle without a handler stays put', () => {
    render(<OgeButton text="Bold" toggle selected={false} />);
    const button = screen.getByRole('button', { name: 'Bold' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders no state without toggle', () => {
    const onSelectedChange = vi.fn();
    render(
      <OgeButton text="Save" selected onSelectedChange={onSelectedChange} />,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).not.toHaveAttribute('aria-pressed');
    fireEvent.click(button);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it('a disabled toggle does not flip', () => {
    render(<OgeButton text="Bold" toggle disabled />);
    const button = screen.getByRole('button', { name: 'Bold' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('a multiple-selection group keeps owning the state', () => {
    render(
      <OgeButtonGroup selectionMode="multiple" ariaLabel="Format">
        <OgeButton text="Italic" value="i" toggle />
      </OgeButtonGroup>,
    );
    const button = screen.getByRole('button', { name: 'Italic' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.parentElement).not.toHaveClass('oge-button-toggle');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('works under StrictMode', () => {
    render(
      <StrictMode>
        <OgeButton text="Bold" toggle defaultSelected />
      </StrictMode>,
    );
    const button = screen.getByRole('button', { name: 'Bold' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
