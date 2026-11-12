import { createGridRxAdapter } from './rx-adapter';

describe('createGridRxAdapter', () => {
  it('recomputes a derived value only when what it read changed', () => {
    const bump = vi.fn();
    const rx = createGridRxAdapter(bump);
    const rows = rx.cell([1, 2, 3]);
    const scroll = rx.cell(0);
    let sums = 0;
    const total = rx.derived(() => {
      sums++;
      return rows().reduce((a, b) => a + b, 0);
    });
    const doubled = rx.derived(() => total() * 2);
    expect(doubled()).toBe(12);
    expect(sums).toBe(1);
    scroll.set(100); // not read by either: no recompute
    expect(doubled()).toBe(12);
    expect(sums).toBe(1);
    expect(bump).toHaveBeenCalledTimes(1);
    rows.set([4]);
    expect(doubled()).toBe(8);
    expect(sums).toBe(2);
    rows.set(rows()); // the same value: no write
    expect(bump).toHaveBeenCalledTimes(2);
  });

  it('invalidates everything when the props-like inputs change, not when they repeat', () => {
    const rx = createGridRxAdapter(() => undefined);
    let props = { size: 1 };
    let runs = 0;
    const size = rx.derived(() => {
      runs++;
      return props.size;
    });
    const p1 = props;
    rx.invalidate(p1);
    expect(size()).toBe(1);
    rx.invalidate(p1); // a re-render of its own: same props
    expect(size()).toBe(1);
    expect(runs).toBe(1);
    props = { size: 2 };
    rx.invalidate(props);
    expect(size()).toBe(2);
    expect(runs).toBe(2);
    rx.invalidate(); // no inputs: always invalidates
    size();
    expect(runs).toBe(3);
  });

  it('keeps a downstream value when an upstream recompute yields the same result', () => {
    const rx = createGridRxAdapter(() => undefined);
    const n = rx.cell(3);
    const parity = rx.derived(() => n() % 2);
    let labels = 0;
    const label = rx.derived(() => {
      labels++;
      return parity() ? 'odd' : 'even';
    });
    expect(label()).toBe('odd');
    n.set(5);
    expect(label()).toBe('odd');
    expect(labels).toBe(1);
  });

  it('writes quietly without asking for a render', () => {
    const bump = vi.fn();
    const rx = createGridRxAdapter(bump);
    const cell = rx.cell(0);
    rx.quietly(() => cell.set(1));
    expect(bump).not.toHaveBeenCalled();
    expect(cell()).toBe(1);
    const failing = rx.derived(() => {
      throw new Error('boom');
    });
    expect(() => failing()).toThrow('boom');
  });
});
