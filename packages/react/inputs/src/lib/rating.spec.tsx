import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import { OgeInputsConfigProvider } from './inputs-config';
import { OgeRating, type OgeRatingHandle, type OgeRatingProps } from './rating';

function Host(props: Partial<OgeRatingProps> & { initial?: number | null }) {
  const { initial = 3, ...rest } = props;
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <OgeRating
        label="Quality"
        locale="en-US"
        value={value}
        onValueChange={setValue}
        {...rest}
      />
      <output data-testid="value">{String(value)}</output>
    </>
  );
}

const shown = () => screen.getByTestId('value').textContent;
const items = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-rating-item'));
const fills = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('.oge-rating-fill'),
    (el) => el.style.width,
  );

/** A click (or pointermove) at `ratio` across item `index` (24px items). */
function at(item: HTMLElement, ratio: number, type: 'click' | 'pointerMove') {
  const index = Number(item.dataset['index']);
  item.getBoundingClientRect = () =>
    ({ left: index * 24, width: 24, top: 0, height: 24 }) as DOMRect;
  const init = { clientX: index * 24 + ratio * 24 };
  if (type === 'click') fireEvent.click(item, init);
  else {
    const event = new MouseEvent('pointermove', { ...init, bubbles: true });
    Object.defineProperty(event, 'pointerType', { value: 'mouse' });
    act(() => {
      item.dispatchEvent(event);
    });
  }
}

describe('<OgeRating>', () => {
  it('renders an APG slider with the spoken value', () => {
    render(<Host />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-label', 'Quality');
    expect(slider).toHaveAttribute('aria-valuenow', '3');
    expect(slider).toHaveAttribute('aria-valuemax', '5');
    expect(slider).toHaveAttribute('aria-valuetext', '3 of 5');
    expect(fills()).toEqual(['100%', '100%', '100%', '0%', '0%']);
  });

  it('commits on click and clears on a re-click', () => {
    render(<Host />);
    at(items()[4], 0.5, 'click');
    expect(shown()).toBe('5');
    at(items()[4], 0.5, 'click');
    expect(shown()).toBe('null');
    expect(screen.getByRole('slider')).toHaveAttribute(
      'aria-valuetext',
      'Not rated',
    );
  });

  it('picks half values and previews the hover', () => {
    const onHoverChange = vi.fn();
    render(<Host precision={0.5} onHoverChange={onHoverChange} />);
    at(items()[1], 0.3, 'pointerMove');
    expect(fills()).toEqual(['100%', '50%', '0%', '0%', '0%']);
    expect(document.querySelector('.oge-rating')).toHaveClass(
      'oge-rating-hovering',
    );
    fireEvent.pointerLeave(screen.getByRole('slider'));
    expect(fills()[2]).toBe('100%');
    expect(onHoverChange.mock.calls.map(([e]) => e.value)).toEqual([1.5, null]);
    at(items()[1], 0.3, 'click');
    expect(shown()).toBe('1.5');
  });

  it('runs the slider keyboard map, RTL-mirrored', () => {
    render(
      <div dir="rtl">
        <Host />
      </div>,
    );
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(shown()).toBe('4');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(shown()).toBe('null');
    fireEvent.keyDown(slider, { key: '3' });
    expect(shown()).toBe('3');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(shown()).toBe('5');
  });

  it('keeps the value read-only and leaves the Tab sequence when disabled', () => {
    const { rerender } = render(<Host readonly />);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    at(items()[4], 0.5, 'click');
    expect(shown()).toBe('3');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-readonly', 'true');
    rerender(<Host disabled />);
    expect(screen.getByRole('slider')).toHaveAttribute('tabindex', '-1');
  });

  it('renders a radio group with a roving tab stop', () => {
    render(<Host semantics="radiogroup" />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, -1, 0, -1, -1]);
    expect(radios[2]).toHaveAttribute('aria-checked', 'true');
    expect(radios[0]).toHaveAttribute('aria-label', '1 of 5');
    fireEvent.keyDown(radios[2], { key: 'ArrowRight' });
    expect(shown()).toBe('4');
    fireEvent.click(radios[0]);
    expect(shown()).toBe('1');
  });

  it('renders a custom glyph in both layers and reads the config messages', () => {
    render(
      <OgeInputsConfigProvider config={{ messages: { ratingLabel: 'Puan' } }}>
        <OgeRating
          defaultValue={2}
          renderItem={(state, { filled }) => (
            <span className="custom" data-filled={String(filled)}>
              {state.index}
            </span>
          )}
        />
      </OgeInputsConfigProvider>,
    );
    expect(document.querySelectorAll('.custom')).toHaveLength(10);
    expect(document.querySelector('.oge-rating-svg')).toBeNull();
    expect(screen.getByRole('slider')).toHaveAttribute('aria-label', 'Puan');
  });

  it('clears through the handle and survives StrictMode', () => {
    const ref = createRef<OgeRatingHandle>();
    const onValueChange = vi.fn();
    render(
      <StrictMode>
        <OgeRating ref={ref} defaultValue={4} onValueChange={onValueChange} />
      </StrictMode>,
    );
    act(() => ref.current!.clear());
    expect(onValueChange).toHaveBeenCalledWith(null);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });
});
