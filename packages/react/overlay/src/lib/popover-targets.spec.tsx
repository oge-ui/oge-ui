import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { OgePopover, type OgePopoverHandle } from './popover';

const panel = (): HTMLElement | null =>
  document.body.querySelector('.oge-popover');
const flush = (ms = 20) => act(() => vi.advanceTimersByTime(ms));

function Host({
  closeOnFocusOut,
  padding,
  onClosed,
}: {
  closeOnFocusOut?: boolean;
  padding?: 'none' | 'sm' | 'md';
  onClosed?: (reason: string) => void;
}) {
  const ref = useRef<OgePopoverHandle>(null);
  const [mounted, setMounted] = useState(0);
  return (
    <>
      <button type="button" onClick={(e) => ref.current?.toggle(e)}>
        <span data-testid="icon">▾</span> Name
      </button>
      <button type="button" onClick={(e) => ref.current?.show(e)}>
        City
      </button>
      <button type="button">Away</button>
      <span data-testid="mounted">{mounted}</span>
      <OgePopover
        ref={ref}
        title="Column"
        closeOnFocusOut={closeOnFocusOut}
        padding={padding}
        onOpened={() => setMounted((n) => n + 1)}
        onClosed={(e) => onClosed?.(e.reason)}
      >
        {({ close }) => (
          <button type="button" onClick={close}>
            Done
          </button>
        )}
      </OgePopover>
    </>
  );
}

const button = (name: string) => screen.getByRole('button', { name });

describe('OgePopover targets, focus-out and padding', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('anchors toggle(event) to the currentTarget and closes on the same target', () => {
    render(<Host />);
    fireEvent.click(screen.getByTestId('icon'));
    flush();
    expect(panel()).not.toBeNull();
    fireEvent.click(button('▾ Name'));
    flush();
    expect(panel()).toBeNull();
  });

  it('moves an open popover to another target instead of closing it', () => {
    const reasons: string[] = [];
    render(<Host onClosed={(r) => reasons.push(r)} />);
    fireEvent.click(button('▾ Name'));
    flush();
    fireEvent.click(button('City'));
    flush();
    expect(panel()).not.toBeNull();
    expect(reasons).toEqual([]);
    fireEvent.click(button('▾ Name'));
    flush();
    expect(panel()).not.toBeNull();
    fireEvent.click(button('▾ Name'));
    flush();
    expect(panel()).toBeNull();
  });

  it('returns focus to the target it was shown for', () => {
    render(<Host />);
    const city = button('City');
    city.focus();
    fireEvent.click(city);
    flush();
    const done = screen.getByRole('button', { name: 'Done' });
    done.focus();
    fireEvent.click(done);
    flush();
    expect(document.activeElement).toBe(city);
  });

  it('closes on focus-out by default and stays open with closeOnFocusOut=false', () => {
    const { rerender } = render(<Host />);
    fireEvent.click(button('▾ Name'));
    flush();
    fireEvent.blur(panel() as HTMLElement, { relatedTarget: button('Away') });
    flush();
    expect(panel()).toBeNull();
    rerender(<Host closeOnFocusOut={false} />);
    fireEvent.click(button('▾ Name'));
    flush();
    fireEvent.blur(panel() as HTMLElement, { relatedTarget: button('Away') });
    flush();
    expect(panel()).not.toBeNull();
  });

  it('maps padding to a panel class', () => {
    render(<Host padding="none" />);
    fireEvent.click(button('▾ Name'));
    flush();
    expect(panel()).toHaveClass('oge-popover-padding-none');
  });
});
