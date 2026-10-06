import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef } from 'react';
import { OgeTooltip, type OgeTooltipHandle } from './tooltip';

const visible = (): HTMLElement[] =>
  Array.from(document.body.querySelectorAll<HTMLElement>('.oge-tooltip'));

const flush = () => act(() => vi.advanceTimersByTime(600));

describe('OgeTooltip content, arrow and show modes', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders rich content (render prop), a max width and an arrow', () => {
    render(
      <OgeTooltip
        content={() => (
          <>
            <strong className="tip-name">Ada</strong> · Engineer
          </>
        )}
        arrow
        placement="bottom"
        maxWidth={200}
      >
        <button type="button">Rich</button>
      </OgeTooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Rich' });
    act(() => trigger.focus());
    flush();
    const [bubble] = visible();
    expect(bubble.querySelector('.tip-name')?.textContent).toBe('Ada');
    expect(bubble.style.maxWidth).toBe('200px');
    const arrow = bubble.querySelector('.oge-tooltip-arrow');
    expect(arrow?.getAttribute('aria-hidden')).toBe('true');
    expect(arrow?.getAttribute('data-side')).toBe('top');
    expect(trigger.getAttribute('aria-describedby')).toBe(bubble.id);
  });

  it('a ReactNode content works too', () => {
    render(
      <OgeTooltip content={<em className="node">Node</em>}>
        <button type="button">Node</button>
      </OgeTooltip>,
    );
    act(() => screen.getByRole('button', { name: 'Node' }).focus());
    flush();
    expect(visible()[0].querySelector('.node')).not.toBeNull();
  });

  it("'click' mode toggles on activation, not on hover or focus", () => {
    render(
      <OgeTooltip text="Copied" showMode="click">
        <button type="button">Copy</button>
      </OgeTooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Copy' });
    fireEvent.pointerEnter(trigger);
    act(() => trigger.focus());
    flush();
    expect(visible()).toHaveLength(0);
    fireEvent.click(trigger);
    flush();
    expect(visible()).toHaveLength(1);
    fireEvent.click(trigger);
    flush();
    expect(visible()).toHaveLength(0);
  });

  it("'manual' mode follows only the ref handle", () => {
    const handle = createRef<OgeTooltipHandle>();
    render(
      <StrictMode>
        <OgeTooltip text="Copied" showMode="manual" ref={handle}>
          <button type="button">Copy</button>
        </OgeTooltip>
      </StrictMode>,
    );
    const trigger = screen.getByRole('button', { name: 'Copy' });
    fireEvent.click(trigger);
    act(() => trigger.focus());
    flush();
    expect(visible()).toHaveLength(0);
    act(() => handle.current?.open());
    flush();
    expect(visible()).toHaveLength(1);
    act(() => handle.current?.toggle());
    flush();
    expect(visible()).toHaveLength(0);
  });
});
