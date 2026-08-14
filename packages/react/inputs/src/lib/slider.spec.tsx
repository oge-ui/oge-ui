import { act, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { OgeSlider } from './slider';

const thumb = (): HTMLElement =>
  document.querySelector('.oge-slider-thumb') as HTMLElement;
const track = (): HTMLElement =>
  document.querySelector('.oge-slider-track') as HTMLElement;

function pointer(
  type: string,
  init: { clientX?: number; clientY?: number } = {},
): PointerEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  }) as unknown as PointerEvent;
}

/** RTL's pointerDown carries no button/coords in jsdom — dispatch our own. */
function firePointerDown(
  el: Element,
  init: { clientX?: number; clientY?: number } = {},
): void {
  fireEvent(el, pointer('pointerdown', init));
}

/** jsdom lays nothing out — the track geometry comes from the spec. */
function stubTrackRect(): void {
  Object.defineProperty(track(), 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      right: 100,
      bottom: 28,
      width: 100,
      height: 28,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
}

interface HostState {
  values: number[];
  commits: { value: number; previousValue: number }[];
  ends: { value: number }[];
}

function makeHost(state: HostState, extra = {}) {
  return function Host() {
    const [value, setValue] = useState(20);
    return (
      <OgeSlider
        value={value}
        onValueChange={(next) => {
          state.values.push(next);
          setValue(next);
        }}
        onValueCommitted={(event) => state.commits.push(event)}
        onSlideEnded={(event) => state.ends.push(event)}
        {...extra}
      />
    );
  };
}

function newState(): HostState {
  return { values: [], commits: [], ends: [] };
}

function renderHost(...args: Parameters<typeof makeHost>) {
  const Host = makeHost(...args);
  return render(<Host />);
}

const current = (state: HostState): number =>
  state.values.length ? state.values[state.values.length - 1] : 20;

describe('<OgeSlider>', () => {
  it('keyboard steps commit immediately — the discrete-action rule', () => {
    const state = newState();
    renderHost(state);
    fireEvent.keyDown(thumb(), { key: 'ArrowRight' });
    expect(current(state)).toBe(21);
    fireEvent.keyDown(thumb(), { key: 'ArrowLeft' });
    fireEvent.keyDown(thumb(), { key: 'ArrowUp' });
    fireEvent.keyDown(thumb(), { key: 'ArrowDown' });
    expect(current(state)).toBe(20);
    expect(state.commits).toHaveLength(4); // every step committed, no debounce

    fireEvent.keyDown(thumb(), { key: 'PageUp' }); // largeStep = step × 10
    expect(current(state)).toBe(30);
    fireEvent.keyDown(thumb(), { key: 'PageDown' });
    expect(current(state)).toBe(20);
    fireEvent.keyDown(thumb(), { key: 'End' });
    expect(current(state)).toBe(100);
    fireEvent.keyDown(thumb(), { key: 'Home' });
    expect(current(state)).toBe(0);
  });

  it('an explicit largeStep drives PageUp/PageDown', () => {
    const state = newState();
    renderHost(state, { largeStep: 25 });
    fireEvent.keyDown(thumb(), { key: 'PageUp' });
    expect(current(state)).toBe(45);
  });

  it('arrow direction flips in RTL', () => {
    const state = newState();
    renderHost(state, { style: { direction: 'rtl' } });
    fireEvent.keyDown(thumb(), { key: 'ArrowRight' });
    expect(current(state)).toBe(19); // mirrored
    fireEvent.keyDown(thumb(), { key: 'ArrowLeft' });
    expect(current(state)).toBe(20);
  });

  it('dragging commits live and onSlideEnded reports the release value', () => {
    const state = newState();
    renderHost(state);
    stubTrackRect();
    firePointerDown(thumb(), { clientX: 20 });
    act(() => {
      document.dispatchEvent(pointer('pointermove', { clientX: 55 }));
    });
    expect(current(state)).toBe(55); // live commit on move
    act(() => {
      document.dispatchEvent(pointer('pointermove', { clientX: 72 }));
      document.dispatchEvent(pointer('pointerup', { clientX: 72 }));
    });
    expect(current(state)).toBe(72);
    expect(state.ends).toHaveLength(1);
    expect(state.ends[0].value).toBe(72);
  });

  it('clicking the track jumps to the position', () => {
    const state = newState();
    renderHost(state);
    stubTrackRect();
    firePointerDown(track(), { clientX: 40 });
    act(() => {
      document.dispatchEvent(pointer('pointerup', { clientX: 40 }));
    });
    expect(current(state)).toBe(40);
  });

  it('Escape cancels the drag, restores the start value and emits no onSlideEnded', () => {
    const state = newState();
    renderHost(state);
    stubTrackRect();
    firePointerDown(thumb(), { clientX: 20 });
    act(() => {
      document.dispatchEvent(pointer('pointermove', { clientX: 90 }));
    });
    expect(current(state)).toBe(90);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(current(state)).toBe(20); // restored
    expect(state.ends).toHaveLength(0);
  });

  it('debounce throttles drag commits; release flushes', () => {
    const state = newState();
    renderHost(state, { debounce: 50 });
    stubTrackRect();
    firePointerDown(thumb(), { clientX: 20 });
    act(() => {
      document.dispatchEvent(pointer('pointermove', { clientX: 60 }));
    });
    expect(state.values).toHaveLength(0); // staged, not yet committed
    act(() => {
      document.dispatchEvent(pointer('pointerup', { clientX: 60 }));
    });
    expect(current(state)).toBe(60); // release flushed the staged value
    expect(state.ends[0]?.value).toBe(60);
  });

  it('showButtons steps once and repeats while held (spin config)', () => {
    vi.useFakeTimers();
    try {
      const state = newState();
      renderHost(state, { showButtons: true });
      const buttons = document.querySelectorAll<HTMLElement>(
        '.oge-slider-step-button',
      );
      firePointerDown(buttons[1]);
      expect(current(state)).toBe(21); // immediate first step
      act(() => {
        vi.advanceTimersByTime(2000); // delay + a few repeat intervals
      });
      expect(current(state)).toBeGreaterThan(21);
      const held = current(state);
      act(() => {
        document.dispatchEvent(pointer('pointerup'));
        vi.advanceTimersByTime(1000);
      });
      expect(current(state)).toBe(held); // released — repeating stopped
    } finally {
      vi.useRealTimers();
    }
  });

  it('a controlled value clamps and snaps to the grid for rendering', () => {
    const { rerender } = render(<OgeSlider value={137} />);
    expect(thumb().getAttribute('aria-valuenow')).toBe('100');
    rerender(<OgeSlider value={23.4} step={5} />);
    expect(thumb().getAttribute('aria-valuenow')).toBe('25');
  });

  it('a name renders the hidden input for plain form posts', () => {
    render(<OgeSlider value={42} name="volume" />);
    const hidden = document.querySelector(
      'input[type="hidden"][name="volume"]',
    ) as HTMLInputElement;
    expect(hidden?.value).toBe('42');
  });

  it('disabled and readonly are inert for every interaction path', () => {
    const state = newState();
    const { unmount } = renderHost(state, { disabled: true });
    stubTrackRect();
    fireEvent.keyDown(thumb(), { key: 'ArrowRight' });
    firePointerDown(track(), { clientX: 90 });
    expect(state.values).toHaveLength(0);
    expect(thumb().getAttribute('tabindex')).toBe('-1');
    unmount();

    renderHost(state, { readonly: true });
    stubTrackRect();
    fireEvent.keyDown(thumb(), { key: 'ArrowRight' });
    firePointerDown(track(), { clientX: 90 });
    expect(state.values).toHaveLength(0);
    expect(document.querySelector('.oge-slider-readonly')).not.toBeNull();
  });

  it('ticks render on the grid with the far end always marked', () => {
    render(<OgeSlider value={50} showTicks tickStep={30} showTickLabels />);
    const ticks = Array.from(
      document.querySelectorAll<HTMLElement>('.oge-slider-tick'),
    );
    expect(ticks).toHaveLength(5); // 0, 30, 60, 90 and the far end 100
    const labels = Array.from(
      document.querySelectorAll<HTMLElement>('.oge-slider-tick-label'),
    ).map((label) => label.textContent);
    expect(labels).toEqual(['0', '30', '60', '90', '100']);
    const inRange = document.querySelectorAll('.oge-slider-tick-in-range');
    expect(inRange).toHaveLength(2); // 0 and 30
  });

  it('the value bubble follows the valueIndicator mode', () => {
    const { rerender } = render(
      <OgeSlider value={20} valueIndicator="always" />,
    );
    expect(document.querySelector('.oge-slider-bubble')?.textContent).toBe(
      '20',
    );
    rerender(<OgeSlider value={20} valueIndicator="active" />);
    expect(document.querySelector('.oge-slider-bubble')).toBeNull();
    fireEvent.focus(thumb());
    expect(document.querySelector('.oge-slider-bubble')).not.toBeNull();
  });
});
