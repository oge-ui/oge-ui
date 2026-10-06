import { StrictMode, createRef } from 'react';
import { render } from '@testing-library/react';
import { OgeSparkline, type OgeSparklineHandle } from './sparkline';
import * as entry from '../sparkline';

describe('<OgeSparkline>', () => {
  it('draws one line path with a summarizing img label', () => {
    const ref = createRef<OgeSparklineHandle>();
    const { container } = render(
      <StrictMode>
        <OgeSparkline
          ref={ref}
          dataSource={[1, 3, 2, 5]}
          title="Sales"
          locale="en-US"
        />
      </StrictMode>,
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe(
      'Sales sparkline, 4 points: first 1, last 5, low 1, high 5',
    );
    expect(container.querySelectorAll('.oge-sparkline-line')).toHaveLength(1);
    expect(ref.current?.getSvgElement()).toBe(svg);
    expect(container.firstElementChild?.className).toBe('oge-sparkline');
  });

  it('bars, winloss kinds and markers', () => {
    const { container, rerender } = render(
      <OgeSparkline
        dataSource={[3, -2]}
        type="bar"
        negativeColor="red"
        locale="en-US"
      />,
    );
    const bars =
      container.querySelectorAll<SVGRectElement>('.oge-sparkline-bar');
    expect(bars).toHaveLength(2);
    expect(bars[1].classList.contains('oge-sparkline-bar-negative')).toBe(true);
    expect(bars[1].style.fill).toBe('red');
    rerender(<OgeSparkline dataSource={[2, 9, 1]} markers locale="en-US" />);
    expect(container.querySelector('.oge-sparkline-marker-max')).not.toBeNull();
    expect(container.querySelector('.oge-sparkline-marker-min')).not.toBeNull();
  });

  it('is its own entry point', () => {
    expect(entry.OgeSparkline).toBe(OgeSparkline);
  });
});
