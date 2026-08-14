import { fireEvent, render, screen } from '@testing-library/react';
import { OgeTextArea, measureTextAreaHeight } from './text-area';

const native = () => screen.getByRole('textbox') as HTMLTextAreaElement;

describe('<OgeTextArea>', () => {
  it('renders a textarea with the house classes and rows', () => {
    render(<OgeTextArea label="Notes" rows={5} />);
    expect(native().tagName).toBe('TEXTAREA');
    expect(native()).toHaveAttribute('rows', '5');
    expect(native().closest('.oge-input')).toHaveClass('oge-text-area');
  });

  it('minRows wins over rows and autoResize stamps the host class', () => {
    render(<OgeTextArea rows={3} minRows={6} autoResize />);
    expect(native()).toHaveAttribute('rows', '6');
    expect(native().closest('.oge-input')).toHaveClass('oge-text-area-auto');
  });

  it('typing commits through the shared pipeline', () => {
    const onValueChange = vi.fn();
    render(<OgeTextArea onValueChange={onValueChange} />);
    fireEvent.change(native(), { target: { value: 'line' } });
    expect(onValueChange).toHaveBeenCalledWith('line');
  });

  it('the grapheme counter renders in the subscript', () => {
    render(<OgeTextArea defaultValue="hey" showCounter maxLength={10} />);
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });
});

describe('measureTextAreaHeight', () => {
  it('clamps between the row floor and the row ceiling', () => {
    const el = document.createElement('textarea');
    el.style.lineHeight = '20px';
    el.style.padding = '0';
    document.body.appendChild(el);
    Object.defineProperty(el, 'scrollHeight', { value: 500 });
    expect(measureTextAreaHeight(el, 2, 10)).toBe(200);
    expect(measureTextAreaHeight(el, 30, undefined)).toBe(600);
    el.remove();
  });
});
