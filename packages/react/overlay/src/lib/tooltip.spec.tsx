import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { OgeTooltip } from './tooltip';

function Host({ text = 'Helpful hint', disabled = false }) {
  return (
    <OgeTooltip text={text} disabled={disabled}>
      <button type="button" aria-describedby="existing-hint">
        Trigger
      </button>
    </OgeTooltip>
  );
}

const bubble = (): HTMLElement | null =>
  document.body.querySelector('.oge-tooltip');

describe('OgeTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const flush = () => act(() => vi.advanceTimersByTime(600));

  it('shows after the hover dwell with role=tooltip and the text', () => {
    render(<Host />);
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.pointerEnter(trigger);
    expect(bubble()).toBeNull(); // not yet — dwell pending
    flush();
    const el = bubble();
    expect(el).not.toBeNull();
    expect(el?.getAttribute('role')).toBe('tooltip');
    expect(el?.textContent).toContain('Helpful hint');
  });

  it('appends its id to aria-describedby, preserving existing ids, and restores on hide', () => {
    render(<Host />);
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.pointerEnter(trigger);
    flush();
    const described = trigger.getAttribute('aria-describedby') ?? '';
    expect(described).toContain('existing-hint');
    expect(described).toContain(bubble()?.id ?? '__missing__');

    fireEvent.pointerLeave(trigger);
    flush();
    expect(bubble()).toBeNull();
    expect(trigger.getAttribute('aria-describedby')).toBe('existing-hint');
  });

  it('shows immediately on focus and hides on Escape', () => {
    render(<Host />);
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    act(() => trigger.focus());
    act(() => vi.advanceTimersByTime(50)); // < dwell
    expect(bubble()).not.toBeNull();

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(bubble()).toBeNull();
  });

  it('never shows while disabled or with empty text', () => {
    const { rerender } = render(<Host disabled />);
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.pointerEnter(trigger);
    flush();
    expect(bubble()).toBeNull();

    rerender(<Host text="   " />);
    fireEvent.pointerEnter(trigger);
    flush();
    expect(bubble()).toBeNull();
  });

  it('hides an open tooltip when it becomes disabled', () => {
    const { rerender } = render(<Host />);
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    act(() => trigger.focus());
    expect(bubble()).not.toBeNull();
    rerender(<Host disabled />);
    expect(bubble()).toBeNull();
  });

  it('works under StrictMode (destroy → remount keeps the machine usable)', () => {
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    act(() => trigger.focus());
    expect(bubble()).not.toBeNull();
    act(() => trigger.blur());
    expect(bubble()).toBeNull();
    act(() => trigger.focus());
    expect(bubble()).not.toBeNull();
  });
});
