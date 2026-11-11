import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { OgeButton } from './button';

describe('<OgeButton> variants', () => {
  it('link variant, pill shape and fluid width', () => {
    const { container } = render(
      <OgeButton text="Learn more" stylingMode="link" shape="pill" fluid />,
    );
    const host = container.firstElementChild as HTMLElement;
    expect(host.classList).toContain('oge-button-link-mode');
    expect(host.classList).toContain('oge-button-pill');
    expect(host.classList).toContain('oge-button-fluid');
  });

  it('shows the icon-font glyph and the loading text', () => {
    const { container, rerender } = render(
      <OgeButton text="Save" loadingText="Saving…" iconClass="fa fa-save" />,
    );
    const icon = container.querySelector('i.oge-button-icon-font');
    expect(icon?.className).toContain('fa-save');
    rerender(
      <OgeButton
        text="Save"
        loadingText="Saving…"
        iconClass="fa fa-save"
        loading
      />,
    );
    expect(container.querySelector('.oge-button-text')?.textContent).toBe(
      'Saving…',
    );
    expect(container.querySelector('.oge-button-sr')).toBeNull();
  });

  it('pressed is one-way: aria-pressed follows the host', () => {
    let clicks = 0;
    function Host() {
      const [bold, setBold] = useState(false);
      return (
        <>
          <OgeButton text="Bold" pressed={bold} onClick={() => clicks++} />
          <button type="button" className="ext" onClick={() => setBold(true)} />
        </>
      );
    }
    const { container } = render(<Host />);
    const native = container.querySelector(
      '.oge-button-native',
    ) as HTMLButtonElement;
    expect(native.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(native);
    expect(clicks).toBe(1);
    expect(native.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(container.querySelector('.ext') as HTMLElement);
    expect(native.getAttribute('aria-pressed')).toBe('true');
  });
});
