import { act, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { OgeRangeSlider } from './range-slider';

type Pair = readonly [number, number];

const thumbs = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-slider-thumb'));
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
  values: Pair[];
  commits: { value: Pair; previousValue: Pair }[];
}

function makeHost(state: HostState, initial: Pair = [20, 60], extra = {}) {
  return function Host() {
    const [value, setValue] = useState<Pair>(initial);
    return (
      <OgeRangeSlider
        value={value}
        onValueChange={(next) => {
          state.values.push(next);
          setValue(next);
        }}
        onValueCommitted={(event) => state.commits.push(event)}
        {...extra}
      />
    );
  };
}

function newState(): HostState {
  return { values: [], commits: [] };
}

function renderHost(...args: Parameters<typeof makeHost>) {
  const Host = makeHost(...args);
  return render(<Host />);
}

const current = (state: HostState, initial: Pair = [20, 60]): Pair =>
  state.values.length ? state.values[state.values.length - 1] : initial;

describe('<OgeRangeSlider>', () => {
  it('each thumb carries the APG multi-thumb aria constraint', () => {
    const { rerender } = render(<OgeRangeSlider value={[20, 60]} />);
    const [start, end] = thumbs();
    expect(start.getAttribute('aria-valuenow')).toBe('20');
    expect(start.getAttribute('aria-valuemin')).toBe('0');
    expect(start.getAttribute('aria-valuemax')).toBe('60'); // the sibling
    expect(end.getAttribute('aria-valuemin')).toBe('20'); // the sibling
    expect(end.getAttribute('aria-valuemax')).toBe('100');

    rerender(<OgeRangeSlider value={[20, 60]} minRange={10} />);
    expect(start.getAttribute('aria-valuemax')).toBe('50');
    expect(end.getAttribute('aria-valuemin')).toBe('30');
  });

  it('keyboard moves each thumb and the sibling constrains it', () => {
    const state = newState();
    renderHost(state);
    const [start, end] = thumbs();
    fireEvent.keyDown(start, { key: 'ArrowRight' });
    expect(current(state)).toEqual([21, 60]);
    fireEvent.keyDown(end, { key: 'ArrowLeft' });
    expect(current(state)).toEqual([21, 59]);
    fireEvent.keyDown(start, { key: 'End' }); // wants 100, constrained
    expect(current(state)).toEqual([59, 59]);
    fireEvent.keyDown(end, { key: 'Home' }); // wants 0, constrained
    expect(current(state)).toEqual([59, 59]);
  });

  it('minRange keeps the gap on keyboard moves', () => {
    const state = newState();
    renderHost(state, [40, 55], { minRange: 10 });
    const [start] = thumbs();
    fireEvent.keyDown(start, { key: 'PageUp' }); // wants 50, gap clamps to 45
    expect(current(state, [40, 55])).toEqual([45, 55]);
  });

  it('an unchanged pair never re-emits valueCommitted', () => {
    const state = newState();
    renderHost(state, [59, 59]);
    const [start] = thumbs();
    fireEvent.keyDown(start, { key: 'ArrowRight' }); // against the sibling
    expect(state.commits).toHaveLength(0);
  });

  it('clicking the track moves the nearest thumb', () => {
    const state = newState();
    renderHost(state);
    stubTrackRect();
    firePointerDown(track(), { clientX: 85 });
    act(() => {
      document.dispatchEvent(pointer('pointerup', { clientX: 85 }));
    });
    expect(current(state)).toEqual([20, 85]); // end was nearer

    firePointerDown(track(), { clientX: 5 });
    act(() => {
      document.dispatchEvent(pointer('pointerup', { clientX: 5 }));
    });
    expect(current(state)).toEqual([5, 85]); // start was nearer
  });

  it('Escape restores the whole pair', () => {
    const state = newState();
    renderHost(state);
    stubTrackRect();
    firePointerDown(thumbs()[1], { clientX: 60 });
    act(() => {
      document.dispatchEvent(pointer('pointermove', { clientX: 95 }));
    });
    expect(current(state)).toEqual([20, 95]);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(current(state)).toEqual([20, 60]);
  });

  it('a controlled pair clamps, snaps and sorts for rendering', () => {
    const { rerender } = render(<OgeRangeSlider value={[80, 30]} />);
    let [start, end] = thumbs();
    expect(start.getAttribute('aria-valuenow')).toBe('30'); // sorted
    expect(end.getAttribute('aria-valuenow')).toBe('80');
    rerender(<OgeRangeSlider value={[-10, 140]} />);
    [start, end] = thumbs();
    expect(start.getAttribute('aria-valuenow')).toBe('0'); // clamped
    expect(end.getAttribute('aria-valuenow')).toBe('100');
  });

  it('startName/endName render the hidden inputs for plain form posts', () => {
    render(<OgeRangeSlider value={[10, 90]} startName="from" endName="to" />);
    expect(
      (document.querySelector('input[name="from"]') as HTMLInputElement)?.value,
    ).toBe('10');
    expect(
      (document.querySelector('input[name="to"]') as HTMLInputElement)?.value,
    ).toBe('90');
  });
});
