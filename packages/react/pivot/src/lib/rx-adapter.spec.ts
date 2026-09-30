import { createPivotRxAdapter } from './rx-adapter';

describe('createPivotRxAdapter', () => {
  it('recomputes a derived value only when a cell it read changed', () => {
    const bump = vi.fn();
    const rx = createPivotRxAdapter(bump);
    const rows = rx.input([1, 2, 3]);
    const scroll = rx.cell(0);
    const compute = vi.fn(() => rows().reduce((a, b) => a + b, 0));
    const total = rx.derived(compute);
    const window = rx.derived(() => `${String(total())}@${String(scroll())}`);

    expect(window()).toBe('6@0');
    expect(compute).toHaveBeenCalledTimes(1);

    // an unrelated cell (scroll) re-runs only its own readers
    scroll.set(32);
    expect(bump).toHaveBeenCalledTimes(1);
    expect(window()).toBe('6@32');
    expect(compute).toHaveBeenCalledTimes(1);

    // an input write is tracked but never requests a render
    rows.set([1, 2, 3, 4]);
    expect(bump).toHaveBeenCalledTimes(1);
    expect(window()).toBe('10@32');
    expect(compute).toHaveBeenCalledTimes(2);

    // same value → no change at all
    const same = [5];
    rows.set(same);
    rows.set(same);
    expect(total()).toBe(5);
    expect(compute).toHaveBeenCalledTimes(3);
    expect(total()).toBe(5);
    expect(compute).toHaveBeenCalledTimes(3);
  });

  it('follows dependencies that change between runs', () => {
    const rx = createPivotRxAdapter(() => undefined);
    const useA = rx.cell(true);
    const a = rx.cell('a');
    const b = rx.cell('b');
    const pick = rx.derived(() => (useA() ? a() : b()));
    expect(pick()).toBe('a');
    useA.set(false);
    expect(pick()).toBe('b');
    b.set('B');
    expect(pick()).toBe('B');
  });
});
